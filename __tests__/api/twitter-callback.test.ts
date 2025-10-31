/**
 * Integration tests for Twitter OAuth callback route handler
 *
 * Note: These tests mock external dependencies (Clerk, Convex, Twitter API).
 */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/auth/twitter/callback/route";

// Mock dependencies
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("convex/browser", () => ({
  ConvexHttpClient: jest.fn(),
}));

describe("Twitter OAuth Callback Route", () => {
  const mockAuth = require("@clerk/nextjs/server").auth;
  const mockCookies = require("next/headers").cookies;
  const { ConvexHttpClient } = require("convex/browser");

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockAuth.mockResolvedValue({
      userId: "user_123",
      getToken: jest.fn().mockResolvedValue("clerk_token_123"),
    });

    mockCookies.mockResolvedValue({
      get: jest.fn((key: string) => {
        if (key === "twitter_oauth_state") return { value: "state_123" };
        if (key === "twitter_code_verifier") return { value: "verifier_123" };
        return undefined;
      }),
      delete: jest.fn(),
    });

    // Mock Convex client
    const mockConvexInstance = {
      setAuth: jest.fn(),
      mutation: jest.fn().mockResolvedValue("conn_456"),
    };
    ConvexHttpClient.mockImplementation(() => mockConvexInstance);

    // Mock environment variables
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
    process.env.TWITTER_CLIENT_ID = "test_client_id";
    process.env.TWITTER_CLIENT_SECRET = "test_client_secret";

    // Mock global fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
    delete process.env.TWITTER_CLIENT_ID;
    delete process.env.TWITTER_CLIENT_SECRET;
  });

  it("should handle successful OAuth callback", async () => {
    // Mock Twitter token exchange response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        access_token: "twitter_access_token",
        refresh_token: "twitter_refresh_token",
        expires_in: 7200,
      }),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/auth/twitter/callback?code=auth_code_123&state=state_123"
    );

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get("location")).toContain("/settings");
    expect(response.headers.get("location")).toContain("success");
  });

  it("should handle OAuth error from Twitter", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/auth/twitter/callback?error=access_denied"
    );

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get("location")).toContain("/settings");
    expect(response.headers.get("location")).toContain("error");
  });

  it("should handle missing authorization code", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/auth/twitter/callback?state=state_123"
    );

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get("location")).toContain("error");
    expect(response.headers.get("location")).toContain(
      "Invalid%20OAuth%20callback"
    );
  });

  it("should handle state mismatch (CSRF attack)", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/auth/twitter/callback?code=auth_code_123&state=wrong_state"
    );

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get("location")).toContain("error");
    expect(response.headers.get("location")).toContain(
      "Invalid%20state%20parameter"
    );
  });

  it("should handle unauthenticated user", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const request = new NextRequest(
      "http://localhost:3000/api/auth/twitter/callback?code=auth_code_123&state=state_123"
    );

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get("location")).toContain("error");
    expect(response.headers.get("location")).toContain(
      "Authentication%20required"
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
      "http://localhost:3000/api/auth/twitter/callback?code=invalid_code&state=state_123"
    );

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get("location")).toContain("error");
    expect(response.headers.get("location")).toContain(
      "Failed%20to%20connect"
    );
  });

  it("should handle missing Twitter API credentials", async () => {
    delete process.env.TWITTER_CLIENT_ID;

    const request = new NextRequest(
      "http://localhost:3000/api/auth/twitter/callback?code=auth_code_123&state=state_123"
    );

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get("location")).toContain("error");
  });

  it("should clean up OAuth cookies after successful connection", async () => {
    const mockCookieStore = {
      get: jest.fn((key: string) => {
        if (key === "twitter_oauth_state") return { value: "state_123" };
        if (key === "twitter_code_verifier") return { value: "verifier_123" };
        return undefined;
      }),
      delete: jest.fn(),
    };
    mockCookies.mockResolvedValue(mockCookieStore);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        access_token: "twitter_access_token",
        refresh_token: "twitter_refresh_token",
        expires_in: 7200,
      }),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/auth/twitter/callback?code=auth_code_123&state=state_123"
    );

    await GET(request);

    expect(mockCookieStore.delete).toHaveBeenCalledWith(
      "twitter_code_verifier"
    );
    expect(mockCookieStore.delete).toHaveBeenCalledWith("twitter_oauth_state");
  });
});
