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

function BlockTypeBadge({ type }) {
  return <span className="block-type-badge">{type}</span>;
}

export function DocumentWorkspace({ documentId }) {
  const router = useRouter();
  const { accessToken, status } = useAuth();
  const [document, setDocument] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [statusText, setStatusText] = useState("Loading document...");
  const [error, setError] = useState("");
  const [newBlockType, setNewBlockType] = useState("paragraph");
  const [editingImageIds, setEditingImageIds] = useState(() => new Set());
  const inputRefs = useRef(new Map());
  const pendingFocus = useRef(null);

  const blockIds = useMemo(() => blocks.map((block) => block.id), [blocks]);

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

  async function persistBlock(block) {
    await apiRequest(`/blocks/${block.id}`, {
      method: "PATCH",
      token: accessToken,
      body: {
        type: block.type,
        content: block.content
      }
    });
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
    }
  }

  async function handleTypeChange(blockId, type) {
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
      setStatusText(`Converted block to ${type}.`);
      pendingFocus.current = { blockId, offset: 0 };
    } catch (requestError) {
      setError(requestError.message);
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
    }
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
    return result.block;
  }

  async function handleAddBlockAtEnd() {
    try {
      const block = await insertNewBlockAfter(blocks.length - 1, newBlockType, "");
      setStatusText(`${block.type} block added.`);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
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
      await loadWorkspace();
    }
  }

  async function handleDeletePreviousEmptyBlock(index) {
    const previous = blocks[index - 1];

    if (!previous || !isTextBlock(previous.type)) {
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
      await loadWorkspace();
    }
  }

  async function handleTextKeyDown(event, block, index) {
    const element = event.currentTarget;
    const selectionStart = element.selectionStart ?? 0;
    const selectionEnd = element.selectionEnd ?? 0;
    const text = getBlockText(block);

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

      setStatusText("Backspace at the start of a non-empty block is ignored.");
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
              <img alt="Block visual" className="editor-image-preview" src={block.content.url} />
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
                <p className="session-copy">Add a valid image URL to preview it here.</p>
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
      <textarea
        className={editorClassName}
        onBlur={() => void handleBlur(block.id)}
        onChange={(event) => handleTextChange(block.id, event.target.value)}
        onKeyDown={(event) => void handleTextKeyDown(event, block, index)}
        placeholder={block.type === "paragraph" ? "Type '/' for commands later" : ""}
        ref={(element) => setInputRef(block.id, element)}
        rows={1}
        value={block.content.text}
      />
    );
  }

  if (status === "loading") {
    return <section className="editor-page-shell">Restoring session...</section>;
  }

  return (
    <section className="editor-page-shell">
      <div className="editor-page-header">
        <div>
          <Link className="inline-link" href="/dashboard">
            Back to dashboard
          </Link>
          <h1 className="document-title">{document?.title ?? "Untitled document"}</h1>
          <p className="document-subtitle">
            A continuous document canvas with custom block inputs and real PostgreSQL persistence.
          </p>
        </div>
        <div className="editor-toolbar">
          <select onChange={(event) => setNewBlockType(event.target.value)} value={newBlockType}>
            {BLOCK_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button className="primary-button" onClick={() => void handleAddBlockAtEnd()} type="button">
            Add block
          </button>
        </div>
      </div>

      <p className="session-status">{statusText}</p>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="editor-canvas">
        {blocks.map((block, index) => (
          <article className="editor-block-row" key={block.id}>
            <div className="editor-block-gutter">
              <span className="editor-block-bullet" />
              <BlockTypeBadge type={block.type} />
            </div>
            <div className="editor-block-content">{renderEditableBlock(block, index)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
