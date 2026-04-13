import { query } from "../utils/db.js";

export async function checkDatabaseHealth() {
  const result = await query(
    "select current_database() as database_name, current_user as database_user, now() as server_time"
  );

  return result.rows[0];
}
