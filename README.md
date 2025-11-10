# SocialPost

A self-hosted social media scheduling application for scheduling and publishing content to X/Twitter and LinkedIn. Built with Next.js, Convex, and Better Auth as a single-user productivity tool to replace expensive subscription services.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black)
![Convex](https://img.shields.io/badge/Convex-1.28.0-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## Features

- **Multi-Platform Publishing** - Schedule posts to X/Twitter and LinkedIn with platform-specific content
- **Staggered Scheduling** - Set different publish times for each platform
- **Template System** - Create and reuse content templates with tags
- **URL Auto-Posting** - Automatically post URLs as replies/comments after main content
- **Smart Retry Logic** - Automatic retry with exponential backoff for failed posts
- **Failure Notifications** - Telegram notifications when posts fail after all retries
- **Token Management** - Automatic LinkedIn token refresh (60-day validity)
- **Encrypted Storage** - AES-256-GCM encryption for OAuth tokens
- **Real-Time Updates** - Reactive UI updates with Convex subscriptions
- **Mobile Responsive** - Optimized for scheduling on the go
- **Analytics Dashboard** - Track published, scheduled, and failed posts

---

<div align="center">

## 📬 Join the Refactoring AI Newsletter

[![Subscribe](https://img.shields.io/badge/Subscribe-Refactoring%20AI-blue?style=for-the-badge&logo=substack&logoColor=white)](https://refactoringai.substack.com/)

<a href="https://refactoringai.substack.com/">
  <img src="./public/refactoring-ai.webp" alt="Refactoring AI Newsletter" width="600px" />
</a>

<h3>I teach developers how to ship their ideas in days with AI</h3>

<p><strong>Master modern full-stack development with AI-powered tools and techniques</strong></p>

<p><strong>✨ What You'll Learn:</strong></p>

<p>
🚀 I've taught over 50,000 developers to date.<br/>
🎯 Top 1% TypeScript engineers globally on GitHub.<br/>
🤖 Learn how to use AI coding agents like Claude Code effectively
</p>

[**→ Subscribe Now (It's Free!)**](https://refactoringai.substack.com/)

</div>

---

<div align="center">

## 🚀 Built with the AI Starter Kit

[![GitHub](https://img.shields.io/badge/View_on_GitHub-AI_Starter_Kit-181717?style=for-the-badge&logo=github)](https://github.com/robertguss/ai-starter-kit)

<p><strong>SocialPost was built using the AI Starter Kit</strong> - a production-ready foundation for building full-stack applications with modern tools.</p>

<p><strong>What the Starter Kit Provides:</strong></p>

<p>
⚡ Next.js 16 with App Router and React 19<br/>
🔄 Convex real-time database with zero infrastructure<br/>
🔐 Better Auth authentication (email/password + OAuth ready)<br/>
🎨 20+ pre-installed shadcn/ui components<br/>
✅ Complete testing setup with Vitest<br/>
📚 Comprehensive documentation and examples<br/>
🤖 Optimized for AI coding agents like Claude Code
</p>

<p><strong>Perfect for rapidly building:</strong> SaaS apps, dashboards, real-time tools, and production applications</p>

[**→ Get the FREE AI Starter Kit**](https://github.com/robertguss/ai-starter-kit)

</div>

---

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/social_post.git
cd social_post

# Install dependencies
pnpm install

# Set up environment variables (see Configuration section)
cp .env.example .env.local

# Start development servers
pnpm run dev
```

Visit `http://localhost:3000` to see your app.

## Prerequisites

- **Node.js** 20+ and **pnpm** 8+
- **Convex Account** - [Sign up at convex.dev](https://convex.dev/)
- **Better Auth Setup** - Configured with Convex
- **X/Twitter Developer Account** - [Apply at developer.twitter.com](https://developer.twitter.com/)
- **LinkedIn Developer Account** - [Apply at developer.linkedin.com](https://developer.linkedin.com/)
- **Telegram Bot** (optional) - [Create via @BotFather](https://t.me/botfather)

## Installation

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/yourusername/social_post.git
cd social_post
pnpm install
```

### 2. Set Up Convex

```bash
# Initialize Convex development deployment
pnpm dlx convex dev

# Follow the prompts to:
# - Log in to your Convex account
# - Create a new project or select existing one
# - Link your local code to the deployment
```

### 3. Set Up Better Auth

1. Better Auth is already configured with Convex in this project
2. Configure Better Auth environment variables in your Convex deployment:

   ```bash
   # Follow the Better Auth + Convex setup guide:
   # https://www.better-auth.com/docs
   ```

3. Add required environment variables (see Configuration section below)

### 4. Configure OAuth Applications

**X/Twitter OAuth 2.0:**

1. Create an app at [developer.twitter.com](https://developer.twitter.com/en/portal/dashboard)
2. Enable OAuth 2.0 with these scopes:
   - `tweet.read`
   - `tweet.write`
   - `users.read`
   - `offline.access`
3. Add callback URL: `http://localhost:3000/api/auth/twitter/callback`

**LinkedIn OAuth 2.0:**

1. Create an app at [linkedin.com/developers](https://www.linkedin.com/developers/apps)
2. Request these permissions:
   - `openid`
   - `profile`
   - `w_member_social`
3. Add callback URL: `http://localhost:3000/api/auth/linkedin/callback`

## Configuration

### Environment Variables

Create `.env.local` for Next.js:

```bash
# Better Auth
BETTER_AUTH_SECRET=your_secret_key
BETTER_AUTH_URL=http://localhost:3000

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# OAuth Callback Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Add to Convex Dashboard (Settings → Environment Variables):

```bash
# Better Auth Configuration
BETTER_AUTH_SECRET=your_secret_key
BETTER_AUTH_URL=http://localhost:3000

# X/Twitter OAuth
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# Encryption (generate with: openssl rand -base64 32)
ENCRYPTION_KEY=your_base64_encoded_32_byte_key

# Telegram Notifications (optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### Generate Encryption Key

```bash
# Generate a secure 32-byte key and encode as base64
openssl rand -base64 32
```

Copy the output to `ENCRYPTION_KEY` in Convex environment variables.

## Development

### Available Scripts

```bash
# Start both frontend and backend in parallel
pnpm run dev

# Start frontend only (Next.js dev server)
pnpm run dev:frontend

# Start backend only (Convex dev server)
pnpm run dev:backend

# Open Convex dashboard
pnpm dlx convex dashboard

# Build for production
pnpm run build

# Start production server
pnpm run start

# Run linter
pnpm run lint

# Run tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Generate test coverage
pnpm run test:coverage
```

### Project Structure

```
social_post/
├── app/                      # Next.js App Router pages
│   ├── layout.tsx            # Root layout with providers
│   ├── page.tsx              # Home page
│   ├── dashboard/            # Dashboard page
│   ├── schedule/             # Post scheduling page
│   ├── history/              # Post history page
│   ├── settings/             # Settings page
│   ├── templates/            # Template library page
│   └── api/                  # API routes for OAuth callbacks
├── components/               # React components
│   ├── ui/                   # shadcn/ui components
│   └── features/             # Feature-specific components
├── convex/                   # Convex backend
│   ├── schema.ts             # Database schema
│   ├── posts.ts              # Post mutations & queries
│   ├── publishing.ts         # Publishing actions
│   ├── connections.ts        # OAuth connections
│   ├── templates.ts          # Template CRUD
│   ├── dashboard.ts          # Dashboard queries
│   ├── encryption.ts         # Token encryption
│   ├── tokenRefresh.ts       # LinkedIn token refresh
│   └── notifications.ts      # Telegram notifications
├── docs/                     # Documentation
├── hooks/                    # Custom React hooks
├── lib/                      # Utility functions
└── middleware.ts             # Better Auth route protection
```

## Architecture

### Technology Stack

- **Frontend**: Next.js 15.5.4 (App Router), React 19, Tailwind CSS 4
- **Backend**: Convex (database, queries, mutations, actions)
- **Authentication**: Better Auth (single-user auth)
- **UI Components**: shadcn/ui
- **Language**: TypeScript throughout

### Core Concepts

**Convex Backend Philosophy:**
All backend logic lives in `convex/`. Convex provides:

- **Queries** - Read data reactively (realtime updates)
- **Mutations** - Write data transactionally
- **Actions** - Call external APIs (X, LinkedIn, Telegram) with Node.js runtime
- **Scheduled Functions** - Critical for timed post publishing

**Scheduled Publishing Architecture:**

```
User creates post → Convex mutation → ctx.scheduler.runAt(scheduledTime)
  → Convex Action publishes to X/LinkedIn → Update post status
  → On failure: Retry logic → Telegram notification
```

**Security:**

- OAuth tokens encrypted with AES-256-GCM before database storage
- All Convex functions verify user authentication
- Data scoped to `userId` for single-user isolation

### Data Models

**posts** - Stores scheduled and published content

- Fields: `status`, `twitterContent`, `linkedInContent`, `scheduledTimes`, `url`, `errorMessage`, `retryCount`
- Index: `by_user` on `[userId]`

**user_connections** - Stores encrypted OAuth tokens

- Fields: `platform`, `accessToken`, `refreshToken`, `expiresAt`
- Index: `by_user_platform` on `[userId, platform]`

**templates** - Stores reusable content templates

- Fields: `name`, `content`, `tags`, `lastUsedAt`, `usageCount`
- Index: `by_user` on `[userId]`

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- [API Reference](docs/API_REFERENCE.md) - Complete Convex function reference
- [Architecture Diagrams](docs/ARCHITECTURE_DIAGRAMS.md) - Visual system architecture
- [User Guide](docs/USER_GUIDE.md) - Step-by-step usage instructions
- [Developer Guide](docs/DEVELOPER_GUIDE.md) - Setup and contribution guide
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions
- [Architecture Document](docs/architecture.md) - Technical architecture details
- [Product Requirements](docs/prd.md) - Product requirements document

## Testing

### Running Tests

```bash
# Run all tests
pnpm run test

# Watch mode
pnpm run test:watch

# With coverage
pnpm run test:coverage
```

### Test Coverage

- **Unit Tests**: Character counting, validation logic, timestamp conversion
- **Integration Tests**: Convex queries/mutations with auth, post creation flow
- **Component Tests**: React components with Convex hooks
- **Action Tests**: Mock external APIs, test retry logic

## Deployment

### Deploy to Vercel (Frontend)

```bash
# Install Vercel CLI
pnpm i -g vercel

# Deploy to production
vercel --prod
```

**Environment Variables:**
Add all `.env.local` variables to Vercel project settings.

### Deploy Convex (Backend)

```bash
# Create production deployment
pnpm dlx convex deploy

# Set production environment variables
# Via Convex Dashboard → Production → Settings → Environment Variables
```

**Post-Deployment:**

1. Update OAuth callback URLs to production domain
2. Test OAuth flows in production
3. Verify scheduled posts are publishing
4. Set up monitoring and alerting

### Production Checklist

- [ ] Environment variables set in Vercel and Convex
- [ ] OAuth apps configured with production callback URLs
- [ ] Encryption key generated and set
- [ ] Telegram bot configured (optional)
- [ ] Better Auth production instance configured
- [ ] DNS records pointed to Vercel
- [ ] SSL certificate active
- [ ] Error tracking configured
- [ ] Backup strategy implemented

## Troubleshooting

### Common Issues

**Posts Not Publishing:**

1. Check Convex logs in dashboard
2. Verify OAuth tokens are not expired (check Settings page)
3. Check scheduled function status in Convex dashboard
4. Review error messages in Post History

**OAuth Connection Fails:**

1. Verify callback URLs match exactly
2. Check client ID and secret in Convex environment variables
3. Ensure scopes are correctly configured
4. Check browser console for errors

**Encryption Errors:**

1. Verify `ENCRYPTION_KEY` is set in Convex environment variables
2. Ensure key is exactly 32 bytes (base64-encoded)
3. Run migration if upgrading from plain-text tokens:

   ```typescript
   // In Convex dashboard console
   await ctx.runAction(internal.encryption.migrateTokensToEncrypted, {
     dryRun: true, // Test first
   });
   ```

**Rate Limiting:**

- X/Twitter: Space out posts, retry logic handles 429 errors
- LinkedIn: Built-in retry with exponential backoff

### Debug Mode

Enable verbose logging:

```bash
# In convex function code
console.log('[Debug]', { postId, status, error });
```

View logs in Convex Dashboard → Logs.

## Contributing

Contributions are welcome! This is a personal productivity tool, but improvements benefit everyone.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pnpm run test`
5. Run linter: `pnpm run lint`
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Coding Standards

- Use TypeScript for type safety
- Follow existing code style
- Add tests for new features
- Update documentation
- Use conventional commits

### Code Review Process

- All PRs require review
- Tests must pass
- No linting errors
- Documentation updated

## Roadmap

- [ ] Support for additional platforms (Mastodon, Bluesky)
- [ ] Image/media attachment support
- [ ] Post analytics and insights
- [ ] Bulk scheduling from CSV
- [ ] Multi-user support (future)
- [ ] Browser extension for quick scheduling

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Convex](https://convex.dev/) for backend infrastructure
- Styled with [shadcn/ui](https://ui.shadcn.com/) components
- Authenticated with [Better Auth](https://www.better-auth.com/)
- Deployed on [Vercel](https://vercel.com/)

## Support

- **Documentation**: See `docs/` directory
- **Issues**: [GitHub Issues](https://github.com/yourusername/social_post/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/social_post/discussions)

## Author

Built with ❤️ as a replacement for expensive social media scheduling tools.

---

**Star this repo if you find it useful!**
