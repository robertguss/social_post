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
import { getGeminiModel } from "./gemini";

/**
 * Character Limits (from CLAUDE.md)
 */
const TWITTER_MAX_CHARS = 280;
const LINKEDIN_MAX_CHARS = 3000;

/**
 * Timeout for AI API requests (10 seconds per Story 7.1)
 */
const AI_API_TIMEOUT_MS = 10000;

/**
 * Maximum retry attempts for AI API calls
 */
const MAX_RETRIES = 2;

/**
 * Base delay for exponential backoff (milliseconds)
 */
const RETRY_BASE_DELAY_MS = 1000;

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
 * Helper function to wrap promises with timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `Operation timed out after ${timeoutMs}ms (DEADLINE_EXCEEDED)`,
        ),
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Helper function to handle retry logic with exponential backoff
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = RETRY_BASE_DELAY_MS,
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Check if error is retryable (network errors, timeouts, rate limits)
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isRetryable =
        errorMessage.includes("timeout") ||
        errorMessage.includes("DEADLINE_EXCEEDED") ||
        errorMessage.includes("429") ||
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.includes("ENOTFOUND") ||
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("ETIMEDOUT") ||
        errorMessage.includes("network");

      if (!isRetryable) {
        // Non-retryable error, throw immediately
        throw error;
      }

      // Exponential backoff: delay = baseDelay * 2^attempt
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

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

    try {
      // Call Gemini API with retry logic
      const adjustedContent = await withRetry(async () => {
        const model = getGeminiModel();
        const prompt = getTonePrompt(tone, content);

        console.log(`[AI Assistant ${requestId}] Sending request to Gemini API`);

        // Generate content with timeout
        const result = await withTimeout(
          model.generateContent(prompt),
          AI_API_TIMEOUT_MS,
        );

        const responseText = result.response.text().trim();

        console.log(
          `[AI Assistant ${requestId}] Received response | Length: ${responseText.length} chars`,
        );

        return responseText;
      });

      const duration = Date.now() - startTime;

      // Check character limits and generate warning if needed
      const limitCheck = checkCharacterLimit(adjustedContent);

      console.log(
        `[AI Assistant ${requestId}] Success! | Duration: ${duration}ms | ` +
          `Original: ${content.length} chars → Adjusted: ${adjustedContent.length} chars | ` +
          `Warning: ${limitCheck.warning ? "Yes" : "No"}`,
      );

      return {
        content: adjustedContent,
        warning: limitCheck.warning,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[AI Assistant ${requestId}] Error after ${duration}ms:`,
        error,
      );

      // Handle specific error types with user-friendly messages
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("GEMINI_API_KEY not configured")) {
        throw new Error(
          "AI service configuration error. Please contact support.",
        );
      } else if (
        errorMessage.includes("API_KEY_INVALID") ||
        errorMessage.includes("401") ||
        errorMessage.includes("Invalid API key")
      ) {
        throw new Error(
          "AI service configuration error. Please contact support.",
        );
      } else if (
        errorMessage.includes("429") ||
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.includes("rate limit")
      ) {
        throw new Error(
          "AI service rate limit exceeded. Please wait a few minutes and try again.",
        );
      } else if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("DEADLINE_EXCEEDED")
      ) {
        throw new Error(
          "AI request timed out. Please try again or check your network connection.",
        );
      } else if (
        errorMessage.includes("ENOTFOUND") ||
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("ETIMEDOUT") ||
        errorMessage.includes("network")
      ) {
        throw new Error(
          "Network error connecting to AI service. Please check your internet connection and try again.",
        );
      } else {
        throw new Error("AI service temporarily unavailable. Please try again.");
      }
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

    try {
      // Call Gemini API with retry logic
      const expandedContent = await withRetry(async () => {
        const model = getGeminiModel();
        const prompt = getExpansionPrompt(twitterContent);

        console.log(`[AI Assistant ${requestId}] Sending request to Gemini API`);

        // Generate content with timeout
        const result = await withTimeout(
          model.generateContent(prompt),
          AI_API_TIMEOUT_MS,
        );

        const responseText = result.response.text().trim();

        console.log(
          `[AI Assistant ${requestId}] Received response | Length: ${responseText.length} chars`,
        );

        return responseText;
      });

      const duration = Date.now() - startTime;

      // Check expansion length and generate warning if needed
      const warning = checkExpansionLength(expandedContent);

      console.log(
        `[AI Assistant ${requestId}] Success! | Duration: ${duration}ms | ` +
          `Original: ${twitterContent.length} chars → Expanded: ${expandedContent.length} chars | ` +
          `Warning: ${warning ? "Yes" : "No"}`,
      );

      return {
        content: expandedContent,
        warning,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[AI Assistant ${requestId}] Error after ${duration}ms:`,
        error,
      );

      // Handle specific error types with user-friendly messages
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("GEMINI_API_KEY not configured")) {
        throw new Error(
          "AI service configuration error. Please contact support.",
        );
      } else if (
        errorMessage.includes("API_KEY_INVALID") ||
        errorMessage.includes("401") ||
        errorMessage.includes("Invalid API key")
      ) {
        throw new Error(
          "AI service configuration error. Please contact support.",
        );
      } else if (
        errorMessage.includes("429") ||
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.includes("rate limit")
      ) {
        throw new Error(
          "AI service rate limit exceeded. Please wait a few minutes and try again.",
        );
      } else if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("DEADLINE_EXCEEDED")
      ) {
        throw new Error(
          "AI request timed out. Please try again or check your network connection.",
        );
      } else if (
        errorMessage.includes("ENOTFOUND") ||
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("ETIMEDOUT") ||
        errorMessage.includes("network")
      ) {
        throw new Error(
          "Network error connecting to AI service. Please check your internet connection and try again.",
        );
      } else {
        throw new Error("AI service temporarily unavailable. Please try again.");
      }
    }
  },
});

