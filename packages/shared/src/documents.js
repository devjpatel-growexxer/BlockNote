import { z } from "zod";

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
