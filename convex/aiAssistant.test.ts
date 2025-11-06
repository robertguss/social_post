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
