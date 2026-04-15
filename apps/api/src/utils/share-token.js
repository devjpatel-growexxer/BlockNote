import crypto from "crypto";

export function generateShareToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export function hashShareToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
