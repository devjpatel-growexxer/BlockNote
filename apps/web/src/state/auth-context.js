"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, setAccessToken, setAuthFailureHandler } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessTokenState] = useState("");
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    setAuthFailureHandler(() => {
      setAccessToken("");
      setAccessTokenState("");
      setUser(null);
      setStatus("guest");
      setError("Your session expired. Please log in again.");
    });

    let active = true;

    async function restoreSession() {
      try {
        const result = await apiRequest("/auth/refresh", { method: "POST" });

        if (!active) {
          return;
        }

        setAccessToken(result.accessToken);
        setAccessTokenState(result.accessToken);
        setUser(result.user);
        setStatus("authenticated");
      } catch {
        if (!active) {
          return;
        }

        setAccessToken("");
        setAccessTokenState("");
        setUser(null);
        setStatus("guest");
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  async function authenticate(mode, payload) {
    setError("");
    const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
    const result = await apiRequest(endpoint, {
      method: "POST",
      body: payload
    });

    setAccessToken(result.accessToken);
    setAccessTokenState(result.accessToken);
    setUser(result.user);
    setStatus("authenticated");

    return result;
  }

  async function refreshSession() {
    const result = await apiRequest("/auth/refresh", { method: "POST" });
    setAccessToken(result.accessToken);
    setAccessTokenState(result.accessToken);
    setUser(result.user);
    setStatus("authenticated");
    return result;
  }

  async function logout() {
    await apiRequest("/auth/logout", { method: "POST" });
    setAccessToken("");
    setAccessTokenState("");
    setUser(null);
    setStatus("guest");
  }

  const value = useMemo(
    () => ({
      accessToken,
      user,
      status,
      error,
      setError,
      authenticate,
      refreshSession,
      logout
    }),
    [accessToken, user, status, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
