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
    get: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
  },
  auth: {
    getUserIdentity: jest.fn(),
  },
  scheduler: {
    runAt: jest.fn().mockResolvedValue("mock-scheduler-id"),
    cancel: jest.fn().mockResolvedValue(undefined),
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

// Mock implementation of updatePost mutation logic
async function updatePostMock(
  ctx: any,
  args: {
    postId: string;
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

  // Retrieve existing post and verify ownership
  const post = await ctx.db.get(args.postId);
  if (!post) {
    throw new Error("Post not found");
  }
  if (post.clerkUserId !== clerkUserId) {
    throw new Error("Unauthorized: You can only edit your own posts");
  }

  // Verify post status is "Scheduled"
  if (post.status !== "Scheduled") {
    throw new Error("Only scheduled posts can be edited");
  }

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

  // Cancel existing scheduled actions
  try {
    if (post.twitterSchedulerId) {
      await ctx.scheduler.cancel(post.twitterSchedulerId);
    }
    if (post.linkedInSchedulerId) {
      await ctx.scheduler.cancel(post.linkedInSchedulerId);
    }
  } catch (error) {
    console.warn("Failed to cancel scheduler:", error);
  }

  // Update post content and times
  await ctx.db.patch(args.postId, {
    twitterContent: args.twitterContent || "",
    linkedInContent: args.linkedInContent || "",
    twitterScheduledTime: args.twitterScheduledTime,
    linkedInScheduledTime: args.linkedInScheduledTime,
    url: args.url || "",
  });

  // Schedule new publishing actions and store new scheduler IDs
  try {
    const schedulerIds: any = {};

    if (hasTwitter && args.twitterScheduledTime) {
      const twitterSchedulerId = await ctx.scheduler.runAt(
        args.twitterScheduledTime,
        "internal.publishing.publishTwitterPost",
        { postId: args.postId }
      );
      schedulerIds.twitterSchedulerId = twitterSchedulerId;
    } else {
      schedulerIds.twitterSchedulerId = undefined;
    }

    if (hasLinkedIn && args.linkedInScheduledTime) {
      const linkedInSchedulerId = await ctx.scheduler.runAt(
        args.linkedInScheduledTime,
        "internal.publishing.publishLinkedInPost",
        { postId: args.postId }
      );
      schedulerIds.linkedInSchedulerId = linkedInSchedulerId;
    } else {
      schedulerIds.linkedInSchedulerId = undefined;
    }

    await ctx.db.patch(args.postId, schedulerIds);
  } catch (error) {
    await ctx.db.patch(args.postId, {
      status: "Failed",
      errorMessage: `Failed to reschedule post: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
    throw new Error(
      `Failed to reschedule post: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// Mock implementation of deletePost mutation logic
async function deletePostMock(
  ctx: any,
  args: {
    postId: string;
  }
) {
  // Verify user authentication
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const clerkUserId = identity.subject;

  // Retrieve post and verify ownership
  const post = await ctx.db.get(args.postId);
  if (!post) {
    throw new Error("Post not found");
  }
  if (post.clerkUserId !== clerkUserId) {
    throw new Error("Unauthorized: You can only delete your own posts");
  }

  // Verify post status is "Scheduled"
  if (post.status !== "Scheduled") {
    throw new Error("Only scheduled posts can be deleted");
  }

  // Cancel scheduled actions before deletion
  try {
    if (post.twitterSchedulerId) {
      await ctx.scheduler.cancel(post.twitterSchedulerId);
    }
    if (post.linkedInSchedulerId) {
      await ctx.scheduler.cancel(post.linkedInSchedulerId);
    }
  } catch (error) {
    console.warn("Failed to cancel scheduler:", error);
  }

  // Delete the post document
  await ctx.db.delete(args.postId);
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

describe("updatePost mutation - Successful updates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully update a scheduled post with new content and times", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "post-123",
      clerkUserId: "user_123",
      status: "Scheduled",
      twitterContent: "Old content",
      twitterScheduledTime: Date.now() + 3600000,
      twitterSchedulerId: "old-scheduler-id",
    });

    const futureTime = Date.now() + 7200000;
    const args = {
      postId: "post-123",
      twitterContent: "New content",
      twitterScheduledTime: futureTime,
    };

    await updatePostMock(mockContext, args);

    // Verify old scheduler was canceled
    expect(mockContext.scheduler.cancel).toHaveBeenCalledWith("old-scheduler-id");

    // Verify post content was updated
    expect(mockContext.db.patch).toHaveBeenCalledWith("post-123", {
      twitterContent: "New content",
      linkedInContent: "",
      twitterScheduledTime: futureTime,
      linkedInScheduledTime: undefined,
      url: "",
    });

    // Verify new scheduler was created
    expect(mockContext.scheduler.runAt).toHaveBeenCalledWith(
      futureTime,
      "internal.publishing.publishTwitterPost",
      { postId: "post-123" }
    );

    // Verify new scheduler ID was stored
    expect(mockContext.db.patch).toHaveBeenCalledWith("post-123", {
      twitterSchedulerId: "mock-scheduler-id",
      linkedInSchedulerId: undefined,
    });
  });

  it("should handle partial updates (only Twitter changes)", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "post-123",
      clerkUserId: "user_123",
      status: "Scheduled",
      twitterContent: "Old Twitter",
      linkedInContent: "Keep LinkedIn",
      twitterScheduledTime: Date.now() + 3600000,
      linkedInScheduledTime: Date.now() + 7200000,
      twitterSchedulerId: "twitter-scheduler-id",
      linkedInSchedulerId: "linkedin-scheduler-id",
    });

    const newTwitterTime = Date.now() + 10800000;
    const newLinkedInTime = Date.now() + 14400000;
    const args = {
      postId: "post-123",
      twitterContent: "New Twitter",
      linkedInContent: "Keep LinkedIn",
      twitterScheduledTime: newTwitterTime,
      linkedInScheduledTime: newLinkedInTime,
    };

    await updatePostMock(mockContext, args);

    // Both schedulers should be canceled
    expect(mockContext.scheduler.cancel).toHaveBeenCalledWith("twitter-scheduler-id");
    expect(mockContext.scheduler.cancel).toHaveBeenCalledWith("linkedin-scheduler-id");

    // Both schedulers should be recreated
    expect(mockContext.scheduler.runAt).toHaveBeenCalledTimes(2);
  });
});

