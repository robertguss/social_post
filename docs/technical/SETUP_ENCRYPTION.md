# Setting Up Encryption for OAuth Tokens

## Overview

Your OAuth tokens need to be encrypted before being stored in the database. The encryption system uses AES-256-GCM encryption, which requires a 32-byte base64-encoded encryption key.

## Step 1: Your Encryption Key

I've generated a secure encryption key for you:

```
etLK6SlRbfUlQpSzcsa2u+0juNWW0qHFZSHkMwrFe+Y=
```

**IMPORTANT: Treat this key like a password!**

- Never commit it to version control
- Never share it publicly
- Store it securely (password manager, secure notes, etc.)
- If you lose this key, you won't be able to decrypt existing tokens

## Step 2: Add to Convex Environment Variables

### Option A: Via Convex Dashboard (Recommended)

1. Open your Convex Dashboard:

   ```bash
   npx convex dashboard
   ```

   Or visit: <https://dashboard.convex.dev/d/deafening-gazelle-331>

2. Navigate to "Settings" → "Environment Variables"

3. Click "Add Environment Variable"

4. Add the following:
   - **Name**: `ENCRYPTION_KEY`
   - **Value**: `etLK6SlRbfUlQpSzcsa2u+0juNWW0qHFZSHkMwrFe+Y=`

5. Click "Save"

### Option B: Via Convex CLI

Run this command in your terminal:

```bash
npx convex env set ENCRYPTION_KEY "etLK6SlRbfUlQpSzcsa2u+0juNWW0qHFZSHkMwrFe+Y="
```

## Step 3: Verify Configuration

After adding the environment variable:

1. Your Convex functions will automatically reload
2. The encryption key will be available to your Actions
3. You should see confirmation in the terminal

## Step 4: Test OAuth Flow

1. Go to your app: <http://localhost:3000/settings>
2. Click "Connect X/Twitter"
3. Authorize the app
4. You should be redirected back with "Twitter connected successfully"

## How Encryption Works

Your implementation uses:

- **Algorithm**: AES-256-GCM
- **Key Size**: 32 bytes (256 bits)
- **IV**: 12 bytes (randomly generated per encryption)
- **Auth Tag**: 16 bytes (for authenticated encryption)

Each encrypted token is stored as:

```
[IV (12 bytes)][Auth Tag (16 bytes)][Ciphertext]
```

All base64-encoded as a single string.

## Security Best Practices

✅ **DO**:

- Store the encryption key in Convex environment variables only
- Use different keys for dev/staging/production environments
- Rotate the key periodically (requires re-encrypting all tokens)
- Back up the key securely

❌ **DON'T**:

- Commit the key to git
- Store the key in .env.local (that's for Next.js, not Convex)
- Share the key in Slack/email/etc.
- Use the same key across multiple projects

## Troubleshooting

### Error: "ENCRYPTION_KEY not configured"

- Make sure you added the key to Convex (not .env.local)
- Verify the environment variable name is exactly `ENCRYPTION_KEY`
- Check the Convex dashboard to confirm the variable exists

### Error: "Invalid encryption key length"

- The key must be exactly 32 bytes when decoded from base64
- Use the key generated above - don't modify it
- Don't add/remove any characters from the key

### Need to Generate a New Key?

Run this command:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## For Production Deployment

When deploying to production:

1. Generate a **different** encryption key for production:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. Add it to your production Convex deployment:

   ```bash
   npx convex env set ENCRYPTION_KEY "YOUR_PRODUCTION_KEY" --prod
   ```

3. Never use development keys in production!
