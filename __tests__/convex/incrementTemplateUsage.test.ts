/**
 * Unit Tests for incrementTemplateUsage Mutation
 *
 * Tests the incrementTemplateUsage mutation in convex/templates.ts
 */

import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import schema from "@/convex/schema";
import { api } from "@/convex/_generated/api";

describe("incrementTemplateUsage mutation", () => {
  let t: any;
  let userId: string;
  let templateId: any;

  beforeEach(async () => {
    t = convexTest(schema);
    userId = "user_test123";

    // Set up authenticated user context
    t.setUser({ subject: userId });

    // Create a test template
    templateId = await t.mutation(api.templates.createTemplate, {
      name: "Test Template",
      content: "Test content for template",
      tags: ["test", "demo"],
    });
  });

  test("increments usage count and updates lastUsedAt", async () => {
    // Get initial template state
    const initialTemplate = await t.run(async (ctx: any) => {
      return await ctx.db.get(templateId);
    });

    expect(initialTemplate.usageCount).toBe(0);
    expect(initialTemplate.lastUsedAt).toBeUndefined();

    // Call incrementTemplateUsage
    const result = await t.mutation(api.templates.incrementTemplateUsage, {
      templateId,
    });

    expect(result).toBe(true);

    // Get updated template
    const updatedTemplate = await t.run(async (ctx: any) => {
      return await ctx.db.get(templateId);
    });

    expect(updatedTemplate.usageCount).toBe(1);
    expect(updatedTemplate.lastUsedAt).toBeDefined();
    expect(typeof updatedTemplate.lastUsedAt).toBe("number");
    expect(updatedTemplate.lastUsedAt).toBeGreaterThan(0);
  });

  test("increments usage count multiple times correctly", async () => {
    // First increment
    await t.mutation(api.templates.incrementTemplateUsage, {
      templateId,
    });

    // Second increment
    await t.mutation(api.templates.incrementTemplateUsage, {
      templateId,
    });

    // Third increment
    await t.mutation(api.templates.incrementTemplateUsage, {
      templateId,
    });

    // Get updated template
    const updatedTemplate = await t.run(async (ctx: any) => {
      return await ctx.db.get(templateId);
    });

    expect(updatedTemplate.usageCount).toBe(3);
  });

  test("updates lastUsedAt timestamp on each call", async () => {
    // First call
    await t.mutation(api.templates.incrementTemplateUsage, {
      templateId,
    });

    const firstTemplate = await t.run(async (ctx: any) => {
      return await ctx.db.get(templateId);
    });
    const firstTimestamp = firstTemplate.lastUsedAt;

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Second call
    await t.mutation(api.templates.incrementTemplateUsage, {
      templateId,
    });

    const secondTemplate = await t.run(async (ctx: any) => {
      return await ctx.db.get(templateId);
    });
    const secondTimestamp = secondTemplate.lastUsedAt;

    expect(secondTimestamp).toBeGreaterThan(firstTimestamp);
  });

  test("throws error when template not found", async () => {
    const fakeTemplateId = "invalid_template_id" as any;

    await expect(
      t.mutation(api.templates.incrementTemplateUsage, {
        templateId: fakeTemplateId,
      })
    ).rejects.toThrow("Template not found");
  });

  test("throws error when user is not authenticated", async () => {
    // Remove user authentication
    t.clearUser();

    await expect(
      t.mutation(api.templates.incrementTemplateUsage, {
        templateId,
      })
    ).rejects.toThrow("Not authenticated");
  });

  test("throws error when user does not own the template", async () => {
    // Create template as first user
    const firstUserId = "user_first123";
    t.setUser({ subject: firstUserId });

    const firstUserTemplateId = await t.mutation(api.templates.createTemplate, {
      name: "First User Template",
      content: "Content from first user",
      tags: ["test"],
    });

    // Switch to different user
    const secondUserId = "user_second456";
    t.setUser({ subject: secondUserId });

    // Try to increment usage count on first user's template
    await expect(
      t.mutation(api.templates.incrementTemplateUsage, {
        templateId: firstUserTemplateId,
      })
    ).rejects.toThrow("Unauthorized: You do not own this template");
  });

  test("successfully increments usage when user owns the template", async () => {
    const result = await t.mutation(api.templates.incrementTemplateUsage, {
      templateId,
    });

    expect(result).toBe(true);

    const template = await t.run(async (ctx: any) => {
      return await ctx.db.get(templateId);
    });

    expect(template.usageCount).toBe(1);
    expect(template.clerkUserId).toBe(userId);
  });

  test("preserves other template fields during update", async () => {
    // Get initial template
    const initialTemplate = await t.run(async (ctx: any) => {
      return await ctx.db.get(templateId);
    });

    // Increment usage
    await t.mutation(api.templates.incrementTemplateUsage, {
      templateId,
    });

    // Get updated template
    const updatedTemplate = await t.run(async (ctx: any) => {
      return await ctx.db.get(templateId);
    });

    // Verify other fields are unchanged
    expect(updatedTemplate.name).toBe(initialTemplate.name);
    expect(updatedTemplate.content).toBe(initialTemplate.content);
    expect(updatedTemplate.tags).toEqual(initialTemplate.tags);
    expect(updatedTemplate.clerkUserId).toBe(initialTemplate.clerkUserId);
    expect(updatedTemplate._id).toBe(initialTemplate._id);
  });

  test("handles rapid successive increments correctly", async () => {
    // Simulate rapid template usage (e.g., user inserting same template multiple times quickly)
    const promises = Array.from({ length: 5 }, () =>
      t.mutation(api.templates.incrementTemplateUsage, {
        templateId,
      })
    );

    await Promise.all(promises);

    const template = await t.run(async (ctx: any) => {
      return await ctx.db.get(templateId);
    });

    expect(template.usageCount).toBe(5);
  });

  test("returns true on successful increment", async () => {
    const result = await t.mutation(api.templates.incrementTemplateUsage, {
      templateId,
    });

    expect(result).toBe(true);
  });
});
