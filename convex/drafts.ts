import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Save a draft post (create new or update existing)
 *
 * Allows users to save work-in-progress posts without scheduling them.
 * Drafts can be edited and eventually scheduled when ready.
 */
export const saveDraft = mutation({
  args: {
    draftId: v.optional(v.id("posts")),
    twitterContent: v.string(),
    linkedInContent: v.string(),
    url: v.optional(v.string()),
  },
  returns: v.id("posts"),
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();

    if (args.draftId) {
      // Update existing draft
      const existing = await ctx.db.get(args.draftId);
      if (!existing) {
        throw new Error("Draft not found");
      }
      if (existing.userId !== identity.subject) {
        throw new Error("Unauthorized");
      }

      await ctx.db.patch(args.draftId, {
        twitterContent: args.twitterContent,
        linkedInContent: args.linkedInContent,
        url: args.url,
        lastEditedTime: now,
      });

      return args.draftId;
    } else {
      // Create new draft
      const draftId = await ctx.db.insert("posts", {
        userId: identity.subject,
        status: "draft",
        twitterContent: args.twitterContent,
        linkedInContent: args.linkedInContent,
        url: args.url,
        lastEditedTime: now,
        // Scheduled times are undefined/null for drafts
      });

      return draftId;
    }
  },
});

/**
 * Get all draft posts for the authenticated user
 *
 * Returns drafts sorted by last edited time (most recent first)
 */
export const getDrafts = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("posts"),
      _creationTime: v.number(),
      userId: v.string(),
      status: v.string(),
      twitterContent: v.optional(v.string()),
      linkedInContent: v.optional(v.string()),
      url: v.optional(v.string()),
      lastEditedTime: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Query drafts using index
    const drafts = await ctx.db
      .query("posts")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", identity.subject).eq("status", "draft")
      )
      .collect();

    // Sort by lastEditedTime descending (most recent first)
    return drafts.sort((a, b) => {
      const timeA = a.lastEditedTime || a._creationTime;
      const timeB = b.lastEditedTime || b._creationTime;
      return timeB - timeA;
    });
  },
});

/**
 * Get a single draft by ID
 *
 * Used for loading draft data when resuming editing
 */
export const getDraftById = query({
  args: {
    draftId: v.id("posts"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("posts"),
      _creationTime: v.number(),
      userId: v.string(),
      status: v.string(),
      twitterContent: v.optional(v.string()),
      linkedInContent: v.optional(v.string()),
      url: v.optional(v.string()),
      lastEditedTime: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      return null;
    }

    // Verify ownership
    if (draft.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    return draft;
  },
});

/**
 * Delete a draft post
 *
 * Only drafts can be deleted (not scheduled/published posts)
 */
export const deleteDraft = mutation({
  args: {
    draftId: v.id("posts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      throw new Error("Draft not found");
    }
    if (draft.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }
    if (draft.status !== "draft") {
      throw new Error("Can only delete drafts");
    }

    await ctx.db.delete(args.draftId);
    return null;
  },
});
