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
    const clerkUserId = identity.subject;

    // Extract day of week from provided date (0-6, Sunday=0)
    const dateObj = new Date(args.date);
    const dayOfWeek = dateObj.getUTCDay();

    // Query posting_time_recommendations using the by_platform_day index
    const recommendations = await ctx.db
      .query("posting_time_recommendations")
      .withIndex("by_platform_day", (q) =>
        q.eq("platform", args.platform).eq("dayOfWeek", dayOfWeek)
      )
      .collect();

    // Sort by engagement score (highest first) and take top 3
    const sortedRecommendations = recommendations
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 3);

    // Get user's scheduled posts for conflict detection
    const scheduledPosts = await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
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

      return {
        timeRange: localTimeRange,
        engagementScore: rec.engagementScore,
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
 * FUTURE ENHANCEMENT: Historical Performance Integration (Story 6.4)
 *
 * Calculates a performance factor based on user's historical post engagement
 * at specific times of day. This factor will be multiplied with the engagement
 * score to personalize recommendations.
 *
 * Data structure needed:
 * - timeOfDay: number (hour of day 0-23)
 * - avgEngagement: number (average engagement metrics)
 * - postCount: number (number of posts at this time)
 *
 * API requirements:
 * - Twitter Analytics API for engagement metrics
 * - LinkedIn Analytics API for engagement metrics
 * - New table: user_posting_performance
 *
 * @param userId - Clerk user ID
 * @param platform - Platform name ("twitter" or "linkedin")
 * @param hourOfDay - Hour of day (0-23) in user's local timezone
 * @returns Performance factor (0.5-2.0, where 1.0 is neutral)
 */
function getHistoricalPerformanceFactor(
  userId: string,
  platform: string,
  hourOfDay: number
): number {
  // Placeholder implementation - always returns neutral weight
  // TODO: Implement in Story 6.4 when engagement metrics are available
  return 1.0;
}
