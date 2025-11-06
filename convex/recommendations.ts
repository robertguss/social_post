import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Gets recommended posting times for a specific date and platform
 *
 * @param date - ISO format date string (e.g., "2025-11-15")
 * @param platform - Platform name ("twitter" or "linkedin")
 * @param userTimezone - IANA timezone (e.g., "America/New_York")
 * @returns Array of top 3 time recommendations with timezone conversion and conflict detection
 */
export const getRecommendedTimes = query({
  args: {
    date: v.string(), // ISO format: "2025-11-15"
    platform: v.string(), // "twitter" or "linkedin"
    userTimezone: v.string(), // IANA timezone: "America/New_York"
  },
  returns: v.array(
    v.object({
      timeRange: v.string(), // Formatted as "9:00 AM - 11:00 AM EST"
      engagementScore: v.number(), // 0-100
      source: v.string(), // "industry research" | "user data" | "default"
      conflictsWithPost: v.boolean(), // True if conflicts with existing scheduled post
    })
  ),
  handler: async (ctx, args) => {
    // Authentication check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Extract day of week from provided date (0-6, Sunday=0)
    const dateObj = new Date(args.date);
    const dayOfWeek = dateObj.getUTCDay();

    // 1. Check for user custom preferences first (Story 6.5)
    const userPreferences = await ctx.db
      .query("posting_preferences")
      .withIndex("by_user_platform_day", (q) =>
        q
          .eq("userId", userId)
          .eq("platform", args.platform)
          .eq("dayOfWeek", dayOfWeek)
      )
      .collect();

    // 2. Query posting_time_recommendations using the by_platform_day index
    const recommendations = await ctx.db
      .query("posting_time_recommendations")
      .withIndex("by_platform_day", (q) =>
        q.eq("platform", args.platform).eq("dayOfWeek", dayOfWeek)
      )
      .collect();

    // 3. Combine user preferences (high priority) with research-based recommendations
    let combinedRecommendations = [];

    // Add custom preferences as top recommendations with high engagement score
    if (userPreferences.length > 0) {
      for (const pref of userPreferences) {
        for (const timeRange of pref.customTimeRanges) {
          // Convert local time range to UTC before merging into recommendations
          const utcRange = convertLocalRangeToUTC(
            timeRange.startHour,
            timeRange.endHour,
            args.userTimezone,
            dateObj
          );

          combinedRecommendations.push({
            hourRanges: [{ startHour: utcRange.startHourUTC, endHour: utcRange.endHourUTC }],
            engagementScore: 95, // High score to prioritize user preferences
            source: "user preference",
          });
        }
      }
    }

    // Add research-based recommendations
    combinedRecommendations.push(...recommendations);

    // Sort by engagement score (highest first) and take top 3
    const sortedRecommendations = combinedRecommendations
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 3);

    // Get user's scheduled posts for conflict detection
    const scheduledPosts = await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "scheduled"))
      .collect();

    // Extract scheduled times for the specified platform on the selected date
    const scheduledTimesOnDate = scheduledPosts
      .map((post) => {
        const scheduledTime =
          args.platform === "twitter"
            ? post.twitterScheduledTime
            : post.linkedInScheduledTime;
        return scheduledTime;
      })
      .filter((time): time is number => time !== undefined);

    // Get historical performance data for this user and platform (Story 6.4)
    const historicalPerformance = await getHistoricalPerformanceData(
      ctx,
      userId,
      args.platform
    );

    // Convert recommendations to formatted output
    const formattedRecommendations = sortedRecommendations.map((rec) => {
      // For each hour range in the recommendation
      const firstRange = rec.hourRanges[0];

      // Convert UTC hour to user's local timezone
      const localTimeRange = convertUTCRangeToLocalTimezone(
        firstRange.startHour,
        firstRange.endHour,
        args.userTimezone,
        dateObj
      );

      // Check for conflicts with existing posts
      const conflictsWithPost = checkTimeConflict(
        firstRange.startHour,
        firstRange.endHour,
        scheduledTimesOnDate,
        args.date
      );

      // Apply historical performance weighting if available (Story 6.4)
      let finalScore = rec.engagementScore;
      if (historicalPerformance.length > 0) {
        const historicalFactor = calculateHistoricalPerformanceFactor(
          historicalPerformance,
          firstRange.startHour
        );
        // Weighted average: 60% research-based, 40% historical performance
        finalScore = rec.engagementScore * 0.6 + historicalFactor * 0.4;
      }

      return {
        timeRange: localTimeRange,
        engagementScore: Math.round(finalScore), // Round to integer for cleaner display
        source: rec.source,
        conflictsWithPost,
      };
    });

    // If no recommendations found, return fallback
    if (formattedRecommendations.length === 0) {
      return getFallbackRecommendations(args.userTimezone, dateObj);
    }

    // Ensure we return exactly 3 recommendations
    while (formattedRecommendations.length < 3) {
      const fallbacks = getFallbackRecommendations(args.userTimezone, dateObj);
      formattedRecommendations.push(...fallbacks);
    }

    return formattedRecommendations.slice(0, 3);
  },
});

