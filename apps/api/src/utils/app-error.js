export class AppError extends Error {
  constructor({ message, statusCode, code, details = null }) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
