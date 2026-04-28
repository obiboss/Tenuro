import crypto from "node:crypto";

export function generateSecureToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function getExpiryDateFromNow(hours: number) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + hours);

  return expiresAt;
}
