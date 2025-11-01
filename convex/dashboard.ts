import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * PUBLIC QUERY: Get dashboard statistics for the authenticated user
 *
 * Returns aggregate metrics for the dashboard:
 * - Total posts (all statuses)
 * - Scheduled posts (future posts)
 * - Published posts (successfully published)
 * - Failed posts (publishing failed)
 * - Connected platforms count
 */
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkUserId = identity.subject;

    // Get all posts for the user
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();

    // Calculate stats
    const now = Date.now();
    const totalPosts = posts.length;

    const scheduledPosts = posts.filter((post) => {
      if (post.status !== "Scheduled") return false;

      // Check if any scheduled time is in the future
      const hasTwitterFuture = post.twitterScheduledTime && post.twitterScheduledTime > now;
      const hasLinkedInFuture = post.linkedInScheduledTime && post.linkedInScheduledTime > now;

      return hasTwitterFuture || hasLinkedInFuture;
    }).length;

    const publishedPosts = posts.filter(
      (post) => post.status === "Published"
    ).length;

    const failedPosts = posts.filter(
      (post) => post.status === "Failed"
    ).length;

    // Get connected platforms
    const connections = await ctx.db
      .query("user_connections")
      .withIndex("by_user_platform", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();

    // Count non-expired connections
    const activeConnections = connections.filter(
      (conn) => conn.expiresAt > now
    ).length;

    return {
      totalPosts,
      scheduledPosts,
      publishedPosts,
      failedPosts,
      connectedPlatforms: activeConnections,
    };
  },
});

/**
 * PUBLIC QUERY: Get recent posts for dashboard activity feed
 *
 * Returns the 10 most recent posts sorted by creation time
 */
export const getRecentPosts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkUserId = identity.subject;
    const limit = args.limit || 10;

    // Get posts sorted by creation time
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
      .order("desc")
      .take(limit);

    return posts;
  },
});
