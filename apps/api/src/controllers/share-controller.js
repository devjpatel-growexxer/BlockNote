import { HTTP_STATUS } from "../constants/auth-constants.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import {
  disableDocumentShareLink,
  generateDocumentShareLink,
  getSharedDocumentByToken
} from "../services/share-service.js";

export function registerShareRoutes(app) {
  app.post("/documents/:id/share", requireAuth, async (request, response, next) => {
    try {
      const result = await generateDocumentShareLink({
        userId: request.auth.userId,
        documentId: request.params.id
      });

      response.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/documents/:id/share", requireAuth, async (request, response, next) => {
    try {
      const result = await disableDocumentShareLink({
        userId: request.auth.userId,
        documentId: request.params.id
      });

      response.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.get("/share/:token", async (request, response, next) => {
    try {
      const result = await getSharedDocumentByToken(request.params.token);
      response.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      next(error);
    }
  });
}
