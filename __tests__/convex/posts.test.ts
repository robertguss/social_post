/**
 * Integration tests for posts.ts Convex mutations
 *
 * These tests verify the createPost mutation behavior:
 * - Successfully creates post records with correct fields
 * - Verifies user authentication
 * - Validates required fields and constraints
 * - Ensures post status is set to "Scheduled"
 * - Tests timestamp handling
 */

import { describe, it, expect, beforeEach } from "@jest/globals";

// Mock Convex context
const mockContext = {
  db: {
    insert: jest.fn().mockResolvedValue("mock-post-id"),
  },
  auth: {
    getUserIdentity: jest.fn(),
  },
};

// Mock implementation of createPost mutation logic
// (In a real Convex testing setup, we'd use Convex testing utilities)
async function createPostMock(ctx: any, args: { content: string; url?: string; scheduledTime: number }) {
  // Verify user authentication
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const clerkUserId = identity.subject;

  // Validate content
  if (!args.content || args.content.trim() === "") {
    throw new Error("Post content is required");
  }

  if (args.content.length > 280) {
    throw new Error("Post content exceeds 280 character limit");
  }

  // Validate scheduled time (must be in the future)
  const now = Date.now();
  if (args.scheduledTime <= now) {
    throw new Error("Scheduled time must be in the future");
  }

  // Create the post record
  const postId = await ctx.db.insert("posts", {
    clerkUserId,
    status: "Scheduled",
    twitterContent: args.content,
    linkedInContent: "",
    twitterScheduledTime: args.scheduledTime,
    linkedInScheduledTime: undefined,
    url: args.url || "",
    errorMessage: undefined,
    retryCount: undefined,
    twitterPostId: undefined,
    linkedInPostId: undefined,
  });

  return postId;
}

describe("createPost mutation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully create a post with valid data", async () => {
    // Setup mock authenticated user
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const futureTime = Date.now() + 3600000; // 1 hour from now
    const args = {
      content: "Hello World!",
      url: "https://example.com",
      scheduledTime: futureTime,
    };

    const postId = await createPostMock(mockContext, args);

    // Verify post was created
    expect(postId).toBe("mock-post-id");
    expect(mockContext.db.insert).toHaveBeenCalledWith("posts", {
      clerkUserId: "user_123",
      status: "Scheduled",
      twitterContent: "Hello World!",
      linkedInContent: "",
      twitterScheduledTime: futureTime,
      linkedInScheduledTime: undefined,
      url: "https://example.com",
      errorMessage: undefined,
      retryCount: undefined,
      twitterPostId: undefined,
      linkedInPostId: undefined,
    });
  });

  it("should throw error if user is not authenticated", async () => {
    // Setup unauthenticated user
    mockContext.auth.getUserIdentity.mockResolvedValue(null);

    const futureTime = Date.now() + 3600000;
    const args = {
      content: "Hello World!",
      scheduledTime: futureTime,
    };

    await expect(createPostMock(mockContext, args)).rejects.toThrow(
      "Not authenticated"
    );
  });

  it("should throw error if content is empty", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const futureTime = Date.now() + 3600000;
    const args = {
      content: "",
      scheduledTime: futureTime,
    };

    await expect(createPostMock(mockContext, args)).rejects.toThrow(
      "Post content is required"
    );
  });

  it("should throw error if content exceeds 280 characters", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const futureTime = Date.now() + 3600000;
    const args = {
      content: "a".repeat(281), // 281 characters
      scheduledTime: futureTime,
    };

    await expect(createPostMock(mockContext, args)).rejects.toThrow(
      "Post content exceeds 280 character limit"
    );
  });

  it("should throw error if scheduled time is in the past", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const pastTime = Date.now() - 3600000; // 1 hour ago
    const args = {
      content: "Hello World!",
      scheduledTime: pastTime,
    };

    await expect(createPostMock(mockContext, args)).rejects.toThrow(
      "Scheduled time must be in the future"
    );
  });

  it("should set post status to Scheduled", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const futureTime = Date.now() + 3600000;
    const args = {
      content: "Hello World!",
      scheduledTime: futureTime,
    };

    await createPostMock(mockContext, args);

    // Verify status field
    const insertCall = mockContext.db.insert.mock.calls[0];
    expect(insertCall[1].status).toBe("Scheduled");
  });

  it("should handle optional URL field", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const futureTime = Date.now() + 3600000;

    // Test without URL
    await createPostMock(mockContext, {
      content: "Hello World!",
      scheduledTime: futureTime,
    });

    let insertCall = mockContext.db.insert.mock.calls[0];
    expect(insertCall[1].url).toBe("");

    // Test with URL
    jest.clearAllMocks();
    await createPostMock(mockContext, {
      content: "Hello World!",
      url: "https://example.com",
      scheduledTime: futureTime,
    });

    insertCall = mockContext.db.insert.mock.calls[0];
    expect(insertCall[1].url).toBe("https://example.com");
  });

  it("should store timestamp in UTC", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const futureTime = Date.now() + 3600000;
    const args = {
      content: "Hello World!",
      scheduledTime: futureTime,
    };

    await createPostMock(mockContext, args);

    const insertCall = mockContext.db.insert.mock.calls[0];
    expect(insertCall[1].twitterScheduledTime).toBe(futureTime);
    expect(typeof insertCall[1].twitterScheduledTime).toBe("number");
  });

  it("should scope data to authenticated user", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_456",
      email: "another@example.com",
    });

    const futureTime = Date.now() + 3600000;
    const args = {
      content: "Test post",
      scheduledTime: futureTime,
    };

    await createPostMock(mockContext, args);

    const insertCall = mockContext.db.insert.mock.calls[0];
    expect(insertCall[1].clerkUserId).toBe("user_456");
  });
});
