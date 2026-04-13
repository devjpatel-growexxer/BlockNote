import { closePool, query } from "../utils/db.js";

async function run() {
  try {
    const result = await query("select now() as connected_at, current_database() as database_name");
    const row = result.rows[0];

    console.log(`Connected to ${row.database_name} at ${row.connected_at.toISOString()}`);
  } finally {
    await closePool();
  }
}

run().catch((error) => {
  console.error("Database connection check failed.");
  console.error(error);
  process.exitCode = 1;
});
