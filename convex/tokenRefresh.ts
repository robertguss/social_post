"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * INTERNAL ACTION: Refresh expired LinkedIn OAuth tokens.
 *
 * This action refreshes LinkedIn access and refresh tokens using the LinkedIn OAuth 2.0
 * token refresh endpoint. It implements retry logic with exponential backoff for transient
 * failures and timeout handling.
 *
 * LinkedIn token expiration:
 * - Access tokens: 60 days (5,184,000 seconds)
 * - Refresh tokens: 365 days (31,536,000 seconds)
 *
 * @param clerkUserId - The user's Clerk ID
 * @returns Success status and updated expiration timestamp, or error details
 * @throws Error if refresh token is expired (requires re-authentication)
 */
export const refreshLinkedInToken = internalAction({
  args: {
    clerkUserId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    expiresAt: v.optional(v.number()),
    error: v.optional(v.string()),
    needsReauth: v.optional(v.boolean()),
  }),
  handler: async (ctx, args): Promise<{
    success: boolean;
    expiresAt?: number;
    error?: string;
    needsReauth?: boolean;
  }> => {
    try {
      // Get encrypted connection from database
      const connection = await ctx.runQuery(
        internal.connections.getConnectionInternal,
        {
          clerkUserId: args.clerkUserId,
          platform: "linkedin",
        }
      );

      if (!connection) {
        return {
          success: false,
          error: "LinkedIn connection not found",
          needsReauth: true,
        };
      }

      // Decrypt the refresh token
      const decryptedRefreshToken = await ctx.runAction(
        internal.encryption.decrypt,
        { ciphertext: connection.refreshToken }
      );

      // Get LinkedIn OAuth credentials from environment
      const clientId = process.env.LINKEDIN_CLIENT_ID;
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error("LinkedIn OAuth credentials not configured");
      }

      // Call LinkedIn token refresh endpoint with retry logic
      const tokenEndpoint = "https://www.linkedin.com/oauth/v2/accessToken";
      const maxRetries = 3;
      const timeoutMs = 10000; // 10 seconds

      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Create AbortController for timeout handling
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          const response = await fetch(tokenEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: decryptedRefreshToken,
              client_id: clientId,
              client_secret: clientSecret,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();

            // Handle expired refresh token (requires re-authentication)
            if (response.status === 400 || response.status === 401) {
              return {
                success: false,
                error: "Refresh token expired - re-authentication required",
                needsReauth: true,
              };
            }

            // Retry on 5xx server errors or 429 rate limiting
            if (response.status >= 500 || response.status === 429) {
              if (attempt < maxRetries - 1) {
                const delayMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
                console.warn(
                  `LinkedIn token refresh failed (attempt ${attempt + 1}/${maxRetries}): ${response.statusText}. Retrying in ${delayMs}ms...`
                );
                await new Promise((resolve) => setTimeout(resolve, delayMs));
                continue;
              }
            }

            // Don't retry on other client errors (4xx)
            throw new Error(
              `LinkedIn token refresh failed: ${response.statusText} - ${errorText}`
            );
          }

          // Parse successful response
          const data = await response.json();

          if (!data.access_token || !data.refresh_token) {
            throw new Error(
              "LinkedIn token refresh response missing required tokens"
            );
          }

          // Calculate new expiration timestamp
          const expiresIn = data.expires_in || 5184000; // Default: 60 days in seconds
          const newExpiresAt = Date.now() + expiresIn * 1000;

          // Encrypt the new tokens before storage
          const encryptedAccessToken = await ctx.runAction(
            internal.encryption.encrypt,
            { plaintext: data.access_token }
          );

          const encryptedRefreshToken = await ctx.runAction(
            internal.encryption.encrypt,
            { plaintext: data.refresh_token }
          );

          // Save encrypted tokens to database
          await ctx.runMutation(internal.connections.saveConnectionInternal, {
            clerkUserId: args.clerkUserId,
            platform: "linkedin",
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt: newExpiresAt,
          });

          return {
            success: true,
            expiresAt: newExpiresAt,
          };
        } catch (error) {
          // Handle timeout errors
          if (error instanceof Error && error.name === "AbortError") {
            if (attempt < maxRetries - 1) {
              const delayMs = Math.pow(2, attempt) * 1000;
              console.warn(
                `LinkedIn token refresh timed out (attempt ${attempt + 1}/${maxRetries}). Retrying in ${delayMs}ms...`
              );
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              continue;
            }
            lastError = new Error(
              "LinkedIn token refresh timed out after multiple attempts"
            );
            break;
          }

          // Handle other network errors with retry
          if (attempt < maxRetries - 1) {
            const delayMs = Math.pow(2, attempt) * 1000;
            console.warn(
              `LinkedIn token refresh error (attempt ${attempt + 1}/${maxRetries}): ${error instanceof Error ? error.message : "Unknown error"}. Retrying in ${delayMs}ms...`
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            lastError = error instanceof Error ? error : new Error(String(error));
            continue;
          }

          lastError = error instanceof Error ? error : new Error(String(error));
          break;
        }
      }

      // All retries failed
      return {
        success: false,
        error: lastError?.message || "LinkedIn token refresh failed after all retries",
        needsReauth: false,
      };
    } catch (error) {
      // Handle unexpected errors (decryption failures, etc.)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during token refresh",
        needsReauth: false,
      };
    }
  },
});
