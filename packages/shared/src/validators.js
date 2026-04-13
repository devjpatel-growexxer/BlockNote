import { BLOCK_TYPES, DEFAULT_BLOCK_CONTENT } from "./constants.js";

export function isValidBlockType(value) {
  return BLOCK_TYPES.includes(value);
}

export function getDefaultBlockContent(type) {
  if (!isValidBlockType(type)) {
    throw new Error(`Unsupported block type: ${type}`);
  }

  return structuredClone(DEFAULT_BLOCK_CONTENT[type]);
}
