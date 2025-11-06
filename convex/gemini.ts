/**
 * Gemini API Client Initialization and Actions
 *
 * This module provides utilities for interacting with Google's Gemini AI API.
 * All Gemini API interactions must occur within Convex Actions (not queries/mutations)
 * to access Node.js runtime and environment variables.
 *
 * @module convex/gemini
 */

"use node";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Model Selection Rationale:
 *
 * - gemini-1.5-flash: Fast, cost-efficient, suitable for most content refinement tasks
 *   - Use for: Tone adjustment, content expansion, hashtag generation
 *   - Performance: ~1-2 seconds response time
 *   - Cost: Lowest tier (free tier: 15 RPM, 1,500 RPD)
 *
 * - gemini-1.5-pro: More capable, slower, more expensive
 *   - Use for: Complex analysis, multi-step reasoning (future features)
 *   - Performance: ~3-5 seconds response time
 *   - Cost: Higher tier (free tier: 2 RPM, 50 RPD)
 *
 * Default: gemini-1.5-flash for optimal cost-performance balance
 */

/**
 * Retrieves and initializes the Gemini AI client.
 *
 * @returns {GoogleGenerativeAI} Initialized Gemini AI client instance
 * @throws {Error} If GEMINI_API_KEY environment variable is not configured
 *
 * @example
 * const client = getGeminiClient();
 * const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
 */
export function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY not configured in environment variables. " +
        "Please add the API key in Convex Dashboard → Settings → Environment Variables.",
    );
  }

  return new GoogleGenerativeAI(apiKey);
}

/**
 * Retrieves a Gemini generative model instance with the specified model name.
 *
 * @param {string} modelName - The Gemini model to use (default: "gemini-1.5-flash")
 * @returns {GenerativeModel} Initialized generative model instance
 * @throws {Error} If API key is not configured or model initialization fails
 *
 * @example
 * const model = getGeminiModel(); // Uses default: gemini-1.5-flash
 * const proModel = getGeminiModel("gemini-1.5-pro"); // Uses pro model
 */
export function getGeminiModel(modelName: string = "gemini-1.5-flash") {
  const client = getGeminiClient();
  return client.getGenerativeModel({ model: modelName });
}

/**
 * Default timeout for Gemini API requests (in milliseconds)
 * Per AC 7.6: 10-second timeout for all AI API requests
 */
const GEMINI_API_TIMEOUT_MS = 10000;

/**
 * Error Types for Gemini API
 */
enum GeminiErrorType {
  MISSING_API_KEY = "MISSING_API_KEY",
  INVALID_API_KEY = "INVALID_API_KEY",
  NETWORK_ERROR = "NETWORK_ERROR",
  RATE_LIMIT = "RATE_LIMIT",
  TIMEOUT = "TIMEOUT",
  UNKNOWN = "UNKNOWN",
}

/**
 * Wraps an async operation with a timeout.
 *
 * @param {Promise<T>} promise - The promise to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<T>} The result of the promise or throws timeout error
 *
 * @throws {Error} If the operation exceeds the timeout
 *
 * @example
 * const result = await withTimeout(
 *   model.generateContent(prompt),
 *   10000
 * );
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
 * Categorizes and formats Gemini API errors for user-friendly messaging.
 *
 * @param {unknown} error - The error object from Gemini API
 * @param {string} correlationId - Optional correlation ID for tracking
 * @returns {Object} Formatted error information
 *
 * @internal
 */
function handleGeminiError(error: unknown, correlationId?: string) {
  const timestamp = new Date().toISOString();
  const errorId = correlationId || `gemini-${Date.now()}`;

  // Log detailed error for debugging
  console.error(`[Gemini Error ${errorId}] ${timestamp}`, {
    error,
    stack: error instanceof Error ? error.stack : undefined,
  });

  let errorType: GeminiErrorType = GeminiErrorType.UNKNOWN;
  let userMessage: string;
  let technicalMessage: string;

  if (error instanceof Error) {
    technicalMessage = error.message;

    // Categorize error based on message/properties
    if (technicalMessage.includes("GEMINI_API_KEY not configured")) {
      errorType = GeminiErrorType.MISSING_API_KEY;
      userMessage =
        "GEMINI_API_KEY not configured in environment variables. " +
        "Please configure the API key in Convex Dashboard.";
    } else if (
      technicalMessage.includes("API_KEY_INVALID") ||
      technicalMessage.includes("401") ||
      technicalMessage.includes("Invalid API key") ||
      technicalMessage.includes("Unauthorized")
    ) {
      errorType = GeminiErrorType.INVALID_API_KEY;
      userMessage =
        "Invalid Gemini API key - check credentials. " +
        "Please verify the API key in Convex Dashboard.";
    } else if (
      technicalMessage.includes("429") ||
      technicalMessage.includes("RESOURCE_EXHAUSTED") ||
      technicalMessage.includes("rate limit") ||
      technicalMessage.includes("quota")
    ) {
      errorType = GeminiErrorType.RATE_LIMIT;
      userMessage =
        "Gemini API rate limit exceeded. " +
        "Please wait a few minutes and try again.";
    } else if (
      technicalMessage.includes("timeout") ||
      technicalMessage.includes("DEADLINE_EXCEEDED") ||
      technicalMessage.includes("timed out")
    ) {
      errorType = GeminiErrorType.TIMEOUT;
      userMessage =
        "Gemini API request timed out. " +
        "Please try again or check your network connection.";
    } else if (
      technicalMessage.includes("ENOTFOUND") ||
      technicalMessage.includes("ECONNREFUSED") ||
      technicalMessage.includes("ETIMEDOUT") ||
      technicalMessage.includes("network") ||
      technicalMessage.includes("fetch failed")
    ) {
      errorType = GeminiErrorType.NETWORK_ERROR;
      userMessage =
        "Network error connecting to Gemini API. " +
        "Please check your internet connection and try again.";
    } else {
      userMessage = "AI service temporarily unavailable, please try again.";
    }
  } else {
    technicalMessage = String(error);
    userMessage = "AI service temporarily unavailable, please try again.";
  }

  console.error(
    `[Gemini Error ${errorId}] Type: ${errorType}, User Message: ${userMessage}`,
  );

  return {
    errorType,
    userMessage,
    technicalMessage,
    errorId,
    timestamp,
  };
}

