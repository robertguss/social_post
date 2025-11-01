"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Publishing Action for X/Twitter Posts
 *
 * This internal action handles the complete publishing workflow:
 * 1. Retrieve and decrypt OAuth tokens
 * 2. Publish text post to X API
 * 3. Post URL as reply thread (if provided)
 * 4. Update post status
 * 5. Handle errors and retry logic
 */

const MAX_RETRIES = 3;
const X_API_BASE_URL = "https://api.twitter.com";
const LINKEDIN_API_BASE_URL = "https://api.linkedin.com";
const API_TIMEOUT = 30000; // 30 seconds

/**
 * INTERNAL ACTION: Publish a Twitter post at scheduled time
 *
 * This action is triggered by Convex scheduler at the post's scheduled time.
 * It handles the complete publishing workflow including retries.
 *
 * @param postId - The ID of the post to publish
 */
export const publishTwitterPost = internalAction({
  args: { postId: v.id("posts") },
  handler: async (ctx, args): Promise<void> => {
    try {
      // Step 1: Retrieve the post record
      const post = await ctx.runQuery(internal.posts.getPostById, {
        postId: args.postId,
      });

      if (!post) {
        console.error(`[Publishing] Post ${args.postId} not found`);
        return;
      }

      // Verify post is in "Scheduled" status
      if (post.status !== "Scheduled") {
        console.log(
          `[Publishing] Post ${args.postId} is not in Scheduled status (current: ${post.status}), skipping`
        );
        return;
      }

      // Step 2: Update status to "Publishing" to prevent duplicate publishing
      await ctx.runMutation(internal.posts.updatePostStatus, {
        postId: args.postId,
        status: "Publishing",
      });

      console.log(`[Publishing] Starting publication of post ${args.postId}`);

      // Step 3: Retrieve and decrypt OAuth tokens
      const connection = await ctx.runAction(
        internal.connections.getDecryptedConnection,
        {
          clerkUserId: post.clerkUserId,
          platform: "twitter",
        }
      );

      if (!connection) {
        throw new Error(
          "Twitter connection not found. Please reconnect your Twitter account."
        );
      }

      const accessToken = connection.accessToken;

      // Step 4: Publish text post to X API
      const tweetId = await publishTweet(
        accessToken,
        post.twitterContent || ""
      );

      console.log(
        `[Publishing] Successfully published tweet ${tweetId} for post ${args.postId}`
      );

      // Step 5: Post URL as reply thread (if provided)
      if (post.url && post.url.trim() !== "") {
        try {
          await publishTweetReply(accessToken, post.url, tweetId);
          console.log(
            `[Publishing] Successfully posted URL reply for post ${args.postId}`
          );
        } catch (urlError) {
          // Log URL reply error but don't fail the entire post
          console.error(
            `[Publishing] Failed to post URL reply for post ${args.postId}:`,
            urlError instanceof Error ? urlError.message : "Unknown error"
          );
          // Continue to mark main post as published
        }
      }

      // Step 6: Update post status to "Published"
      await ctx.runMutation(internal.posts.updatePostStatus, {
        postId: args.postId,
        status: "Published",
        twitterPostId: tweetId,
        errorMessage: undefined, // Clear any previous error messages
      });

      console.log(`[Publishing] Post ${args.postId} published successfully`);
    } catch (error) {
      // Handle errors with retry logic
      await handlePublishingError(ctx, args.postId, error);
    }
  },
});

/**
 * Publish a tweet to X/Twitter API
 *
 * @param accessToken - Decrypted OAuth access token
 * @param text - Tweet text content (max 280 characters)
 * @returns The tweet ID from X API
 * @throws Error if API call fails
 */
async function publishTweet(
  accessToken: string,
  text: string
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${X_API_BASE_URL}/2/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new XApiError(
        response.status,
        `X API Error ${response.status}: ${errorBody}`
      );
    }

    const data = await response.json();

    if (!data.data?.id) {
      throw new Error("X API response missing tweet ID");
    }

    return data.data.id;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof XApiError) {
      throw error;
    }

    // Handle fetch errors (network issues, timeouts)
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new XApiError(0, "Request timeout");
      }
      throw new XApiError(0, `Network error: ${error.message}`);
    }

    throw new XApiError(0, "Unknown error during tweet publishing");
  }
}

/**
 * Post a tweet as a reply to create a thread
 *
 * @param accessToken - Decrypted OAuth access token
 * @param text - Reply text (typically the URL)
 * @param inReplyToTweetId - The tweet ID to reply to
 * @throws Error if API call fails
 */
