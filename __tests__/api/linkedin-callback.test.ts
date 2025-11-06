/**
 * Integration tests for LinkedIn OAuth callback route handler
 *
 * Note: These tests mock external dependencies (Better Auth, Convex, LinkedIn API).
 */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/auth/linkedin/callback/route";

// Mock dependencies
jest.mock("@/lib/auth-server", () => ({
  auth: jest.fn(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("convex/browser", () => ({
  ConvexHttpClient: jest.fn(),
}));

describe("LinkedIn OAuth Callback Route", () => {
  const mockAuth = require("@/lib/auth-server").auth;
  const mockCookies = require("next/headers").cookies;
  const { ConvexHttpClient } = require("convex/browser");

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockAuth.mockResolvedValue({
      user: { id: "user_123" },
      session: { id: "session_123" },
    });

    mockCookies.mockResolvedValue({
      get: jest.fn((key: string) => {
        if (key === "linkedin_oauth_state") return { value: "state_123" };
        return undefined;
      }),
      delete: jest.fn(),
    });

    // Mock Convex client
    const mockConvexInstance = {
      setAuth: jest.fn(),
      action: jest.fn().mockResolvedValue("conn_456"),
    };
    ConvexHttpClient.mockImplementation(() => mockConvexInstance);

    // Mock environment variables
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
    process.env.LINKEDIN_CLIENT_ID = "test_linkedin_client_id";
    process.env.LINKEDIN_CLIENT_SECRET = "test_linkedin_client_secret";

    // Mock global fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
    delete process.env.LINKEDIN_CLIENT_ID;
    delete process.env.LINKEDIN_CLIENT_SECRET;
  });

  it("should handle successful OAuth callback", async () => {
    // Mock LinkedIn token exchange response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        access_token: "linkedin_access_token",
        refresh_token: "linkedin_refresh_token",
        expires_in: 5184000, // 60 days
      }),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/auth/linkedin/callback?code=auth_code_123&state=state_123",
    );

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get("location")).toContain("/settings");
    expect(response.headers.get("location")).toContain("success");
    expect(response.headers.get("location")).toContain("LinkedIn");
  });

  it("should handle OAuth error from LinkedIn", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/auth/linkedin/callback?error=access_denied",
    );

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get("location")).toContain("/settings");
    expect(response.headers.get("location")).toContain("error");
  });

  it("should handle missing authorization code", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/auth/linkedin/callback?state=state_123",
    );

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get("location")).toContain("error");
    expect(response.headers.get("location")).toContain(
      "Invalid%20OAuth%20callback",
    );
  });

  it("should handle state mismatch (CSRF attack)", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/auth/linkedin/callback?code=auth_code_123&state=wrong_state",
    );

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get("location")).toContain("error");
    expect(response.headers.get("location")).toContain(
      "Invalid%20state%20parameter",
    );
  });

  it("should handle missing state parameter", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/auth/linkedin/callback?code=auth_code_123",
    );

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get("location")).toContain("error");
  });

  it("should handle unauthenticated user", async () => {
    mockAuth.mockResolvedValue({ user: null, session: null });

    const request = new NextRequest(
      "http://localhost:3000/api/auth/linkedin/callback?code=auth_code_123&state=state_123",
    );

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get("location")).toContain("error");
    expect(response.headers.get("location")).toContain(
      "Authentication%20required",
    );
  });

  it("should handle token exchange failure", async () => {
    // Mock failed token exchange
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: "Bad Request",
      text: jest.fn().mockResolvedValue("Invalid authorization code"),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/auth/linkedin/callback?code=invalid_code&state=state_123",
    );

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get("location")).toContain("error");
    expect(response.headers.get("location")).toContain(
      "Failed%20to%20connect",
    );
  });

  it("should handle missing LinkedIn API credentials", async () => {
    delete process.env.LINKEDIN_CLIENT_ID;

    const request = new NextRequest(
      "http://localhost:3000/api/auth/linkedin/callback?code=auth_code_123&state=state_123",
    );

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get("location")).toContain("error");
  });

  it("should clean up OAuth state cookie after successful connection", async () => {
    const mockCookieStore = {
      get: jest.fn((key: string) => {
        if (key === "linkedin_oauth_state") return { value: "state_123" };
        return undefined;
      }),
      delete: jest.fn(),
    };
    mockCookies.mockResolvedValue(mockCookieStore);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        access_token: "linkedin_access_token",
        refresh_token: "linkedin_refresh_token",
        expires_in: 5184000,
      }),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/auth/linkedin/callback?code=auth_code_123&state=state_123",
    );

    await GET(request);

    expect(mockCookieStore.delete).toHaveBeenCalledWith("linkedin_oauth_state");
  });

  it("should call saveConnection with correct platform", async () => {
    const mockConvexInstance = {
      setAuth: jest.fn(),
      action: jest.fn().mockResolvedValue("conn_456"),
    };
    ConvexHttpClient.mockImplementation(() => mockConvexInstance);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        access_token: "linkedin_access_token",
        refresh_token: "linkedin_refresh_token",
        expires_in: 5184000,
      }),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/auth/linkedin/callback?code=auth_code_123&state=state_123",
    );

    await GET(request);

    expect(mockConvexInstance.action).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        platform: "linkedin",
        accessToken: "linkedin_access_token",
        refreshToken: "linkedin_refresh_token",
      }),
    );
  });

  it("should correctly calculate token expiration timestamp", async () => {
    const mockConvexInstance = {
      setAuth: jest.fn(),
      action: jest.fn().mockResolvedValue("conn_456"),
    };
    ConvexHttpClient.mockImplementation(() => mockConvexInstance);

    const expiresIn = 5184000; // 60 days in seconds
    const beforeTime = Date.now();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        access_token: "linkedin_access_token",
        refresh_token: "linkedin_refresh_token",
        expires_in: expiresIn,
      }),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/auth/linkedin/callback?code=auth_code_123&state=state_123",
    );

    await GET(request);

    const afterTime = Date.now();
    const callArgs = mockConvexInstance.action.mock.calls[0][1];
    const expiresAt = callArgs.expiresAt;

    // Verify expiresAt is approximately Date.now() + expiresIn * 1000
    expect(expiresAt).toBeGreaterThanOrEqual(beforeTime + expiresIn * 1000);
    expect(expiresAt).toBeLessThanOrEqual(afterTime + expiresIn * 1000);
  });

  describe("Retry Logic and Timeout Handling", () => {
    beforeEach(() => {
      // Mock timers for testing retry delays
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should retry on 5xx server errors and succeed", async () => {
      const mockConvexInstance = {
        setAuth: jest.fn(),
        action: jest.fn().mockResolvedValue("conn_456"),
      };
      ConvexHttpClient.mockImplementation(() => mockConvexInstance);

      // First attempt fails with 503, second succeeds
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
          text: jest.fn().mockResolvedValue("Service temporarily unavailable"),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            access_token: "linkedin_access_token",
            refresh_token: "linkedin_refresh_token",
            expires_in: 5184000,
          }),
        });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/linkedin/callback?code=auth_code_123&state=state_123",
      );

      const responsePromise = GET(request);

      // Fast-forward through retry delay (1 second for first retry)
      await jest.advanceTimersByTimeAsync(1000);

      const response = await responsePromise;

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("success");
      expect(global.fetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it("should retry on 429 rate limit errors", async () => {
      const mockConvexInstance = {
        setAuth: jest.fn(),
        action: jest.fn().mockResolvedValue("conn_456"),
      };
      ConvexHttpClient.mockImplementation(() => mockConvexInstance);

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
            access_token: "linkedin_access_token",
            refresh_token: "linkedin_refresh_token",
            expires_in: 5184000,
          }),
        });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/linkedin/callback?code=auth_code_123&state=state_123",
      );

      const responsePromise = GET(request);
      await jest.advanceTimersByTimeAsync(1000);
      const response = await responsePromise;

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("success");
    });

    it("should not retry on 4xx client errors (except 429)", async () => {
      // Mock failed 400 response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: jest.fn().mockResolvedValue("Invalid authorization code"),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/linkedin/callback?code=invalid_code&state=state_123",
      );

      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("error");
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retries for 4xx
    });

    it("should fail after max retries on persistent 5xx errors", async () => {
      // All attempts fail with 503
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        text: jest.fn().mockResolvedValue("Service down"),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/linkedin/callback?code=auth_code_123&state=state_123",
      );

      const responsePromise = GET(request);

      // Fast-forward through all retry delays (1s + 2s + 4s)
      await jest.advanceTimersByTimeAsync(1000); // First retry
      await jest.advanceTimersByTimeAsync(2000); // Second retry
      await jest.advanceTimersByTimeAsync(4000); // Third retry (final)

      const response = await responsePromise;

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("error");
      expect(global.fetch).toHaveBeenCalledTimes(3); // Max retries
    });

    it("should handle timeout with AbortController", async () => {
      // Simulate a timeout by never resolving
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            // Never resolve - will be aborted by timeout
            setTimeout(() => resolve, 999999);
          }),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/auth/linkedin/callback?code=auth_code_123&state=state_123",
      );

      const responsePromise = GET(request);

      // Fast-forward to trigger timeout (10 seconds)
      await jest.advanceTimersByTimeAsync(10000);

      // Then fast-forward through retry delays
      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(10000);
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(10000);

      const response = await responsePromise;

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("error");
    });
  });
});
