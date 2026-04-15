"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { apiRequest } from "@/lib/api";

function isImageUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function renderBlock(block) {
  if (block.type === "heading_1") {
    return <h2 className="editor-heading-one">{block.content.text}</h2>;
  }

  if (block.type === "heading_2") {
    return <h3 className="editor-heading-two">{block.content.text}</h3>;
  }

  if (block.type === "todo") {
    return (
      <label className="editor-todo-row">
        <input checked={Boolean(block.content.checked)} disabled readOnly type="checkbox" />
        <p className="editor-paragraph">{block.content.text}</p>
      </label>
    );
  }

  if (block.type === "code") {
    return <pre className="editor-code">{block.content.text}</pre>;
  }

  if (block.type === "divider") {
    return <hr className="editor-divider" />;
  }

  if (block.type === "image") {
    if (!block.content.url) {
      return <p className="editor-image-hint-text">No image URL provided.</p>;
    }

    if (!isImageUrl(block.content.url)) {
      return <p className="editor-image-error">Image URL is invalid.</p>;
    }

    return (
      <div className="editor-image-shell">
        <img alt="Shared document visual" className="editor-image-preview" src={block.content.url} />
      </div>
    );
  }

  return <p className="editor-paragraph">{block.content.text}</p>;
}

export function SharedDocumentView({ token }) {
  const [status, setStatus] = useState("loading");
  const [document, setDocument] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [owner, setOwner] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSharedDocument() {
      setError("");
      try {
        const result = await apiRequest(`/share/${token}`, {
          retryOnUnauthorized: false
        });

        if (!active) {
          return;
        }

        setDocument(result.document);
        setBlocks(result.blocks || []);
        setOwner(result.owner || null);
        setStatus("ready");
      } catch (requestError) {
        if (!active) {
          return;
        }

        setError(requestError.message);
        setStatus("error");
      }
    }

    void loadSharedDocument();

    return () => {
      active = false;
    };
  }, [token]);

  if (status === "loading") {
    return (
      <main className="app-shell">
        <SiteHeader />
        <section className="share-page-shell">
          <p className="share-loading">Loading shared document...</p>
        </section>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="app-shell">
        <SiteHeader />
        <section className="share-page-shell">
          <p className="share-error">{error || "This shared document is not available."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <SiteHeader />
      <section className="share-page-shell">
        <p className="share-banner">Read-only shared document</p>
        <div className="editor-canvas">
          <h1 className="document-title">{document?.title ?? "Untitled"}</h1>
          <p className="document-subtitle">
            Public view. Editing is disabled.
            {owner?.email ? ` Created by ${owner.email}.` : ""}
            {document?.updatedAt
              ? ` Last updated ${new Date(document.updatedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric"
                })}.`
              : ""}
          </p>
          {owner?.createdAt ? (
            <p className="share-owner-meta">
              Owner joined{" "}
              {new Date(owner.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric"
              })}
            </p>
          ) : null}
          <div className="editor-paper">
            {blocks.map((block) => (
              <article className="editor-block-row" key={block.id}>
                <div className="editor-block-content">{renderBlock(block)}</div>
              </article>
            ))}
            {blocks.length === 0 ? <p className="editor-empty-hint">No content.</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
