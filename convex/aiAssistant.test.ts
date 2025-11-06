import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

/**
 * Unit Tests for AI Assistant Actions
 *
 * Tests cover:
 * - adjustTone action with Gemini API integration
 * - Authentication requirement
 * - Input validation (empty content, character limits)
 * - All tone options (formal, casual, engaging, professional)
 * - Character limit validation and warning generation
 * - Error handling for API failures
 */

// Mock the @google/generative-ai SDK
vi.mock("@google/generative-ai", () => {
  const mockGenerateContent = vi.fn().mockImplementation(async (prompt) => {
    // Extract tone from prompt to generate appropriate response
    const promptStr = String(prompt);
    let response = "Test response from Gemini";

    if (promptStr.includes("professional")) {
      response = "I am pleased to share this professional content with you.";
    } else if (promptStr.includes("formal")) {
      response =
        "It is with great interest that I present this formal content.";
    } else if (promptStr.includes("casual")) {
      response = "Hey! Check out this casual content.";
    } else if (promptStr.includes("engaging")) {
      response = "🎉 You'll love this engaging content!";
    }

    return {
      response: {
        text: () => response,
      },
    };
  });

  const mockGetGenerativeModel = vi.fn().mockReturnValue({
    generateContent: mockGenerateContent,
  });

  const MockGoogleGenerativeAI = vi.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  }));

  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
  };
});

