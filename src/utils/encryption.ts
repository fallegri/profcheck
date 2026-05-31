/**
 * Encryption Utility — AES-256-GCM
 *
 * Implements authenticated encryption using AES-256-GCM via Node.js built-in
 * `crypto` module. GCM mode provides both confidentiality and integrity
 * (authentication tag), making it more secure than AES-CBC.
 *
 * Format of encrypted output (base64-encoded, colon-separated):
 *   <iv_hex>:<authTag_hex>:<ciphertext_hex>
 *
 * Validates: Requirements 11.0, 11.1, 11.2, 11.3, 11.4
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import { logger } from "./logger";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Derive a 32-byte key from the ENCRYPTION_KEY env variable.
 * Accepts either a 64-char hex string (raw 32 bytes) or any string
 * (hashed with SHA-256 to produce 32 bytes).
 */
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || "";

  if (!raw) {
    return Buffer.alloc(32); // zero key — encryption will warn but not crash
  }

  // If it looks like a 64-char hex string, use it directly
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  // Otherwise derive a 32-byte key via SHA-256
  return createHash("sha256").update(raw).digest();
}

const ENCRYPTION_KEY_AVAILABLE = !!process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY_AVAILABLE) {
  logger.warn(
    "ENCRYPTION_KEY environment variable is not set — encryption disabled"
  );
}

/**
 * Encrypt a string using AES-256-GCM.
 *
 * @param text - Plaintext to encrypt
 * @returns Base64-encoded string in the format `<iv>:<authTag>:<ciphertext>`
 */
export function encrypt(text: string): string {
  if (!text) return "";

  if (!ENCRYPTION_KEY_AVAILABLE) {
    logger.warn("Encryption key not set, returning plaintext");
    return text;
  }

  try {
    const key = getKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(text, "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Encode as hex parts joined by ':'
    return [
      iv.toString("hex"),
      authTag.toString("hex"),
      encrypted.toString("hex"),
    ].join(":");
  } catch (error) {
    logger.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypt a string that was encrypted with `encrypt()`.
 *
 * @param encryptedText - String in the format `<iv>:<authTag>:<ciphertext>`
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";

  if (!ENCRYPTION_KEY_AVAILABLE) {
    logger.warn("Encryption key not set, returning plaintext");
    return encryptedText;
  }

  try {
    const parts = encryptedText.split(":");

    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }

    const [ivHex, authTagHex, ciphertextHex] = parts;
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const ciphertext = Buffer.from(ciphertextHex, "hex");

    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    logger.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Hash a string using SHA-256 (one-way, non-reversible).
 *
 * @param text - Text to hash
 * @returns Hex-encoded SHA-256 digest
 */
export function hash(text: string): string {
  if (!text) return "";

  try {
    return createHash("sha256").update(text).digest("hex");
  } catch (error) {
    logger.error("Hash error:", error);
    throw new Error("Failed to hash data");
  }
}

/**
 * Encrypt sensitive data for storage.
 * Alias for `encrypt` — used for tokens, API keys, and other sensitive info.
 */
export function encryptSensitiveData(data: string): string {
  return encrypt(data);
}

/**
 * Decrypt sensitive data from storage.
 * Alias for `decrypt`.
 */
export function decryptSensitiveData(encryptedData: string): string {
  return decrypt(encryptedData);
}

/**
 * Hash sensitive data for comparison (one-way).
 * Used for passwords and verification tokens.
 */
export function hashSensitiveData(data: string): string {
  return hash(data);
}

/**
 * Verify hashed data against a stored hash.
 */
export function verifySensitiveData(data: string, storedHash: string): boolean {
  try {
    return hashSensitiveData(data) === storedHash;
  } catch (error) {
    logger.error("Verification error:", error);
    return false;
  }
}
