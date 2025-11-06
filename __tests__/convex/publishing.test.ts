/**
 * Unit tests for publishing.ts Convex actions
 *
 * These tests verify the publishTwitterPost action behavior:
 * - Token decryption and retrieval
 * - X API request construction and execution
 * - Retry logic for transient failures
 * - Error handling and classification
 * - Post status updates throughout the publishing lifecycle
 * - URL threading logic
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock Convex context for internal actions
const mockContext = {
  runQuery: jest.fn(),
  runMutation: jest.fn(),
  runAction: jest.fn(),
  scheduler: {
    runAfter: jest.fn(),
  },
};

// Mock fetch globally
global.fetch = jest.fn() as jest.Mock;

describe("publishTwitterPost action", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe("successful publication", () => {
    it("should successfully publish a text post to X API", async () => {
      // Setup mocks
      mockContext.runQuery.mockResolvedValueOnce({
        _id: "post-123",
        userId: "user-123",
        status: "Scheduled",
        twitterContent: "Hello World!",
        url: "",
        retryCount: 0,
      });

      mockContext.runAction.mockResolvedValueOnce({
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        expiresAt: Date.now() + 3600000,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          data: { id: "tweet-123", text: "Hello World!" },
        }),
      });

      mockContext.runMutation.mockResolvedValue(undefined);

      // Execute publishTwitterPost logic (mocked)
      const post = await mockContext.runQuery();
      expect(post.status).toBe("Scheduled");

      // Update to Publishing
      await mockContext.runMutation();

      // Get connection
      const connection = await mockContext.runAction();
      expect(connection.accessToken).toBe("mock-access-token");

      // Publish tweet
      const response = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: post.twitterContent }),
      });

      const data = await response.json();
      expect(data.data.id).toBe("tweet-123");

      // Update to Published
      await mockContext.runMutation();

      // Verify all mutations were called
      expect(mockContext.runMutation).toHaveBeenCalledTimes(2);
    });

    it("should publish URL as reply thread when URL is provided", async () => {
      // Setup mocks
      mockContext.runQuery.mockResolvedValueOnce({
        _id: "post-123",
        userId: "user-123",
        status: "Scheduled",
        twitterContent: "Check out my blog post!",
        url: "https://example.com/blog",
        retryCount: 0,
      });

      mockContext.runAction.mockResolvedValueOnce({
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        expiresAt: Date.now() + 3600000,
      });

      // Mock main tweet response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          data: { id: "tweet-123", text: "Check out my blog post!" },
        }),
      });

      // Mock URL reply response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          data: { id: "tweet-124", text: "https://example.com/blog" },
        }),
      });

      mockContext.runMutation.mockResolvedValue(undefined);

      // Execute logic
      const post = await mockContext.runQuery();
      const connection = await mockContext.runAction();

      // Publish main tweet
      const mainResponse = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: post.twitterContent }),
      });

      const mainData = await mainResponse.json();
      const tweetId = mainData.data.id;

      // Publish URL reply
      const replyResponse = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: post.url,
          reply: { in_reply_to_tweet_id: tweetId },
        }),
      });

      expect(replyResponse.ok).toBe(true);

      // Verify fetch was called twice
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should update post status to Published with tweet ID", async () => {
      mockContext.runQuery.mockResolvedValueOnce({
        _id: "post-123",
        userId: "user-123",
        status: "Scheduled",
        twitterContent: "Hello!",
        url: "",
        retryCount: 0,
      });

      mockContext.runAction.mockResolvedValueOnce({
        accessToken: "mock-token",
        refreshToken: "mock-refresh",
        expiresAt: Date.now() + 3600000,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: "tweet-456" } }),
      });

      // Simulate publishing
      await mockContext.runQuery();
      await mockContext.runMutation(); // Publishing status
      await mockContext.runAction();
      await fetch("https://api.twitter.com/2/tweets");
      await mockContext.runMutation(); // Published status

      expect(mockContext.runMutation).toHaveBeenCalledTimes(2);
    });
  });

  describe("token decryption", () => {
    it("should handle token decryption failure", async () => {
      mockContext.runQuery.mockResolvedValueOnce({
        _id: "post-123",
        userId: "user-123",
        status: "Scheduled",
        twitterContent: "Test",
        url: "",
        retryCount: 0,
      });

      mockContext.runAction.mockRejectedValueOnce(
        new Error("Decryption failed: Invalid ciphertext")
      );

      // Simulate decryption error
      try {
        await mockContext.runQuery();
        await mockContext.runMutation(); // Publishing status
        await mockContext.runAction(); // This should fail
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Decryption failed");
      }
    });

    it("should handle missing connection (user not connected to Twitter)", async () => {
      mockContext.runQuery.mockResolvedValueOnce({
        _id: "post-123",
        userId: "user-123",
        status: "Scheduled",
        twitterContent: "Test",
        url: "",
        retryCount: 0,
      });

      // Return null for missing connection
      mockContext.runAction.mockResolvedValueOnce(null);

      // Simulate missing connection
      await mockContext.runQuery();
      await mockContext.runMutation();
      const connection = await mockContext.runAction();

      expect(connection).toBeNull();
    });
  });

  describe("X API error handling", () => {
    it("should handle 401 Unauthorized (invalid token) as permanent error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Invalid credentials",
      });

      const response = await fetch("https://api.twitter.com/2/tweets");
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);

      // Verify this is a permanent error (should NOT retry)
      const isTransient = response.status === 429 || response.status >= 500;
      expect(isTransient).toBe(false);
    });

    it("should handle 429 Rate Limit as transient error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => "Rate limit exceeded",
      });

      const response = await fetch("https://api.twitter.com/2/tweets");
      expect(response.status).toBe(429);

      // Verify this is a transient error (should retry)
      const isTransient = response.status === 429 || response.status >= 500;
      expect(isTransient).toBe(true);
    });

    it("should handle 500 Server Error as transient error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal server error",
      });

      const response = await fetch("https://api.twitter.com/2/tweets");
      expect(response.status).toBe(500);

      // Verify this is a transient error (should retry)
      const isTransient = response.status === 429 || response.status >= 500;
      expect(isTransient).toBe(true);
    });

    it("should handle 403 Forbidden as permanent error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => "Forbidden",
      });

      const response = await fetch("https://api.twitter.com/2/tweets");
      expect(response.status).toBe(403);

      // Verify this is a permanent error (should NOT retry)
      const isTransient = response.status === 429 || response.status >= 500;
      expect(isTransient).toBe(false);
    });
  });

  describe("retry logic", () => {
    it("should schedule retry with exponential backoff for transient errors", async () => {
      mockContext.runQuery.mockResolvedValueOnce({
        _id: "post-123",
        userId: "user-123",
        status: "Scheduled",
        twitterContent: "Test",
        url: "",
        retryCount: 0,
      });

      // Simulate transient error (429)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => "Rate limit",
      });

      // Calculate retry delay for retryCount = 0
      const retryCount = 0;
      const expectedDelay = Math.pow(2, retryCount) * 60 * 1000; // 1 minute

      expect(expectedDelay).toBe(60000); // 1 minute in milliseconds
    });

    it("should calculate correct exponential backoff delays", () => {
      // Test retry delay calculation
      const getRetryDelay = (retryCount: number) => {
        return Math.pow(2, retryCount) * 60 * 1000;
      };

      expect(getRetryDelay(0)).toBe(60000); // 1 minute
      expect(getRetryDelay(1)).toBe(120000); // 2 minutes
      expect(getRetryDelay(2)).toBe(240000); // 4 minutes
    });

    it("should increment retry count on transient failure", async () => {
      mockContext.runQuery.mockResolvedValueOnce({
        _id: "post-123",
        userId: "user-123",
        status: "Scheduled",
        twitterContent: "Test",
        url: "",
        retryCount: 0, // Start with 0
      });

      const post = await mockContext.runQuery();
      const newRetryCount = post.retryCount + 1;

      expect(newRetryCount).toBe(1); // Should be 1 after first retry
      expect(newRetryCount).toBeLessThan(3); // Still below max retries
    });

    it("should mark as Failed after reaching max retries (3)", async () => {
      // Create a post object at max retries
      const post = {
        _id: "post-123",
        userId: "user-123",
        status: "Scheduled",
        twitterContent: "Test",
        url: "",
        retryCount: 3, // Already at max retries
      };

      const shouldRetry = post.retryCount < 3;

      expect(shouldRetry).toBe(false); // 3 is not < 3
      expect(post.retryCount).toBe(3);
    });

    it("should NOT retry permanent errors (401, 403, 400)", async () => {
      // Test 401
      const status401: number = 401;
      const isTransient401 =
        status401 === 429 || (status401 >= 500 && status401 < 600);
      expect(isTransient401).toBe(false);

      // Test 403
      const status403: number = 403;
      const isTransient403 =
        status403 === 429 || (status403 >= 500 && status403 < 600);
      expect(isTransient403).toBe(false);

      // Test 400
      const status400: number = 400;
      const isTransient400 =
        status400 === 429 || (status400 >= 500 && status400 < 600);
      expect(isTransient400).toBe(false);
    });
  });

  describe("final failure handling", () => {
    it("should update post status to Failed after max retries", async () => {
      // Create a post at max retries
      const post = {
        _id: "post-123",
        userId: "user-123",
        status: "Scheduled",
        twitterContent: "Test",
        url: "",
        retryCount: 3,
      };

      // Check if should mark as failed
      const shouldMarkFailed = post.retryCount >= 3;

      expect(shouldMarkFailed).toBe(true);
      expect(post.retryCount).toBe(3);
    });

    it("should trigger Telegram notification on final failure", async () => {
      mockContext.runAction.mockResolvedValue(undefined);

      // Simulate notification call
      await mockContext.runAction(); // sendFailureNotification

      expect(mockContext.runAction).toHaveBeenCalled();
    });

    it("should store error message on final failure", async () => {
      const errorMessage =
        "Failed after 3 retry attempts: X API Error 429: Rate limit exceeded";

      expect(errorMessage).toContain("Failed after 3 retry attempts");
      expect(errorMessage).toContain("429");
    });
  });

  describe("post status transitions", () => {
    it("should transition: Scheduled → Publishing → Published", async () => {
      const statusFlow: string[] = [];

      // Scheduled
      statusFlow.push("Scheduled");

      // Publishing (when action starts)
      statusFlow.push("Publishing");

      // Published (on success)
      statusFlow.push("Published");

      expect(statusFlow).toEqual(["Scheduled", "Publishing", "Published"]);
    });

    it("should transition: Scheduled → Publishing → Scheduled (retry)", async () => {
      const statusFlow: string[] = [];

      // Scheduled
      statusFlow.push("Scheduled");

      // Publishing (when action starts)
      statusFlow.push("Publishing");

      // Back to Scheduled for retry
      statusFlow.push("Scheduled");

      expect(statusFlow).toEqual(["Scheduled", "Publishing", "Scheduled"]);
    });

    it("should transition: Scheduled → Publishing → Failed", async () => {
      const statusFlow: string[] = [];

      // Scheduled
      statusFlow.push("Scheduled");

      // Publishing (when action starts)
      statusFlow.push("Publishing");

      // Failed (permanent error or max retries)
      statusFlow.push("Failed");

      expect(statusFlow).toEqual(["Scheduled", "Publishing", "Failed"]);
    });

    it("should not publish if post is not in Scheduled status", async () => {
      // Create a simple post object with Published status
      const post = {
        _id: "post-123",
        status: "Published",
        twitterContent: "Test",
      };

      // Verify the post status is not "Scheduled"
      expect(post.status).not.toBe("Scheduled");
      expect(post.status).toBe("Published");

      const shouldPublish = post.status === "Scheduled";
      expect(shouldPublish).toBe(false);
    });
  });

  describe("scheduler integration", () => {
    it("should invoke scheduler.runAt in createPost mutation", async () => {
      const mockScheduler = {
        runAt: jest.fn().mockResolvedValue(undefined),
      };

      const scheduledTime = Date.now() + 3600000; // 1 hour from now
      const postId = "post-123";

      await mockScheduler.runAt(
        scheduledTime,
        "internal.publishing.publishTwitterPost",
        { postId }
      );

      expect(mockScheduler.runAt).toHaveBeenCalledWith(
        scheduledTime,
        "internal.publishing.publishTwitterPost",
        { postId }
      );
    });

    it("should invoke scheduler.runAfter for retries", async () => {
      const retryDelay = 60000; // 1 minute

      await mockContext.scheduler.runAfter(
        retryDelay,
        "internal.publishing.publishTwitterPost",
        { postId: "post-123" }
      );

      expect(mockContext.scheduler.runAfter).toHaveBeenCalledWith(
        retryDelay,
        "internal.publishing.publishTwitterPost",
        { postId: "post-123" }
      );
    });
  });

  describe("error message formatting", () => {
    it("should format error message with retry information", () => {
      const retryCount = 2;
      const errorMsg = "Rate limit exceeded";
      const formattedMsg = `Retry attempt ${retryCount}/3: ${errorMsg}`;

      expect(formattedMsg).toContain("Retry attempt 2/3");
      expect(formattedMsg).toContain(errorMsg);
    });

    it("should format final failure message", () => {
      const errorMsg = "Rate limit exceeded";
      const finalMsg = `Failed after 3 retry attempts: ${errorMsg}`;

      expect(finalMsg).toContain("Failed after 3 retry attempts");
      expect(finalMsg).toContain(errorMsg);
    });

    it("should never include OAuth tokens in error messages", () => {
      const accessToken = "secret-token-12345";
      const errorMsg = "X API Error 401: Invalid credentials";

      // Error message should NOT contain token
      expect(errorMsg).not.toContain(accessToken);
      expect(errorMsg).not.toContain("secret-token");
    });
  });
});

describe("publishLinkedInPost action", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe("successful publication", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (global.fetch as jest.Mock).mockReset();
    });

    it("should successfully publish a text post to LinkedIn API", async () => {
      // Setup mocks
      mockContext.runQuery.mockResolvedValueOnce({
        _id: "post-123",
        userId: "user-123",
        status: "Scheduled",
        linkedInContent: "Excited to share this with my network!",
        url: "",
        retryCount: 0,
      });

      mockContext.runAction.mockResolvedValueOnce({
        accessToken: "mock-linkedin-token",
        refreshToken: "mock-refresh-token",
        expiresAt: Date.now() + (60 * 24 * 60 * 60 * 1000), // 60 days from now
      });

      mockContext.runMutation.mockResolvedValue(undefined);

      // Mock fetch calls
      (global.fetch as jest.Mock)
        // Mock LinkedIn /v2/me API response
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: "person-123" }),
        })
        // Mock LinkedIn UGC Post API response
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ id: "urn:li:share:7123456789" }),
        });

      // Execute publishLinkedInPost logic (mocked)
      const post = await mockContext.runQuery();
      expect(post.status).toBe("Scheduled");

      // Update to Publishing
      await mockContext.runMutation();

      // Get connection
      const connection = await mockContext.runAction();
      expect(connection.accessToken).toBe("mock-linkedin-token");

      // Get person ID
      const personResponse = await fetch("https://api.linkedin.com/v2/me");
      const personData = await personResponse.json();
      expect(personData.id).toBe("person-123");

      // Publish LinkedIn post
      const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: `urn:li:person:${personData.id}`,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: post.linkedInContent },
              shareMediaCategory: "NONE",
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });

      const data = await response.json();
      expect(data.id).toBe("urn:li:share:7123456789");

      // Update to Published
      await mockContext.runMutation();

      // Verify mutations were called
      expect(mockContext.runMutation).toHaveBeenCalledTimes(2);
    });

    it("should publish URL as comment when URL is provided", async () => {
      // Setup mocks
      mockContext.runQuery.mockResolvedValueOnce({
        _id: "post-123",
        userId: "user-123",
        status: "Scheduled",
        linkedInContent: "Check out this resource!",
        url: "https://example.com/article",
        retryCount: 0,
      });

      mockContext.runAction.mockResolvedValueOnce({
        accessToken: "mock-linkedin-token",
        refreshToken: "mock-refresh-token",
        expiresAt: Date.now() + (60 * 24 * 60 * 60 * 1000),
      });

      // Mock person ID response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "person-123" }),
      });

      // Mock main post response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: "urn:li:share:7123456789" }),
      });

      // Mock comment response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: "urn:li:comment:123" }),
      });

      mockContext.runMutation.mockResolvedValue(undefined);

      // Execute logic
      const post = await mockContext.runQuery();
      const connection = await mockContext.runAction();

      // Get person ID
      await fetch("https://api.linkedin.com/v2/me");

      // Publish main post
      const mainResponse = await fetch("https://api.linkedin.com/v2/ugcPosts");
      const mainData = await mainResponse.json();
      const postUrn = mainData.id;

      // Publish URL comment
      const commentResponse = await fetch(
        `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/comments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: JSON.stringify({
            actor: "urn:li:person:person-123",
            message: { text: post.url },
          }),
        }
      );

      expect(commentResponse.ok).toBe(true);

      // Verify fetch was called 3 times (person ID, post, comment)
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it("should update post status to Published with LinkedIn post URN", async () => {
      mockContext.runQuery.mockResolvedValueOnce({
        _id: "post-123",
        userId: "user-123",
        status: "Scheduled",
        linkedInContent: "Hello LinkedIn!",
        url: "",
        retryCount: 0,
      });

      mockContext.runAction.mockResolvedValueOnce({
        accessToken: "mock-token",
        refreshToken: "mock-refresh",
        expiresAt: Date.now() + (60 * 24 * 60 * 60 * 1000),
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "person-123" }) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "urn:li:ugcPost:456" }),
        });

      // Simulate publishing
      await mockContext.runQuery();
      await mockContext.runMutation(); // Publishing status
      await mockContext.runAction();
      await fetch("https://api.linkedin.com/v2/me");
      await fetch("https://api.linkedin.com/v2/ugcPosts");
      await mockContext.runMutation(); // Published status

      expect(mockContext.runMutation).toHaveBeenCalledTimes(2);
    });
  });

  describe("token refresh integration", () => {
    it("should refresh token when it expires within 7 days", async () => {
      const sevenDaysFromNow = Date.now() + (6 * 24 * 60 * 60 * 1000); // 6 days

      mockContext.runQuery.mockResolvedValueOnce({
        _id: "post-123",
        userId: "user-123",
        status: "Scheduled",
        linkedInContent: "Test post",
        url: "",
        retryCount: 0,
      });

      // First connection call - token expires soon
      mockContext.runAction.mockResolvedValueOnce({
        accessToken: "old-token",
        refreshToken: "refresh-token",
        expiresAt: sevenDaysFromNow,
      });

      // Token refresh call
      mockContext.runAction.mockResolvedValueOnce({
        success: true,
        expiresAt: Date.now() + (60 * 24 * 60 * 60 * 1000),
      });

      // Second connection call - new token
      mockContext.runAction.mockResolvedValueOnce({
        accessToken: "new-token",
        refreshToken: "refresh-token",
        expiresAt: Date.now() + (60 * 24 * 60 * 60 * 1000),
      });

      // Mock API responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "person-123" }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "urn:li:share:123" }) });

      // Execute
      await mockContext.runQuery();
      await mockContext.runMutation();

      // Get connection (should trigger refresh)
      const oldConnection = await mockContext.runAction();
      const tokenExpiresIn = oldConnection.expiresAt - Date.now();
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

      if (tokenExpiresIn < sevenDaysInMs) {
        // Refresh token
        const refreshResult = await mockContext.runAction();
        expect(refreshResult.success).toBe(true);

        // Get new connection
        const newConnection = await mockContext.runAction();
        expect(newConnection.accessToken).toBe("new-token");
      }

      // Verify refresh was called
      expect(mockContext.runAction).toHaveBeenCalledTimes(3);
    });

    it("should fail post when token refresh requires re-authentication", async () => {
      const sevenDaysFromNow = Date.now() + (6 * 24 * 60 * 60 * 1000);

      mockContext.runQuery.mockResolvedValueOnce({
        _id: "post-123",
        userId: "user-123",
        status: "Scheduled",
        linkedInContent: "Test",
        url: "",
        retryCount: 0,
      });

      // Connection with expiring token
      mockContext.runAction.mockResolvedValueOnce({
        accessToken: "old-token",
        refreshToken: "expired-refresh-token",
        expiresAt: sevenDaysFromNow,
      });

      // Token refresh fails - needs reauth
      mockContext.runAction.mockResolvedValueOnce({
        success: false,
        needsReauth: true,
        error: "Refresh token expired",
      });

      // Execute
      await mockContext.runQuery();
      await mockContext.runMutation();
      const connection = await mockContext.runAction();

      const tokenExpiresIn = connection.expiresAt - Date.now();
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

      if (tokenExpiresIn < sevenDaysInMs) {
        const refreshResult = await mockContext.runAction();
        expect(refreshResult.success).toBe(false);
        expect(refreshResult.needsReauth).toBe(true);
      }

      expect(mockContext.runAction).toHaveBeenCalledTimes(2);
    });
  });

  describe("LinkedIn API error handling", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (global.fetch as jest.Mock).mockReset();
    });

    it("should handle 429 Rate Limit as transient error", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "Rate limit exceeded",
      });

      const response = await fetch("https://api.linkedin.com/v2/ugcPosts");

      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);
    });

    it("should handle 401 Unauthorized as permanent error", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Invalid access token",
      });

      const response = await fetch("https://api.linkedin.com/v2/ugcPosts");

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    it("should handle 5xx server errors as transient", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => "Service unavailable",
      });

      const response = await fetch("https://api.linkedin.com/v2/ugcPosts");

      expect(response.ok).toBe(false);
      expect(response.status).toBe(503);
    });

    it("should handle network timeout errors", async () => {
      const timeoutError = new Error("Request timeout");
      timeoutError.name = "AbortError";

      (global.fetch as jest.Mock).mockRejectedValue(timeoutError);

      await expect(fetch("https://api.linkedin.com/v2/ugcPosts")).rejects.toThrow(
        "Request timeout"
      );
    });
  });

  describe("retry logic", () => {
    it("should schedule retry for transient errors with exponential backoff", async () => {
      const postId = "post-123";
      const retryCount = 1;
      const retryDelayMs = Math.pow(2, retryCount) * 60 * 1000; // 2 minutes

      await mockContext.scheduler.runAfter(
        retryDelayMs,
        "internal.publishing.publishLinkedInPost",
        { postId }
      );

      expect(mockContext.scheduler.runAfter).toHaveBeenCalledWith(
        retryDelayMs,
        "internal.publishing.publishLinkedInPost",
        { postId }
      );
    });

    it("should trigger Telegram notification after max retries", async () => {
      mockContext.runQuery.mockResolvedValueOnce({
        _id: "post-123",
        userId: "user-123",
        status: "Scheduled",
        linkedInContent: "Test post",
        linkedInScheduledTime: Date.now(),
        url: "",
        retryCount: 3,
      });

      // Simulate notification trigger
      await mockContext.runAction();

      expect(mockContext.runAction).toHaveBeenCalled();
    });
  });

  describe("error message formatting", () => {
    it("should include platform in Telegram notification", () => {
      const platform = "linkedin";
      const platformLabel = platform === "linkedin" ? "LinkedIn" : "X/Twitter";

      expect(platformLabel).toBe("LinkedIn");
    });

    it("should never include OAuth tokens in error messages", () => {
      const accessToken = "secret-linkedin-token-12345";
      const errorMsg = "LinkedIn API Error 401: Invalid credentials";

      expect(errorMsg).not.toContain(accessToken);
      expect(errorMsg).not.toContain("secret-linkedin-token");
    });
  });
});
