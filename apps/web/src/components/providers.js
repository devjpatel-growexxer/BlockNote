"use client";

import { AuthProvider } from "@/state/auth-context";

export function Providers({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
