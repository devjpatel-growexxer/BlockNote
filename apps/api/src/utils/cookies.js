import { REFRESH_COOKIE_PATH } from "../constants/auth-constants.js";
import { getServerEnv } from "./env.js";

function getSameSiteValue() {
  return process.env.NODE_ENV === "production" ? "none" : "lax";
}

export function getRefreshCookieOptions() {
  const env = getServerEnv();

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: getSameSiteValue(),
    path: REFRESH_COOKIE_PATH,
    maxAge: env.jwtRefreshTtlDays * 24 * 60 * 60 * 1000
  };
}

export function clearRefreshCookie(response) {
  const env = getServerEnv();

  response.clearCookie(env.refreshCookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: getSameSiteValue(),
    path: REFRESH_COOKIE_PATH
  });
}
