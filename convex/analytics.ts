"use node";

import { action, internalAction } from "./_generated/server";
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
    const post = await ctx.runMutation(internal.analyticsQueries.getPostForMetrics, {
      postId: args.postId,
      userId: identity.subject,
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
 * Internal action to fetch engagement metrics from Twitter or LinkedIn API.
 * This is used by scheduled jobs and does not require user authentication.
 *
 * NOTE: This is a stub implementation. This action will remain inactive until
 * API access to Twitter/LinkedIn engagement metrics is properly configured.
 *
 * @param postId - The Convex ID of the post to fetch metrics for
 * @param platform - Either "twitter" or "linkedin"
 * @returns Engagement metrics object with likes, shares, comments, and optionally impressions
 */
export const fetchEngagementMetricsInternal = internalAction({
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
    // No authentication check - this is an internal action for scheduled jobs

    // Get the post directly from the database without user scoping
    const post = await ctx.runQuery(internal.posts.getPostById, {
      postId: args.postId,
    });

    if (!post) {
      throw new Error("Post not found");
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
    const recentPublishedPosts = await ctx.runMutation(
      internal.analyticsQueries.getRecentPublishedPosts,
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
              internal.analytics.fetchEngagementMetricsInternal,
              {
                postId: post._id,
                platform: "twitter",
              }
            );

            // Store the metrics
            await ctx.runMutation(internal.analyticsQueries.storePerformanceData, {
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
              internal.analytics.fetchEngagementMetricsInternal,
              {
                postId: post._id,
                platform: "linkedin",
              }
            );

            // Store the metrics
            await ctx.runMutation(internal.analyticsQueries.storePerformanceData, {
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
type PerformanceInsightsReturn = {
  hourlyData: Array<{
    hour: number;
    avgLikes: number;
    avgShares: number;
    avgComments: number;
    avgImpressions?: number;
    postCount: number;
    totalEngagement: number;
  }>;
  hasData: boolean;
  featureEnabled: boolean;
};

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
  handler: async (ctx, args): Promise<PerformanceInsightsReturn> => {
    // Authentication check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

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
    const insightsData: PerformanceInsightsReturn = await ctx.runMutation(internal.analyticsQueries.getPerformanceInsightsInternal, {
      userId,
      platform: args.platform,
      dateRangeFilter: args.dateRangeFilter,
    });

    return insightsData;
  },
});
