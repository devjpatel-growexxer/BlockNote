import { getDefaultBlockContent, validateBlockContent } from "@blocknote/shared";
import { ZodError } from "zod";
import { HTTP_STATUS } from "../constants/auth-constants.js";
import { DOCUMENT_FORBIDDEN, DOCUMENT_NOT_FOUND, NOT_FOUND } from "../constants/error-messages.js";
import {
  createBlock,
  deleteBlockById,
  findBlockById,
  findMaxOrderIndexByDocumentId,
  listBlockOrderByDocumentId,
  listBlocksByDocumentId,
  renormalizeBlockOrder,
  updateBlock,
  updateBlockOrderIndex
} from "../repositories/block-repository.js";
import { findDocumentById, touchDocument } from "../repositories/document-repository.js";
import { AppError } from "../utils/app-error.js";

function normalizeBlockContent(type, content) {
  try {
    return validateBlockContent(type, content);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError({
        message: "Request validation failed.",
        statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: "BLOCK_VALIDATION_ERROR",
        details: error.flatten()
      });
    }

    throw error;
  }
}

function ensureDocumentOwnership(document, userId) {
  if (!document) {
    throw new AppError({
      message: DOCUMENT_NOT_FOUND,
      statusCode: HTTP_STATUS.NOT_FOUND,
      code: "DOCUMENT_NOT_FOUND"
    });
  }

  if (document.userId !== userId) {
    throw new AppError({
      message: DOCUMENT_FORBIDDEN,
      statusCode: HTTP_STATUS.FORBIDDEN,
      code: "DOCUMENT_FORBIDDEN"
    });
  }
}

function ensureBlockOwnership(block, userId) {
  if (!block) {
    throw new AppError({
      message: NOT_FOUND,
      statusCode: HTTP_STATUS.NOT_FOUND,
      code: "BLOCK_NOT_FOUND"
    });
  }

  if (block.ownerId !== userId) {
    throw new AppError({
      message: DOCUMENT_FORBIDDEN,
      statusCode: HTTP_STATUS.FORBIDDEN,
      code: "DOCUMENT_FORBIDDEN"
    });
  }
}

export async function listDocumentBlocks({ userId, documentId }) {
  const document = await findDocumentById(documentId);
  ensureDocumentOwnership(document, userId);
  return listBlocksByDocumentId(documentId);
}

export async function createDocumentBlock({ userId, documentId, type, content, orderIndex, parentId }) {
  const document = await findDocumentById(documentId);
  ensureDocumentOwnership(document, userId);

  const normalizedContent = normalizeBlockContent(type, content ?? getDefaultBlockContent(type));
  const maxOrderIndex = await findMaxOrderIndexByDocumentId(documentId);
  const resolvedOrderIndex = typeof orderIndex === "number" ? orderIndex : (maxOrderIndex ?? 0) + 1;

  const block = await createBlock({
    documentId,
    type,
    content: normalizedContent,
    orderIndex: resolvedOrderIndex,
    parentId: parentId ?? null
  });

  await touchDocument(documentId);
  return block;
}

export async function updateDocumentBlock({ userId, blockId, type, content }) {
  const block = await findBlockById(blockId);
  ensureBlockOwnership(block, userId);
  const normalizedContent = normalizeBlockContent(type, content);

  const updatedBlock = await updateBlock({
    blockId,
    type,
    content: normalizedContent
  });

  await touchDocument(block.documentId);
  return updatedBlock;
}

export async function removeDocumentBlock({ userId, blockId }) {
  const block = await findBlockById(blockId);
  ensureBlockOwnership(block, userId);
  await deleteBlockById(blockId);
  await touchDocument(block.documentId);
}

function getNeighborOrderIndex(orderList, neighborId) {
  if (!neighborId) {
    return null;
  }

  const neighbor = orderList.find((entry) => entry.id === neighborId);
  return neighbor ? neighbor.orderIndex : null;
}

export async function reorderDocumentBlock({ userId, documentId, blockId, beforeId, afterId }) {
  const document = await findDocumentById(documentId);
  ensureDocumentOwnership(document, userId);

  const block = await findBlockById(blockId);
  if (!block || block.documentId !== documentId) {
    throw new AppError({
      message: NOT_FOUND,
      statusCode: HTTP_STATUS.NOT_FOUND,
      code: "BLOCK_NOT_FOUND"
    });
  }

  const orderList = await listBlockOrderByDocumentId(documentId);
  const beforeIndex = getNeighborOrderIndex(orderList, beforeId);
  const afterIndex = getNeighborOrderIndex(orderList, afterId);

  let nextOrderIndex;

  if (beforeIndex !== null && afterIndex !== null) {
    nextOrderIndex = (beforeIndex + afterIndex) / 2;
  } else if (beforeIndex !== null) {
    nextOrderIndex = beforeIndex + 1;
  } else if (afterIndex !== null) {
    nextOrderIndex = afterIndex - 1;
  } else {
    nextOrderIndex = orderList.length + 1;
  }

  const gap = beforeIndex !== null && afterIndex !== null ? Math.abs(afterIndex - beforeIndex) : null;

  if (gap !== null && gap < 0.001) {
    await renormalizeBlockOrder(documentId);
    await touchDocument(documentId);
    return listBlocksByDocumentId(documentId);
  }

  await updateBlockOrderIndex(blockId, nextOrderIndex);
  await touchDocument(documentId);

  return listBlocksByDocumentId(documentId);
}
