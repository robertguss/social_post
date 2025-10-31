import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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
      retryCount: undefined,
      twitterPostId: undefined,
      linkedInPostId: undefined,
    });

    // TODO: Schedule the publishing action using ctx.scheduler.runAt()
    // This will be implemented in a future story when the publishing logic is ready

    return postId;
  },
});
