"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BLOCK_TYPES, DEFAULT_BLOCK_CONTENT, TEXT_BLOCK_TYPES } from "@blocknote/shared";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/state/auth-context";

const TEXT_TYPES = new Set(TEXT_BLOCK_TYPES);

function cloneContent(content) {
  return JSON.parse(JSON.stringify(content));
}

function isTextBlock(type) {
  return TEXT_TYPES.has(type);
}

function getBlockText(block) {
  if (block.type === "todo") {
    return block.content.text;
  }

  if (block.type === "image") {
    return block.content.url;
  }

  if (isTextBlock(block.type)) {
    return block.content.text;
  }

  return "";
}

function getDefaultContent(type) {
  return cloneContent(DEFAULT_BLOCK_CONTENT[type]);
}

function getTrailingOrderIndex(blocks, index) {
  const current = blocks[index];
  const next = blocks[index + 1];

  if (!current) {
    return 1;
  }

  if (!next) {
    return Number(current.orderIndex) + 1;
  }

  return (Number(current.orderIndex) + Number(next.orderIndex)) / 2;
}

function getLeadingOrderIndex(blocks) {
  if (blocks.length === 0) {
    return 1;
  }

  return Number(blocks[0].orderIndex) - 1;
}

function isValidImageUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function createBlockContent(type, text = "") {
  if (type === "todo") {
    return { text, checked: false };
  }

  if (type === "image") {
    return { url: text };
  }

  if (type === "divider") {
    return {};
  }

  return { text };
}

const SLASH_ICONS = {
  paragraph: "¶",
  heading_1: "H1",
  heading_2: "H2",
  code: "</>",
  todo: "☑",
  divider: "—",
  image: "🖼"
};

