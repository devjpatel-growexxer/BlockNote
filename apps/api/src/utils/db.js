import pg from "pg";
import { getServerEnv } from "./env.js";

const { Pool } = pg;

let pool;

function createPool() {
  const env = getServerEnv();

  return new Pool({
    connectionString: env.databaseUrl,
    ssl: env.databaseSsl
      ? {
          rejectUnauthorized: false
        }
      : false,
    max: 10,
    idleTimeoutMillis: 30000
  });
}

export function getPool() {
  if (!pool) {
    pool = createPool();
  }

  return pool;
}

export async function query(text, params = []) {
  return getPool().query(text, params);
}

export async function withTransaction(callback) {
  const client = await getPool().connect();

  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