/**
 * Generate Hashtags - Placeholder Action
 *
 * Generates relevant hashtags based on post content.
 * This is a placeholder that returns mock data for UI development (Story 7.2).
 * Actual Gemini integration will be implemented in Story 7.5.
 *
 * @param {string} content - Post content to analyze for hashtag generation
 * @param {number} count - Number of hashtags to generate (default: 5)
 * @returns {string[]} Array of hashtag suggestions (without # prefix)
 *
 * @throws {Error} If user is not authenticated
 * @throws {Error} If content is empty
 *
 * @example
 * const hashtags = await ctx.runAction(api.aiAssistant.generateHashtags, {
 *   content: "Just launched our new AI-powered feature!",
 *   count: 5
 * });
 * // Returns: ["AI", "ProductLaunch", "Innovation", "TechNews", "Startup"]
 */
export const generateHashtags = action({
  args: {
    content: v.string(),
    count: v.optional(v.number()),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const { content, count = 5 } = args;
    const userId = identity.subject;
    const requestId = `hashtags-${userId.slice(0, 8)}-${Date.now()}`;

    console.log(`[AI Assistant ${requestId}] Generate ${count} hashtags for content length: ${content.length}`);

    // Validation: Content cannot be empty
    if (!content.trim()) {
      throw new Error("Content cannot be empty");
    }

    // Validation: Count must be reasonable
    if (count < 1 || count > 20) {
      throw new Error("Hashtag count must be between 1 and 20");
    }

    try {
      // TODO (Story 7.5): Replace with actual Gemini API call
      // For now, return mock hashtags based on common keywords

      const mockHashtags = [
        "Tech",
        "Innovation",
        "Productivity",
        "Development",
        "SocialMedia",
        "ContentCreation",
        "DigitalMarketing",
        "Startup",
        "Growth",
        "Business",
        "Technology",
        "AI",
        "Automation",
        "Software",
        "WebDev",
      ];

      // Return requested number of hashtags (without # prefix)
      const selectedHashtags = mockHashtags.slice(0, Math.min(count, mockHashtags.length));

      console.log(`[AI Assistant ${requestId}] Success! Generated ${selectedHashtags.length} hashtags`);

      return selectedHashtags;
    } catch (error) {
      console.error(`[AI Assistant ${requestId}] Error:`, error);
      throw new Error("AI service temporarily unavailable");
    }
  },
});
