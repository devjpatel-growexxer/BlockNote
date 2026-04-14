import Link from "next/link";
import { APP_NAME, BLOCK_TYPES } from "@blocknote/shared";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <section className="content-shell landing-layout">
        <section className="hero-stage">
          <div className="hero-copy-stack">
            <span className="eyebrow">Open-source block editor</span>
            <h1>Write, think, and organize — all in one place</h1>
            <p className="hero-copy">
              {APP_NAME} is a from-scratch document editor with a React frontend,
              REST backend, and PostgreSQL persistence. No block editor libraries. No shortcuts.
            </p>
            <div className="cta-row">
              <Link className="primary-link" href="/register">
                Get started free
              </Link>
              <Link className="secondary-link" href="/login">
                Log in
              </Link>
            </div>
          </div>

          <div className="hero-panel">
            <span className="eyebrow" style={{ marginBottom: 12 }}>7 block types</span>
            <div className="block-chip-grid">
              {BLOCK_TYPES.map((type) => (
                <span className="block-chip" key={type}>
                  {type.replace("_", " ")}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="feature-grid">
          <article className="feature-card">
            <div className="feature-icon">🔐</div>
            <h2>Production-grade auth</h2>
            <p>JWT access tokens, refresh cookies, ownership checks, and REST-only backend routes.</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">📄</div>
            <h2>Document workspace</h2>
            <p>Separate dashboard and document routes with live PostgreSQL-backed CRUD operations.</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">🧱</div>
            <h2>All block types</h2>
            <p>Seven block types validated, stored, and rendered with a fully custom input system.</p>
          </article>
        </section>
      </section>
    </main>
  );
}
