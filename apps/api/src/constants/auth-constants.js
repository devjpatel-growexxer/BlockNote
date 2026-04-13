import { AUTH_ERROR_CODES } from "@blocknote/shared";

export const ACCESS_TOKEN_SUBJECT = "access";
export const REFRESH_TOKEN_SUBJECT = "refresh";
export const REFRESH_COOKIE_PATH = "/";

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422
};

export const AUTH_CODES = AUTH_ERROR_CODES;