async function publishTweetReply(
  accessToken: string,
  text: string,
  inReplyToTweetId: string
): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${X_API_BASE_URL}/2/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        reply: {
          in_reply_to_tweet_id: inReplyToTweetId,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new XApiError(
        response.status,
        `X API Error ${response.status}: ${errorBody}`
      );
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof XApiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new XApiError(0, "Request timeout");
      }
      throw new XApiError(0, `Network error: ${error.message}`);
    }

    throw new XApiError(0, "Unknown error during tweet reply");
  }
}

/**
 * Handle publishing errors with retry logic
 *
 * @param ctx - Convex action context
 * @param postId - The ID of the post that failed
 * @param error - The error that occurred
 */
async function handlePublishingError(
  ctx: any,
  postId: any,
  error: unknown
): Promise<void> {
  console.error(
    `[Publishing] Error publishing post ${postId}:`,
    error instanceof Error ? error.message : "Unknown error"
  );

  // Get current post to check retry count
  const post = await ctx.runQuery(internal.posts.getPostById, { postId });

  if (!post) {
    console.error(`[Publishing] Post ${postId} not found during error handling`);
    return;
  }

  const currentRetryCount = post.retryCount || 0;
  const isTransient = isTransientError(error);

  console.log(
    `[Publishing] Error classification - Transient: ${isTransient}, Retry count: ${currentRetryCount}/${MAX_RETRIES}`
  );

  if (isTransient && currentRetryCount < MAX_RETRIES) {
    // Schedule a retry with exponential backoff
    const retryDelayMs = getRetryDelay(currentRetryCount);
    const newRetryCount = currentRetryCount + 1;

    console.log(
      `[Publishing] Scheduling retry ${newRetryCount}/${MAX_RETRIES} for post ${postId} in ${retryDelayMs}ms`
    );

    // Update retry count and set back to Scheduled for retry
    await ctx.runMutation(internal.posts.updatePostStatus, {
      postId,
      status: "Scheduled",
      retryCount: newRetryCount,
      errorMessage: `Retry attempt ${newRetryCount}/${MAX_RETRIES}: ${error instanceof Error ? error.message : "Unknown error"}`,
    });

    // Schedule the retry
    await ctx.scheduler.runAfter(
      retryDelayMs,
      internal.publishing.publishTwitterPost,
      { postId }
    );
  } else {
    // Permanent failure or max retries reached
    const errorMessage =
      currentRetryCount >= MAX_RETRIES
        ? `Failed after ${MAX_RETRIES} retry attempts: ${error instanceof Error ? error.message : "Unknown error"}`
        : `Permanent error: ${error instanceof Error ? error.message : "Unknown error"}`;

    console.log(`[Publishing] Marking post ${postId} as Failed: ${errorMessage}`);

    // Update post status to Failed
    await ctx.runMutation(internal.posts.updatePostStatus, {
      postId,
      status: "Failed",
      errorMessage,
      retryCount: currentRetryCount,
    });

    // Trigger Telegram notification
    try {
      await ctx.runAction(internal.notifications.sendFailureNotification, {
        postId,
        content: post.twitterContent || "",
        errorMessage,
        scheduledTime: post.twitterScheduledTime || Date.now(),
        retryCount: currentRetryCount,
      });
    } catch (notificationError) {
      console.error(
        `[Publishing] Failed to send failure notification for post ${postId}:`,
        notificationError instanceof Error
          ? notificationError.message
          : "Unknown error"
      );
    }
  }
}

/**
 * Determine if an error is transient (should retry) or permanent
 *
 * Transient errors:
 * - 429 Rate Limit
 * - 5xx Server Errors
 * - Network errors (timeout, connection reset, etc.)
 *
 * Permanent errors:
 * - 401 Unauthorized (invalid/expired token)
 * - 403 Forbidden (permission issue)
 * - 400 Bad Request (invalid data)
 *
 * @param error - The error to classify
 * @returns true if error is transient and should be retried
 */
function isTransientError(error: unknown): boolean {
  if (error instanceof XApiError) {
    const status = error.status;

    // Transient HTTP errors
    if (status === 429) return true; // Rate limit
    if (status >= 500 && status < 600) return true; // Server errors

    // Permanent HTTP errors
    if (status === 401) return false; // Unauthorized
    if (status === 403) return false; // Forbidden
    if (status === 400) return false; // Bad Request

    // Network errors (status 0) are transient
    if (status === 0) return true;
  }

  // Network/timeout errors are transient
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("timeout")) return true;
    if (message.includes("network")) return true;
    if (message.includes("econnreset")) return true;
    if (message.includes("etimedout")) return true;
  }

  // Unknown errors are treated as permanent to avoid infinite retries
  return false;
}

