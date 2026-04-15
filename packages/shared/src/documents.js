import { z } from "zod";
import { BLOCK_TYPES } from "./constants.js";

export const documentTitleSchema = z
  .string()
  .trim()
  .min(1, "Document title is required.")
  .max(200, "Document title must be 200 characters or less.");

export const createDocumentSchema = z.object({
  title: documentTitleSchema.default("Untitled document")
});

export const updateDocumentSchema = z.object({
  title: documentTitleSchema
});

export const saveDocumentContentSchema = z.object({
  baseVersion: z.number().int().min(1),
  blocks: z
    .array(
      z.object({
        id: z.string().uuid(),
        type: z.enum(BLOCK_TYPES),
        content: z.unknown()
      })
    )
    .min(1, "At least one block update is required.")
});
