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
  const [renamingId, setRenamingId] = useState(null);
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
      setRenamingId(null);
      setRenameById((current) => ({ ...current, [documentId]: "" }));
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
    return (
      <section className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <p className="sidebar-section-label">Loading…</p>
        </aside>
        <div className="dashboard-main">
          <p className="session-status">Restoring session…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-shell">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <p className="sidebar-section-label">Workspace</p>
        <button className="sidebar-item" onClick={loadDocuments} type="button">
          <span className="sidebar-item-icon">🏠</span>
          <span className="sidebar-item-text">All documents</span>
        </button>

        <p className="sidebar-section-label" style={{ marginTop: 16 }}>Documents</p>
        {documents.map((document) => (
          <Link
            className={`sidebar-item${selectedDocument?.id === document.id ? " active" : ""}`}
            href={`/documents/${document.id}`}
            key={document.id}
          >
            <span className="sidebar-item-icon">📄</span>
            <span className="sidebar-item-text">{document.title}</span>
          </Link>
        ))}

        <div className="sidebar-footer">
          <span className="sidebar-user">{user?.email}</span>
          <button className="sidebar-item" onClick={handleLogout} type="button">
            <span className="sidebar-item-icon">↩</span>
            <span className="sidebar-item-text">Log out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="dashboard-main">
        <div className="dashboard-hero">
          <h1>Documents</h1>
          <p className="session-copy">Create, organize, and edit your documents.</p>
        </div>

        <form className="dashboard-create-bar" onSubmit={handleCreate}>
          <input
            onChange={(event) => setCreateTitle(event.target.value)}
            placeholder="New document title…"
            type="text"
            value={createTitle}
          />
          <button className="primary-button" type="submit">
            + New page
          </button>
        </form>

        {error ? <p className="error-text" style={{ marginBottom: 12 }}>{error}</p> : null}

        <div className="dashboard-grid">
          <div className="dashboard-list">
            {documents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <h3>No documents yet</h3>
                <p>Create your first document to start writing.</p>
              </div>
            ) : (
              documents.map((document) => (
                <div key={document.id}>
                  <Link
                    className="document-card"
                    href={`/documents/${document.id}`}
                  >
                    <div className="document-card-top">
                      <span className="document-card-icon">📄</span>
                      <div className="document-card-info">
                        <h3>{document.title}</h3>
                        <p className="session-copy">
                          {new Date(document.updatedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="session-actions" onClick={(e) => e.preventDefault()}>
                      <button
                        className="document-card-actions-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setRenamingId(renamingId === document.id ? null : document.id);
                        }}
                        title="Rename"
                        type="button"
                      >
                        ✏️
                      </button>
                      <button
                        className="document-card-actions-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDelete(document.id);
                        }}
                        title="Delete"
                        type="button"
                        style={{ color: "var(--danger)" }}
                      >
                        🗑
                      </button>
                    </div>
                  </Link>

                  {renamingId === document.id ? (
                    <div className="rename-inline">
                      <input
                        onChange={(event) =>
                          setRenameById((current) => ({
                            ...current,
                            [document.id]: event.target.value
                          }))
                        }
                        placeholder="New title"
                        type="text"
                        value={renameById[document.id] ?? ""}
                        autoFocus
                      />
                      <button
                        className="primary-button"
                        onClick={() => handleRename(document.id)}
                        type="button"
                      >
                        Save
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => setRenamingId(null)}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
