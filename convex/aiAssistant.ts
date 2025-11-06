/**
 * AI Assistant Actions for Post Content Enhancement
 *
 * This module provides placeholder AI actions for the AI Assistant UI (Story 7.2).
 * Actual Gemini API integration will be implemented in Stories 7.3-7.5.
 *
 * Features:
 * - Tone Adjustment (Story 7.3)
 * - Twitter-to-LinkedIn Expansion (Story 7.4)
 * - Hashtag Generation (Story 7.5)
 *
 * @module convex/aiAssistant
 */

"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  getGeminiModel,
  withTimeout,
  withRetry,
  handleGeminiError,
} from "./gemini";
import { calculateTokenEstimate, calculateCostEstimate } from "./aiUsageTracking";

/**
 * Character Limits (from CLAUDE.md)
 */
const TWITTER_MAX_CHARS = 280;
const LINKEDIN_MAX_CHARS = 3000;

/**
 * Tone options for content adjustment
 */
export const ToneOptions = {
  PROFESSIONAL: "professional",
  CASUAL: "casual",
  ENGAGING: "engaging",
  FORMAL: "formal",
} as const;

export type ToneOption = typeof ToneOptions[keyof typeof ToneOptions];

/**
 * Helper function to create tone-specific prompts
 */
function getTonePrompt(tone: ToneOption, content: string): string {
  const baseInstructions = `
You are a professional content editor. Your task is to rewrite the following text with a specific tone while:
1. Preserving the core message and all key points
2. Maintaining approximately the same character count as the original (important!)
3. Keeping the content natural and not over-the-top
4. Preserving any URLs, hashtags, and mentions exactly as they appear
5. Only returning the rewritten text without any additional explanation or formatting

Original text:
"${content}"
`.trim();

  switch (tone) {
    case "professional":
      return `${baseInstructions}

Rewrite this text in a professional, business-appropriate tone suitable for corporate communications and LinkedIn.`;

    case "formal":
      return `${baseInstructions}

Rewrite this text in a more formal, polished tone with elevated language and proper grammar.`;

    case "casual":
      return `${baseInstructions}

Rewrite this text in a more casual, friendly, conversational tone that feels approachable and relatable.`;

    case "engaging":
      return `${baseInstructions}

Rewrite this text in a more engaging, enthusiastic, attention-grabbing tone that creates excitement and energy.`;

    default:
      return baseInstructions;
  }
}

/**
 * Helper function to check character limits and generate warnings
 */
function checkCharacterLimit(
  content: string,
  platform: "twitter" | "linkedin" | "unknown" = "unknown",
): { exceeds: boolean; warning?: string } {
  const length = content.length;

  // Determine platform limits based on content length or explicit platform
  if (platform === "twitter" || (platform === "unknown" && length <= 500)) {
    if (length > TWITTER_MAX_CHARS) {
      return {
        exceeds: true,
        warning: `Content exceeds Twitter's ${TWITTER_MAX_CHARS} character limit (${length} chars). Please shorten before accepting.`,
      };
    }
  } else if (platform === "linkedin" || platform === "unknown") {
    if (length > LINKEDIN_MAX_CHARS) {
      return {
        exceeds: true,
        warning: `Content exceeds LinkedIn's ${LINKEDIN_MAX_CHARS} character limit (${length} chars). Please shorten before accepting.`,
      };
    }
  }

  return { exceeds: false };
}

/**
 * Adjust Tone - AI-Powered Action
 *
 * Adjusts the tone of content to be more professional, casual, engaging, or formal.
 * Uses Google's Gemini AI to intelligently rewrite content while preserving meaning.
 *
 * @param {string} content - The content to adjust
 * @param {ToneOption} tone - Target tone: "professional", "casual", "engaging", "formal"
 * @returns {Object} Adjusted content with optional character limit warning
 * @property {string} content - The AI-adjusted content
 * @property {string} [warning] - Optional warning if content exceeds platform limits
 *
 * @throws {Error} If user is not authenticated
 * @throws {Error} If content is empty or exceeds platform limits
 *
 * @example
 * const result = await ctx.runAction(api.aiAssistant.adjustTone, {
 *   content: "Check out this new feature!",
 *   tone: "professional"
 * });
 * // Returns: { content: "I am pleased to announce...", warning?: "..." }
 */
