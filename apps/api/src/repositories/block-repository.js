import { query, withTransaction } from "../utils/db.js";

function mapBlock(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    documentId: row.document_id,
    type: row.type,
    content: row.content,
    orderIndex: Number(row.order_index),
    parentId: row.parent_id,
    createdAt: row.created_at,
    ownerId: row.owner_id ?? null
  };
}

export async function listBlocksByDocumentId(documentId) {
  const result = await query(
    `
      select id, document_id, type, content, order_index, parent_id, created_at
      from blocks
      where document_id = $1
      order by order_index asc, created_at asc
    `,
    [documentId]
  );

  return result.rows.map(mapBlock);
}

export async function listBlockOrderByDocumentId(documentId, client = null) {
  const runner = client ? client.query.bind(client) : query;
  const result = await runner(
    `
      select id, order_index
      from blocks
      where document_id = $1
      order by order_index asc, created_at asc
    `,
    [documentId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    orderIndex: Number(row.order_index)
  }));
}

export async function findBlockById(blockId) {
  const result = await query(
    `
      select
        blocks.id,
        blocks.document_id,
        blocks.type,
        blocks.content,
        blocks.order_index,
        blocks.parent_id,
        blocks.created_at,
        documents.user_id as owner_id
      from blocks
      join documents on documents.id = blocks.document_id
      where blocks.id = $1
      limit 1
    `,
    [blockId]
  );

  return mapBlock(result.rows[0]);
}

export async function findMaxOrderIndexByDocumentId(documentId) {
  const result = await query(
    `
      select max(order_index) as max_order_index
      from blocks
      where document_id = $1
    `,
    [documentId]
  );

  return result.rows[0]?.max_order_index ? Number(result.rows[0].max_order_index) : null;
}

export async function createBlock({ documentId, type, content, orderIndex, parentId }) {
  const result = await query(
    `
      insert into blocks (document_id, type, content, order_index, parent_id)
      values ($1, $2, $3::jsonb, $4, $5)
      returning id, document_id, type, content, order_index, parent_id, created_at
    `,
    [documentId, type, JSON.stringify(content), orderIndex, parentId]
  );

  return mapBlock(result.rows[0]);
}

export async function updateBlock({ blockId, type, content }) {
  const result = await query(
    `
      update blocks
      set type = $2,
          content = $3::jsonb
      where id = $1
      returning id, document_id, type, content, order_index, parent_id, created_at
    `,
    [blockId, type, JSON.stringify(content)]
  );

  return mapBlock(result.rows[0]);
}

export async function updateBlockOrderIndex(blockId, orderIndex, client = null) {
  const runner = client ? client.query.bind(client) : query;
  const result = await runner(
    `
      update blocks
      set order_index = $2
      where id = $1
      returning id, document_id, type, content, order_index, parent_id, created_at
    `,
    [blockId, orderIndex]
  );

  return mapBlock(result.rows[0]);
}

export async function renormalizeBlockOrder(documentId) {
  return withTransaction(async (client) => {
    const rows = await listBlockOrderByDocumentId(documentId, client);

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const nextIndex = index + 1;
      await updateBlockOrderIndex(row.id, nextIndex, client);
    }

    return listBlocksByDocumentId(documentId);
  });
}

export async function deleteBlockById(blockId) {
  const result = await query(
    `
      delete from blocks
      where id = $1
      returning id
    `,
    [blockId]
  );

  return result.rowCount > 0;
}
