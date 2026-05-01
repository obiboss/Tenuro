import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ENCODING = "base64url";

function getEncryptionKey() {
  const key = process.env.TENURO_FIELD_ENCRYPTION_KEY_BASE64;

  if (!key) {
    throw new Error("Missing TENURO_FIELD_ENCRYPTION_KEY_BASE64.");
  }

  const buffer = Buffer.from(key, "base64");

  if (buffer.length !== 32) {
    throw new Error("TENURO_FIELD_ENCRYPTION_KEY_BASE64 must be 32 bytes.");
  }

  return buffer;
}

export function encryptText(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const ciphertext = Buffer.concat([
    cipher.update(trimmedValue, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString(ENCODING),
    authTag.toString(ENCODING),
    ciphertext.toString(ENCODING),
  ].join(":");
}

export function decryptText(encryptedValue: string | null) {
  if (!encryptedValue) {
    return null;
  }

  const [version, ivValue, authTagValue, ciphertextValue] =
    encryptedValue.split(":");

  if (version !== "v1" || !ivValue || !authTagValue || !ciphertextValue) {
    throw new Error("Invalid encrypted value.");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivValue, ENCODING);
  const authTag = Buffer.from(authTagValue, ENCODING);
  const ciphertext = Buffer.from(ciphertextValue, ENCODING);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
