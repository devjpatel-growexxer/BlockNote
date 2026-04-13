import { query } from "../utils/db.js";

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at
  };
}

export async function createUser({ email, passwordHash }) {
  const result = await query(
    `
      insert into users (email, password_hash)
      values ($1, $2)
      returning id, email, password_hash, created_at
    `,
    [email, passwordHash]
  );

  return mapUser(result.rows[0]);
}

export async function findUserByEmail(email) {
  const result = await query(
    `
      select id, email, password_hash, created_at
      from users
      where email = $1
      limit 1
    `,
    [email]
  );

  return mapUser(result.rows[0]);
}

export async function findUserById(id) {
  const result = await query(
    `
      select id, email, password_hash, created_at
      from users
      where id = $1
      limit 1
    `,
    [id]
  );

  return mapUser(result.rows[0]);
}
