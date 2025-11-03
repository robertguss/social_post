import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("Posting Preferences - Unit Tests", () => {
  describe("setPostingPreference mutation", () => {
    test("should create a new preference with valid data", async () => {
      const t = convexTest(schema, modules);

      // Set up authenticated user
      const asUser = t.withIdentity({ subject: "user123" });

      // Create preference
      const preferenceId = await asUser.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1, // Monday
        customTimeRanges: [{ startHour: 7, endHour: 9 }],
      });

      expect(preferenceId).toBeDefined();

      // Verify preference was created
      const preferences = await asUser.query(api.postingPreferences.getPostingPreferences, {});
      expect(preferences).toHaveLength(1);
      expect(preferences[0].platform).toBe("twitter");
      expect(preferences[0].dayOfWeek).toBe(1);
      expect(preferences[0].customTimeRanges).toEqual([{ startHour: 7, endHour: 9 }]);
    });

    test("should update existing preference for same platform/day", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      // Create initial preference
      await asUser.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1,
        customTimeRanges: [{ startHour: 7, endHour: 9 }],
      });

      // Update with new time ranges
      await asUser.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1,
        customTimeRanges: [{ startHour: 17, endHour: 19 }],
      });

      // Verify only one preference exists with updated ranges
      const preferences = await asUser.query(api.postingPreferences.getPostingPreferences, {});
      expect(preferences).toHaveLength(1);
      expect(preferences[0].customTimeRanges).toEqual([{ startHour: 17, endHour: 19 }]);
    });

    test("should allow multiple time ranges for same preference", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      await asUser.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1,
        customTimeRanges: [
          { startHour: 7, endHour: 9 },
          { startHour: 17, endHour: 19 },
        ],
      });

      const preferences = await asUser.query(api.postingPreferences.getPostingPreferences, {});
      expect(preferences[0].customTimeRanges).toHaveLength(2);
    });

    test("should throw error for invalid dayOfWeek < 0", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.mutation(api.postingPreferences.setPostingPreference, {
          platform: "twitter",
          dayOfWeek: -1,
          customTimeRanges: [{ startHour: 7, endHour: 9 }],
        })
      ).rejects.toThrow("Invalid day of week");
    });

    test("should throw error for invalid dayOfWeek > 6", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.mutation(api.postingPreferences.setPostingPreference, {
          platform: "twitter",
          dayOfWeek: 7,
          customTimeRanges: [{ startHour: 7, endHour: 9 }],
        })
      ).rejects.toThrow("Invalid day of week");
    });

    test("should throw error for invalid platform", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.mutation(api.postingPreferences.setPostingPreference, {
          platform: "facebook" as any,
          dayOfWeek: 1,
          customTimeRanges: [{ startHour: 7, endHour: 9 }],
        })
      ).rejects.toThrow("Invalid platform");
    });

    test("should throw error for startHour < 0", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.mutation(api.postingPreferences.setPostingPreference, {
          platform: "twitter",
          dayOfWeek: 1,
          customTimeRanges: [{ startHour: -1, endHour: 9 }],
        })
      ).rejects.toThrow("Invalid startHour");
    });

    test("should throw error for startHour > 23", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.mutation(api.postingPreferences.setPostingPreference, {
          platform: "twitter",
          dayOfWeek: 1,
          customTimeRanges: [{ startHour: 24, endHour: 9 }],
        })
      ).rejects.toThrow("Invalid startHour");
    });

    test("should throw error for endHour < 0", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.mutation(api.postingPreferences.setPostingPreference, {
          platform: "twitter",
          dayOfWeek: 1,
          customTimeRanges: [{ startHour: 7, endHour: -1 }],
        })
      ).rejects.toThrow("Invalid endHour");
    });

    test("should throw error for endHour > 23", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.mutation(api.postingPreferences.setPostingPreference, {
          platform: "twitter",
          dayOfWeek: 1,
          customTimeRanges: [{ startHour: 7, endHour: 24 }],
        })
      ).rejects.toThrow("Invalid endHour");
    });

    test("should throw error for startHour >= endHour", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.mutation(api.postingPreferences.setPostingPreference, {
          platform: "twitter",
          dayOfWeek: 1,
          customTimeRanges: [{ startHour: 9, endHour: 9 }],
        })
      ).rejects.toThrow("startHour must be less than endHour");
    });

    test("should throw error for unauthenticated user", async () => {
      const t = convexTest(schema, modules);

      await expect(
        t.mutation(api.postingPreferences.setPostingPreference, {
          platform: "twitter",
          dayOfWeek: 1,
          customTimeRanges: [{ startHour: 7, endHour: 9 }],
        })
      ).rejects.toThrow("Not authenticated");
    });
  });

  describe("deletePostingPreference mutation", () => {
    test("should delete a preference successfully", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      // Create preference
      const preferenceId = await asUser.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1,
        customTimeRanges: [{ startHour: 7, endHour: 9 }],
      });

      // Delete preference
      await asUser.mutation(api.postingPreferences.deletePostingPreference, {
        preferenceId,
      });

      // Verify preference was deleted
      const preferences = await asUser.query(api.postingPreferences.getPostingPreferences, {});
      expect(preferences).toHaveLength(0);
    });

    test("should throw error when deleting another user's preference", async () => {
      const t = convexTest(schema, modules);
      const asUser1 = t.withIdentity({ subject: "user123" });
      const asUser2 = t.withIdentity({ subject: "user456" });

      // User 1 creates preference
      const preferenceId = await asUser1.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1,
        customTimeRanges: [{ startHour: 7, endHour: 9 }],
      });

      // User 2 tries to delete it
      await expect(
        asUser2.mutation(api.postingPreferences.deletePostingPreference, {
          preferenceId,
        })
      ).rejects.toThrow("Unauthorized");
    });

    test("should throw error for non-existent preference", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.mutation(api.postingPreferences.deletePostingPreference, {
          preferenceId: "jx7abcdef123456789" as any, // Fake ID
        })
      ).rejects.toThrow("Preference not found");
    });
  });

  describe("resetAllPostingPreferences mutation", () => {
    test("should delete all user preferences", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      // Create multiple preferences
      await asUser.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1,
        customTimeRanges: [{ startHour: 7, endHour: 9 }],
      });
      await asUser.mutation(api.postingPreferences.setPostingPreference, {
        platform: "linkedin",
        dayOfWeek: 2,
        customTimeRanges: [{ startHour: 14, endHour: 16 }],
      });

      // Reset all
      await asUser.mutation(api.postingPreferences.resetAllPostingPreferences, {});

      // Verify all deleted
      const preferences = await asUser.query(api.postingPreferences.getPostingPreferences, {});
      expect(preferences).toHaveLength(0);
    });

    test("should only delete current user's preferences", async () => {
      const t = convexTest(schema, modules);
      const asUser1 = t.withIdentity({ subject: "user123" });
      const asUser2 = t.withIdentity({ subject: "user456" });

      // Both users create preferences
      await asUser1.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1,
        customTimeRanges: [{ startHour: 7, endHour: 9 }],
      });
      await asUser2.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1,
        customTimeRanges: [{ startHour: 7, endHour: 9 }],
      });

      // User 1 resets
      await asUser1.mutation(api.postingPreferences.resetAllPostingPreferences, {});

      // Verify user 1 has no preferences
      const user1Prefs = await asUser1.query(api.postingPreferences.getPostingPreferences, {});
      expect(user1Prefs).toHaveLength(0);

      // Verify user 2 still has preferences
      const user2Prefs = await asUser2.query(api.postingPreferences.getPostingPreferences, {});
      expect(user2Prefs).toHaveLength(1);
    });
  });

  describe("getPostingPreferences query", () => {
    test("should return all user preferences", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      // Create multiple preferences
      await asUser.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1,
        customTimeRanges: [{ startHour: 7, endHour: 9 }],
      });
      await asUser.mutation(api.postingPreferences.setPostingPreference, {
        platform: "linkedin",
        dayOfWeek: 2,
        customTimeRanges: [{ startHour: 14, endHour: 16 }],
      });

      const preferences = await asUser.query(api.postingPreferences.getPostingPreferences, {});
      expect(preferences).toHaveLength(2);
    });

    test("should filter by platform", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      // Create preferences for both platforms
      await asUser.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1,
        customTimeRanges: [{ startHour: 7, endHour: 9 }],
      });
      await asUser.mutation(api.postingPreferences.setPostingPreference, {
        platform: "linkedin",
        dayOfWeek: 2,
        customTimeRanges: [{ startHour: 14, endHour: 16 }],
      });

      // Filter by twitter
      const twitterPrefs = await asUser.query(api.postingPreferences.getPostingPreferences, {
        platform: "twitter",
      });
      expect(twitterPrefs).toHaveLength(1);
      expect(twitterPrefs[0].platform).toBe("twitter");
    });

    test("should only return current user's preferences", async () => {
      const t = convexTest(schema, modules);
      const asUser1 = t.withIdentity({ subject: "user123" });
      const asUser2 = t.withIdentity({ subject: "user456" });

      // Both users create preferences
      await asUser1.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1,
        customTimeRanges: [{ startHour: 7, endHour: 9 }],
      });
      await asUser2.mutation(api.postingPreferences.setPostingPreference, {
        platform: "twitter",
        dayOfWeek: 1,
        customTimeRanges: [{ startHour: 7, endHour: 9 }],
      });

      // Each user should only see their own
      const user1Prefs = await asUser1.query(api.postingPreferences.getPostingPreferences, {});
      const user2Prefs = await asUser2.query(api.postingPreferences.getPostingPreferences, {});

      expect(user1Prefs).toHaveLength(1);
      expect(user2Prefs).toHaveLength(1);
      expect(user1Prefs[0].clerkUserId).toBe("user123");
      expect(user2Prefs[0].clerkUserId).toBe("user456");
    });

    test("should return empty array for user with no preferences", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      const preferences = await asUser.query(api.postingPreferences.getPostingPreferences, {});
      expect(preferences).toHaveLength(0);
    });
  });
});
