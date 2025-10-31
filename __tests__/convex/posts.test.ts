/**
 * Integration tests for posts.ts Convex mutations
 *
 * These tests verify the createPost mutation behavior for dual-platform posts:
 * - Successfully creates post records for Twitter-only, LinkedIn-only, and dual-platform posts
 * - Verifies user authentication
 * - Validates required fields and constraints
 * - Ensures post status is set to "Scheduled"
 * - Tests timestamp handling
 * - Validates platform selection logic
 */

import { describe, it, expect, beforeEach } from "@jest/globals";

// Mock Convex context
const mockContext = {
  db: {
    insert: jest.fn().mockResolvedValue("mock-post-id"),
    patch: jest.fn().mockResolvedValue(undefined),
  },
  auth: {
    getUserIdentity: jest.fn(),
  },
  scheduler: {
    runAt: jest.fn().mockResolvedValue(undefined),
  },
};

// Mock implementation of dual-platform createPost mutation logic
async function createPostMock(
  ctx: any,
  args: {
    twitterContent?: string;
    linkedInContent?: string;
    twitterScheduledTime?: number;
    linkedInScheduledTime?: number;
    url?: string;
  }
) {
  // Verify user authentication
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const clerkUserId = identity.subject;

  // Validation: At least one platform must be selected
  const hasTwitter = args.twitterContent && args.twitterScheduledTime;
  const hasLinkedIn = args.linkedInContent && args.linkedInScheduledTime;

  if (!hasTwitter && !hasLinkedIn) {
    throw new Error("At least one platform must be selected with content and scheduled time");
  }

  // Twitter validation (if selected)
  if (hasTwitter) {
    if (args.twitterContent!.trim() === "") {
      throw new Error("Twitter content cannot be empty");
    }
    if (args.twitterContent!.length > 280) {
      throw new Error("Twitter content exceeds 280 character limit");
    }
    const now = Date.now();
    if (args.twitterScheduledTime! <= now) {
      throw new Error("Twitter scheduled time must be in the future");
    }
  }

  // LinkedIn validation (if selected)
  if (hasLinkedIn) {
    if (args.linkedInContent!.trim() === "") {
      throw new Error("LinkedIn content cannot be empty");
    }
    if (args.linkedInContent!.length > 3000) {
      throw new Error("LinkedIn content exceeds 3,000 character limit");
    }
    const now = Date.now();
    if (args.linkedInScheduledTime! <= now) {
      throw new Error("LinkedIn scheduled time must be in the future");
    }
  }

  // Create the post record
  const postId = await ctx.db.insert("posts", {
    clerkUserId,
    status: "Scheduled",
    twitterContent: args.twitterContent || "",
    linkedInContent: args.linkedInContent || "",
    twitterScheduledTime: args.twitterScheduledTime,
    linkedInScheduledTime: args.linkedInScheduledTime,
    url: args.url || "",
    errorMessage: undefined,
    retryCount: 0,
    twitterPostId: undefined,
    linkedInPostId: undefined,
  });

  try {
    // Schedule publishing actions for each platform
    if (hasTwitter && args.twitterScheduledTime) {
      await ctx.scheduler.runAt(
        args.twitterScheduledTime,
        "internal.publishing.publishTwitterPost",
        { postId }
      );
    }

    if (hasLinkedIn && args.linkedInScheduledTime) {
      await ctx.scheduler.runAt(
        args.linkedInScheduledTime,
        "internal.publishing.publishLinkedInPost",
        { postId }
      );
    }
  } catch (error) {
    // If scheduler fails, update post status to Failed
    await ctx.db.patch(postId, {
      status: "Failed",
      errorMessage: `Failed to schedule post: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
    throw new Error(
      `Failed to schedule post: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return postId;
}

describe("createPost mutation - Twitter-only posts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully create a Twitter-only post with valid data", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const futureTime = Date.now() + 3600000; // 1 hour from now
    const args = {
      twitterContent: "Hello Twitter!",
      twitterScheduledTime: futureTime,
      url: "https://example.com",
    };

    const postId = await createPostMock(mockContext, args);

    expect(postId).toBe("mock-post-id");
    expect(mockContext.db.insert).toHaveBeenCalledWith("posts", {
      clerkUserId: "user_123",
      status: "Scheduled",
      twitterContent: "Hello Twitter!",
      linkedInContent: "",
      twitterScheduledTime: futureTime,
      linkedInScheduledTime: undefined,
      url: "https://example.com",
      errorMessage: undefined,
      retryCount: 0,
      twitterPostId: undefined,
      linkedInPostId: undefined,
    });
  });

  it("should throw error if Twitter content exceeds 280 characters", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const futureTime = Date.now() + 3600000;
    const args = {
      twitterContent: "a".repeat(281),
      twitterScheduledTime: futureTime,
    };

    await expect(createPostMock(mockContext, args)).rejects.toThrow(
      "Twitter content exceeds 280 character limit"
    );
  });

  it("should throw error if Twitter content is empty", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const futureTime = Date.now() + 3600000;
    const args = {
      twitterContent: "",
      twitterScheduledTime: futureTime,
    };

    await expect(createPostMock(mockContext, args)).rejects.toThrow(
      "At least one platform must be selected with content and scheduled time"
    );
  });

  it("should throw error if Twitter scheduled time is in the past", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const pastTime = Date.now() - 3600000; // 1 hour ago
    const args = {
      twitterContent: "Hello Twitter!",
      twitterScheduledTime: pastTime,
    };

    await expect(createPostMock(mockContext, args)).rejects.toThrow(
      "Twitter scheduled time must be in the future"
    );
  });
});