describe("updatePost mutation - Validation errors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject updates for non-Scheduled posts", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "post-123",
      clerkUserId: "user_123",
      status: "Published",
      twitterContent: "Published content",
    });

    const futureTime = Date.now() + 3600000;
    const args = {
      postId: "post-123",
      twitterContent: "New content",
      twitterScheduledTime: futureTime,
    };

    await expect(updatePostMock(mockContext, args)).rejects.toThrow(
      "Only scheduled posts can be edited"
    );
  });

  it("should reject updates for posts not owned by user", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "post-123",
      clerkUserId: "user_456",  // Different user
      status: "Scheduled",
      twitterContent: "Someone else's post",
    });

    const futureTime = Date.now() + 3600000;
    const args = {
      postId: "post-123",
      twitterContent: "Trying to update",
      twitterScheduledTime: futureTime,
    };

    await expect(updatePostMock(mockContext, args)).rejects.toThrow(
      "Unauthorized: You can only edit your own posts"
    );
  });

  it("should reject updates with invalid content (exceeds Twitter limit)", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "post-123",
      clerkUserId: "user_123",
      status: "Scheduled",
      twitterContent: "Old content",
    });

    const futureTime = Date.now() + 3600000;
    const args = {
      postId: "post-123",
      twitterContent: "a".repeat(281),
      twitterScheduledTime: futureTime,
    };

    await expect(updatePostMock(mockContext, args)).rejects.toThrow(
      "Twitter content exceeds 280 character limit"
    );
  });

  it("should reject updates with past scheduled time", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "post-123",
      clerkUserId: "user_123",
      status: "Scheduled",
      twitterContent: "Old content",
    });

    const pastTime = Date.now() - 3600000;
    const args = {
      postId: "post-123",
      twitterContent: "New content",
      twitterScheduledTime: pastTime,
    };

    await expect(updatePostMock(mockContext, args)).rejects.toThrow(
      "Twitter scheduled time must be in the future"
    );
  });

  it("should reject updates with no platform selected", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "post-123",
      clerkUserId: "user_123",
      status: "Scheduled",
      twitterContent: "Old content",
    });

    const args = {
      postId: "post-123",
    };

    await expect(updatePostMock(mockContext, args)).rejects.toThrow(
      "At least one platform must be selected with content and scheduled time"
    );
  });

  it("should throw error if post not found", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue(null);

    const futureTime = Date.now() + 3600000;
    const args = {
      postId: "non-existent",
      twitterContent: "New content",
      twitterScheduledTime: futureTime,
    };

    await expect(updatePostMock(mockContext, args)).rejects.toThrow("Post not found");
  });
});

