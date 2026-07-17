import "server-only";

import crypto from "node:crypto";

const MANAGER_DOCUMENT_SHARE_LIFETIME_HOURS = 72;

export function createManagerDocumentShareToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashManagerDocumentShareToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export function getManagerDocumentShareExpiry() {
  return new Date(
    Date.now() +
      MANAGER_DOCUMENT_SHARE_LIFETIME_HOURS *
        60 *
        60 *
        1000,
  ).toISOString();
}
