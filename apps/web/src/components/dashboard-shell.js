"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/state/auth-context";

export function DashboardShell() {
  const router = useRouter();
  const { accessToken, user, status, logout } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [createTitle, setCreateTitle] = useState("");
  const [renameById, setRenameById] = useState({});
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uiStatus, setUiStatus] = useState("Loading your workspace...");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "guest") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && accessToken) {
      loadDocuments();
    }
  }, [status, accessToken]);

  async function loadDocuments() {
    setError("");

    try {
      const result = await apiRequest("/documents", {
        token: accessToken
      });
      setDocuments(result.documents);
      setSelectedDocument((current) =>
        current ? result.documents.find((document) => document.id === current.id) ?? null : null
      );
      setUiStatus("Workspace synced.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError("");

    try {
      const result = await apiRequest("/documents", {
        method: "POST",
        token: accessToken,
        body: {
          title: createTitle || "Untitled document"
        }
      });

      setDocuments((current) => [result.document, ...current]);
      setCreateTitle("");
      setUiStatus("New document ready.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleRename(documentId) {
    const title = (renameById[documentId] || "").trim();

    if (!title) {
      setError("Document title is required.");
      return;
    }

    setError("");

    try {
      const result = await apiRequest(`/documents/${documentId}`, {
        method: "PATCH",
        token: accessToken,
        body: { title }
      });

      setDocuments((current) =>
        current.map((document) => (document.id === documentId ? result.document : document))
      );
      setSelectedDocument((current) => (current?.id === documentId ? result.document : current));
      setUiStatus("Document renamed.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleDelete(documentId) {
    setError("");

    try {
      await apiRequest(`/documents/${documentId}`, {
        method: "DELETE",
        token: accessToken
      });
      setDocuments((current) => current.filter((document) => document.id !== documentId));
      setSelectedDocument((current) => (current?.id === documentId ? null : current));
      setUiStatus("Document deleted.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleSelect(documentId) {
    setError("");

    try {
      const result = await apiRequest(`/documents/${documentId}`, {
        token: accessToken
      });
      setSelectedDocument(result.document);
      setUiStatus("Document loaded.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (status === "loading") {
    return <section className="dashboard-shell">Loading session...</section>;
  }

  return (
    <section className="dashboard-shell">
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Documents for {user?.email}</h1>
          <p className="hero-copy auth-copy">
            Create, inspect, rename, and remove documents. Each new document already receives a
            starter paragraph block in PostgreSQL.
          </p>
        </div>
        <div className="session-actions">
          <button className="secondary-button" onClick={loadDocuments} type="button">
            Refresh
          </button>
          <button className="primary-button" onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
      </div>

      <form className="dashboard-create-bar" onSubmit={handleCreate}>
        <input
          onChange={(event) => setCreateTitle(event.target.value)}
          placeholder="Give the next document a title"
          type="text"
          value={createTitle}
        />
        <button className="primary-button" type="submit">
          Create document
        </button>
      </form>

      <p className="session-status">{uiStatus}</p>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="dashboard-grid">
        <div className="dashboard-list">
          {documents.length === 0 ? (
            <article className="document-card">
              <h3>No documents yet</h3>
              <p className="session-copy">Create one to start testing the block workspace.</p>
            </article>
          ) : (
            documents.map((document) => (
              <article className="document-card" key={document.id}>
                <div className="document-card-top">
                  <div>
                    <h3>{document.title}</h3>
                    <p className="session-copy">
                      Updated {new Date(document.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <Link className="inline-link" href={`/documents/${document.id}`}>
                    Open workspace
                  </Link>
                </div>

                <input
                  onChange={(event) =>
                    setRenameById((current) => ({
                      ...current,
                      [document.id]: event.target.value
                    }))
                  }
                  placeholder="Rename this document"
                  type="text"
                  value={renameById[document.id] ?? ""}
                />

                <div className="session-actions">
                  <button
                    className="secondary-button"
                    onClick={() => handleSelect(document.id)}
                    type="button"
                  >
                    View
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => handleRename(document.id)}
                    type="button"
                  >
                    Rename
                  </button>
                  <button
                    className="secondary-button danger-button"
                    onClick={() => handleDelete(document.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <aside className="document-detail-card detail-tall-card">
          <h3>Selected document</h3>
          {selectedDocument ? (
            <>
              <p className="session-copy">Title: {selectedDocument.title}</p>
              <p className="session-copy">Document ID: {selectedDocument.id}</p>
              <p className="session-copy">Version: {selectedDocument.version}</p>
              <p className="session-copy">
                Updated: {new Date(selectedDocument.updatedAt).toLocaleString()}
              </p>
              <Link className="primary-link" href={`/documents/${selectedDocument.id}`}>
                Open blocks
              </Link>
            </>
          ) : (
            <p className="session-copy">Use View on any document to inspect its metadata here.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
