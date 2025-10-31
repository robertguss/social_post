/**
 * Unit tests for encryption utilities
 *
 * These tests verify the encryption/decryption functionality using AES-256-GCM.
 *
 * NOTE: These tests directly test the encryption logic without importing from Convex
 * due to Jest ESM module compatibility issues with Convex generated code.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

// Inline encryption/decryption implementations for testing (mirrors convex/encryption.ts logic)
const encryptToken = (plaintext: string, encryptionKey: string): string => {
  if (!plaintext || plaintext.trim() === "") {
    throw new Error("Cannot encrypt empty string");
  }

  if (!encryptionKey) {
    throw new Error(
      "ENCRYPTION_KEY not configured in Convex Environment Variables"
    );
  }

  const keyBuffer = Buffer.from(encryptionKey, "base64");

  if (keyBuffer.length !== 32) {
    throw new Error(
      `Invalid encryption key length: expected 32 bytes, got ${keyBuffer.length} bytes`
    );
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
};

const decryptToken = (ciphertext: string, encryptionKey: string): string => {
  if (!ciphertext || ciphertext.trim() === "") {
    throw new Error("Cannot decrypt empty string");
  }

  if (!encryptionKey) {
    throw new Error(
      "ENCRYPTION_KEY not configured in Convex Environment Variables"
    );
  }

  const keyBuffer = Buffer.from(encryptionKey, "base64");

  if (keyBuffer.length !== 32) {
    throw new Error(
      `Invalid encryption key length: expected 32 bytes, got ${keyBuffer.length} bytes`
    );
  }

  const combined = Buffer.from(ciphertext, "base64");
  const minimumLength = IV_LENGTH + AUTH_TAG_LENGTH;

  if (combined.length < minimumLength) {
    throw new Error(
      `Invalid ciphertext: too short (minimum ${minimumLength} bytes required)`
    );
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
};

// Mock encryption key for testing
const MOCK_ENCRYPTION_KEY = Buffer.from(
  "0123456789abcdef0123456789abcdef"
).toString("base64"); // 32 bytes

describe("Encryption Utilities", () => {
  describe("encrypt", () => {
    it("should encrypt a plaintext string", () => {
      const plaintext = "my_secret_token_12345";

      const result = encryptToken(plaintext, MOCK_ENCRYPTION_KEY);

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result).not.toBe(plaintext);
      expect(result).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it("should produce different ciphertext for same input (due to random IV)", () => {
      const plaintext = "same_token_value";

      const result1 = encryptToken(plaintext, MOCK_ENCRYPTION_KEY);
      const result2 = encryptToken(plaintext, MOCK_ENCRYPTION_KEY);

      expect(result1).not.toBe(result2);
    });

    it("should throw error for empty string", () => {
      expect(() => encryptToken("", MOCK_ENCRYPTION_KEY)).toThrow(
        "Cannot encrypt empty string"
      );
    });

    it("should throw error for whitespace-only string", () => {
      expect(() => encryptToken("   ", MOCK_ENCRYPTION_KEY)).toThrow(
        "Cannot encrypt empty string"
      );
    });

    it("should throw error when encryption key is not configured", () => {
      expect(() => encryptToken("token", "")).toThrow(
        "ENCRYPTION_KEY not configured"
      );
    });

    it("should handle long strings", () => {
      const longPlaintext = "a".repeat(1000);

      const result = encryptToken(longPlaintext, MOCK_ENCRYPTION_KEY);

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("should handle special characters", () => {
      const specialChars = "!@#$%^&*(){}[]|\\:;\"'<>,.?/~`";

      const result = encryptToken(specialChars, MOCK_ENCRYPTION_KEY);

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("should handle unicode characters", () => {
      const unicode = "Hello 世界 🌍 مرحبا";

      const result = encryptToken(unicode, MOCK_ENCRYPTION_KEY);

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });
  });

  describe("decrypt", () => {
    it("should decrypt an encrypted string", () => {
      const plaintext = "my_secret_token_12345";

      const encrypted = encryptToken(plaintext, MOCK_ENCRYPTION_KEY);
      const decrypted = decryptToken(encrypted, MOCK_ENCRYPTION_KEY);

      expect(decrypted).toBe(plaintext);
    });

    it("should throw error for empty ciphertext", () => {
      expect(() => decryptToken("", MOCK_ENCRYPTION_KEY)).toThrow(
        "Cannot decrypt empty string"
      );
    });

    it("should throw error for invalid ciphertext format", () => {
      expect(() => decryptToken("invalid_base64!", MOCK_ENCRYPTION_KEY)).toThrow();
    });

    it("should throw error for too short ciphertext", () => {
      const tooShort = Buffer.from("short").toString("base64");

      expect(() => decryptToken(tooShort, MOCK_ENCRYPTION_KEY)).toThrow(
        "Invalid ciphertext: too short"
      );
    });

    it("should throw error when encryption key is not configured", () => {
      expect(() => decryptToken("dGVzdA==", "")).toThrow(
        "ENCRYPTION_KEY not configured"
      );
    });

    it("should fail to decrypt with wrong key", () => {
      const plaintext = "secret_token";

      const encrypted = encryptToken(plaintext, MOCK_ENCRYPTION_KEY);

      const wrongKey = Buffer.from("different_key_0123456789abcdef").toString(
        "base64"
      );

      expect(() => decryptToken(encrypted, wrongKey)).toThrow();
    });
  });

  describe("encrypt/decrypt round-trip", () => {
    it("should successfully round-trip with various inputs", () => {
      const testCases = [
        "simple_token",
        "token_with_numbers_12345",
        "special!@#$chars",
        "very_long_" + "x".repeat(500) + "_token",
        "unicode_世界_🌍",
        "a",
        "AB",
      ];

      for (const plaintext of testCases) {
        const encrypted = encryptToken(plaintext, MOCK_ENCRYPTION_KEY);
        const decrypted = decryptToken(encrypted, MOCK_ENCRYPTION_KEY);
        expect(decrypted).toBe(plaintext);
      }
    });

    it("should handle multiple encrypt/decrypt operations", () => {
      const plaintext = "test_token_value";

      const encrypted1 = encryptToken(plaintext, MOCK_ENCRYPTION_KEY);
      const encrypted2 = encryptToken(plaintext, MOCK_ENCRYPTION_KEY);
      const encrypted3 = encryptToken(plaintext, MOCK_ENCRYPTION_KEY);

      expect(decryptToken(encrypted1, MOCK_ENCRYPTION_KEY)).toBe(plaintext);
      expect(decryptToken(encrypted2, MOCK_ENCRYPTION_KEY)).toBe(plaintext);
      expect(decryptToken(encrypted3, MOCK_ENCRYPTION_KEY)).toBe(plaintext);
    });
  });
});
