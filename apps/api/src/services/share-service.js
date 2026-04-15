import { HTTP_STATUS } from "../constants/auth-constants.js";
import { DOCUMENT_FORBIDDEN, DOCUMENT_NOT_FOUND } from "../constants/error-messages.js";
import { listBlocksByDocumentId } from "../repositories/block-repository.js";
import {
  findDocumentById,
  findPublicDocumentByShareTokenHash,
  updateDocumentSharing
} from "../repositories/document-repository.js";
import { findUserById } from "../repositories/user-repository.js";
import { AppError } from "../utils/app-error.js";
import { generateShareToken, hashShareToken } from "../utils/share-token.js";

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

export async function generateDocumentShareLink({ userId, documentId }) {
  const document = await findDocumentById(documentId);
  ensureOwnership(document, userId);

  const shareToken = generateShareToken();
  const shareTokenHash = hashShareToken(shareToken);
  const updatedDocument = await updateDocumentSharing({
    documentId,
    shareTokenHash,
    isPublic: true
  });

  return {
    document: updatedDocument,
    shareToken,
    sharePath: `/share/${shareToken}`
  };
}

export async function disableDocumentShareLink({ userId, documentId }) {
  const document = await findDocumentById(documentId);
  ensureOwnership(document, userId);

  const updatedDocument = await updateDocumentSharing({
    documentId,
    shareTokenHash: null,
    isPublic: false
  });

  return { document: updatedDocument };
}

export async function getSharedDocumentByToken(shareToken) {
  const shareTokenHash = hashShareToken(shareToken);
  const document = await findPublicDocumentByShareTokenHash(shareTokenHash);

  if (!document) {
    throw new AppError({
      message: "Shared document not found or disabled.",
      statusCode: HTTP_STATUS.NOT_FOUND,
      code: "SHARE_NOT_FOUND"
    });
  }

  const owner = await findUserById(document.userId);
  const blocks = await listBlocksByDocumentId(document.id);
  return {
    document,
    blocks,
    owner: owner
      ? {
          id: owner.id,
          email: owner.email,
          createdAt: owner.createdAt
        }
      : null
  };
}
