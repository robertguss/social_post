/**
 * AI Usage Tracking & Rate Limiting
 *
 * This module provides comprehensive usage tracking and rate limiting for Gemini API calls.
 * Features:
 * - Usage logging with token and cost estimation
 * - Rate limit enforcement (daily/monthly limits)
 * - User and admin usage statistics
 * - Cost tracking and reporting
 *
 * @module convex/aiUsageTracking
 */

import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Gemini API Pricing Constants (as of January 2025)
 *
 * Free Tier Limits:
 * - gemini-1.5-flash: 15 RPM, 1,500 RPD
 * - Free up to 15M input/output tokens per month
 *
 * Paid Tier Pricing:
 * - gemini-1.5-flash:
 *   - Input: $0.075 per 1M tokens
 *   - Output: $0.30 per 1M tokens
 *
 * Typical Feature Costs (Paid Tier):
 * - Tone Adjustment: ~$0.000038 per request
 * - LinkedIn Expansion: ~$0.000065 per request
 * - Hashtag Generation: ~$0.000023 per request
 */
const GEMINI_PRICING = {
  // Gemini 1.5 Flash pricing (paid tier, if free tier exceeded)
  INPUT_COST_PER_TOKEN: 0.075 / 1_000_000, // $0.075 per 1M tokens
  OUTPUT_COST_PER_TOKEN: 0.3 / 1_000_000, // $0.30 per 1M tokens
} as const;

/**
 * Application Rate Limits
 *
 * Conservative limits to ensure we stay within Gemini's free tier.
 * Can be overridden via Convex environment variables.
 *
 * Defaults:
 * - Daily: 1,000 requests per day (~67% of Gemini's 1,500 RPD limit)
 * - Monthly: 20,000 requests per month
 * - Warning threshold: 90% of daily/monthly limit
 */
const DEFAULT_RATE_LIMITS = {
  DAILY_LIMIT: 1000,
  MONTHLY_LIMIT: 20000,
  WARNING_THRESHOLD_PCT: 90,
} as const;

/**
 * Rate Limit Configuration
 *
 * Loads rate limits from environment variables with fallback to defaults.
 * Environment variables:
 * - AI_DAILY_RATE_LIMIT (default: 1000)
 * - AI_MONTHLY_RATE_LIMIT (default: 20000)
 * - AI_WARNING_THRESHOLD_PCT (default: 90)
 */
export const aiRateLimits = {
  getDailyLimit(): number {
    const envValue = process.env.AI_DAILY_RATE_LIMIT;
    return envValue ? parseInt(envValue, 10) : DEFAULT_RATE_LIMITS.DAILY_LIMIT;
  },
  getMonthlyLimit(): number {
    const envValue = process.env.AI_MONTHLY_RATE_LIMIT;
    return envValue
      ? parseInt(envValue, 10)
      : DEFAULT_RATE_LIMITS.MONTHLY_LIMIT;
  },
  getWarningThreshold(): number {
    const envValue = process.env.AI_WARNING_THRESHOLD_PCT;
    return envValue
      ? parseInt(envValue, 10)
      : DEFAULT_RATE_LIMITS.WARNING_THRESHOLD_PCT;
  },
};

/**
 * Calculate Token Estimate
 *
 * Estimates token usage based on content length and feature type.
 * Uses industry-standard approximation: ~4 characters per token.
 *
 * Token estimates by feature:
 * - Tone adjustment: Similar length to input (~1.2x)
 * - LinkedIn expansion: ~2-3x longer than input (~2.5x)
 * - Hashtags: Fixed output (~50 tokens)
 *
 * @param contentLength - Length of input content in characters
 * @param feature - AI feature type: "tone", "expand", or "hashtags"
 * @returns Object with input and output token estimates
 *
 * @example
 * const tokens = calculateTokenEstimate(280, "tone");
 * // Returns: { input: 77, output: 92 }
 */
export function calculateTokenEstimate(
  contentLength: number,
  feature: string,
): { input: number; output: number } {
  // Rough approximation: 1 token ≈ 4 characters
  const inputTokens = Math.ceil((contentLength / 4) * 1.1); // 10% buffer for formatting

  let outputTokens: number;
  switch (feature) {
    case "tone":
      // Tone adjustment typically maintains similar length
      outputTokens = Math.ceil((contentLength / 4) * 1.2); // Slightly longer
      break;
    case "expand":
      // LinkedIn expansion is ~2-3x longer
      outputTokens = Math.ceil((contentLength / 4) * 2.5);
      break;
    case "hashtags":
      // Hashtags are short, fixed output
      outputTokens = 50;
      break;
    default:
      outputTokens = inputTokens; // Default: same as input
  }

  return { input: inputTokens, output: outputTokens };
}

