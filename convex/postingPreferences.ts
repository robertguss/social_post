import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Sets or updates a posting time preference for a user
 * Creates new preference or updates existing one for the same platform/day combination
 */
export const setPostingPreference = mutation({
  args: {
    platform: v.string(), // "twitter" | "linkedin"
    dayOfWeek: v.number(), // 0-6 (Sunday=0, Saturday=6)
    customTimeRanges: v.array(
      v.object({
        startHour: v.number(), // 0-23 in user's local timezone
        endHour: v.number(), // 0-23 in user's local timezone
      })
    ),
  },
  returns: v.id("posting_preferences"),
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Validate dayOfWeek range (0-6)
    if (args.dayOfWeek < 0 || args.dayOfWeek > 6) {
      throw new Error("Invalid day of week. Must be between 0 (Sunday) and 6 (Saturday)");
    }

    // Validate platform
    if (args.platform !== "twitter" && args.platform !== "linkedin") {
      throw new Error("Invalid platform. Must be 'twitter' or 'linkedin'");
    }

    // Validate time ranges
    for (const range of args.customTimeRanges) {
      if (range.startHour < 0 || range.startHour > 23) {
        throw new Error("Invalid startHour. Must be between 0 and 23");
      }
      if (range.endHour < 0 || range.endHour > 23) {
        throw new Error("Invalid endHour. Must be between 0 and 23");
      }
      if (range.startHour >= range.endHour) {
        throw new Error("startHour must be less than endHour");
      }
    }

    // Check for existing preference with same platform/day combination
    const existing = await ctx.db
      .query("posting_preferences")
      .withIndex("by_user_platform_day", (q) =>
        q
          .eq("userId", userId)
          .eq("platform", args.platform)
          .eq("dayOfWeek", args.dayOfWeek)
      )
      .first();

    if (existing) {
      // Update existing preference
      await ctx.db.patch(existing._id, {
        customTimeRanges: args.customTimeRanges,
      });
      return existing._id;
    } else {
      // Create new preference
      return await ctx.db.insert("posting_preferences", {
        userId,
        platform: args.platform,
        dayOfWeek: args.dayOfWeek,
        customTimeRanges: args.customTimeRanges,
      });
    }
  },
});

/**
 * Deletes a specific posting time preference
 */
export const deletePostingPreference = mutation({
  args: {
    preferenceId: v.id("posting_preferences"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Get preference to verify ownership
    const preference = await ctx.db.get(args.preferenceId);
    if (!preference) {
      throw new Error("Preference not found");
    }

    // Verify user owns this preference
    if (preference.userId !== userId) {
      throw new Error("Unauthorized: You can only delete your own preferences");
    }

    // Delete the preference
    await ctx.db.delete(args.preferenceId);
    return null;
  },
});

/**
 * Resets all posting time preferences for the authenticated user
 * This will revert all recommendations back to research-based defaults
 */
export const resetAllPostingPreferences = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Get all user preferences
    const userPreferences = await ctx.db
      .query("posting_preferences")
      .withIndex("by_user_platform", (q) => q.eq("userId", userId))
      .collect();

    // Delete all preferences
    for (const pref of userPreferences) {
      await ctx.db.delete(pref._id);
    }

    return null;
  },
});

/**
 * Gets all posting time preferences for the authenticated user
 * Optionally filter by platform
 */
export const getPostingPreferences = query({
  args: {
    platform: v.optional(v.string()), // Optional filter by platform
  },
  returns: v.array(
    v.object({
      _id: v.id("posting_preferences"),
      _creationTime: v.number(),
      userId: v.string(),
      platform: v.string(),
      dayOfWeek: v.number(),
      customTimeRanges: v.array(
        v.object({
          startHour: v.number(),
          endHour: v.number(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Build query with optional platform filter
    let query;
    if (args.platform) {
      const platform = args.platform;
      query = ctx.db
        .query("posting_preferences")
        .withIndex("by_user_platform", (q) =>
          q.eq("userId", userId).eq("platform", platform)
        );
    } else {
      // Get all preferences for user across all platforms
      query = ctx.db
        .query("posting_preferences")
        .withIndex("by_user_platform", (q) => q.eq("userId", userId));
    }

    return await query.collect();
  },
});
