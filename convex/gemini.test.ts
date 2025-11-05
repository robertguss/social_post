import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

/**
 * Unit Tests for Gemini API Client
 *
 * Tests cover:
 * - Client initialization (getGeminiClient)
 * - Model initialization (getGeminiModel)
 * - Error handling for missing/invalid API keys
 * - Test actions (testGeminiConnection, adminTestGemini)
 */

// Mock the @google/generative-ai SDK
vi.mock("@google/generative-ai", () => {
  const mockGenerateContent = vi.fn().mockResolvedValue({
    response: {
      text: () => "Hello! This is a test response from Gemini.",
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

describe("Gemini API Client - Unit Tests", () => {
  describe("getGeminiClient", () => {
    test("should initialize client successfully with valid API key", async () => {
      // Set mock environment variable
      const originalEnv = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = "test-api-key-12345";

      try {
        // Import module after setting env var
        const geminiModule = await import("./gemini");
        const client = geminiModule.getGeminiClient();

        expect(client).toBeDefined();
      } finally {
        // Restore original env
        if (originalEnv) {
          process.env.GEMINI_API_KEY = originalEnv;
        } else {
          delete process.env.GEMINI_API_KEY;
        }
      }
    });

    test("should throw error when API key is missing", async () => {
      // Remove environment variable
      const originalEnv = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      try {
        // Re-import module to get fresh state
        vi.resetModules();
        const geminiModule = await import("./gemini");

        expect(() => geminiModule.getGeminiClient()).toThrow(
          "GEMINI_API_KEY not configured in environment variables",
        );
      } finally {
        // Restore original env
        if (originalEnv) {
          process.env.GEMINI_API_KEY = originalEnv;
        }
      }
    });
  });

  describe("getGeminiModel", () => {
    beforeEach(() => {
      // Ensure API key is set for model tests
      process.env.GEMINI_API_KEY = "test-api-key-12345";
    });

    test("should initialize model with default model name (gemini-1.5-flash)", async () => {
      vi.resetModules();
      const geminiModule = await import("./gemini");

      const model = geminiModule.getGeminiModel();

      expect(model).toBeDefined();
      expect(model.generateContent).toBeDefined();
    });

    test("should initialize model with custom model name (gemini-1.5-pro)", async () => {
      vi.resetModules();
      const geminiModule = await import("./gemini");

      const model = geminiModule.getGeminiModel("gemini-1.5-pro");

      expect(model).toBeDefined();
      expect(model.generateContent).toBeDefined();
    });

    test("should throw error when API key is missing", async () => {
      const originalEnv = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      try {
        vi.resetModules();
        const geminiModule = await import("./gemini");

        expect(() => geminiModule.getGeminiModel()).toThrow(
          "GEMINI_API_KEY not configured",
        );
      } finally {
        if (originalEnv) {
          process.env.GEMINI_API_KEY = originalEnv;
        }
      }
    });
  });

  describe("testGeminiConnection action", () => {
    beforeEach(() => {
      // Ensure API key is set
      process.env.GEMINI_API_KEY = "test-api-key-12345";
      vi.clearAllMocks();
    });

    test("should successfully test API connection", async () => {
      const t = convexTest(schema, modules);

      const result = await t.action(api.gemini.testGeminiConnection, {});

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe("number");
    });

    test("should return error when API key is missing", async () => {
      const originalEnv = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      try {
        const t = convexTest(schema, modules);

        const result = await t.action(api.gemini.testGeminiConnection, {});

        expect(result.success).toBe(false);
        expect(result.message).toContain("GEMINI_API_KEY not configured");
      } finally {
        if (originalEnv) {
          process.env.GEMINI_API_KEY = originalEnv;
        }
      }
    });
  });

  describe("adminTestGemini action", () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = "test-api-key-12345";
      vi.clearAllMocks();
    });

    test("should throw error when user is not authenticated", async () => {
      const t = convexTest(schema, modules);

      await expect(
        t.action(api.gemini.adminTestGemini, {
          prompt: "Hello",
        }),
      ).rejects.toThrow("Not authenticated");
    });

    test("should successfully test API with authenticated user", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.action(api.gemini.adminTestGemini, {
        prompt: "Hello",
      });

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.modelUsed).toBe("gemini-1.5-flash");
      expect(result.userId).toBe("user123");
      expect(result.timestamp).toBeDefined();
    });

    test("should use default prompt 'Hello' when not provided", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.action(api.gemini.adminTestGemini, {});

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
    });

    test("should accept custom model name", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user123" });

      const result = await asUser.action(api.gemini.adminTestGemini, {
        prompt: "Test",
        modelName: "gemini-1.5-pro",
      });

      expect(result.success).toBe(true);
      expect(result.modelUsed).toBe("gemini-1.5-pro");
    });

    test("should return error details when API call fails", async () => {
      const originalEnv = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      try {
        const t = convexTest(schema, modules);
        const asUser = t.withIdentity({ subject: "user123" });

        const result = await asUser.action(api.gemini.adminTestGemini, {
          prompt: "Test",
        });

        expect(result.success).toBe(false);
        expect(result.response).toContain("GEMINI_API_KEY not configured");
        expect(result.durationMs).toBe(0);
      } finally {
        if (originalEnv) {
          process.env.GEMINI_API_KEY = originalEnv;
        }
      }
    });
  });

  describe("Error handling", () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = "test-api-key-12345";
    });

    test("should handle timeout errors gracefully", async () => {
      // Mock timeout scenario
      vi.resetModules();

      // Re-mock with timeout simulation
      vi.mock("@google/generative-ai", () => {
        const mockGenerateContent = vi.fn().mockImplementation(() => {
          return new Promise((resolve) => {
            // Simulate long delay that will trigger timeout
            setTimeout(
              () =>
                resolve({
                  response: { text: () => "Delayed response" },
                }),
              15000,
            ); // 15 seconds (exceeds 10s timeout)
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

      // Should complete within timeout and handle error
      expect(result.success).toBe(false);
      expect(result.message).toContain("timed out");
    });
  });
});
