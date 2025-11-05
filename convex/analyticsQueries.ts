import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal query to retrieve a post for metrics fetching.
 * Ensures the post belongs to the authenticated user.
 */
export const getPostForMetrics = internalMutation({
  args: {
    postId: v.id("posts"),
    clerkUserId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("posts"),
      twitterPostId: v.optional(v.string()),
      linkedInPostId: v.optional(v.string()),
      status: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);

    if (!post || post.clerkUserId !== args.clerkUserId) {
      return null;
    }

    return {
      _id: post._id,
      twitterPostId: post.twitterPostId,
      linkedInPostId: post.linkedInPostId,
      status: post.status,
    };
  },
});

/**
 * Internal mutation to query and aggregate performance data
 * (Separated from action since database queries must be in queries/mutations)
 */
export const getPerformanceInsightsInternal = internalMutation({
  args: {
    clerkUserId: v.string(),
    platform: v.string(),
    dateRangeFilter: v.string(),
  },
  returns: v.object({
    hourlyData: v.array(
      v.object({
        hour: v.number(),
        avgLikes: v.number(),
        avgShares: v.number(),
        avgComments: v.number(),
        avgImpressions: v.optional(v.number()),
        postCount: v.number(),
        totalEngagement: v.number(),
      })
    ),
    hasData: v.boolean(),
    featureEnabled: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Feature enabled check
    const featureEnabled = process.env.PERFORMANCE_TRACKING_ENABLED === "true";
    if (!featureEnabled) {
      return {
        hourlyData: [],
        hasData: false,
        featureEnabled: false,
      };
    }

    // Calculate cutoff timestamp based on date range filter
    const now = Date.now();
    let cutoffTimestamp = 0;
    if (args.dateRangeFilter === "7days") {
      cutoffTimestamp = now - 7 * 24 * 60 * 60 * 1000;
    } else if (args.dateRangeFilter === "30days") {
      cutoffTimestamp = now - 30 * 24 * 60 * 60 * 1000;
    }

    // Get user's posts first
    const userPosts = await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .collect();

    // Query performance records only for user's posts using by_post index
    const userPerformanceRecords: Array<{
      postId: any;
      platform: string;
      publishedTime: number;
      engagementMetrics: {
        likes: number;
        shares: number;
        comments: number;
        impressions?: number;
      };
      fetchedAt: number;
      _id: any;
      _creationTime: number;
    }> = [];

    for (const post of userPosts) {
      const performanceRecords = await ctx.db
        .query("post_performance")
        .withIndex("by_post", (q) => q.eq("postId", post._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("platform"), args.platform),
            q.gte(q.field("publishedTime"), cutoffTimestamp)
          )
        )
        .collect();

      userPerformanceRecords.push(...performanceRecords);
    }

    // Sort by publishedTime
    userPerformanceRecords.sort((a, b) => a.publishedTime - b.publishedTime);

    // Group by hour of day (0-23)
    const hourlyMap: Map<
      number,
      {
        likes: number[];
        shares: number[];
        comments: number[];
        impressions: number[];
      }
    > = new Map();

    for (const record of userPerformanceRecords) {
      const date = new Date(record.publishedTime);
      const hour = date.getUTCHours(); // Use UTC hour for consistency

      if (!hourlyMap.has(hour)) {
        hourlyMap.set(hour, {
          likes: [],
          shares: [],
          comments: [],
          impressions: [],
        });
      }

      const hourData = hourlyMap.get(hour)!;
      hourData.likes.push(record.engagementMetrics.likes);
      hourData.shares.push(record.engagementMetrics.shares);
      hourData.comments.push(record.engagementMetrics.comments);
      if (record.engagementMetrics.impressions !== undefined) {
        hourData.impressions.push(record.engagementMetrics.impressions);
      }
    }

    // Calculate averages and format for UI
    const hourlyData = Array.from(hourlyMap.entries()).map(([hour, data]) => {
      const avgLikes =
        data.likes.reduce((sum, val) => sum + val, 0) / data.likes.length;
      const avgShares =
        data.shares.reduce((sum, val) => sum + val, 0) / data.shares.length;
      const avgComments =
        data.comments.reduce((sum, val) => sum + val, 0) / data.comments.length;
      const avgImpressions =
        data.impressions.length > 0
          ? data.impressions.reduce((sum, val) => sum + val, 0) /
            data.impressions.length
          : undefined;

      return {
        hour,
        avgLikes: Math.round(avgLikes * 10) / 10,
        avgShares: Math.round(avgShares * 10) / 10,
        avgComments: Math.round(avgComments * 10) / 10,
        avgImpressions: avgImpressions
          ? Math.round(avgImpressions * 10) / 10
          : undefined,
        postCount: data.likes.length,
        totalEngagement: Math.round((avgLikes + avgShares + avgComments) * 10) / 10,
      };
    });

    // Sort by hour for display
    hourlyData.sort((a, b) => a.hour - b.hour);

    return {
      hourlyData,
      hasData: userPerformanceRecords.length > 0,
      featureEnabled: true,
    };
  },
});

