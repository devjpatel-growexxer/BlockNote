"use client";

import { useEffect, useState } from "react";
import { MIN_PASSWORD_LENGTH } from "@blocknote/shared";
import { apiRequest } from "@/lib/api";
import { DocumentDashboard } from "./document-dashboard";

const initialFormState = {
  email: "",
  password: ""
};

export function AuthShell() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialFormState);
  const [session, setSession] = useState({
    accessToken: "",
    user: null
  });
  const [status, setStatus] = useState("Checking session...");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const refreshResult = await apiRequest("/auth/refresh", {
          method: "POST"
        });

        if (!isMounted) {
          return;
        }

        setSession({
          accessToken: refreshResult.accessToken,
          user: refreshResult.user
        });
        setStatus("Session restored.");
      } catch {
        if (!isMounted) {
          return;
        }

        setStatus("No active session.");
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
      const result = await apiRequest(endpoint, {
        method: "POST",
        body: form
      });

      setSession({
        accessToken: result.accessToken,
        user: result.user
      });
      setStatus(mode === "register" ? "Account created." : "Logged in.");
      setForm(initialFormState);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLoadProfile() {
    setError("");

    try {
      const result = await apiRequest("/auth/me", {
        token: session.accessToken
      });
      setSession((current) => ({
        ...current,
        user: result.user
      }));
      setStatus("Loaded profile from protected endpoint.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleLogout() {
    setError("");

    try {
      await apiRequest("/auth/logout", { method: "POST" });
      setSession({
        accessToken: "",
        user: null
      });
      setStatus("Logged out.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="auth-panel">
      <div className="auth-mode-switch">
        <button
          className={mode === "login" ? "active" : ""}
          onClick={() => setMode("login")}
          type="button"
        >
          Login
        </button>
        <button
          className={mode === "register" ? "active" : ""}
          onClick={() => setMode("register")}
          type="button"
        >
          Register
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>Email</span>
          <input
            autoComplete="email"
            name="email"
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            type="email"
            value={form.email}
          />
        </label>

        <label>
          <span>Password</span>
          <input
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            name="password"
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
            type="password"
            value={form.password}
          />
        </label>

        {mode === "register" ? (
          <p className="helper-copy">
            Password must be at least {MIN_PASSWORD_LENGTH} characters and include one number.
          </p>
        ) : null}

        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? "Submitting..." : mode === "register" ? "Create account" : "Login"}
        </button>
      </form>

      <div className="session-card">
        <p className="session-status">{status}</p>
        {error ? <p className="error-text">{error}</p> : null}
        <p className="session-copy">
          Current user: {session.user ? session.user.email : "Not authenticated"}
        </p>

        <div className="session-actions">
          <button
            className="secondary-button"
            disabled={!session.accessToken}
            onClick={handleLoadProfile}
            type="button"
          >
            Load `/auth/me`
          </button>
          <button className="secondary-button" onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
      </div>

      <DocumentDashboard accessToken={session.accessToken} currentUser={session.user} />
    </section>
  );
}
