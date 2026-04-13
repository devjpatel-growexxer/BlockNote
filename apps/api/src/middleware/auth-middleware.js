import { AUTH_CODES, HTTP_STATUS } from "../constants/auth-constants.js";
import { AppError } from "../utils/app-error.js";
import { verifyAccessToken } from "../utils/jwt.js";

export function requireAuth(request, _response, next) {
  const header = request.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(
      new AppError({
        message: "Authentication is required.",
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: AUTH_CODES.AUTH_REQUIRED
      })
    );
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);

    request.auth = {
      userId: payload.sub,
      email: payload.email,
      tokenType: payload.type
    };

    return next();
  } catch {
    return next(
      new AppError({
        message: "Authentication is required.",
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: AUTH_CODES.AUTH_REQUIRED
      })
    );
  }
}
