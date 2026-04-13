import { APP_NAME, BLOCK_TYPES } from "@blocknote/shared";

export default function HomePage() {
  return (
    <main className="landing-shell">
      <section className="hero-card">
        <p className="eyebrow">Step 1 foundation</p>
        <h1>{APP_NAME}</h1>
        <p className="hero-copy">
          A production-grade block editor scaffold using Next.js, Express,
          PostgreSQL, and a custom contentEditable-based editor.
        </p>

        <div className="status-grid">
          <article>
            <h2>Frontend shell</h2>
            <p>Next.js app router foundation is ready for auth, dashboard, and editor routes.</p>
          </article>
          <article>
            <h2>API shell</h2>
            <p>Express service layers and repository folders are in place for REST-only APIs.</p>
          </article>
          <article>
            <h2>Shared contracts</h2>
            <p>Core constants are centralized to avoid hardcoded block types and config drift.</p>
          </article>
        </div>

        <section className="block-preview">
          <h2>Planned block types</h2>
          <ul>
            {BLOCK_TYPES.map((type) => (
              <li key={type}>{type}</li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
