/**
 * AI Feedback Management
 *
 * This module provides mutations for collecting user feedback about AI-generated content.
 * Feedback is used to monitor content quality and improve AI prompts over time.
 *
 * @module convex/aiFeedback
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Submit AI Feedback Mutation
 *
 * Allows authenticated users to report issues with AI-generated content.
 * Stores feedback for later review and analysis.
 *
 * @param {string} feature - AI feature type: "tone" | "expand" | "hashtags"
 * @param {string} requestId - Correlation ID from AI request logs
 * @param {string} originalContent - User's original content
 * @param {string} aiResponse - AI-generated content being reported
 * @param {string} feedbackType - Type of feedback: "inappropriate" | "low-quality" | "other"
 * @param {string} feedbackText - Optional user-provided details
 *
 * @returns {Object} Success confirmation with feedback ID
 * @property {boolean} success - Always true on successful submission
 * @property {Id<"ai_feedback">} feedbackId - The ID of the created feedback record
 *
 * @throws {Error} If user is not authenticated
 * @throws {Error} If required fields are missing or invalid
 *
 * @example
 * const result = await ctx.runMutation(api.aiFeedback.submitAIFeedback, {
 *   feature: "tone",
 *   requestId: "tone-abc12345-1699999999999",
 *   originalContent: "Original text",
 *   aiResponse: "AI-generated text",
 *   feedbackType: "low-quality",
 *   feedbackText: "The tone doesn't match the request"
 * });
 */
export const submitAIFeedback = mutation({
  args: {
    feature: v.union(
      v.literal("tone"),
      v.literal("expand"),
      v.literal("hashtags"),
    ),
    requestId: v.string(),
    originalContent: v.string(),
    aiResponse: v.string(),
    feedbackType: v.union(
      v.literal("inappropriate"),
      v.literal("low-quality"),
      v.literal("other"),
    ),
    feedbackText: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    feedbackId: v.id("ai_feedback"),
  }),
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated. Please sign in to submit feedback.");
    }

    const userId = identity.subject;

    // Validate required fields
    if (!args.feature || !args.requestId || !args.feedbackType) {
      throw new Error(
        "Missing required fields: feature, requestId, and feedbackType are required.",
      );
    }

    if (!args.originalContent || !args.aiResponse) {
      throw new Error(
        "Missing content fields: originalContent and aiResponse are required.",
      );
    }

    // Create feedback record
    const feedbackId = await ctx.db.insert("ai_feedback", {
      userId,
      feature: args.feature,
      requestId: args.requestId,
      originalContent: args.originalContent,
      aiResponse: args.aiResponse,
      feedbackType: args.feedbackType,
      feedbackText: args.feedbackText,
      timestamp: Date.now(),
    });

    // Log feedback submission for monitoring
    console.log(
      `[AI Feedback ${feedbackId}] User ${userId.slice(0, 8)} submitted ${args.feedbackType} feedback for ${args.feature} | Request ID: ${args.requestId}`,
    );

    return {
      success: true,
      feedbackId,
    };
  },
});
