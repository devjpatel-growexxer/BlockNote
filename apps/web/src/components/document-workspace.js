"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { flushSync } from "react-dom";
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
    return normalizeImageContent(block.content).url;
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
    return { url: text, width: 100, alignment: "center" };
  }

  if (type === "divider") {
    return {};
  }

  return { text };
}

function normalizeImageContent(content = {}) {
  return {
    url: typeof content.url === "string" ? content.url : "",
    width:
      typeof content.width === "number" && Number.isFinite(content.width)
        ? Math.max(30, Math.min(100, content.width))
        : 100,
    alignment:
      content.alignment === "left" || content.alignment === "right" || content.alignment === "center"
        ? content.alignment
        : "center"
  };
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

const IMAGE_ALIGNMENT_OPTIONS = [
  { value: "left", label: "Align left" },
  { value: "center", label: "Align center" },
  { value: "right", label: "Align right" }
];

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
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [slashMenu, setSlashMenu] = useState(null);
  const [editingImageIds, setEditingImageIds] = useState(() => new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedBlockIds, setSelectedBlockIds] = useState(() => new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [imageValidationState, setImageValidationState] = useState({});

  const inputRefs = useRef(new Map());
  const pendingFocus = useRef(null);
  const saveTimeoutRef = useRef(null);
  const saveAllRef = useRef(null);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const dragSnapshotRef = useRef(null);
  const dropOkRef = useRef(false);
  const lastDragOverRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const dirtyBlocksRef = useRef(new Map());
  const isAutosaveRunningRef = useRef(false);
  const autosaveQueuedRef = useRef(false);
  const documentVersionRef = useRef(1);
  const shareShellRef = useRef(null);
  const imageResizeStateRef = useRef(null);
  const pendingImageParagraphRef = useRef({});
  const imageAutoParagraphRef = useRef({});

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
    const trackedImages = blocks
      .filter((block) => block.type === "image")
      .map((block) => ({
        id: block.id,
        url: normalizeImageContent(block.content).url
      }))
      .filter((entry) => entry.url && isValidImageUrl(entry.url));

    const activeLoaders = [];

    trackedImages.forEach(({ id, url }) => {
      const currentState = imageValidationState[id];
      if (currentState?.url === url && (currentState.status === "loaded" || currentState.status === "error" || currentState.status === "loading")) {
        return;
      }

      setImageValidationState((current) => ({
        ...current,
        [id]: { url, status: "loading" }
      }));

      const image = new window.Image();
      image.onload = () => {
        setImageValidationState((current) => ({
          ...current,
          [id]: { url, status: "loaded" }
        }));

        if (
          pendingImageParagraphRef.current[id] === url &&
          imageAutoParagraphRef.current[id] !== url
        ) {
          imageAutoParagraphRef.current[id] = url;
          delete pendingImageParagraphRef.current[id];
          setImageEditing(id, false);
          const currentIndex = blocksRef.current.findIndex((entry) => entry.id === id);
          if (currentIndex >= 0) {
            void insertNewBlockAfter(currentIndex, "paragraph", "", 0)
              .then(() => {
                setStatusText("Inserted paragraph below image.");
                setError("");
              })
              .catch((requestError) => {
                setError(requestError.message);
                markSaveError();
              });
          }
        }
      };
      image.onerror = () => {
        setImageValidationState((current) => ({
          ...current,
          [id]: { url, status: "error" }
        }));
        delete pendingImageParagraphRef.current[id];
      };
      image.src = url;
      activeLoaders.push(image);
    });

    setImageValidationState((current) => {
      let changed = false;
      const next = { ...current };
      Object.keys(next).forEach((blockId) => {
        const stillPresent = trackedImages.some((entry) => entry.id === blockId && entry.url === next[blockId]?.url);
        if (!stillPresent) {
          delete next[blockId];
          changed = true;
        }
      });
      return changed ? next : current;
    });

    return () => {
      activeLoaders.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [blocks, imageValidationState]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handlePointerMove(event) {
      const resizeState = imageResizeStateRef.current;
      if (!resizeState) {
        return;
      }

      const delta = event.clientX - resizeState.startX;
      const nextWidth = resizeState.startWidth + (delta / resizeState.containerWidth) * 100;
      const clampedWidth = Math.max(30, Math.min(100, nextWidth));
      resizeState.latestWidth = clampedWidth;

      setBlocks((current) =>
        current.map((entry) =>
          entry.id === resizeState.blockId
            ? {
                ...entry,
                content: {
                  ...normalizeImageContent(entry.content),
                  width: clampedWidth
                }
              }
            : entry
        )
      );
    }

    function handlePointerUp() {
      const resizeState = imageResizeStateRef.current;
      if (!resizeState) {
        return;
      }

      const resizedBlock = blocksRef.current.find((entry) => entry.id === resizeState.blockId);
      if (resizedBlock) {
        const finalBlock = {
          ...resizedBlock,
          content: {
            ...normalizeImageContent(resizedBlock.content),
            width: resizeState.latestWidth ?? normalizeImageContent(resizedBlock.content).width
          }
        };

        setBlocks((current) =>
          current.map((entry) => (entry.id === resizeState.blockId ? finalBlock : entry))
        );
        markBlockDirty(finalBlock);
        scheduleAutoSave();
        setStatusText("Image resized.");
      }

      imageResizeStateRef.current = null;
      window.document.body.style.userSelect = "";
      window.document.body.style.cursor = "";
    }

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!shareOpen) {
        return;
      }

      const container = shareShellRef.current;
      if (!container) {
        return;
      }

      if (container.contains(event.target)) {
        return;
      }

      setShareOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape" && shareOpen) {
        setShareOpen(false);
      }
    }

    window.document.addEventListener("mousedown", handlePointerDown);
    window.document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.document.removeEventListener("mousedown", handlePointerDown);
      window.document.removeEventListener("keydown", handleKeyDown);
    };
  }, [shareOpen]);

  // Ctrl+S / Cmd+S — save all blocks
  useEffect(() => {
    function onKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        saveAllRef.current();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

  function markSaved(bumpVersion = true) {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveState("saved");
    setLastSavedAt(new Date());
    if (bumpVersion) {
      documentVersionRef.current += 1;
    }
    saveTimeoutRef.current = setTimeout(() => {
      setSaveState("idle");
    }, 2500);
  }

  function markSaveError() {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveState("error");
  }

  function toSavePayload(block) {
    return {
      id: block.id,
      type: block.type,
      content: cloneContent(block.content)
    };
  }

  function markBlockDirty(block) {
    dirtyBlocksRef.current.set(block.id, toSavePayload(block));
    if (isAutosaveRunningRef.current) {
      autosaveQueuedRef.current = true;
    }
  }

  function markAllBlocksDirty() {
    for (const block of blocksRef.current) {
      markBlockDirty(block);
    }
  }

  async function fetchWorkspaceSnapshot() {
    const [documentResult, blocksResult] = await Promise.all([
      apiRequest(`/documents/${documentId}`, { token: accessToken }),
      apiRequest(`/documents/${documentId}/blocks`, { token: accessToken })
    ]);

    return {
      document: documentResult.document,
      blocks: blocksResult.blocks
    };
  }

  async function recoverFromVersionConflict() {
    const pendingById = new Map(
      Array.from(dirtyBlocksRef.current.values()).map((entry) => [entry.id, entry])
    );
    const snapshot = await fetchWorkspaceSnapshot();
    const serverIds = new Set(snapshot.blocks.map((block) => block.id));

    setDocument(snapshot.document);
    setBlocks(() =>
      snapshot.blocks.map((block) => {
        const pending = pendingById.get(block.id);
        if (!pending) {
          return block;
        }

        return {
          ...block,
          type: pending.type,
          content: cloneContent(pending.content)
        };
      })
    );
    documentVersionRef.current = snapshot.document.version;
    setLastSavedAt(new Date(snapshot.document.updatedAt));
    setStatusText("Synced latest version. Reapplying pending edits...");

    for (const blockId of Array.from(dirtyBlocksRef.current.keys())) {
      if (!serverIds.has(blockId)) {
        dirtyBlocksRef.current.delete(blockId);
      }
    }
  }

  async function flushAutosaveNow() {
    if (isAutosaveRunningRef.current) {
      autosaveQueuedRef.current = true;
      return;
    }

    if (dirtyBlocksRef.current.size === 0) {
      return;
    }

    isAutosaveRunningRef.current = true;
    markSaving();

    try {
      let keepSaving = true;

      while (keepSaving) {
        const batch = Array.from(dirtyBlocksRef.current.values());
        if (batch.length === 0) {
          break;
        }

        const fingerprint = new Map(
          batch.map((entry) => [entry.id, JSON.stringify({ type: entry.type, content: entry.content })])
        );

        try {
          const result = await apiRequest(`/documents/${documentId}/content`, {
            method: "PUT",
            token: accessToken,
            body: {
              baseVersion: documentVersionRef.current,
              blocks: batch
            }
          });

          documentVersionRef.current = result.document.version;
          setDocument(result.document);
          setLastSavedAt(new Date(result.document.updatedAt));

          if (Array.isArray(result.blocks) && result.blocks.length > 0) {
            const updatedById = new Map(result.blocks.map((block) => [block.id, block]));
            setBlocks((current) =>
              current.map((block) => updatedById.get(block.id) ?? block)
            );
          }

          for (const entry of batch) {
            const currentDirty = dirtyBlocksRef.current.get(entry.id);
            if (!currentDirty) {
              continue;
            }

            const currentHash = JSON.stringify({
              type: currentDirty.type,
              content: currentDirty.content
            });

            if (currentHash === fingerprint.get(entry.id)) {
              dirtyBlocksRef.current.delete(entry.id);
            }
          }

          setError("");
          markSaved(false);
          setStatusText("All changes saved.");
        } catch (requestError) {
          if (requestError.status === 409) {
            await recoverFromVersionConflict();
            continue;
          }

          if (requestError.status === 422 && requestError.code === "BLOCK_DOCUMENT_MISMATCH") {
            await recoverFromVersionConflict();
            continue;
          }

          setError(requestError.message);
          markSaveError();
          keepSaving = false;
        }

        if (!autosaveQueuedRef.current && dirtyBlocksRef.current.size === 0) {
          keepSaving = false;
        }

        autosaveQueuedRef.current = false;
      }
    } finally {
      isAutosaveRunningRef.current = false;
      if (dirtyBlocksRef.current.size > 0) {
        scheduleAutoSave();
      }
    }
  }

  async function handleSaveAll() {
    markAllBlocksDirty();
    await flushAutosaveNow();
  }
  saveAllRef.current = handleSaveAll;

  async function handleBulkDelete() {
    if (selectedBlockIds.size === 0) return;
    setStatusText("Deleting selected blocks...");
    
    try {
      const deletePromises = Array.from(selectedBlockIds).map(id =>
        apiRequest(`/blocks/${id}`, { method: "DELETE", token: accessToken })
      );
      await Promise.all(deletePromises);
      
      setBlocks(current => current.filter(b => !selectedBlockIds.has(b.id)));
      setIsBulkMode(false);
      setSelectedBlockIds(new Set());
      setStatusText("Bulk deletion complete.");
    } catch (err) {
      setError(err.message);
    }
  }

  function buildShareLink(sharePath) {
    if (typeof window === "undefined") {
      return sharePath;
    }

    return `${window.location.origin}${sharePath}`;
  }

  async function handleGenerateShareLink() {
    setShareBusy(true);
    setShareMessage("");
    try {
      const result = await apiRequest(`/documents/${documentId}/share`, {
        method: "POST",
        token: accessToken
      });
      setDocument(result.document);
      setShareLink(buildShareLink(result.sharePath));
      setShareMessage("Public link generated.");
    } catch (requestError) {
      setShareMessage(requestError.message);
    } finally {
      setShareBusy(false);
    }
  }

  async function handleDisableShareLink() {
    setShareBusy(true);
    setShareMessage("");
    try {
      const result = await apiRequest(`/documents/${documentId}/share`, {
        method: "DELETE",
        token: accessToken
      });
      setDocument(result.document);
      setShareLink("");
      setShareMessage("Sharing disabled. Old links no longer work.");
    } catch (requestError) {
      setShareMessage(requestError.message);
    } finally {
      setShareBusy(false);
    }
  }

  async function handleCopyShareLink() {
    if (!shareLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareLink);
      setShareMessage("Link copied.");
    } catch {
      setShareMessage("Could not copy automatically. Please copy manually.");
    }
  }

  async function loadWorkspace() {
    setError("");

    try {
      const snapshot = await fetchWorkspaceSnapshot();

      setDocument(snapshot.document);
      setBlocks(snapshot.blocks);
      documentVersionRef.current = snapshot.document.version;
      dirtyBlocksRef.current.clear();
      setShareLink("");
      setShareMessage("");
      if (snapshot.document.updatedAt) {
        setLastSavedAt(new Date(snapshot.document.updatedAt));
      }
      setIsLoaded(true);
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
    markBlockDirty(block);
    await flushAutosaveNow();
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

  function scheduleAutoSave() {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      void flushAutosaveNow();
    }, 1000);
  }

  function handleTextChange(block, value) {
    const nextBlock = {
      ...block,
      content:
        block.type === "todo"
          ? { ...block.content, text: value }
          : { ...block.content, text: value }
    };
    updateLocalBlock(block.id, () => nextBlock);
    markBlockDirty(nextBlock);
    scheduleAutoSave();
  }

  function handleImageChange(block, value) {
    const imageContent = normalizeImageContent(block.content);
    delete imageAutoParagraphRef.current[block.id];
    if (!imageContent.url.trim() && value.trim()) {
      pendingImageParagraphRef.current[block.id] = value;
    } else if (!value.trim()) {
      delete pendingImageParagraphRef.current[block.id];
    }
    const nextBlock = {
      ...block,
      content: {
        ...imageContent,
        url: value
      }
    };
    updateLocalBlock(block.id, () => nextBlock);
    markBlockDirty(nextBlock);
    scheduleAutoSave();
  }

  function handleImageLayoutChange(blockId, changes) {
    const block = blocksRef.current.find((entry) => entry.id === blockId);
    if (!block) {
      return;
    }

    const nextBlock = {
      ...block,
      content: {
        ...normalizeImageContent(block.content),
        ...changes
      }
    };

    updateLocalBlock(blockId, () => nextBlock);
    markBlockDirty(nextBlock);
    scheduleAutoSave();
    setStatusText("Image layout updated.");
  }

  function handleImageResizeStart(event, blockId) {
    event.preventDefault();
    event.stopPropagation();

    const container = event.currentTarget.closest("[data-image-frame]");
    if (!(container instanceof HTMLElement)) {
      return;
    }

    const block = blocksRef.current.find((entry) => entry.id === blockId);
    if (!block) {
      return;
    }

    const imageContent = normalizeImageContent(block.content);
    imageResizeStateRef.current = {
      blockId,
      startX: event.clientX,
      startWidth: imageContent.width,
      containerWidth: Math.max(container.getBoundingClientRect().width, 1),
      latestWidth: imageContent.width
    };
    window.document.body.style.userSelect = "none";
    window.document.body.style.cursor = "ew-resize";
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
    const nextType = "paragraph";
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

      // Non-empty block at caret start → do nothing (no merge)
      if (text.length > 0) {
        return;
      }

      // Read block ID directly from the DOM — immune to stale React closures
      const article = event.currentTarget.closest("article[data-block-id]");
      const targetId = article?.dataset.blockId ?? block.id;
      const liveBlocks = blocksRef.current;
      const currentIdx = liveBlocks.findIndex((b) => b.id === targetId);
      if (currentIdx <= 0) {
        // First block or block not found — nothing to do
        return;
      }

      // Delete THIS block and move cursor to end of previous editable block
      try {
        markSaving();
        await apiRequest(`/blocks/${targetId}`, {
          method: "DELETE",
          token: accessToken
        });
        const remaining = blocksRef.current.filter((b) => b.id !== targetId);
        setBlocks(remaining);
        markSaved();
        const prevEditable = remaining
          .slice(0, currentIdx)
          .reverse()
          .find((b) => isTextBlock(b.type));
        if (prevEditable) {
          pendingFocus.current = {
            blockId: prevEditable.id,
            offset: getBlockText(prevEditable).length
          };
        }
        setStatusText("Removed empty block.");
      } catch (requestError) {
        setError(requestError.message);
        markSaveError();
        await loadWorkspace();
      }
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
            className={`editor-input editor-paragraph${block.content.checked ? " editor-todo-text--checked" : ""}`}
            onBlur={() => void handleBlur(block.id)}
            onChange={(event) => handleTextChange(block, event.target.value)}
            onKeyDown={(event) => void handleTextKeyDown(event, block, index)}
            placeholder="To-do item…"
            ref={(element) => setInputRef(block.id, element)}
            rows={1}
            value={block.content.text}
          />
        </label>
      );
    }

    if (block.type === "image") {
      const isEditing = editingImageIds.has(block.id);
      const imageContent = normalizeImageContent(block.content);
      const hasUrlShape = isValidImageUrl(imageContent.url);
      const validationState = imageValidationState[block.id];
      const isCheckingImage =
        Boolean(imageContent.url) &&
        hasUrlShape &&
        validationState?.url === imageContent.url &&
        validationState?.status === "loading";
      const hasLoadedImage =
        Boolean(imageContent.url) &&
        hasUrlShape &&
        validationState?.url === imageContent.url &&
        validationState?.status === "loaded";
      const hasImageError =
        Boolean(imageContent.url) &&
        (!hasUrlShape ||
          (validationState?.url === imageContent.url && validationState?.status === "error"));

      return (
        <div className="editor-image-shell">
          {hasLoadedImage && !isEditing ? (
            <div
              className={`editor-image-preview-shell editor-image-preview-shell--${imageContent.alignment}`}
              data-image-frame
              style={{ ["--image-width"]: `${imageContent.width}%` }}
            >
              <div className="editor-image-floating-bar" onClick={(event) => event.stopPropagation()}>
                {IMAGE_ALIGNMENT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={
                      imageContent.alignment === option.value
                        ? "editor-image-align-btn editor-image-align-btn--active"
                        : "editor-image-align-btn"
                    }
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleImageLayoutChange(block.id, { alignment: option.value });
                    }}
                    title={option.label}
                    type="button"
                  >
                    <span className={`editor-image-align-icon editor-image-align-icon--${option.value}`}>
                      <span />
                    </span>
                  </button>
                ))}
              </div>
              <button
                className="editor-image-preview-button"
                onClick={() => setImageEditing(block.id, true)}
                type="button"
              >
                <img
                  alt="Block visual"
                  className="editor-image-preview"
                  src={imageContent.url}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                />
                <span className="editor-image-hint">Click image to edit URL</span>
              </button>
              <button
                aria-label="Resize image"
                className="editor-image-resize-handle"
                onMouseDown={(event) => handleImageResizeStart(event, block.id)}
                onClick={(event) => event.preventDefault()}
                type="button"
              />
            </div>
          ) : (
            <>
              <input
                className="editor-url-input"
                onBlur={() => {
                  void handleBlur(block.id);
                  if (hasLoadedImage) {
                    setImageEditing(block.id, false);
                  }
                }}
                onChange={(event) => handleImageChange(block, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (hasLoadedImage || !imageContent.url) {
                      void handleBlur(block.id);
                      if (hasLoadedImage) {
                        setImageEditing(block.id, false);
                      }
                      void insertNewBlockAfter(index, "paragraph", "", 0)
                        .then(() => {
                          setStatusText("Inserted paragraph below image.");
                          setError("");
                        })
                        .catch((requestError) => {
                          setError(requestError.message);
                          markSaveError();
                        });
                    }
                    return;
                  }

                  if (event.key === "Backspace" && !imageContent.url) {
                    event.preventDefault();
                    void (async () => {
                      await handleDeleteEmptyBlock(index);
                    })();
                  }
                }}
                placeholder="Paste image URL and press Enter…"
                ref={(element) => setInputRef(block.id, element)}
                type="url"
                value={imageContent.url}
              />
              {isCheckingImage ? (
                <p className="editor-image-hint-text">Checking image link…</p>
              ) : hasImageError ? (
                <p className="editor-image-error">
                  ⚠ Invalid image URL. Please use a direct image link that actually loads.
                </p>
              ) : !imageContent.url ? (
                <p className="editor-image-hint-text">
                  Paste a direct image link and press Enter to preview.
                </p>
              ) : null}
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
          onChange={(event) => handleTextChange(block, event.target.value)}
          onKeyDown={(event) => void handleTextKeyDown(event, block, index)}
          placeholder={{
            paragraph: "Type '/' for commands…",
            heading_1: "Heading 1",
            heading_2: "Heading 2",
            code: "Write code here…",
          }[block.type] ?? ""}
          ref={(element) => setInputRef(block.id, element)}
          rows={1}
          value={block.content.text}
        />
        {slashMenu?.blockId === block.id ? (
          <div
            className="slash-menu"
            ref={(el) => {
              if (!el || el.dataset.positioned) return;
              el.dataset.positioned = "true";
              const rect = el.getBoundingClientRect();
              const spaceBelow = window.innerHeight - rect.top;
              if (spaceBelow < rect.height + 8) {
                el.classList.add("slash-menu--flip");
              }
            }}
          >
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

  if (status === "loading" || (status === "authenticated" && !isLoaded)) {
    return (
      <section className="editor-page-shell page-transition">
        <div className="editor-layout">
          <aside className="editor-sidebar editor-sidebar--loading">
            <div className="editor-sidebar-main">
              <div className="skeleton-shimmer" style={{ width: "42%", height: 18 }} />
              <div className="skeleton-shimmer" style={{ width: "86%", height: 24, borderRadius: 8 }} />
              <div className="skeleton-shimmer" style={{ width: "100%", height: 42, borderRadius: 14 }} />
              <div className="skeleton-shimmer" style={{ width: "100%", height: 42, borderRadius: 14 }} />
            </div>
            <div className="skeleton-shimmer" style={{ width: "100%", height: 46, borderRadius: 999 }} />
          </aside>
          <div className="editor-main-shell">
            <div className="editor-canvas">
              <div className="editor-paper">
                {[73, 58, 60, 48, 79, 75].map((width, i) => (
                  <div key={i} className="editor-block-row" style={{ padding: "8px 0", border: "none" }}>
                    <div className="editor-block-gutter" style={{ width: 44 }} />
                    <div className="skeleton-shimmer" style={{ width: `${width}%`, height: 20, borderRadius: 4 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="editor-page-shell">
      <div className="editor-layout">
        <aside className="editor-sidebar">
          <div className="editor-sidebar-main">
            <div className="editor-sidebar-heading">
              <span className="editor-sidebar-label">Document</span>
              <span className="editor-doc-name">{document?.title ?? "Untitled"}</span>
            </div>

            <div
              className={`save-indicator editor-sidebar-save-indicator${saveState === "idle" ? " save-indicator--idle" : saveState === "error" ? " save-indicator--error" : ""}`}
              aria-live="polite"
            >
              {saveState === "saving" ? (
                <span className="save-spinner" />
              ) : saveState === "saved" ? (
                <span className="save-check" />
              ) : saveState === "error" ? (
                <span className="save-error-icon">⚠</span>
              ) : (
                <span className="save-cloud-icon">☁</span>
              )}
              <span className="save-text">
                {saveState === "saving"
                  ? "Saving…"
                  : saveState === "saved"
                    ? lastSavedAt
                      ? `Saved at ${lastSavedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}`
                      : "Saved"
                    : saveState === "error"
                      ? "Save failed"
                      : lastSavedAt
                        ? `Auto‑saved at ${lastSavedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}`
                        : "Auto‑save on"}
              </span>
            </div>

            <div className="editor-sidebar-actions">
              <div className="share-shell" ref={shareShellRef}>
                <button
                  className="share-btn editor-sidebar-action-btn"
                  onClick={() => setShareOpen((current) => !current)}
                  type="button"
                >
                  Share
                </button>
                {shareOpen ? (
                  <div className="share-panel editor-sidebar-share-panel">
                    <p className="share-panel-title">Public read-only link</p>
                    <p className="share-panel-copy">
                      Anyone with this link can view. Editing is blocked at API level.
                    </p>
                    <div className="share-controls">
                      <button
                        className="share-action-btn"
                        disabled={shareBusy}
                        onClick={() => void handleGenerateShareLink()}
                        type="button"
                      >
                        {shareBusy ? "Working..." : document?.isPublic ? "Rotate link" : "Generate link"}
                      </button>
                      <button
                        className="share-action-btn share-action-btn--danger"
                        disabled={shareBusy || !document?.isPublic}
                        onClick={() => void handleDisableShareLink()}
                        type="button"
                      >
                        Disable
                      </button>
                    </div>
                    {shareLink ? (
                      <div className="share-link-row">
                        <input className="share-link-input" readOnly value={shareLink} />
                        <button className="share-copy-btn" onClick={() => void handleCopyShareLink()} type="button">
                          Copy
                        </button>
                      </div>
                    ) : document?.isPublic ? (
                      <p className="share-panel-note">
                        Sharing is enabled, but the previous token is hidden. Generate a new link to copy.
                      </p>
                    ) : (
                      <p className="share-panel-note">Sharing is currently off.</p>
                    )}
                    {shareMessage ? <p className="share-panel-message">{shareMessage}</p> : null}
                  </div>
                ) : null}
              </div>
              <button
                className="save-btn editor-sidebar-action-btn"
                disabled={saveState === "saving"}
                onClick={() => void handleSaveAll()}
                title="Save all (Ctrl+S)"
                type="button"
              >
                {saveState === "saving" ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          <Link className="editor-back-link editor-back-link--sidebar" href="/dashboard">
            ← Back to dashboard
          </Link>
        </aside>

        <div className="editor-main-shell">
          <div className="editor-canvas">
        <h1 className="document-title">{document?.title ?? "Untitled"}</h1>
        <p className="document-subtitle">
          {document
            ? `Last updated ${(lastSavedAt || new Date(document.updatedAt)).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} at ${(lastSavedAt || new Date(document.updatedAt)).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}`
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

        {/* Floating Bulk Action Bar */}
        {isBulkMode && (
          <div className="bulk-action-bar">
            <span>{selectedBlockIds.size} selected</span>
            <div className="bulk-action-buttons">
              <button
                className="bulk-btn bulk-btn--select"
                onClick={() => {
                  if (selectedBlockIds.size === blocks.length) {
                    setSelectedBlockIds(new Set());
                  } else {
                    setSelectedBlockIds(new Set(blocks.map(b => b.id)));
                  }
                }}
              >
                {selectedBlockIds.size === blocks.length ? "Deselect All" : "Select All"}
              </button>
              <button className="bulk-btn bulk-btn--delete" onClick={() => void handleBulkDelete()}>
                Delete
              </button>
              <button className="bulk-btn" onClick={() => {
                setIsBulkMode(false);
                setSelectedBlockIds(new Set());
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {error ? <p className="error-text" style={{ marginBottom: 16 }}>{error}</p> : null}

        <div className="editor-paper">
          {blocks.length === 0 ? (
            <div className="empty-state-illustration" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', opacity: 0.6 }}>
               <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16, color: 'var(--text-tertiary)' }}>
                 <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                 <polyline points="14 2 14 8 20 8"/>
                 <line x1="12" y1="18" x2="12" y2="12"/>
                 <line x1="9" y1="15" x2="15" y2="15"/>
               </svg>
               <h3 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, marginTop: 0 }}>It's quiet in here…</h3>
               <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9375rem', margin: 0 }}>Type your first word, or use the menu above to insert a block.</p>
            </div>
          ) : (
            <>
              {blocks.map((block, index) => (
                <div className="editor-item-wrapper" key={block.id} style={{ display: "contents" }}>
                  {/* Gap inserter BEFORE this block */}
                  <div className="block-gap-inserter">
                    <div className="block-gap-line" />
                    <button
                      className="block-gap-btn"
                      onClick={() => void insertNewBlockAfter(index - 1).catch((err) => setError(err.message))}
                      title="Add block"
                      type="button"
                    >+</button>
                    <div className="block-gap-line" />
                  </div>

                  <article
                    className={[
                      "editor-block-row",
                      isBulkMode && selectedBlockIds.has(block.id) ? "editor-block-row--selected" : "",
                      draggedId === block.id ? "editor-block-row--dragging" : "",
                    ].filter(Boolean).join(" ")}
                    data-block-id={block.id}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (!draggedId || draggedId === block.id) return;
                      if (lastDragOverRef.current === block.id) return;
                      lastDragOverRef.current = block.id;
                      const snap = dragSnapshotRef.current;
                      if (!snap) return;
                      const preview = reorderBlocksArray(snap, draggedId, block.id);
                      flushSync(() => setBlocks(preview));
                    }}
                  >
                    <div className="editor-block-gutter">
                      <input
                        type="checkbox"
                        className={`editor-bulk-checkbox ${!isBulkMode ? "editor-bulk-checkbox--hover-only" : ""}`}
                        checked={selectedBlockIds.has(block.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          if (checked && !isBulkMode) {
                            setIsBulkMode(true);
                          }
                          setSelectedBlockIds(prev => {
                            const next = new Set(prev);
                            if (checked) next.add(block.id);
                            else next.delete(block.id);
                            if (!checked && next.size === 0) {
                              setIsBulkMode(false);
                            }
                            return next;
                          });
                        }}
                      />
                      {!isBulkMode && (
                        <button
                          aria-label="Drag block"
                          className="editor-drag-handle"
                          draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          const articleNode = e.currentTarget.closest("article");
                          if (articleNode) {
                            e.dataTransfer.setDragImage(articleNode, 15, 15);
                          }
                          dragSnapshotRef.current = [...blocks];
                          dropOkRef.current = false;
                          lastDragOverRef.current = null;
                          // Delay the state update to ensure the browser captures a fully opaque ghost image
                          requestAnimationFrame(() => {
                            setDraggedId(block.id);
                          });
                        }}
                        onDragEnd={() => {
                          // Drag dropped outside of the trash means we KEEP the new reordered state
                          if (!dragOverTrash && dragSnapshotRef.current) {
                            const oldIndex = dragSnapshotRef.current.findIndex((b) => b.id === block.id);
                            const newIndex = blocksRef.current.findIndex((b) => b.id === block.id);
                            // Only hit API if the position actually changed
                            if (oldIndex !== newIndex) {
                              void persistReorder(block.id, blocksRef.current);
                            }
                          } else if (dragOverTrash && dragSnapshotRef.current) {
                            // If dropped in trash, the trash onDrop handler deletes it natively.
                          }

                          dragSnapshotRef.current = null;
                          dropOkRef.current = false;
                          lastDragOverRef.current = null;
                          setDraggedId(null);
                          setDragOverId(null);
                          setDragOverTrash(false);
                        }}
                        type="button"
                      >
                        ⋮⋮
                      </button>
                      )}
                    </div>
                    <div className="editor-block-content">{renderEditableBlock(block, index)}</div>
                  </article>
                </div>
              ))}

              {/* Gap inserter AFTER the last block */}
              <div className="block-gap-inserter">
                <div className="block-gap-line" />
                <button
                  className="block-gap-btn"
                  onClick={() => void insertNewBlockAfter(blocks.length - 1).catch((err) => setError(err.message))}
                  title="Add block"
                  type="button"
                >+</button>
                <div className="block-gap-line" />
              </div>
            </>
          )}
        </div>
        <div aria-hidden="true" className="editor-end-spacer" />
      </div>
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
