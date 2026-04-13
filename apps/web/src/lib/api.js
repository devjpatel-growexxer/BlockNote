import { getClientEnv } from "./env";

export async function apiRequest(path, { method = "GET", body, token, signal } = {}) {
  const env = getClientEnv();
  const response = await fetch(`${env.apiUrl}${path}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || "Request failed.");
    error.status = response.status;
    error.code = payload?.code;
    error.details = payload?.details || null;
    throw error;
  }

  return payload;
}
