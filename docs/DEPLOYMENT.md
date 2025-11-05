# Deployment and Operations Guide

Complete guide for deploying and operating the Social Posting Scheduler in production.

## Table of Contents

- [Production Architecture](#production-architecture)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Deploying Convex Backend](#deploying-convex-backend)
- [Deploying Next.js Frontend](#deploying-nextjs-frontend)
- [OAuth Configuration](#oauth-configuration)
- [Environment Variables](#environment-variables)
- [Domain and DNS Setup](#domain-and-dns-setup)
- [Monitoring and Logging](#monitoring-and-logging)
- [Backup and Recovery](#backup-and-recovery)
- [Security Hardening](#security-hardening)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

---

## Production Architecture

### Infrastructure Overview

```
┌──────────────────────────────────────────────────────────┐
│                         Users                             │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
           ┌─────────────────┐
           │   Vercel CDN    │
           │   (Frontend)    │
           └────────┬────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐        ┌──────────────┐
│ Clerk Auth   │        │ Convex Cloud │
│  Service     │        │   (Backend)  │
└──────────────┘        └──────┬───────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
            ┌──────────────┐      ┌──────────────┐
            │ External APIs│      │ Telegram Bot │
            │ (X/LinkedIn) │      │     API      │
            └──────────────┘      └──────────────┘
```

### Service Providers

| Service | Provider | Purpose |
|---------|----------|---------|
| **Frontend Hosting** | Vercel | Next.js deployment, CDN, SSL |
| **Backend & Database** | Convex | Serverless functions, realtime DB |
| **Authentication** | Clerk | User auth, JWT management |
| **Domain & DNS** | Cloudflare/Route53 | DNS management |
| **Monitoring** | Sentry/LogRocket | Error tracking, performance |
| **Uptime Monitoring** | BetterUptime/UptimeRobot | Health checks |

---

## Pre-Deployment Checklist

### Code Readiness

- [ ] All tests passing (`pnpm run test`)
- [ ] No linting errors (`pnpm run lint`)
- [ ] Production build successful (`pnpm run build`)
- [ ] Environment variables documented
- [ ] Security audit completed
- [ ] Performance benchmarks met

### Infrastructure Setup

- [ ] Vercel account created
- [ ] Convex production deployment created
- [ ] Clerk production instance configured
- [ ] Domain purchased and DNS configured
- [ ] SSL certificate obtained (automatic with Vercel)
- [ ] Monitoring tools configured

### OAuth Applications

- [ ] X/Twitter app approved for production
- [ ] LinkedIn app approved for production
- [ ] Production callback URLs configured
- [ ] API rate limits understood
- [ ] Terms of Service compliance verified

### Security

- [ ] Encryption key generated (32 bytes)
- [ ] All secrets in environment variables
- [ ] No hardcoded credentials in code
- [ ] CORS configuration reviewed
- [ ] Rate limiting configured
- [ ] Security headers configured

---

## Deploying Convex Backend

### Step 1: Create Production Deployment

```bash
# Deploy to Convex production
pnpm dlx convex deploy --prod

# Follow prompts:
# - Select your Convex project
# - Confirm production deployment
# - Wait for deployment to complete
```

**Output:**
```
✓ Deployed functions to production
✓ Deployment URL: https://your-project.convex.cloud
```

### Step 2: Configure Production Environment Variables

1. Open Convex Dashboard
2. Navigate to **Production** → **Settings** → **Environment Variables**
3. Add the following variables:

```bash
# Clerk JWT Verification
CLERK_JWT_ISSUER_DOMAIN=https://your-prod-clerk-domain.clerk.accounts.dev

# X/Twitter OAuth (Production)
TWITTER_CLIENT_ID=your_production_twitter_client_id
TWITTER_CLIENT_SECRET=your_production_twitter_client_secret

# LinkedIn OAuth (Production)
LINKEDIN_CLIENT_ID=your_production_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_production_linkedin_client_secret

# Encryption (32-byte key, base64 encoded)
ENCRYPTION_KEY=your_base64_encoded_32_byte_key

# Telegram Notifications
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Gemini AI (for AI-assisted content generation)
GEMINI_API_KEY=your_gemini_api_key
```

### Step 3: Verify Deployment

```bash
# Test a function via Convex CLI
pnpm dlx convex run posts:getPosts --prod

# Or test via Convex Dashboard
# Production → Functions → Run Function
```

### Step 4: Database Migration

If you have existing data:

```bash
# Export data from dev
pnpm dlx convex export --dev > data.jsonl

# Import to production
pnpm dlx convex import data.jsonl --prod
```

For encrypted tokens migration:

```typescript
// In Convex Dashboard console (Production)
await ctx.runAction(internal.encryption.migrateTokensToEncrypted, {
  dryRun: true  // Test first
});

// If successful, run actual migration
await ctx.runAction(internal.encryption.migrateTokensToEncrypted, {
  dryRun: false
});
```

---

## Deploying Next.js Frontend

### Step 1: Install Vercel CLI

```bash
pnpm i -g vercel
```

### Step 2: Link Project to Vercel

```bash
# Initialize Vercel project
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set up project settings
# - Configure build settings
```

### Step 3: Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Convex Production URL
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Base URL (your production domain)
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

**Important:** Set environment variables for **Production** environment.

### Step 4: Deploy to Production

```bash
# Deploy to production
vercel --prod

# Or push to main branch (auto-deploy)
git push origin main
```

**Output:**
```
✓ Deployed to production
   https://yourdomain.vercel.app
```

### Step 5: Custom Domain Setup

1. In Vercel Dashboard → Project → Settings → **Domains**
2. Add your custom domain: `yourdomain.com`
3. Follow DNS configuration instructions
4. Wait for SSL certificate provisioning (~5 minutes)

---

## OAuth Configuration

### X/Twitter Production Setup

1. **Developer Portal**
   - Go to [developer.twitter.com/portal](https://developer.twitter.com/en/portal/dashboard)
   - Select your app
   - Navigate to **Settings** → **User authentication settings**

2. **Update Callback URL**
   ```
   https://yourdomain.com/api/auth/twitter/callback
   ```

3. **Update Website URL**
   ```
   https://yourdomain.com
   ```

4. **Scopes** (verify enabled):
   - `tweet.read`
   - `tweet.write`
   - `users.read`
   - `offline.access`

5. **Save Changes**

### LinkedIn Production Setup

1. **Developer Portal**
   - Go to [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps)
   - Select your app
   - Navigate to **Auth** tab

2. **Update Redirect URLs**
   ```
   https://yourdomain.com/api/auth/linkedin/callback
   ```

3. **Verify Products**
   - Ensure "Sign In with LinkedIn using OpenID Connect" is approved
   - Ensure "Share on LinkedIn" is approved

4. **Scopes** (verify enabled):
   - `openid`
   - `profile`
   - `w_member_social`

5. **Save Changes**

### Testing OAuth Flows

```bash
# Test Twitter OAuth
# Visit: https://yourdomain.com/settings
# Click "Connect Twitter"
# Verify redirect and token storage

# Test LinkedIn OAuth
# Visit: https://yourdomain.com/settings
# Click "Connect LinkedIn"
# Verify redirect and token storage
```

---

## Environment Variables

### Complete Environment Variable List

#### Vercel (Next.js)

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxx
CLERK_SECRET_KEY=sk_live_xxxxxx

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Base URL
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

#### Convex (Backend)

```bash
# Clerk
CLERK_JWT_ISSUER_DOMAIN=https://your-clerk-domain.clerk.accounts.dev

# X/Twitter OAuth
TWITTER_CLIENT_ID=xxxxxx
TWITTER_CLIENT_SECRET=xxxxxx

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=xxxxxx
LINKEDIN_CLIENT_SECRET=xxxxxx

# Encryption (32-byte key, base64-encoded)
ENCRYPTION_KEY=xxxxxx

# Telegram (optional)
TELEGRAM_BOT_TOKEN=xxxxxx
TELEGRAM_CHAT_ID=xxxxxx

# Gemini AI (for AI-assisted content generation)
# Obtain from: https://aistudio.google.com/
GEMINI_API_KEY=xxxxxx
```

### Generating Secrets

**Encryption Key:**
```bash
openssl rand -base64 32
```

**Telegram Bot:**
```bash
# 1. Message @BotFather on Telegram
# 2. Send /newbot
# 3. Follow prompts to create bot
# 4. Copy bot token

# 5. Get your chat ID
# Message your bot, then visit:
https://api.telegram.org/bot<TOKEN>/getUpdates
# Copy "chat.id" from response
```

---

## Domain and DNS Setup

### DNS Configuration

**Option 1: Vercel DNS (Recommended)**

1. Transfer nameservers to Vercel
2. Vercel manages all DNS records
3. Automatic SSL certificate

**Option 2: External DNS (Cloudflare, Route53)**

Add these DNS records:

| Type | Name | Value |
|------|------|-------|
| A | @ | 76.76.21.21 |
| CNAME | www | cname.vercel-dns.com |
| TXT | @ | Vercel verification code |

### SSL Certificate

**Automatic (Vercel):**
- SSL certificate auto-provisioned
- Auto-renewal
- No manual configuration needed

**Custom Certificate:**
- Vercel Pro plan required
- Upload certificate in Domain Settings

---

## Monitoring and Logging

### Error Tracking (Sentry)

**Setup:**

```bash
# Install Sentry
pnpm add @sentry/nextjs

# Initialize
pnpm dlx @sentry/wizard@latest -i nextjs
```

**Configuration:**

```javascript
// sentry.client.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

### Logging Strategy

**Convex Functions:**
```typescript
export const myFunction = action({
  handler: async (ctx, args) => {
    console.log("[INFO] Function started", { args });

    try {
      const result = await operation();
      console.log("[INFO] Operation successful", { result });
      return result;
    } catch (error) {
      console.error("[ERROR] Operation failed", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  },
});
```

**View Logs:**
- Convex Dashboard → Logs
- Filter by level, time, function
- Export logs for analysis

### Uptime Monitoring

**BetterUptime Setup:**

1. Add HTTP monitor for `https://yourdomain.com`
2. Set check interval: 1 minute
3. Configure alerts: Email, Slack, SMS
4. Set up status page

**Health Check Endpoint:**

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
```

Monitor: `https://yourdomain.com/api/health`

### Performance Monitoring

**Vercel Analytics:**
- Automatic with Vercel deployment
- View in Vercel Dashboard → Analytics
- Tracks Core Web Vitals, page loads

**Custom Metrics:**
```typescript
import { track } from "@vercel/analytics";

export function PostScheduler() {
  const handleSubmit = async () => {
    const start = performance.now();

    await createPost({ /* ... */ });

    const duration = performance.now() - start;
    track("post_scheduled", { duration });
  };
}
```

---

## Backup and Recovery

### Database Backups

**Automated Backups (Convex):**
- Convex automatically backs up data
- Point-in-time recovery available
- Contact Convex support for restoration

**Manual Export:**
```bash
# Export production data
pnpm dlx convex export --prod > backup-$(date +%Y%m%d).jsonl

# Store in secure location (S3, Google Cloud Storage)
```

**Scheduled Backups:**

```bash
# crontab -e
0 2 * * * cd /path/to/project && pnpm dlx convex export --prod > backups/backup-$(date +\%Y\%m\%d).jsonl
```

### Disaster Recovery Plan

1. **Data Loss**
   - Restore from most recent backup
   - Import using `convex import`
   - Verify data integrity

2. **Convex Outage**
   - Check [Convex Status](https://status.convex.dev/)
   - Wait for service restoration
   - Monitor scheduled functions

3. **Vercel Outage**
   - Check [Vercel Status](https://www.vercel-status.com/)
   - Deploy to backup provider if extended
   - Update DNS records

4. **OAuth Provider Outage**
   - Users cannot connect accounts
   - Existing connections continue working
   - Monitor provider status pages

---

## Security Hardening

### Security Headers

**next.config.ts:**

```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};
```

### Rate Limiting

**Convex Rate Limiting:**

```typescript
// convex/rateLimiting.ts
const RATE_LIMIT = 100; // requests per minute
const rateLimit = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimit.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimit.set(userId, {
      count: 1,
      resetAt: now + 60000, // 1 minute
    });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    throw new Error("Rate limit exceeded");
  }

  userLimit.count++;
  return true;
}
```

### Security Audit

**Quarterly Checklist:**
- [ ] Review OAuth scopes and permissions
- [ ] Rotate encryption keys
- [ ] Audit user access logs
- [ ] Update dependencies (`pnpm update`)
- [ ] Review Clerk security settings
- [ ] Check for exposed secrets (gitleaks, trufflehog)
- [ ] Review CORS configuration
- [ ] Verify HTTPS everywhere

---

## Performance Optimization

### Database Optimization

**Index Usage:**
```typescript
// Always use indexes for queries
const posts = await ctx.db
  .query("posts")
  .withIndex("by_user", (q) => q.eq("clerkUserId", userId))
  .collect();
```

**Query Limits:**
```typescript
// Paginate large result sets
const posts = await ctx.db
  .query("posts")
  .withIndex("by_user", (q) => q.eq("clerkUserId", userId))
  .order("desc")
  .take(20);  // Limit to 20 results
```

### Frontend Optimization

**Code Splitting:**
```typescript
import dynamic from 'next/dynamic';

const PostScheduler = dynamic(() => import('@/components/features/PostScheduler'), {
  loading: () => <div>Loading...</div>,
});
```

**Image Optimization:**
```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority  // For above-the-fold images
/>
```

**Bundle Analysis:**
```bash
# Analyze bundle size
ANALYZE=true pnpm run build
```

### Caching Strategy

**Convex Queries:**
- Queries automatically cached by Convex client
- Cache invalidated on data changes
- No manual cache management needed

**Next.js Caching:**
```typescript
// Static generation
export const revalidate = 3600; // Revalidate every hour

export default async function Page() {
  // Page content
}
```

---

## Troubleshooting

### Common Production Issues

**Posts Not Publishing:**

1. **Check Convex Logs**
   ```
   Convex Dashboard → Production → Logs
   Filter by function: publishTwitterPost or publishLinkedInPost
   ```

2. **Verify OAuth Tokens**
   ```typescript
   // In Convex console
   const connections = await ctx.db.query("user_connections").collect();
   console.log(connections.map(c => ({
     platform: c.platform,
     expiresAt: new Date(c.expiresAt).toISOString(),
   })));
   ```

3. **Check Scheduled Functions**
   ```
   Convex Dashboard → Production → Scheduled Functions
   Verify functions are scheduled
   ```

**OAuth Connection Failures:**

1. **Verify Callback URLs**
   - Exact match required (no trailing slashes)
   - HTTPS in production

2. **Check Environment Variables**
   ```bash
   # Verify in Convex Dashboard
   TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET
   LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
   ```

3. **Review OAuth App Status**
   - Check if app is approved for production
   - Verify scopes/permissions

**Deployment Failures:**

```bash
# Convex deployment error
pnpm dlx convex deploy --prod --verbose

# Vercel deployment error
vercel --prod --debug

# Check build logs in dashboard
```

### Performance Issues

**Slow Queries:**
```typescript
// Add timing logs
const start = Date.now();
const posts = await ctx.db.query("posts").collect();
console.log(`Query took ${Date.now() - start}ms`);
```

**High Memory Usage:**
- Check for memory leaks in Convex functions
- Limit query result sizes
- Use pagination for large datasets

### Emergency Procedures

**Rollback Deployment:**

```bash
# Rollback Convex
pnpm dlx convex deploy --prod --restore-previous

# Rollback Vercel
vercel rollback <deployment-url>
```

**Disable Scheduled Publishing:**

```bash
# Cancel all scheduled functions
# Via Convex Dashboard → Scheduled Functions → Cancel All
```

---

## Maintenance

### Regular Tasks

**Weekly:**
- Review error logs
- Check failed posts
- Verify OAuth connections
- Review performance metrics

**Monthly:**
- Database cleanup (old posts)
- Security updates
- Dependency updates
- Backup verification

**Quarterly:**
- Security audit
- Performance review
- Infrastructure cost review
- Disaster recovery test

### Database Maintenance

**Delete Old Posts:**

```typescript
export const cleanupOldPosts = internalMutation({
  handler: async (ctx) => {
    const cutoffDate = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 days

    const oldPosts = await ctx.db
      .query("posts")
      .filter((q) => q.lt(q.field("_creationTime"), cutoffDate))
      .collect();

    for (const post of oldPosts) {
      await ctx.db.delete(post._id);
    }

    return { deleted: oldPosts.length };
  },
});
```

Schedule via cron (Convex doesn't support cron yet, use external scheduler).

---

## Cost Optimization

### Convex Pricing

- **Free Tier**: 1M function calls/month, 1GB storage
- **Pro**: $25/month for more usage
- Monitor usage in Dashboard → Billing

### Vercel Pricing

- **Hobby**: Free for personal projects
- **Pro**: $20/month for production apps
- Monitor bandwidth in Dashboard → Usage

### Optimization Tips

1. **Reduce Function Calls**
   - Batch operations where possible
   - Use client-side caching
   - Optimize query patterns

2. **Reduce Database Queries**
   - Use indexes effectively
   - Avoid filter() when possible
   - Limit result sets

3. **Optimize Images**
   - Use Next.js Image component
   - Compress images
   - Use CDN caching

---

## Support and Resources

- **Convex Support**: [Convex Discord](https://convex.dev/community)
- **Vercel Support**: [Vercel Support](https://vercel.com/support)
- **Clerk Support**: [Clerk Docs](https://clerk.com/docs)
- **Project Issues**: [GitHub Issues](https://github.com/yourusername/social_post/issues)

---

**Deployment complete! Your Social Posting Scheduler is now live.**