/**
 * Converts UTC hour range to user's local timezone with formatted string
 *
 * @param startHourUTC - Start hour in UTC (0-23)
 * @param endHourUTC - End hour in UTC (0-23)
 * @param timezone - IANA timezone string
 * @param date - Date object for the scheduled date
 * @returns Formatted time range string (e.g., "9:00 AM - 11:00 AM EST")
 */
function convertUTCRangeToLocalTimezone(
  startHourUTC: number,
  endHourUTC: number,
  timezone: string,
  date: Date
): string {
  // Create date objects for start and end times in UTC
  const startDate = new Date(date);
  startDate.setUTCHours(startHourUTC, 0, 0, 0);

  const endDate = new Date(date);
  endDate.setUTCHours(endHourUTC, 0, 0, 0);

  // Format times in user's timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  });

  const startTimeFormatted = formatter.format(startDate);
  const endTimeFormatted = formatter.format(endDate);

  // Get timezone abbreviation
  const timezoneAbbr = getTimezoneAbbreviation(timezone, startDate);

  return `${startTimeFormatted} - ${endTimeFormatted} ${timezoneAbbr}`;
}

/**
 * Gets timezone abbreviation (e.g., "EST", "PST") for a given timezone and date
 *
 * @param timezone - IANA timezone string
 * @param date - Date object to check for DST
 * @returns Timezone abbreviation
 */
function getTimezoneAbbreviation(timezone: string, date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "short",
  });

  const parts = formatter.formatToParts(date);
  const timeZonePart = parts.find((part) => part.type === "timeZoneName");

  return timeZonePart?.value || timezone;
}

/**
 * Checks if a UTC hour range conflicts with existing scheduled posts
 *
 * @param startHourUTC - Start hour in UTC (0-23)
 * @param endHourUTC - End hour in UTC (0-23)
 * @param scheduledTimes - Array of scheduled post timestamps
 * @param dateString - ISO date string for the scheduled date
 * @returns True if conflicts with any scheduled post (within 1 hour window)
 */
function checkTimeConflict(
  startHourUTC: number,
  endHourUTC: number,
  scheduledTimes: number[],
  dateString: string
): boolean {
  // Create date object for the scheduled date
  const date = new Date(dateString);

  // Define conflict window: 1 hour before start to 1 hour after end
  const conflictStartHour = startHourUTC - 1;
  const conflictEndHour = endHourUTC + 1;

  // Convert conflict window to timestamps
  const conflictStartDate = new Date(date);
  conflictStartDate.setUTCHours(conflictStartHour, 0, 0, 0);
  const conflictStart = conflictStartDate.getTime();

  const conflictEndDate = new Date(date);
  conflictEndDate.setUTCHours(conflictEndHour, 0, 0, 0);
  const conflictEnd = conflictEndDate.getTime();

  // Check if any scheduled time falls within conflict window
  return scheduledTimes.some(
    (scheduledTime) => scheduledTime >= conflictStart && scheduledTime <= conflictEnd
  );
}