/**
 * Calculate Cost Estimate
 *
 * Calculates estimated cost in USD based on token usage and Gemini pricing.
 * Uses paid tier pricing for estimation (free tier has no cost).
 *
 * Pricing (as of Jan 2025):
 * - Input: $0.075 per 1M tokens
 * - Output: $0.30 per 1M tokens
 *
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Estimated cost in USD
 *
 * @example
 * const cost = calculateCostEstimate(100, 100);
 * // Returns: 0.0000375 (~$0.000038)
 */
export function calculateCostEstimate(
  inputTokens: number,
  outputTokens: number,
): number {
  const cost =
    inputTokens * GEMINI_PRICING.INPUT_COST_PER_TOKEN +
    outputTokens * GEMINI_PRICING.OUTPUT_COST_PER_TOKEN;

  return cost; // Returns cost in USD
}

/**
 * Log AI Usage (Internal Mutation)
 *
 * Records AI API usage to the ai_usage_logs table for tracking and analytics.
 * This is an internal mutation - should only be called from other Convex functions.
 *
 * @param userId - User ID who made the request
 * @param feature - AI feature type: "tone", "expand", or "hashtags"
 * @param tokensUsed - Total tokens consumed (input + output)
 * @param cost - Estimated cost in USD
 * @param modelUsed - Gemini model name (e.g., "gemini-1.5-flash")
 * @param requestId - Correlation ID for debugging
 * @param duration - Request duration in milliseconds
 * @param success - Whether the request succeeded
 * @returns The ID of the created usage log entry
 *
 * @throws {Error} If any required parameter is missing or invalid
 *
 * @example
 * await ctx.runMutation(internal.aiUsageTracking.logAIUsage, {
 *   userId: "user123",
 *   feature: "tone",
 *   tokensUsed: 200,
 *   cost: 0.000038,
 *   modelUsed: "gemini-1.5-flash",
 *   requestId: "tone-abc123-1234567890",
 *   duration: 1250,
 *   success: true
 * });
 */
export const logAIUsage = internalMutation({
  args: {
    userId: v.string(),
    feature: v.string(),
    tokensUsed: v.number(),
    cost: v.number(),
    modelUsed: v.string(),
    requestId: v.string(),
    duration: v.number(),
    success: v.boolean(),
  },
  returns: v.id("ai_usage_logs"),
  handler: async (ctx, args) => {
    const timestamp = Date.now();

    const logId = await ctx.db.insert("ai_usage_logs", {
      userId: args.userId,
      timestamp,
      feature: args.feature,
      tokensUsed: args.tokensUsed,
      cost: args.cost,
      modelUsed: args.modelUsed,
      requestId: args.requestId,
      duration: args.duration,
      success: args.success,
    });

    console.log(
      `[AI Usage ${args.requestId}] Logged usage | User: ${args.userId} | ` +
        `Feature: ${args.feature} | Tokens: ${args.tokensUsed} | ` +
        `Cost: $${args.cost.toFixed(6)} | Success: ${args.success}`,
    );

    return logId;
  },
});

/**
 * Get Rate Limit Status
 *
 * Checks current rate limit status for a user within a specific time window.
 * Returns request count, limit, percentage used, and warning flags.
 *
 * @param userId - User ID to check rate limit for
 * @param timeWindow - Time window: "day" or "month"
 * @returns Rate limit status object
 * @property requestCount - Number of requests made in time window
 * @property limit - Maximum allowed requests for time window
 * @property percentUsed - Percentage of limit used (0-100+)
 * @property isNearLimit - Whether user is approaching limit (>90%)
 * @property isExceeded - Whether user has exceeded limit
 * @property resetTime - Unix timestamp when limit resets
 *
 * @throws {Error} If user is not authenticated
 *
 * @example
 * const status = await ctx.runQuery(api.aiUsageTracking.getRateLimitStatus, {
 *   userId: "user123",
 *   timeWindow: "day"
 * });
 * // Returns: { requestCount: 850, limit: 1000, percentUsed: 85, ... }
 */