/**
 * Calculate retry delay using exponential backoff
 *
 * Delay formula: 2^retryCount minutes
 * - Retry 1: 2^0 = 1 minute
 * - Retry 2: 2^1 = 2 minutes
 * - Retry 3: 2^2 = 4 minutes
 *
 * @param retryCount - Current retry attempt (0-based)
 * @returns Delay in milliseconds
 */
function getRetryDelay(retryCount: number): number {
  const delayMinutes = Math.pow(2, retryCount);
  return delayMinutes * 60 * 1000; // Convert to milliseconds
}

/**
 * Custom error class for X API errors
 * Includes HTTP status code for error classification
 */
class XApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "XApiError";
  }
}

/**
 * Custom error class for LinkedIn API errors
 * Includes HTTP status code for error classification
 */
class LinkedInApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "LinkedInApiError";
  }
}

/**
 * INTERNAL ACTION: Publish a LinkedIn post at scheduled time
 *
 * This action is triggered by Convex scheduler at the post's scheduled time.
 * It handles the complete publishing workflow including retries.
 *
 * @param postId - The ID of the post to publish
 */
export const publishLinkedInPost = internalAction({
  args: { postId: v.id("posts") },
  handler: async (ctx, args): Promise<void> => {
    try {
      // Step 1: Retrieve the post record
      const post = await ctx.runQuery(internal.posts.getPostById, {
        postId: args.postId,
      });

      if (!post) {
        console.error(`[LinkedIn Publishing] Post ${args.postId} not found`);
        return;
      }

      // Verify post is in "Scheduled" status
      if (post.status !== "Scheduled") {
        console.log(
          `[LinkedIn Publishing] Post ${args.postId} is not in Scheduled status (current: ${post.status}), skipping`
        );
        return;
      }

      // Step 2: Update status to "Publishing" to prevent duplicate publishing
      await ctx.runMutation(internal.posts.updatePostStatus, {
        postId: args.postId,
        status: "Publishing",
      });

      console.log(`[LinkedIn Publishing] Starting publication of post ${args.postId}`);

      // Step 3: Retrieve and decrypt OAuth tokens
      let connection = await ctx.runAction(
        internal.connections.getDecryptedConnection,
        {
          clerkUserId: post.clerkUserId,
          platform: "linkedin",
        }
      );

      if (!connection) {
        throw new Error(
          "LinkedIn connection not found. Please reconnect your LinkedIn account."
        );
      }

      // Step 3a: Check token expiration and refresh if needed
      const now = Date.now();
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      const tokenExpiresIn = connection.expiresAt - now;

      if (tokenExpiresIn < sevenDaysInMs) {
        console.log(
          `[LinkedIn Publishing] Token expires in ${Math.round(tokenExpiresIn / (24 * 60 * 60 * 1000))} days, refreshing...`
        );

        const refreshResult = await ctx.runAction(
          internal.tokenRefresh.refreshLinkedInToken,
          { clerkUserId: post.clerkUserId }
        );

        if (!refreshResult.success) {
          if (refreshResult.needsReauth) {
            throw new Error(
              "LinkedIn token expired and refresh failed. Please reconnect your LinkedIn account in the settings."
            );
          }
          throw new Error(
            `Failed to refresh LinkedIn token: ${refreshResult.error || "Unknown error"}`
          );
        }

        console.log(
          `[LinkedIn Publishing] Successfully refreshed LinkedIn token for post ${args.postId}`
        );

        // Retrieve the connection again after refresh to get new access token
        connection = await ctx.runAction(
          internal.connections.getDecryptedConnection,
          {
            clerkUserId: post.clerkUserId,
            platform: "linkedin",
          }
        );

        if (!connection) {
          throw new Error(
            "Failed to retrieve LinkedIn connection after token refresh"
          );
        }
      }

      const accessToken = connection.accessToken;

      // Step 4: Get LinkedIn person ID
      const personId = await getLinkedInPersonId(accessToken);

      console.log(
        `[LinkedIn Publishing] Retrieved person ID for post ${args.postId}`
      );

      // Step 5: Publish UGC post to LinkedIn API
      const postUrn = await publishLinkedInUGCPost(
        accessToken,
        personId,
        post.linkedInContent || ""
      );

      console.log(
        `[LinkedIn Publishing] Successfully published LinkedIn post ${postUrn} for post ${args.postId}`
      );

      // Step 6: Post URL as comment (if provided)
      if (post.url && post.url.trim() !== "") {
        try {
          await publishLinkedInComment(accessToken, personId, post.url, postUrn);
          console.log(
            `[LinkedIn Publishing] Successfully posted URL comment for post ${args.postId}`
          );
        } catch (urlError) {
          // Log URL comment error but don't fail the entire post
          console.error(
            `[LinkedIn Publishing] Failed to post URL comment for post ${args.postId}:`,
            urlError instanceof Error ? urlError.message : "Unknown error"
          );
          // Continue to mark main post as published
        }
      }

      // Step 7: Update post status to "Published"
      await ctx.runMutation(internal.posts.updatePostStatus, {
        postId: args.postId,
        status: "Published",
        linkedInPostId: postUrn,
        errorMessage: undefined, // Clear any previous error messages
      });

      console.log(`[LinkedIn Publishing] Post ${args.postId} published successfully`);
    } catch (error) {
      // Handle errors with retry logic
      await handleLinkedInPublishingError(ctx, args.postId, error);
    }
  },
});

