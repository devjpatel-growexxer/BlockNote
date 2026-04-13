import { createDocumentSchema, updateDocumentSchema } from "@blocknote/shared";
import { HTTP_STATUS } from "../constants/auth-constants.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import {
  createDocument,
  getDocument,
  listDocuments,
  removeDocument,
  renameDocument
} from "../services/document-service.js";
import { parseOrThrow } from "../utils/validation.js";

export function registerDocumentRoutes(app) {
  app.get("/documents", requireAuth, async (request, response, next) => {
    try {
      const documents = await listDocuments(request.auth.userId);
      response.status(HTTP_STATUS.OK).json({ documents });
    } catch (error) {
      next(error);
    }
  });

  app.post("/documents", requireAuth, async (request, response, next) => {
    try {
      const input = parseOrThrow(createDocumentSchema, request.body);
      const document = await createDocument({
        userId: request.auth.userId,
        title: input.title
      });

      response.status(HTTP_STATUS.CREATED).json({ document });
    } catch (error) {
      next(error);
    }
  });

  app.get("/documents/:id", requireAuth, async (request, response, next) => {
    try {
      const document = await getDocument({
        userId: request.auth.userId,
        documentId: request.params.id
      });

      response.status(HTTP_STATUS.OK).json({ document });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/documents/:id", requireAuth, async (request, response, next) => {
    try {
      const input = parseOrThrow(updateDocumentSchema, request.body);
      const document = await renameDocument({
        userId: request.auth.userId,
        documentId: request.params.id,
        title: input.title
      });

      response.status(HTTP_STATUS.OK).json({ document });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/documents/:id", requireAuth, async (request, response, next) => {
    try {
      await removeDocument({
        userId: request.auth.userId,
        documentId: request.params.id
      });

      response.status(HTTP_STATUS.OK).json({ success: true });
    } catch (error) {
      next(error);
    }
  });
}
