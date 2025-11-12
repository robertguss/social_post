# Project Overview

## Social Post - Social Media Scheduling Application

**Project Type**: Web Application (Monolith)
**Status**: Active Development
**Architecture**: Next.js + Convex + Better Auth

---

## Executive Summary

Social Post is a self-hosted social media scheduling application designed for scheduling and publishing content to X/Twitter and LinkedIn. Built as a single-user productivity tool, it replaces expensive subscription services with a clean, efficient interface backed by modern web technologies.

### Key Capabilities
- **Dual-Platform Publishing**: Schedule posts to Twitter/X and LinkedIn simultaneously or independently
- **AI Content Enhancement**: Tone adjustment, LinkedIn expansion, and hashtag generation via Google Gemini AI
- **Recurring Queues**: Automate content recycling with configurable intervals
- **Smart Scheduling**: Research-based posting time recommendations with custom override support
- **Template Library**: Reusable content templates with tagging and usage tracking
- **Draft Management**: Save and resume post drafts across platforms
- **Single-User Mode**: Optional signup restriction for personal deployments

---

## Technology Stack

### Frontend
| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js (App Router) | 15.5.4 |
| UI Library | React | 19.0.0 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Component Library | shadcn/ui (Radix UI) | Latest |
| Icons | Lucide React + Tabler Icons | Latest |
| Theme | next-themes (dark/light) | 0.4.6 |

### Backend
| Category | Technology | Version |
|----------|-----------|---------|
| Database | Convex (serverless) | 1.28.2 |
| Auth | Better Auth | 1.3.27 |
| AI | Google Gemini AI | 2.5-flash |
| Runtime | Node.js actions | Built-in |
| Scheduling | Convex Scheduler + Cron | Built-in |

### External APIs
- **Twitter API v2**: Post publishing, threading
- **LinkedIn API v2**: Post publishing, comment posting
- **Google Gemini AI**: Content generation and enhancement
- **Telegram Bot API**: Failure notifications (future)

### Development Tools
- **Testing**: Jest + React Testing Library + Convex Test
- **Linting**: ESLint + Prettier
- **Package Manager**: pnpm
- **Build Tool**: Next.js Turbopack
- **Type Checking**: TypeScript strict mode

---

## Repository Structure

### Type: Monolith (Single Cohesive Codebase)

```
social_post/
├── app/           # Next.js App Router (frontend pages & routes)
├── components/    # React components (UI primitives + features)
├── convex/        # Convex backend (database + serverless functions)
├── lib/           # Shared utilities
├── hooks/         # Custom React hooks
├── __tests__/     # Test suites
└── docs/          # Documentation
```

**Integration**: Frontend and backend in single repository, deployed together

---

## Architecture Pattern

### Serverless Full-Stack Architecture

**Frontend**: React Server Components + Client Components (Next.js App Router)
**Backend**: Serverless functions (Convex queries, mutations, actions)
**Database**: Convex (NoSQL document database with real-time subscriptions)
**Authentication**: Better Auth (session-based with OAuth providers)

### Key Architectural Decisions
1. **No Traditional API Server**: Convex functions called directly from React hooks
2. **Real-time Data**: Automatic UI updates via Convex reactive queries
3. **Scheduled Publishing**: Convex Scheduler for timed post execution
4. **Token Security**: Encryption at rest for OAuth tokens
5. **Single-User Focused**: Designed for personal use, not multi-tenant

---

## Core Features

### 1. Post Scheduling
- Create posts for Twitter/X (280 chars) and LinkedIn (3000 chars)
- Schedule separate publish times for each platform
- Platform-specific character validation
- URL auto-posting as comment/reply after main post
- Draft saving and resumption

### 2. Publishing Engine
- Automated publishing via Convex Scheduler
- Retry logic with exponential backoff
- Error tracking and status updates
- Failed post handling with Telegram notifications (future)

### 3. AI Content Assistant
- **Tone Adjustment**: Professional, casual, friendly, enthusiastic, etc.
- **LinkedIn Expansion**: Expand Twitter content (280 → 3000 chars)
- **Hashtag Generation**: AI-generated relevant hashtags
- **Rate Limiting**: Daily/monthly token limits per user
- **Quality Feedback**: User reporting for inappropriate/low-quality output

### 4. Template Management
- Create reusable content templates
- Tag-based organization
- Usage tracking and analytics
- Quick insertion into posts

### 5. Recurring Queues
- Automate content recycling
- Configurable intervals (days between posts)
- Max execution limits or infinite repeat
- Pause/resume controls
- Conflict detection

### 6. Smart Scheduling
- Research-based optimal posting times
- Platform-specific recommendations (Twitter vs LinkedIn)
- Day-of-week optimization
- Custom user preference override
- Conflict warning for overlapping posts

### 7. Analytics (Future)
- Post performance tracking (likes, shares, comments)
- Best time analysis based on actual data
- Engagement trend visualization
- Currently schema-defined but inactive (pending API access)

---

## Data Model Highlights