/**
 * Get the authenticated user's LinkedIn person ID
 *
 * @param accessToken - Decrypted OAuth access token
 * @returns The LinkedIn person ID
 * @throws Error if API call fails
 */
async function getLinkedInPersonId(accessToken: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    // Use OpenID Connect userinfo endpoint (works with openid scope)
    // This endpoint is compatible with the OpenID Connect flow
    const response = await fetch(`${LINKEDIN_API_BASE_URL}/v2/userinfo`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new LinkedInApiError(
        response.status,
        `LinkedIn API Error ${response.status}: ${errorBody}`
      );
    }

    const data = await response.json();

    // OpenID Connect userinfo returns 'sub' as the user identifier
    // Format: urn:li:person:XXXXXXXXXX or just the ID
    if (!data.sub) {
      throw new Error("LinkedIn API response missing person ID (sub claim)");
    }

    // Extract the person ID from the sub claim
    // If it's in URN format (urn:li:person:ID), extract just the ID
    // Otherwise, use it as-is
    const personId = data.sub.includes(":")
      ? data.sub.split(":").pop()
      : data.sub;

    return personId;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof LinkedInApiError) {
      throw error;
    }

    // Handle fetch errors (network issues, timeouts)
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new LinkedInApiError(0, "Request timeout");
      }
      throw new LinkedInApiError(0, `Network error: ${error.message}`);
    }

    throw new LinkedInApiError(0, "Unknown error during person ID retrieval");
  }
}

/**
 * Publish a UGC post to LinkedIn API
 *
 * @param accessToken - Decrypted OAuth access token
 * @param personId - LinkedIn person ID
 * @param text - Post text content (max 3,000 characters)
 * @returns The post URN from LinkedIn API
 * @throws Error if API call fails
 */
async function publishLinkedInUGCPost(
  accessToken: string,
  personId: string,
  text: string
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const requestBody = {
      author: `urn:li:person:${personId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: text,
          },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const response = await fetch(`${LINKEDIN_API_BASE_URL}/v2/ugcPosts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new LinkedInApiError(
        response.status,
        `LinkedIn API Error ${response.status}: ${errorBody}`
      );
    }

    const data = await response.json();

    if (!data.id) {
      throw new Error("LinkedIn API response missing post URN");
    }

    return data.id;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof LinkedInApiError) {
      throw error;
    }

    // Handle fetch errors (network issues, timeouts)
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new LinkedInApiError(0, "Request timeout");
      }
      throw new LinkedInApiError(0, `Network error: ${error.message}`);
    }

    throw new LinkedInApiError(0, "Unknown error during LinkedIn post publishing");
  }
}

/**
 * Post a comment on a LinkedIn UGC post
 *
 * @param accessToken - Decrypted OAuth access token
 * @param personId - LinkedIn person ID
 * @param text - Comment text (typically the URL)
 * @param postUrn - The UGC post URN to comment on
 * @throws Error if API call fails
 */
