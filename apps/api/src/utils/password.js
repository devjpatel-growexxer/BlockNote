import bcrypt from "bcryptjs";
import { getServerEnv } from "./env.js";

export async function hashPassword(value) {
  const env = getServerEnv();
  return bcrypt.hash(value, env.bcryptRounds);
}

export async function comparePassword(value, hash) {
  return bcrypt.compare(value, hash);
}
