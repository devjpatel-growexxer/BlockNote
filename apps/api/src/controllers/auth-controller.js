import { loginSchema, registerSchema } from "@blocknote/shared";
import { AUTH_CODES, HTTP_STATUS } from "../constants/auth-constants.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import {
  getCurrentUser,
  loginUser,
  refreshUserSession,
  registerUser
} from "../services/auth-service.js";
import { clearRefreshCookie, getRefreshCookieOptions } from "../utils/cookies.js";
import { getServerEnv } from "../utils/env.js";
import { parseOrThrow } from "../utils/validation.js";

export function registerAuthRoutes(app) {
  app.post("/auth/register", async (request, response, next) => {
    try {
      const input = parseOrThrow(registerSchema, request.body);
      const authResult = await registerUser(input);
      const env = getServerEnv();

      response.cookie(env.refreshCookieName, authResult.refreshToken, getRefreshCookieOptions());
      response.status(HTTP_STATUS.CREATED).json({
        user: authResult.user,
        accessToken: authResult.accessToken
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/auth/login", async (request, response, next) => {
    try {
      const input = parseOrThrow(loginSchema, request.body);
      const authResult = await loginUser(input);
      const env = getServerEnv();

      response.cookie(env.refreshCookieName, authResult.refreshToken, getRefreshCookieOptions());
      response.status(HTTP_STATUS.OK).json({
        user: authResult.user,
        accessToken: authResult.accessToken
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/auth/refresh", async (request, response, next) => {
    try {
      const env = getServerEnv();
      const refreshToken = request.cookies[env.refreshCookieName];
      const authResult = await refreshUserSession(refreshToken);

      response.cookie(env.refreshCookieName, authResult.refreshToken, getRefreshCookieOptions());
      response.status(HTTP_STATUS.OK).json({
        user: authResult.user,
        accessToken: authResult.accessToken
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/auth/logout", (_request, response) => {
    clearRefreshCookie(response);
    response.status(HTTP_STATUS.OK).json({
      code: AUTH_CODES.AUTH_REQUIRED,
      message: "Logged out successfully."
    });
  });

  app.get("/auth/me", requireAuth, async (request, response, next) => {
    try {
      const user = await getCurrentUser(request.auth.userId);
      response.status(HTTP_STATUS.OK).json({ user });
    } catch (error) {
      next(error);
    }
  });
}
