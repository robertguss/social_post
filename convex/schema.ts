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
    clonedFromPostId: v.optional(v.id("posts")), // References original post ID if this post was cloned
    createdByQueueId: v.optional(v.id("recurring_queues")), // References queue ID if this post was created by a recurring queue
  })
    .index("by_user", ["clerkUserId"])
    .index("by_user_status", ["clerkUserId", "status"]),

  // Stores encrypted OAuth tokens for external platforms
  user_connections: defineTable({
    clerkUserId: v.string(),
    platform: v.string(), // "twitter" | "linkedin"
    accessToken: v.string(), // Must be encrypted before storage
    refreshToken: v.string(), // Must be encrypted before storage
    expiresAt: v.number(), // Timestamp
  }).index("by_user_platform", ["clerkUserId", "platform"]),

  // Stores reusable content templates for users
  templates: defineTable({
    clerkUserId: v.string(),
    name: v.string(), // Unique per user
    content: v.string(), // Template text content
    tags: v.array(v.string()), // e.g., ["hashtags", "closing", "buildinpublic"]
    lastUsedAt: v.optional(v.number()), // Timestamp, null until first use
    usageCount: v.number(), // Default 0
  }).index("by_user", ["clerkUserId"]),

  // Stores recurring post queues for automated content recycling
  recurring_queues: defineTable({
    clerkUserId: v.string(), // Clerk user ID for user scoping
    originalPostId: v.id("posts"), // Reference to the post to clone
    status: v.string(), // "active" | "paused" | "completed"
    interval: v.number(), // Number of days between executions
    nextScheduledTime: v.number(), // Unix timestamp (ms) of next execution
    lastExecutedTime: v.optional(v.number()), // Unix timestamp (ms) of last execution
    executionCount: v.number(), // Total number of times queue has executed
    maxExecutions: v.optional(v.number()), // Max executions before auto-completion (null for infinite)
  })
    .index("by_user_status", ["clerkUserId", "status"])
    .index("by_next_scheduled", ["nextScheduledTime"])
    .index("by_status_next_scheduled", ["status", "nextScheduledTime"]),

  // Stores user-specific preferences and settings
  user_preferences: defineTable({
    clerkUserId: v.string(),
    enableContentPrePopulation: v.boolean(), // Default: true - Smart content pre-fill from Twitter to LinkedIn
    // Future preference fields can be added here
  }).index("by_user", ["clerkUserId"]),
});
