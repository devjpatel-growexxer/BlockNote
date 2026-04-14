"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MIN_PASSWORD_LENGTH } from "@blocknote/shared";
import { useAuth } from "@/state/auth-context";

const initialForm = {
  email: "",
  password: ""
};

export function AuthForm({ mode }) {
  const router = useRouter();
  const { authenticate, setError, error } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await authenticate(mode, form);
      router.push("/dashboard");
      router.refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page-card">
      <span className="eyebrow">{isRegister ? "Create account" : "Welcome back"}</span>
      <h1>{isRegister ? "Start writing with blocks" : "Sign in to your workspace"}</h1>
      <p className="auth-copy">
        {isRegister
          ? "Create your account to start building documents with a powerful block editor."
          : "Enter your credentials to access your documents and workspace."}
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>Email</span>
          <input
            autoComplete="email"
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="you@example.com"
            type="email"
            value={form.email}
          />
        </label>

        <label>
          <span>Password</span>
          <input
            autoComplete={isRegister ? "new-password" : "current-password"}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
            placeholder="••••••••"
            type="password"
            value={form.password}
          />
        </label>

        {isRegister ? (
          <p className="helper-copy">
            Min. {MIN_PASSWORD_LENGTH} characters with at least one number.
          </p>
        ) : null}

        {error ? <p className="error-text">{error}</p> : null}

        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? "Working..." : isRegister ? "Create account" : "Log in"}
        </button>
      </form>

      <p className="auth-footer-copy">
        {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
        <Link href={isRegister ? "/login" : "/register"}>
          {isRegister ? "Log in" : "Sign up"}
        </Link>
      </p>
    </section>
  );
}
