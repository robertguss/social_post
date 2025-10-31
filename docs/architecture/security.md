# Security

## Authentication & Authorization

- **Provider:** Clerk.
- **Client Authorization:** Clerk's middleware (`middleware.ts`) protects core application routes.
- **Convex Authorization:** All critical Queries and Mutations must use `ctx.auth.getUserIdentity()` to verify the user is authenticated and that they are only accessing their own data (i.e., verifying `userId` against the document's `clerkUserId`).

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

---