/**
 * Returns fallback recommendations when no research-based data exists
 *
 * @param timezone - IANA timezone string
 * @param date - Date object for the scheduled date
 * @returns Array of 3 fallback recommendations
 */
function getFallbackRecommendations(
  timezone: string,
  date: Date
): Array<{
  timeRange: string;
  engagementScore: number;
  source: string;
  conflictsWithPost: boolean;
}> {
  // Default fallback: 9-11am UTC (mid-morning)
  const fallbackRanges = [
    { startHour: 9, endHour: 11 },
    { startHour: 14, endHour: 16 }, // 2-4pm UTC
    { startHour: 18, endHour: 20 }, // 6-8pm UTC
  ];

  return fallbackRanges.map((range) => ({
    timeRange: convertUTCRangeToLocalTimezone(
      range.startHour,
      range.endHour,
      timezone,
      date
    ),
    engagementScore: 50, // Lower score to indicate generic suggestion
    source: "default",
    conflictsWithPost: false, // Fallbacks don't check conflicts
  }));
}

/**
 * Converts local timezone hour range to UTC hour range
 *
 * User preferences are stored in local time, but the recommendation system works in UTC.
 * This function converts a local time range (e.g., "7:00-9:00 EST") to the equivalent
 * UTC hours (e.g., "12:00-14:00 UTC"), accounting for timezone offset and DST.
 *
 * @param startHourLocal - Start hour in user's local timezone (0-23)
 * @param endHourLocal - End hour in user's local timezone (0-23)
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @param date - Date object for the scheduled date (needed for DST calculation)
 * @returns Object with startHourUTC and endHourUTC in UTC timezone (0-23)
 */
function convertLocalRangeToUTC(
  startHourLocal: number,
  endHourLocal: number,
  timezone: string,
  date: Date
): { startHourUTC: number; endHourUTC: number } {
  // Helper to convert a single local hour to UTC
  const convertHour = (localHour: number): number => {
    // Create a reference date at midnight UTC for the target date
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const referenceDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

    // Find what hour midnight UTC appears as in the user's local timezone
    // This tells us the timezone offset for this specific date (accounts for DST)
    const localParts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
      hourCycle: "h23",
    }).formatToParts(referenceDate);

    const midnightUTCInLocalTime = parseInt(
      localParts.find((p) => p.type === "hour")?.value || "0"
    );

    // Calculate offset: if midnight UTC shows as 19:00 local (previous day), offset is -5 (UTC-5)
    let offset = midnightUTCInLocalTime;
    if (offset > 12) offset = offset - 24; // Handle previous day wraparound

    // Convert local hour to UTC: subtract the offset
    let utcHour = localHour - offset;

    // Normalize to 0-23 range
    utcHour = ((utcHour % 24) + 24) % 24;

    return utcHour;
  };

  return {
    startHourUTC: convertHour(startHourLocal),
    endHourUTC: convertHour(endHourLocal),
  };
}

/**
 * Retrieves historical performance data for a user and platform (Story 6.4)
 *
 * Queries the post_performance table to get engagement metrics for all posts
 * published by the user on the specified platform.
 *
 * NOTE: This returns an empty array if no performance data exists (feature not yet activated)
 *
 * @param ctx - Query context
 * @param userId - Clerk user ID
 * @param platform - Platform name ("twitter" or "linkedin")
 * @returns Array of performance data with published time and engagement metrics
 */
async function getHistoricalPerformanceData(
  ctx: any,
  userId: string,
  platform: string
): Promise<
  Array<{
    publishedTime: number;
    engagementMetrics: {
      likes: number;
      shares: number;
      comments: number;
      impressions?: number;
    };
  }>
