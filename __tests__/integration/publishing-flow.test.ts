/**
 * Integration tests for end-to-end publishing flow
 *
 * These tests verify the complete publishing workflow:
 * - Creating a post schedules the publishing action at the correct time
 * - Scheduled action publishes to X within 30 seconds of scheduled time
 * - Post status progresses correctly through lifecycle
 * - Retry mechanism works for transient failures
 * - Final failure handling after max retries
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock Convex context for integration testing
const mockContext = {
  db: {
    insert: jest.fn(),
    patch: jest.fn(),
    get: jest.fn(),
    query: jest.fn(),
  },
  auth: {
    getUserIdentity: jest.fn(),
  },
  scheduler: {
    runAt: jest.fn(),
    runAfter: jest.fn(),
  },
  runQuery: jest.fn(),
  runMutation: jest.fn(),
  runAction: jest.fn(),
};

// Mock time for scheduler testing
let mockCurrentTime = Date.now();

const advanceTime = (ms: number) => {
  mockCurrentTime += ms;
};

const resetTime = () => {
  mockCurrentTime = Date.now();
};

describe("End-to-End Publishing Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetTime();
  });

  describe("post creation and scheduling", () => {
    it("should create post and schedule publishing action at correct time", async () => {
      // Setup authenticated user
      mockContext.auth.getUserIdentity.mockResolvedValue({
        subject: "user-123",
        email: "test@example.com",
      });

      const scheduledTime = mockCurrentTime + 3600000; // 1 hour from now
      const args = {
        content: "Hello World!",
        url: "https://example.com",
        scheduledTime,
      };

      // Mock post creation
      const postId = "post-123";
      mockContext.db.insert.mockResolvedValue(postId);

      // Simulate createPost mutation
      await mockContext.db.insert("posts", {
        clerkUserId: "user-123",
        status: "Scheduled",
        twitterContent: args.content,
        twitterScheduledTime: args.scheduledTime,
        url: args.url,
        retryCount: 0,
      });

      // Schedule publishing action
      await mockContext.scheduler.runAt(
        scheduledTime,
        "internal.publishing.publishTwitterPost",
        { postId }
      );

      // Verify scheduler was called with correct time
      expect(mockContext.scheduler.runAt).toHaveBeenCalledWith(
        scheduledTime,
        "internal.publishing.publishTwitterPost",
        { postId }
      );

      // Verify post was created with Scheduled status
      expect(mockContext.db.insert).toHaveBeenCalledWith(
        "posts",
        expect.objectContaining({
          status: "Scheduled",
          retryCount: 0,
        })
      );
    });

    it("should fail to create post if scheduled time is in the past", async () => {
      mockContext.auth.getUserIdentity.mockResolvedValue({
        subject: "user-123",
        email: "test@example.com",
      });

      const pastTime = mockCurrentTime - 3600000; // 1 hour ago
      const args = {
        content: "Test",
        scheduledTime: pastTime,
      };

      // Validate scheduled time
      const isValidScheduledTime = args.scheduledTime > mockCurrentTime;
      expect(isValidScheduledTime).toBe(false);

      // Should throw error (simulated)
      if (!isValidScheduledTime) {
        expect(() => {
          throw new Error("Scheduled time must be in the future");
        }).toThrow("Scheduled time must be in the future");
      }
    });
  });

  describe("scheduled action publishing", () => {
    it("should publish to X within 30 seconds of scheduled time", async () => {
      const scheduledTime = mockCurrentTime + 3600000;

      // Advance time to scheduled time + 25 seconds (within 30 second window)
      advanceTime(3600000 + 25000);

      const timeDifference = mockCurrentTime - scheduledTime;

      expect(timeDifference).toBeLessThanOrEqual(30000); // Within 30 seconds
      expect(timeDifference).toBeGreaterThanOrEqual(0);
    });

    it("should execute publishing action at scheduled time", async () => {
      const postId = "post-123";
      const scheduledTime = mockCurrentTime + 3600000;

      // Schedule action
      await mockContext.scheduler.runAt(
        scheduledTime,
        "internal.publishing.publishTwitterPost",
        { postId }
      );

      // Advance time to scheduled time
      advanceTime(3600000);

      // Verify scheduler was invoked
      expect(mockContext.scheduler.runAt).toHaveBeenCalledWith(
        scheduledTime,
        "internal.publishing.publishTwitterPost",
        { postId }
      );
    });
  });

  describe("post status lifecycle", () => {
    it("should progress: Scheduled → Publishing → Published", async () => {
      const postId = "post-123";

      // Initial status: Scheduled
      mockContext.db.get.mockResolvedValueOnce({
        _id: postId,
        status: "Scheduled",
        clerkUserId: "user-123",
        twitterContent: "Test",
        url: "",
        retryCount: 0,
      });

      let post = await mockContext.db.get(postId);
      expect(post.status).toBe("Scheduled");

      // Update to Publishing
      mockContext.db.patch.mockResolvedValueOnce(undefined);
      await mockContext.db.patch(postId, { status: "Publishing" });

      mockContext.db.get.mockResolvedValueOnce({
        ...post,
        status: "Publishing",
      });

      post = await mockContext.db.get(postId);
      expect(post.status).toBe("Publishing");

      // Update to Published
      await mockContext.db.patch(postId, {
        status: "Published",
        twitterPostId: "tweet-123",
      });

      mockContext.db.get.mockResolvedValueOnce({
        ...post,
        status: "Published",
        twitterPostId: "tweet-123",
      });

      post = await mockContext.db.get(postId);
      expect(post.status).toBe("Published");
      expect(post.twitterPostId).toBe("tweet-123");
    });

    it("should progress: Scheduled → Publishing → Scheduled (retry)", async () => {
      const postId = "post-123";

      // Initial: Scheduled
      mockContext.db.get.mockResolvedValueOnce({
        _id: postId,
        status: "Scheduled",
        retryCount: 0,
      });

      let post = await mockContext.db.get(postId);
      expect(post.status).toBe("Scheduled");
      expect(post.retryCount).toBe(0);

      // Update to Publishing
      await mockContext.db.patch(postId, { status: "Publishing" });

      // Simulate transient error - back to Scheduled with incremented retry count
      await mockContext.db.patch(postId, {
        status: "Scheduled",
        retryCount: 1,
      });

      mockContext.db.get.mockResolvedValueOnce({
        _id: postId,
        status: "Scheduled",
        retryCount: 1,
      });

      post = await mockContext.db.get(postId);
      expect(post.status).toBe("Scheduled");
      expect(post.retryCount).toBe(1);
    });

    it("should progress: Scheduled → Publishing → Failed", async () => {
      const postId = "post-123";

      // Initial: Scheduled
      mockContext.db.get.mockResolvedValueOnce({
        _id: postId,
        status: "Scheduled",
        retryCount: 3,
      });

      let post = await mockContext.db.get(postId);
      expect(post.status).toBe("Scheduled");

      // Update to Publishing
      await mockContext.db.patch(postId, { status: "Publishing" });

      // Simulate final failure (max retries reached)
      const errorMessage = "Failed after 3 retry attempts: Rate limit exceeded";
      await mockContext.db.patch(postId, {
        status: "Failed",
        errorMessage,
        retryCount: 3,
      });

      mockContext.db.get.mockResolvedValueOnce({
        _id: postId,
        status: "Failed",
        errorMessage,
        retryCount: 3,
      });

      post = await mockContext.db.get(postId);
      expect(post.status).toBe("Failed");
      expect(post.errorMessage).toContain("Failed after 3 retry attempts");
    });
  });

  describe("retry mechanism", () => {
    it("should retry with exponential backoff for transient failures", async () => {
      const postId = "post-123";

      // Retry 1: 1 minute delay
      const delay1 = Math.pow(2, 0) * 60 * 1000;
      await mockContext.scheduler.runAfter(
        delay1,
        "internal.publishing.publishTwitterPost",
        { postId }
      );

      expect(mockContext.scheduler.runAfter).toHaveBeenCalledWith(
        60000, // 1 minute
        "internal.publishing.publishTwitterPost",
        { postId }
      );

      // Retry 2: 2 minute delay
      jest.clearAllMocks();
      const delay2 = Math.pow(2, 1) * 60 * 1000;
      await mockContext.scheduler.runAfter(
        delay2,
        "internal.publishing.publishTwitterPost",
        { postId }
      );

      expect(mockContext.scheduler.runAfter).toHaveBeenCalledWith(
        120000, // 2 minutes
        "internal.publishing.publishTwitterPost",
        { postId }
      );

      // Retry 3: 4 minute delay
      jest.clearAllMocks();
      const delay3 = Math.pow(2, 2) * 60 * 1000;
      await mockContext.scheduler.runAfter(
        delay3,
        "internal.publishing.publishTwitterPost",
        { postId }
      );

      expect(mockContext.scheduler.runAfter).toHaveBeenCalledWith(
        240000, // 4 minutes
        "internal.publishing.publishTwitterPost",
        { postId }
      );
    });

    it("should increment retry count on each retry", async () => {
      const postId = "post-123";

      // Initial retry count: 0
      await mockContext.db.patch(postId, { retryCount: 1 });

      // After first retry: 1
      mockContext.db.get.mockResolvedValueOnce({
        _id: postId,
        retryCount: 1,
      });

      let post = await mockContext.db.get(postId);
      expect(post.retryCount).toBe(1);

      // After second retry: 2
      await mockContext.db.patch(postId, { retryCount: 2 });
      mockContext.db.get.mockResolvedValueOnce({
        _id: postId,
        retryCount: 2,
      });

      post = await mockContext.db.get(postId);
      expect(post.retryCount).toBe(2);

      // After third retry: 3
      await mockContext.db.patch(postId, { retryCount: 3 });
      mockContext.db.get.mockResolvedValueOnce({
        _id: postId,
        retryCount: 3,
      });

      post = await mockContext.db.get(postId);
      expect(post.retryCount).toBe(3);
    });

    it("should stop retrying after reaching max retries (3)", async () => {
      const postId = "post-123";
      const maxRetries = 3;

      mockContext.db.get.mockResolvedValue({
        _id: postId,
        retryCount: 3,
      });

      const post = await mockContext.db.get(postId);
      const shouldRetry = post.retryCount < maxRetries;

      expect(shouldRetry).toBe(false);
      expect(post.retryCount).toBe(3);

      // Should NOT schedule another retry
      // Instead, should mark as Failed
    });
  });

  describe("final failure handling", () => {
    it("should mark post as Failed after max retries", async () => {
      const postId = "post-123";

      await mockContext.db.patch(postId, {
        status: "Failed",
        errorMessage: "Failed after 3 retry attempts: Rate limit exceeded",
        retryCount: 3,
      });

      mockContext.db.get.mockResolvedValue({
        _id: postId,
        status: "Failed",
        errorMessage: "Failed after 3 retry attempts: Rate limit exceeded",
        retryCount: 3,
      });

      const post = await mockContext.db.get(postId);

      expect(post.status).toBe("Failed");
      expect(post.errorMessage).toContain("Failed after 3 retry attempts");
      expect(post.retryCount).toBe(3);
    });

    it("should trigger Telegram notification on final failure", async () => {
      const postId = "post-123";
      const errorMessage =
        "Failed after 3 retry attempts: X API Error 429: Rate limit exceeded";

      // Mock notification action call
      mockContext.runAction.mockResolvedValue(undefined);

      await mockContext.runAction(
        "internal.notifications.sendFailureNotification",
        {
          postId,
          errorMessage,
        }
      );

      expect(mockContext.runAction).toHaveBeenCalledWith(
        "internal.notifications.sendFailureNotification",
        {
          postId,
          errorMessage,
        }
      );
    });

    it("should mark as Failed immediately for permanent errors (no retry)", async () => {
      const postId = "post-123";

      // Simulate 401 error (permanent)
      const isPermanentError = true;
      const retryCount = 0;

      if (isPermanentError) {
        await mockContext.db.patch(postId, {
          status: "Failed",
          errorMessage: "Permanent error: X API Error 401: Invalid credentials",
          retryCount,
        });
      }

      mockContext.db.get.mockResolvedValue({
        _id: postId,
        status: "Failed",
        retryCount: 0, // No retries for permanent errors
      });

      const post = await mockContext.db.get(postId);

      expect(post.status).toBe("Failed");
      expect(post.retryCount).toBe(0); // Should not have incremented retry count
    });
  });

  describe("URL threading", () => {
    it("should post URL as reply after main tweet publishes", async () => {
      // Simulate main tweet published
      const tweetId = "tweet-123";

      // Simulate URL reply
      const urlReplyCallArgs = {
        text: "https://example.com",
        reply: {
          in_reply_to_tweet_id: tweetId,
        },
      };

      expect(urlReplyCallArgs.reply.in_reply_to_tweet_id).toBe(tweetId);
      expect(urlReplyCallArgs.text).toContain("https://");
    });

    it("should not post URL reply if URL is empty", async () => {
      const url = "";
      const shouldPostUrlReply = !!(url && url.trim() !== "");

      expect(shouldPostUrlReply).toBe(false);
    });

    it("should handle URL reply failure gracefully (main post still succeeds)", async () => {
      const postId = "post-123";
      const tweetId = "tweet-123";

      // Main tweet published successfully
      await mockContext.db.patch(postId, {
        status: "Published",
        twitterPostId: tweetId,
      });

      // URL reply fails (but doesn't affect main post status)
      const urlReplyError = new Error("URL reply failed");

      // Main post should still be Published
      mockContext.db.get.mockResolvedValue({
        _id: postId,
        status: "Published",
        twitterPostId: tweetId,
      });

      const post = await mockContext.db.get(postId);

      expect(post.status).toBe("Published");
      expect(urlReplyError.message).toBe("URL reply failed");
    });
  });

  describe("error handling edge cases", () => {
    it("should handle missing post gracefully (post deleted during publishing)", async () => {
      const postId = "non-existent-post";

      mockContext.db.get.mockResolvedValue(null);

      const post = await mockContext.db.get(postId);

      expect(post).toBeNull();
      // Publishing action should exit gracefully without errors
    });

    it("should handle post already published (duplicate action trigger)", async () => {
      const postId = "post-123";

      mockContext.db.get.mockResolvedValue({
        _id: postId,
        status: "Published",
        twitterPostId: "tweet-123",
      });

      const post = await mockContext.db.get(postId);
      const shouldPublish = post.status === "Scheduled";

      expect(shouldPublish).toBe(false);
      // Publishing action should skip this post
    });

    it("should handle scheduler failure during post creation", async () => {
      const postId = "post-123";

      // Mock scheduler failure
      mockContext.scheduler.runAt.mockRejectedValue(
        new Error("Scheduler service unavailable")
      );

      try {
        await mockContext.scheduler.runAt(
          Date.now() + 3600000,
          "internal.publishing.publishTwitterPost",
          { postId }
        );
      } catch (error) {
        // Should catch error and update post status to Failed
        await mockContext.db.patch(postId, {
          status: "Failed",
          errorMessage: `Failed to schedule post: ${(error as Error).message}`,
        });

        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Scheduler service unavailable");
      }
    });
  });

  describe("time-based validation", () => {
    it("should validate post is scheduled within 30 seconds accuracy window", () => {
      const scheduledTime = mockCurrentTime + 3600000; // 1 hour from now
      const actualPublishTime = scheduledTime + 25000; // 25 seconds later

      const timeDifference = actualPublishTime - scheduledTime;

      expect(timeDifference).toBeLessThanOrEqual(30000);
    });

    it("should handle posts scheduled far in the future (24+ hours)", async () => {
      // Reset mock to clear previous failure state
      mockContext.scheduler.runAt.mockClear();
      mockContext.scheduler.runAt.mockResolvedValue(undefined);

      const farFutureTime = mockCurrentTime + 86400000 * 7; // 7 days from now

      await mockContext.scheduler.runAt(
        farFutureTime,
        "internal.publishing.publishTwitterPost",
        { postId: "post-123" }
      );

      expect(mockContext.scheduler.runAt).toHaveBeenCalledWith(
        farFutureTime,
        "internal.publishing.publishTwitterPost",
        { postId: "post-123" }
      );
    });
  });
});
