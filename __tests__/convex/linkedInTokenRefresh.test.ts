/**
 * Integration tests for LinkedIn token refresh functionality
 *
 * These tests verify the refreshLinkedInToken action handles:
 * - Successful token refresh flow
 * - Expired refresh tokens (requires re-auth)
 * - Retry logic with 5xx errors
 * - Timeout handling
 * - Token encryption after refresh
 */

import { refreshLinkedInToken } from "@/convex/tokenRefresh";

// Mock Convex action context
const createMockActionContext = () => {
  return {
    auth: {
      getUserIdentity: jest.fn(),
    },
    runAction: jest.fn(),
    runMutation: jest.fn(),
    runQuery: jest.fn(),
  };
};

// Mock environment variables
const mockEnv = {
  LINKEDIN_CLIENT_ID: "test_linkedin_client_id",
  LINKEDIN_CLIENT_SECRET: "test_linkedin_client_secret",
};

describe("LinkedIn Token Refresh", () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    // Save original env and set up mocks
    originalEnv = process.env;
    process.env = { ...originalEnv, ...mockEnv };

    // Mock global fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe("Successful Token Refresh", () => {
    it("should successfully refresh LinkedIn tokens", async () => {
      const ctx = createMockActionContext();
      const mockConnection = {
        accessToken: "encrypted_old_access",
        refreshToken: "encrypted_old_refresh",
        expiresAt: Date.now() - 1000, // Expired
      };

      // Mock getConnectionInternal query
      ctx.runQuery = jest.fn().mockResolvedValue(mockConnection);

      // Mock decrypt action
      ctx.runAction = jest
        .fn()
        .mockResolvedValueOnce("decrypted_refresh_token") // decrypt refresh token
        .mockResolvedValueOnce("encrypted_new_access") // encrypt new access token
        .mockResolvedValueOnce("encrypted_new_refresh"); // encrypt new refresh token

      // Mock saveConnectionInternal mutation
      ctx.runMutation = jest.fn().mockResolvedValue(undefined);

      // Mock successful LinkedIn API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          access_token: "new_access_token",
          refresh_token: "new_refresh_token",
          expires_in: 5184000, // 60 days
        }),
      });

      const args = { userId: "user_123" };
      const result = await refreshLinkedInToken.handler(ctx as any, args);

      expect(result.success).toBe(true);
      expect(result.expiresAt).toBeGreaterThan(Date.now());
      expect(result.error).toBeUndefined();
      expect(result.needsReauth).toBeUndefined();

      // Verify tokens were encrypted before storage
      expect(ctx.runAction).toHaveBeenCalledTimes(3); // 1 decrypt + 2 encrypts
      expect(ctx.runMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: "user_123",
          platform: "linkedin",
          accessToken: "encrypted_new_access",
          refreshToken: "encrypted_new_refresh",
        })
      );
    });

    it("should correctly calculate expiration timestamp", async () => {
      const ctx = createMockActionContext();
      const mockConnection = {
        accessToken: "encrypted_access",
        refreshToken: "encrypted_refresh",
        expiresAt: Date.now() - 1000,
      };

      ctx.runQuery = jest.fn().mockResolvedValue(mockConnection);
      ctx.runAction = jest
        .fn()
        .mockResolvedValueOnce("decrypted_refresh")
        .mockResolvedValueOnce("encrypted_access")
        .mockResolvedValueOnce("encrypted_refresh");
      ctx.runMutation = jest.fn().mockResolvedValue(undefined);

      const expiresIn = 5184000; // 60 days in seconds
      const beforeTime = Date.now();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          access_token: "new_access",
          refresh_token: "new_refresh",
          expires_in: expiresIn,
        }),
      });

      const result = await refreshLinkedInToken.handler(ctx as any, {
        userId: "user_123",
      });

      const afterTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.expiresAt).toBeGreaterThanOrEqual(
        beforeTime + expiresIn * 1000
      );
      expect(result.expiresAt).toBeLessThanOrEqual(
        afterTime + expiresIn * 1000
      );
    });

    it("should use default expiration if expires_in is missing", async () => {
      const ctx = createMockActionContext();
      ctx.runQuery = jest.fn().mockResolvedValue({
        accessToken: "encrypted_access",
        refreshToken: "encrypted_refresh",
        expiresAt: Date.now() - 1000,
      });
      ctx.runAction = jest
        .fn()
        .mockResolvedValueOnce("decrypted_refresh")
        .mockResolvedValueOnce("encrypted_access")
        .mockResolvedValueOnce("encrypted_refresh");
      ctx.runMutation = jest.fn().mockResolvedValue(undefined);

      // LinkedIn response without expires_in
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          access_token: "new_access",
          refresh_token: "new_refresh",
          // expires_in is missing - should use default
        }),
      });

      const beforeTime = Date.now();
      const result = await refreshLinkedInToken.handler(ctx as any, {
        userId: "user_123",
      });

      // Should default to 60 days (5184000 seconds)
      expect(result.success).toBe(true);
      expect(result.expiresAt).toBeGreaterThanOrEqual(
        beforeTime + 5184000 * 1000
      );
    });
  });

  describe("Error Handling - Expired Refresh Token", () => {
    it("should return needsReauth when refresh token is expired (400)", async () => {
      const ctx = createMockActionContext();
      ctx.runQuery = jest.fn().mockResolvedValue({
        accessToken: "encrypted_access",
        refreshToken: "encrypted_refresh",
        expiresAt: Date.now() - 1000,
      });
      ctx.runAction = jest.fn().mockResolvedValue("decrypted_refresh");

      // Mock 400 error (expired refresh token)
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: jest.fn().mockResolvedValue("invalid_grant"),
      });

      const result = await refreshLinkedInToken.handler(ctx as any, {
        userId: "user_123",
      });

      expect(result.success).toBe(false);
      expect(result.needsReauth).toBe(true);
      expect(result.error).toContain("re-authentication required");
    });

    it("should return needsReauth when refresh token is expired (401)", async () => {
      const ctx = createMockActionContext();
      ctx.runQuery = jest.fn().mockResolvedValue({
        accessToken: "encrypted_access",
        refreshToken: "encrypted_refresh",
        expiresAt: Date.now() - 1000,
      });
      ctx.runAction = jest.fn().mockResolvedValue("decrypted_refresh");

      // Mock 401 error (unauthorized)
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: jest.fn().mockResolvedValue("invalid_token"),
      });

      const result = await refreshLinkedInToken.handler(ctx as any, {
        userId: "user_123",
      });

      expect(result.success).toBe(false);
      expect(result.needsReauth).toBe(true);
    });

    it("should return needsReauth when connection not found", async () => {
      const ctx = createMockActionContext();
      ctx.runQuery = jest.fn().mockResolvedValue(null);

      const result = await refreshLinkedInToken.handler(ctx as any, {
        userId: "user_123",
      });

      expect(result.success).toBe(false);
      expect(result.needsReauth).toBe(true);
      expect(result.error).toContain("connection not found");
    });
  });

  describe("Retry Logic with 5xx Errors", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should retry on 5xx server errors and succeed", async () => {
      const ctx = createMockActionContext();
      ctx.runQuery = jest.fn().mockResolvedValue({
        accessToken: "encrypted_access",
        refreshToken: "encrypted_refresh",
        expiresAt: Date.now() - 1000,
      });
      ctx.runAction = jest
        .fn()
        .mockResolvedValueOnce("decrypted_refresh")
        .mockResolvedValueOnce("encrypted_access")
        .mockResolvedValueOnce("encrypted_refresh");
      ctx.runMutation = jest.fn().mockResolvedValue(undefined);

      // First attempt fails with 503, second succeeds
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
          text: jest.fn().mockResolvedValue("Service down"),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            access_token: "new_access",
            refresh_token: "new_refresh",
            expires_in: 5184000,
          }),
        });

      const resultPromise = refreshLinkedInToken.handler(ctx as any, {
        userId: "user_123",
      });

      // Fast-forward through retry delay (1 second for first retry)
      await jest.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it("should retry on 429 rate limit errors", async () => {
      const ctx = createMockActionContext();
      ctx.runQuery = jest.fn().mockResolvedValue({
        accessToken: "encrypted_access",
        refreshToken: "encrypted_refresh",
        expiresAt: Date.now() - 1000,
      });
      ctx.runAction = jest
        .fn()
        .mockResolvedValueOnce("decrypted_refresh")
        .mockResolvedValueOnce("encrypted_access")
        .mockResolvedValueOnce("encrypted_refresh");
      ctx.runMutation = jest.fn().mockResolvedValue(undefined);

      // First attempt fails with 429, second succeeds
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          text: jest.fn().mockResolvedValue("Rate limit exceeded"),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            access_token: "new_access",
            refresh_token: "new_refresh",
            expires_in: 5184000,
          }),
        });

      const resultPromise = refreshLinkedInToken.handler(ctx as any, {
        userId: "user_123",
      });

      await jest.advanceTimersByTimeAsync(1000);
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should not retry on 4xx client errors (except 429)", async () => {
      const ctx = createMockActionContext();
      ctx.runQuery = jest.fn().mockResolvedValue({
        accessToken: "encrypted_access",
        refreshToken: "encrypted_refresh",
        expiresAt: Date.now() - 1000,
      });
      ctx.runAction = jest.fn().mockResolvedValue("decrypted_refresh");

      // Mock 403 error (should not retry)
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: jest.fn().mockResolvedValue("Access denied"),
      });

      const result = await refreshLinkedInToken.handler(ctx as any, {
        userId: "user_123",
      });

      expect(result.success).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retries
    });

    it("should fail after max retries on persistent 5xx errors", async () => {
      const ctx = createMockActionContext();
      ctx.runQuery = jest.fn().mockResolvedValue({
        accessToken: "encrypted_access",
        refreshToken: "encrypted_refresh",
        expiresAt: Date.now() - 1000,
      });
      ctx.runAction = jest.fn().mockResolvedValue("decrypted_refresh");

      // All attempts fail with 503
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        text: jest.fn().mockResolvedValue("Service down"),
      });

      const resultPromise = refreshLinkedInToken.handler(ctx as any, {
        userId: "user_123",
      });

      // Fast-forward through all retry delays (1s + 2s + 4s)
      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(4000);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(3); // Max retries
      expect(result.needsReauth).toBe(false);
    });
  });

  describe("Timeout Handling", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should timeout and retry after 10 seconds", async () => {
      const ctx = createMockActionContext();
      ctx.runQuery = jest.fn().mockResolvedValue({
        accessToken: "encrypted_access",
        refreshToken: "encrypted_refresh",
        expiresAt: Date.now() - 1000,
      });
      ctx.runAction = jest
        .fn()
        .mockResolvedValueOnce("decrypted_refresh")
        .mockResolvedValueOnce("encrypted_access")
        .mockResolvedValueOnce("encrypted_refresh");
      ctx.runMutation = jest.fn().mockResolvedValue(undefined);

      // First attempt times out, second succeeds
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call never resolves (timeout)
          return new Promise(() => {});
        }
        // Second call succeeds
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue({
            access_token: "new_access",
            refresh_token: "new_refresh",
            expires_in: 5184000,
          }),
        });
      });

      const resultPromise = refreshLinkedInToken.handler(ctx as any, {
        userId: "user_123",
      });

      // Trigger timeout (10 seconds)
      await jest.advanceTimersByTimeAsync(10000);
      // Retry delay (1 second)
      await jest.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should fail after max timeout retries", async () => {
      const ctx = createMockActionContext();
      ctx.runQuery = jest.fn().mockResolvedValue({
        accessToken: "encrypted_access",
        refreshToken: "encrypted_refresh",
        expiresAt: Date.now() - 1000,
      });
      ctx.runAction = jest.fn().mockResolvedValue("decrypted_refresh");

      // All attempts timeout
      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise(() => {}); // Never resolves
      });

      const resultPromise = refreshLinkedInToken.handler(ctx as any, {
        userId: "user_123",
      });

      // Trigger all 3 timeouts with retries
      for (let i = 0; i < 3; i++) {
        await jest.advanceTimersByTimeAsync(10000); // Timeout
        if (i < 2) {
          await jest.advanceTimersByTimeAsync(Math.pow(2, i) * 1000); // Retry delay
        }
      }

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain("timed out");
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("Token Encryption Verification", () => {
    it("should encrypt tokens before storing in database", async () => {
      const ctx = createMockActionContext();
      ctx.runQuery = jest.fn().mockResolvedValue({
        accessToken: "encrypted_old_access",
        refreshToken: "encrypted_old_refresh",
        expiresAt: Date.now() - 1000,
      });

      const encryptedNewAccess = "encrypted_new_access_xyz";
      const encryptedNewRefresh = "encrypted_new_refresh_xyz";

      ctx.runAction = jest
        .fn()
        .mockResolvedValueOnce("decrypted_refresh_token") // decrypt
        .mockResolvedValueOnce(encryptedNewAccess) // encrypt access
        .mockResolvedValueOnce(encryptedNewRefresh); // encrypt refresh

      ctx.runMutation = jest.fn().mockResolvedValue(undefined);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          access_token: "plain_new_access",
          refresh_token: "plain_new_refresh",
          expires_in: 5184000,
        }),
      });

      await refreshLinkedInToken.handler(ctx as any, {
        userId: "user_123",
      });

      // Verify mutation was called with ENCRYPTED tokens
      expect(ctx.runMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          accessToken: encryptedNewAccess,
          refreshToken: encryptedNewRefresh,
        })
      );
    });
  });

  describe("Error Handling - Missing Tokens in Response", () => {
    it("should fail when access_token is missing", async () => {
      const ctx = createMockActionContext();
      ctx.runQuery = jest.fn().mockResolvedValue({
        accessToken: "encrypted_access",
        refreshToken: "encrypted_refresh",
        expiresAt: Date.now() - 1000,
      });
      ctx.runAction = jest.fn().mockResolvedValue("decrypted_refresh");

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          // Missing access_token
          refresh_token: "new_refresh",
          expires_in: 5184000,
        }),
      });

      const result = await refreshLinkedInToken.handler(ctx as any, {
        userId: "user_123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("missing required tokens");
    });

    it("should fail when refresh_token is missing", async () => {
      const ctx = createMockActionContext();
      ctx.runQuery = jest.fn().mockResolvedValue({
        accessToken: "encrypted_access",
        refreshToken: "encrypted_refresh",
        expiresAt: Date.now() - 1000,
      });
      ctx.runAction = jest.fn().mockResolvedValue("decrypted_refresh");

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          access_token: "new_access",
          // Missing refresh_token
          expires_in: 5184000,
        }),
      });

      const result = await refreshLinkedInToken.handler(ctx as any, {
        userId: "user_123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("missing required tokens");
    });
  });

  describe("Error Handling - Missing Environment Variables", () => {
    it("should fail when LINKEDIN_CLIENT_ID is not configured", async () => {
      delete process.env.LINKEDIN_CLIENT_ID;

      const ctx = createMockActionContext();
      ctx.runQuery = jest.fn().mockResolvedValue({
        accessToken: "encrypted_access",
        refreshToken: "encrypted_refresh",
        expiresAt: Date.now() - 1000,
      });
      ctx.runAction = jest.fn().mockResolvedValue("decrypted_refresh");

      const result = await refreshLinkedInToken.handler(ctx as any, {
        userId: "user_123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("credentials not configured");
    });

    it("should fail when LINKEDIN_CLIENT_SECRET is not configured", async () => {
      delete process.env.LINKEDIN_CLIENT_SECRET;

      const ctx = createMockActionContext();
      ctx.runQuery = jest.fn().mockResolvedValue({
        accessToken: "encrypted_access",
        refreshToken: "encrypted_refresh",
        expiresAt: Date.now() - 1000,
      });
      ctx.runAction = jest.fn().mockResolvedValue("decrypted_refresh");

      const result = await refreshLinkedInToken.handler(ctx as any, {
        userId: "user_123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("credentials not configured");
    });
  });
});
