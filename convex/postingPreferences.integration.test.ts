/**
 * Integration tests for posting preferences with recommendation algorithm
 *
 * Tests validate that user preferences properly integrate with the
 * recommendation algorithm and prioritize custom preferences over defaults.
 *
 * Story 6.5 - Acceptance Criteria 4 & 7
 */

import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("Posting Preferences Integration Tests", () => {
  describe("Recommendation prioritization with custom preferences", () => {
    test("should prioritize user preferences over research-based recommendations", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      // Create a custom preference for Twitter Monday
      await asUser.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1, // Monday
        customTimeRanges: [{ startHour: 7, endHour: 9 }],
      });

      // Get recommendations for Twitter Monday
      const recommendations = await asUser.query(api.recommendations.getRecommendedTimes, {
        date: "2025-11-17", // Monday
        platform: "twitter",
        userTimezone: "America/New_York",
      });

      // Verify that custom preference appears first with high score
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);

      // Find user preference in recommendations
      const userPrefRec = recommendations.find((rec) => rec.source === "user preference");
      expect(userPrefRec).toBeDefined();
      expect(userPrefRec?.engagementScore).toBe(95); // High priority score
    });

    test("should fallback to research-based when no custom preferences exist", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      // Ensure seeded recommendations exist (from Story 6.1)
      // This test assumes posting_time_recommendations table is seeded

      // Get recommendations without custom preferences
      const recommendations = await asUser.query(api.recommendations.getRecommendedTimes, {
        date: "2025-11-17", // Monday
        platform: "twitter",
        userTimezone: "America/New_York",
      });

      // All recommendations should be research-based
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.every((rec) => rec.source !== "user preference")).toBe(true);
    });

    test("should mix custom preferences with research-based if fewer than 3 custom", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      // Create only 1 custom preference (fewer than 3)
      await asUser.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1,
        customTimeRanges: [{ startHour: 7, endHour: 9 }], // Only 1 time range
      });

      // Get recommendations
      const recommendations = await asUser.query(api.recommendations.getRecommendedTimes, {
        date: "2025-11-17", // Monday
        platform: "twitter",
        userTimezone: "America/New_York",
      });

      // Should have 3 total recommendations
      expect(recommendations).toHaveLength(3);

      // First recommendation should be user preference
      const userPrefRec = recommendations.find((rec) => rec.source === "user preference");
      expect(userPrefRec).toBeDefined();

      // Remaining should be research-based
      const researchRecs = recommendations.filter((rec) => rec.source !== "user preference");
      expect(researchRecs.length).toBeGreaterThan(0);
    });

    test("should allow multiple custom time ranges for same day", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      // Create preference with multiple time ranges
      await asUser.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1,
        customTimeRanges: [
          { startHour: 7, endHour: 9 }, // Morning
          { startHour: 17, endHour: 19 }, // Evening
        ],
      });

      // Get recommendations
      const recommendations = await asUser.query(api.recommendations.getRecommendedTimes, {
        date: "2025-11-17", // Monday
        platform: "twitter",
        userTimezone: "America/New_York",
      });

      // Should include both custom time ranges
      const userPrefs = recommendations.filter((rec) => rec.source === "user preference");
      expect(userPrefs.length).toBe(2);
    });
  });

  describe("Realtime update verification", () => {
    test("should immediately reflect preference addition in recommendations", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      // Get initial recommendations (should be research-based)
      const initialRecs = await asUser.query(api.recommendations.getRecommendedTimes, {
        date: "2025-11-17",
        platform: "twitter",
        userTimezone: "America/New_York",
      });

      const initialUserPrefs = initialRecs.filter((rec) => rec.source === "user preference");
      expect(initialUserPrefs).toHaveLength(0);

      // Add a custom preference
      await asUser.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1,
        customTimeRanges: [{ startHour: 7, endHour: 9 }],
      });

      // Get updated recommendations
      const updatedRecs = await asUser.query(api.recommendations.getRecommendedTimes, {
        date: "2025-11-17",
        platform: "twitter",
        userTimezone: "America/New_York",
      });

      // Should now include user preference
      const updatedUserPrefs = updatedRecs.filter((rec) => rec.source === "user preference");
      expect(updatedUserPrefs.length).toBeGreaterThan(0);
    });

    test("should immediately reflect preference deletion in recommendations", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      // Create preference
      const prefId = await asUser.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1,
        customTimeRanges: [{ startHour: 7, endHour: 9 }],
      });

      // Verify it appears in recommendations
      const recsWithPref = await asUser.query(api.recommendations.getRecommendedTimes, {
        date: "2025-11-17",
        platform: "twitter",
        userTimezone: "America/New_York",
      });

      const userPrefs = recsWithPref.filter((rec) => rec.source === "user preference");
      expect(userPrefs.length).toBeGreaterThan(0);

      // Delete preference
      await asUser.mutation(api.postingPreferences.deletePostingPreference, {
        preferenceId: prefId,
      });

      // Get updated recommendations
      const recsAfterDelete = await asUser.query(api.recommendations.getRecommendedTimes, {
        date: "2025-11-17",
        platform: "twitter",
        userTimezone: "America/New_York",
      });

      // User preferences should be gone
      const userPrefsAfterDelete = recsAfterDelete.filter(
        (rec) => rec.source === "user preference"
      );
      expect(userPrefsAfterDelete).toHaveLength(0);
    });
  });

  describe("Authentication and data scoping", () => {
    test("should only show user's own preferences in recommendations", async () => {
      const t = convexTest(schema, modules);
      const asUser1 = t.withIdentity({ subject: "user123" });
      const asUser2 = t.withIdentity({ subject: "user456" });

      // User 1 creates preference
      await asUser1.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1,
        customTimeRanges: [{ startHour: 7, endHour: 9 }],
      });

      // User 2 creates different preference
      await asUser2.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1,
        customTimeRanges: [{ startHour: 14, endHour: 16 }],
      });

      // User 1's recommendations should only include their preference
      const user1Recs = await asUser1.query(api.recommendations.getRecommendedTimes, {
        date: "2025-11-17",
        platform: "twitter",
        userTimezone: "America/New_York",
      });

      const user1Prefs = user1Recs.filter((rec) => rec.source === "user preference");
      expect(user1Prefs.length).toBeGreaterThan(0);
      // Verify time range matches user1's preference (7-9am)
      expect(user1Prefs[0].timeRange).toContain("7");

      // User 2's recommendations should only include their preference
      const user2Recs = await asUser2.query(api.recommendations.getRecommendedTimes, {
        date: "2025-11-17",
        platform: "twitter",
        userTimezone: "America/New_York",
      });

      const user2Prefs = user2Recs.filter((rec) => rec.source === "user preference");
      expect(user2Prefs.length).toBeGreaterThan(0);
      // Verify time range matches user2's preference (2-4pm / 14-16)
      expect(user2Prefs[0].timeRange).toContain("2"); // 2 PM
    });

    test("should require authentication for all mutations and queries", async () => {
      const t = convexTest(schema, modules);

      // Unauthenticated requests should fail
      await expect(
        t.mutation(api.postingPreferences.setPostingPreference, {
          platform: "twitter",
          dayOfWeek: 1,
          customTimeRanges: [{ startHour: 7, endHour: 9 }],
        })
      ).rejects.toThrow("Not authenticated");

      await expect(t.query(api.postingPreferences.getPostingPreferences, {})).rejects.toThrow(
        "Not authenticated"
      );

      await expect(
        t.query(api.recommendations.getRecommendedTimes, {
          date: "2025-11-17",
          platform: "twitter",
          userTimezone: "America/New_York",
        })
      ).rejects.toThrow("Not authenticated");
    });
  });

  describe("Platform and day specificity", () => {
    test("should only apply preferences for matching platform", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      // Create preference for Twitter only
      await asUser.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1,
        customTimeRanges: [{ startHour: 7, endHour: 9 }],
      });

      // Twitter recommendations should include preference
      const twitterRecs = await asUser.query(api.recommendations.getRecommendedTimes, {
        date: "2025-11-17", // Monday
        platform: "twitter",
        userTimezone: "America/New_York",
      });

      const twitterUserPrefs = twitterRecs.filter((rec) => rec.source === "user preference");
      expect(twitterUserPrefs.length).toBeGreaterThan(0);

      // LinkedIn recommendations should NOT include twitter preference
      const linkedInRecs = await asUser.query(api.recommendations.getRecommendedTimes, {
        date: "2025-11-17", // Monday
        platform: "linkedin",
        userTimezone: "America/New_York",
      });

      const linkedInUserPrefs = linkedInRecs.filter((rec) => rec.source === "user preference");
      expect(linkedInUserPrefs).toHaveLength(0);
    });

    test("should only apply preferences for matching day of week", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      // Create preference for Monday only
      await asUser.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1, // Monday
        customTimeRanges: [{ startHour: 7, endHour: 9 }],
      });

      // Monday recommendations should include preference
      const mondayRecs = await asUser.query(api.recommendations.getRecommendedTimes, {
        date: "2025-11-17", // Monday
        platform: "twitter",
        userTimezone: "America/New_York",
      });

      const mondayUserPrefs = mondayRecs.filter((rec) => rec.source === "user preference");
      expect(mondayUserPrefs.length).toBeGreaterThan(0);

      // Tuesday recommendations should NOT include Monday preference
      const tuesdayRecs = await asUser.query(api.recommendations.getRecommendedTimes, {
        date: "2025-11-18", // Tuesday
        platform: "twitter",
        userTimezone: "America/New_York",
      });

      const tuesdayUserPrefs = tuesdayRecs.filter((rec) => rec.source === "user preference");
      expect(tuesdayUserPrefs).toHaveLength(0);
    });
  });
});
