"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/state/auth-context";

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
        BlockNote
      </Link>
      <nav className="site-nav">
        <Link className="nav-highlight" href="/dashboard">
          Dashboard
        </Link>
        {status === "authenticated" ? (
          <>
            <span className="nav-user">{user?.email}</span>
            <button className="secondary-button" onClick={handleLogout} type="button">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}
