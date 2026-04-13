import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../../../");

dotenv.config({ path: path.join(repoRoot, ".env") });

const REQUIRED_SERVER_ENV = [
  "API_PORT",
  "WEB_ORIGIN",
  "DATABASE_URL",
  "DATABASE_SSL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_ACCESS_TTL_MINUTES",
  "JWT_REFRESH_TTL_DAYS",
  "REFRESH_COOKIE_NAME",
  "SHARE_SESSION_SECRET",
  "SHARE_SESSION_TTL_MINUTES",
  "BCRYPT_ROUNDS"
];

let cachedEnv;

export function getServerEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const missing = REQUIRED_SERVER_ENV.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing server environment variables: ${missing.join(", ")}`);
  }

  cachedEnv = {
    apiPort: Number(process.env.API_PORT),
    webOrigin: process.env.WEB_ORIGIN,
    databaseUrl: process.env.DATABASE_URL,
    databaseSsl: process.env.DATABASE_SSL === "true",
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    jwtAccessTtlMinutes: Number(process.env.JWT_ACCESS_TTL_MINUTES),
    jwtRefreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS),
    refreshCookieName: process.env.REFRESH_COOKIE_NAME,
    shareSessionSecret: process.env.SHARE_SESSION_SECRET,
    shareSessionTtlMinutes: Number(process.env.SHARE_SESSION_TTL_MINUTES),
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS)
  };

  return cachedEnv;
}
