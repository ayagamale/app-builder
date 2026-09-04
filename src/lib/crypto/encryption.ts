import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";

function masterKey(): Buffer {
  const raw = process.env.ENCRYPTION_MASTER_KEY || "";
  if (raw.length === 64) {
    // Already a 32-byte hex string
    return Buffer.from(raw, "hex");
  }
  // Derive a 32-byte key from whatever we have (dev fallback)
  return scryptSync(raw || "vibebuild-dev-key", "vibebuild-salt", 32);
}

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string;         // base64
  authTag: string;    // base64
}

/** Encrypt an API key string with AES-256-GCM. */
export function encrypt(plaintext: string): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, masterKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

/** Decrypt an AES-256-GCM payload back to the original string. */
export function decrypt(payload: EncryptedPayload): string {
  const decipher = createDecipheriv(
    ALGO,
    masterKey(),
    Buffer.from(payload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** Mask an API key for display: show only the last 4 characters. */
export function maskKey(key: string): string {
  if (key.length <= 4) return "••••";
  return "••••••••••••" + key.slice(-4);
}

/** Extract the last 4 characters for storage as `key_suffix`. */
export function keySuffix(key: string): string {
  return key.slice(-4);
}
