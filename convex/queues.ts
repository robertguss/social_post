import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { cronJobs } from "convex/server";

/**
 * Create a new recurring queue for a post
 *
 * @param originalPostId - ID of the post to clone and repost
 * @param interval - Number of days between executions (must be >= 1)
 * @param nextScheduledTime - Unix timestamp (ms) of first execution
 * @param maxExecutions - Optional limit on total executions
 * @returns New queue ID
 */
export const createQueue = mutation({
  args: {
    originalPostId: v.id("posts"),
    interval: v.number(),
    nextScheduledTime: v.number(),
    maxExecutions: v.optional(v.number()),
  },
  returns: v.id("recurring_queues"),
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const clerkUserId = identity.subject;

    // Validate interval > 0 (must be at least 1 day)
    if (args.interval < 1) {
      throw new Error("Interval must be at least 1 day");
    }

    // Validate nextScheduledTime is in the future
    if (args.nextScheduledTime <= Date.now()) {
      throw new Error("nextScheduledTime must be in the future");
    }

    // Verify originalPostId exists and belongs to authenticated user
    const originalPost = await ctx.db.get(args.originalPostId);
    if (!originalPost) {
      throw new Error("Original post not found");
    }
    if (originalPost.clerkUserId !== clerkUserId) {
      throw new Error("Unauthorized: You do not own this post");
    }

    // Create queue record with status "active" and executionCount 0
    const queueId = await ctx.db.insert("recurring_queues", {
      clerkUserId,
      originalPostId: args.originalPostId,
      status: "active",
      interval: args.interval,
      nextScheduledTime: args.nextScheduledTime,
      lastExecutedTime: undefined,
      executionCount: 0,
      maxExecutions: args.maxExecutions,
    });

    return queueId;
  },
});

/**
 * Update an existing recurring queue's settings
 *
 * @param queueId - ID of the queue to update
 * @param interval - Optional new interval in days
 * @param nextScheduledTime - Optional new next scheduled time
 * @param maxExecutions - Optional new max executions limit
 * @returns Updated queue
 */