/**
 * Stores performance data for a published post.
 *
 * This mutation saves engagement metrics (likes, shares, comments, impressions)
 * fetched from Twitter or LinkedIn APIs into the post_performance table.
 *
 * If metrics for this post already exist (re-fetch scenario), the existing record
 * will be updated with the new metrics and a fresh fetchedAt timestamp.
 *
 * @param postId - The ID of the post these metrics belong to
 * @param platform - The platform ("twitter" | "linkedin")
 * @param engagementMetrics - The metrics object containing likes, shares, comments, impressions
 */
export const storePerformanceData = internalMutation({
  args: {
    postId: v.id("posts"),
    platform: v.string(),
    engagementMetrics: v.object({
      likes: v.number(),
      shares: v.number(),
      comments: v.number(),
      impressions: v.optional(v.number()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the post to retrieve the published time
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error(`Post ${args.postId} not found`);
    }

    // Determine the published time based on platform
    const publishedTime =
      args.platform === "twitter"
        ? post.twitterScheduledTime
        : post.linkedInScheduledTime;

    if (!publishedTime) {
      throw new Error(
        `Post ${args.postId} does not have a published time for ${args.platform}`
      );
    }

    // Check if performance data already exists for this post/platform combo
    const existingRecords = await ctx.db
      .query("post_performance")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .filter((q) => q.eq(q.field("platform"), args.platform))
      .collect();

    const now = Date.now();

    if (existingRecords.length > 0) {
      // Update existing record
      const existingRecord = existingRecords[0];
      await ctx.db.patch(existingRecord._id, {
        engagementMetrics: args.engagementMetrics,
        fetchedAt: now,
      });
    } else {
      // Create new record
      await ctx.db.insert("post_performance", {
        postId: args.postId,
        platform: args.platform,
        publishedTime,
        engagementMetrics: args.engagementMetrics,
        fetchedAt: now,
      });
    }

    return null;
  },
});

/**
 * Internal mutation to get posts published after a specific timestamp
 * Used by the scheduled metrics fetching job
 */
export const getRecentPublishedPosts = internalMutation({
  args: {
    afterTimestamp: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("posts"),
      twitterPostId: v.optional(v.string()),
      linkedInPostId: v.optional(v.string()),
      twitterScheduledTime: v.optional(v.number()),
      linkedInScheduledTime: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    // Query all posts with status "published"
    const allPosts = await ctx.db
      .query("posts")
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    // Filter posts that were published after the given timestamp
    // (either on Twitter or LinkedIn)
    const recentPosts = allPosts
      .filter((post) => {
        const twitterPublished =
          post.twitterPostId &&
          post.twitterScheduledTime &&
          post.twitterScheduledTime > args.afterTimestamp;
        const linkedInPublished =
          post.linkedInPostId &&
          post.linkedInScheduledTime &&
          post.linkedInScheduledTime > args.afterTimestamp;
        return twitterPublished || linkedInPublished;
      })
      .map((post) => ({
        _id: post._id,
        twitterPostId: post.twitterPostId,
        linkedInPostId: post.linkedInPostId,
        twitterScheduledTime: post.twitterScheduledTime,
        linkedInScheduledTime: post.linkedInScheduledTime,
      }));

    return recentPosts;
  },
});
