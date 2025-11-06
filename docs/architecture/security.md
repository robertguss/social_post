# Security

## Authentication & Authorization

- **Provider:** Better Auth.
- **Client Authorization:** Better Auth's middleware (`middleware.ts`) protects core application routes.
- **Convex Authorization:** All critical Queries and Mutations must use `ctx.auth.getUserIdentity()` to verify the user is authenticated and that they are only accessing their own data (i.e., verifying `userId` against the document's `userId`).

## Secure Secrets Management

- **Sensitive Data:** **X, LinkedIn, and Telegram API credentials** must be treated as production secrets.
- **Storage:** The OAuth tokens (`accessToken`, `refreshToken`) stored in the `user_connections` table **must be encrypted** at the application level before being saved to Convex.
- **Access:** Only **Convex Actions** are permitted to access the sensitive environment variables (API keys, encryption keys) required for publishing and notification.

## Encryption Key Management

### Encryption Algorithm

- **Algorithm:** AES-256-GCM (Galois/Counter Mode)
- **Key Size:** 256 bits (32 bytes)
- **Key Format:** Base64-encoded string stored in Convex Environment Variables
- **IV (Initialization Vector):** Randomly generated for each encryption operation and prepended to ciphertext

### Key Generation

Generate a new encryption key using Node.js crypto:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Store the key in Convex Environment Variables as `ENCRYPTION_KEY` via the Convex Dashboard.

### Key Rotation Procedure

**When to rotate:**
- Suspected key compromise
- Quarterly security maintenance (recommended)
- Before production deployment if dev key was used

**Rotation steps:**
1. Generate a new encryption key using the command above
2. Add the new key as `ENCRYPTION_KEY_NEW` in Convex Environment Variables
3. Deploy a migration action that:
   - Decrypts all tokens using `ENCRYPTION_KEY`
   - Re-encrypts all tokens using `ENCRYPTION_KEY_NEW`
   - Updates all `user_connections` records
4. After successful migration, replace `ENCRYPTION_KEY` with the new key
5. Remove `ENCRYPTION_KEY_NEW` from environment variables
6. Verify all OAuth connections still work

**IMPORTANT:** Always test key rotation in a development environment before production.

## Platform-Specific Token Management

### Twitter (X) OAuth Tokens

- **Access Token Expiration:** 2 hours (7,200 seconds)
- **Refresh Token Expiration:** 6 months
- **Encryption:** All tokens encrypted using AES-256-GCM before storage
- **Storage:** Stored in `user_connections` table with `platform: "twitter"`
- **Refresh:** Automatic refresh required every 2 hours for active usage

### LinkedIn OAuth Tokens

- **Access Token Expiration:** 60 days (5,184,000 seconds)
- **Refresh Token Expiration:** 365 days (31,536,000 seconds)
- **Encryption:** Uses the **same encryption infrastructure** as Twitter tokens (AES-256-GCM)
- **Storage:** Stored in `user_connections` table with `platform: "linkedin"`
- **Refresh:** Less frequent refresh required (60-day expiration)
- **Refresh Endpoint:** `https://www.linkedin.com/oauth/v2/accessToken`

### Token Refresh Procedure

**LinkedIn Token Refresh (`refreshLinkedInToken` action):**

1. Retrieve encrypted connection from database for the user
2. Decrypt the refresh token using `internal.encryption.decrypt`
3. Call LinkedIn's token refresh API with:
   - `grant_type: "refresh_token"`
   - `refresh_token`: Decrypted refresh token
   - `client_id`: LinkedIn Client ID (from environment)
   - `client_secret`: LinkedIn Client Secret (from environment)
4. Parse response to extract new `access_token`, `refresh_token`, and `expires_in`
5. Encrypt both new tokens using `internal.encryption.encrypt`
6. Store encrypted tokens in database via `saveConnectionInternal` mutation
7. Calculate new `expiresAt` timestamp (current time + `expires_in` * 1000)

**Error Handling:**
- **400/401 errors:** Indicates expired refresh token - requires user re-authentication
- **5xx/429 errors:** Retry with exponential backoff (1s, 2s, 4s delays, max 3 attempts)
- **Timeout:** 10-second timeout per attempt using AbortController
- **Missing tokens:** Validation fails if `access_token` or `refresh_token` missing from response

**When to Refresh:**
- LinkedIn tokens should be refreshed when `expiresAt` timestamp is approaching (recommended: 7 days before expiration)
- Failed refresh with `needsReauth: true` requires user to re-authenticate via OAuth flow
- Proactive refresh (optional): Scheduled cron job to check and refresh tokens before expiration

### Encryption Infrastructure

**Platform-Agnostic Design:**
- The encryption utilities (`convex/encryption.ts`) are platform-agnostic
- `encrypt` and `decrypt` functions work with any string input
- `saveConnection` action automatically encrypts tokens for **any platform** before storage
- `getDecryptedConnection` action decrypts tokens for **any platform** on retrieval
- No platform-specific logic exists in the encryption layer

**Security Guarantees:**
- All OAuth tokens (Twitter, LinkedIn) are encrypted at rest in the database
- Decryption is only available to internal Convex Actions
- Tokens are never logged or exposed in plaintext
- Same 256-bit encryption key (`ENCRYPTION_KEY`) used for all platforms

---