async function publishLinkedInComment(
  accessToken: string,
  personId: string,
  text: string,
  postUrn: string
): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const requestBody = {
      actor: `urn:li:person:${personId}`,
      message: {
        text: text,
      },
    };

    const response = await fetch(
      `${LINKEDIN_API_BASE_URL}/v2/socialActions/${encodeURIComponent(postUrn)}/comments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new LinkedInApiError(
        response.status,
        `LinkedIn API Error ${response.status}: ${errorBody}`
      );
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof LinkedInApiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new LinkedInApiError(0, "Request timeout");
      }
      throw new LinkedInApiError(0, `Network error: ${error.message}`);
    }

    throw new LinkedInApiError(0, "Unknown error during LinkedIn comment");
  }
}

/**
 * Handle LinkedIn publishing errors with retry logic
 *
 * @param ctx - Convex action context
 * @param postId - The ID of the post that failed
 * @param error - The error that occurred
 */
async function handleLinkedInPublishingError(
  ctx: any,
  postId: any,
  error: unknown
): Promise<void> {
  console.error(
    `[LinkedIn Publishing] Error publishing post ${postId}:`,
    error instanceof Error ? error.message : "Unknown error"
  );

  // Get current post to check retry count
  const post = await ctx.runQuery(internal.posts.getPostById, { postId });

  if (!post) {
    console.error(`[LinkedIn Publishing] Post ${postId} not found during error handling`);
    return;
  }

  const currentRetryCount = post.retryCount || 0;
  const isTransient = isLinkedInTransientError(error);

  console.log(
    `[LinkedIn Publishing] Error classification - Transient: ${isTransient}, Retry count: ${currentRetryCount}/${MAX_RETRIES}`
  );

  if (isTransient && currentRetryCount < MAX_RETRIES) {
    // Schedule a retry with exponential backoff
    const retryDelayMs = getRetryDelay(currentRetryCount);
    const newRetryCount = currentRetryCount + 1;

    console.log(
      `[LinkedIn Publishing] Scheduling retry ${newRetryCount}/${MAX_RETRIES} for post ${postId} in ${retryDelayMs}ms`
    );

    // Update retry count and set back to Scheduled for retry
    await ctx.runMutation(internal.posts.updatePostStatus, {
      postId,
      status: "Scheduled",
      retryCount: newRetryCount,
      errorMessage: `Retry attempt ${newRetryCount}/${MAX_RETRIES}: ${error instanceof Error ? error.message : "Unknown error"}`,
    });

    // Schedule the retry
    await ctx.scheduler.runAfter(
      retryDelayMs,
      internal.publishing.publishLinkedInPost,
      { postId }
    );
  } else {
    // Permanent failure or max retries reached
    const errorMessage =
      currentRetryCount >= MAX_RETRIES
        ? `Failed after ${MAX_RETRIES} retry attempts: ${error instanceof Error ? error.message : "Unknown error"}`
        : `Permanent error: ${error instanceof Error ? error.message : "Unknown error"}`;

    console.log(`[LinkedIn Publishing] Marking post ${postId} as Failed: ${errorMessage}`);

    // Update post status to Failed
    await ctx.runMutation(internal.posts.updatePostStatus, {
      postId,
      status: "Failed",
      errorMessage,
      retryCount: currentRetryCount,
    });

    // Trigger Telegram notification
    try {
      await ctx.runAction(internal.notifications.sendFailureNotification, {
        postId,
        content: post.linkedInContent || "",
        errorMessage,
        scheduledTime: post.linkedInScheduledTime || Date.now(),
        retryCount: currentRetryCount,
        platform: "linkedin",
      });
    } catch (notificationError) {
      console.error(
        `[LinkedIn Publishing] Failed to send failure notification for post ${postId}:`,
        notificationError instanceof Error
          ? notificationError.message
          : "Unknown error"
      );
    }
  }
}

/**
 * Determine if a LinkedIn error is transient (should retry) or permanent
 *
 * Transient errors:
 * - 429 Rate Limit
 * - 5xx Server Errors
 * - Network errors (timeout, connection reset, etc.)
 *
 * Permanent errors:
 * - 401 Unauthorized (invalid/expired token)
 * - 403 Forbidden (permission issue)
 * - 400 Bad Request (invalid data)
 *
 * @param error - The error to classify
 * @returns true if error is transient and should be retried
 */
function isLinkedInTransientError(error: unknown): boolean {
  if (error instanceof LinkedInApiError) {
    const status = error.status;

    // Transient HTTP errors
    if (status === 429) return true; // Rate limit
    if (status >= 500 && status < 600) return true; // Server errors

    // Permanent HTTP errors
    if (status === 401) return false; // Unauthorized
    if (status === 403) return false; // Forbidden
    if (status === 400) return false; // Bad Request

    // Network errors (status 0) are transient
    if (status === 0) return true;
  }

  // Network/timeout errors are transient
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("timeout")) return true;
    if (message.includes("network")) return true;
    if (message.includes("econnreset")) return true;
    if (message.includes("etimedout")) return true;
  }

  // Unknown errors are treated as permanent to avoid infinite retries
  return false;
}
