import { z } from "zod";
import { BLOCK_TYPES } from "./constants.js";

const textBlockContentSchema = z.object({
  text: z.string()
});

const todoBlockContentSchema = z.object({
  text: z.string(),
  checked: z.boolean()
});

const dividerBlockContentSchema = z.object({}).strict();

const imageUrlSchema = z.union([z.literal(""), z.string().url("Image block requires a valid URL.")]);

const imageBlockContentSchema = z.object({
  url: imageUrlSchema
});

export function getBlockContentSchema(type) {
  switch (type) {
    case "paragraph":
    case "heading_1":
    case "heading_2":
    case "code":
      return textBlockContentSchema;
    case "todo":
      return todoBlockContentSchema;
    case "divider":
      return dividerBlockContentSchema;
    case "image":
      return imageBlockContentSchema;
    default:
      return null;
  }
}

export function validateBlockContent(type, content) {
  const schema = getBlockContentSchema(type);

  if (!schema) {
    throw new Error(`Unsupported block type: ${type}`);
  }

  return schema.parse(content);
}

export const createBlockSchema = z.object({
  type: z.enum(BLOCK_TYPES),
  content: z.unknown(),
  orderIndex: z.number().optional(),
  parentId: z.string().uuid().nullable().optional()
});

export const updateBlockSchema = z.object({
  type: z.enum(BLOCK_TYPES),
  content: z.unknown()
});
