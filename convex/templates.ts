import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new template
 */
export const createTemplate = mutation({
  args: {
    name: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
  },
  returns: v.id("templates"),
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const clerkUserId = identity.subject;

    // Validate content is non-empty
    if (!args.content.trim()) {
      throw new Error("Template content cannot be empty");
    }

    // Check for duplicate template name for this user
    const existingTemplate = await ctx.db
      .query("templates")
      .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (existingTemplate) {
      throw new Error(`Template with name "${args.name}" already exists`);
    }

    // Create new template
    const templateId = await ctx.db.insert("templates", {
      clerkUserId,
      name: args.name,
      content: args.content,
      tags: args.tags,
      usageCount: 0,
    });

    return templateId;
  },
});

/**
 * Update an existing template
 */
export const updateTemplate = mutation({
  args: {
    templateId: v.id("templates"),
    name: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const clerkUserId = identity.subject;

    // Get the template to verify ownership
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Verify user owns the template
    if (template.clerkUserId !== clerkUserId) {
      throw new Error("Unauthorized: You do not own this template");
    }

    // If name is being changed, check for duplicates
    if (args.name && args.name !== template.name) {
      const existingTemplate = await ctx.db
        .query("templates")
        .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
        .filter((q) => q.eq(q.field("name"), args.name))
        .first();

      if (existingTemplate) {
        throw new Error(`Template with name "${args.name}" already exists`);
      }
    }

    // Validate content is non-empty if being updated
    if (args.content !== undefined && !args.content.trim()) {
      throw new Error("Template content cannot be empty");
    }

    // Build update object with only provided fields
    const updates: Record<string, any> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.content !== undefined) updates.content = args.content;
    if (args.tags !== undefined) updates.tags = args.tags;

    // Update the template
    await ctx.db.patch(args.templateId, updates);

    return true;
  },
});

/**
 * Delete a template
 */
export const deleteTemplate = mutation({
  args: {
    templateId: v.id("templates"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const clerkUserId = identity.subject;

    // Get the template to verify ownership
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Verify user owns the template
    if (template.clerkUserId !== clerkUserId) {
      throw new Error("Unauthorized: You do not own this template");
    }

    // Delete the template
    await ctx.db.delete(args.templateId);

    return true;
  },
});

/**
 * Get user's templates, optionally filtered by tag
 */
export const getTemplates = query({
  args: {
    tag: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("templates"),
      _creationTime: v.number(),
      clerkUserId: v.string(),
      name: v.string(),
      content: v.string(),
      tags: v.array(v.string()),
      lastUsedAt: v.optional(v.number()),
      usageCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const clerkUserId = identity.subject;

    // Query all user's templates using index
    let templates = await ctx.db
      .query("templates")
      .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();

    // Filter by tag if specified
    if (args.tag) {
      templates = templates.filter((template) =>
        template.tags.includes(args.tag as string)
      );
    }

    // Sort by name (A-Z)
    templates.sort((a, b) => a.name.localeCompare(b.name));

    return templates;
  },
});

/**
 * Increment template usage count and update last used timestamp
 */
export const incrementTemplateUsage = mutation({
  args: {
    templateId: v.id("templates"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const clerkUserId = identity.subject;

    // Get the template to verify ownership
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Verify user owns the template
    if (template.clerkUserId !== clerkUserId) {
      throw new Error("Unauthorized: You do not own this template");
    }

    // Update lastUsedAt and increment usageCount
    await ctx.db.patch(args.templateId, {
      lastUsedAt: Date.now(),
      usageCount: template.usageCount + 1,
    });

    return true;
  },
});
