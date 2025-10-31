"use node";

import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * PUBLIC ACTION: Save or update a user's connection with encrypted tokens.
 *
 * This action encrypts OAuth tokens before storing them in the database.
 * It should be called from the OAuth callback flow after receiving tokens from the provider.
 *
 * @param platform - The platform name ("twitter" or "linkedin")
 * @param accessToken - OAuth access token (plain text - will be encrypted)
 * @param refreshToken - OAuth refresh token (plain text - will be encrypted)
 * @param expiresAt - Token expiration timestamp
 * @returns The ID of the created or updated connection record
 */
export const saveConnection = action({
  args: {
    platform: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"user_connections">> => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkUserId = identity.subject;

    try {
      // Encrypt the tokens before storage
      const encryptedAccessToken = await ctx.runAction(
        internal.encryption.encrypt,
        { plaintext: args.accessToken }
      );

      const encryptedRefreshToken = await ctx.runAction(
        internal.encryption.encrypt,
        { plaintext: args.refreshToken }
      );

      // Save the encrypted tokens via internal mutation
      const connectionId = await ctx.runMutation(
        internal.connections.saveConnectionInternal,
        {
          clerkUserId,
          platform: args.platform,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: args.expiresAt,
        }
      );

      return connectionId;
    } catch (error) {
      // Handle encryption errors gracefully - never log tokens
      throw new Error(
        `Failed to save connection: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

/**
 * INTERNAL MUTATION: Save encrypted connection to database.
 *
 * This mutation should only be called from the saveConnection action after tokens are encrypted.
 * It handles the database insert/update logic.
 *
 * @param clerkUserId - The authenticated user's Clerk ID
 * @param platform - The platform name ("twitter" or "linkedin")
 * @param accessToken - ENCRYPTED OAuth access token
 * @param refreshToken - ENCRYPTED OAuth refresh token
 * @param expiresAt - Token expiration timestamp
 * @returns The ID of the created or updated connection record
 */
export const saveConnectionInternal = internalMutation({
  args: {
    clerkUserId: v.string(),
    platform: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"user_connections">> => {
    // Check if connection already exists for this user and platform
    const existingConnection = await ctx.db
      .query("user_connections")
      .withIndex("by_user_platform", (q) =>
        q.eq("clerkUserId", args.clerkUserId).eq("platform", args.platform)
      )
      .first();

    if (existingConnection) {
      // Update existing connection with encrypted tokens
      await ctx.db.patch(existingConnection._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
      });
      return existingConnection._id;
    } else {
      // Insert new connection with encrypted tokens
      const connectionId = await ctx.db.insert("user_connections", {
        clerkUserId: args.clerkUserId,
        platform: args.platform,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
      });
      return connectionId;
    }
  },
});

/**
 * INTERNAL ACTION: Retrieve and decrypt OAuth tokens for a specific platform.
 *
 * This action is restricted to internal use only (e.g., from publishing actions).
 * It retrieves the encrypted tokens from the database and decrypts them.
 *
 * @param clerkUserId - The user's Clerk ID
 * @param platform - The platform name ("twitter" or "linkedin")
 * @returns Object containing decrypted tokens and expiration, or null if not found
 */
export const getDecryptedConnection = internalAction({
  args: {
    clerkUserId: v.string(),
    platform: v.string(),
  },
  handler: async (ctx, args): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  } | null> => {
    try {
      // Query the connection using internal query
      const connection = await ctx.runQuery(
        internal.connections.getConnectionInternal,
        {
          clerkUserId: args.clerkUserId,
          platform: args.platform,
        }
      );

      if (!connection) {
        return null;
      }

      // Decrypt the tokens
      const decryptedAccessToken = await ctx.runAction(
        internal.encryption.decrypt,
        { ciphertext: connection.accessToken }
      );

      const decryptedRefreshToken = await ctx.runAction(
        internal.encryption.decrypt,
        { ciphertext: connection.refreshToken }
      );

      return {
        accessToken: decryptedAccessToken,
        refreshToken: decryptedRefreshToken,
        expiresAt: connection.expiresAt,
      };
    } catch (error) {
      // Handle decryption errors - never log encrypted or decrypted tokens
      throw new Error(
        `Failed to retrieve or decrypt connection: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

/**
 * INTERNAL QUERY: Get encrypted connection from database.
 *
 * This query retrieves the connection record with encrypted tokens.
 * Should only be called from internal actions.
 *
 * @param clerkUserId - The user's Clerk ID
 * @param platform - The platform name ("twitter" or "linkedin")
 * @returns Connection record or null if not found
 */
export const getConnectionInternal = internalQuery({
  args: {
    clerkUserId: v.string(),
    platform: v.string(),
  },
  handler: async (ctx, args): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  } | null> => {
    const connection = await ctx.db
      .query("user_connections")
      .withIndex("by_user_platform", (q) =>
        q.eq("clerkUserId", args.clerkUserId).eq("platform", args.platform)
      )
      .first();

    if (!connection) {
      return null;
    }

    return {
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      expiresAt: connection.expiresAt,
    };
  },
});

/**
 * Get the connection status for a specific platform for the authenticated user.
 *
 * @param platform - The platform name ("twitter" or "linkedin")
 * @returns Connection status object with connected state, expiration, and reauth flag
 */
export const getConnectionStatus = query({
  args: {
    platform: v.string(),
  },
  handler: async (ctx, args): Promise<{
    connected: boolean;
    expiresAt?: number;
    needsReauth: boolean;
  }> => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkUserId = identity.subject;

    // Query connection using the by_user_platform index
    const connection = await ctx.db
      .query("user_connections")
      .withIndex("by_user_platform", (q) =>
        q.eq("clerkUserId", clerkUserId).eq("platform", args.platform)
      )
      .first();

    if (!connection) {
      return {
        connected: false,
        needsReauth: false,
      };
    }

    // Check if token is expired
    const now = Date.now();
    const isExpired = connection.expiresAt < now;

    return {
      connected: true,
      expiresAt: connection.expiresAt,
      needsReauth: isExpired,
    };
  },
});

/**
 * INTERNAL ACTION: Refresh expired LinkedIn OAuth tokens.
 *
 * This action refreshes LinkedIn access and refresh tokens using the LinkedIn OAuth 2.0
 * token refresh endpoint. It implements retry logic with exponential backoff for transient
 * failures and timeout handling.
 *
 * LinkedIn token expiration:
 * - Access tokens: 60 days (5,184,000 seconds)
 * - Refresh tokens: 365 days (31,536,000 seconds)
 *
 * @param clerkUserId - The user's Clerk ID
 * @returns Success status and updated expiration timestamp, or error details
 * @throws Error if refresh token is expired (requires re-authentication)
 */
export const refreshLinkedInToken = internalAction({
  args: {
    clerkUserId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    expiresAt: v.optional(v.number()),
    error: v.optional(v.string()),
    needsReauth: v.optional(v.boolean()),
  }),
  handler: async (ctx, args): Promise<{
    success: boolean;
    expiresAt?: number;
    error?: string;
    needsReauth?: boolean;
  }> => {
    try {
      // Get encrypted connection from database
      const connection = await ctx.runQuery(
        internal.connections.getConnectionInternal,
        {
          clerkUserId: args.clerkUserId,
          platform: "linkedin",
        }
      );

      if (!connection) {
        return {
          success: false,
          error: "LinkedIn connection not found",
          needsReauth: true,
        };
      }

      // Decrypt the refresh token
      const decryptedRefreshToken = await ctx.runAction(
        internal.encryption.decrypt,
        { ciphertext: connection.refreshToken }
      );

      // Get LinkedIn OAuth credentials from environment
      const clientId = process.env.LINKEDIN_CLIENT_ID;
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error("LinkedIn OAuth credentials not configured");
      }

      // Call LinkedIn token refresh endpoint with retry logic
      const tokenEndpoint = "https://www.linkedin.com/oauth/v2/accessToken";
      const maxRetries = 3;
      const timeoutMs = 10000; // 10 seconds

      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Create AbortController for timeout handling
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          const response = await fetch(tokenEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: decryptedRefreshToken,
              client_id: clientId,
              client_secret: clientSecret,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();

            // Handle expired refresh token (requires re-authentication)
            if (response.status === 400 || response.status === 401) {
              return {
                success: false,
                error: "Refresh token expired - re-authentication required",
                needsReauth: true,
              };
            }

            // Retry on 5xx server errors or 429 rate limiting
            if (response.status >= 500 || response.status === 429) {
              if (attempt < maxRetries - 1) {
                const delayMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
                console.warn(
                  `LinkedIn token refresh failed (attempt ${attempt + 1}/${maxRetries}): ${response.statusText}. Retrying in ${delayMs}ms...`
                );
                await new Promise((resolve) => setTimeout(resolve, delayMs));
                continue;
              }
            }

            // Don't retry on other client errors (4xx)
            throw new Error(
              `LinkedIn token refresh failed: ${response.statusText} - ${errorText}`
            );
          }

          // Parse successful response
          const data = await response.json();

          if (!data.access_token || !data.refresh_token) {
            throw new Error(
              "LinkedIn token refresh response missing required tokens"
            );
          }

          // Calculate new expiration timestamp
          const expiresIn = data.expires_in || 5184000; // Default: 60 days in seconds
          const newExpiresAt = Date.now() + expiresIn * 1000;

          // Encrypt the new tokens before storage
          const encryptedAccessToken = await ctx.runAction(
            internal.encryption.encrypt,
            { plaintext: data.access_token }
          );

          const encryptedRefreshToken = await ctx.runAction(
            internal.encryption.encrypt,
            { plaintext: data.refresh_token }
          );

          // Save encrypted tokens to database
          await ctx.runMutation(internal.connections.saveConnectionInternal, {
            clerkUserId: args.clerkUserId,
            platform: "linkedin",
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt: newExpiresAt,
          });

          return {
            success: true,
            expiresAt: newExpiresAt,
          };
        } catch (error) {
          // Handle timeout errors
          if (error instanceof Error && error.name === "AbortError") {
            if (attempt < maxRetries - 1) {
              const delayMs = Math.pow(2, attempt) * 1000;
              console.warn(
                `LinkedIn token refresh timed out (attempt ${attempt + 1}/${maxRetries}). Retrying in ${delayMs}ms...`
              );
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              continue;
            }
            lastError = new Error(
              "LinkedIn token refresh timed out after multiple attempts"
            );
            break;
          }

          // Handle other network errors with retry
          if (attempt < maxRetries - 1) {
            const delayMs = Math.pow(2, attempt) * 1000;
            console.warn(
              `LinkedIn token refresh error (attempt ${attempt + 1}/${maxRetries}): ${error instanceof Error ? error.message : "Unknown error"}. Retrying in ${delayMs}ms...`
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            lastError = error instanceof Error ? error : new Error(String(error));
            continue;
          }

          lastError = error instanceof Error ? error : new Error(String(error));
          break;
        }
      }

      // All retries failed
      return {
        success: false,
        error: lastError?.message || "LinkedIn token refresh failed after all retries",
        needsReauth: false,
      };
    } catch (error) {
      // Handle unexpected errors (decryption failures, etc.)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during token refresh",
        needsReauth: false,
      };
    }
  },
});