export function DocumentWorkspace({ documentId }) {
  const router = useRouter();
  const { accessToken, status } = useAuth();
  const [document, setDocument] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [statusText, setStatusText] = useState("Loading document...");
  const [error, setError] = useState("");
  const [newBlockType, setNewBlockType] = useState("paragraph");
  const [saveState, setSaveState] = useState("idle");
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [dragOverTrash, setDragOverTrash] = useState(false);
  const [slashMenu, setSlashMenu] = useState(null);
  const [editingImageIds, setEditingImageIds] = useState(() => new Set());
  const inputRefs = useRef(new Map());
  const pendingFocus = useRef(null);
  const saveTimeoutRef = useRef(null);

  const blockIds = useMemo(() => blocks.map((block) => block.id), [blocks]);
  const slashOptions = useMemo(() => {
    if (!slashMenu) {
      return [];
    }

    const query = slashMenu.query.toLowerCase();
    return BLOCK_TYPES.filter((type) => type.includes(query));
  }, [slashMenu]);

  useEffect(() => {
    if (status === "guest") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && accessToken) {
      void loadWorkspace();
    }
  }, [status, accessToken, documentId]);

  useEffect(() => {
    for (const element of inputRefs.current.values()) {
      if (element instanceof HTMLTextAreaElement) {
        element.style.height = "0px";
        element.style.height = `${element.scrollHeight}px`;
      }
    }
  }, [blocks]);

  useEffect(() => {
    if (!pendingFocus.current) {
      return;
    }

    const { blockId, offset } = pendingFocus.current;
    const element = inputRefs.current.get(blockId);

    if (!element) {
      pendingFocus.current = null;
      return;
    }

    element.focus();

    if (typeof element.setSelectionRange === "function") {
      const safeOffset = Math.max(0, Math.min(offset, element.value.length));
      element.setSelectionRange(safeOffset, safeOffset);
    }

    pendingFocus.current = null;
  }, [blockIds]);

  function markSaving() {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveState("saving");
  }

  function markSaved() {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveState("saved");
    saveTimeoutRef.current = setTimeout(() => {
      setSaveState("idle");
    }, 1500);
  }

  function markSaveError() {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveState("error");
  }

  async function loadWorkspace() {
    setError("");

    try {
      const [documentResult, blocksResult] = await Promise.all([
        apiRequest(`/documents/${documentId}`, { token: accessToken }),
        apiRequest(`/documents/${documentId}/blocks`, { token: accessToken })
      ]);

      setDocument(documentResult.document);
      setBlocks(blocksResult.blocks);
      setStatusText("Document loaded.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function setInputRef(blockId, element) {
    if (!element) {
      inputRefs.current.delete(blockId);
      return;
    }

    inputRefs.current.set(blockId, element);
  }

  function updateLocalBlock(blockId, updater) {
    setBlocks((current) =>
      current.map((block) => (block.id === blockId ? updater(block) : block))
    );
  }

  function reorderBlocksArray(list, fromId, toId) {
    const fromIndex = list.findIndex((block) => block.id === fromId);
    const toIndex = list.findIndex((block) => block.id === toId);

    if (fromIndex === -1 || toIndex === -1) {
      return list;
    }

    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  }

  async function persistReorder(blockId, orderedBlocks) {
    const index = orderedBlocks.findIndex((block) => block.id === blockId);
    const before = index > 0 ? orderedBlocks[index - 1].id : null;
    const after = index < orderedBlocks.length - 1 ? orderedBlocks[index + 1].id : null;

    try {
      const result = await apiRequest(`/documents/${documentId}/blocks/reorder`, {
        method: "POST",
        token: accessToken,
        body: {
          blockId,
          beforeId: before,
          afterId: after
        }
      });

      setBlocks(result.blocks);
      setStatusText("Blocks reordered.");
    } catch (requestError) {
      setError(requestError.message);
      await loadWorkspace();
    }
  }

  async function persistBlock(block) {
    markSaving();
    await apiRequest(`/blocks/${block.id}`, {
      method: "PATCH",
      token: accessToken,
      body: {
        type: block.type,
        content: block.content
      }
    });
    markSaved();
  }

  async function handleBlur(blockId) {
    const block = blocks.find((entry) => entry.id === blockId);

    if (!block) {
      return;
    }

    try {
      await persistBlock(block);
      setStatusText("Saved block changes.");
      setError("");
    } catch (requestError) {
      setError(requestError.message);
      markSaveError();
    }
  }

  async function handleTypeChange(blockId, type) {
    if (slashMenu?.blockId === blockId) {
      closeSlashMenu();
    }
    const nextContent = getDefaultContent(type);

    updateLocalBlock(blockId, (block) => ({
      ...block,
      type,
      content: nextContent
    }));

    try {
      const result = await apiRequest(`/blocks/${blockId}`, {
        method: "PATCH",
        token: accessToken,
        body: {
          type,
          content: nextContent
        }
      });

      updateLocalBlock(blockId, () => result.block);
      markSaved();
      setStatusText(`Converted block to ${type}.`);
      pendingFocus.current = { blockId, offset: 0 };
    } catch (requestError) {
      setError(requestError.message);
      markSaveError();
      await loadWorkspace();
    }
  }

  function handleTextChange(blockId, value) {
    updateLocalBlock(blockId, (block) => ({
      ...block,
      content:
        block.type === "todo"
          ? { ...block.content, text: value }
          : { ...block.content, text: value }
    }));
  }

  function handleImageChange(blockId, value) {
    updateLocalBlock(blockId, (block) => ({
      ...block,
      content: {
        ...block.content,
        url: value
      }
    }));
  }

  async function handleTodoToggle(blockId, checked) {
    const block = blocks.find((entry) => entry.id === blockId);

    if (!block) {
      return;
    }

    const nextBlock = {
      ...block,
      content: {
        ...block.content,
        checked
      }
    };

    updateLocalBlock(blockId, () => nextBlock);

    try {
      await persistBlock(nextBlock);
      setStatusText("Todo updated.");
    } catch (requestError) {
      setError(requestError.message);
      markSaveError();
    }
  }

  function openSlashMenu(blockId) {
    setSlashMenu({
      blockId,
      query: "",
      selectedIndex: 0
    });
  }

  function closeSlashMenu() {
    setSlashMenu(null);
  }

  function setImageEditing(blockId, value) {
    setEditingImageIds((current) => {
      const next = new Set(current);
      if (value) {
        next.add(blockId);
      } else {
        next.delete(blockId);
      }
      return next;
    });
  }

  async function insertNewBlockAfter(index, type = "paragraph", text = "", focusOffset = 0) {
    const orderIndex = index >= 0 ? getTrailingOrderIndex(blocks, index) : getLeadingOrderIndex(blocks);
    const payload = {
      type,
      content: createBlockContent(type, text),
      orderIndex
    };

    const result = await apiRequest(`/documents/${documentId}/blocks`, {
      method: "POST",
      token: accessToken,
      body: payload
    });

    setBlocks((current) => {
      const next = [...current];
      const insertAt = index >= 0 ? index + 1 : 0;
      next.splice(insertAt, 0, result.block);
      return next;
    });
    pendingFocus.current = { blockId: result.block.id, offset: focusOffset };
    markSaved();
    return result.block;
  }

  async function handleAddBlockAtEnd() {
    try {
      const block = await insertNewBlockAfter(blocks.length - 1, newBlockType, "");
      setStatusText(`${block.type} block added.`);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
      markSaveError();
    }
  }

  async function handleDeleteEmptyBlock(index) {
    const block = blocks[index];

    if (!block) {
      return;
    }

    const previousEditable = [...blocks]
      .slice(0, index)
      .reverse()
      .find((entry) => isTextBlock(entry.type));

    try {
      await apiRequest(`/blocks/${block.id}`, {
        method: "DELETE",
        token: accessToken
      });

      const remaining = blocks.filter((entry) => entry.id !== block.id);
      setBlocks(remaining);
      markSaved();

      if (previousEditable) {
        pendingFocus.current = {
          blockId: previousEditable.id,
          offset: getBlockText(previousEditable).length
        };
        setStatusText("Removed empty block.");
        return;
      }

      const newParagraph = await apiRequest(`/documents/${documentId}/blocks`, {
        method: "POST",
        token: accessToken,
        body: {
          type: "paragraph",
          content: getDefaultContent("paragraph"),
          orderIndex: getLeadingOrderIndex(remaining)
        }
      });

      setBlocks((current) => [newParagraph.block, ...current]);
      pendingFocus.current = { blockId: newParagraph.block.id, offset: 0 };
      setStatusText("Replaced non-editable lead with a paragraph block.");
    } catch (requestError) {
      setError(requestError.message);
      markSaveError();
      await loadWorkspace();
    }
  }

  async function handleDeletePreviousEmptyBlock(index) {
    const previous = blocks[index - 1];

    if (!previous) {
      return false;
    }

    if (previous.type === "divider" || previous.type === "image") {
      try {
        await apiRequest(`/blocks/${previous.id}`, {
          method: "DELETE",
          token: accessToken
        });

        setBlocks((current) => current.filter((entry) => entry.id !== previous.id));
        pendingFocus.current = { blockId: blocks[index].id, offset: 0 };
        setStatusText("Removed previous non-text block.");
        return true;
      } catch (requestError) {
        setError(requestError.message);
        await loadWorkspace();
        return true;
      }
    }

    if (!isTextBlock(previous.type)) {
      return false;
    }

    if (getBlockText(previous).length > 0) {
      return false;
    }

    try {
      await apiRequest(`/blocks/${previous.id}`, {
        method: "DELETE",
        token: accessToken
      });

      setBlocks((current) => current.filter((entry) => entry.id !== previous.id));
      pendingFocus.current = { blockId: blocks[index].id, offset: 0 };
      setStatusText("Removed empty block above.");
      return true;
    } catch (requestError) {
      setError(requestError.message);
      await loadWorkspace();
      return true;
    }
  }

  async function handleSplitBlock(index, cursorPosition) {
    const block = blocks[index];

    if (!block) {
      return;
    }

    if (block.type === "code") {
      const text = getBlockText(block);
      const nextText = `${text.slice(0, cursorPosition)}\n${text.slice(cursorPosition)}`;
      const nextBlock = {
        ...block,
        content: {
          ...block.content,
          text: nextText
        }
      };

      updateLocalBlock(block.id, () => nextBlock);
      pendingFocus.current = {
        blockId: block.id,
        offset: cursorPosition + 1
      };

      try {
        await persistBlock(nextBlock);
        setStatusText("Inserted newline in code block.");
      } catch (requestError) {
        setError(requestError.message);
      }

      return;
    }

    const currentText = getBlockText(block);
    const left = currentText.slice(0, cursorPosition);
    const right = currentText.slice(cursorPosition);
    const currentType = block.type;
    const nextType = currentType === "todo" ? "todo" : "paragraph";
    const updatedBlock = {
      ...block,
      content:
        currentType === "todo"
          ? { ...block.content, text: left }
          : { ...block.content, text: left }
    };

    updateLocalBlock(block.id, () => updatedBlock);

    try {
      await persistBlock(updatedBlock);
      await insertNewBlockAfter(index, nextType, right, 0);
      setStatusText("Split block.");
      setError("");
    } catch (requestError) {
      setError(requestError.message);
      markSaveError();
      await loadWorkspace();
    }
  }

  async function handleTextKeyDown(event, block, index) {
    const element = event.currentTarget;
    const selectionStart = element.selectionStart ?? 0;
    const selectionEnd = element.selectionEnd ?? 0;
    const text = getBlockText(block);
    const isEmptyTextBlock = isTextBlock(block.type) && text.length === 0;

    if (slashMenu && slashMenu.blockId === block.id) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSlashMenu();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlashMenu((current) => ({
          ...current,
          selectedIndex: Math.min(
            (current?.selectedIndex ?? 0) + 1,
            slashOptions.length - 1
          )
        }));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlashMenu((current) => ({
          ...current,
          selectedIndex: Math.max((current?.selectedIndex ?? 0) - 1, 0)
        }));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const nextType = slashOptions[slashMenu.selectedIndex] ?? "paragraph";
        await handleTypeChange(block.id, nextType);
        closeSlashMenu();
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        setSlashMenu((current) => ({
          ...current,
          query: current.query.slice(0, -1),
          selectedIndex: 0
        }));
        return;
      }

      if (event.key.length === 1) {
        event.preventDefault();
        setSlashMenu((current) => ({
          ...current,
          query: `${current.query}${event.key}`,
          selectedIndex: 0
        }));
        return;
      }
    }

    if (event.key === "/" && selectionStart === 0 && selectionEnd === 0 && isEmptyTextBlock) {
      event.preventDefault();
      openSlashMenu(block.id);
      return;
    }

    if (event.key === "Tab" && block.type === "code") {
      event.preventDefault();
      const nextText = `${text.slice(0, selectionStart)}  ${text.slice(selectionEnd)}`;
      const nextBlock = {
        ...block,
        content: {
          ...block.content,
          text: nextText
        }
      };

      updateLocalBlock(block.id, () => nextBlock);
      pendingFocus.current = { blockId: block.id, offset: selectionStart + 2 };
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      await handleSplitBlock(index, selectionStart);
      return;
    }

    if (event.key === "Backspace" && selectionStart === 0 && selectionEnd === 0) {
      event.preventDefault();

      if (index === 0) {
        setStatusText("Backspace at the start of the first block does nothing.");
        return;
      }

      const removedPrevious = await handleDeletePreviousEmptyBlock(index);
      if (removedPrevious) {
        return;
      }

      if (text.length === 0) {
        await handleDeleteEmptyBlock(index);
        return;
      }

      return;
    }
  }

  function renderEditableBlock(block, index) {
    if (block.type === "todo") {
      return (
        <label className="editor-todo-row">
          <input
            checked={block.content.checked}
            onChange={(event) => void handleTodoToggle(block.id, event.target.checked)}
            type="checkbox"
          />
          <textarea
            className="editor-input editor-paragraph"
            onBlur={() => void handleBlur(block.id)}
            onChange={(event) => handleTextChange(block.id, event.target.value)}
            onKeyDown={(event) => void handleTextKeyDown(event, block, index)}
            ref={(element) => setInputRef(block.id, element)}
            rows={1}
            value={block.content.text}
          />
        </label>
      );
    }

    if (block.type === "image") {
      const isEditing = editingImageIds.has(block.id);
      const hasValidUrl = isValidImageUrl(block.content.url);

      return (
        <div className="editor-image-shell">
          {hasValidUrl && !isEditing ? (
            <button
              className="editor-image-preview-shell"
              onClick={() => setImageEditing(block.id, true)}
              type="button"
            >
              <img
                alt="Block visual"
                className="editor-image-preview"
                src={block.content.url}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              />
              <span className="editor-image-hint">Click image to edit URL</span>
            </button>
          ) : (
            <>
              <input
                className="editor-url-input"
                onBlur={() => {
                  void handleBlur(block.id);
                  if (isValidImageUrl(block.content.url)) {
                    setImageEditing(block.id, false);
                  }
                }}
                onChange={(event) => handleImageChange(block.id, event.target.value)}
                placeholder="Paste image URL"
                ref={(element) => setInputRef(block.id, element)}
                type="url"
                value={block.content.url}
              />
              {hasValidUrl ? null : (
                <p className="session-copy" style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                  Add a valid image URL to preview it here.
                </p>
              )}
            </>
          )}
        </div>
      );
    }

    if (block.type === "divider") {
      return <hr className="editor-divider" />;
    }

    const editorClassName = [
      "editor-input",
      block.type === "heading_1"
        ? "editor-heading-one"
        : block.type === "heading_2"
          ? "editor-heading-two"
          : block.type === "code"
            ? "editor-code"
            : "editor-paragraph"
    ].join(" ");

    return (
      <div className="editor-input-shell">
        <textarea
          className={editorClassName}
          onBlur={() => void handleBlur(block.id)}
          onChange={(event) => handleTextChange(block.id, event.target.value)}
          onKeyDown={(event) => void handleTextKeyDown(event, block, index)}
          placeholder={block.type === "paragraph" ? "Type '/' for commands…" : ""}
          ref={(element) => setInputRef(block.id, element)}
          rows={1}
          value={block.content.text}
        />
        {slashMenu?.blockId === block.id ? (
          <div className="slash-menu">
            <p className="slash-menu-title">Blocks</p>
            {slashOptions.length === 0 ? (
              <p className="slash-menu-empty">No matches</p>
            ) : (
              <ul>
                {slashOptions.map((type, optionIndex) => (
                  <li key={type}>
                    <button
                      className={
                        optionIndex === slashMenu.selectedIndex
                          ? "slash-menu-item active"
                          : "slash-menu-item"
                      }
                      onClick={() => void handleTypeChange(block.id, type)}
                      type="button"
                    >
                      <span className="slash-menu-item-icon">
                        {SLASH_ICONS[type] || "•"}
                      </span>
                      {type.replace("_", " ")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  if (status === "loading") {
    return (
      <section className="editor-page-shell">
        <div className="editor-topbar">
          <span className="session-status">Restoring session…</span>
        </div>
      </section>
    );
  }

  return (
    <section className="editor-page-shell">
      <div className="editor-topbar">
        <div className="editor-topbar-left">
          <Link className="editor-back-link" href="/dashboard">
            ← Back
          </Link>
          <span className="editor-doc-name">{document?.title ?? "Untitled"}</span>
        </div>
        <div className="editor-toolbar">
          <div
            className={
              saveState === "idle" ? "save-indicator save-indicator--idle" : "save-indicator"
            }
            aria-live="polite"
          >
            {saveState === "saving" ? (
              <span className="save-spinner" />
            ) : saveState === "saved" ? (
              <span className="save-check" />
            ) : null}
            <span className="save-text">
              {saveState === "saving"
                ? "Saving"
                : saveState === "saved"
                  ? "Saved"
                  : saveState === "error"
                    ? "Save failed"
                    : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="editor-canvas">
        <h1 className="document-title">{document?.title ?? "Untitled"}</h1>
        <p className="document-subtitle">
          {document
            ? `Last updated ${new Date(document.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} at ${new Date(document.updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
            : "Loading…"}
        </p>

        {/* Glassmorphism floating block bar */}
        <div className="block-float-bar">
          {BLOCK_TYPES.map((type) => (
            <button
              className={`block-float-btn${newBlockType === type ? " block-float-btn--active" : ""}`}
              key={type}
              onClick={() => {
                setNewBlockType(type);
                void (async () => {
                  try {
                    const block = await insertNewBlockAfter(blocks.length - 1, type, "");
                    setStatusText(`${block.type} block added.`);
                    setError("");
                  } catch (requestError) {
                    setError(requestError.message);
                  }
                })();
              }}
              title={`Add ${type.replace("_", " ")} block`}
              type="button"
            >
              <span className="block-float-icon">{SLASH_ICONS[type] || "•"}</span>
              <span className="block-float-label">{type.replace("_", " ")}</span>
            </button>
          ))}
        </div>

        {error ? <p className="error-text" style={{ marginBottom: 16 }}>{error}</p> : null}

        <div className="editor-paper">
          {blocks.map((block, index) => (
            <article
              className={
                dragOverId === block.id ? "editor-block-row editor-block-row--drag" : "editor-block-row"
              }
              key={block.id}
              onDragOver={(event) => {
                event.preventDefault();
                if (draggedId && draggedId !== block.id) {
                  setDragOverId(block.id);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (!draggedId || draggedId === block.id) {
                  return;
                }
                const next = reorderBlocksArray(blocks, draggedId, block.id);
                setBlocks(next);
                setDragOverId(null);
                setDraggedId(null);
                void persistReorder(draggedId, next);
              }}
            >
              <div className="editor-block-gutter">
                <button
                  aria-label="Drag block"
                  className="editor-drag-handle"
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDraggedId(block.id);
                  }}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setDragOverId(null);
                    setDragOverTrash(false);
                  }}
                  type="button"
                >
                  ⋮⋮
                </button>
              </div>
              <div className="editor-block-content">{renderEditableBlock(block, index)}</div>
            </article>
          ))}

          {blocks.length === 0 ? (
            <p className="editor-empty-hint">Click a block type above to start writing…</p>
          ) : null}
        </div>
      </div>

      {/* Trash drop zone — fixed at bottom, only visible while dragging */}
      {draggedId ? (
        <div
          className={dragOverTrash ? "editor-trash-zone editor-trash-zone--active" : "editor-trash-zone"}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverTrash(true);
          }}
          onDragLeave={() => setDragOverTrash(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setDragOverTrash(false);
            if (!draggedId) return;
            const idToDelete = draggedId;
            setDraggedId(null);
            setDragOverId(null);
            try {
              await apiRequest(`/blocks/${idToDelete}`, {
                method: "DELETE",
                token: accessToken
              });
              setBlocks((current) => current.filter((b) => b.id !== idToDelete));
              markSaved();
              setStatusText("Block deleted.");
            } catch (requestError) {
              setError(requestError.message);
              await loadWorkspace();
            }
          }}
        >
          <span className="editor-trash-icon">🗑</span>
          <span className="editor-trash-label">
            {dragOverTrash ? "Release to delete" : "Drag here to delete"}
          </span>
        </div>
      ) : null}
    </section>
  );
}
