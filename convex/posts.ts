import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

/**
 * Create a new scheduled post for X/Twitter and/or LinkedIn
 *
 * This mutation creates a post record with status "Scheduled".
 * The post will be published at the specified scheduledTime(s) by scheduled action(s).
 *
 * @param twitterContent - Optional post content for X/Twitter (max 280 characters)
 * @param linkedInContent - Optional post content for LinkedIn (max 3,000 characters)
 * @param twitterScheduledTime - Optional UTC timestamp for Twitter post
 * @param linkedInScheduledTime - Optional UTC timestamp for LinkedIn post
 * @param url - Optional URL to be posted as a reply/thread on Twitter, or first comment on LinkedIn
 * @returns The ID of the created post
 */
export const createPost = mutation({
  args: {
    twitterContent: v.optional(v.string()),
    linkedInContent: v.optional(v.string()),
    twitterScheduledTime: v.optional(v.number()),
    linkedInScheduledTime: v.optional(v.number()),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"posts">> => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkUserId = identity.subject;

    // Validation: At least one platform must be selected
    const hasTwitter = args.twitterContent && args.twitterScheduledTime;
    const hasLinkedIn = args.linkedInContent && args.linkedInScheduledTime;

    if (!hasTwitter && !hasLinkedIn) {
      throw new Error("At least one platform must be selected with content and scheduled time");
    }

    // Twitter validation (if selected)
    if (hasTwitter) {
      if (args.twitterContent!.trim() === "") {
        throw new Error("Twitter content cannot be empty");
      }
      if (args.twitterContent!.length > 280) {
        throw new Error("Twitter content exceeds 280 character limit");
      }
      const now = Date.now();
      if (args.twitterScheduledTime! <= now) {
        throw new Error("Twitter scheduled time must be in the future");
      }
    }

    // LinkedIn validation (if selected)
    if (hasLinkedIn) {
      if (args.linkedInContent!.trim() === "") {
        throw new Error("LinkedIn content cannot be empty");
      }
      if (args.linkedInContent!.length > 3000) {
        throw new Error("LinkedIn content exceeds 3,000 character limit");
      }
      const now = Date.now();
      if (args.linkedInScheduledTime! <= now) {
        throw new Error("LinkedIn scheduled time must be in the future");
      }
    }

    // Create the post record
    const postId = await ctx.db.insert("posts", {
      clerkUserId,
      status: "Scheduled",
      twitterContent: args.twitterContent || "",
      linkedInContent: args.linkedInContent || "",
      twitterScheduledTime: args.twitterScheduledTime,
      linkedInScheduledTime: args.linkedInScheduledTime,
      url: args.url || "",
      // Initialize optional fields
      errorMessage: undefined,
      retryCount: 0,
      twitterPostId: undefined,
      linkedInPostId: undefined,
    });

    try {
      // Schedule publishing actions for each platform and store scheduler IDs
      const schedulerIds: {
        twitterSchedulerId?: Id<"_scheduled_functions">;
        linkedInSchedulerId?: Id<"_scheduled_functions">;
      } = {};

      if (hasTwitter && args.twitterScheduledTime) {
        const twitterSchedulerId = await ctx.scheduler.runAt(
          args.twitterScheduledTime,
          internal.publishing.publishTwitterPost,
          { postId }
        );
        schedulerIds.twitterSchedulerId = twitterSchedulerId;
      }

      if (hasLinkedIn && args.linkedInScheduledTime) {
        const linkedInSchedulerId = await ctx.scheduler.runAt(
          args.linkedInScheduledTime,
          internal.publishing.publishLinkedInPost,
          { postId }
        );
        schedulerIds.linkedInSchedulerId = linkedInSchedulerId;
      }

      // Update post with scheduler IDs for later cancellation support
      await ctx.db.patch(postId, schedulerIds);
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
 * PUBLIC MUTATION: Update an existing scheduled post
 *
 * This mutation allows users to edit content, URL, and scheduled times for posts
 * with status "Scheduled". It cancels existing scheduled actions and creates new ones.
 *
 * @param postId - The ID of the post to update
 * @param twitterContent - Optional updated post content for X/Twitter (max 280 characters)
 * @param linkedInContent - Optional updated post content for LinkedIn (max 3,000 characters)
 * @param twitterScheduledTime - Optional updated UTC timestamp for Twitter post
 * @param linkedInScheduledTime - Optional updated UTC timestamp for LinkedIn post
 * @param url - Optional updated URL to be posted as a reply/thread on Twitter, or first comment on LinkedIn
 */
export const updatePost = mutation({
  args: {
    postId: v.id("posts"),
    twitterContent: v.optional(v.string()),
    linkedInContent: v.optional(v.string()),
    twitterScheduledTime: v.optional(v.number()),
    linkedInScheduledTime: v.optional(v.number()),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkUserId = identity.subject;

    // Retrieve existing post and verify ownership
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }
    if (post.clerkUserId !== clerkUserId) {
      throw new Error("Unauthorized: You can only edit your own posts");
    }

    // Verify post status is "Scheduled"
    if (post.status !== "Scheduled") {
      throw new Error("Only scheduled posts can be edited");
    }

    // Validation: At least one platform must be selected
    const hasTwitter = args.twitterContent && args.twitterScheduledTime;
    const hasLinkedIn = args.linkedInContent && args.linkedInScheduledTime;

    if (!hasTwitter && !hasLinkedIn) {
      throw new Error("At least one platform must be selected with content and scheduled time");
    }

    // Twitter validation (if selected)
    if (hasTwitter) {
      if (args.twitterContent!.trim() === "") {
        throw new Error("Twitter content cannot be empty");
      }
      if (args.twitterContent!.length > 280) {
        throw new Error("Twitter content exceeds 280 character limit");
      }
      const now = Date.now();
      if (args.twitterScheduledTime! <= now) {
        throw new Error("Twitter scheduled time must be in the future");
      }
    }

    // LinkedIn validation (if selected)
    if (hasLinkedIn) {
      if (args.linkedInContent!.trim() === "") {
        throw new Error("LinkedIn content cannot be empty");
      }
      if (args.linkedInContent!.length > 3000) {
        throw new Error("LinkedIn content exceeds 3,000 character limit");
      }
      const now = Date.now();
      if (args.linkedInScheduledTime! <= now) {
        throw new Error("LinkedIn scheduled time must be in the future");
      }
    }

    // Cancel existing scheduled actions
    try {
      if (post.twitterSchedulerId) {
        await ctx.scheduler.cancel(post.twitterSchedulerId);
      }
      if (post.linkedInSchedulerId) {
        await ctx.scheduler.cancel(post.linkedInSchedulerId);
      }
    } catch (error) {
      // Cancellation may fail if function already started executing - handle gracefully
      console.warn("Failed to cancel scheduler:", error);
    }

    // Update post content and times
    await ctx.db.patch(args.postId, {
      twitterContent: args.twitterContent || "",
      linkedInContent: args.linkedInContent || "",
      twitterScheduledTime: args.twitterScheduledTime,
      linkedInScheduledTime: args.linkedInScheduledTime,
      url: args.url || "",
    });

    // Schedule new publishing actions and store new scheduler IDs
    try {
      const schedulerIds: {
        twitterSchedulerId?: Id<"_scheduled_functions">;
        linkedInSchedulerId?: Id<"_scheduled_functions">;
      } = {};

      if (hasTwitter && args.twitterScheduledTime) {
        const twitterSchedulerId = await ctx.scheduler.runAt(
          args.twitterScheduledTime,
          internal.publishing.publishTwitterPost,
          { postId: args.postId }
        );
        schedulerIds.twitterSchedulerId = twitterSchedulerId;
      } else {
        // Clear Twitter scheduler ID if Twitter is no longer selected
        schedulerIds.twitterSchedulerId = undefined;
      }

      if (hasLinkedIn && args.linkedInScheduledTime) {
        const linkedInSchedulerId = await ctx.scheduler.runAt(
          args.linkedInScheduledTime,
          internal.publishing.publishLinkedInPost,
          { postId: args.postId }
        );
        schedulerIds.linkedInSchedulerId = linkedInSchedulerId;
      } else {
        // Clear LinkedIn scheduler ID if LinkedIn is no longer selected
        schedulerIds.linkedInSchedulerId = undefined;
      }

      // Update post with new scheduler IDs
      await ctx.db.patch(args.postId, schedulerIds);
    } catch (error) {
      // If rescheduling fails, update post status to Failed
      await ctx.db.patch(args.postId, {
        status: "Failed",
        errorMessage: `Failed to reschedule post: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      throw new Error(
        `Failed to reschedule post: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

/**
 * PUBLIC MUTATION: Delete a scheduled post
 *
 * This mutation allows users to delete posts with status "Scheduled".
 * It cancels any scheduled actions before removing the post from the database.
 *
 * @param postId - The ID of the post to delete
 */
export const deletePost = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args): Promise<void> => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkUserId = identity.subject;

    // Retrieve post and verify ownership
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }
    if (post.clerkUserId !== clerkUserId) {
      throw new Error("Unauthorized: You can only delete your own posts");
    }

    // Verify post status is "Scheduled"
    if (post.status !== "Scheduled") {
      throw new Error("Only scheduled posts can be deleted");
    }

    // Cancel scheduled actions before deletion
    try {
      if (post.twitterSchedulerId) {
        await ctx.scheduler.cancel(post.twitterSchedulerId);
      }
      if (post.linkedInSchedulerId) {
        await ctx.scheduler.cancel(post.linkedInSchedulerId);
      }
    } catch (error) {
      // Cancellation may fail if function already started executing - handle gracefully
      console.warn("Failed to cancel scheduler:", error);
      // Continue with deletion even if cancellation fails
    }

    // Delete the post document
    await ctx.db.delete(args.postId);
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
 * @param linkedInPostId - Optional LinkedIn post URN (when published successfully)
 * @param errorMessage - Optional error message (when failed)
 * @param retryCount - Optional retry count (for tracking retry attempts)
 */
export const updatePostStatus = internalMutation({
  args: {
    postId: v.id("posts"),
    status: v.string(),
    twitterPostId: v.optional(v.string()),
    linkedInPostId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    retryCount: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<void> => {
    // Build update object with only provided fields
    const updates: {
      status: string;
      twitterPostId?: string;
      linkedInPostId?: string;
      errorMessage?: string;
      retryCount?: number;
    } = {
      status: args.status,
    };

    if (args.twitterPostId !== undefined) {
      updates.twitterPostId = args.twitterPostId;
    }

    if (args.linkedInPostId !== undefined) {
      updates.linkedInPostId = args.linkedInPostId;
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

/**
 * PUBLIC QUERY: Get posts for the authenticated user with optional filters
 *
 * This query retrieves posts for display in the Post History UI.
 * Supports filtering by date range and platform.
 *
 * @param startDate - Optional start date filter (UTC timestamp)
 * @param endDate - Optional end date filter (UTC timestamp)
 * @param platform - Optional platform filter ("twitter" | "linkedin"), defaults to "twitter"
 * @returns Array of posts sorted by scheduled time descending (newest first)
 */
export const getPosts = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    platform: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkUserId = identity.subject;

    // Query with index for efficient lookup by user
    let postsQuery = ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId));

    // Apply filters
    if (args.startDate || args.endDate || args.platform) {
      postsQuery = postsQuery.filter((q) => {
        const conditions = [];

        // Date range filter on twitterScheduledTime
        if (args.startDate !== undefined) {
          conditions.push(
            q.gte(q.field("twitterScheduledTime"), args.startDate)
          );
        }
        if (args.endDate !== undefined) {
          conditions.push(
            q.lte(q.field("twitterScheduledTime"), args.endDate)
          );
        }

        // Platform filter (X/Twitter only for now)
        // For Twitter, ensure twitterScheduledTime is defined
        if (args.platform === "twitter") {
          conditions.push(q.neq(q.field("twitterScheduledTime"), undefined));
        }

        // Return AND of all conditions if any exist
        return conditions.length > 0 ? q.and(...conditions) : q.and();
      });
    }

    // Collect all posts
    const posts = await postsQuery.collect();

    // Sort by scheduled time descending (newest first)
    // Convex doesn't support indexed sorting on non-primary fields, so we sort in-memory
    return posts.sort((a, b) => {
      const timeA = a.twitterScheduledTime || 0;
      const timeB = b.twitterScheduledTime || 0;
      return timeB - timeA;
    });
  },
});
