"use client";

import Link from "next/link";
import { APP_NAME, BLOCK_TYPES } from "@blocknote/shared";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/state/auth-context";
import { useEffect, useRef, useState } from "react";

const FEATURES = [
  {
    icon: "🔐",
    title: "Production-grade auth",
    description: "JWT access/refresh tokens, ownership checks, and REST-only backend routes — built for real deployments."
  },
  {
    icon: "📄",
    title: "Document workspace",
    description: "Full CRUD dashboard with live PostgreSQL-backed documents, auto-save, and instant status feedback."
  },
  {
    icon: "🧱",
    title: "Seven block types",
    description: "Paragraphs, headings, todos, code, images, dividers — all validated, stored, and rendered from scratch."
  },
  {
    icon: "🔗",
    title: "Share anything",
    description: "Generate shareable read-only links for any document with one click. Revoke access anytime."
  },
  {
    icon: "🎨",
    title: "Dark mode built-in",
    description: "Automatic theme detection with manual toggle. Every component adapts seamlessly between light and dark."
  },
  {
    icon: "⚡",
    title: "Zero dependencies",
    description: "No Slate, no ProseMirror, no TipTap. Every editing primitive is hand-built with native DOM APIs."
  }
];

const BLOCK_LABELS = {
  paragraph: { icon: "¶", name: "Paragraph" },
  heading_1: { icon: "H₁", name: "Heading 1" },
  heading_2: { icon: "H₂", name: "Heading 2" },
  todo: { icon: "☑", name: "To-Do" },
  code: { icon: "</>", name: "Code" },
  divider: { icon: "—", name: "Divider" },
  image: { icon: "🖼", name: "Image" }
};

function TypewriterText({ phrases }) {
  const [current, setCurrent] = useState(0);
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const phrase = phrases[current];
    const speed = isDeleting ? 40 : 80;

    if (!isDeleting && text === phrase) {
      const pause = setTimeout(() => setIsDeleting(true), 2000);
      return () => clearTimeout(pause);
    }

    if (isDeleting && text === "") {
      setIsDeleting(false);
      setCurrent((prev) => (prev + 1) % phrases.length);
      return;
    }

    const timer = setTimeout(() => {
      setText(isDeleting ? phrase.slice(0, text.length - 1) : phrase.slice(0, text.length + 1));
    }, speed);

    return () => clearTimeout(timer);
  }, [text, isDeleting, current, phrases]);

  return (
    <span className="typewriter-text">
      {text}
      <span className="typewriter-cursor" aria-hidden="true">|</span>
    </span>
  );
}

function useInView(options = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.15, ...options });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, isVisible];
}

function AnimatedFeatureCard({ feature, index }) {
  const [ref, isVisible] = useInView();

  return (
    <article
      ref={ref}
      className={`landing-feature-card ${isVisible ? "landing-card-visible" : ""}`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className="landing-feature-icon">{feature.icon}</div>
      <h3>{feature.title}</h3>
      <p>{feature.description}</p>
    </article>
  );
}

function FloatingOrb({ className }) {
  return <div className={`landing-orb ${className}`} aria-hidden="true" />;
}

export default function HomePage() {
  const { status } = useAuth();
  const isLoggedIn = status === "authenticated";
  const isLoading = status === "loading";
  const [blocksRef, blocksVisible] = useInView();

  return (
    <main className="app-shell">
      <SiteHeader />

      <section className="content-shell landing-layout">
        {/* ── Ambient orbs ── */}
        <div className="landing-orbs-container" aria-hidden="true">
          <FloatingOrb className="landing-orb--1" />
          <FloatingOrb className="landing-orb--2" />
          <FloatingOrb className="landing-orb--3" />
        </div>

        {/* ── Hero ── */}
        <section className="landing-hero">
          <div className="landing-hero-content">
            <span className="landing-badge">
              <span className="landing-badge-dot" />
              Open-source block editor
            </span>

            <h1 className="landing-h1">
              Write, think, and<br />
              <TypewriterText phrases={["organize.", "design.", "create.", "build."]} />
            </h1>

            <p className="landing-subtitle">
              {APP_NAME} is a from-scratch document editor with a React frontend,
              REST backend, and PostgreSQL persistence. No block editor libraries. No shortcuts.
            </p>

            <div className="landing-cta-row">
              {isLoading ? (
                <div className="home-cta-skeleton" aria-hidden="true">
                  <span className="skeleton-shimmer cta-skeleton cta-skeleton--primary" />
                  <span className="skeleton-shimmer cta-skeleton cta-skeleton--secondary" />
                </div>
              ) : isLoggedIn ? (
                <Link className="landing-cta-primary" href="/dashboard">
                  Go to Dashboard
                  <span className="landing-cta-arrow">→</span>
                </Link>
              ) : (
                <>
                  <Link className="landing-cta-primary" href="/register">
                    Get started free
                    <span className="landing-cta-arrow">→</span>
                  </Link>
                  <Link className="landing-cta-secondary" href="/login">
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* ── Block types showcase ── */}
          <div
            ref={blocksRef}
            className={`landing-blocks-showcase ${blocksVisible ? "landing-blocks-visible" : ""}`}
          >
            <div className="landing-blocks-header">
              <span className="landing-badge landing-badge--sm">
                <span className="landing-badge-dot" />
                7 block types
              </span>
            </div>
            <div className="landing-blocks-grid">
              {BLOCK_TYPES.map((type, i) => {
                const label = BLOCK_LABELS[type] || { icon: "•", name: type };
                return (
                  <div
                    className="landing-block-chip"
                    key={type}
                    style={{ animationDelay: `${i * 100 + 200}ms` }}
                  >
                    <span className="landing-block-chip-icon">{label.icon}</span>
                    <span className="landing-block-chip-name">{label.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="landing-features">
          <div className="landing-section-header">
            <span className="landing-badge landing-badge--sm">
              <span className="landing-badge-dot" />
              Features
            </span>
            <h2 className="landing-h2">Everything you need, nothing&nbsp;you&nbsp;don't</h2>
            <p className="landing-features-subtitle">
              Built from the ground up with production-grade architecture. Every component is purpose-built.
            </p>
          </div>
          <div className="landing-features-grid">
            {FEATURES.map((feature, i) => (
              <AnimatedFeatureCard key={feature.title} feature={feature} index={i} />
            ))}
          </div>
        </section>

        {/* ── CTA banner ── */}
        <section className="landing-bottom-cta">
          <div className="landing-bottom-cta-glow" aria-hidden="true" />
          <h2>Ready to start writing?</h2>
          <p>Create your first document in seconds. No credit card required.</p>
          <div className="landing-cta-row">
            {isLoggedIn ? (
              <Link className="landing-cta-primary" href="/dashboard">
                Open Dashboard
                <span className="landing-cta-arrow">→</span>
              </Link>
            ) : (
              <>
                <Link className="landing-cta-primary" href="/register">
                  Get started free
                  <span className="landing-cta-arrow">→</span>
                </Link>
                <Link className="landing-cta-secondary" href="/login">
                  Log in
                </Link>
              </>
            )}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="landing-footer">
          <p>© {new Date().getFullYear()} {APP_NAME}. Open-source block editor.</p>
        </footer>
      </section>
    </main>
  );
}
