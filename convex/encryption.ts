"use node";

import {
  action,
  internalAction,
} from "./_generated/server";
import { v } from "convex/values";
import crypto from "crypto";
import { internal } from "./_generated/api";

/**
 * Encryption/Decryption Utilities for OAuth Token Storage
 *
 * Uses AES-256-GCM encryption algorithm for secure token storage.
 * IV (Initialization Vector) is randomly generated for each encryption
 * and prepended to the ciphertext.
 *
 * Format: [IV (12 bytes)][Auth Tag (16 bytes)][Ciphertext]
 * Output: Base64-encoded string
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits for GCM

/**
 * Encrypts a plaintext string using AES-256-GCM encryption.
 *
 * @param plaintext - The string to encrypt (e.g., OAuth token)
 * @returns Base64-encoded string containing IV + auth tag + ciphertext
 * @throws Error if encryption key is not configured or encryption fails
 */
export const encrypt = internalAction({
  args: { plaintext: v.string() },
  handler: async (_ctx, args): Promise<string> => {
    // Validate input
    if (!args.plaintext || args.plaintext.trim() === "") {
      throw new Error("Cannot encrypt empty string");
    }

    // Get encryption key from environment
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error(
        "ENCRYPTION_KEY not configured in Convex Environment Variables"
      );
    }

    try {
      // Convert base64 encryption key to buffer
      const keyBuffer = Buffer.from(encryptionKey, "base64");

      // Validate key length (must be 32 bytes for AES-256)
      if (keyBuffer.length !== 32) {
        throw new Error(
          `Invalid encryption key length: expected 32 bytes, got ${keyBuffer.length} bytes`
        );
      }

      // Generate random IV (initialization vector)
      const iv = crypto.randomBytes(IV_LENGTH);

      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

      // Encrypt the plaintext
      let encrypted = cipher.update(args.plaintext, "utf8");
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      // Get the authentication tag
      const authTag = cipher.getAuthTag();

      // Combine IV + auth tag + ciphertext
      const combined = Buffer.concat([iv, authTag, encrypted]);

      // Return as base64-encoded string
      return combined.toString("base64");
    } catch (error) {
      // Never log the plaintext or key in error messages
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

/**
 * Decrypts a ciphertext string encrypted with AES-256-GCM.
 *
 * @param ciphertext - Base64-encoded string containing IV + auth tag + ciphertext
 * @returns The decrypted plaintext string
 * @throws Error if encryption key is not configured, ciphertext is invalid, or decryption fails
 */
export const decrypt = internalAction({
  args: { ciphertext: v.string() },
  handler: async (_ctx, args): Promise<string> => {
    // Validate input
    if (!args.ciphertext || args.ciphertext.trim() === "") {
      throw new Error("Cannot decrypt empty string");
    }

    // Get encryption key from environment
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error(
        "ENCRYPTION_KEY not configured in Convex Environment Variables"
      );
    }

    try {
      // Convert base64 encryption key to buffer
      const keyBuffer = Buffer.from(encryptionKey, "base64");

      // Validate key length (must be 32 bytes for AES-256)
      if (keyBuffer.length !== 32) {
        throw new Error(
          `Invalid encryption key length: expected 32 bytes, got ${keyBuffer.length} bytes`
        );
      }

      // Decode the combined buffer from base64
      const combined = Buffer.from(args.ciphertext, "base64");

      // Extract IV, auth tag, and encrypted data
      const minimumLength = IV_LENGTH + AUTH_TAG_LENGTH;
      if (combined.length < minimumLength) {
        throw new Error(
          `Invalid ciphertext: too short (minimum ${minimumLength} bytes required)`
        );
      }

      const iv = combined.subarray(0, IV_LENGTH);
      const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the data
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      // Return as UTF-8 string
      return decrypted.toString("utf8");
    } catch (error) {
      // Never log the ciphertext or key in error messages
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

/**
 * Migration action to encrypt existing plain-text tokens in the user_connections table.
 *
 * This action should be run once after deploying the encryption feature to migrate
 * any existing plain-text tokens to encrypted format.
 *
 * @param dryRun - If true, performs a simulation without modifying data
 * @returns Migration results with counts of processed, encrypted, and skipped records
 */
export const migrateTokensToEncrypted = action({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    totalRecords: number;
    encrypted: number;
    alreadyEncrypted: number;
    errors: number;
    dryRun: boolean;
  }> => {
    const dryRun = args.dryRun ?? false;

    // Get all connection records
    const connections = await ctx.runQuery(
      internal.encryptionHelpers.getAllConnectionsForMigration
    );

    let encrypted = 0;
    let alreadyEncrypted = 0;
    let errors = 0;

    console.log(
      `[Migration] ${dryRun ? "DRY RUN: " : ""}Processing ${connections.length} connection records...`
    );

    for (const connection of connections) {
      try {
        // Check if tokens are already encrypted by attempting to decrypt
        // Plain-text tokens will fail this check
        let isAlreadyEncrypted = false;

        try {
          // Try to decrypt - if it succeeds, it's already encrypted
          await ctx.runAction(internal.encryption.decrypt, {
            ciphertext: connection.accessToken,
          });
          isAlreadyEncrypted = true;
        } catch {
          // Decryption failed, so it's likely plain text
          isAlreadyEncrypted = false;
        }

        if (isAlreadyEncrypted) {
          console.log(
            `[Migration] Connection ${connection._id} already encrypted, skipping`
          );
          alreadyEncrypted++;
          continue;
        }

        // Encrypt the tokens
        const encryptedAccessToken = await ctx.runAction(
          internal.encryption.encrypt,
          { plaintext: connection.accessToken }
        );

        const encryptedRefreshToken = await ctx.runAction(
          internal.encryption.encrypt,
          { plaintext: connection.refreshToken }
        );

        if (!dryRun) {
          // Update the record with encrypted tokens
          await ctx.runMutation(internal.encryptionHelpers.updateConnectionTokens, {
            connectionId: connection._id,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
          });
        }

        console.log(
          `[Migration] ${dryRun ? "Would encrypt" : "Encrypted"} connection ${connection._id}`
        );
        encrypted++;
      } catch (error) {
        console.error(
          `[Migration] Error processing connection ${connection._id}:`,
          error instanceof Error ? error.message : "Unknown error"
        );
        errors++;
      }
    }

    const results = {
      totalRecords: connections.length,
      encrypted,
      alreadyEncrypted,
      errors,
      dryRun,
    };

    console.log(`[Migration] Complete:`, results);
    return results;
  },
});
