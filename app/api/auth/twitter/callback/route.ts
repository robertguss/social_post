import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getToken } from "@/lib/auth-server";
import { cookies } from "next/headers";

/**
 * OAuth 2.0 Callback Handler for X/Twitter
 *
 * Handles the redirect from Twitter's authorization page.
 * Exchanges the authorization code for access and refresh tokens,
 * then stores them in Convex.
 */
export async function GET(request: NextRequest) {
  try {
    // Extract OAuth parameters from callback URL
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors (user denied, etc.)
    if (error) {
      console.error("OAuth error:", error);
      return NextResponse.redirect(
        new URL(
          `/settings?error=${encodeURIComponent("OAuth authorization failed")}`,
          request.url
        )
      );
    }

    // Validate required parameters
    if (!code || !state) {
      console.error("Missing code or state parameter");
      return NextResponse.redirect(
        new URL(
          `/settings?error=${encodeURIComponent("Invalid OAuth callback")}`,
          request.url
        )
      );
    }

    // CSRF Protection: Verify state matches what we stored in cookies
    const cookieStore = await cookies();
    const storedState = cookieStore.get("twitter_oauth_state")?.value;

    if (!storedState || storedState !== state) {
      console.error("State mismatch - possible CSRF attack");
      return NextResponse.redirect(
        new URL(
          `/settings?error=${encodeURIComponent("Invalid state parameter")}`,
          request.url
        )
      );
    }

    // Get Better Auth token for authentication
    const token = await getToken();
    if (!token) {
      console.error("User not authenticated");
      return NextResponse.redirect(
        new URL(
          `/settings?error=${encodeURIComponent("Authentication required")}`,
          request.url
        )
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await exchangeCodeForTokens(code, request);

    if (!tokenResponse.access_token || !tokenResponse.refresh_token) {
      throw new Error("Failed to obtain access tokens");
    }

    // Calculate token expiration timestamp
    // Default to 2 hours if expires_in is not provided
    const expiresIn = tokenResponse.expires_in || 7200; // 2 hours in seconds
    const expiresAt = Date.now() + expiresIn * 1000;

    // Store connection in Convex
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
    const convex = new ConvexHttpClient(convexUrl);

    convex.setAuth(token);

    // Save connection to Convex
    await convex.action(api.connections.saveConnection, {
      platform: "twitter",
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt,
    });

    // Clean up OAuth cookies
    cookieStore.delete("twitter_code_verifier");
    cookieStore.delete("twitter_oauth_state");

    // Redirect to settings page with success message
    return NextResponse.redirect(
      new URL(
        `/settings?success=${encodeURIComponent("Twitter connected successfully")}`,
        request.url
      )
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/settings?error=${encodeURIComponent("Failed to connect Twitter account")}`,
        request.url
      )
    );
  }
}

/**
 * Exchanges the authorization code for access and refresh tokens.
 *
 * @param code - Authorization code from Twitter
 * @param request - The incoming request (for building redirect URI)
 * @returns Token response object
 */
async function exchangeCodeForTokens(
  code: string,
  request: NextRequest
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}> {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const redirectUri = `${request.nextUrl.origin}/api/auth/twitter/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Twitter OAuth credentials not configured");
  }

  // Retrieve code_verifier from cookies
  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get("twitter_code_verifier")?.value;

  if (!codeVerifier) {
    throw new Error("Code verifier not found in cookies");
  }

  const tokenEndpoint = "https://api.x.com/2/oauth2/token";

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token exchange failed:", errorText);
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return await response.json();
}