export const getRateLimitStatus = internalQuery({
  args: {
    userId: v.string(),
    timeWindow: v.union(v.literal("day"), v.literal("month")),
  },
  returns: v.object({
    requestCount: v.number(),
    limit: v.number(),
    percentUsed: v.number(),
    isNearLimit: v.boolean(),
    isExceeded: v.boolean(),
    resetTime: v.number(),
  }),
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify user is requesting their own rate limit status
    if (identity.subject !== args.userId) {
      throw new Error("Cannot check rate limit status for other users");
    }

    const now = Date.now();
    const { userId, timeWindow } = args;

    // Calculate time window start
    const windowStart =
      timeWindow === "day"
        ? now - 24 * 60 * 60 * 1000 // 24 hours ago
        : now - 30 * 24 * 60 * 60 * 1000; // 30 days ago

    // Query usage logs within time window using indexed query
    const usageLogs = await ctx.db
      .query("ai_usage_logs")
      .withIndex("by_user_timestamp", (q) =>
        q.eq("userId", userId).gte("timestamp", windowStart),
      )
      .collect();

    const requestCount = usageLogs.length;

    // Get rate limit for time window
    const limit =
      timeWindow === "day"
        ? aiRateLimits.getDailyLimit()
        : aiRateLimits.getMonthlyLimit();

    const percentUsed = limit > 0 ? (requestCount / limit) * 100 : 0;
    const warningThreshold = aiRateLimits.getWarningThreshold();
    const isNearLimit = percentUsed >= warningThreshold;
    const isExceeded = requestCount >= limit;

    // Calculate reset time
    const resetTime =
      timeWindow === "day"
        ? getStartOfNextDay(now)
        : getStartOfNextMonth(now);

    return {
      requestCount,
      limit,
      percentUsed,
      isNearLimit,
      isExceeded,
      resetTime,
    };
  },
});

/**
 * Helper: Get start of next day (midnight UTC)
 */
function getStartOfNextDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setUTCHours(24, 0, 0, 0); // Next day at midnight UTC
  return date.getTime();
}

/**
 * Helper: Get start of next month (first day at midnight UTC)
 */
function getStartOfNextMonth(timestamp: number): number {
  const date = new Date(timestamp);
  date.setUTCMonth(date.getUTCMonth() + 1, 1); // First day of next month
  date.setUTCHours(0, 0, 0, 0); // Midnight UTC
  return date.getTime();
}

/**
 * Get User Usage Stats
 *
 * Returns comprehensive usage statistics for the authenticated user.
 * Shows breakdown by feature, time period, and cost estimates.
 *
 * @returns User usage statistics object
 * @property today - Stats for today (requests, cost)
 * @property thisMonth - Stats for this month (requests, cost)
 * @property byFeature - Array of stats grouped by feature type
 *
 * @throws {Error} If user is not authenticated
 *
 * @example
 * const stats = await ctx.runQuery(api.aiUsageTracking.getUserUsageStats, {});
 * // Returns: { today: { requests: 5, cost: 0.0002 }, ... }
 */
export const getUserUsageStats = query({
  args: {},
  returns: v.object({
    today: v.object({
      requests: v.number(),
      cost: v.number(),
    }),
    thisMonth: v.object({
      requests: v.number(),
      cost: v.number(),
    }),
    byFeature: v.array(
      v.object({
        feature: v.string(),
        requestCount: v.number(),
        totalCost: v.number(),
        avgDuration: v.number(),
      }),
    ),
  }),
  handler: async (ctx) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const now = Date.now();

    // Calculate time windows
    const startOfToday = now - 24 * 60 * 60 * 1000; // 24 hours ago
    const startOfMonth = now - 30 * 24 * 60 * 60 * 1000; // 30 days ago

    // Query all usage logs for user this month
    const monthlyLogs = await ctx.db
      .query("ai_usage_logs")
      .withIndex("by_user_timestamp", (q) =>
        q.eq("userId", userId).gte("timestamp", startOfMonth),
      )
      .collect();

    // Filter for today
    const todayLogs = monthlyLogs.filter((log) => log.timestamp >= startOfToday);

    // Calculate today stats
    const todayStats = {
      requests: todayLogs.length,
      cost: todayLogs.reduce((sum, log) => sum + log.cost, 0),
    };

    // Calculate monthly stats
    const monthlyStats = {
      requests: monthlyLogs.length,
      cost: monthlyLogs.reduce((sum, log) => sum + log.cost, 0),
    };

    // Calculate stats by feature
    const featureMap = new Map<
      string,
      { requests: number; cost: number; totalDuration: number }
    >();

    for (const log of monthlyLogs) {
      const existing = featureMap.get(log.feature) || {
        requests: 0,
        cost: 0,
        totalDuration: 0,
      };
      featureMap.set(log.feature, {
        requests: existing.requests + 1,
        cost: existing.cost + log.cost,
        totalDuration: existing.totalDuration + log.duration,
      });
    }

    const byFeature = Array.from(featureMap.entries()).map(
      ([feature, stats]) => ({
        feature,
        requestCount: stats.requests,
        totalCost: stats.cost,
        avgDuration:
          stats.requests > 0 ? stats.totalDuration / stats.requests : 0,
      }),
    );

    return {
      today: todayStats,
      thisMonth: monthlyStats,
      byFeature,
    };
  },
});