export const adjustTone = action({
  args: {
    content: v.string(),
    tone: v.union(
      v.literal("professional"),
      v.literal("casual"),
      v.literal("engaging"),
      v.literal("formal")
    ),
  },
  returns: v.object({
    content: v.string(),
    warning: v.optional(v.string()),
    rateLimitWarning: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const { content, tone } = args;
    const userId = identity.subject;
    const requestId = `tone-${userId.slice(0, 8)}-${Date.now()}`;
    const startTime = Date.now();

    console.log(
      `[AI Assistant ${requestId}] Adjust tone: ${tone} | Content length: ${content.length} chars`,
    );

    // Validation: Content cannot be empty
    if (!content.trim()) {
      throw new Error("Content cannot be empty");
    }

    // Validation: Check maximum length
    if (content.length > LINKEDIN_MAX_CHARS) {
      throw new Error(
        `Content exceeds maximum length of ${LINKEDIN_MAX_CHARS} characters`,
      );
    }

    // Check rate limit status before executing AI request
    const rateLimitStatus: {
      isExceeded: boolean;
      remaining: number;
      limit: number;
    } = await ctx.runQuery(
      internal.aiUsageTracking.getRateLimitStatus,
      {
        userId,
        timeWindow: "day" as const,
      },
    );

    // If rate limit exceeded, throw error
    if (rateLimitStatus.isExceeded) {
      throw new Error(
        "Daily AI request limit reached. Please try again tomorrow.",
      );
    }

    try {
      // Call Gemini API with retry logic
      const adjustedContent = await withRetry(async () => {
        const model = getGeminiModel();
        const prompt = getTonePrompt(tone, content);

        console.log(`[AI Assistant ${requestId}] Sending request to Gemini API`);

        // Generate content with timeout (uses default 10s timeout from gemini.ts)
        const result = await withTimeout(
          model.generateContent(prompt),
        );

        const responseText = result.response.text().trim();

        console.log(
          `[AI Assistant ${requestId}] Received response | Length: ${responseText.length} chars`,
        );

        return responseText;
      });

      const duration = Date.now() - startTime;

      // Estimate token usage and cost
      const tokenEstimate = calculateTokenEstimate(content.length, "tone");
      const tokensUsed = tokenEstimate.input + tokenEstimate.output;
      const cost = calculateCostEstimate(
        tokenEstimate.input,
        tokenEstimate.output,
      );

      // Log usage to database
      await ctx.runMutation(internal.aiUsageTracking.logAIUsage, {
        userId,
        feature: "tone",
        tokensUsed,
        cost,
        modelUsed: "gemini-1.5-flash",
        requestId,
        duration,
        success: true,
      });

      // Check character limits and generate warning if needed
      const limitCheck = checkCharacterLimit(adjustedContent);

      // Generate rate limit warning if approaching limit
      const rateLimitWarning: string | undefined = rateLimitStatus.isNearLimit
        ? `You're approaching your daily AI request limit (${rateLimitStatus.requestCount + 1}/${rateLimitStatus.limit} requests used).`
        : undefined;

      console.log(
        `[AI Assistant ${requestId}] Success! | Duration: ${duration}ms | ` +
          `Original: ${content.length} chars → Adjusted: ${adjustedContent.length} chars | ` +
          `Tokens: ${tokensUsed} | Cost: $${cost.toFixed(6)} | ` +
          `Warning: ${limitCheck.warning ? "Yes" : "No"} | ` +
          `Rate Limit: ${rateLimitStatus.percentUsed.toFixed(1)}%`,
      );

      return {
        content: adjustedContent,
        warning: limitCheck.warning,
        rateLimitWarning,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[AI Assistant ${requestId}] Error after ${duration}ms`,
      );

      // Log failed request
      await ctx.runMutation(internal.aiUsageTracking.logAIUsage, {
        userId,
        feature: "tone",
        tokensUsed: 0,
        cost: 0,
        modelUsed: "gemini-1.5-flash",
        requestId,
        duration,
        success: false,
      });

      // Use centralized error handling
      const errorInfo = handleGeminiError(error, requestId);
      throw new Error(errorInfo.userMessage);
    }
  },
});

/**
 * Helper function to create LinkedIn expansion prompt
 */
function getExpansionPrompt(twitterContent: string): string {
  const twitterLength = twitterContent.length;

  return `You are a professional content writer specializing in LinkedIn posts. Your task is to expand the following Twitter post into a longer, more detailed LinkedIn post while:

1. Maintaining the core message and all key points
2. Using a professional, business-appropriate tone suitable for LinkedIn
3. Targeting 500-1000 characters (current Twitter length: ${twitterLength} chars)
4. Preserving all URLs, hashtags, and @mentions exactly as they appear
5. Adding relevant context, details, insights, or examples to make the content more valuable
6. Using clear formatting with line breaks for readability
7. Keeping the content engaging and appropriate for LinkedIn's professional audience
8. If the original content contains URLs, add context about what the link offers

Twitter content:
"${twitterContent}"

Important: Return ONLY the expanded LinkedIn post text without any additional explanation, formatting markers, or meta-commentary.`.trim();
}

/**
 * Helper function to check expansion length and generate warnings
 */
function checkExpansionLength(expandedContent: string): string | undefined {
  const length = expandedContent.length;

  // Warn if expansion is too short (less than 500 chars target)
  if (length < 500) {
    return "Expansion is shorter than expected (target: 500-1000 chars). Consider adding more detail or accepting as-is.";
  }

  // Check LinkedIn character limit (should be rare with proper prompt)
  if (length > LINKEDIN_MAX_CHARS) {
    return `Content exceeds LinkedIn's ${LINKEDIN_MAX_CHARS} character limit (${length} chars). Please shorten before accepting.`;
  }

  return undefined;
}

/**
 * Expand for LinkedIn - AI-Powered Action
 *
 * Expands shorter Twitter content into longer, more detailed LinkedIn post.
 * Uses Google's Gemini AI to intelligently expand content while preserving meaning.
 *
 * @param {string} twitterContent - Original Twitter content (max 280 chars)
 * @returns {Object} Expanded content with optional warning
 * @property {string} content - The AI-expanded LinkedIn content
 * @property {string} [warning] - Optional warning if expansion is too short or too long
 *
 * @throws {Error} If user is not authenticated
 * @throws {Error} If Twitter content is empty or exceeds character limit
 *
 * @example
 * const result = await ctx.runAction(api.aiAssistant.expandForLinkedIn, {
 *   twitterContent: "Just launched our new feature! Check it out."
 * });
 * // Returns: { content: "I'm excited to announce...", warning?: "..." }
 */
export const expandForLinkedIn = action({
  args: {
    twitterContent: v.string(),
  },
  returns: v.object({
    content: v.string(),
    warning: v.optional(v.string()),
    rateLimitWarning: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const { twitterContent } = args;
    const userId = identity.subject;
    const requestId = `expand-${userId.slice(0, 8)}-${Date.now()}`;
    const startTime = Date.now();

    console.log(
      `[AI Assistant ${requestId}] Expand for LinkedIn | Twitter length: ${twitterContent.length} chars`,
    );

    // Validation: Twitter content cannot be empty
    if (!twitterContent.trim()) {
      throw new Error("Twitter content cannot be empty");
    }

    // Validation: Check Twitter character limit
    if (twitterContent.length > TWITTER_MAX_CHARS) {
      throw new Error(
        `Twitter content exceeds ${TWITTER_MAX_CHARS} character limit`,
      );
    }

    // Check rate limit status before executing AI request
    const rateLimitStatus: {
      isExceeded: boolean;
      remaining: number;
      limit: number;
    } = await ctx.runQuery(
      internal.aiUsageTracking.getRateLimitStatus,
      {
        userId,
        timeWindow: "day" as const,
      },
    );

    // If rate limit exceeded, throw error
    if (rateLimitStatus.isExceeded) {
      throw new Error(
        "Daily AI request limit reached. Please try again tomorrow.",
      );
    }

    try {
      // Call Gemini API with retry logic
      const expandedContent = await withRetry(async () => {
        const model = getGeminiModel();
        const prompt = getExpansionPrompt(twitterContent);

        console.log(`[AI Assistant ${requestId}] Sending request to Gemini API`);

        // Generate content with timeout (uses default 10s timeout from gemini.ts)
        const result = await withTimeout(
          model.generateContent(prompt),
        );

        const responseText = result.response.text().trim();

        console.log(
          `[AI Assistant ${requestId}] Received response | Length: ${responseText.length} chars`,
        );

        return responseText;
      });

      const duration = Date.now() - startTime;

      // Estimate token usage and cost
      const tokenEstimate = calculateTokenEstimate(
        twitterContent.length,
        "expand",
      );
      const tokensUsed = tokenEstimate.input + tokenEstimate.output;
      const cost = calculateCostEstimate(
        tokenEstimate.input,
        tokenEstimate.output,
      );

      // Log usage to database
      await ctx.runMutation(internal.aiUsageTracking.logAIUsage, {
        userId,
        feature: "expand",
        tokensUsed,
        cost,
        modelUsed: "gemini-1.5-flash",
        requestId,
        duration,
        success: true,
      });

      // Check expansion length and generate warning if needed
      const warning = checkExpansionLength(expandedContent);

      // Generate rate limit warning if approaching limit
      const rateLimitWarning: string | undefined = rateLimitStatus.isNearLimit
        ? `You're approaching your daily AI request limit (${rateLimitStatus.requestCount + 1}/${rateLimitStatus.limit} requests used).`
        : undefined;

      console.log(
        `[AI Assistant ${requestId}] Success! | Duration: ${duration}ms | ` +
          `Original: ${twitterContent.length} chars → Expanded: ${expandedContent.length} chars | ` +
          `Tokens: ${tokensUsed} | Cost: $${cost.toFixed(6)} | ` +
          `Warning: ${warning ? "Yes" : "No"} | ` +
          `Rate Limit: ${rateLimitStatus.percentUsed.toFixed(1)}%`,
      );

      return {
        content: expandedContent,
        warning,
        rateLimitWarning,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[AI Assistant ${requestId}] Error after ${duration}ms`,
      );

      // Log failed request
      await ctx.runMutation(internal.aiUsageTracking.logAIUsage, {
        userId,
        feature: "expand",
        tokensUsed: 0,
        cost: 0,
        modelUsed: "gemini-1.5-flash",
        requestId,
        duration,
        success: false,
      });

      // Use centralized error handling
      const errorInfo = handleGeminiError(error, requestId);
      throw new Error(errorInfo.userMessage);
    }
  },
});

/**
 * Helper function to create hashtag generation prompt
 */
function getHashtagPrompt(
  content: string,
  platform: "twitter" | "linkedin",
  count: number,
): string {
  const platformGuidance =
    platform === "twitter"
      ? "short, punchy hashtags (1-2 words) that are trending and casual"
      : "longer, professional hashtags (2-3 words) that are industry-relevant and descriptive";

  return `You are a social media hashtag expert. Analyze the following content and generate ${count} relevant hashtags.

Platform: ${platform.toUpperCase()}
Content: "${content}"

Requirements:
1. Generate exactly ${count} hashtags
2. Hashtags should be ${platformGuidance}
3. Hashtags must be relevant to the content's main topics and keywords
4. Use popular, searchable hashtags that increase discoverability
5. Return hashtags WITHOUT the # prefix (e.g., "AI" not "#AI")
6. Return ONLY a JSON array of strings, no additional text or explanation
7. Each hashtag should use proper capitalization (e.g., "TechInnovation" not "techinnovation")

Example format: ["Hashtag1", "Hashtag2", "Hashtag3"]

Generate hashtags now:`.trim();
}

/**
 * Helper function to parse and validate hashtags from Gemini response
 */
function parseHashtags(responseText: string, count: number): string[] {
  try {
    // Try parsing as JSON array first
    const parsed = JSON.parse(responseText);
    if (Array.isArray(parsed)) {
      return validateHashtags(parsed, count);
    }
  } catch {
    // JSON parsing failed, try fallback parsing
  }

  // Fallback: Extract hashtags from text (split by commas, newlines, or array brackets)
  const cleaned = responseText
    .replace(/[\[\]"'`]/g, "") // Remove brackets and quotes
    .replace(/\n/g, ",") // Replace newlines with commas
    .trim();

  const hashtags = cleaned
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return validateHashtags(hashtags, count);
}

/**
 * Helper function to validate and clean hashtags
 */
function validateHashtags(hashtags: string[], requestedCount: number): string[] {
  const validHashtags: string[] = [];

  for (const tag of hashtags) {
    // Remove # prefix if Gemini included it
    let cleaned = tag.trim().replace(/^#/, "");

    // Validate format: only letters, numbers, underscores (no spaces or special chars)
    if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) {
      // Try removing invalid characters
      cleaned = cleaned.replace(/[^a-zA-Z0-9_]/g, "");
    }

    // Skip if still invalid or empty
    if (!cleaned || !/^[a-zA-Z0-9_]+$/.test(cleaned)) {
      continue;
    }

    // Skip duplicates (case-insensitive check)
    if (
      validHashtags.some(
        (existing) => existing.toLowerCase() === cleaned.toLowerCase(),
      )
    ) {
      continue;
    }

    validHashtags.push(cleaned);

    // Stop when we have enough valid hashtags
    if (validHashtags.length >= requestedCount) {
      break;
    }
  }

  // If we couldn't generate enough valid hashtags, throw error
  if (validHashtags.length === 0) {
    throw new Error("Unable to generate valid hashtags for this content");
  }

  return validHashtags;
}

/**
 * Generate Hashtags - AI-Powered Action
 *
 * Generates relevant hashtags based on post content using Google's Gemini AI.
 * Provides platform-specific suggestions optimized for Twitter or LinkedIn.
 *
 * @param {string} content - Post content to analyze for hashtag generation
 * @param {number} count - Number of hashtags to generate (default: 5, range: 1-20)
 * @param {string} platform - Target platform: "twitter" or "linkedin" (optional)
 * @returns {string[]} Array of hashtag suggestions (without # prefix)
 *
 * @throws {Error} If user is not authenticated
 * @throws {Error} If content is empty or exceeds maximum length
 * @throws {Error} If count is not between 1 and 20
 *
 * @example
 * const hashtags = await ctx.runAction(api.aiAssistant.generateHashtags, {
 *   content: "Just launched our new AI-powered feature!",
 *   count: 5,
 *   platform: "twitter"
 * });
 * // Returns: ["AI", "ProductLaunch", "Innovation", "TechNews", "Startup"]
 */
export const generateHashtags = action({
  args: {
    content: v.string(),
    count: v.optional(v.number()),
    platform: v.optional(v.union(v.literal("twitter"), v.literal("linkedin"))),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const { content, count = 5, platform = "twitter" } = args;
    const userId = identity.subject;
    const requestId = `hashtags-${userId.slice(0, 8)}-${Date.now()}`;
    const startTime = Date.now();

    console.log(
      `[AI Assistant ${requestId}] Generate ${count} hashtags | Platform: ${platform} | Content length: ${content.length} chars`,
    );

    // Validation: Content cannot be empty
    if (!content.trim()) {
      throw new Error("Content cannot be empty");
    }

    // Validation: Check maximum length
    if (content.length > LINKEDIN_MAX_CHARS) {
      throw new Error(
        `Content exceeds maximum length of ${LINKEDIN_MAX_CHARS} characters`,
      );
    }

    // Validation: Count must be reasonable
    if (count < 1 || count > 20) {
      throw new Error("Hashtag count must be between 1 and 20");
    }

    // Check rate limit status before executing AI request
    const rateLimitStatus: {
      isExceeded: boolean;
      remaining: number;
      limit: number;
    } = await ctx.runQuery(
      internal.aiUsageTracking.getRateLimitStatus,
      {
        userId,
        timeWindow: "day" as const,
      },
    );

    // If rate limit exceeded, throw error
    if (rateLimitStatus.isExceeded) {
      throw new Error(
        "Daily AI request limit reached. Please try again tomorrow.",
      );
    }

    // Log rate limit warning if approaching limit
    if (rateLimitStatus.isNearLimit) {
      console.log(
        `[AI Assistant ${requestId}] Rate limit warning: ${rateLimitStatus.percentUsed.toFixed(1)}% used (${rateLimitStatus.requestCount}/${rateLimitStatus.limit})`,
      );
    }

    try {
      // Call Gemini API with retry logic
      const hashtags = await withRetry(async () => {
        const model = getGeminiModel();
        const prompt = getHashtagPrompt(content, platform, count);

        console.log(`[AI Assistant ${requestId}] Sending request to Gemini API`);

        // Generate content with timeout (uses default 10s timeout from gemini.ts)
        const result = await withTimeout(
          model.generateContent(prompt),
        );

        const responseText = result.response.text().trim();

        console.log(
          `[AI Assistant ${requestId}] Received response | Raw length: ${responseText.length} chars`,
        );

        // Parse and validate hashtags
        const parsedHashtags = parseHashtags(responseText, count);

        return parsedHashtags;
      });

      const duration = Date.now() - startTime;

      // Estimate token usage and cost
      const tokenEstimate = calculateTokenEstimate(content.length, "hashtags");
      const tokensUsed = tokenEstimate.input + tokenEstimate.output;
      const cost = calculateCostEstimate(
        tokenEstimate.input,
        tokenEstimate.output,
      );

      // Log usage to database
      await ctx.runMutation(internal.aiUsageTracking.logAIUsage, {
        userId,
        feature: "hashtags",
        tokensUsed,
        cost,
        modelUsed: "gemini-1.5-flash",
        requestId,
        duration,
        success: true,
      });

      console.log(
        `[AI Assistant ${requestId}] Success! | Duration: ${duration}ms | ` +
          `Generated ${hashtags.length} hashtags: [${hashtags.join(", ")}] | ` +
          `Tokens: ${tokensUsed} | Cost: $${cost.toFixed(6)} | ` +
          `Rate Limit: ${rateLimitStatus.percentUsed.toFixed(1)}%`,
      );

      return hashtags;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[AI Assistant ${requestId}] Error after ${duration}ms`,
      );

      // Handle specific error types with user-friendly messages
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Don't wrap validation errors - throw them as-is
      if (
        errorMessage.includes("Unable to generate") ||
        errorMessage.includes("Content cannot be empty") ||
        errorMessage.includes("Hashtag count must be")
      ) {
        // Log failed request for validation errors
        await ctx.runMutation(internal.aiUsageTracking.logAIUsage, {
          userId,
          feature: "hashtags",
          tokensUsed: 0,
          cost: 0,
          modelUsed: "gemini-1.5-flash",
          requestId,
          duration,
          success: false,
        });

        throw error;
      }

      // Log failed request for API errors
      await ctx.runMutation(internal.aiUsageTracking.logAIUsage, {
        userId,
        feature: "hashtags",
        tokensUsed: 0,
        cost: 0,
        modelUsed: "gemini-1.5-flash",
        requestId,
        duration,
        success: false,
      });

      // Use centralized error handling
      const errorInfo = handleGeminiError(error, requestId);
      throw new Error(errorInfo.userMessage);
    }
  },
});
