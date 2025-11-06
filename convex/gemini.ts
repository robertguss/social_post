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
export enum GeminiErrorType {
  MISSING_API_KEY = "MISSING_API_KEY",
  INVALID_API_KEY = "INVALID_API_KEY",
  NETWORK_ERROR = "NETWORK_ERROR",
  RATE_LIMIT = "RATE_LIMIT",
  TIMEOUT = "TIMEOUT",
  CONTENT_FILTER = "CONTENT_FILTER",
  INVALID_RESPONSE = "INVALID_RESPONSE",
  UNKNOWN = "UNKNOWN",
}

/**
 * Wraps an async operation with a timeout.
 *
 * @param {Promise<T>} promise - The promise to execute
 * @param {number} timeoutMs - Timeout in milliseconds (default: 10000ms)
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
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = GEMINI_API_TIMEOUT_MS,
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
 * Maximum retry attempts for AI API calls
 */
const MAX_RETRIES = 2;

/**
 * Base delay for exponential backoff (milliseconds)
 */
const RETRY_BASE_DELAY_MS = 1000;

/**
 * Helper function to handle retry logic with exponential backoff
 *
 * @param {Function} operation - The async operation to retry
 * @param {number} maxRetries - Maximum retry attempts (default: 2)
 * @param {number} baseDelay - Base delay for exponential backoff in ms (default: 1000)
 * @returns {Promise<T>} Result of the operation
 *
 * @throws {Error} Throws the last error if all retries fail
 *
 * @example
 * const result = await withRetry(async () => {
 *   const model = getGeminiModel();
 *   return await model.generateContent(prompt);
 * });
 */
export async function withRetry<T>(
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
        errorMessage.includes("network") ||
        errorMessage.includes("fetch failed");

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
 * Error information returned by handleGeminiError
 */
export interface GeminiErrorInfo {
  errorType: GeminiErrorType;
  userMessage: string;
  technicalMessage: string;
  errorId: string;
  timestamp: string;
  isRetryable: boolean;
}

/**
 * Categorizes and formats Gemini API errors for user-friendly messaging.
 *
 * @param {unknown} error - The error object from Gemini API
 * @param {string} correlationId - Optional correlation ID for tracking
 * @returns {GeminiErrorInfo} Formatted error information
 *
 * @example
 * try {
 *   const result = await model.generateContent(prompt);
 * } catch (error) {
 *   const errorInfo = handleGeminiError(error, requestId);
 *   console.error(errorInfo.userMessage);
 *   return { success: false, error: errorInfo.userMessage };
 * }
 */
export function handleGeminiError(
  error: unknown,
  correlationId?: string,
): GeminiErrorInfo {
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
  let isRetryable = false;

  if (error instanceof Error) {
    technicalMessage = error.message;

    // Categorize error based on message/properties
    if (technicalMessage.includes("GEMINI_API_KEY not configured")) {
      errorType = GeminiErrorType.MISSING_API_KEY;
      userMessage =
        "AI service not configured. Please contact support.";
      isRetryable = false;
    } else if (
      technicalMessage.includes("API_KEY_INVALID") ||
      technicalMessage.includes("401") ||
      technicalMessage.includes("Invalid API key") ||
      technicalMessage.includes("Unauthorized")
    ) {
      errorType = GeminiErrorType.INVALID_API_KEY;
      userMessage =
        "AI service authentication failed. Please contact support.";
      isRetryable = false;
    } else if (
      technicalMessage.includes("429") ||
      technicalMessage.includes("RESOURCE_EXHAUSTED") ||
      technicalMessage.includes("rate limit") ||
      technicalMessage.includes("quota")
    ) {
      errorType = GeminiErrorType.RATE_LIMIT;
      userMessage =
        "AI service rate limit exceeded. Please wait a few minutes and try again.";
      isRetryable = true;
    } else if (
      technicalMessage.includes("timeout") ||
      technicalMessage.includes("DEADLINE_EXCEEDED") ||
      technicalMessage.includes("timed out")
    ) {
      errorType = GeminiErrorType.TIMEOUT;
      userMessage =
        "AI request timed out. Please try again or check your network connection.";
      isRetryable = true;
    } else if (
      technicalMessage.includes("ENOTFOUND") ||
      technicalMessage.includes("ECONNREFUSED") ||
      technicalMessage.includes("ETIMEDOUT") ||
      technicalMessage.includes("network") ||
      technicalMessage.includes("fetch failed")
    ) {
      errorType = GeminiErrorType.NETWORK_ERROR;
      userMessage =
        "Network error connecting to AI service. Please check your internet connection and try again.";
      isRetryable = true;
    } else if (
      technicalMessage.includes("SAFETY") ||
      technicalMessage.includes("blocked") ||
      technicalMessage.includes("content policy") ||
      technicalMessage.includes("inappropriate")
    ) {
      errorType = GeminiErrorType.CONTENT_FILTER;
      userMessage =
        "Content violates AI service policies. Please rephrase your content and try again.";
      isRetryable = false;
    } else if (
      technicalMessage.includes("Unable to generate") ||
      technicalMessage.includes("invalid response") ||
      technicalMessage.includes("parse")
    ) {
      errorType = GeminiErrorType.INVALID_RESPONSE;
      userMessage =
        "AI service returned an invalid response. Please try again.";
      isRetryable = true;
    } else {
      userMessage = "AI service temporarily unavailable, please try again.";
      isRetryable = true;
    }
  } else {
    technicalMessage = String(error);
    userMessage = "AI service temporarily unavailable, please try again.";
    isRetryable = true;
  }

  console.error(
    `[Gemini Error ${errorId}] Type: ${errorType} | Retryable: ${isRetryable} | User Message: ${userMessage}`,
  );

  return {
    errorType,
    userMessage,
    technicalMessage,
    errorId,
    timestamp,
    isRetryable,
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