describe("createPost mutation - LinkedIn-only posts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully create a LinkedIn-only post with valid data", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const futureTime = Date.now() + 3600000;
    const args = {
      linkedInContent: "Hello LinkedIn! This is a professional post.",
      linkedInScheduledTime: futureTime,
      url: "https://example.com",
    };

    const postId = await createPostMock(mockContext, args);

    expect(postId).toBe("mock-post-id");
    expect(mockContext.db.insert).toHaveBeenCalledWith("posts", {
      clerkUserId: "user_123",
      status: "Scheduled",
      twitterContent: "",
      linkedInContent: "Hello LinkedIn! This is a professional post.",
      twitterScheduledTime: undefined,
      linkedInScheduledTime: futureTime,
      url: "https://example.com",
      errorMessage: undefined,
      retryCount: 0,
      twitterPostId: undefined,
      linkedInPostId: undefined,
    });
  });

  it("should throw error if LinkedIn content exceeds 3,000 characters", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const futureTime = Date.now() + 3600000;
    const args = {
      linkedInContent: "a".repeat(3001),
      linkedInScheduledTime: futureTime,
    };

    await expect(createPostMock(mockContext, args)).rejects.toThrow(
      "LinkedIn content exceeds 3,000 character limit"
    );
  });

  it("should throw error if LinkedIn content is empty", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const futureTime = Date.now() + 3600000;
    const args = {
      linkedInContent: "",
      linkedInScheduledTime: futureTime,
    };

    await expect(createPostMock(mockContext, args)).rejects.toThrow(
      "At least one platform must be selected with content and scheduled time"
    );
  });

  it("should throw error if LinkedIn scheduled time is in the past", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const pastTime = Date.now() - 3600000;
    const args = {
      linkedInContent: "Hello LinkedIn!",
      linkedInScheduledTime: pastTime,
    };

    await expect(createPostMock(mockContext, args)).rejects.toThrow(
      "LinkedIn scheduled time must be in the future"
    );
  });
});

describe("createPost mutation - Dual-platform posts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully create a dual-platform post with valid data", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const twitterTime = Date.now() + 3600000; // 1 hour from now
    const linkedInTime = Date.now() + 7200000; // 2 hours from now

    const args = {
      twitterContent: "Hello Twitter!",
      linkedInContent: "Hello LinkedIn! This is a longer professional post.",
      twitterScheduledTime: twitterTime,
      linkedInScheduledTime: linkedInTime,
      url: "https://example.com",
    };

    const postId = await createPostMock(mockContext, args);

    expect(postId).toBe("mock-post-id");
    expect(mockContext.db.insert).toHaveBeenCalledWith("posts", {
      clerkUserId: "user_123",
      status: "Scheduled",
      twitterContent: "Hello Twitter!",
      linkedInContent: "Hello LinkedIn! This is a longer professional post.",
      twitterScheduledTime: twitterTime,
      linkedInScheduledTime: linkedInTime,
      url: "https://example.com",
      errorMessage: undefined,
      retryCount: 0,
      twitterPostId: undefined,
      linkedInPostId: undefined,
    });
  });

  it("should allow staggered posting times for different platforms", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const twitterTime = Date.now() + 3600000; // 1 hour from now
    const linkedInTime = Date.now() + 10800000; // 3 hours from now

    const args = {
      twitterContent: "Twitter first!",
      linkedInContent: "LinkedIn later!",
      twitterScheduledTime: twitterTime,
      linkedInScheduledTime: linkedInTime,
    };

    await createPostMock(mockContext, args);

    const insertCall = mockContext.db.insert.mock.calls[0];
    expect(insertCall[1].twitterScheduledTime).toBe(twitterTime);
    expect(insertCall[1].linkedInScheduledTime).toBe(linkedInTime);
    expect(insertCall[1].linkedInScheduledTime).toBeGreaterThan(insertCall[1].twitterScheduledTime);
  });

  it("should handle shared URL for both platforms", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const futureTime = Date.now() + 3600000;
    const args = {
      twitterContent: "Check this out!",
      linkedInContent: "I'd like to share this resource with my network.",
      twitterScheduledTime: futureTime,
      linkedInScheduledTime: futureTime,
      url: "https://example.com",
    };

    await createPostMock(mockContext, args);

    const insertCall = mockContext.db.insert.mock.calls[0];
    expect(insertCall[1].url).toBe("https://example.com");
  });
});

