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

    const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
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
   * Renders the connection status badge with appropriate styling.
   */
  const renderConnectionStatus = () => {
    if (!twitterStatus) {
      return <Badge variant="outline">Loading...</Badge>;
    }

    if (!twitterStatus.connected) {
      return <Badge variant="outline">Not Connected</Badge>;
    }

    if (twitterStatus.needsReauth) {
      return <Badge variant="destructive">Needs Re-authentication</Badge>;
    }

    // Format expiration date
    const expiresDate = twitterStatus.expiresAt
      ? new Date(twitterStatus.expiresAt).toLocaleDateString()
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
   * Determines whether to show the "Connect X/Twitter" button.
   */
  const showConnectButton =
    !twitterStatus?.connected || twitterStatus?.needsReauth;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          {/* Twitter/X Icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black dark:bg-white">
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
          {renderConnectionStatus()}
          {showConnectButton && (
            <Button onClick={handleConnectTwitter} variant="default">
              {twitterStatus?.needsReauth ? "Re-connect" : "Connect X/Twitter"}
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
