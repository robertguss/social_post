"use node";

import { action, internalAction, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Fetches engagement metrics from Twitter or LinkedIn API for a published post.
 *
 * NOTE: This is a stub implementation. This action will remain inactive until
 * API access to Twitter/LinkedIn engagement metrics is properly configured.
 *
 * Required Environment Variables (not yet configured):
 * - TWITTER_API_KEY: Twitter API bearer token with access to tweet metrics
 * - LINKEDIN_API_KEY: LinkedIn API access token with analytics permissions
 *
 * Twitter API Endpoint: GET /2/tweets/:id?tweet.fields=public_metrics
 * LinkedIn API Endpoint: GET /v2/socialActions/{shareUrn}/statistics
 *
 * @param postId - The Convex ID of the post to fetch metrics for
 * @param platform - Either "twitter" or "linkedin"
 * @returns Engagement metrics object with likes, shares, comments, and optionally impressions
 */
export const fetchEngagementMetrics = action({
  args: {
    postId: v.id("posts"),
    platform: v.string(),
  },
  returns: v.object({
    likes: v.number(),
    shares: v.number(),
    comments: v.number(),
    impressions: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    // Authentication check - ensure user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify the post exists and belongs to the authenticated user
    const post = await ctx.runQuery(internal.analytics.getPostForMetrics, {
      postId: args.postId,
      clerkUserId: identity.subject,
    });

    if (!post) {
      throw new Error("Post not found or access denied");
    }

    // Check if performance tracking is enabled
    const isEnabled = process.env.PERFORMANCE_TRACKING_ENABLED === "true";
    if (!isEnabled) {
      throw new Error(
        "Performance tracking is not yet enabled. Configure Twitter/LinkedIn API access first. " +
        "See docs/features/performance-tracking.md for setup instructions."
      );
    }

    // TODO: Implement actual API calls when API access is available
    // The implementation would:
    // 1. Retrieve the platform-specific post ID (post.twitterPostId or post.linkedInPostId)
    // 2. Call the appropriate API endpoint with authentication
    // 3. Parse the response and extract engagement metrics
    // 4. Return the metrics in the standard format

    // Placeholder implementation - throws error until API access is configured
    throw new Error(
      `Engagement metrics fetching not yet implemented for ${args.platform}. ` +
      "API access and credentials are required."
    );

    // Example future implementation for Twitter:
    // const twitterApiKey = process.env.TWITTER_API_KEY;
    // const response = await fetch(
    //   `https://api.twitter.com/2/tweets/${post.twitterPostId}?tweet.fields=public_metrics`,
    //   {
    //     headers: {
    //       Authorization: `Bearer ${twitterApiKey}`,
    //     },
    //   }
    // );
    // const data = await response.json();
    // return {
    //   likes: data.data.public_metrics.like_count,
    //   shares: data.data.public_metrics.retweet_count,
    //   comments: data.data.public_metrics.reply_count,
    //   impressions: data.data.public_metrics.impression_count,
    // };

    // Example future implementation for LinkedIn:
    // const linkedInApiKey = process.env.LINKEDIN_API_KEY;
    // const response = await fetch(
    //   `https://api.linkedin.com/v2/socialActions/${post.linkedInPostId}/statistics`,
    //   {
    //     headers: {
    //       Authorization: `Bearer ${linkedInApiKey}`,
    //     },
    //   }
    // );
    // const data = await response.json();
    // return {
    //   likes: data.totalShareStatistics.likeCount,
    //   shares: data.totalShareStatistics.shareCount,
    //   comments: data.totalShareStatistics.commentCount,
    //   impressions: data.totalShareStatistics.impressionCount,
    // };
  },
});

/**
 * Internal query to retrieve a post for metrics fetching.
 * Ensures the post belongs to the authenticated user.
 */
export const getPostForMetrics = mutation({
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
 * Stores performance data for a published post.
 *
 * This mutation saves engagement metrics (likes, shares, comments, impressions)
 * fetched from Twitter or LinkedIn APIs into the post_performance table.
 *
 * If metrics for this post already exist (re-fetch scenario), the existing record
 * will be updated with the new metrics and a fresh fetchedAt timestamp.
 *
 * @param postId - The Convex ID of the post these metrics belong to
 * @param platform - Either "twitter" or "linkedin"
 * @param engagementMetrics - Object containing likes, shares, comments, and optionally impressions
 * @returns The ID of the created or updated performance record
 */
export const storePerformanceData = mutation({
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
  returns: v.id("post_performance"),
  handler: async (ctx, args) => {
    // Authentication check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify the post exists and belongs to the authenticated user
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    if (post.clerkUserId !== identity.subject) {
      throw new Error("Access denied: You can only store metrics for your own posts");
    }

    // Validate platform
    if (args.platform !== "twitter" && args.platform !== "linkedin") {
      throw new Error(`Invalid platform: ${args.platform}. Must be "twitter" or "linkedin"`);
    }

    // Validate post is published (not a draft or failed post)
    if (post.status !== "published") {
      throw new Error(
        `Cannot store metrics for post with status "${post.status}". Post must be published.`
      );
    }

    // Get the published time based on platform
    const publishedTime =
      args.platform === "twitter"
        ? post.twitterScheduledTime
        : post.linkedInScheduledTime;

    if (!publishedTime) {
      throw new Error(`No published time found for ${args.platform} post`);
    }

    // Check if performance data already exists for this post/platform combination
    const existingPerformance = await ctx.db
      .query("post_performance")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .filter((q) => q.eq(q.field("platform"), args.platform))
      .first();

    const currentTimestamp = Date.now();

    // If exists, update the existing record with new metrics
    if (existingPerformance) {
      await ctx.db.patch(existingPerformance._id, {
        engagementMetrics: args.engagementMetrics,
        fetchedAt: currentTimestamp,
      });
      return existingPerformance._id;
    }

    // Otherwise, insert a new performance record
    const performanceId = await ctx.db.insert("post_performance", {
      postId: args.postId,
      platform: args.platform,
      publishedTime: publishedTime,
      engagementMetrics: args.engagementMetrics,
      fetchedAt: currentTimestamp,
    });

    return performanceId;
  },
});

/**
 * Scheduled function to periodically fetch engagement metrics for published posts.
 *
 * This internal action runs on a schedule (intended: daily or every 6 hours) and:
 * 1. Queries all published posts from the past 7 days
 * 2. For each post, calls fetchEngagementMetrics to retrieve current metrics
 * 3. Stores the metrics via storePerformanceData mutation
 *
 * Rate Limiting Strategy:
 * - Twitter API: 900 requests per 15 minutes (free tier)
 * - LinkedIn API: ~100 requests per day (basic tier)
 * - Add delays between requests to respect rate limits
 *
 * NOTE: This function is marked as inactive (commented out in cron.ts) until
 * API access is configured. The environment variable PERFORMANCE_TRACKING_ENABLED
 * must be set to "true" to activate this feature.
 *
 * @see docs/features/performance-tracking.md for setup instructions
 */
export const scheduledMetricsFetch = internalAction({
  args: {},
  handler: async (ctx) => {
    // Check if performance tracking is enabled
    const isEnabled = process.env.PERFORMANCE_TRACKING_ENABLED === "true";
    if (!isEnabled) {
      console.log(
        "Performance tracking is disabled. Skipping scheduled metrics fetch. " +
        "Set PERFORMANCE_TRACKING_ENABLED=true to enable."
      );
      return;
    }

    // Calculate timestamp for 7 days ago
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Query all published posts from the past 7 days
    // Note: We'll need to create an internal query for this
    const recentPublishedPosts = await ctx.runQuery(
      internal.analytics.getRecentPublishedPosts,
      { afterTimestamp: sevenDaysAgo }
    );

    console.log(`Found ${recentPublishedPosts.length} posts to fetch metrics for`);

    let successCount = 0;
    let failureCount = 0;

    // Process each post
    for (const post of recentPublishedPosts) {
      try {
        // Fetch metrics for Twitter if the post was published on Twitter
        if (post.twitterPostId && post.twitterScheduledTime) {
          try {
            const twitterMetrics = await ctx.runAction(
              internal.analytics.fetchEngagementMetrics,
              {
                postId: post._id,
                platform: "twitter",
              }
            );

            // Store the metrics
            await ctx.runMutation(internal.analytics.storePerformanceData, {
              postId: post._id,
              platform: "twitter",
              engagementMetrics: twitterMetrics,
            });

            successCount++;

            // Rate limiting: Wait 100ms between Twitter API calls
            // This ensures we stay well under the 900 requests/15min limit
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`Failed to fetch Twitter metrics for post ${post._id}:`, error);
            failureCount++;
          }
        }

        // Fetch metrics for LinkedIn if the post was published on LinkedIn
        if (post.linkedInPostId && post.linkedInScheduledTime) {
          try {
            const linkedInMetrics = await ctx.runAction(
              internal.analytics.fetchEngagementMetrics,
              {
                postId: post._id,
                platform: "linkedin",
              }
            );

            // Store the metrics
            await ctx.runMutation(internal.analytics.storePerformanceData, {
              postId: post._id,
              platform: "linkedin",
              engagementMetrics: linkedInMetrics,
            });

            successCount++;

            // Rate limiting: Wait 1 second between LinkedIn API calls
            // LinkedIn has stricter rate limits (~100 requests/day)
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Failed to fetch LinkedIn metrics for post ${post._id}:`, error);
            failureCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing post ${post._id}:`, error);
        failureCount++;
      }
    }

    console.log(
      `Scheduled metrics fetch completed. Success: ${successCount}, Failures: ${failureCount}`
    );
  },
});

/**
 * Internal query to retrieve recently published posts for metrics fetching.
 *
 * Returns posts that:
 * - Have status "published"
 * - Were published after the specified timestamp
 * - Have platform-specific post IDs (indicating successful publishing)
 */
export const getRecentPublishedPosts = mutation({
  args: {
    afterTimestamp: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("posts"),
      clerkUserId: v.string(),
      twitterPostId: v.optional(v.string()),
      linkedInPostId: v.optional(v.string()),
      twitterScheduledTime: v.optional(v.number()),
      linkedInScheduledTime: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    // Query all posts with status "published"
    const publishedPosts = await ctx.db
      .query("posts")
      .withIndex("by_user_status")
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    // Filter to posts published after the specified timestamp
    const recentPosts = publishedPosts.filter((post) => {
      const twitterTime = post.twitterScheduledTime || 0;
      const linkedInTime = post.linkedInScheduledTime || 0;
      const mostRecentTime = Math.max(twitterTime, linkedInTime);

      return mostRecentTime >= args.afterTimestamp;
    });

    // Map to return only necessary fields
    return recentPosts.map((post) => ({
      _id: post._id,
      clerkUserId: post.clerkUserId,
      twitterPostId: post.twitterPostId,
      linkedInPostId: post.linkedInPostId,
      twitterScheduledTime: post.twitterScheduledTime,
      linkedInScheduledTime: post.linkedInScheduledTime,
    }));
  },
});

/**
 * Action to get aggregated performance insights for the Performance Insights UI
 *
 * Retrieves and aggregates engagement data by hour of day for a specific platform,
 * allowing users to visualize their best-performing posting times.
 *
 * Note: This is an action (not a query/mutation) because it's in a Node.js runtime file.
 *
 * @param platform - Either "twitter" or "linkedin"
 * @param dateRangeFilter - Filter by date range: "7days" | "30days" | "alltime"
 * @returns Aggregated performance data by hour with average engagement metrics
 */
export const getPerformanceInsights = action({
  args: {
    platform: v.string(),
    dateRangeFilter: v.string(), // "7days" | "30days" | "alltime"
  },
  returns: v.object({
    hourlyData: v.array(
      v.object({
        hour: v.number(), // 0-23
        avgLikes: v.number(),
        avgShares: v.number(),
        avgComments: v.number(),
        avgImpressions: v.optional(v.number()),
        postCount: v.number(), // Number of posts at this hour
        totalEngagement: v.number(), // Combined engagement score
      })
    ),
    hasData: v.boolean(),
    featureEnabled: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Authentication check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const clerkUserId = identity.subject;

    // Check if feature is enabled
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
    // "alltime" uses cutoff of 0 (no filter)

    // Query all performance records for this platform via internal mutation
    const insightsData = await ctx.runMutation(internal.analytics.getPerformanceInsightsInternal, {
      clerkUserId,
      platform: args.platform,
      dateRangeFilter: args.dateRangeFilter,
    });

    return insightsData;
  },
});

/**
 * Internal mutation to query and aggregate performance data
 * (Separated from action since database queries must be in queries/mutations)
 */
export const getPerformanceInsightsInternal = mutation({
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

    // Query all performance records for this platform
    const allPerformanceRecords = await ctx.db
      .query("post_performance")
      .withIndex("by_platform_time", (q) => q.eq("platform", args.platform))
      .collect();

    // Filter to user's posts only
    const userPosts = await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .collect();

    const userPostIds = new Set(userPosts.map((post) => post._id));

    const userPerformanceRecords = allPerformanceRecords
      .filter(
        (record) =>
          userPostIds.has(record.postId) && record.publishedTime >= cutoffTimestamp
      )
      .map((record) => ({
        publishedTime: record.publishedTime,
        engagementMetrics: record.engagementMetrics,
      }));

    // Return early if no data
    if (userPerformanceRecords.length === 0) {
      return {
        hourlyData: [],
        hasData: false,
        featureEnabled: true,
      };
    }

    // Aggregate data by hour of day
    const hourlyMap = new Map<
      number,
      {
        likes: number[];
        shares: number[];
        comments: number[];
        impressions: number[];
        postCount: number;
      }
    >();

    // Initialize map with all hours (0-23)
    for (let hour = 0; hour < 24; hour++) {
      hourlyMap.set(hour, {
        likes: [],
        shares: [],
        comments: [],
        impressions: [],
        postCount: 0,
      });
    }

    // Populate map with actual data
    userPerformanceRecords.forEach((record) => {
      const hour = new Date(record.publishedTime).getUTCHours();
      const hourData = hourlyMap.get(hour)!;

      hourData.likes.push(record.engagementMetrics.likes);
      hourData.shares.push(record.engagementMetrics.shares);
      hourData.comments.push(record.engagementMetrics.comments);
      if (record.engagementMetrics.impressions !== undefined) {
        hourData.impressions.push(record.engagementMetrics.impressions);
      }
      hourData.postCount++;
    });

    // Calculate averages for each hour
    const hourlyData = Array.from(hourlyMap.entries()).map(([hour, data]) => {
      const avgLikes =
        data.likes.length > 0
          ? data.likes.reduce((sum, val) => sum + val, 0) / data.likes.length
          : 0;

      const avgShares =
        data.shares.length > 0
          ? data.shares.reduce((sum, val) => sum + val, 0) / data.shares.length
          : 0;

      const avgComments =
        data.comments.length > 0
          ? data.comments.reduce((sum, val) => sum + val, 0) / data.comments.length
          : 0;

      const avgImpressions =
        data.impressions.length > 0
          ? data.impressions.reduce((sum, val) => sum + val, 0) / data.impressions.length
          : undefined;

      // Calculate total engagement score (weighted)
      const totalEngagement = avgLikes * 1 + avgComments * 3 + avgShares * 5;

      return {
        hour,
        avgLikes: Math.round(avgLikes * 10) / 10, // Round to 1 decimal
        avgShares: Math.round(avgShares * 10) / 10,
        avgComments: Math.round(avgComments * 10) / 10,
        avgImpressions: avgImpressions
          ? Math.round(avgImpressions * 10) / 10
          : undefined,
        postCount: data.postCount,
        totalEngagement: Math.round(totalEngagement * 10) / 10,
      };
    });

    return {
      hourlyData,
      hasData: true,
      featureEnabled: true,
    };
  },
});

export default getPerformanceInsights;
