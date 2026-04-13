import { INTERNAL_SERVER_ERROR } from "../constants/error-messages.js";

export function apiErrorHandler(error, _request, response, _next) {
  const status = error.statusCode || 500;
  const code = error.code || "INTERNAL_SERVER_ERROR";
  const message = error.message || INTERNAL_SERVER_ERROR;

  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }

  response.status(status).json({
    code,
    message,
    details: error.details || null
  });
}
