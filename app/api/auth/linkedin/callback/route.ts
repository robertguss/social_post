import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

/**
 * OAuth 2.0 Callback Handler for LinkedIn
 *
 * Handles the redirect from LinkedIn's authorization page.
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
      const errorDescription = searchParams.get("error_description") || error;
      console.error("LinkedIn OAuth error:", {
        error,
        errorDescription,
        fullUrl: request.url,
      });
      return NextResponse.redirect(
        new URL(
          `/settings?error=${encodeURIComponent(`OAuth failed: ${errorDescription}`)}`,
          request.url,
        ),
      );
    }

    // Validate required parameters
    if (!code || !state) {
      console.error("Missing code or state parameter");
      return NextResponse.redirect(
        new URL(
          `/settings?error=${encodeURIComponent("Invalid OAuth callback")}`,
          request.url,
        ),
      );
    }

    // CSRF Protection: Verify state matches what we stored in cookies
    const cookieStore = await cookies();
    const storedState = cookieStore.get("linkedin_oauth_state")?.value;

    if (!storedState || storedState !== state) {
      console.error("State mismatch - possible CSRF attack");
      return NextResponse.redirect(
        new URL(
          `/settings?error=${encodeURIComponent("Invalid state parameter")}`,
          request.url,
        ),
      );
    }

    // Get Clerk user authentication
    const { userId } = await auth();
    if (!userId) {
      console.error("User not authenticated");
      return NextResponse.redirect(
        new URL(
          `/settings?error=${encodeURIComponent("Authentication required")}`,
          request.url,
        ),
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await exchangeCodeForTokens(code, request);

    if (!tokenResponse.access_token) {
      throw new Error("Failed to obtain access token");
    }

    // LinkedIn's refresh_token is only available with offline_access scope
    // If not available, use access_token as placeholder (tokens last 60 days)
    const refreshToken =
      tokenResponse.refresh_token || tokenResponse.access_token;

    // Calculate token expiration timestamp
    // LinkedIn tokens expire in 60 days by default
    const expiresIn = tokenResponse.expires_in || 5184000; // 60 days in seconds
    const expiresAt = Date.now() + expiresIn * 1000;

    // Store connection in Convex
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
    const convex = new ConvexHttpClient(convexUrl);

    // Get Clerk token for Convex authentication
    const { getToken } = await auth();
    const clerkToken = await getToken({ template: "convex" });

    if (!clerkToken) {
      throw new Error("Failed to get Clerk token for Convex");
    }

    convex.setAuth(clerkToken);

    // Save connection to Convex
    await convex.action(api.connections.saveConnection, {
      platform: "linkedin",
      accessToken: tokenResponse.access_token,
      refreshToken: refreshToken,
      expiresAt,
    });

    // Clean up OAuth cookies
    cookieStore.delete("linkedin_oauth_state");

    // Redirect to settings page with success message
    return NextResponse.redirect(
      new URL(
        `/settings?success=${encodeURIComponent("LinkedIn connected successfully")}`,
        request.url,
      ),
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/settings?error=${encodeURIComponent("Failed to connect LinkedIn account")}`,
        request.url,
      ),
    );
  }
}

/**
 * Exchanges the authorization code for access and refresh tokens with retry logic.
 *
 * Implements exponential backoff retry strategy for transient failures.
 * Includes timeout handling to prevent indefinite hangs.
 *
 * @param code - Authorization code from LinkedIn
 * @param request - The incoming request (for building redirect URI)
 * @returns Token response object
 */
async function exchangeCodeForTokens(
  code: string,
  request: NextRequest,
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = `${request.nextUrl.origin}/api/auth/linkedin/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("LinkedIn OAuth credentials not configured");
  }

  const tokenEndpoint = "https://www.linkedin.com/oauth/v2/accessToken";
  const maxRetries = 3;
  const timeoutMs = 10000; // 10 seconds

  // Retry with exponential backoff for transient failures
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();

        // Retry on 5xx server errors or 429 rate limiting
        if (response.status >= 500 || response.status === 429) {
          if (attempt < maxRetries - 1) {
            const delayMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
            console.warn(
              `Token exchange failed (attempt ${attempt + 1}/${maxRetries}): ${response.statusText}. Retrying in ${delayMs}ms...`
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          }
        }

        // Don't retry on client errors (4xx) except 429
        console.error("Token exchange failed:", errorText);
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      // Parse and log the response to debug token exchange
      const responseData = await response.json();
      console.log("LinkedIn token response:", {
        hasAccessToken: !!responseData.access_token,
        hasRefreshToken: !!responseData.refresh_token,
        hasIdToken: !!responseData.id_token,
        expiresIn: responseData.expires_in,
        scope: responseData.scope,
        keys: Object.keys(responseData),
      });

      return responseData;
    } catch (error) {
      // Handle timeout errors
      if (error instanceof Error && error.name === "AbortError") {
        if (attempt < maxRetries - 1) {
          const delayMs = Math.pow(2, attempt) * 1000;
          console.warn(
            `Token exchange timed out (attempt ${attempt + 1}/${maxRetries}). Retrying in ${delayMs}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        throw new Error("Token exchange timed out after multiple attempts");
      }

      // Re-throw other errors (network failures, etc.)
      if (attempt < maxRetries - 1) {
        const delayMs = Math.pow(2, attempt) * 1000;
        console.warn(
          `Token exchange error (attempt ${attempt + 1}/${maxRetries}): ${error}. Retrying in ${delayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      throw error;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error("Token exchange failed after all retry attempts");
}
