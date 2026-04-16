export const APP_NAME = "BlockNote Editor";
export const AUTH_COOKIE_SAME_SITE = "none";
export const MIN_PASSWORD_LENGTH = 8;
export const PASSWORD_NUMBER_PATTERN = /\d/;
export const ACCESS_TOKEN_MEMORY_KEY = "blocknote_access_token";
export const DEFAULT_USER_EMAIL = "";

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
  image: { url: "", width: 100, alignment: "center" }
};

export const API_PREFIX = "/api/v1";

export const AUTH_ERROR_CODES = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INVALID_REFRESH_TOKEN: "INVALID_REFRESH_TOKEN",
  EMAIL_IN_USE: "EMAIL_IN_USE",
  VALIDATION_ERROR: "VALIDATION_ERROR"
};
