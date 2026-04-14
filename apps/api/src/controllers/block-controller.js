import { createBlockSchema, reorderBlocksSchema, updateBlockSchema } from "@blocknote/shared";
import { HTTP_STATUS } from "../constants/auth-constants.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import {
  createDocumentBlock,
  listDocumentBlocks,
  removeDocumentBlock,
  reorderDocumentBlock,
  updateDocumentBlock
} from "../services/block-service.js";
import { parseOrThrow } from "../utils/validation.js";

export function registerBlockRoutes(app) {
  app.get("/documents/:id/blocks", requireAuth, async (request, response, next) => {
    try {
      const blocks = await listDocumentBlocks({
        userId: request.auth.userId,
        documentId: request.params.id
      });

      response.status(HTTP_STATUS.OK).json({ blocks });
    } catch (error) {
      next(error);
    }
  });

  app.post("/documents/:id/blocks", requireAuth, async (request, response, next) => {
    try {
      const input = parseOrThrow(createBlockSchema, request.body);
      const block = await createDocumentBlock({
        userId: request.auth.userId,
        documentId: request.params.id,
        type: input.type,
        content: input.content,
        orderIndex: input.orderIndex,
        parentId: input.parentId
      });

      response.status(HTTP_STATUS.CREATED).json({ block });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/blocks/:blockId", requireAuth, async (request, response, next) => {
    try {
      const input = parseOrThrow(updateBlockSchema, request.body);
      const block = await updateDocumentBlock({
        userId: request.auth.userId,
        blockId: request.params.blockId,
        type: input.type,
        content: input.content
      });

      response.status(HTTP_STATUS.OK).json({ block });
    } catch (error) {
      next(error);
    }
  });

  app.post("/documents/:id/blocks/reorder", requireAuth, async (request, response, next) => {
    try {
      const input = parseOrThrow(reorderBlocksSchema, request.body);
      const blocks = await reorderDocumentBlock({
        userId: request.auth.userId,
        documentId: request.params.id,
        blockId: input.blockId,
        beforeId: input.beforeId ?? null,
        afterId: input.afterId ?? null
      });

      response.status(HTTP_STATUS.OK).json({ blocks });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/blocks/:blockId", requireAuth, async (request, response, next) => {
    try {
      await removeDocumentBlock({
        userId: request.auth.userId,
        blockId: request.params.blockId
      });

      response.status(HTTP_STATUS.OK).json({ success: true });
    } catch (error) {
      next(error);
    }
  });
}
