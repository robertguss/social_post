# Social Post - Project Documentation Index

**Generated**: 2025-11-12
**Project Type**: Web Application (Monolith)
**Stack**: Next.js 15 + React 19 + Convex + TypeScript

---

## Quick Reference

| Category | Technology | Version |
|----------|-----------|---------|
| **Frontend** | Next.js (App Router) | 15.5.4 |
| **UI Library** | React | 19.0.0 |
| **Backend** | Convex (Serverless) | 1.28.2 |
| **Auth** | Better Auth | 1.3.27 |
| **Styling** | Tailwind CSS | 4.x |
| **Components** | shadcn/ui (Radix UI) | Latest |
| **Language** | TypeScript | 5.x |
| **AI** | Google Gemini AI | 2.5-flash |

**Architecture Pattern**: Serverless Full-Stack (React + Convex)
**Repository Type**: Monolith
**Entry Points**:
- Frontend: `app/layout.tsx`
- Backend: `convex/schema.ts`, `convex/http.ts`

---

## 🚀 Getting Started

**New to the project?** Start here:
1. [Project Overview](./bmm-project-overview.md) - Executive summary and goals
2. [Development Guide](./bmm-development-guide.md) - Setup instructions and workflow
3. [Source Tree Analysis](./bmm-source-tree-analysis.md) - Codebase structure guide

**For AI-Assisted Development**:
- This index (`bmm-index.md`) is your primary entry point
- Reference specific documents as needed for context
- All documentation is optimized for AI comprehension

---

## 📚 Generated Documentation

### Core Technical Documentation

| Document | Description | Use When |
|----------|-------------|----------|
| [Project Overview](./bmm-project-overview.md) | Executive summary, tech stack, architecture | Understanding project scope and goals |
| [API Contracts](./bmm-api-contracts.md) | Complete API reference (Convex + REST routes) | Implementing features, calling backend functions |
| [Data Models](./bmm-data-models.md) | Database schema, tables, relationships | Working with database, understanding data flow |
| [Component Inventory](./bmm-component-inventory.md) | React component catalog and patterns | Building UI, understanding component structure |
| [Source Tree Analysis](./bmm-source-tree-analysis.md) | Directory structure, file organization | Navigating codebase, adding new files |
| [Development Guide](./bmm-development-guide.md) | Setup, workflow, testing, deployment | Setting up environment, developing features |

### Architecture Documentation _(Existing)_

| Document | Description |
|----------|-------------|
| [Architecture Overview](./architecture.md) | High-level system architecture |
| [architecture/index.md](./architecture/index.md) | Architecture documentation hub |
| [architecture/high-level-architecture.md](./architecture/high-level-architecture.md) | System components and interactions |
| [architecture/frontend-architecture.md](./architecture/frontend-architecture.md) | Frontend structure and patterns |
| [architecture/data-models.md](./architecture/data-models.md) | Database schema deep-dive |
| [architecture/tech-stack.md](./architecture/tech-stack.md) | Technology choices and justification |
| [architecture/security.md](./architecture/security.md) | Security patterns and practices |
| [architecture/testing-strategy.md](./architecture/testing-strategy.md) | Testing approach and coverage |

### Product Documentation _(Existing)_

| Document | Description |
|----------|-------------|
| [PRD](./prd.md) | Product Requirements Document |
| [prd/index.md](./prd/index.md) | PRD hub |
| [prd/overview.md](./prd/overview.md) | Product vision and goals |
| [prd/1-goals-and-background-context.md](./prd/1-goals-and-background-context.md) | Project goals and context |
| [prd/2-requirements.md](./prd/2-requirements.md) | Functional and non-functional requirements |
| [prd/3-user-interface-design-goals.md](./prd/3-user-interface-design-goals.md) | UI/UX design principles |
| [prd/4-technical-assumptions.md](./prd/4-technical-assumptions.md) | Technical constraints and assumptions |
| [prd/5-epic-list.md](./prd/5-epic-list.md) | Epic breakdown |
| [prd/6-epic-details.md](./prd/6-epic-details.md) | Detailed epic specifications |

### Technical Guides _(Existing)_

