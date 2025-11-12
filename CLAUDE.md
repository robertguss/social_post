# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Social Posting Scheduler** is a self-hosted social media scheduling application for scheduling and publishing content to X/Twitter and LinkedIn. Built with Next.js, Convex, and Better Auth, it's designed as a single-user productivity tool to replace expensive subscription services.

## Development Commands

### Starting Development

```bash
pnpm run dev              # Runs both frontend and Convex backend in parallel
pnpm run dev:frontend     # Next.js dev server only
pnpm run dev:backend      # Convex dev server only
pnpm run predev           # Convex dev + dashboard (runs before dev)
```

### Build & Deploy

```bash
pnpm run build            # Build Next.js for production
pnpm run start            # Start production server
pnpm run lint             # Run ESLint
```

### Convex Commands

```bash
pnpm dlx convex dev           # Start Convex dev deployment
pnpm dlx convex dashboard     # Open Convex dashboard
pnpm dlx convex deploy        # Deploy Convex functions to production
pnpm dlx convex docs          # Open Convex documentation
```

## Architecture Overview

### Stack

- **Frontend**: Next.js 15.5.4 (App Router), React 19, Tailwind CSS 4
- **Backend**: Convex (database, queries, mutations, scheduled actions)
- **Auth**: Better Auth (single-user authentication)
- **UI Components**: shadcn/ui
- **Language**: TypeScript throughout

### Repository Structure

```console
social_post/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with Better Auth + Convex providers
│   ├── page.tsx            # Home page
│   ├── globals.css         # Tailwind CSS
│   └── (server)/           # Server-rendered routes
├── components/             # React components
│   ├── ui/                 # UI primitives (shadcn/ui)
│   ├── features/           # Feature-specific components
│   └── ConvexClientProvider.tsx
├── convex/                 # Backend logic (Convex)
│   ├── schema.ts           # Database schema
│   ├── auth.ts             # Better Auth integration config
│   ├── myFunctions.ts      # Example functions
│   └── _generated/         # Auto-generated Convex types
├── hooks/                  # Custom React/Convex hooks
├── middleware.ts           # Better Auth route protection
└── docs/                   # Architecture and PRD
```

### Critical Architectural Patterns

**Convex Backend Philosophy**: All backend logic lives in `convex/`. Convex provides:

- **Queries**: Read data reactively (realtime updates)
- **Mutations**: Write data transactionally
- **Actions**: Call external APIs (X, LinkedIn, Telegram) with Node.js runtime
- **Scheduled Functions**: Critical for timed post publishing

**Authentication Flow**:

- Better Auth handles auth on frontend via `middleware.ts`
- Convex functions use `ctx.auth.getUserIdentity()` to verify users
- All data must be scoped to `userId` to ensure single-user isolation
- **Single-User Mode**: Set `DISABLE_SIGNUPS=true` and `NEXT_PUBLIC_DISABLE_SIGNUPS=true` to prevent new user signups while keeping login functional for existing users

**Scheduled Publishing Architecture**:
The core feature is time-based post publishing:

```mermaid
User creates post → Convex mutation → ctx.scheduler.runAt(scheduledTime)
  → Convex Action publishes to X/LinkedIn → Update post status → On failure: Telegram notification
```

## Data Models

### posts

Stores scheduled and published content. Key fields:

- `userId`: string (Better Auth user ID)
- `status`: "draft" | "scheduled" | "publishing" | "published" | "failed"
- `twitterContent`, `linkedInContent`: string (platform-specific content)
- `twitterScheduledTime`, `linkedInScheduledTime`: number (timestamps)
- `url`: string (optional, for auto-commenting)
- `errorMessage`, `retryCount`: for error handling

**Index**: `by_user` on `["userId"]`

### user_connections

Stores encrypted OAuth tokens for external platforms. Key fields:

- `userId`: string
- `platform`: "twitter" | "linkedin"
- `accessToken`, `refreshToken`: string (must be encrypted)
- `expiresAt`: number (timestamp)

**Index**: `by_user_platform` on `["userId", "platform"]`

## Convex Function Patterns

### Function Registration

Always use the new function syntax with validators:

```typescript
import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";

export const myQuery = query({
  args: { userId: v.string() },
  returns: v.array(v.object({ ... })),
  handler: async (ctx, args) => {
    // Verify user auth
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Query with index
    return await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});
```

### Authentication in Convex Functions