/**
 * Test action to verify Gemini API connectivity and authentication.
 *
 * This action sends a simple test prompt to the Gemini API and returns the response.
 * Use this to verify that:
 * - API key is correctly configured
 * - Network connectivity to Gemini API is working
 * - API responses can be parsed successfully
 *
 * @returns {Object} Test result object
 * @property {boolean} success - Whether the test was successful
 * @property {string} message - Response text from Gemini or error message
 * @property {number} timestamp - Unix timestamp of the test
 *
 * @example
 * // Run in Convex Dashboard Functions tab:
 * await ctx.runAction(api.gemini.testGeminiConnection, {});
 */
export const testGeminiConnection = action({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    timestamp: v.number(),
  }),
  handler: async (ctx, args) => {
    const requestId = `test-${Date.now()}`;

    try {
      console.log(`[Gemini Test ${requestId}] Starting connection test...`);
      const startTime = Date.now();

      // Initialize model
      const model = getGeminiModel();

      // Send test prompt
      const testPrompt = "Say hello in one sentence";
      console.log(
        `[Gemini Test ${requestId}] Sending test prompt: "${testPrompt}"`,
      );

      const result = await withTimeout(
        model.generateContent(testPrompt),
        GEMINI_API_TIMEOUT_MS,
      );
      const response = result.response.text();

      const duration = Date.now() - startTime;
      console.log(
        `[Gemini Test ${requestId}] Success! Response received in ${duration}ms. ` +
          `Response length: ${response.length} chars`,
      );

      return {
        success: true,
        message: response,
        timestamp: Date.now(),
      };
    } catch (error) {
      const errorInfo = handleGeminiError(error, requestId);

      return {
        success: false,
        message: errorInfo.userMessage,
        timestamp: Date.now(),
      };
    }
  },
});

/**
 * Admin test endpoint for manual Gemini API testing with authentication.
 *
 * This action allows authenticated users to test the Gemini API with custom prompts
 * and receive detailed performance metrics. Useful for:
 * - Verifying API functionality after deployment
 * - Testing different prompt formats
 * - Monitoring response times and quality
 * - Troubleshooting API issues
 *
 * @param {string} prompt - Optional test prompt (default: "Hello")
 * @param {string} modelName - Optional model name (default: "gemini-1.5-flash")
 *
 * @returns {Object} Detailed test results
 * @property {boolean} success - Whether the test was successful
 * @property {string} response - Response text from Gemini or error message
 * @property {number} durationMs - Time taken for the API call in milliseconds
 * @property {string} modelUsed - The Gemini model that was used
 * @property {number} timestamp - Unix timestamp of the test
 * @property {string} userId - Better Auth user ID of the requester
 *
 * @throws {Error} If user is not authenticated
 *
 * @example
 * // Run in Convex Dashboard Functions tab:
 * await ctx.runAction(api.gemini.adminTestGemini, {
 *   prompt: "Write a haiku about coding"
 * });
 */
export const adminTestGemini = action({
  args: {
    prompt: v.optional(v.string()),
    modelName: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    response: v.string(),
    durationMs: v.number(),
    modelUsed: v.string(),
    timestamp: v.number(),
    userId: v.string(),
  }),
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated. Please sign in to use this endpoint.");
    }

    const userId = identity.subject;
    const requestId = `admin-${userId.slice(0, 8)}-${Date.now()}`;
    const testPrompt = args.prompt ?? "Hello";
    const modelName = args.modelName ?? "gemini-1.5-flash";

    console.log(
      `[Gemini Admin ${requestId}] User ${userId} testing with prompt: "${testPrompt.substring(0, 50)}${testPrompt.length > 50 ? "..." : ""}"`,
    );

    try {
      const startTime = Date.now();

      // Initialize model with specified or default model
      const model = getGeminiModel(modelName);
      console.log(`[Gemini Admin ${requestId}] Using model: ${modelName}`);

      // Send prompt with timeout
      const result = await withTimeout(
        model.generateContent(testPrompt),
        GEMINI_API_TIMEOUT_MS,
      );
      const response = result.response.text();

      const duration = Date.now() - startTime;

      console.log(
        `[Gemini Admin ${requestId}] Success! Response received in ${duration}ms. ` +
          `Prompt length: ${testPrompt.length} chars, Response length: ${response.length} chars`,
      );

      return {
        success: true,
        response,
        durationMs: duration,
        modelUsed: modelName,
        timestamp: Date.now(),
        userId,
      };
    } catch (error) {
      const errorInfo = handleGeminiError(error, requestId);

      return {
        success: false,
        response: errorInfo.userMessage,
        durationMs: 0,
        modelUsed: modelName,
        timestamp: Date.now(),
        userId,
      };
    }
  },
});
