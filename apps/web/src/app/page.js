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
            <p className="eyebrow">Custom block editor platform</p>
            <h1>{APP_NAME}</h1>
            <p className="hero-copy">
              A from-scratch document editor with a React frontend, REST backend, PostgreSQL
              persistence, and a fully custom block system. No block editor libraries. No shortcuts.
            </p>

            <div className="cta-row">
              <Link className="primary-link" href="/register">
                Create account
              </Link>
              <Link className="secondary-link" href="/login">
                Login
              </Link>
              <Link className="secondary-link" href="/dashboard">
                View dashboard
              </Link>
            </div>
          </div>

          <div className="hero-panel">
            <p className="eyebrow">Included block types</p>
            <div className="block-chip-grid">
              {BLOCK_TYPES.map((type) => (
                <span className="block-chip" key={type}>
                  {type}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="feature-grid">
          <article className="feature-card">
            <h2>Production-minded auth</h2>
            <p>JWT access tokens, refresh cookies, ownership checks, and REST-only backend routes.</p>
          </article>
          <article className="feature-card">
            <h2>Document workspace</h2>
            <p>Separate dashboard and document routes with live PostgreSQL-backed CRUD operations.</p>
          </article>
          <article className="feature-card">
            <h2>Block foundation ready</h2>
            <p>All seven required block types can now be validated, stored, fetched, and previewed.</p>
          </article>
        </section>
      </section>
    </main>
  );
}
