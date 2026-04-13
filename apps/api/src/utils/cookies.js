import { AUTH_COOKIE_SAME_SITE } from "@blocknote/shared";
import { REFRESH_COOKIE_PATH } from "../constants/auth-constants.js";
import { getServerEnv } from "./env.js";

export function getRefreshCookieOptions() {
  const env = getServerEnv();

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: AUTH_COOKIE_SAME_SITE,
    path: REFRESH_COOKIE_PATH,
    maxAge: env.jwtRefreshTtlDays * 24 * 60 * 60 * 1000,
    secure:true
  };
}

export function clearRefreshCookie(response) {
  const env = getServerEnv();

  response.clearCookie(env.refreshCookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: AUTH_COOKIE_SAME_SITE,
    path: REFRESH_COOKIE_PATH
  });
}
