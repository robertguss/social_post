# Twitter OAuth 2.0 Configuration Checklist

## Current Configuration

- **Client ID**: `eUZsRlBPbDZYZ2ZrU0x3WWtwZWU6MTpjaQ`
- **Redirect URI**: `http://localhost:3000/api/auth/twitter/callback`
- **Scopes**: `tweet.read`, `tweet.write`, `users.read`, `offline.access`

## Steps to Fix 400 Error

### 1. Twitter Developer Portal Settings

Visit: <https://developer.twitter.com/en/portal/dashboard>

#### A. User Authentication Settings

- [ ] Click on your app → "Settings" → "User authentication settings"
- [ ] Verify **OAuth 2.0** is enabled
- [ ] App permissions: **Read and write** (minimum)
- [ ] Type of App: **Web App, Automated App or Bot**

#### B. Callback URI Configuration

- [ ] In "User authentication settings" → "Callback URI / Redirect URL"
- [ ] Add: `http://localhost:3000/api/auth/twitter/callback`
- [ ] **IMPORTANT**: Must match exactly (no trailing slash)

#### C. App Keys

- [ ] Navigate to "Keys and tokens"
- [ ] Verify your Client ID matches: `eUZsRlBPbDZYZ2ZrU0x3WWtwZWU6MTpjaQ`
- [ ] If regenerated, update `.env.local` with new credentials

### 2. App Access Level

- [ ] Ensure app has "Elevated" access (Free tier requires manual approval)
- [ ] Check app status is "Active" (not Suspended)

### 3. OAuth 2.0 Settings

- [ ] Confirm "Type of App" is set correctly
- [ ] Verify "Confidential client" is checked (since you're using client_secret)
- [ ] Ensure all required scopes are granted to the app

### 4. Website URL (Required)

- [ ] In app settings, add a website URL (can be `http://localhost:3000` for dev)

## Testing the Configuration

### 1. Test OAuth URL Directly

Open this URL in a browser (replace with your client ID):

```
https://twitter.com/i/oauth2/authorize?response_type=code&client_id=eUZsRlBPbDZYZ2ZrU0x3WWtwZWU6MTpjaQ&redirect_uri=http://localhost:3000/api/auth/twitter/callback&scope=tweet.read%20tweet.write%20users.read%20offline.access&state=test&code_challenge=test&code_challenge_method=S256
```

Expected behavior:

- ✅ Should show Twitter OAuth consent screen
- ❌ If you see 400 error → Configuration issue in Developer Portal

### 2. Check for Common Mistakes

#### Redirect URI Mismatches

- ❌ `http://localhost:3000/api/auth/twitter/callback/` (trailing slash)
- ❌ `https://localhost:3000/api/auth/twitter/callback` (https instead of http)
- ❌ `http://127.0.0.1:3000/api/auth/twitter/callback` (IP instead of localhost)
- ✅ `http://localhost:3000/api/auth/twitter/callback`

#### OAuth Version

- ❌ Only OAuth 1.0a enabled
- ✅ OAuth 2.0 enabled

## Troubleshooting Steps

1. **Regenerate Credentials** (if you suspect they're invalid):
   - Go to "Keys and tokens" → Regenerate OAuth 2.0 Client ID and Client Secret
   - Update `.env.local` with new values
   - Restart your dev server

2. **Check Twitter API Status**:
   - Visit: <https://api.twitterstat.us/>

3. **Review Recent Changes**:
   - Twitter may have suspended or modified your app permissions
   - Check email for notifications from Twitter Developer

4. **Enable Elevated Access** (if not already):
   - Free tier requires Elevated access for OAuth 2.0
   - Apply here: <https://developer.twitter.com/en/portal/products/elevated>

## Production Configuration

When deploying to production, remember to:

- [ ] Add production redirect URI to Twitter app (e.g., `https://yourdomain.com/api/auth/twitter/callback`)
- [ ] Update `.env.production` with production credentials
- [ ] Test OAuth flow in production environment

## Additional Resources

- [Twitter OAuth 2.0 Documentation](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
- [Twitter API Rate Limits](https://developer.twitter.com/en/docs/twitter-api/rate-limits)
