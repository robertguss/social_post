/**
 * Integration Tests for Post History Flow
 *
 * Tests the complete post history feature including:
 * - getPosts query with authentication and filtering
 * - Real-time updates when post status changes
 * - Telegram notification on post failure
 */

import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach, vi } from "vitest";
import { api, internal } from "@/convex/_generated/api";
import schema from "@/convex/schema";
import { Id } from "@/convex/_generated/dataModel";

describe("Post History Integration Tests", () => {
  describe("getPosts Query", () => {
    test("should require authentication", async () => {
      const t = convexTest(schema);

      // Call getPosts without authentication
      await expect(
        t.query(api.posts.getPosts, {})
      ).rejects.toThrow("Not authenticated");
    });

    test("should return only authenticated user's posts", async () => {
      const t = convexTest(schema);

      // Create mock user identity
      const asUser1 = t.withIdentity({
        subject: "user1",
        tokenIdentifier: "betterauth|user1",
      });

      const asUser2 = t.withIdentity({
        subject: "user2",
        tokenIdentifier: "betterauth|user2",
      });

      // Create posts for user1
      const post1Id = await asUser1.mutation(api.posts.createPost, {
        content: "User 1 post",
        scheduledTime: Date.now() + 60000,
      });

      // Create posts for user2
      const post2Id = await asUser2.mutation(api.posts.createPost, {
        content: "User 2 post",
        scheduledTime: Date.now() + 60000,
      });

      // Query as user1 - should only see user1's posts
      const user1Posts = await asUser1.query(api.posts.getPosts, {});
      expect(user1Posts.length).toBe(1);
      expect(user1Posts[0]._id).toBe(post1Id);
      expect(user1Posts[0].twitterContent).toBe("User 1 post");

      // Query as user2 - should only see user2's posts
      const user2Posts = await asUser2.query(api.posts.getPosts, {});
      expect(user2Posts.length).toBe(1);
      expect(user2Posts[0]._id).toBe(post2Id);
      expect(user2Posts[0].twitterContent).toBe("User 2 post");
    });

    test("should filter by date range correctly", async () => {
      const t = convexTest(schema);

      const asUser = t.withIdentity({
        subject: "user1",
        tokenIdentifier: "betterauth|user1",
      });

      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const nintyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

      // Create posts at different times
      await asUser.mutation(api.posts.createPost, {
        content: "Recent post",
        scheduledTime: now + 60000,
      });

      await asUser.mutation(api.posts.createPost, {
        content: "Old post",
        scheduledTime: nintyDaysAgo + 60000,
      });

      // Query with date range: last 7 days
      const recentPosts = await asUser.query(api.posts.getPosts, {
        startDate: sevenDaysAgo,
        endDate: now + 86400000, // +1 day to include future scheduled posts
      });

      expect(recentPosts.length).toBe(1);
      expect(recentPosts[0].twitterContent).toBe("Recent post");

      // Query with date range: last 90 days (should get both)
      const allPosts = await asUser.query(api.posts.getPosts, {
        startDate: nintyDaysAgo - 1000,
        endDate: now + 86400000,
      });

      expect(allPosts.length).toBe(2);
    });

    test("should filter by platform correctly", async () => {
      const t = convexTest(schema);

      const asUser = t.withIdentity({
        subject: "user1",
        tokenIdentifier: "betterauth|user1",
      });

      // Create Twitter post
      await asUser.mutation(api.posts.createPost, {
        content: "Twitter post",
        scheduledTime: Date.now() + 60000,
      });

      // Query for Twitter posts
      const twitterPosts = await asUser.query(api.posts.getPosts, {
        platform: "twitter",
      });

      expect(twitterPosts.length).toBe(1);
      expect(twitterPosts[0].twitterContent).toBe("Twitter post");
      expect(twitterPosts[0].twitterScheduledTime).toBeDefined();
    });

    test("should return posts sorted by scheduled time descending", async () => {
      const t = convexTest(schema);

      const asUser = t.withIdentity({
        subject: "user1",
        tokenIdentifier: "betterauth|user1",
      });

      const now = Date.now();

      // Create posts with different scheduled times
      await asUser.mutation(api.posts.createPost, {
        content: "Post 1",
        scheduledTime: now + 60000,
      });

      await asUser.mutation(api.posts.createPost, {
        content: "Post 2",
        scheduledTime: now + 120000,
      });

      await asUser.mutation(api.posts.createPost, {
        content: "Post 3",
        scheduledTime: now + 30000,
      });

      // Query all posts
      const posts = await asUser.query(api.posts.getPosts, {});

      // Should be sorted by scheduled time descending (newest first)
      expect(posts.length).toBe(3);
      expect(posts[0].twitterContent).toBe("Post 2"); // Latest
      expect(posts[1].twitterContent).toBe("Post 1");
      expect(posts[2].twitterContent).toBe("Post 3"); // Earliest
    });
  });

  describe("Real-Time Updates", () => {
    test("should reflect post status changes in real-time", async () => {
      const t = convexTest(schema);

      const asUser = t.withIdentity({
        subject: "user1",
        tokenIdentifier: "betterauth|user1",
      });

      // Create a scheduled post
      const postId = await asUser.mutation(api.posts.createPost, {
        content: "Status change test",
        scheduledTime: Date.now() + 60000,
      });

      // Initial query - status should be "Scheduled"
      let posts = await asUser.query(api.posts.getPosts, {});
      expect(posts[0].status).toBe("Scheduled");

      // Simulate status update to "Publishing"
      await t.mutation(internal.posts.updatePostStatus, {
        postId: postId as Id<"posts">,
        status: "Publishing",
      });

      // Query again - status should be updated
      posts = await asUser.query(api.posts.getPosts, {});
      expect(posts[0].status).toBe("Publishing");

      // Update to "Published"
      await t.mutation(internal.posts.updatePostStatus, {
        postId: postId as Id<"posts">,
        status: "Published",
        twitterPostId: "123456789",
      });

      // Query again - status should be "Published"
      posts = await asUser.query(api.posts.getPosts, {});
      expect(posts[0].status).toBe("Published");
      expect(posts[0].twitterPostId).toBe("123456789");
    });

    test("should show error message when post fails", async () => {
      const t = convexTest(schema);

      const asUser = t.withIdentity({
        subject: "user1",
        tokenIdentifier: "betterauth|user1",
      });

      // Create a scheduled post
      const postId = await asUser.mutation(api.posts.createPost, {
        content: "Failed post test",
        scheduledTime: Date.now() + 60000,
      });

      // Update to "Failed" with error message
      await t.mutation(internal.posts.updatePostStatus, {
        postId: postId as Id<"posts">,
        status: "Failed",
        errorMessage: "API rate limit exceeded",
        retryCount: 3,
      });

      // Query - should show error message
      const posts = await asUser.query(api.posts.getPosts, {});
      expect(posts[0].status).toBe("Failed");
      expect(posts[0].errorMessage).toBe("API rate limit exceeded");
      expect(posts[0].retryCount).toBe(3);
    });
  });

  describe("Telegram Notification", () => {
    test("should send notification when post fails after max retries", async () => {
      const t = convexTest(schema);

      // Mock fetch for Telegram API
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        text: async () => "OK",
      } as Response);

      // Set mock environment variables
      process.env.TELEGRAM_BOT_TOKEN = "test_token";
      process.env.TELEGRAM_CHAT_ID = "test_chat_id";

      // Call sendFailureNotification
      await t.action(internal.notifications.sendFailureNotification, {
        postId: "post123" as Id<"posts">,
        content: "Test post content",
        errorMessage: "API error",
        scheduledTime: Date.now(),
        retryCount: 3,
      });

      // Verify fetch was called with correct parameters
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("https://api.telegram.org/bot"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("Post Publishing Failed"),
        })
      );

      fetchSpy.mockRestore();
    });

    test("should handle Telegram API errors gracefully", async () => {
      const t = convexTest(schema);

      // Mock fetch to return error
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      } as Response);

      // Set mock environment variables
      process.env.TELEGRAM_BOT_TOKEN = "test_token";
      process.env.TELEGRAM_CHAT_ID = "test_chat_id";

      // Call sendFailureNotification - should not throw
      await expect(
        t.action(internal.notifications.sendFailureNotification, {
          postId: "post123" as Id<"posts">,
          content: "Test post content",
          errorMessage: "API error",
          scheduledTime: Date.now(),
          retryCount: 3,
        })
      ).resolves.not.toThrow();

      fetchSpy.mockRestore();
    });

    test("should handle missing Telegram credentials gracefully", async () => {
      const t = convexTest(schema);

      // Clear environment variables
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_CHAT_ID;

      // Call sendFailureNotification - should not throw
      await expect(
        t.action(internal.notifications.sendFailureNotification, {
          postId: "post123" as Id<"posts">,
          content: "Test post content",
          errorMessage: "API error",
          scheduledTime: Date.now(),
          retryCount: 3,
        })
      ).resolves.not.toThrow();
    });

    test("should format notification message correctly", async () => {
      const t = convexTest(schema);

      // Mock fetch to capture request body
      let requestBody: string | undefined;
      const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url, options) => {
        requestBody = options?.body as string;
        return {
          ok: true,
          text: async () => "OK",
        } as Response;
      });

      // Set mock environment variables
      process.env.TELEGRAM_BOT_TOKEN = "test_token";
      process.env.TELEGRAM_CHAT_ID = "test_chat_id";

      const testContent = "This is a test post for notification";
      const testError = "Rate limit exceeded";
      const testTime = Date.now();

      await t.action(internal.notifications.sendFailureNotification, {
        postId: "post123" as Id<"posts">,
        content: testContent,
        errorMessage: testError,
        scheduledTime: testTime,
        retryCount: 2,
      });

      // Verify message format
      expect(requestBody).toBeDefined();
      const body = JSON.parse(requestBody!);
      expect(body.text).toContain("Post Publishing Failed");
      expect(body.text).toContain(testContent);
      expect(body.text).toContain(testError);
      expect(body.text).toContain("2/3"); // Retry count
      expect(body.parse_mode).toBe("Markdown");

      fetchSpy.mockRestore();
    });
  });
});
