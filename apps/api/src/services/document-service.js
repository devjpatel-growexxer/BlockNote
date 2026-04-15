import { getDefaultBlockContent, validateBlockContent } from "@blocknote/shared";
import { ZodError } from "zod";
import { HTTP_STATUS } from "../constants/auth-constants.js";
import { DOCUMENT_FORBIDDEN, DOCUMENT_NOT_FOUND } from "../constants/error-messages.js";
import { updateBlockWithinDocument } from "../repositories/block-repository.js";
import {
  bumpDocumentVersion,
  createDocumentForUser,
  deleteDocumentById,
  findDocumentById,
  findDocumentByIdForUpdate,
  listDocumentsByUserId,
  updateDocumentTitle
} from "../repositories/document-repository.js";
import { AppError } from "../utils/app-error.js";
import { withTransaction } from "../utils/db.js";

function ensureOwnership(document, userId) {
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

export async function listDocuments(userId) {
  return listDocumentsByUserId(userId);
}

export async function createDocument({ userId, title }) {
  return createDocumentForUser({
    userId,
    title,
    initialBlock: {
      type: "paragraph",
      content: getDefaultBlockContent("paragraph"),
      orderIndex: 1,
      parentId: null
    }
  });
}

export async function getDocument({ userId, documentId }) {
  const document = await findDocumentById(documentId);
  ensureOwnership(document, userId);
  return document;
}

export async function renameDocument({ userId, documentId, title }) {
  const document = await findDocumentById(documentId);
  ensureOwnership(document, userId);
  return updateDocumentTitle({ documentId, title });
}

export async function removeDocument({ userId, documentId }) {
  const document = await findDocumentById(documentId);
  ensureOwnership(document, userId);
  await deleteDocumentById(documentId);
}

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

export async function saveDocumentContent({ userId, documentId, baseVersion, blocks }) {
  return withTransaction(async (client) => {
    const document = await findDocumentByIdForUpdate(documentId, client);
    ensureOwnership(document, userId);

    if (document.version !== baseVersion) {
      throw new AppError({
        message: "Document has newer changes. Please sync and retry.",
        statusCode: HTTP_STATUS.CONFLICT,
        code: "DOCUMENT_VERSION_CONFLICT",
        details: {
          currentVersion: document.version,
          baseVersion
        }
      });
    }

    const updatedBlocks = [];
    for (const blockUpdate of blocks) {
      const normalizedContent = normalizeBlockContent(blockUpdate.type, blockUpdate.content);
      const updated = await updateBlockWithinDocument(
        {
          documentId,
          blockId: blockUpdate.id,
          type: blockUpdate.type,
          content: normalizedContent
        },
        client
      );

      if (!updated) {
        throw new AppError({
          message: "One or more blocks do not belong to this document.",
          statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          code: "BLOCK_DOCUMENT_MISMATCH"
        });
      }

      updatedBlocks.push(updated);
    }

    const nextDocument = await bumpDocumentVersion(documentId, client);

    return {
      document: nextDocument,
      blocks: updatedBlocks
    };
  });
}