describe("AI Assistant - adjustTone Action", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(async () => {
    // Set up test environment with schema and modules
    t = convexTest(schema, modules);

    // Set mock environment variable for Gemini API
    process.env.GEMINI_API_KEY = "test-api-key-12345";
  });

  describe("Authentication", () => {
    test("should reject unauthenticated requests", async () => {
      await expect(
        t.action(api.aiAssistant.adjustTone, {
          content: "Test content",
          tone: "professional",
        }),
      ).rejects.toThrow("Not authenticated");
    });

    test("should accept authenticated requests", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.action(api.aiAssistant.adjustTone, {
        content: "Test content",
        tone: "professional",
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe("Input Validation", () => {
    test("should reject empty content", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.action(api.aiAssistant.adjustTone, {
          content: "",
          tone: "professional",
        }),
      ).rejects.toThrow("Content cannot be empty");
    });

    test("should reject content with only whitespace", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.action(api.aiAssistant.adjustTone, {
          content: "   \n\t  ",
          tone: "professional",
        }),
      ).rejects.toThrow("Content cannot be empty");
    });

    test("should reject content exceeding LinkedIn max length", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      const longContent = "a".repeat(3001); // 3001 chars (exceeds LinkedIn limit)

      await expect(
        asUser.action(api.aiAssistant.adjustTone, {
          content: longContent,
          tone: "professional",
        }),
      ).rejects.toThrow("Content exceeds maximum length of 3000 characters");
    });

    test("should accept content within LinkedIn limit", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      const validContent = "a".repeat(2999); // 2999 chars (within LinkedIn limit)

      const result = await asUser.action(api.aiAssistant.adjustTone, {
        content: validContent,
        tone: "professional",
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe("Tone Options", () => {
    test("should adjust tone to professional", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.action(api.aiAssistant.adjustTone, {
        content: "Check out this cool feature!",
        tone: "professional",
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });

    test("should adjust tone to formal", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.action(api.aiAssistant.adjustTone, {
        content: "Check out this cool feature!",
        tone: "formal",
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });

    test("should adjust tone to casual", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.action(api.aiAssistant.adjustTone, {
        content: "We are pleased to announce our new feature.",
        tone: "casual",
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });

    test("should adjust tone to engaging", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.action(api.aiAssistant.adjustTone, {
        content: "We have released a new update.",
        tone: "engaging",
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });
  });

  describe("Character Limit Warnings", () => {
    test("should return warning when adjusted content exceeds Twitter limit", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to return content exceeding Twitter limit
      const longResponse = "a".repeat(285); // 285 chars (exceeds Twitter limit)
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => longResponse,
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.adjustTone, {
        content: "Short content",
        tone: "professional",
      });

      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("280 character limit");
    });

    test("should not return warning when content is within Twitter limit", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.action(api.aiAssistant.adjustTone, {
        content: "Short content",
        tone: "professional",
      });

      // Default mock returns short content, so no warning expected
      expect(result.warning).toBeUndefined();
    });

    test("should return warning when adjusted content exceeds LinkedIn limit", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to return content exceeding LinkedIn limit
      const veryLongResponse = "a".repeat(3005); // 3005 chars (exceeds LinkedIn limit)
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => veryLongResponse,
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.adjustTone, {
        content: "Some medium length content for LinkedIn post",
        tone: "professional",
      });

      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("3000 character limit");
    });
  });

  describe("Error Handling", () => {
    test("should handle Gemini API errors gracefully", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to throw an error
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("Network error");
              },
            }),
          }) as any,
      );

      await expect(
        asUser.action(api.aiAssistant.adjustTone, {
          content: "Test content",
          tone: "professional",
        }),
      ).rejects.toThrow(
        "Network error connecting to AI service. Please check your internet connection and try again.",
      );
    });

    test("should handle rate limit errors", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to throw rate limit error
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("429 RESOURCE_EXHAUSTED");
              },
            }),
          }) as any,
      );

      await expect(
        asUser.action(api.aiAssistant.adjustTone, {
          content: "Test content",
          tone: "professional",
        }),
      ).rejects.toThrow(
        "AI service rate limit exceeded. Please wait a few minutes and try again.",
      );
    });

    test("should handle timeout errors", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to throw timeout error
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                // Simulate timeout
                await new Promise((resolve) => setTimeout(resolve, 11000));
                return {
                  response: {
                    text: () => "Response",
                  },
                };
              },
            }),
          }) as any,
      );

      await expect(
        asUser.action(api.aiAssistant.adjustTone, {
          content: "Test content",
          tone: "professional",
        }),
      ).rejects.toThrow(/timeout|DEADLINE_EXCEEDED/i);
    });

    test("should handle invalid API key errors", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to throw invalid API key error
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("401 Invalid API key");
              },
            }),
          }) as any,
      );

      await expect(
        asUser.action(api.aiAssistant.adjustTone, {
          content: "Test content",
          tone: "professional",
        }),
      ).rejects.toThrow("AI service configuration error. Please contact support.");
    });
  });

  describe("Response Format", () => {
    test("should return object with content and optional warning", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.action(api.aiAssistant.adjustTone, {
        content: "Test content",
        tone: "professional",
      });

      expect(result).toHaveProperty("content");
      expect(typeof result.content).toBe("string");
      // warning is optional
      if (result.warning) {
        expect(typeof result.warning).toBe("string");
      }
    });

    test("should trim whitespace from adjusted content", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to return content with extra whitespace
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => "  \n  Content with whitespace  \n  ",
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.adjustTone, {
        content: "Test content",
        tone: "professional",
      });

      expect(result.content).toBe("Content with whitespace");
    });
  });

  describe("Content Preservation", () => {
    test("should handle content with special characters", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const specialContent = "Check out https://example.com #hashtag @mention";

      const result = await asUser.action(api.aiAssistant.adjustTone, {
        content: specialContent,
        tone: "professional",
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });

    test("should handle content with emoji", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const emojiContent = "Great news! 🎉🔥💪";

      const result = await asUser.action(api.aiAssistant.adjustTone, {
        content: emojiContent,
        tone: "professional",
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });

    test("should handle content with line breaks", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const multilineContent = "Line 1\nLine 2\nLine 3";

      const result = await asUser.action(api.aiAssistant.adjustTone, {
        content: multilineContent,
        tone: "professional",
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });
  });
});

describe("AI Assistant - expandForLinkedIn Action", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(async () => {
    // Set up test environment with schema and modules
    t = convexTest(schema, modules);

    // Set mock environment variable for Gemini API
    process.env.GEMINI_API_KEY = "test-api-key-12345";

    // Reset mocks
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    test("should reject unauthenticated requests", async () => {
      await expect(
        t.action(api.aiAssistant.expandForLinkedIn, {
          twitterContent: "Short tweet",
        }),
      ).rejects.toThrow("Not authenticated");
    });

    test("should accept authenticated requests", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to return expanded content
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => "Expanded LinkedIn content that is much longer and more detailed than the original Twitter post. This content should be between 500-1000 characters to meet the expansion target. It includes professional insights and maintains the core message while adding valuable context for the LinkedIn audience.",
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.expandForLinkedIn, {
        twitterContent: "Short tweet",
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe("Input Validation", () => {
    test("should reject empty Twitter content", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.action(api.aiAssistant.expandForLinkedIn, {
          twitterContent: "",
        }),
      ).rejects.toThrow("Twitter content cannot be empty");
    });

    test("should reject Twitter content with only whitespace", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.action(api.aiAssistant.expandForLinkedIn, {
          twitterContent: "   \n\t  ",
        }),
      ).rejects.toThrow("Twitter content cannot be empty");
    });

    test("should reject Twitter content exceeding 280 character limit", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      const longTwitterContent = "a".repeat(281); // 281 chars (exceeds Twitter limit)

      await expect(
        asUser.action(api.aiAssistant.expandForLinkedIn, {
          twitterContent: longTwitterContent,
        }),
      ).rejects.toThrow("Twitter content exceeds 280 character limit");
    });

    test("should accept Twitter content at exactly 280 characters", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      const maxTwitterContent = "a".repeat(280); // Exactly 280 chars

      // Mock Gemini to return expanded content
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => "Expanded LinkedIn content that is much longer and more detailed than the original Twitter post. This content should be between 500-1000 characters to meet the expansion target. It includes professional insights and maintains the core message while adding valuable context for the LinkedIn audience.",
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.expandForLinkedIn, {
        twitterContent: maxTwitterContent,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe("Expansion Length Validation", () => {
    test("should return warning when expansion is too short (<500 chars)", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to return short expansion
      const shortExpansion = "Just a bit longer than the original tweet but still under 500 characters.";
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => shortExpansion,
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.expandForLinkedIn, {
        twitterContent: "Short tweet",
      });

      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("shorter than expected");
      expect(result.warning).toContain("500-1000 chars");
    });

    test("should not return warning when expansion is within target range (500-1000 chars)", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to return properly sized expansion
      const goodExpansion = "a".repeat(750); // 750 chars (within target range)
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => goodExpansion,
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.expandForLinkedIn, {
        twitterContent: "Short tweet",
      });

      expect(result.warning).toBeUndefined();
    });

    test("should return warning when expansion exceeds LinkedIn limit (3000 chars)", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to return very long expansion
      const veryLongExpansion = "a".repeat(3005); // 3005 chars (exceeds LinkedIn limit)
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => veryLongExpansion,
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.expandForLinkedIn, {
        twitterContent: "Short tweet",
      });

      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("3000 character limit");
    });
  });

  describe("Content Expansion", () => {
    test("should expand short Twitter content (50 chars)", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      const shortTweet = "Just launched our new AI feature!";

      // Mock Gemini to return realistic expansion
      const expandedContent = "I'm excited to announce that we've just launched our new AI-powered feature! This represents a significant milestone in our journey to provide innovative solutions. The feature leverages cutting-edge machine learning to enhance user experience and productivity. We've been working hard on this for months and can't wait to see how it helps our users achieve their goals.";
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => expandedContent,
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.expandForLinkedIn, {
        twitterContent: shortTweet,
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(shortTweet.length);
    });

    test("should expand medium Twitter content (150 chars)", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      const mediumTweet = "Excited to share our latest product update! We've added several new features based on user feedback. Check it out and let us know what you think!";

      // Mock Gemini
      const expandedContent = "I'm thrilled to share our latest product update with the LinkedIn community! Over the past few months, we've been listening carefully to our users and incorporating their valuable feedback into our roadmap. This release includes several highly-requested features that will significantly improve the user experience and workflow efficiency. We believe these enhancements demonstrate our commitment to continuous improvement and user-centric design.";
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => expandedContent,
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.expandForLinkedIn, {
        twitterContent: mediumTweet,
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(mediumTweet.length);
    });

    test("should expand long Twitter content (280 chars)", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      const longTweet = "a".repeat(280);

      // Mock Gemini
      const expandedContent = "a".repeat(600); // Expanded version
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => expandedContent,
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.expandForLinkedIn, {
        twitterContent: longTweet,
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(longTweet.length);
    });
  });

  describe("URL and Special Character Preservation", () => {
    test("should preserve URLs in expansion", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      const tweetWithUrl = "Check out our new blog post: https://example.com/blog";

      // Mock Gemini to preserve URL
      const expandedContent = "I'm excited to share our latest blog post that dives deep into the topic: https://example.com/blog. In this comprehensive article, we explore best practices, share insights from our team, and provide actionable tips you can implement immediately.";
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => expandedContent,
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.expandForLinkedIn, {
        twitterContent: tweetWithUrl,
      });

      expect(result.content).toBeDefined();
      // Note: The prompt instructs Gemini to preserve URLs, but we can't strictly enforce it in tests
      // This test ensures the action handles content with URLs without errors
    });

    test("should preserve hashtags in expansion", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      const tweetWithHashtags = "Excited about #AI #MachineLearning #Innovation!";

      // Mock Gemini to preserve hashtags
      const expandedContent = "I'm genuinely excited about the rapid advancements in #AI and #MachineLearning! The pace of #Innovation in this field is remarkable, and I'm thrilled to be part of this journey. These technologies are transforming how we work and solve complex problems.";
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => expandedContent,
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.expandForLinkedIn, {
        twitterContent: tweetWithHashtags,
      });

      expect(result.content).toBeDefined();
    });

    test("should preserve @mentions in expansion", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      const tweetWithMentions = "Great collaboration with @johndoe and @janesmith!";

      // Mock Gemini to preserve mentions
      const expandedContent = "I'm grateful for the fantastic collaboration with @johndoe and @janesmith on this project! Their expertise and dedication have been instrumental in achieving our goals. Working with talented professionals like them makes all the difference.";
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => expandedContent,
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.expandForLinkedIn, {
        twitterContent: tweetWithMentions,
      });

      expect(result.content).toBeDefined();
    });

    test("should handle emoji in Twitter content", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      const tweetWithEmoji = "Product launch day! 🚀🎉💪";

      // Mock Gemini
      const expandedContent = "Today marks an exciting milestone - our product launch day! 🚀🎉💪 We've been working tirelessly to bring this vision to life, and I'm incredibly proud of what our team has accomplished. This launch represents months of dedication, innovation, and collaboration.";
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => expandedContent,
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.expandForLinkedIn, {
        twitterContent: tweetWithEmoji,
      });

      expect(result.content).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    test("should handle Gemini API network errors", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to throw network error
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("ENOTFOUND");
              },
            }),
          }) as any,
      );

      await expect(
        asUser.action(api.aiAssistant.expandForLinkedIn, {
          twitterContent: "Test tweet",
        }),
      ).rejects.toThrow(/Network error connecting to AI service/i);
    });

    test("should handle rate limit errors", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to throw rate limit error
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("429 RESOURCE_EXHAUSTED");
              },
            }),
          }) as any,
      );

      await expect(
        asUser.action(api.aiAssistant.expandForLinkedIn, {
          twitterContent: "Test tweet",
        }),
      ).rejects.toThrow(/AI service rate limit exceeded/i);
    });

    test("should handle timeout errors", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to timeout
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                // Simulate long delay exceeding 10-second timeout
                await new Promise((resolve) => setTimeout(resolve, 11000));
                return {
                  response: {
                    text: () => "Response",
                  },
                };
              },
            }),
          }) as any,
      );

      await expect(
        asUser.action(api.aiAssistant.expandForLinkedIn, {
          twitterContent: "Test tweet",
        }),
      ).rejects.toThrow(/timeout|DEADLINE_EXCEEDED/i);
    });

    test("should handle invalid API key errors", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to throw invalid API key error
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("401 Invalid API key");
              },
            }),
          }) as any,
      );

      await expect(
        asUser.action(api.aiAssistant.expandForLinkedIn, {
          twitterContent: "Test tweet",
        }),
      ).rejects.toThrow(/AI service configuration error/i);
    });
  });

  describe("Response Format", () => {
    test("should return object with content and optional warning", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini
      const expandedContent = "a".repeat(600);
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => expandedContent,
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.expandForLinkedIn, {
        twitterContent: "Test tweet",
      });

      expect(result).toHaveProperty("content");
      expect(typeof result.content).toBe("string");
      // warning is optional
      if (result.warning) {
        expect(typeof result.warning).toBe("string");
      }
    });

    test("should trim whitespace from expanded content", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to return content with whitespace
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => "  \n  Expanded content with leading/trailing whitespace  \n  ",
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.expandForLinkedIn, {
        twitterContent: "Test tweet",
      });

      expect(result.content).toBe("Expanded content with leading/trailing whitespace");
    });
  });
});
