import { getDefaultBlockContent, validateBlockContent } from "@blocknote/shared";
import { ZodError } from "zod";
import { HTTP_STATUS } from "../constants/auth-constants.js";
import { DOCUMENT_FORBIDDEN, DOCUMENT_NOT_FOUND, NOT_FOUND } from "../constants/error-messages.js";
import {
  createBlock,
  deleteBlockById,
  findBlockById,
  findMaxOrderIndexByDocumentId,
  listBlocksByDocumentId,
  updateBlock
} from "../repositories/block-repository.js";
import { findDocumentById } from "../repositories/document-repository.js";
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

  return createBlock({
    documentId,
    type,
    content: normalizedContent,
    orderIndex: resolvedOrderIndex,
    parentId: parentId ?? null
  });
}

export async function updateDocumentBlock({ userId, blockId, type, content }) {
  const block = await findBlockById(blockId);
  ensureBlockOwnership(block, userId);
  const normalizedContent = normalizeBlockContent(type, content);

  return updateBlock({
    blockId,
    type,
    content: normalizedContent
  });
}

export async function removeDocumentBlock({ userId, blockId }) {
  const block = await findBlockById(blockId);
  ensureBlockOwnership(block, userId);
  await deleteBlockById(blockId);
}
