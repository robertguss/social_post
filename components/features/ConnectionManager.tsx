"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * ConnectionManager Component
 *
 * Manages OAuth connections to external platforms (X/Twitter, LinkedIn).
 * Displays connection status and provides UI to initiate OAuth flow.
 */
export function ConnectionManager() {
  // Fetch Twitter connection status
  const twitterStatus = useQuery(api.connections.getConnectionStatus, {
    platform: "twitter",
  });

  // Fetch LinkedIn connection status
  const linkedInStatus = useQuery(api.connections.getConnectionStatus, {
    platform: "linkedin",
  });

  /**
   * Initiates the OAuth 2.0 flow for X/Twitter.
   * Redirects user to Twitter's authorization page.
   */
  const handleConnectTwitter = async () => {
    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Generate random state for CSRF protection
    const state = generateRandomState();

    // Store code verifier and state in cookies (accessible server-side)
    document.cookie = `twitter_code_verifier=${codeVerifier}; path=/; max-age=600; secure; samesite=lax`;
    document.cookie = `twitter_oauth_state=${state}; path=/; max-age=600; secure; samesite=lax`;

    // Build authorization URL
    const clientId = process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/twitter/callback`;
    const scopes = [
      "tweet.read",
      "tweet.write",
      "users.read",
      "offline.access",
    ].join(" ");

    const authUrl = new URL("https://x.com/i/oauth2/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId!);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    // Redirect to Twitter OAuth page
    window.location.href = authUrl.toString();
  };

  /**
   * Initiates the OAuth 2.0 flow for LinkedIn.
   * Redirects user to LinkedIn's authorization page.
   * Note: LinkedIn uses standard OAuth 2.0 (no PKCE required).
   */
  const handleConnectLinkedIn = () => {
    // Generate random state for CSRF protection
    const state = generateRandomState();

    // Store state in cookie (accessible server-side)
    document.cookie = `linkedin_oauth_state=${state}; path=/; max-age=600; secure; samesite=lax`;

    // Build authorization URL
    const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/linkedin/callback`;
    // Updated scopes for LinkedIn's v2 API with OpenID Connect
    // Note: "Share on LinkedIn" product must be approved in LinkedIn Developer Portal
    // Note: offline_access requires additional approval from LinkedIn
    // Access tokens are valid for 60 days without it
    const scopes = ["openid", "profile", "email", "w_member_social"].join(" ");

    const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId!);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("state", state);

    // Redirect to LinkedIn OAuth page
    window.location.href = authUrl.toString();
  };

  /**
   * Renders the connection status badge with appropriate styling.
   * @param status - Connection status object for a platform
   */
  const renderConnectionStatus = (
    status:
      | { connected: boolean; needsReauth?: boolean; expiresAt?: number }
      | undefined,
  ) => {
    if (!status) {
      return <Badge variant="outline">Loading...</Badge>;
    }

    if (!status.connected) {
      return <Badge variant="outline">Not Connected</Badge>;
    }

    if (status.needsReauth) {
      return <Badge variant="destructive">Needs Re-authentication</Badge>;
    }

    // Format expiration date
    const expiresDate = status.expiresAt
      ? new Date(status.expiresAt).toLocaleDateString()
      : "Unknown";

    return (
      <div className="flex flex-col gap-1">
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          Connected
        </Badge>
        <span className="text-xs text-muted-foreground">
          Expires: {expiresDate}
        </span>
      </div>
    );
  };

  /**
   * Determines whether to show the "Connect" button for a platform.
   */
  const showTwitterConnectButton =
    !twitterStatus?.connected || twitterStatus?.needsReauth;

  const showLinkedInConnectButton =
    !linkedInStatus?.connected || linkedInStatus?.needsReauth;

  return (
    <div className="space-y-4">
      {/* Twitter/X Connection */}
      <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Twitter/X Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black dark:bg-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="white"
              className="h-5 w-5 dark:fill-black"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium">X / Twitter</h3>
            <p className="text-sm text-muted-foreground">
              Connect your Twitter account to schedule posts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {renderConnectionStatus(twitterStatus)}
          {showTwitterConnectButton && (
            <Button onClick={handleConnectTwitter} variant="default">
              {twitterStatus?.needsReauth ? "Re-connect" : "Connect X/Twitter"}
            </Button>
          )}
        </div>
      </div>

      {/* LinkedIn Connection */}
      <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* LinkedIn Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A66C2]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="white"
              className="h-5 w-5"
            >
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium">LinkedIn</h3>
            <p className="text-sm text-muted-foreground">
              Connect your LinkedIn account to schedule posts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {renderConnectionStatus(linkedInStatus)}
          {showLinkedInConnectButton && (
            <Button onClick={handleConnectLinkedIn} variant="default">
              {linkedInStatus?.needsReauth ? "Re-connect" : "Connect LinkedIn"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Generates a cryptographically random code verifier for PKCE.
 * @returns Base64URL-encoded random string
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Generates a code challenge from the code verifier using SHA-256.
 * @param verifier - The code verifier
 * @returns Base64URL-encoded SHA-256 hash
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Convert to base64URL after hashing
  return base64URLEncode(new Uint8Array(hashBuffer));
}

/**
 * Encodes a Uint8Array to Base64URL format.
 * @param buffer - The buffer to encode
 * @returns Base64URL-encoded string
 */
function base64URLEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Generates a random state parameter for CSRF protection.
 * @returns Random string
 */
function generateRandomState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}