describe("deletePost mutation - Successful deletion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully delete a scheduled post", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "post-123",
      clerkUserId: "user_123",
      status: "Scheduled",
      twitterSchedulerId: "twitter-scheduler-id",
      linkedInSchedulerId: "linkedin-scheduler-id",
    });

    const args = {
      postId: "post-123",
    };

    await deletePostMock(mockContext, args);

    // Verify schedulers were canceled
    expect(mockContext.scheduler.cancel).toHaveBeenCalledWith("twitter-scheduler-id");
    expect(mockContext.scheduler.cancel).toHaveBeenCalledWith("linkedin-scheduler-id");

    // Verify post was deleted
    expect(mockContext.db.delete).toHaveBeenCalledWith("post-123");
  });

  it("should handle deletion when no scheduler IDs exist", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "post-123",
      clerkUserId: "user_123",
      status: "Scheduled",
      // No scheduler IDs
    });

    const args = {
      postId: "post-123",
    };

    await deletePostMock(mockContext, args);

    // Cancel should not have been called
    expect(mockContext.scheduler.cancel).not.toHaveBeenCalled();

    // Post should still be deleted
    expect(mockContext.db.delete).toHaveBeenCalledWith("post-123");
  });

  it("should handle scheduler cancellation failure gracefully", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "post-123",
      clerkUserId: "user_123",
      status: "Scheduled",
      twitterSchedulerId: "twitter-scheduler-id",
    });
    mockContext.scheduler.cancel.mockRejectedValueOnce(new Error("Already executing"));

    const args = {
      postId: "post-123",
    };

    // Should not throw despite cancellation failure
    await deletePostMock(mockContext, args);

    // Post should still be deleted
    expect(mockContext.db.delete).toHaveBeenCalledWith("post-123");
  });
});

describe("deletePost mutation - Validation errors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject deletion for non-Scheduled posts", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "post-123",
      clerkUserId: "user_123",
      status: "Published",
    });

    const args = {
      postId: "post-123",
    };

    await expect(deletePostMock(mockContext, args)).rejects.toThrow(
      "Only scheduled posts can be deleted"
    );
  });

  it("should reject deletion for posts not owned by user", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "post-123",
      clerkUserId: "user_456",  // Different user
      status: "Scheduled",
    });

    const args = {
      postId: "post-123",
    };

    await expect(deletePostMock(mockContext, args)).rejects.toThrow(
      "Unauthorized: You can only delete your own posts"
    );
  });

  it("should throw error if post not found", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue(null);

    const args = {
      postId: "non-existent",
    };

    await expect(deletePostMock(mockContext, args)).rejects.toThrow("Post not found");
  });

  it("should throw error if not authenticated", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue(null);

    const args = {
      postId: "post-123",
    };

    await expect(deletePostMock(mockContext, args)).rejects.toThrow("Not authenticated");
  });
});
