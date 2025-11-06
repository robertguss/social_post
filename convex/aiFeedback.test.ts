/**
 * Integration Tests for AI Feedback Submission (Story 7.6)
 *
 * Tests cover:
 * - Successful feedback submission
 * - Authentication requirements
 * - Input validation (required fields, valid enum values)
 * - Feedback type validation
 * - Optional feedback text handling
 * - Database storage verification
 */

import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

// Add aiFeedback to modules for testing
const testModules = {
  ...modules,
  aiFeedback: async () => import("./aiFeedback"),
};

describe("AI Feedback Submission", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(async () => {
    t = convexTest(schema, testModules);
  });

  describe("Authentication", () => {
    test("should reject unauthenticated requests", async () => {
      await expect(
        t.mutation(api.aiFeedback.submitAIFeedback, {
          feature: "tone",
          requestId: "test-request-123",
          originalContent: "Original text",
          aiResponse: "AI-generated text",
          feedbackType: "low-quality",
        }),
      ).rejects.toThrow("Not authenticated");
    });

    test("should accept authenticated requests", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "tone",
        requestId: "test-request-123",
        originalContent: "Original text",
        aiResponse: "AI-generated text",
        feedbackType: "low-quality",
      });

      expect(result.success).toBe(true);
      expect(result.feedbackId).toBeDefined();
    });
  });

  describe("Input Validation - Feature Type", () => {
    test("should accept 'tone' as feature type", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "tone",
        requestId: "test-request-123",
        originalContent: "Original text",
        aiResponse: "AI-generated text",
        feedbackType: "low-quality",
      });

      expect(result.success).toBe(true);

      // Verify stored in database
      const feedback = await asUser.run(async (ctx) => {
        return await ctx.db.get(result.feedbackId);
      });

      expect(feedback).toBeDefined();
      expect(feedback?.feature).toBe("tone");
    });

    test("should accept 'expand' as feature type", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "expand",
        requestId: "test-request-123",
        originalContent: "Original text",
        aiResponse: "AI-generated text",
        feedbackType: "inappropriate",
      });

      expect(result.success).toBe(true);

      const feedback = await asUser.run(async (ctx) => {
        return await ctx.db.get(result.feedbackId);
      });

      expect(feedback?.feature).toBe("expand");
    });

    test("should accept 'hashtags' as feature type", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "hashtags",
        requestId: "test-request-123",
        originalContent: "Original text",
        aiResponse: "AI-generated text",
        feedbackType: "other",
      });

      expect(result.success).toBe(true);

      const feedback = await asUser.run(async (ctx) => {
        return await ctx.db.get(result.feedbackId);
      });

      expect(feedback?.feature).toBe("hashtags");
    });
  });

  describe("Input Validation - Feedback Type", () => {
    test("should accept 'inappropriate' as feedback type", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "tone",
        requestId: "test-request-123",
        originalContent: "Original text",
        aiResponse: "AI-generated text",
        feedbackType: "inappropriate",
      });

      expect(result.success).toBe(true);

      const feedback = await asUser.run(async (ctx) => {
        return await ctx.db.get(result.feedbackId);
      });

      expect(feedback?.feedbackType).toBe("inappropriate");
    });

    test("should accept 'low-quality' as feedback type", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "tone",
        requestId: "test-request-123",
        originalContent: "Original text",
        aiResponse: "AI-generated text",
        feedbackType: "low-quality",
      });

      expect(result.success).toBe(true);

      const feedback = await asUser.run(async (ctx) => {
        return await ctx.db.get(result.feedbackId);
      });

      expect(feedback?.feedbackType).toBe("low-quality");
    });

    test("should accept 'other' as feedback type", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "tone",
        requestId: "test-request-123",
        originalContent: "Original text",
        aiResponse: "AI-generated text",
        feedbackType: "other",
      });

      expect(result.success).toBe(true);

      const feedback = await asUser.run(async (ctx) => {
        return await ctx.db.get(result.feedbackId);
      });

      expect(feedback?.feedbackType).toBe("other");
    });
  });

  describe("Input Validation - Required Fields", () => {
    test("should reject empty requestId", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.mutation(api.aiFeedback.submitAIFeedback, {
          feature: "tone",
          requestId: "",
          originalContent: "Original text",
          aiResponse: "AI-generated text",
          feedbackType: "low-quality",
        }),
      ).rejects.toThrow(/requestId.*required/i);
    });

    test("should reject empty originalContent", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.mutation(api.aiFeedback.submitAIFeedback, {
          feature: "tone",
          requestId: "test-request-123",
          originalContent: "",
          aiResponse: "AI-generated text",
          feedbackType: "low-quality",
        }),
      ).rejects.toThrow(/originalContent.*required/i);
    });

    test("should reject empty aiResponse", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.mutation(api.aiFeedback.submitAIFeedback, {
          feature: "tone",
          requestId: "test-request-123",
          originalContent: "Original text",
          aiResponse: "",
          feedbackType: "low-quality",
        }),
      ).rejects.toThrow(/aiResponse.*required/i);
    });

    test("should reject whitespace-only requestId", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.mutation(api.aiFeedback.submitAIFeedback, {
          feature: "tone",
          requestId: "   \n\t  ",
          originalContent: "Original text",
          aiResponse: "AI-generated text",
          feedbackType: "low-quality",
        }),
      ).rejects.toThrow(/requestId.*required/i);
    });
  });

  describe("Optional Feedback Text", () => {
    test("should accept feedback without optional text", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "tone",
        requestId: "test-request-123",
        originalContent: "Original text",
        aiResponse: "AI-generated text",
        feedbackType: "low-quality",
        // feedbackText intentionally omitted
      });

      expect(result.success).toBe(true);

      const feedback = await asUser.run(async (ctx) => {
        return await ctx.db.get(result.feedbackId);
      });

      expect(feedback?.feedbackText).toBeUndefined();
    });

    test("should accept feedback with optional text", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "tone",
        requestId: "test-request-123",
        originalContent: "Original text",
        aiResponse: "AI-generated text",
        feedbackType: "low-quality",
        feedbackText: "The tone is too formal and doesn't match my brand voice.",
      });

      expect(result.success).toBe(true);

      const feedback = await asUser.run(async (ctx) => {
        return await ctx.db.get(result.feedbackId);
      });

      expect(feedback?.feedbackText).toBe(
        "The tone is too formal and doesn't match my brand voice.",
      );
    });

    test("should trim whitespace from feedback text", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "tone",
        requestId: "test-request-123",
        originalContent: "Original text",
        aiResponse: "AI-generated text",
        feedbackType: "low-quality",
        feedbackText: "  \n  This has leading/trailing whitespace  \n  ",
      });

      expect(result.success).toBe(true);

      const feedback = await asUser.run(async (ctx) => {
        return await ctx.db.get(result.feedbackId);
      });

      expect(feedback?.feedbackText).toBe(
        "This has leading/trailing whitespace",
      );
    });

    test("should treat whitespace-only feedback text as undefined", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "tone",
        requestId: "test-request-123",
        originalContent: "Original text",
        aiResponse: "AI-generated text",
        feedbackType: "low-quality",
        feedbackText: "   \n\t  ",
      });

      expect(result.success).toBe(true);

      const feedback = await asUser.run(async (ctx) => {
        return await ctx.db.get(result.feedbackId);
      });

      expect(feedback?.feedbackText).toBeUndefined();
    });
  });

  describe("Database Storage", () => {
    test("should store all feedback fields correctly", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "expand",
        requestId: "expand-xyz-1234567890",
        originalContent: "Short tweet content",
        aiResponse: "Expanded LinkedIn content with more details",
        feedbackType: "inappropriate",
        feedbackText: "Contains promotional language that doesn't fit my brand",
      });

      expect(result.success).toBe(true);

      const feedback = await asUser.run(async (ctx) => {
        return await ctx.db.get(result.feedbackId);
      });

      expect(feedback).toBeDefined();
      expect(feedback?.userId).toBe("user123");
      expect(feedback?.feature).toBe("expand");
      expect(feedback?.requestId).toBe("expand-xyz-1234567890");
      expect(feedback?.originalContent).toBe("Short tweet content");
      expect(feedback?.aiResponse).toBe(
        "Expanded LinkedIn content with more details",
      );
      expect(feedback?.feedbackType).toBe("inappropriate");
      expect(feedback?.feedbackText).toBe(
        "Contains promotional language that doesn't fit my brand",
      );
      expect(feedback?.timestamp).toBeDefined();
      expect(typeof feedback?.timestamp).toBe("number");
    });

    test("should store timestamp as milliseconds since epoch", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      const beforeTimestamp = Date.now();

      const result = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "tone",
        requestId: "test-request-123",
        originalContent: "Original text",
        aiResponse: "AI-generated text",
        feedbackType: "low-quality",
      });

      const afterTimestamp = Date.now();

      const feedback = await asUser.run(async (ctx) => {
        return await ctx.db.get(result.feedbackId);
      });

      expect(feedback?.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(feedback?.timestamp).toBeLessThanOrEqual(afterTimestamp);
    });

    test("should store userId from authenticated user", async () => {
      const asUser1 = t.withIdentity({ subject: "user-alice" });
      const asUser2 = t.withIdentity({ subject: "user-bob" });

      const result1 = await asUser1.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "tone",
        requestId: "test-request-123",
        originalContent: "Original text",
        aiResponse: "AI-generated text",
        feedbackType: "low-quality",
      });

      const result2 = await asUser2.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "hashtags",
        requestId: "test-request-456",
        originalContent: "Different content",
        aiResponse: "Different AI response",
        feedbackType: "inappropriate",
      });

      const feedback1 = await asUser1.run(async (ctx) => {
        return await ctx.db.get(result1.feedbackId);
      });

      const feedback2 = await asUser2.run(async (ctx) => {
        return await ctx.db.get(result2.feedbackId);
      });

      expect(feedback1?.userId).toBe("user-alice");
      expect(feedback2?.userId).toBe("user-bob");
    });
  });

  describe("Multiple Feedback Submissions", () => {
    test("should allow multiple feedback submissions from same user", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result1 = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "tone",
        requestId: "tone-request-1",
        originalContent: "First content",
        aiResponse: "First AI response",
        feedbackType: "low-quality",
      });

      const result2 = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "expand",
        requestId: "expand-request-2",
        originalContent: "Second content",
        aiResponse: "Second AI response",
        feedbackType: "inappropriate",
      });

      const result3 = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "hashtags",
        requestId: "hashtags-request-3",
        originalContent: "Third content",
        aiResponse: "Third AI response",
        feedbackType: "other",
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);

      // Verify all are unique
      expect(result1.feedbackId).not.toBe(result2.feedbackId);
      expect(result2.feedbackId).not.toBe(result3.feedbackId);
      expect(result1.feedbackId).not.toBe(result3.feedbackId);

      // Verify all stored correctly
      const allFeedback = await asUser.run(async (ctx) => {
        const all = await ctx.db.query("ai_feedback").collect();
        return all.filter((f) => f.userId === "user123");
      });

      expect(allFeedback.length).toBe(3);
    });

    test("should allow duplicate requestIds (same AI request, multiple reports)", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Simulate user submitting feedback twice for the same AI request
      const result1 = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "tone",
        requestId: "tone-abc-12345",
        originalContent: "Test content",
        aiResponse: "AI response",
        feedbackType: "low-quality",
        feedbackText: "First feedback",
      });

      const result2 = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "tone",
        requestId: "tone-abc-12345", // Same request ID
        originalContent: "Test content",
        aiResponse: "AI response",
        feedbackType: "inappropriate",
        feedbackText: "Second feedback for same request",
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.feedbackId).not.toBe(result2.feedbackId);

      const allFeedback = await asUser.run(async (ctx) => {
        const all = await ctx.db.query("ai_feedback").collect();
        return all.filter((f) => f.userId === "user123");
      });

      expect(allFeedback.length).toBe(2);
      expect(allFeedback.every((f) => f.requestId === "tone-abc-12345")).toBe(
        true,
      );
    });
  });

  describe("Content Length Limits", () => {
    test("should accept long originalContent (up to 3000 chars)", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      const longContent = "a".repeat(3000);

      const result = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "expand",
        requestId: "test-request-123",
        originalContent: longContent,
        aiResponse: "AI response",
        feedbackType: "low-quality",
      });

      expect(result.success).toBe(true);

      const feedback = await asUser.run(async (ctx) => {
        return await ctx.db.get(result.feedbackId);
      });

      expect(feedback?.originalContent).toBe(longContent);
    });

    test("should accept long aiResponse (up to 3000 chars)", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      const longResponse = "b".repeat(3000);

      const result = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "expand",
        requestId: "test-request-123",
        originalContent: "Original content",
        aiResponse: longResponse,
        feedbackType: "low-quality",
      });

      expect(result.success).toBe(true);

      const feedback = await asUser.run(async (ctx) => {
        return await ctx.db.get(result.feedbackId);
      });

      expect(feedback?.aiResponse).toBe(longResponse);
    });

    test("should accept long feedbackText (up to 1000 chars)", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      const longFeedbackText = "c".repeat(1000);

      const result = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "tone",
        requestId: "test-request-123",
        originalContent: "Original content",
        aiResponse: "AI response",
        feedbackType: "other",
        feedbackText: longFeedbackText,
      });

      expect(result.success).toBe(true);

      const feedback = await asUser.run(async (ctx) => {
        return await ctx.db.get(result.feedbackId);
      });

      expect(feedback?.feedbackText).toBe(longFeedbackText);
    });
  });

  describe("Return Value", () => {
    test("should return success=true and feedbackId on successful submission", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "tone",
        requestId: "test-request-123",
        originalContent: "Original text",
        aiResponse: "AI-generated text",
        feedbackType: "low-quality",
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("feedbackId");
      expect(result.success).toBe(true);
      expect(typeof result.feedbackId).toBe("string");
    });

    test("should return valid document ID that can be queried", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.mutation(api.aiFeedback.submitAIFeedback, {
        feature: "tone",
        requestId: "test-request-123",
        originalContent: "Original text",
        aiResponse: "AI-generated text",
        feedbackType: "low-quality",
      });

      // Verify feedbackId can be used to query the document
      const feedback = await asUser.run(async (ctx) => {
        return await ctx.db.get(result.feedbackId);
      });

      expect(feedback).toBeDefined();
      expect(feedback?._id).toBe(result.feedbackId);
    });
  });
});
