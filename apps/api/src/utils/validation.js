import { ZodError } from "zod";
import { AUTH_CODES, HTTP_STATUS } from "../constants/auth-constants.js";
import { AppError } from "./app-error.js";

export function parseOrThrow(schema, payload) {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError({
        message: "Request validation failed.",
        statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: AUTH_CODES.VALIDATION_ERROR,
        details: error.flatten()
      });
    }

    throw error;
  }
}