**Always verify the user in queries and mutations:**

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");
const userId = identity.subject; // Use this for data access
```

### Scheduling Posts (Critical Pattern)

```typescript
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const schedulePost = mutation({
  args: {
    /* ... */
  },
  handler: async (ctx, args) => {
    const postId = await ctx.db.insert("posts", {
      /* ... */
    });

    // Schedule the publishing action
    await ctx.scheduler.runAt(
      args.scheduledTime,
      internal.publishing.publishPost,
      { postId },
    );
  },
});
```

### Calling External APIs (Actions Only)

```typescript
// Add "use node"; for Node.js APIs
"use node";

import { action } from "./_generated/server";

export const publishToTwitter = action({
  args: { postId: v.id("posts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Access environment variables for API keys
    const apiKey = process.env.TWITTER_API_KEY;

    // Call external API
    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        /* ... */
      }),
    });

    // Update post status via mutation
    await ctx.runMutation(internal.posts.updateStatus, {
      postId: args.postId,
      status: "published",
    });
  },
});
```

## Key Implementation Requirements

### Character Counting

- Twitter: 280 character limit (warn at 260, error at 280)
- LinkedIn: 3,000 character limit
- Implement on frontend with real-time validation

### URL Auto-Posting

- LinkedIn: Post URL as first comment after main post publishes
- Twitter: Post URL as reply in thread after main tweet publishes
- Both require chained API calls within Actions

### Error Handling & Retries

Critical for reliability:

1. Catch API errors in Actions
2. Implement auto-retry logic (2-3 attempts) with exponential backoff
3. Update post status to "failed" after max retries
4. Send Telegram notification on final failure
5. Store `errorMessage` in post document for UI display

### Security Requirements

- OAuth tokens in `user_connections` **must be encrypted** before storing
- Use Convex environment variables for API keys (never in code/repo)
- All Convex functions must verify user authentication
- Never return another user's data

### Single-User Mode Configuration

To restrict signups to a single user (useful for personal deployments):

**Environment Variables:**
- `DISABLE_SIGNUPS=true` - Disables the Better Auth signup API endpoint (backend)
- `NEXT_PUBLIC_DISABLE_SIGNUPS=true` - Hides signup UI and shows "Signups Closed" message (frontend)

**Implementation:**
- `convex/auth.ts:32` - Better Auth `disableSignUp` option controlled by `DISABLE_SIGNUPS`
- `app/(auth)/signup/page.tsx:21` - Checks `NEXT_PUBLIC_DISABLE_SIGNUPS` to show closed message
- `app/(auth)/login/page.tsx:21` - Conditionally hides signup link if signups disabled

**Usage:**
1. Deploy the application without these variables set
2. Create your user account
3. Add these environment variables to production to prevent additional signups
4. Existing users can continue to login normally

## Cursor Rules Reference

Convex-specific guidelines from `.cursor/rules/convex_rules.mdc`:

1. **Always use new function syntax** with `args` and `returns` validators
2. **Use `withIndex()` instead of `filter()`** for queries - define indexes in schema
3. **Function references**: Use `api.filename.functionName` (public) or `internal.filename.functionName` (private)
4. **Never use `filter()` in queries** - always define an index in schema and use `withIndex()`
5. **Actions need `"use node";`** if using Node.js built-in modules
6. **Use `v.id(tableName)` validator** for document IDs, not `v.string()`
7. **System fields**: All documents automatically have `_id` and `_creationTime`

## Testing Priorities

Based on architecture document:

1. **Unit Tests**: Character counting, timestamp conversion, validation logic
2. **Integration Tests**: Convex queries/mutations with auth, post creation flow
3. **Action Tests**: Mock external APIs (X, LinkedIn, Telegram), test retry logic

## External API Integration

### Required APIs

- **X/Twitter API**: OAuth 2.0, POST /2/tweets, threading for URL replies
- **LinkedIn API**: OAuth 2.0, POST /v2/ugcPosts, comments for URL posting
- **Telegram Bot API**: For failure notifications

### Rate Limiting

Handle rate limits gracefully in Actions with exponential backoff and retry logic.

## Path Alias

The project uses `@/*` for imports from the root directory (configured in `tsconfig.json`).

## Important Notes

- This is a **single-user application** - all data must be scoped to the authenticated user's `userId`
- **Scheduled functions are the core feature** - publishing must happen reliably at scheduled times
- **Mobile-responsive design is required** - the user will schedule posts from mobile
- The workflow is optimized for **batch content creation**: user writes Twitter version first (280 char limit), then expands for LinkedIn
- **Staggered posting times** are important - user schedules different times for each platform
- Keep UI **simple and fast** - this is a productivity tool, not a feature-rich product
