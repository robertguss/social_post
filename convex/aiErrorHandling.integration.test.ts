/**
 * Integration Tests for AI Error Handling (Story 7.6)
 *
 * Tests cover:
 * - Error categorization and retryability detection
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - User-friendly error messages
 * - Correlation IDs for debugging
 * - Error handling consistency across all AI actions
 */

import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

// Mock the @google/generative-ai SDK
vi.mock("@google/generative-ai", () => {
  const mockGenerateContent = vi.fn().mockResolvedValue({
    response: {
      text: () => "Test response from Gemini",
    },
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

describe("AI Error Handling Integration Tests", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    process.env.GEMINI_API_KEY = "test-api-key-12345";
    vi.clearAllMocks();
  });

  describe("Error Categorization - Rate Limit Errors", () => {
    test("adjustTone should return user-friendly rate limit error message", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      // Mock rate limit error
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

    test("expandForLinkedIn should return user-friendly rate limit error message", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("RESOURCE_EXHAUSTED Rate limit");
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

    test("generateHashtags should return user-friendly rate limit error message", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("429 Too Many Requests");
              },
            }),
          }) as any,
      );

      await expect(
        asUser.action(api.aiAssistant.generateHashtags, {
          content: "Test content",
          count: 5,
        }),
      ).rejects.toThrow(/rate limit/i);
    });
  });

  describe("Error Categorization - Network Errors", () => {
    test("adjustTone should return user-friendly network error message", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("ENOTFOUND api.gemini.google.com");
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

    test("expandForLinkedIn should return user-friendly network error message", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("ECONNRESET");
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

    test("generateHashtags should return user-friendly network error message", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("Network timeout");
              },
            }),
          }) as any,
      );

      await expect(
        asUser.action(api.aiAssistant.generateHashtags, {
          content: "Test content",
          count: 5,
        }),
      ).rejects.toThrow(/Network error/i);
    });
  });

  describe("Error Categorization - API Key Errors", () => {
    test("adjustTone should return user-friendly API key error message", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

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
      ).rejects.toThrow(
        "AI service configuration error. Please contact support.",
      );
    });

    test("expandForLinkedIn should return user-friendly API key error message", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("API_KEY_INVALID");
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

    test("generateHashtags should return user-friendly API key error message", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("403 API key not valid");
              },
            }),
          }) as any,
      );

      await expect(
        asUser.action(api.aiAssistant.generateHashtags, {
          content: "Test content",
          count: 5,
        }),
      ).rejects.toThrow(/configuration error/i);
    });
  });

  describe("Error Categorization - Content Filter Errors", () => {
    test("adjustTone should return user-friendly content filter error message", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("SAFETY Content blocked by safety filters");
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
        "Content was blocked by AI safety filters. Please revise your content and try again.",
      );
    });

    test("expandForLinkedIn should return user-friendly content filter error message", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("Content blocked for safety reasons");
              },
            }),
          }) as any,
      );

      await expect(
        asUser.action(api.aiAssistant.expandForLinkedIn, {
          twitterContent: "Test tweet",
        }),
      ).rejects.toThrow(/blocked by AI safety filters/i);
    });

    test("generateHashtags should return user-friendly content filter error message", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("PROHIBITED_CONTENT");
              },
            }),
          }) as any,
      );

      await expect(
        asUser.action(api.aiAssistant.generateHashtags, {
          content: "Test content",
          count: 5,
        }),
      ).rejects.toThrow(/safety filters/i);
    });
  });

  describe("Error Categorization - Timeout Errors", () => {
    test("adjustTone should return user-friendly timeout error message", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("AI request timed out after 10 seconds");
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
        "AI request timed out. The service may be busy. Please try again.",
      );
    });

    test("expandForLinkedIn should return user-friendly timeout error message", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("DEADLINE_EXCEEDED");
              },
            }),
          }) as any,
      );

      await expect(
        asUser.action(api.aiAssistant.expandForLinkedIn, {
          twitterContent: "Test tweet",
        }),
      ).rejects.toThrow(/timed out/i);
    });

    test("generateHashtags should return user-friendly timeout error message", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("Request timeout");
              },
            }),
          }) as any,
      );

      await expect(
        asUser.action(api.aiAssistant.generateHashtags, {
          content: "Test content",
          count: 5,
        }),
      ).rejects.toThrow(/timed out/i);
    });
  });

  describe("Error Categorization - Invalid Response Errors", () => {
    test("adjustTone should return user-friendly invalid response error message", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                // Return response with no text
                return {
                  response: {
                    text: () => "",
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
      ).rejects.toThrow(
        "AI service returned an invalid response. Please try again.",
      );
    });

    test("generateHashtags should handle invalid JSON response", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => ({
                response: {
                  text: () => "Not a valid JSON array",
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
      ).rejects.toThrow(/Unable to generate valid hashtags/i);
    });
  });

  describe("Retry Logic", () => {
    test("adjustTone should retry on transient failures", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      let attemptCount = 0;

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementation(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                attemptCount++;
                if (attemptCount < 2) {
                  // Fail first attempt
                  throw new Error("Network error");
                }
                // Succeed on retry
                return {
                  response: {
                    text: () => "Successful response after retry",
                  },
                };
              },
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.adjustTone, {
        content: "Test content",
        tone: "professional",
      });

      expect(result.content).toBe("Successful response after retry");
      expect(attemptCount).toBeGreaterThan(1); // Verify retry happened
    });

    test("expandForLinkedIn should retry on transient failures", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      let attemptCount = 0;

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementation(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                attemptCount++;
                if (attemptCount < 2) {
                  throw new Error("ECONNRESET");
                }
                return {
                  response: {
                    text: () =>
                      "a".repeat(600), // Valid LinkedIn expansion
                  },
                };
              },
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.expandForLinkedIn, {
        twitterContent: "Test tweet",
      });

      expect(result.content).toBeDefined();
      expect(attemptCount).toBeGreaterThan(1);
    });

    test("generateHashtags should retry on transient failures", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      let attemptCount = 0;

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementation(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                attemptCount++;
                if (attemptCount < 2) {
                  throw new Error("Network timeout");
                }
                return {
                  response: {
                    text: () =>
                      JSON.stringify(["AI", "Tech", "Innovation", "Startup", "Growth"]),
                  },
                };
              },
            }),
          }) as any,
      );

      const result = await asUser.action(api.aiAssistant.generateHashtags, {
        content: "Test content",
        count: 5,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(attemptCount).toBeGreaterThan(1);
    });

    test("should not retry on non-retryable errors (content filter)", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      let attemptCount = 0;

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementation(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                attemptCount++;
                throw new Error("SAFETY Content blocked");
              },
            }),
          }) as any,
      );

      await expect(
        asUser.action(api.aiAssistant.adjustTone, {
          content: "Test content",
          tone: "professional",
        }),
      ).rejects.toThrow(/safety filters/i);

      // Should only try once for non-retryable errors
      expect(attemptCount).toBe(1);
    });

    test("should not retry on invalid API key errors", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      let attemptCount = 0;

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementation(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                attemptCount++;
                throw new Error("401 Invalid API key");
              },
            }),
          }) as any,
      );

      await expect(
        asUser.action(api.aiAssistant.expandForLinkedIn, {
          twitterContent: "Test tweet",
        }),
      ).rejects.toThrow(/configuration error/i);

      expect(attemptCount).toBe(1); // No retries for API key errors
    });
  });

  describe("Timeout Behavior", () => {
    test("adjustTone should timeout after 10 seconds", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                // Simulate a long delay
                await new Promise((resolve) => setTimeout(resolve, 11000));
                return {
                  response: {
                    text: () => "Delayed response",
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
      ).rejects.toThrow(/timed out/i);
    });

    test("expandForLinkedIn should timeout after 10 seconds", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                await new Promise((resolve) => setTimeout(resolve, 11000));
                return {
                  response: {
                    text: () => "Delayed response",
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
      ).rejects.toThrow(/timed out/i);
    });

    test("generateHashtags should timeout after 10 seconds", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                await new Promise((resolve) => setTimeout(resolve, 11000));
                return {
                  response: {
                    text: () => JSON.stringify(["AI", "Tech"]),
                  },
                };
              },
            }),
          }) as any,
      );

      await expect(
        asUser.action(api.aiAssistant.generateHashtags, {
          content: "Test content",
          count: 5,
        }),
      ).rejects.toThrow(/timed out/i);
    });
  });

  describe("Logging and Correlation IDs", () => {
    test("adjustTone should log errors with correlation ID", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("Test error");
              },
            }),
          }) as any,
      );

      try {
        await asUser.action(api.aiAssistant.adjustTone, {
          content: "Test content",
          tone: "professional",
        });
      } catch (error) {
        // Expected to throw
      }

      // Verify console.error was called with correlation ID
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("adjustTone-");

      consoleErrorSpy.mockRestore();
    });

    test("expandForLinkedIn should log errors with correlation ID", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("Test error");
              },
            }),
          }) as any,
      );

      try {
        await asUser.action(api.aiAssistant.expandForLinkedIn, {
          twitterContent: "Test tweet",
        });
      } catch (error) {
        // Expected to throw
      }

      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("expandForLinkedIn-");

      consoleErrorSpy.mockRestore();
    });

    test("generateHashtags should log errors with correlation ID", async () => {
      const asUser = t.withIdentity({ subject: "user123" });
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: async () => {
                throw new Error("Test error");
              },
            }),
          }) as any,
      );

      try {
        await asUser.action(api.aiAssistant.generateHashtags, {
          content: "Test content",
          count: 5,
        });
      } catch (error) {
        // Expected to throw
      }

      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("generateHashtags-");

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Error Consistency Across Actions", () => {
    test("all actions should handle missing API key consistently", async () => {
      const originalEnv = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      try {
        const asUser = t.withIdentity({ subject: "user123" });

        // Test adjustTone
        await expect(
          asUser.action(api.aiAssistant.adjustTone, {
            content: "Test",
            tone: "professional",
          }),
        ).rejects.toThrow(/API key|configuration/i);

        // Test expandForLinkedIn
        await expect(
          asUser.action(api.aiAssistant.expandForLinkedIn, {
            twitterContent: "Test",
          }),
        ).rejects.toThrow(/API key|configuration/i);

        // Test generateHashtags
        await expect(
          asUser.action(api.aiAssistant.generateHashtags, {
            content: "Test",
            count: 5,
          }),
        ).rejects.toThrow(/API key|configuration/i);
      } finally {
        if (originalEnv) {
          process.env.GEMINI_API_KEY = originalEnv;
        }
      }
    });

    test("all actions should handle rate limits consistently", async () => {
      const asUser = t.withIdentity({ subject: "user123" });

      const mockRateLimit = () =>
        ({
          getGenerativeModel: () => ({
            generateContent: async () => {
              throw new Error("429 RESOURCE_EXHAUSTED");
            },
          }),
        }) as any;

      // Test adjustTone
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(mockRateLimit);

      await expect(
        asUser.action(api.aiAssistant.adjustTone, {
          content: "Test",
          tone: "professional",
        }),
      ).rejects.toThrow(/rate limit/i);

      // Test expandForLinkedIn
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(mockRateLimit);

      await expect(
        asUser.action(api.aiAssistant.expandForLinkedIn, {
          twitterContent: "Test",
        }),
      ).rejects.toThrow(/rate limit/i);

      // Test generateHashtags
      vi.mocked(
        (await import("@google/generative-ai")).GoogleGenerativeAI,
      ).mockImplementationOnce(mockRateLimit);

      await expect(
        asUser.action(api.aiAssistant.generateHashtags, {
          content: "Test",
          count: 5,
        }),
      ).rejects.toThrow(/rate limit/i);
    });
  });
});
