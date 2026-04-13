export const APP_NAME = "BlockNote Editor";

export const BLOCK_TYPES = [
  "paragraph",
  "heading_1",
  "heading_2",
  "todo",
  "code",
  "divider",
  "image"
];

export const TEXT_BLOCK_TYPES = [
  "paragraph",
  "heading_1",
  "heading_2",
  "todo",
  "code"
];

export const DEFAULT_BLOCK_CONTENT = {
  paragraph: { text: "" },
  heading_1: { text: "" },
  heading_2: { text: "" },
  todo: { text: "", checked: false },
  code: { text: "" },
  divider: {},
  image: { url: "" }
};

export const API_PREFIX = "/api/v1";