| Document | Description |
|----------|-------------|
| [technical/API_REFERENCE.md](./technical/API_REFERENCE.md) | API endpoint reference |
| [technical/DEVELOPER_GUIDE.md](./technical/DEVELOPER_GUIDE.md) | Developer setup guide |
| [technical/DEPLOYMENT.md](./technical/DEPLOYMENT.md) | Deployment instructions |
| [technical/ARCHITECTURE_DIAGRAMS.md](./technical/ARCHITECTURE_DIAGRAMS.md) | Visual architecture diagrams |
| [technical/SETUP_ENCRYPTION.md](./technical/SETUP_ENCRYPTION.md) | OAuth token encryption setup |
| [technical/TWITTER_OAUTH_CHECKLIST.md](./technical/TWITTER_OAUTH_CHECKLIST.md) | Twitter OAuth setup checklist |
| [technical/USER_GUIDE.md](./technical/USER_GUIDE.md) | End-user guide |

### Feature Documentation _(Existing)_

| Document | Description |
|----------|-------------|
| [features/performance-tracking.md](./features/performance-tracking.md) | Performance tracking feature spec |

### Setup Guides _(Existing)_

| Document | Description |
|----------|-------------|
| [setup/gemini-setup.md](./setup/gemini-setup.md) | Google Gemini AI setup instructions |

### Testing Documentation _(Existing)_

| Document | Description |
|----------|-------------|
| [testing/ai-error-handling-tests.md](./testing/ai-error-handling-tests.md) | AI error handling test documentation |

### Root Documentation _(Existing)_

| Document | Description |
|----------|-------------|
| [README.md](./README.md) | Documentation index |
| [../README.md](../README.md) | Project readme |
| [../CLAUDE.md](../CLAUDE.md) | Claude Code instructions (AI development guidelines) |

---

## 🎯 Documentation Usage by Task

### Adding a New Feature

**Read**:
1. [Project Overview](./bmm-project-overview.md) - Understand architecture
2. [API Contracts](./bmm-api-contracts.md) - Review existing endpoints
3. [Data Models](./bmm-data-models.md) - Understand database schema
4. [Component Inventory](./bmm-component-inventory.md) - Find reusable components

**Reference**: `../CLAUDE.md` for coding guidelines

### Understanding the Codebase

**Read**:
1. [Source Tree Analysis](./bmm-source-tree-analysis.md) - Navigate directory structure
2. [Component Inventory](./bmm-component-inventory.md) - Component architecture
3. [API Contracts](./bmm-api-contracts.md) - Backend function reference

### Setting Up Development Environment

**Read**:
1. [Development Guide](./bmm-development-guide.md) - Complete setup instructions
2. [technical/DEVELOPER_GUIDE.md](./technical/DEVELOPER_GUIDE.md) - Additional dev setup
3. [technical/SETUP_ENCRYPTION.md](./technical/SETUP_ENCRYPTION.md) - Encryption configuration

### Working with Database

**Read**:
1. [Data Models](./bmm-data-models.md) - Schema reference
2. [architecture/data-models.md](./architecture/data-models.md) - Deep-dive
3. [API Contracts](./bmm-api-contracts.md) - Database operations

### Building UI Components

**Read**:
1. [Component Inventory](./bmm-component-inventory.md) - Component catalog
2. [architecture/frontend-architecture.md](./architecture/frontend-architecture.md) - Frontend patterns
3. `../CLAUDE.md` - Component guidelines

### Implementing Backend Logic

**Read**:
1. [API Contracts](./bmm-api-contracts.md) - Function reference
2. [Data Models](./bmm-data-models.md) - Schema reference
3. `../CLAUDE.md` - Convex patterns and rules

### Deploying to Production

**Read**:
1. [Development Guide](./bmm-development-guide.md) - Deployment section
2. [technical/DEPLOYMENT.md](./technical/DEPLOYMENT.md) - Detailed deployment guide
3. [architecture/security.md](./architecture/security.md) - Production security

---

## 🏗️ Architecture Quick Reference

### Frontend Architecture
- **Framework**: Next.js 15 App Router
- **Components**: React 19 functional components
- **Styling**: Tailwind CSS 4 + shadcn/ui (Radix UI)
- **State**: React hooks + Convex reactive queries (no Redux/Zustand)
- **Routing**: File-based routing in `app/` directory
- **Authentication**: Better Auth with middleware route guards

### Backend Architecture
- **Database**: Convex (NoSQL document database)
- **Functions**: Serverless (queries, mutations, actions)
- **Real-time**: WebSocket subscriptions via Convex
- **Scheduling**: Convex Scheduler (one-time) + Cron (recurring)
- **Security**: Token encryption, user scoping, environment variables

### Data Flow
```
User Action
  ↓
React Component
  ↓
Convex Mutation (useMutation hook)
  ↓
Database Update
  ↓
Convex Query Re-runs (automatic, reactive)
  ↓
Component Re-renders
```