export const updateQueue = mutation({
  args: {
    queueId: v.id("recurring_queues"),
    interval: v.optional(v.number()),
    nextScheduledTime: v.optional(v.number()),
    maxExecutions: v.optional(v.number()),
  },
  returns: v.object({
    _id: v.id("recurring_queues"),
    _creationTime: v.number(),
    clerkUserId: v.string(),
    originalPostId: v.id("posts"),
    status: v.string(),
    interval: v.number(),
    nextScheduledTime: v.number(),
    lastExecutedTime: v.optional(v.number()),
    executionCount: v.number(),
    maxExecutions: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const clerkUserId = identity.subject;

    // Verify queue exists and user owns it
    const queue = await ctx.db.get(args.queueId);
    if (!queue) {
      throw new Error("Queue not found");
    }
    if (queue.clerkUserId !== clerkUserId) {
      throw new Error("Unauthorized: You do not own this queue");
    }

    // Validate interval if provided
    if (args.interval !== undefined && args.interval < 1) {
      throw new Error("Interval must be at least 1 day");
    }

    // Build update object
    const updates: Partial<typeof queue> = {};
    if (args.interval !== undefined) updates.interval = args.interval;
    if (args.nextScheduledTime !== undefined) updates.nextScheduledTime = args.nextScheduledTime;
    if (args.maxExecutions !== undefined) updates.maxExecutions = args.maxExecutions;

    // Update queue record
    await ctx.db.patch(args.queueId, updates);

    // Return updated queue
    const updatedQueue = await ctx.db.get(args.queueId);
    if (!updatedQueue) {
      throw new Error("Failed to retrieve updated queue");
    }
    return updatedQueue;
  },
});

/**
 * Delete a recurring queue
 *
 * @param queueId - ID of the queue to delete
 */
export const deleteQueue = mutation({
  args: {
    queueId: v.id("recurring_queues"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const clerkUserId = identity.subject;

    // Verify queue exists and user owns it
    const queue = await ctx.db.get(args.queueId);
    if (!queue) {
      throw new Error("Queue not found");
    }
    if (queue.clerkUserId !== clerkUserId) {
      throw new Error("Unauthorized: You do not own this queue");
    }

    // Delete queue record
    await ctx.db.delete(args.queueId);
  },
});

/**
 * Pause a recurring queue (stops auto-execution)
 *
 * @param queueId - ID of the queue to pause
 */
export const pauseQueue = mutation({
  args: {
    queueId: v.id("recurring_queues"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const clerkUserId = identity.subject;

    // Verify queue exists and user owns it
    const queue = await ctx.db.get(args.queueId);
    if (!queue) {
      throw new Error("Queue not found");
    }
    if (queue.clerkUserId !== clerkUserId) {
      throw new Error("Unauthorized: You do not own this queue");
    }

    // Set status to "paused"
    await ctx.db.patch(args.queueId, { status: "paused" });
  },
});

/**
 * Resume a paused recurring queue
 * Recalculates nextScheduledTime based on current time + interval
 *
 * @param queueId - ID of the queue to resume
 */
export const resumeQueue = mutation({
  args: {
    queueId: v.id("recurring_queues"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const clerkUserId = identity.subject;

    // Verify queue exists and user owns it
    const queue = await ctx.db.get(args.queueId);
    if (!queue) {
      throw new Error("Queue not found");
    }
    if (queue.clerkUserId !== clerkUserId) {
      throw new Error("Unauthorized: You do not own this queue");
    }

    // Recalculate nextScheduledTime based on current time + interval
    const nextScheduledTime = Date.now() + queue.interval * 86400000; // Convert days to ms

    // Set status to "active" and update nextScheduledTime
    await ctx.db.patch(args.queueId, {
      status: "active",
      nextScheduledTime,
    });
  },
});

/**
 * Get all recurring queues for the authenticated user
 * Optionally filter by status
 *
 * @param status - Optional status filter ("active" | "paused" | "completed")
 * @returns Array of queues with original post data, sorted by nextScheduledTime
 */
export const getQueues = query({
  args: {
    status: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("recurring_queues"),
      _creationTime: v.number(),
      clerkUserId: v.string(),
      originalPostId: v.id("posts"),
      status: v.string(),
      interval: v.number(),
      nextScheduledTime: v.number(),
      lastExecutedTime: v.optional(v.number()),
      executionCount: v.number(),
      maxExecutions: v.optional(v.number()),
      originalPost: v.object({
        _id: v.id("posts"),
        twitterContent: v.optional(v.string()),
        linkedInContent: v.optional(v.string()),
        status: v.string(),
      }),
    })
  ),
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const clerkUserId = identity.subject;

    // Query recurring_queues with by_user_status index
    let queues;
    if (args.status !== undefined) {
      // If status filter provided, use it in the index query
      const status = args.status; // TypeScript narrowing
      queues = await ctx.db
        .query("recurring_queues")
        .withIndex("by_user_status", (q) =>
          q.eq("clerkUserId", clerkUserId).eq("status", status)
        )
        .collect();
    } else {
      // No status filter, get all queues for user
      queues = await ctx.db
        .query("recurring_queues")
        .withIndex("by_user_status", (q) => q.eq("clerkUserId", clerkUserId))
        .collect();
    }

    // Include original post data in response
    const queuesWithPosts = await Promise.all(
      queues.map(async (queue) => {
        const originalPost = await ctx.db.get(queue.originalPostId);
        if (!originalPost) {
          throw new Error(`Original post ${queue.originalPostId} not found for queue ${queue._id}`);
        }
        return {
          ...queue,
          originalPost: {
            _id: originalPost._id,
            twitterContent: originalPost.twitterContent,
            linkedInContent: originalPost.linkedInContent,
            status: originalPost.status,
          },
        };
      })
    );

    // Sort by nextScheduledTime (ascending)
    queuesWithPosts.sort((a, b) => a.nextScheduledTime - b.nextScheduledTime);

    return queuesWithPosts;
  },
});

/**
 * HELPER FUNCTION: Clone and schedule a post from a queue
 *
 * This function creates a new post with cloned content and schedules it for publishing.
 * Used by processQueues to automatically create recurring posts.
 *
 * @param ctx - Convex context
 * @param originalPostId - ID of the post to clone
 * @param queueId - ID of the queue creating this post
 * @param nextScheduledTime - Base timestamp for scheduling (queue's nextScheduledTime)
 * @returns New post ID
 */
async function cloneAndSchedulePost(
  ctx: any,
  originalPostId: Id<"posts">,
  queueId: Id<"recurring_queues">,
  nextScheduledTime: number
): Promise<Id<"posts">> {
  // Fetch original post
  const originalPost = await ctx.db.get(originalPostId);
  if (!originalPost) {
    throw new Error(`Original post ${originalPostId} not found`);
  }

  // Determine which platforms are enabled based on original post
  const hasTwitter = originalPost.twitterContent && originalPost.twitterScheduledTime !== undefined;
  const hasLinkedIn = originalPost.linkedInContent && originalPost.linkedInScheduledTime !== undefined;

  if (!hasTwitter && !hasLinkedIn) {
    throw new Error("Original post has no platform content to clone");
  }

  // Calculate adjusted scheduled times
  // Use the queue's nextScheduledTime as the base, and preserve the original time-of-day
  const twitterScheduledTime = hasTwitter ? nextScheduledTime : undefined;
  const linkedInScheduledTime = hasLinkedIn ? nextScheduledTime : undefined;

  // Create new post record with cloned content
  const newPostId = await ctx.db.insert("posts", {
    clerkUserId: originalPost.clerkUserId,
    status: "Scheduled", // Set to Scheduled (not draft) since we're auto-scheduling
    twitterContent: originalPost.twitterContent || "",
    linkedInContent: originalPost.linkedInContent || "",
    url: originalPost.url || "",
    twitterScheduledTime,
    linkedInScheduledTime,
    // Clear publishing fields
    twitterPostId: undefined,
    linkedInPostId: undefined,
    twitterSchedulerId: undefined,
    linkedInSchedulerId: undefined,
    errorMessage: undefined,
    retryCount: 0,
    // Link back to the queue that created this post
    createdByQueueId: queueId,
    // Reference original post
    clonedFromPostId: originalPost._id,
  });

  // Schedule publishing actions using ctx.scheduler.runAt()
  const schedulerIds: {
    twitterSchedulerId?: Id<"_scheduled_functions">;
    linkedInSchedulerId?: Id<"_scheduled_functions">;
  } = {};

  if (hasTwitter && twitterScheduledTime) {
    const twitterSchedulerId = await ctx.scheduler.runAt(
      twitterScheduledTime,
      internal.publishing.publishTwitterPost,
      { postId: newPostId }
    );
    schedulerIds.twitterSchedulerId = twitterSchedulerId;
  }

  if (hasLinkedIn && linkedInScheduledTime) {
    const linkedInSchedulerId = await ctx.scheduler.runAt(
      linkedInScheduledTime,
      internal.publishing.publishLinkedInPost,
      { postId: newPostId }
    );
    schedulerIds.linkedInSchedulerId = linkedInSchedulerId;
  }

  // Update post with scheduler IDs
  await ctx.db.patch(newPostId, schedulerIds);

  return newPostId;
}

/**
 * INTERNAL MUTATION: Process recurring queues (scheduled function)
 *
 * This function is called by the cron job to check for due queues and execute them.
 * It clones posts, schedules them for publishing, and updates queue state.
 *
 * Runs on a schedule (daily or hourly) to process queues where nextScheduledTime <= now.
 *
 * @returns Summary of processed queues
 */
export const processQueues = internalMutation({
  args: {},
  returns: v.object({
    processed: v.number(),
    succeeded: v.number(),
    failed: v.number(),
    errors: v.array(v.object({ queueId: v.string(), error: v.string() })),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const summary = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as Array<{ queueId: string; error: string }>,
    };

    // Query all active queues where nextScheduledTime <= now
    const dueQueues = await ctx.db
      .query("recurring_queues")
      .withIndex("by_next_scheduled")
      .filter((q) => q.and(q.lte(q.field("nextScheduledTime"), now), q.eq(q.field("status"), "active")))
      .collect();

    console.log(`[processQueues] Found ${dueQueues.length} due queues to process`);

    // Process each due queue
    for (const queue of dueQueues) {
      summary.processed++;

      try {
        // Clone and schedule post
        await cloneAndSchedulePost(ctx, queue.originalPostId, queue._id, queue.nextScheduledTime);

        // Increment execution count
        const newExecutionCount = queue.executionCount + 1;

        // Calculate new nextScheduledTime = lastExecutedTime + interval
        const newNextScheduledTime = now + queue.interval * 86400000; // Convert days to ms

        // Check if maxExecutions is reached
        let newStatus = queue.status;
        if (queue.maxExecutions !== undefined && newExecutionCount >= queue.maxExecutions) {
          newStatus = "completed";
          console.log(`[processQueues] Queue ${queue._id} reached maxExecutions (${queue.maxExecutions}), marking as completed`);
        }

        // Update queue record
        await ctx.db.patch(queue._id, {
          lastExecutedTime: now,
          executionCount: newExecutionCount,
          nextScheduledTime: newNextScheduledTime,
          status: newStatus,
        });

        summary.succeeded++;
        console.log(`[processQueues] Successfully processed queue ${queue._id}`);
      } catch (error) {
        // Log error but continue processing other queues
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        summary.failed++;
        summary.errors.push({
          queueId: queue._id.toString(),
          error: errorMessage,
        });
        console.error(`[processQueues] Failed to process queue ${queue._id}:`, errorMessage);

        // Handle edge case: if original post was deleted, mark queue as completed
        if (errorMessage.includes("not found")) {
          await ctx.db.patch(queue._id, { status: "completed" });
          console.log(`[processQueues] Original post deleted, marking queue ${queue._id} as completed`);
        }
      }
    }

    console.log(`[processQueues] Summary: ${summary.succeeded}/${summary.processed} succeeded, ${summary.failed} failed`);
    return summary;
  },
});

/**
 * Cron job configuration for recurring queue processing
 *
 * This cron job runs daily at midnight UTC to process due recurring queues.
 * For more frequent processing, switch to crons.hourly().
 */
export const crons = cronJobs();

// Run processQueues daily at midnight UTC (12:00 AM)
crons.daily(
  "process-recurring-queues",
  { hourUTC: 0, minuteUTC: 0 },
  internal.queues.processQueues
);

// Alternative: Hourly processing (uncomment to use)
// crons.hourly(
//   "process-recurring-queues",
//   { minuteUTC: 0 },
//   internal.queues.processQueues
// );
