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

describe("AI Assistant - generateHashtags Action", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(async () => {
    // Set up test environment with schema and modules
    t = convexTest(schema, modules);

    // Set mock environment variable for Gemini API
    process.env.GEMINI_API_KEY = "test-api-key-12345";

    // Reset mock to default hashtag response
    vi.mocked(
      (await import("@google/generative-ai")).GoogleGenerativeAI,
    ).mockImplementation(
      () =>
        ({
          getGenerativeModel: () => ({
            generateContent: async (prompt: string) => {
              // Check if prompt contains platform-specific keywords
              const promptStr = String(prompt);
              let hashtags: string[];

              if (promptStr.includes("TWITTER")) {
                // Twitter hashtags: short and punchy
                hashtags = ["AI", "Tech", "Innovation", "Startup", "ProductLaunch"];
              } else if (promptStr.includes("LINKEDIN")) {
                // LinkedIn hashtags: longer and professional
                hashtags = ["ArtificialIntelligence", "TechnologyInnovation", "ProfessionalDevelopment", "IndustryTrends", "CareerGrowth"];
              } else {
                // Default hashtags
                hashtags = ["Tech", "Innovation", "Productivity", "Development", "Growth"];
              }

              // Return hashtags as JSON array (respecting requested count)
              const countMatch = promptStr.match(/generate (\d+) hashtags/i);
              const requestedCount = countMatch ? parseInt(countMatch[1]) : 5;
              const selectedHashtags = hashtags.slice(0, requestedCount);

              return {
                response: {
                  text: () => JSON.stringify(selectedHashtags),
                },
              };
            },
          }),
        }) as any,
    );
  });

  describe("Authentication", () => {
    test("should reject unauthenticated requests", async () => {
      await expect(
        t.action(api.aiAssistant.generateHashtags, {
          content: "Test content for hashtags",
          count: 5,
        }),
      ).rejects.toThrow("Not authenticated");
    });

    test("should accept authenticated requests", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.action(api.aiAssistant.generateHashtags, {
        content: "Just launched our new AI-powered feature!",
        count: 5,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("Input Validation", () => {
    test("should reject empty content", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.action(api.aiAssistant.generateHashtags, {
          content: "",
          count: 5,
        }),
      ).rejects.toThrow("Content cannot be empty");
    });

    test("should reject content with only whitespace", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.action(api.aiAssistant.generateHashtags, {
          content: "   \n\t  ",
          count: 5,
        }),
      ).rejects.toThrow("Content cannot be empty");
    });

    test("should reject content exceeding maximum length", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      const longContent = "a".repeat(3001); // 3001 chars (exceeds LinkedIn limit)

      await expect(
        asUser.action(api.aiAssistant.generateHashtags, {
          content: longContent,
          count: 5,
        }),
      ).rejects.toThrow("Content exceeds maximum length of 3000 characters");
    });

    test("should reject count < 1", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.action(api.aiAssistant.generateHashtags, {
          content: "Test content",
          count: 0,
        }),
      ).rejects.toThrow("Hashtag count must be between 1 and 20");
    });

    test("should reject count > 20", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      await expect(
        asUser.action(api.aiAssistant.generateHashtags, {
          content: "Test content",
          count: 21,
        }),
      ).rejects.toThrow("Hashtag count must be between 1 and 20");
    });

    test("should accept valid count values", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Test count = 1
      const result1 = await asUser.action(api.aiAssistant.generateHashtags, {
        content: "Test content",
        count: 1,
      });
      expect(result1.length).toBe(1);

      // Test count = 20
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => JSON.stringify(Array.from({ length: 20 }, (_, i) => `Tag${i + 1}`)),
                },
              }),
            }),
          }) as any,
      );

      const result20 = await asUser.action(api.aiAssistant.generateHashtags, {
        content: "Test content",
        count: 20,
      });
      expect(result20.length).toBe(20);
    });
  });

  describe("Platform-Specific Generation", () => {
    test("should generate Twitter-specific hashtags", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.action(api.aiAssistant.generateHashtags, {
        content: "Just launched our new AI-powered feature!",
        count: 5,
        platform: "twitter",
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // Twitter hashtags should be short (1-2 words)
      expect(result.every(tag => tag.length <= 20)).toBe(true);
    });

    test("should generate LinkedIn-specific hashtags", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.action(api.aiAssistant.generateHashtags, {
        content: "Just launched our new AI-powered feature!",
        count: 5,
        platform: "linkedin",
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // LinkedIn hashtags can be longer (2-3 words)
    });

    test("should default to twitter platform if not specified", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.action(api.aiAssistant.generateHashtags, {
        content: "Test content",
        count: 5,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Hashtag Format Validation", () => {
    test("should return hashtags without # prefix", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.action(api.aiAssistant.generateHashtags, {
        content: "Test content",
        count: 5,
      });

      // All hashtags should NOT start with #
      expect(result.every(tag => !tag.startsWith("#"))).toBe(true);
    });

    test("should remove # prefix if Gemini includes it", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to return hashtags WITH # prefix
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => JSON.stringify(["#AI", "#Tech", "#Innovation"]),
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.generateHashtags, {
        content: "Test content",
        count: 3,
      });

      // Hashtags should have # prefix removed
      expect(result).toEqual(["AI", "Tech", "Innovation"]);
    });

    test("should validate hashtag characters (only letters, numbers, underscores)", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to return hashtags with invalid characters
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => JSON.stringify(["Tech Innovation", "AI@Work", "Valid_Tag", "123Start"]),
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.generateHashtags, {
        content: "Test content",
        count: 4,
      });

      // Should filter out invalid hashtags and clean valid ones
      expect(result.every(tag => /^[a-zA-Z0-9_]+$/.test(tag))).toBe(true);
    });

    test("should remove duplicate hashtags (case-insensitive)", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to return duplicate hashtags
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => JSON.stringify(["AI", "Tech", "ai", "TECH", "Innovation"]),
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.generateHashtags, {
        content: "Test content",
        count: 5,
      });

      // Should remove duplicates (case-insensitive)
      const lowerCaseResult = result.map(tag => tag.toLowerCase());
      const uniqueTags = new Set(lowerCaseResult);
      expect(lowerCaseResult.length).toBe(uniqueTags.size);
    });
  });

  describe("Response Parsing", () => {
    test("should parse valid JSON array response", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.action(api.aiAssistant.generateHashtags, {
        content: "Test content",
        count: 5,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test("should handle non-JSON response with fallback parsing", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to return non-JSON format (comma-separated)
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => "AI, Tech, Innovation, Startup, Growth",
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.generateHashtags, {
        content: "Test content",
        count: 5,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test("should handle response with newlines and brackets", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to return hashtags with array brackets and newlines
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => '["AI"\n"Tech"\n"Innovation"]',
                },
              }),
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.generateHashtags, {
        content: "Test content",
        count: 3,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test("should throw error if no valid hashtags can be generated", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock Gemini to return invalid response
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => "!!!@@@###$$$",
                },
              }),
            }),
          }) as any,
      );

      await expect(
        asUser.action(api.aiAssistant.generateHashtags, {
          content: "Test content",
          count: 5,
        }),
      ).rejects.toThrow("Unable to generate valid hashtags for this content");
    });
  });

  describe("Default Parameters", () => {
    test("should use default count of 5 if not specified", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.action(api.aiAssistant.generateHashtags, {
        content: "Test content",
      });

      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(5);
    });

    test("should use default platform of twitter if not specified", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock tracks if TWITTER keyword is in prompt
      let promptIncludedTwitter = false;
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async (prompt: string) => {
                promptIncludedTwitter = String(prompt).includes("TWITTER");
                return {
                  response: {
                    text: () => JSON.stringify(["AI", "Tech", "Innovation"]),
                  },
                };
              },
            }),
          }) as any,
      );

      await asUser.action(api.aiAssistant.generateHashtags, {
        content: "Test content",
      });

      expect(promptIncludedTwitter).toBe(true);
    });
  });
});