/**
 * Get Admin Usage Stats
 *
 * Returns comprehensive usage statistics for all users (admin only).
 * Shows aggregated stats by feature, top users, time-based totals, and recent activity.
 *
 * Note: For single-user application, this returns the authenticated user's stats.
 * In multi-user scenarios, add admin role check here.
 *
 * @returns Admin usage statistics object
 * @property totals - Time-based totals (today, thisMonth, allTime)
 * @property byFeature - Array of stats grouped by feature type
 * @property topUsers - Top users by request count and cost
 * @property recentActivity - Hourly request counts for last 24 hours
 *
 * @throws {Error} If user is not authenticated
 *
 * @example
 * const stats = await ctx.runQuery(api.aiUsageTracking.getAdminUsageStats, {});
 */
export const getAdminUsageStats = query({
  args: {},
  returns: v.object({
    totals: v.object({
      today: v.object({ requests: v.number(), cost: v.number() }),
      thisMonth: v.object({ requests: v.number(), cost: v.number() }),
      allTime: v.object({ requests: v.number(), cost: v.number() }),
    }),
    byFeature: v.array(
      v.object({
        feature: v.string(),
        requestCount: v.number(),
        totalCost: v.number(),
        avgDuration: v.number(),
        successRate: v.number(),
      }),
    ),
    topUsers: v.array(
      v.object({
        userId: v.string(),
        requestCount: v.number(),
        totalCost: v.number(),
      }),
    ),
    recentActivity: v.array(
      v.object({
        hour: v.number(),
        requestCount: v.number(),
      }),
    ),
  }),
  handler: async (ctx) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Note: For single-user app, admin = authenticated user
    // In multi-user app, add admin role check here

    const now = Date.now();

    // Calculate time windows
    const startOfToday = now - 24 * 60 * 60 * 1000; // 24 hours ago
    const startOfMonth = now - 30 * 24 * 60 * 60 * 1000; // 30 days ago

    // Query all usage logs (all users)
    const allLogs = await ctx.db.query("ai_usage_logs").collect();

    // Filter by time windows
    const todayLogs = allLogs.filter((log) => log.timestamp >= startOfToday);
    const monthlyLogs = allLogs.filter((log) => log.timestamp >= startOfMonth);

    // Calculate totals
    const totals = {
      today: {
        requests: todayLogs.length,
        cost: todayLogs.reduce((sum, log) => sum + log.cost, 0),
      },
      thisMonth: {
        requests: monthlyLogs.length,
        cost: monthlyLogs.reduce((sum, log) => sum + log.cost, 0),
      },
      allTime: {
        requests: allLogs.length,
        cost: allLogs.reduce((sum, log) => sum + log.cost, 0),
      },
    };

    // Calculate stats by feature
    const featureMap = new Map<
      string,
      {
        requests: number;
        cost: number;
        totalDuration: number;
        successes: number;
      }
    >();

    for (const log of allLogs) {
      const existing = featureMap.get(log.feature) || {
        requests: 0,
        cost: 0,
        totalDuration: 0,
        successes: 0,
      };
      featureMap.set(log.feature, {
        requests: existing.requests + 1,
        cost: existing.cost + log.cost,
        totalDuration: existing.totalDuration + log.duration,
        successes: existing.successes + (log.success ? 1 : 0),
      });
    }

    const byFeature = Array.from(featureMap.entries()).map(
      ([feature, stats]) => ({
        feature,
        requestCount: stats.requests,
        totalCost: stats.cost,
        avgDuration:
          stats.requests > 0 ? stats.totalDuration / stats.requests : 0,
        successRate:
          stats.requests > 0 ? (stats.successes / stats.requests) * 100 : 0,
      }),
    );

    // Calculate top users
    const userMap = new Map<string, { requests: number; cost: number }>();

    for (const log of allLogs) {
      const existing = userMap.get(log.userId) || { requests: 0, cost: 0 };
      userMap.set(log.userId, {
        requests: existing.requests + 1,
        cost: existing.cost + log.cost,
      });
    }

    const topUsers = Array.from(userMap.entries())
      .map(([userId, stats]) => ({
        userId,
        requestCount: stats.requests,
        totalCost: stats.cost,
      }))
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, 10); // Top 10 users

    // Calculate recent activity (last 24 hours, grouped by hour)
    const hourlyActivity = new Map<number, number>();

    for (const log of todayLogs) {
      const hour = new Date(log.timestamp).getUTCHours();
      hourlyActivity.set(hour, (hourlyActivity.get(hour) || 0) + 1);
    }

    const recentActivity = Array.from(hourlyActivity.entries())
      .map(([hour, count]) => ({ hour, requestCount: count }))
      .sort((a, b) => a.hour - b.hour);

    return {
      totals,
      byFeature,
      topUsers,
      recentActivity,
    };
  },
});