### External Integrations
- **Twitter API v2**: Post publishing, threading
- **LinkedIn API v2**: Post publishing, comments
- **Google Gemini AI**: Content generation
- **Telegram Bot API**: Failure notifications (future)

---

## 📊 Database Schema Overview

**11 Tables**:
1. `posts` - Scheduled and published content
2. `user_connections` - Encrypted OAuth tokens
3. `templates` - Reusable content templates
4. `recurring_queues` - Automated post recycling
5. `user_preferences` - User settings
6. `posting_preferences` - Custom posting times
7. `posting_time_recommendations` - System optimal times
8. `post_performance` - Engagement metrics (future)
9. `ai_feedback` - AI quality reporting
10. `ai_usage_logs` - AI rate limiting
11. Better Auth tables (managed)

**Key Indexes**:
- `by_user` on all user-scoped tables
- `by_user_status` on posts
- `by_status_next_scheduled` on queues (for cron)

See [Data Models](./bmm-data-models.md) for complete schema reference.

---

## 🧪 Testing

### Test Organization
- `__tests__/api/` - API route tests
- `__tests__/components/` - React component tests
- `__tests__/convex/` - Convex function tests
- `__tests__/integration/` - End-to-end tests
- `convex/*.test.ts` - Convex unit tests
- `components/features/__tests__/` - Feature component tests

### Running Tests
```bash
pnpm run test              # All tests
pnpm run test:watch        # Watch mode
pnpm run test:coverage     # Coverage report
```

See [Development Guide](./bmm-development-guide.md) for testing guidelines.

---

## 🔐 Security

### Key Security Features
- OAuth token encryption at rest
- User ID scoping on all queries
- Environment variable protection
- Better Auth session management
- Middleware route guards
- Single-user mode option

See [architecture/security.md](./architecture/security.md) for security deep-dive.

---

## 🚢 Deployment

### Frontend
- **Platform**: Vercel (or any Next.js host)
- **Build**: `pnpm run build`
- **Start**: `pnpm run start`

### Backend
- **Platform**: Convex Cloud
- **Deploy**: `pnpm dlx convex deploy`

See [Development Guide](./bmm-development-guide.md) and [technical/DEPLOYMENT.md](./technical/DEPLOYMENT.md) for deployment instructions.

---

## 📝 Contributing

### Development Workflow
1. Create feature branch
2. Implement changes
3. Write tests
4. Run `pnpm run test`
5. Commit with conventional commit messages
6. Create pull request

See [Development Guide](./bmm-development-guide.md) for detailed workflow.

---

## 🆘 Getting Help

### Documentation
- Start with this index
- Check `../CLAUDE.md` for AI development guidelines
- Review relevant technical docs

### External Resources
- Convex: [docs.convex.dev](https://docs.convex.dev)
- Next.js: [nextjs.org/docs](https://nextjs.org/docs)
- shadcn/ui: [ui.shadcn.com](https://ui.shadcn.com)
- Better Auth: [better-auth.com](https://better-auth.com)

---

## 📅 Documentation Status

**Last Generated**: 2025-11-12
**Documentation Mode**: Deep Scan
**Scan Level**: Critical files read
**Project Classification**: Web Application (Monolith)
**Parts Documented**: 1 (main)

**Files Generated** (BMM Documentation):
1. bmm-index.md (this file)
2. bmm-project-overview.md
3. bmm-api-contracts.md
4. bmm-data-models.md
5. bmm-component-inventory.md
6. bmm-source-tree-analysis.md
7. bmm-development-guide.md

**Existing Documentation** (Preserved):
- 40+ existing documentation files
- PRD and architecture documentation
- Technical guides and setup instructions
- Feature specifications and test documentation

---

## 🎯 AI-Assisted Development Notes

This documentation is optimized for AI code assistants (Claude, GitHub Copilot, etc.):

### Best Practices
1. **Start with this index** - Provides complete project context
2. **Reference specific docs as needed** - Deep-dive into relevant areas
3. **Follow CLAUDE.md guidelines** - Project-specific coding rules
4. **Use generated docs for accuracy** - Reflects actual codebase structure

### Quick Lookup
- **Adding features**: API Contracts + Data Models + Component Inventory
- **Understanding code**: Source Tree Analysis + Component Inventory
- **Database operations**: Data Models + API Contracts
- **UI work**: Component Inventory + Frontend Architecture
- **Setup/deployment**: Development Guide + Technical Guides

---

*This documentation was generated by the BMAD (BMM) document-project workflow.*
*For questions or updates, regenerate documentation using the document-project workflow.*