### 11 Database Tables

1. **posts**: Scheduled and published content (main table)
2. **user_connections**: Encrypted OAuth tokens
3. **templates**: Reusable content templates
4. **recurring_queues**: Automated post recycling
5. **user_preferences**: User settings
6. **posting_preferences**: Custom posting time preferences
7. **posting_time_recommendations**: System-wide optimal times
8. **post_performance**: Engagement metrics (future)
9. **ai_feedback**: AI quality reporting
10. **ai_usage_logs**: AI rate limiting and cost tracking
11. Better Auth tables (managed by Better Auth)

**Key Relationships**:
- Users → Posts (1:many)
- Recurring Queues → Posts (creates new posts via cron)
- Posts → Posts (self-referencing for cloned posts)

---

## Security Features

- **OAuth Token Encryption**: All tokens encrypted at rest
- **User Scoping**: All data queries filtered by authenticated user ID
- **Environment Variables**: API keys never in code/repo
- **Better Auth Integration**: Secure session management
- **Middleware Protection**: Route guards for authenticated pages
- **Single-User Mode**: Optional signup restriction

---

## Development Workflow

### Local Development
```bash
pnpm run dev              # Start frontend + backend
pnpm run dev:frontend     # Next.js only
pnpm run dev:backend      # Convex only
pnpm run predev           # Convex dev + dashboard
```

### Testing
```bash
pnpm run test             # Run Jest tests
pnpm run test:watch       # Watch mode
pnpm run test:coverage    # Coverage report
```

### Build & Deploy
```bash
pnpm run build            # Build Next.js for production
pnpm run start            # Start production server
pnpm dlx convex deploy    # Deploy Convex backend
```

---

## Deployment Architecture

### Frontend
- **Platform**: Vercel (or any Next.js host)
- **Region**: Auto (global CDN)
- **Environment**: Node.js 20+

### Backend
- **Platform**: Convex Cloud
- **Region**: Auto-assigned
- **Scaling**: Automatic serverless scaling
- **Database**: Managed by Convex

### External Services
- **Twitter API**: OAuth 2.0 + API v2
- **LinkedIn API**: OAuth 2.0 + API v2
- **Gemini AI**: API key authentication
- **Telegram**: Bot token (future)

---

## Testing Strategy

### Test Coverage
- **Unit Tests**: Convex functions, utilities, components
- **Integration Tests**: API routes, publishing flow, auth flow
- **Component Tests**: React Testing Library
- **E2E Tests**: Critical user paths (future)

### Testing Tools
- Jest (test runner)
- React Testing Library (component testing)
- Convex Test (backend testing)
- @testing-library/user-event (user interactions)

---

## Documentation Structure

### Technical Documentation
- `bmm-api-contracts.md` - Complete API reference (Convex functions + REST routes)
- `bmm-data-models.md` - Database schema and relationships
- `bmm-component-inventory.md` - React component catalog
- `bmm-source-tree-analysis.md` - Codebase structure guide
- `bmm-development-guide.md` - Setup and development instructions
- `bmm-architecture.md` - Architecture overview

### Existing Documentation
- `README.md` - Project readme
- `CLAUDE.md` - Claude Code instructions
- `docs/architecture/` - Architecture deep-dives
- `docs/prd/` - Product Requirements Document
- `docs/technical/` - Setup guides, API reference, deployment
- `docs/testing/` - Test documentation

---

## Project Goals

### Primary Goal
Replace expensive social media scheduling subscriptions (Hootsuite, Buffer, etc.) with a self-hosted alternative optimized for single-user productivity.

### Design Principles
1. **Simple & Fast**: Minimal UI, fast interactions
2. **Mobile-First**: Schedule posts from mobile devices
3. **Batch Creation**: Write Twitter version, expand for LinkedIn
4. **Staggered Publishing**: Different times per platform
5. **Reliable Scheduling**: Posts must publish at exact scheduled time
6. **Cost-Effective**: Self-hosted, minimal external service costs

---

## Active Development Areas

### Recently Completed
- Better Auth integration
- AI content assistant (tone, expansion, hashtags)
- Recurring queue system
- Posting preference customization
- Single-user mode configuration

### In Progress
- Analytics dashboard (pending API access)
- Telegram failure notifications
- Performance optimization

### Roadmap
- Mobile app (React Native)
- Additional platforms (Facebook, Instagram, etc.)
- Advanced analytics and insights
- Multi-user support (optional)

---

## Getting Started

### Prerequisites
- Node.js 20+ and pnpm
- Convex account (free tier available)
- Twitter Developer Account (API access)
- LinkedIn Developer Account (API access)
- Google AI Studio account (Gemini API key)

### Quick Start
1. Clone repository
2. Install dependencies: `pnpm install`
3. Set up environment variables (see `.env.example`)
4. Start dev server: `pnpm run dev`
5. Open browser: `http://localhost:3000`

For detailed setup instructions, see `bmm-development-guide.md`.

---

*Generated: 2025-11-12*
*Project: Social Post*
