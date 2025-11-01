import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Schema for Social Posting Scheduler application
export default defineSchema({
  // Stores scheduled and published content
  posts: defineTable({
    clerkUserId: v.string(),
    status: v.string(), // "draft" | "scheduled" | "publishing" | "published" | "failed"
    twitterContent: v.optional(v.string()),
    linkedInContent: v.optional(v.string()),
    twitterScheduledTime: v.optional(v.number()),
    linkedInScheduledTime: v.optional(v.number()),
    twitterSchedulerId: v.optional(v.id("_scheduled_functions")),
    linkedInSchedulerId: v.optional(v.id("_scheduled_functions")),
    url: v.optional(v.string()), // For auto-commenting
    errorMessage: v.optional(v.string()),
    retryCount: v.optional(v.number()),
    twitterPostId: v.optional(v.string()),
    linkedInPostId: v.optional(v.string()),
  }).index("by_user", ["clerkUserId"]),

  // Stores encrypted OAuth tokens for external platforms
  user_connections: defineTable({
    clerkUserId: v.string(),
    platform: v.string(), // "twitter" | "linkedin"
    accessToken: v.string(), // Must be encrypted before storage
    refreshToken: v.string(), // Must be encrypted before storage
    expiresAt: v.number(), // Timestamp
  }).index("by_user_platform", ["clerkUserId", "platform"]),
});
