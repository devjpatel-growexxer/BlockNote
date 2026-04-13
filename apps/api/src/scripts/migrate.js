import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { MIGRATIONS_DIRECTORY, MIGRATIONS_TABLE } from "../constants/config.js";
import { closePool, withTransaction } from "../utils/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../../../");
const migrationsDirectory = path.join(repoRoot, MIGRATIONS_DIRECTORY);

async function ensureMigrationsTable(client) {
  await client.query(`
    create table if not exists schema_migrations (
      id bigserial primary key,
      filename text not null unique,
      applied_at timestamptz not null default now()
    )
  `);
}

async function getAppliedMigrationNames(client) {
  const result = await client.query(
    `select filename from ${MIGRATIONS_TABLE} order by filename asc`
  );

  return new Set(result.rows.map((row) => row.filename));
}

async function getMigrationFiles() {
  const entries = await fs.readdir(migrationsDirectory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
}

async function applyMigration(client, filename) {
  const fullPath = path.join(migrationsDirectory, filename);
  const sql = await fs.readFile(fullPath, "utf8");

  await client.query(sql);
  await client.query(`insert into ${MIGRATIONS_TABLE} (filename) values ($1)`, [filename]);
}

async function run() {
  try {
    const appliedMigrations = await withTransaction(async (client) => {
      await ensureMigrationsTable(client);
      const applied = await getAppliedMigrationNames(client);
      const files = await getMigrationFiles();
      const pending = files.filter((filename) => !applied.has(filename));

      for (const filename of pending) {
        await applyMigration(client, filename);
      }

      return pending;
    });

    if (appliedMigrations.length === 0) {
      console.log("No pending migrations.");
      return;
    }

    console.log("Applied migrations:");
    for (const migration of appliedMigrations) {
      console.log(`- ${migration}`);
    }
  } finally {
    await closePool();
  }
}

run().catch((error) => {
  console.error("Migration failed.");
  console.error(error);
  process.exitCode = 1;
});
