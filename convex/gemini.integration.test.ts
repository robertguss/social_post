import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

/**
 * Integration Tests for Gemini API Client
 *
 * These tests verify actual API connectivity and response handling.
 * Tests will use real API calls when GEMINI_API_KEY is available in environment,
 * otherwise will be skipped with a warning.
 *
 * To run these tests in CI/CD:
 * 1. Set GEMINI_API_KEY environment variable in CI/CD configuration
 * 2. Run: pnpm test gemini.integration.test.ts
 */

const hasRealApiKey = !!process.env.GEMINI_API_KEY;

describe("Gemini API - Integration Tests", () => {
  describe("Real API connectivity", () => {
    test.skipIf(!hasRealApiKey)(
      "should successfully connect to Gemini API with real API key",
      async () => {
        const t = convexTest(schema, modules);

        console.log(
          "[Integration Test] Testing real API connection with GEMINI_API_KEY...",
        );

        const result = await t.action(api.gemini.testGeminiConnection, {});

        expect(result.success).toBe(true);
        expect(result.message).toBeDefined();
        expect(typeof result.message).toBe("string");
        expect(result.message.length).toBeGreaterThan(0);
        expect(result.timestamp).toBeDefined();
        expect(typeof result.timestamp).toBe("number");

        console.log(
          `[Integration Test] Success! Response: "${result.message.substring(0, 100)}..."`,
        );
      },
      15000,
    ); // 15s timeout for real API call

    test.skipIf(!hasRealApiKey)(
      "should parse API response correctly",
      async () => {
        const t = convexTest(schema, modules);

        const result = await t.action(api.gemini.testGeminiConnection, {});

        // Verify response structure
        expect(result).toHaveProperty("success");
        expect(result).toHaveProperty("message");
        expect(result).toHaveProperty("timestamp");

        // Verify response is meaningful text
        expect(result.message).not.toContain("[object Object]");
        expect(result.message).not.toContain("undefined");
      },
      15000,
    );

    test.skipIf(!hasRealApiKey)(
      "should handle authenticated admin test endpoint",
      async () => {
        const t = convexTest(schema, modules);
        const asUser = t.withIdentity({ subject: "integration-test-user" });

        console.log(
          "[Integration Test] Testing admin endpoint with authentication...",
        );

        const result = await asUser.action(api.gemini.adminTestGemini, {
          prompt: "Say hello in one sentence",
        });

        expect(result.success).toBe(true);
        expect(result.response).toBeDefined();
        expect(result.durationMs).toBeGreaterThan(0);
        expect(result.durationMs).toBeLessThan(10000); // Should complete within timeout
        expect(result.modelUsed).toBe("gemini-1.5-flash");
        expect(result.userId).toBe("integration-test-user");

        console.log(
          `[Integration Test] Admin test success! Duration: ${result.durationMs}ms`,
        );
      },
      15000,
    );

    test.skipIf(hasRealApiKey)(
      "skip notice: integration tests skipped without GEMINI_API_KEY",
      () => {
        console.warn(
          "[Integration Test] GEMINI_API_KEY not found in environment. " +
            "Integration tests with real API are skipped. " +
            "Set GEMINI_API_KEY to run full integration tests.",
        );
        expect(true).toBe(true); // Placeholder assertion
      },
    );
  });

  describe("Error handling with mocked failures", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    test("should handle invalid API key error (401)", async () => {
      // Temporarily remove API key to simulate invalid key
      const originalKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = "invalid-key-12345";

      try {
        // Mock the SDK to throw 401 error
        vi.mock("@google/generative-ai", () => {
          const mockGenerateContent = vi.fn().mockRejectedValue(
            new Error(
              "API_KEY_INVALID: The provided API key is invalid (401 Unauthorized)",
            ),
          );

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

        const t = convexTest(schema, modules);
        const result = await t.action(api.gemini.testGeminiConnection, {});

        expect(result.success).toBe(false);
        expect(result.message).toContain("Invalid Gemini API key");
      } finally {
        // Restore original key
        if (originalKey) {
          process.env.GEMINI_API_KEY = originalKey;
        }
        vi.unmock("@google/generative-ai");
      }
    });

    test("should handle network errors", async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = "test-key";

      try {
        // Mock network error
        vi.mock("@google/generative-ai", () => {
          const mockGenerateContent = vi
            .fn()
            .mockRejectedValue(
              new Error("fetch failed: ENOTFOUND generativelanguage.googleapis.com"),
            );

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

        const t = convexTest(schema, modules);
        const result = await t.action(api.gemini.testGeminiConnection, {});

        expect(result.success).toBe(false);
        expect(result.message).toContain("Network error");
      } finally {
        if (originalKey) {
          process.env.GEMINI_API_KEY = originalKey;
        } else {
          delete process.env.GEMINI_API_KEY;
        }
        vi.unmock("@google/generative-ai");
      }
    });

    test("should handle rate limit errors (429)", async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = "test-key";

      try {
        // Mock rate limit error
        vi.mock("@google/generative-ai", () => {
          const mockGenerateContent = vi
            .fn()
            .mockRejectedValue(
              new Error("429 RESOURCE_EXHAUSTED: Quota exceeded for requests"),
            );

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

        const t = convexTest(schema, modules);
        const result = await t.action(api.gemini.testGeminiConnection, {});

        expect(result.success).toBe(false);
        expect(result.message).toContain("rate limit exceeded");
      } finally {
        if (originalKey) {
          process.env.GEMINI_API_KEY = originalKey;
        } else {
          delete process.env.GEMINI_API_KEY;
        }
        vi.unmock("@google/generative-ai");
      }
    });

    test("should handle timeout errors", async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = "test-key";

      try {
        // Mock timeout with delayed response exceeding 10s timeout
        vi.mock("@google/generative-ai", () => {
          const mockGenerateContent = vi.fn().mockImplementation(() => {
            return new Promise((resolve) => {
              // Simulate 15-second delay (exceeds 10s timeout)
              setTimeout(
                () =>
                  resolve({
                    response: { text: () => "Delayed response" },
                  }),
                15000,
              );
            });
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

        const t = convexTest(schema, modules);
        const result = await t.action(api.gemini.testGeminiConnection, {});

        expect(result.success).toBe(false);
        expect(result.message).toContain("timed out");
      } finally {
        if (originalKey) {
          process.env.GEMINI_API_KEY = originalKey;
        } else {
          delete process.env.GEMINI_API_KEY;
        }
        vi.unmock("@google/generative-ai");
      }
    });
  });

  describe("Logging verification", () => {
    test("should generate logs for successful requests", async () => {
      const t = convexTest(schema, modules);
      const consoleSpy = vi.spyOn(console, "log");

      process.env.GEMINI_API_KEY = "test-key";

      // Mock successful response
      vi.mock("@google/generative-ai", () => {
        const mockGenerateContent = vi.fn().mockResolvedValue({
          response: {
            text: () => "Test response",
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

      await t.action(api.gemini.testGeminiConnection, {});

      // Verify logs were generated
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      vi.unmock("@google/generative-ai");
    });

    test("should generate error logs for failed requests", async () => {
      const t = convexTest(schema, modules);
      const consoleErrorSpy = vi.spyOn(console, "error");

      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      await t.action(api.gemini.testGeminiConnection, {});

      // Verify error logs were generated
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();

      if (originalKey) {
        process.env.GEMINI_API_KEY = originalKey;
      }
    });
  });
});
