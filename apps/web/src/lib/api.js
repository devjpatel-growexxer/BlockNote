import { getClientEnv } from "./env";

let accessTokenCache = "";
let refreshPromise = null;
let authFailureHandler = null;

export function setAuthFailureHandler(handler) {
  authFailureHandler = handler;
}

export function setAccessToken(token) {
  accessTokenCache = token || "";
}

export function getAccessToken() {
  return accessTokenCache;
}

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const env = getClientEnv();
  refreshPromise = fetch(`${env.apiUrl}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  })
    .then(async (response) => {
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
      const error = new Error(payload?.message || "Refresh failed.");
      error.status = response.status;
      throw error;
    }

    setAccessToken(payload.accessToken);
    return payload;
  })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function apiRequest(path, { method = "GET", body, token, signal, retryOnUnauthorized = true } = {}) {
  const env = getClientEnv();
  const resolvedToken = token ?? getAccessToken();

  const response = await fetch(`${env.apiUrl}${path}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    signal
  });

  const payload = await response.json().catch(() => null);

  if (response.status === 401 && retryOnUnauthorized) {
    try {
      await refreshAccessToken();
      return apiRequest(path, { method, body, signal, retryOnUnauthorized: false });
    } catch (refreshError) {
      if (typeof authFailureHandler === "function") {
        authFailureHandler();
      }

      const error = new Error(payload?.message || "Request failed.");
      error.status = response.status;
      error.code = payload?.code;
      error.details = payload?.details || null;
      throw error;
    }
  }

  if (!response.ok) {
    const error = new Error(payload?.message || "Request failed.");
    error.status = response.status;
    error.code = payload?.code;
    error.details = payload?.details || null;
    throw error;
  }

  return payload;
}
