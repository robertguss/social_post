import { mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

/**
 * Create a new scheduled post for X/Twitter
 *
 * This mutation creates a post record with status "Scheduled".
 * The post will be published at the specified scheduledTime by a scheduled action.
 *
 * @param content - The post content for X/Twitter (max 280 characters)
 * @param url - Optional URL to be posted as a reply/thread
 * @param scheduledTime - UTC timestamp for when the post should be published
 * @returns The ID of the created post
 */
export const createPost = mutation({
  args: {
    content: v.string(),
    url: v.optional(v.string()),
    scheduledTime: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"posts">> => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkUserId = identity.subject;

    // Validate content
    if (!args.content || args.content.trim() === "") {
      throw new Error("Post content is required");
    }

    if (args.content.length > 280) {
      throw new Error("Post content exceeds 280 character limit");
    }

    // Validate scheduled time (must be in the future)
    const now = Date.now();
    if (args.scheduledTime <= now) {
      throw new Error("Scheduled time must be in the future");
    }

    // Create the post record
    const postId = await ctx.db.insert("posts", {
      clerkUserId,
      status: "Scheduled",
      twitterContent: args.content,
      linkedInContent: "", // Not used in this story
      twitterScheduledTime: args.scheduledTime,
      linkedInScheduledTime: undefined, // Not used in this story
      url: args.url || "",
      // Initialize optional fields
      errorMessage: undefined,
      retryCount: 0, // Initialize retry count to 0
      twitterPostId: undefined,
      linkedInPostId: undefined,
    });

    try {
      // Schedule the publishing action to run at the scheduled time
      await ctx.scheduler.runAt(
        args.scheduledTime,
        internal.publishing.publishTwitterPost,
        { postId }
      );
    } catch (error) {
      // If scheduler fails, update post status to Failed
      await ctx.db.patch(postId, {
        status: "Failed",
        errorMessage: `Failed to schedule post: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      throw new Error(
        `Failed to schedule post: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    return postId;
  },
});

/**
 * INTERNAL MUTATION: Update post status and related fields
 *
 * This mutation is used by publishing actions to update post status during the
 * publishing lifecycle: Scheduled → Publishing → Published/Failed
 *
 * @param postId - The ID of the post to update
 * @param status - The new status ("Scheduled" | "Publishing" | "Published" | "Failed")
 * @param twitterPostId - Optional Twitter post ID (when published successfully)
 * @param errorMessage - Optional error message (when failed)
 * @param retryCount - Optional retry count (for tracking retry attempts)
 */
export const updatePostStatus = internalMutation({
  args: {
    postId: v.id("posts"),
    status: v.string(),
    twitterPostId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    retryCount: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<void> => {
    // Build update object with only provided fields
    const updates: {
      status: string;
      twitterPostId?: string;
      errorMessage?: string;
      retryCount?: number;
    } = {
      status: args.status,
    };

    if (args.twitterPostId !== undefined) {
      updates.twitterPostId = args.twitterPostId;
    }

    if (args.errorMessage !== undefined) {
      updates.errorMessage = args.errorMessage;
    }

    if (args.retryCount !== undefined) {
      updates.retryCount = args.retryCount;
    }

    // Update the post record
    await ctx.db.patch(args.postId, updates);
  },
});

/**
 * INTERNAL QUERY: Get a post by ID
 *
 * This query is used by publishing actions to retrieve post details.
 * Only accessible from internal actions/mutations.
 *
 * @param postId - The ID of the post to retrieve
 * @returns The post record or null if not found
 */
export const getPostById = internalQuery({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.postId);
  },
});
