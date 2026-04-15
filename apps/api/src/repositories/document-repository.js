import { query, withTransaction } from "../utils/db.js";

function mapDocument(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    shareTokenHash: row.share_token_hash,
    isPublic: row.is_public,
    version: row.version,
    updatedAt: row.updated_at,
    createdAt: row.created_at ?? null
  };
}

export async function listDocumentsByUserId(userId) {
  const result = await query(
    `
      select id, user_id, title, share_token_hash, is_public, version, updated_at
      from documents
      where user_id = $1
      order by updated_at desc, id desc
    `,
    [userId]
  );

  return result.rows.map(mapDocument);
}

export async function findDocumentById(documentId) {
  const result = await query(
    `
      select id, user_id, title, share_token_hash, is_public, version, updated_at
      from documents
      where id = $1
      limit 1
    `,
    [documentId]
  );

  return mapDocument(result.rows[0]);
}

export async function findDocumentByIdForUpdate(documentId, client) {
  const result = await client.query(
    `
      select id, user_id, title, share_token_hash, is_public, version, updated_at
      from documents
      where id = $1
      limit 1
      for update
    `,
    [documentId]
  );

  return mapDocument(result.rows[0]);
}

export async function createDocumentForUser({ userId, title, initialBlock }) {
  return withTransaction(async (client) => {
    const documentResult = await client.query(
      `
        insert into documents (user_id, title)
        values ($1, $2)
        returning id, user_id, title, share_token_hash, is_public, version, updated_at
      `,
      [userId, title]
    );

    const document = mapDocument(documentResult.rows[0]);

    await client.query(
      `
        insert into blocks (document_id, type, content, order_index, parent_id)
        values ($1, $2, $3::jsonb, $4, $5)
      `,
      [
        document.id,
        initialBlock.type,
        JSON.stringify(initialBlock.content),
        initialBlock.orderIndex,
        initialBlock.parentId
      ]
    );

    return document;
  });
}

export async function updateDocumentTitle({ documentId, title }) {
  const result = await query(
    `
      update documents
      set title = $2,
          updated_at = now()
      where id = $1
      returning id, user_id, title, share_token_hash, is_public, version, updated_at
    `,
    [documentId, title]
  );

  return mapDocument(result.rows[0]);
}

export async function touchDocument(documentId) {
  const result = await query(
    `
      update documents
      set updated_at = now(),
          version = version + 1
      where id = $1
      returning id
    `,
    [documentId]
  );

  return result.rowCount > 0;
}

export async function bumpDocumentVersion(documentId, client) {
  const result = await client.query(
    `
      update documents
      set updated_at = now(),
          version = version + 1
      where id = $1
      returning id, user_id, title, share_token_hash, is_public, version, updated_at
    `,
    [documentId]
  );

  return mapDocument(result.rows[0]);
}

export async function deleteDocumentById(documentId) {
  const result = await query(
    `
      delete from documents
      where id = $1
      returning id
    `,
    [documentId]
  );

  return result.rowCount > 0;
}
