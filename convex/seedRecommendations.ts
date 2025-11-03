import { mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Seeds the posting_time_recommendations table with industry research best practices.
 * All times are converted from EST to UTC (EST = UTC-5).
 *
 * This function checks for existing data to prevent duplicate seeding.
 * Can be called via internal mutation or exposed as public mutation for admin use.
 */
export const seedPostingTimeRecommendations = internalMutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    recordsInserted: v.number(),
  }),
  handler: async (ctx, args) => {
    // Check if data already exists to prevent duplicate seeding
    const existingRecords = await ctx.db
      .query("posting_time_recommendations")
      .collect();

    if (existingRecords.length > 0) {
      return {
        success: false,
        message: "Seed data already exists. Skipping seeding operation.",
        recordsInserted: 0,
      };
    }

    // Twitter/X Best Practices (converted from EST to UTC)
    // EST = UTC-5, so add 5 hours to EST times
    const twitterRecommendations = [
      // Monday-Friday: 8-10am EST = 1-3pm UTC (13-15)
      {
        platform: "twitter",
        dayOfWeek: 1, // Monday
        hourRanges: [{ startHour: 13, endHour: 15 }],
        engagementScore: 75,
        source: "industry research",
      },
      {
        platform: "twitter",
        dayOfWeek: 2, // Tuesday
        hourRanges: [
          { startHour: 13, endHour: 15 }, // 8-10am EST
          { startHour: 17, endHour: 18 }, // 12-1pm EST (peak)
        ],
        engagementScore: 85,
        source: "industry research",
      },
      {
        platform: "twitter",
        dayOfWeek: 3, // Wednesday - highest engagement day
        hourRanges: [
          { startHour: 14, endHour: 15 }, // 9am EST (peak)
          { startHour: 17, endHour: 18 }, // 12-1pm EST
        ],
        engagementScore: 90,
        source: "industry research",
      },
      {
        platform: "twitter",
        dayOfWeek: 4, // Thursday
        hourRanges: [
          { startHour: 13, endHour: 15 }, // 8-10am EST
          { startHour: 17, endHour: 18 }, // 12-1pm EST (peak)
        ],
        engagementScore: 85,
        source: "industry research",
      },
      {
        platform: "twitter",
        dayOfWeek: 5, // Friday
        hourRanges: [{ startHour: 13, endHour: 15 }], // 8-10am EST
        engagementScore: 70,
        source: "industry research",
      },
      // Weekend (lower engagement)
      {
        platform: "twitter",
        dayOfWeek: 0, // Sunday
        hourRanges: [{ startHour: 17, endHour: 19 }], // 12-2pm EST
        engagementScore: 40,
        source: "industry research",
      },
      {
        platform: "twitter",
        dayOfWeek: 6, // Saturday
        hourRanges: [{ startHour: 17, endHour: 19 }], // 12-2pm EST
        engagementScore: 50,
        source: "industry research",
      },
    ];

    // LinkedIn Best Practices (converted from EST to UTC)
    const linkedInRecommendations = [
      // Tuesday-Thursday: 10am-12pm EST = 3-5pm UTC (15-17)
      {
        platform: "linkedin",
        dayOfWeek: 2, // Tuesday
        hourRanges: [{ startHour: 15, endHour: 17 }], // 10am-12pm EST
        engagementScore: 85,
        source: "industry research",
      },
      {
        platform: "linkedin",
        dayOfWeek: 3, // Wednesday - highest engagement
        hourRanges: [{ startHour: 15, endHour: 16 }], // 10-11am EST (peak)
        engagementScore: 95,
        source: "industry research",
      },
      {
        platform: "linkedin",
        dayOfWeek: 4, // Thursday
        hourRanges: [{ startHour: 15, endHour: 17 }], // 10am-12pm EST
        engagementScore: 85,
        source: "industry research",
      },
      // Monday and Friday (moderate engagement)
      {
        platform: "linkedin",
        dayOfWeek: 1, // Monday
        hourRanges: [{ startHour: 15, endHour: 17 }], // 10am-12pm EST
        engagementScore: 70,
        source: "industry research",
      },
      {
        platform: "linkedin",
        dayOfWeek: 5, // Friday
        hourRanges: [{ startHour: 15, endHour: 16 }], // 10-11am EST
        engagementScore: 65,
        source: "industry research",
      },
      // Weekend (very low engagement - avoid)
      {
        platform: "linkedin",
        dayOfWeek: 0, // Sunday
        hourRanges: [{ startHour: 15, endHour: 17 }], // 10am-12pm EST
        engagementScore: 20,
        source: "industry research",
      },
      {
        platform: "linkedin",
        dayOfWeek: 6, // Saturday
        hourRanges: [{ startHour: 15, endHour: 17 }], // 10am-12pm EST
        engagementScore: 30,
        source: "industry research",
      },
    ];

    // Combine all recommendations
    const allRecommendations = [
      ...twitterRecommendations,
      ...linkedInRecommendations,
    ];

    // Insert all records
    let insertedCount = 0;
    for (const recommendation of allRecommendations) {
      await ctx.db.insert("posting_time_recommendations", recommendation);
      insertedCount++;
    }

    console.log(
      `Successfully seeded ${insertedCount} posting time recommendations`
    );

    return {
      success: true,
      message: `Successfully seeded ${insertedCount} posting time recommendations`,
      recordsInserted: insertedCount,
    };
  },
});

/**
 * Public mutation for admin users to manually trigger seeding.
 * Requires authentication.
 */
export const seedRecommendationsAdmin = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    recordsInserted: v.number(),
  }),
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Call the internal seeding mutation
    return await ctx.runMutation(
      internal.seedRecommendations.seedPostingTimeRecommendations,
      {}
    );
  },
});