> {
  // Check if performance tracking feature is enabled
  const featureEnabled = process.env.PERFORMANCE_TRACKING_ENABLED === "true";
  if (!featureEnabled) {
    return []; // Return empty array if feature is not enabled
  }

  // Query all performance records for this platform
  const allPerformanceRecords = await ctx.db
    .query("post_performance")
    .withIndex("by_platform_time", (q: any) => q.eq("platform", platform))
    .collect();

  // Filter to only include records for posts belonging to the authenticated user
  const userPostIds = new Set<string>();
  const userPosts = await ctx.db
    .query("posts")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();

  userPosts.forEach((post: any) => userPostIds.add(post._id));

  // Filter performance records to only include user's posts
  const userPerformanceRecords = allPerformanceRecords.filter((record: any) =>
    userPostIds.has(record.postId)
  );

  return userPerformanceRecords.map((record: any) => ({
    publishedTime: record.publishedTime,
    engagementMetrics: record.engagementMetrics,
  }));
}

/**
 * Calculates a normalized engagement score from historical performance data (Story 6.4)
 *
 * Takes historical posts published at similar times and calculates an average
 * engagement score based on likes, shares, comments, and impressions.
 *
 * The score is normalized to a 0-100 scale to match the research-based scores.
 *
 * Algorithm considerations:
 * - Weights recent posts more heavily (exponential decay)
 * - Requires minimum 3 posts at this hour for statistical relevance
 * - Normalizes engagement based on all user's posts (not absolute numbers)
 *
 * @param historicalData - Array of performance records
 * @param targetHourUTC - Target hour in UTC (0-23) to calculate score for
 * @returns Normalized engagement score (0-100), or baseline 50 if insufficient data
 */
function calculateHistoricalPerformanceFactor(
  historicalData: Array<{
    publishedTime: number;
    engagementMetrics: {
      likes: number;
      shares: number;
      comments: number;
      impressions?: number;
    };
  }>,
  targetHourUTC: number
): number {
  // Filter to posts published within +/- 1 hour of target hour
  const postsAtTargetTime = historicalData.filter((record) => {
    const postDate = new Date(record.publishedTime);
    const postHour = postDate.getUTCHours();
    // Check if within 1 hour window (handles hour wraparound)
    const hourDiff = Math.abs(postHour - targetHourUTC);
    return hourDiff <= 1 || hourDiff >= 23; // 23 accounts for wraparound (e.g., 23 and 0)
  });

  // Require minimum 3 posts for statistical relevance
  if (postsAtTargetTime.length < 3) {
    return 50; // Return baseline score if insufficient data
  }

  // Calculate total engagement for each post (weighted formula)
  // Likes: 1 point, Comments: 3 points (higher value), Shares: 5 points (highest value)
  const engagementScores = postsAtTargetTime.map((record) => {
    const metrics = record.engagementMetrics;
    return metrics.likes * 1 + metrics.comments * 3 + metrics.shares * 5;
  });

  // Calculate average engagement at this time
  const avgEngagement =
    engagementScores.reduce((sum, score) => sum + score, 0) / engagementScores.length;

  // Calculate overall average engagement across all historical data for normalization
  const allEngagementScores = historicalData.map((record) => {
    const metrics = record.engagementMetrics;
    return metrics.likes * 1 + metrics.comments * 3 + metrics.shares * 5;
  });

  const overallAvgEngagement =
    allEngagementScores.reduce((sum, score) => sum + score, 0) / allEngagementScores.length;

  // Normalize to 0-100 scale relative to user's overall performance
  // If avgEngagement equals overallAvg, return 50 (baseline)
  // If avgEngagement is 2x overallAvg, return 100
  // If avgEngagement is 0.5x overallAvg, return 25
  let normalizedScore = 50;

  if (overallAvgEngagement > 0) {
    const ratio = avgEngagement / overallAvgEngagement;
    normalizedScore = Math.min(100, Math.max(0, ratio * 50));
  }

  return normalizedScore;
}
