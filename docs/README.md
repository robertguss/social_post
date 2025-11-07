# Social Post Scheduler Documentation

Complete documentation for the Social Post Scheduler - a self-hosted social media scheduling application for X/Twitter and LinkedIn.

## 📚 Documentation Index

### Getting Started

- **[Quick Start Guide](#quick-start)** - Get up and running in 5 minutes
- **[User Guide](./USER_GUIDE.md)** - Complete guide for end users
- **[Developer Guide](./DEVELOPER_GUIDE.md)** - For developers working on the codebase

### Technical Documentation

- **[API Reference](./API_REFERENCE.md)** - Complete Convex backend API documentation
- **[Architecture Overview](./architecture.md)** - System design and technical decisions
- **[Architecture Diagrams](./ARCHITECTURE_DIAGRAMS.md)** - Visual system architecture and flows
- **[Database Schema](#database-schema)** - Data models and relationships

### Deployment & Operations

- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment instructions
- **[Environment Variables](#environment-variables-reference)** - Complete environment configuration
- **[OAuth Setup](#oauth-configuration)** - Twitter and LinkedIn integration

### Feature Documentation

- **[AI Assistant](./setup/gemini-setup.md)** - Gemini-powered content generation
- **[Recurring Queues](./features/performance-tracking.md)** - Automated content recycling
- **[Performance Tracking](./features/performance-tracking.md)** - Post analytics (future feature)

### Development

- **[Testing Guide](./testing/)** - Unit, integration, and E2E tests
- **[Contributing Guidelines](#contributing)** - How to contribute to the project
- **[PRD](./prd.md)** - Original product requirements

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Convex account ([convex.dev](https://convex.dev))

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/social_post.git
cd social_post

# Install dependencies
pnpm install

# Initialize Convex
pnpm dlx convex dev

# Start development servers
pnpm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### First-Time Setup

1. **Create Account** - Sign up using Better Auth
2. **Connect Platforms** - Link Twitter and LinkedIn in Settings
3. **Schedule Post** - Go to Schedule page and create your first post
4. **View History** - Check Post History to see scheduled posts

For detailed setup instructions, see the [Developer Guide](./DEVELOPER_GUIDE.md).

---

## Project Overview

### What is Social Post Scheduler?

A self-hosted application for scheduling and publishing content to X/Twitter and LinkedIn. Built as a single-user productivity tool to replace expensive subscription services like Buffer or Hootsuite.

### Key Features

✅ **Multi-Platform Posting**

- Schedule posts to Twitter (280 char limit)
- Schedule posts to LinkedIn (3,000 char limit)
- Stagger posting times across platforms

✅ **Smart Publishing**

- Auto-post URLs as replies (Twitter) or comments (LinkedIn)
- Exponential backoff retry logic
- Error notifications via Telegram

✅ **AI-Powered Content**

- Tone adjustment (professional, casual, engaging, formal)
- Twitter-to-LinkedIn expansion
- Hashtag generation
- Rate limiting and cost tracking

✅ **Content Management**

- Reusable templates with tags
- Clone past posts
- Edit/delete scheduled posts
- Recurring post queues

✅ **Analytics Dashboard**

- Post statistics
- Platform connections status
- Recent activity feed
- Performance insights (coming soon)

✅ **Security**

- AES-256-GCM token encryption
- Better Auth authentication
- User-scoped data isolation

### Technology Stack

| Layer              | Technology                               |
| ------------------ | ---------------------------------------- |
| **Frontend**       | Next.js 15.5.4, React 19, Tailwind CSS 4 |
| **UI Components**  | shadcn/ui                                |
| **Backend**        | Convex (database + serverless functions) |
| **Authentication** | Better Auth                              |
| **AI**             | Google Gemini 2.5 Flash                  |
| **Language**       | TypeScript 5                             |
| **Testing**        | Jest, Vitest, Testing Library            |

---

## Database Schema

### Core Tables

#### `posts`

Stores scheduled and published content.

| Field                   | Type      | Description                                                       |
| ----------------------- | --------- | ----------------------------------------------------------------- |
| `userId`                | `string`  | User ID (Better Auth)                                             |
| `status`                | `string`  | "draft" \| "Scheduled" \| "Publishing" \| "Published" \| "Failed" |
| `twitterContent`        | `string?` | Twitter post content (max 280 chars)                              |
| `linkedInContent`       | `string?` | LinkedIn post content (max 3,000 chars)                           |
| `twitterScheduledTime`  | `number?` | UTC timestamp for Twitter post                                    |
| `linkedInScheduledTime` | `number?` | UTC timestamp for LinkedIn post                                   |
| `url`                   | `string?` | URL to post as reply/comment                                      |
| `twitterSchedulerId`    | `Id?`     | Scheduled function ID for cancellation                            |
| `linkedInSchedulerId`   | `Id?`     | Scheduled function ID for cancellation                            |
| `twitterPostId`         | `string?` | Published tweet ID                                                |
| `linkedInPostId`        | `string?` | Published LinkedIn post URN                                       |
| `errorMessage`          | `string?` | Error details if failed                                           |
| `retryCount`            | `number?` | Retry attempts (max 3)                                            |

**Indexes:** `by_user`, `by_user_status`

#### `user_connections`

Stores encrypted OAuth tokens for external platforms.

| Field          | Type     | Description                   |
| -------------- | -------- | ----------------------------- |
| `userId`       | `string` | User ID                       |
| `platform`     | `string` | "twitter" \| "linkedin"       |
| `accessToken`  | `string` | Encrypted OAuth access token  |
| `refreshToken` | `string` | Encrypted OAuth refresh token |
| `expiresAt`    | `number` | Token expiration timestamp    |

**Indexes:** `by_user_platform`

#### `templates`

Stores reusable content templates.

| Field        | Type       | Description                     |
| ------------ | ---------- | ------------------------------- |
| `userId`     | `string`   | User ID                         |
| `name`       | `string`   | Template name (unique per user) |
| `content`    | `string`   | Template text                   |
| `tags`       | `string[]` | Categorization tags             |
| `usageCount` | `number`   | Times used                      |
| `lastUsedAt` | `number?`  | Last usage timestamp            |

**Indexes:** `by_user`

#### `recurring_queues`

Stores recurring post queues for automated content recycling.

| Field               | Type          | Description                         |
| ------------------- | ------------- | ----------------------------------- |
| `userId`            | `string`      | User ID                             |
| `originalPostId`    | `Id<"posts">` | Post to clone                       |
| `status`            | `string`      | "active" \| "paused" \| "completed" |
| `interval`          | `number`      | Days between executions             |
| `nextScheduledTime` | `number`      | Next execution timestamp            |
| `lastExecutedTime`  | `number?`     | Last execution timestamp            |
| `executionCount`    | `number`      | Total executions                    |
| `maxExecutions`     | `number?`     | Max executions limit                |

**Indexes:** `by_user_status`, `by_next_scheduled`, `by_status_next_scheduled`

For complete schema, see `convex/schema.ts`.

---

## Environment Variables Reference

### Next.js (.env.local)

```bash
# Better Auth
BETTER_AUTH_SECRET=your_secret_key
BETTER_AUTH_URL=http://localhost:3000

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-dev-deployment.convex.cloud

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Convex (Dashboard → Settings → Environment Variables)

```bash
# Better Auth
BETTER_AUTH_SECRET=your_secret_key

# Twitter OAuth
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# Encryption (32-byte base64-encoded key)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Telegram Notifications (Optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key
```

---

## OAuth Configuration

### Twitter Setup

1. Create app at [developer.twitter.com/portal](https://developer.twitter.com/en/portal/dashboard)
2. Enable OAuth 2.0 with PKCE
3. Add scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`
4. Set callback URL: `http://localhost:3000/api/auth/twitter/callback`
5. Copy Client ID and Client Secret to Convex environment variables

### LinkedIn Setup

1. Create app at [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps)
2. Request "Sign In with LinkedIn using OpenID Connect"
3. Request "Share on LinkedIn"
4. Add redirect URL: `http://localhost:3000/api/auth/linkedin/callback`
5. Copy Client ID and Client Secret to Convex environment variables

For detailed OAuth setup, see [TWITTER_OAUTH_CHECKLIST.md](./TWITTER_OAUTH_CHECKLIST.md).

---

## API Overview

### Key Convex Functions

**Posts API:**

- `createPost` - Schedule new post
- `updatePost` - Edit scheduled post
- `deletePost` - Cancel scheduled post
- `clonePost` - Clone post to draft
- `getPosts` - Retrieve posts with filters

**AI Assistant API:**

- `adjustTone` - Adjust content tone
- `expandForLinkedIn` - Expand Twitter to LinkedIn
- `generateHashtags` - Generate relevant hashtags

**Queues API:**

- `createQueue` - Create recurring queue
- `updateQueue` - Update queue settings
- `pauseQueue` / `resumeQueue` - Control queue execution
- `getQueues` - Retrieve user's queues

**Publishing API (Internal):**

- `publishTwitterPost` - Publish to Twitter
- `publishLinkedInPost` - Publish to LinkedIn
- Auto-retry with exponential backoff
- Telegram notifications on failure

For complete API reference, see [API_REFERENCE.md](./API_REFERENCE.md).

---

## Architecture Highlights

### Publishing Flow

```
User schedules post → Convex mutation → ctx.scheduler.runAt(scheduledTime)
  → Scheduled action publishes to Twitter/LinkedIn
  → Update post status → On failure: Telegram notification
```

### Security Layers

1. **Authentication** - Better Auth JWT verification
2. **Authorization** - `userId` check for data access
3. **Encryption** - AES-256-GCM for OAuth tokens
4. **HTTPS** - TLS/SSL encryption in transit

### Error Handling

- **Transient Errors** (429, 5xx, network): Auto-retry with exponential backoff
- **Permanent Errors** (401, 403, 400): No retry, mark as failed
- **Max Retries**: 3 attempts (1min, 2min, 4min delays)
- **Notification**: Telegram alert on final failure

For detailed architecture, see [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md).

---

## Development Workflow

### Running Tests

```bash
# Unit tests
pnpm run test

# Watch mode
pnpm run test:watch

# Coverage report
pnpm run test:coverage
```

### Code Quality

```bash
# Lint code
pnpm run lint

# Format code
pnpm run format  # (if configured)
```

### Convex Development

```bash
# Start Convex dev server
pnpm dlx convex dev

# Open dashboard
pnpm dlx convex dashboard

# Run function manually
pnpm dlx convex run posts:getPosts

# View logs
# Dashboard → Logs
```

---

## Contributing

### How to Contribute

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/my-feature`
3. **Make changes** with tests and documentation
4. **Run tests**: `pnpm run test`
5. **Lint code**: `pnpm run lint`
6. **Commit**: Follow [Conventional Commits](https://www.conventionalcommits.org/)
7. **Push**: `git push origin feature/my-feature`
8. **Create Pull Request** with description

### Contribution Guidelines

- **Code Style**: Follow existing TypeScript/React patterns
- **Tests**: Add tests for new features
- **Documentation**: Update relevant docs
- **Commits**: Use conventional commit format
- **Security**: Never commit secrets or tokens

For detailed guidelines, see [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md).

---

## Support

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/yourusername/social_post/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/social_post/discussions)
- **Convex Support**: [Convex Discord](https://convex.dev/community)

### Reporting Bugs

Include:

- Steps to reproduce
- Expected vs actual behavior
- Error messages and logs
- Environment (OS, Node version, browser)

---

## License

[Add your license here]

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release notes.

---

**Last Updated:** 2025-01-06
**Version:** 0.1.0

For questions or feedback, open an issue on GitHub.
