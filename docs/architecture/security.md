# Security

## Authentication & Authorization

- **Provider:** Clerk.
- **Client Authorization:** Clerk's middleware (`middleware.ts`) protects core application routes.
- **Convex Authorization:** All critical Queries and Mutations must use `ctx.auth.getUserIdentity()` to verify the user is authenticated and that they are only accessing their own data (i.e., verifying `userId` against the document's `clerkUserId`).

## Secure Secrets Management

- **Sensitive Data:** **X, LinkedIn, and Telegram API credentials** must be treated as production secrets.
- **Storage:** The OAuth tokens (`accessToken`, `refreshToken`) stored in the `user_connections` table **must be encrypted** at the application level before being saved to Convex.
- **Access:** Only **Convex Actions** are permitted to access the sensitive environment variables (API keys, encryption keys) required for publishing and notification.

---
