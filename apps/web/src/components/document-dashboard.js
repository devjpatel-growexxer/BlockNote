"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

const initialCreateState = {
  title: ""
};

export function DocumentDashboard({ accessToken, currentUser }) {
  const [documents, setDocuments] = useState([]);
  const [createForm, setCreateForm] = useState(initialCreateState);
  const [renameById, setRenameById] = useState({});
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [status, setStatus] = useState("Waiting for document actions.");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setDocuments([]);
      setSelectedDocument(null);
      return;
    }

    loadDocuments();
  }, [accessToken]);

  async function loadDocuments() {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/documents", {
        token: accessToken
      });
      setDocuments(result.documents);
      setStatus("Documents loaded.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDocument(event) {
    event.preventDefault();
    setError("");

    try {
      const result = await apiRequest("/documents", {
        method: "POST",
        token: accessToken,
        body: {
          title: createForm.title || "Untitled document"
        }
      });

      setDocuments((current) => [result.document, ...current]);
      setCreateForm(initialCreateState);
      setStatus("Document created.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleRenameDocument(documentId) {
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
      setStatus("Document renamed.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleDeleteDocument(documentId) {
    setError("");

    try {
      await apiRequest(`/documents/${documentId}`, {
        method: "DELETE",
        token: accessToken
      });

      setDocuments((current) => current.filter((document) => document.id !== documentId));
      setSelectedDocument((current) => (current?.id === documentId ? null : current));
      setStatus("Document deleted.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleLoadDocument(documentId) {
    setError("");

    try {
      const result = await apiRequest(`/documents/${documentId}`, {
        token: accessToken
      });

      setSelectedDocument(result.document);
      setStatus("Loaded document details.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (!currentUser) {
    return null;
  }

  return (
    <section className="document-panel">
      <div className="document-panel-header">
        <div>
          <p className="eyebrow">Step 4 documents</p>
          <h2>Document dashboard</h2>
          <p className="session-copy">Signed in as {currentUser.email}</p>
        </div>
        <button className="secondary-button" onClick={loadDocuments} type="button">
          Refresh list
        </button>
      </div>

      <form className="document-create-form" onSubmit={handleCreateDocument}>
        <input
          onChange={(event) => setCreateForm({ title: event.target.value })}
          placeholder="New document title"
          type="text"
          value={createForm.title}
        />
        <button className="primary-button" type="submit">
          Create document
        </button>
      </form>

      <p className="session-status">{loading ? "Loading..." : status}</p>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="document-grid">
        <div className="document-list">
          {documents.length === 0 ? (
            <p className="session-copy">No documents yet.</p>
          ) : (
            documents.map((document) => (
              <article className="document-card" key={document.id}>
                <div className="document-card-top">
                  <h3>{document.title}</h3>
                  <p className="session-copy">Updated {new Date(document.updatedAt).toLocaleString()}</p>
                </div>

                <input
                  onChange={(event) =>
                    setRenameById((current) => ({
                      ...current,
                      [document.id]: event.target.value
                    }))
                  }
                  placeholder="Rename document"
                  type="text"
                  value={renameById[document.id] ?? ""}
                />

                <div className="session-actions">
                  <button
                    className="secondary-button"
                    onClick={() => handleLoadDocument(document.id)}
                    type="button"
                  >
                    View
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => handleRenameDocument(document.id)}
                    type="button"
                  >
                    Rename
                  </button>
                  <button
                    className="secondary-button danger-button"
                    onClick={() => handleDeleteDocument(document.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="document-detail-card">
          <h3>Selected document</h3>
          {selectedDocument ? (
            <>
              <p className="session-copy">ID: {selectedDocument.id}</p>
              <p className="session-copy">Title: {selectedDocument.title}</p>
              <p className="session-copy">Owner: {selectedDocument.userId}</p>
              <p className="session-copy">
                Updated: {new Date(selectedDocument.updatedAt).toLocaleString()}
              </p>
              <p className="session-copy">Version: {selectedDocument.version}</p>
            </>
          ) : (
            <p className="session-copy">Pick a document from the list to inspect it.</p>
          )}
        </div>
      </div>
    </section>
  );
}
