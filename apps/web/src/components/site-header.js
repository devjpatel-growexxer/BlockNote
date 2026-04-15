"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/state/auth-context";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  const router = useRouter();
  const { status, user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="site-header">
      <Link className="brand-mark" href="/">
        <span className="brand-icon">B</span>
        BlockNote
      </Link>
      <nav className="site-nav">
        {status === "authenticated" ? (
          <>
            <ThemeToggle />
            <Link className="nav-highlight" href="/dashboard">
              Dashboard
            </Link>
            <span className="nav-user">{user?.email}</span>
            <button className="secondary-button" onClick={handleLogout} type="button">
              Logout
            </button>
          </>
        ) : (
          <>
            <ThemeToggle />
            <Link href="/login">Log in</Link>
            <Link className="nav-highlight" href="/register">
              Get started
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