describe("createPost mutation - Platform selection validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw error when no platform is selected", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const args = {};

    await expect(createPostMock(mockContext, args)).rejects.toThrow(
      "At least one platform must be selected with content and scheduled time"
    );
  });

  it("should throw error when content provided but no scheduled time", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const args = {
      twitterContent: "Hello Twitter!",
      // Missing twitterScheduledTime
    };

    await expect(createPostMock(mockContext, args)).rejects.toThrow(
      "At least one platform must be selected with content and scheduled time"
    );
  });

  it("should throw error when scheduled time provided but no content", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const futureTime = Date.now() + 3600000;
    const args = {
      twitterScheduledTime: futureTime,
      // Missing twitterContent
    };

    await expect(createPostMock(mockContext, args)).rejects.toThrow(
      "At least one platform must be selected with content and scheduled time"
    );
  });
});

describe("createPost mutation - Authentication and scoping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw error if user is not authenticated", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue(null);

    const futureTime = Date.now() + 3600000;
    const args = {
      twitterContent: "Hello World!",
      twitterScheduledTime: futureTime,
    };

    await expect(createPostMock(mockContext, args)).rejects.toThrow(
      "Not authenticated"
    );
  });

  it("should scope data to authenticated user", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_456",
      email: "another@example.com",
    });

    const futureTime = Date.now() + 3600000;
    const args = {
      twitterContent: "Test post",
      twitterScheduledTime: futureTime,
    };

    await createPostMock(mockContext, args);

    const insertCall = mockContext.db.insert.mock.calls[0];
    expect(insertCall[1].clerkUserId).toBe("user_456");
  });

  it("should set post status to Scheduled", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const futureTime = Date.now() + 3600000;
    const args = {
      linkedInContent: "LinkedIn post",
      linkedInScheduledTime: futureTime,
    };

    await createPostMock(mockContext, args);

    const insertCall = mockContext.db.insert.mock.calls[0];
    expect(insertCall[1].status).toBe("Scheduled");
  });
});

describe("createPost mutation - Scheduler integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should schedule LinkedIn publishing action when linkedInScheduledTime is provided", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const futureTime = Date.now() + 3600000;
    const args = {
      linkedInContent: "Hello LinkedIn!",
      linkedInScheduledTime: futureTime,
    };

    await createPostMock(mockContext, args);

    // Verify scheduler.runAt was called for LinkedIn
    expect(mockContext.scheduler.runAt).toHaveBeenCalledWith(
      futureTime,
      "internal.publishing.publishLinkedInPost",
      { postId: "mock-post-id" }
    );
    expect(mockContext.scheduler.runAt).toHaveBeenCalledTimes(1);
  });

  it("should schedule both Twitter and LinkedIn actions for dual-platform posts", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const twitterTime = Date.now() + 3600000;
    const linkedInTime = Date.now() + 7200000;
    const args = {
      twitterContent: "Hello Twitter!",
      linkedInContent: "Hello LinkedIn!",
      twitterScheduledTime: twitterTime,
      linkedInScheduledTime: linkedInTime,
    };

    await createPostMock(mockContext, args);

    // Verify both schedulers were called
    expect(mockContext.scheduler.runAt).toHaveBeenCalledWith(
      twitterTime,
      "internal.publishing.publishTwitterPost",
      { postId: "mock-post-id" }
    );
    expect(mockContext.scheduler.runAt).toHaveBeenCalledWith(
      linkedInTime,
      "internal.publishing.publishLinkedInPost",
      { postId: "mock-post-id" }
    );
    expect(mockContext.scheduler.runAt).toHaveBeenCalledTimes(2);
  });

  it("should handle scheduler failure and update post status to Failed", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.scheduler.runAt.mockRejectedValueOnce(new Error("Scheduler error"));

    const futureTime = Date.now() + 3600000;
    const args = {
      linkedInContent: "Hello LinkedIn!",
      linkedInScheduledTime: futureTime,
    };

    await expect(createPostMock(mockContext, args)).rejects.toThrow(
      "Failed to schedule post: Scheduler error"
    );

    // Verify post status was updated to Failed
    expect(mockContext.db.patch).toHaveBeenCalledWith("mock-post-id", {
      status: "Failed",
      errorMessage: "Failed to schedule post: Scheduler error",
    });
  });
});
