import { getDefaultBlockContent } from "@blocknote/shared";
import { HTTP_STATUS } from "../constants/auth-constants.js";
import { DOCUMENT_FORBIDDEN, DOCUMENT_NOT_FOUND } from "../constants/error-messages.js";
import {
  createDocumentForUser,
  deleteDocumentById,
  findDocumentById,
  listDocumentsByUserId,
  updateDocumentTitle
} from "../repositories/document-repository.js";
import { AppError } from "../utils/app-error.js";

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
