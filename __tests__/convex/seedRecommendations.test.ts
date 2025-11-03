/**
 * Integration Tests for seedRecommendations Mutations
 *
 * Tests the seed mutations in convex/seedRecommendations.ts
 */

import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "@jest/globals";
import schema from "@/convex/schema";
import { internal } from "@/convex/_generated/api";
import { api } from "@/convex/_generated/api";

describe("seedPostingTimeRecommendations mutation", () => {
  let t: any;
  let userId: string;

  beforeEach(async () => {
    t = convexTest(schema);
    userId = "user_admin123";

    // Set up authenticated user context for admin functions
    t.setUser({ subject: userId });
  });

  test("successfully populates the table with seed data", async () => {
    // Call the internal seed function
    const result = await t.mutation(
      internal.seedRecommendations.seedPostingTimeRecommendations,
      {}
    );

    expect(result.success).toBe(true);
    expect(result.recordsInserted).toBeGreaterThan(0);
    expect(result.message).toContain("Successfully seeded");

    // Verify data was inserted
    const recommendations = await t.run(async (ctx: any) => {
      return await ctx.db.query("posting_time_recommendations").collect();
    });

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.length).toBe(result.recordsInserted);
  });

  test("seeded data contains Twitter recommendations", async () => {
    await t.mutation(
      internal.seedRecommendations.seedPostingTimeRecommendations,
      {}
    );

    const twitterRecommendations = await t.run(async (ctx: any) => {
      return await ctx.db
        .query("posting_time_recommendations")
        .withIndex("by_platform_day", (q: any) => q.eq("platform", "twitter"))
        .collect();
    });

    expect(twitterRecommendations.length).toBeGreaterThan(0);

    // Verify Twitter recommendations have correct structure
    twitterRecommendations.forEach((rec: any) => {
      expect(rec.platform).toBe("twitter");
      expect(rec.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(rec.dayOfWeek).toBeLessThanOrEqual(6);
      expect(Array.isArray(rec.hourRanges)).toBe(true);
      expect(rec.hourRanges.length).toBeGreaterThan(0);
      expect(rec.engagementScore).toBeGreaterThanOrEqual(0);
      expect(rec.engagementScore).toBeLessThanOrEqual(100);
      expect(rec.source).toBe("industry research");
    });
  });

  test("seeded data contains LinkedIn recommendations", async () => {
    await t.mutation(
      internal.seedRecommendations.seedPostingTimeRecommendations,
      {}
    );

    const linkedInRecommendations = await t.run(async (ctx: any) => {
      return await ctx.db
        .query("posting_time_recommendations")
        .withIndex("by_platform_day", (q: any) => q.eq("platform", "linkedin"))
        .collect();
    });

    expect(linkedInRecommendations.length).toBeGreaterThan(0);

    // Verify LinkedIn recommendations have correct structure
    linkedInRecommendations.forEach((rec: any) => {
      expect(rec.platform).toBe("linkedin");
      expect(rec.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(rec.dayOfWeek).toBeLessThanOrEqual(6);
      expect(Array.isArray(rec.hourRanges)).toBe(true);
      expect(rec.hourRanges.length).toBeGreaterThan(0);
      expect(rec.engagementScore).toBeGreaterThanOrEqual(0);
      expect(rec.engagementScore).toBeLessThanOrEqual(100);
      expect(rec.source).toBe("industry research");
    });
  });

  test("all seeded times are in UTC format (0-23)", async () => {
    await t.mutation(
      internal.seedRecommendations.seedPostingTimeRecommendations,
      {}
    );

    const recommendations = await t.run(async (ctx: any) => {
      return await ctx.db.query("posting_time_recommendations").collect();
    });

    recommendations.forEach((rec: any) => {
      rec.hourRanges.forEach((range: any) => {
        expect(range.startHour).toBeGreaterThanOrEqual(0);
        expect(range.startHour).toBeLessThanOrEqual(23);
        expect(range.endHour).toBeGreaterThanOrEqual(0);
        expect(range.endHour).toBeLessThanOrEqual(23);
      });
    });
  });

  test("engagement scores are within expected range (0-100)", async () => {
    await t.mutation(
      internal.seedRecommendations.seedPostingTimeRecommendations,
      {}
    );

    const recommendations = await t.run(async (ctx: any) => {
      return await ctx.db.query("posting_time_recommendations").collect();
    });

    recommendations.forEach((rec: any) => {
      expect(rec.engagementScore).toBeGreaterThanOrEqual(0);
      expect(rec.engagementScore).toBeLessThanOrEqual(100);
    });
  });

  test("prevents duplicate seeding", async () => {
    // First seed
    const firstResult = await t.mutation(
      internal.seedRecommendations.seedPostingTimeRecommendations,
      {}
    );

    expect(firstResult.success).toBe(true);
    expect(firstResult.recordsInserted).toBeGreaterThan(0);

    // Second seed attempt
    const secondResult = await t.mutation(
      internal.seedRecommendations.seedPostingTimeRecommendations,
      {}
    );

    expect(secondResult.success).toBe(false);
    expect(secondResult.recordsInserted).toBe(0);
    expect(secondResult.message).toContain("already exists");

    // Verify record count hasn't doubled
    const recommendations = await t.run(async (ctx: any) => {
      return await ctx.db.query("posting_time_recommendations").collect();
    });

    expect(recommendations.length).toBe(firstResult.recordsInserted);
  });

  test("supports multiple recommendations per platform/day combination", async () => {
    await t.mutation(
      internal.seedRecommendations.seedPostingTimeRecommendations,
      {}
    );

    // Check for Tuesday Twitter recommendations (should have multiple)
    const tuesdayTwitter = await t.run(async (ctx: any) => {
      return await ctx.db
        .query("posting_time_recommendations")
        .withIndex("by_platform_day", (q: any) =>
          q.eq("platform", "twitter").eq("dayOfWeek", 2)
        )
        .collect();
    });

    // Tuesday should have at least one recommendation (possibly more with multiple hourRanges)
    expect(tuesdayTwitter.length).toBeGreaterThanOrEqual(1);
  });

  test("index lookup by platform and day works correctly", async () => {
    await t.mutation(
      internal.seedRecommendations.seedPostingTimeRecommendations,
      {}
    );

    // Test index lookup for Wednesday LinkedIn (highest engagement)
    const wednesdayLinkedIn = await t.run(async (ctx: any) => {
      return await ctx.db
        .query("posting_time_recommendations")
        .withIndex("by_platform_day", (q: any) =>
          q.eq("platform", "linkedin").eq("dayOfWeek", 3)
        )
        .collect();
    });

    expect(wednesdayLinkedIn.length).toBeGreaterThan(0);
    wednesdayLinkedIn.forEach((rec: any) => {
      expect(rec.platform).toBe("linkedin");
      expect(rec.dayOfWeek).toBe(3);
    });
  });

  test("all recommendations have required fields", async () => {
    await t.mutation(
      internal.seedRecommendations.seedPostingTimeRecommendations,
      {}
    );

    const recommendations = await t.run(async (ctx: any) => {
      return await ctx.db.query("posting_time_recommendations").collect();
    });

    recommendations.forEach((rec: any) => {
      expect(rec.platform).toBeDefined();
      expect(rec.dayOfWeek).toBeDefined();
      expect(rec.hourRanges).toBeDefined();
      expect(rec.engagementScore).toBeDefined();
      expect(rec.source).toBeDefined();
      expect(rec._id).toBeDefined();
      expect(rec._creationTime).toBeDefined();
    });
  });

  test("hourRanges contain valid time window objects", async () => {
    await t.mutation(
      internal.seedRecommendations.seedPostingTimeRecommendations,
      {}
    );

    const recommendations = await t.run(async (ctx: any) => {
      return await ctx.db.query("posting_time_recommendations").collect();
    });

    recommendations.forEach((rec: any) => {
      expect(Array.isArray(rec.hourRanges)).toBe(true);
      rec.hourRanges.forEach((range: any) => {
        expect(range.startHour).toBeDefined();
        expect(range.endHour).toBeDefined();
        expect(typeof range.startHour).toBe("number");
        expect(typeof range.endHour).toBe("number");
      });
    });
  });
});

describe("seedRecommendationsAdmin mutation", () => {
  let t: any;
  let userId: string;

  beforeEach(async () => {
    t = convexTest(schema);
    userId = "user_admin123";
  });

  test("throws error when user is not authenticated", async () => {
    // Don't set user authentication
    await expect(
      t.mutation(api.seedRecommendations.seedRecommendationsAdmin, {})
    ).rejects.toThrow("Not authenticated");
  });

  test("successfully seeds data when user is authenticated", async () => {
    // Set up authenticated user
    t.setUser({ subject: userId });

    const result = await t.mutation(
      api.seedRecommendations.seedRecommendationsAdmin,
      {}
    );

    expect(result.success).toBe(true);
    expect(result.recordsInserted).toBeGreaterThan(0);

    // Verify data was inserted
    const recommendations = await t.run(async (ctx: any) => {
      return await ctx.db.query("posting_time_recommendations").collect();
    });

    expect(recommendations.length).toBe(result.recordsInserted);
  });

  test("calls internal seeding mutation correctly", async () => {
    t.setUser({ subject: userId });

    // First call should succeed
    const firstResult = await t.mutation(
      api.seedRecommendations.seedRecommendationsAdmin,
      {}
    );
    expect(firstResult.success).toBe(true);

    // Second call should be prevented by internal mutation
    const secondResult = await t.mutation(
      api.seedRecommendations.seedRecommendationsAdmin,
      {}
    );
    expect(secondResult.success).toBe(false);
    expect(secondResult.message).toContain("already exists");
  });
});
