/**
 * Tests for encryption utility — AES-256-GCM
 *
 * Validates: Requirements 11.0, 11.1, 11.2, 11.3, 11.4
 *
 * NOTE: ENCRYPTION_KEY must be set before the module is loaded because
 * `ENCRYPTION_KEY_AVAILABLE` is evaluated at module-load time.
 * We use jest.resetModules() + dynamic require() to reload the module
 * with the env var already set.
 */

// Set the key BEFORE any import so the module-level constant picks it up
const TEST_KEY = "a".repeat(64); // 64-char hex string = 32 bytes
process.env.ENCRYPTION_KEY = TEST_KEY;

// Now import (module will see ENCRYPTION_KEY already set)
import {
  encrypt,
  decrypt,
  hash,
  encryptSensitiveData,
  decryptSensitiveData,
  verifySensitiveData,
} from "./encryption";

describe("encrypt / decrypt", () => {
  it("should encrypt a string and return a non-empty result", () => {
    const result = encrypt("hello world");
    expect(result).toBeTruthy();
    expect(result).not.toBe("hello world");
  });

  it("should produce output in iv:authTag:ciphertext format (3 colon-separated parts)", () => {
    const result = encrypt("test token");
    const parts = result.split(":");
    expect(parts).toHaveLength(3);
    // Each part should be a non-empty hex string
    parts.forEach((part) => expect(part).toMatch(/^[0-9a-f]+$/i));
  });

  it("should decrypt back to the original plaintext", () => {
    const plaintext = "my-secret-google-access-token";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should produce different ciphertext for the same input (random IV)", () => {
    const plaintext = "same-input";
    const enc1 = encrypt(plaintext);
    const enc2 = encrypt(plaintext);
    // Different IVs → different ciphertext
    expect(enc1).not.toBe(enc2);
    // But both decrypt to the same value
    expect(decrypt(enc1)).toBe(plaintext);
    expect(decrypt(enc2)).toBe(plaintext);
  });

  it("should return empty string when encrypting empty input", () => {
    expect(encrypt("")).toBe("");
  });

  it("should return empty string when decrypting empty input", () => {
    expect(decrypt("")).toBe("");
  });

  it("should throw when decrypting invalid format (not 3 parts)", () => {
    // The internal error is wrapped as "Failed to decrypt data"
    expect(() => decrypt("not-valid-format")).toThrow("Failed to decrypt data");
  });

  it("should throw when decrypting tampered ciphertext (auth tag mismatch)", () => {
    const encrypted = encrypt("sensitive data");
    const parts = encrypted.split(":");
    // Tamper with the ciphertext part
    const tampered = parts[0] + ":" + parts[1] + ":" + "deadbeef".repeat(4);
    expect(() => decrypt(tampered)).toThrow();
  });

  it("should handle unicode and special characters", () => {
    const plaintext = "token: abc123!@#$%^&*() — español 中文";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("should handle long tokens (typical Google OAuth token length)", () => {
    const longToken = "ya29." + "x".repeat(200);
    expect(decrypt(encrypt(longToken))).toBe(longToken);
  });
});

describe("encryptSensitiveData / decryptSensitiveData (aliases)", () => {
  it("should be functional aliases for encrypt/decrypt", () => {
    const token = "google-refresh-token-abc123";
    const encrypted = encryptSensitiveData(token);
    expect(encrypted).not.toBe(token);
    expect(decryptSensitiveData(encrypted)).toBe(token);
  });
});

describe("hash", () => {
  it("should return a 64-char hex SHA-256 digest", () => {
    const result = hash("some data");
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("should be deterministic for the same input", () => {
    expect(hash("abc")).toBe(hash("abc"));
  });

  it("should produce different hashes for different inputs", () => {
    expect(hash("abc")).not.toBe(hash("def"));
  });

  it("should return empty string for empty input", () => {
    expect(hash("")).toBe("");
  });
});

describe("verifySensitiveData", () => {
  it("should return true when data matches stored hash", () => {
    const data = "my-password";
    const stored = hash(data);
    expect(verifySensitiveData(data, stored)).toBe(true);
  });

  it("should return false when data does not match stored hash", () => {
    const stored = hash("correct-password");
    expect(verifySensitiveData("wrong-password", stored)).toBe(false);
  });
});
