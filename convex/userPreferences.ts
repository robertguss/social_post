import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get user preferences for the authenticated user
 * Returns null if no preferences have been set yet (first time user)
 */
export const getUserPreferences = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("user_preferences"),
      _creationTime: v.number(),
      clerkUserId: v.string(),
      enableContentPrePopulation: v.boolean(),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const prefs = await ctx.db
      .query("user_preferences")
      .withIndex("by_user", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    return prefs || null;
  },
});

/**
 * Update user preferences for the authenticated user
 * Creates new preferences record if none exists yet
 */
export const updateUserPreferences = mutation({
  args: {
    enableContentPrePopulation: v.optional(v.boolean()),
    // Other preference fields can be added here as they're implemented
  },
  returns: v.id("user_preferences"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("user_preferences")
      .withIndex("by_user", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (existing) {
      // Update existing preferences
      await ctx.db.patch(existing._id, args);
      return existing._id;
    } else {
      // Create new preferences with defaults
      const newId = await ctx.db.insert("user_preferences", {
        clerkUserId: identity.subject,
        enableContentPrePopulation: args.enableContentPrePopulation ?? true,
      });
      return newId;
    }
  },
});
