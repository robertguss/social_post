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

    const userId = identity.subject;

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
          userId,
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
 * @param userId - The authenticated user's Clerk ID
 * @param platform - The platform name ("twitter" or "linkedin")
 * @param accessToken - ENCRYPTED OAuth access token
 * @param refreshToken - ENCRYPTED OAuth refresh token
 * @param expiresAt - Token expiration timestamp
 * @returns The ID of the created or updated connection record
 */
export const saveConnectionInternal = internalMutation({
  args: {
    userId: v.string(),
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
        q.eq("userId", args.userId).eq("platform", args.platform)
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
        userId: args.userId,
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
 * @param userId - The user's Clerk ID
 * @param platform - The platform name ("twitter" or "linkedin")
 * @returns Object containing decrypted tokens and expiration, or null if not found
 */
export const getDecryptedConnection = internalAction({
  args: {
    userId: v.string(),
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
          userId: args.userId,
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
 * @param userId - The user's Clerk ID
 * @param platform - The platform name ("twitter" or "linkedin")
 * @returns Connection record or null if not found
 */
export const getConnectionInternal = internalQuery({
  args: {
    userId: v.string(),
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
        q.eq("userId", args.userId).eq("platform", args.platform)
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

    const userId = identity.subject;

    // Query connection using the by_user_platform index
    const connection = await ctx.db
      .query("user_connections")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", userId).eq("platform", args.platform)
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

