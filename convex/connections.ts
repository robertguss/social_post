import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Save or update a user's connection to an external platform (X/Twitter or LinkedIn).
 *
 * SECURITY NOTE: In this story (1.2), tokens are stored as plain text.
 * Token encryption will be implemented in Story 1.3.
 *
 * @param platform - The platform name ("twitter" or "linkedin")
 * @param accessToken - OAuth access token
 * @param refreshToken - OAuth refresh token
 * @param expiresAt - Token expiration timestamp
 * @returns The ID of the created or updated connection record
 */
export const saveConnection = mutation({
  args: {
    platform: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
  },
  returns: v.id("user_connections"),
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkUserId = identity.subject;

    // Check if connection already exists for this user and platform
    const existingConnection = await ctx.db
      .query("user_connections")
      .withIndex("by_user_platform", (q) =>
        q.eq("clerkUserId", clerkUserId).eq("platform", args.platform)
      )
      .first();

    if (existingConnection) {
      // Update existing connection
      await ctx.db.patch(existingConnection._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
      });
      return existingConnection._id;
    } else {
      // Insert new connection
      const connectionId = await ctx.db.insert("user_connections", {
        clerkUserId,
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
 * Get the connection status for a specific platform for the authenticated user.
 *
 * @param platform - The platform name ("twitter" or "linkedin")
 * @returns Connection status object with connected state, expiration, and reauth flag
 */
export const getConnectionStatus = query({
  args: {
    platform: v.string(),
  },
  returns: v.object({
    connected: v.boolean(),
    expiresAt: v.optional(v.number()),
    needsReauth: v.boolean(),
  }),
  handler: async (ctx, args) => {
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
