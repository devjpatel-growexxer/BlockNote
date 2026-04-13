import { checkDatabaseHealth } from "../repositories/database-repository.js";

export async function getDatabaseHealth() {
  return checkDatabaseHealth();
}
