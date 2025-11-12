# Source Tree Analysis

## Project Structure Overview

```
social_post/                     # Root - Single cohesive monolith
├── app/                        # Next.js App Router - Frontend routing and pages ⭐
│   ├── (auth)/                # Auth routes (login, signup)
│   ├── (protected)/           # Protected application routes
│   │   ├── dashboard/         # Main dashboard page
│   │   ├── schedule/          # Post scheduling interface
│   │   ├── history/           # Post history view
│   │   ├── templates/         # Template library
│   │   ├── queues/            # Recurring queue management
│   │   ├── insights/          # Analytics and insights
│   │   ├── settings/          # User settings
│   │   └── layout.tsx         # Authenticated layout wrapper
│   ├── api/                   # Next.js API routes
│   │   └── auth/              # OAuth callback handlers (Twitter, LinkedIn, Better Auth)
│   ├── layout.tsx             # Root layout (providers, auth, theme)
│   ├── page.tsx               # Home page
│   └── globals.css            # Global styles (Tailwind config, theme variables)
│
├── components/                 # React components ⭐
│   ├── ui/                    # shadcn/ui primitives (33 components)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── select.tsx
│   │   ├── calendar.tsx
│   │   └── ... (28 more)
│   ├── features/              # Feature-specific components
│   │   ├── PostScheduler.tsx          # Main post creation UI
│   │   ├── DualPlatformTextFields.tsx # Twitter/LinkedIn editors
│   │   ├── AISuggestionPanel.tsx      # AI content enhancement
│   │   ├── TemplatePickerModal.tsx    # Template selection
│   │   ├── QueueEditModal.tsx         # Queue configuration
│   │   ├── RecommendedTimes.tsx       # Optimal posting times
│   │   ├── PreviewModal.tsx           # Post preview
│   │   ├── ConflictWarning.tsx        # Scheduling conflict detection
│   │   └── ... (15 more)
│   ├── app-sidebar.tsx        # Main application sidebar
│   ├── site-header.tsx        # Application header
│   ├── data-table.tsx         # Reusable data table
│   └── ConvexClientProvider.tsx # Convex React client setup
│
├── convex/                     # Convex backend - Serverless functions and database ⭐
│   ├── schema.ts              # Database schema (11 tables)
│   ├── posts.ts               # Post CRUD operations
│   ├── publishing.ts          # Twitter/LinkedIn publishing logic
│   ├── templates.ts           # Template management
│   ├── queues.ts              # Recurring queue processing + cron jobs
│   ├── connections.ts         # OAuth connection management
│   ├── encryption.ts          # Token encryption/decryption
│   ├── aiAssistant.ts         # AI content generation (Gemini)
│   ├── aiUsageTracking.ts     # AI rate limiting and cost tracking
│   ├── aiFeedback.ts          # AI quality feedback
│   ├── analytics.ts           # Performance metrics (future)
│   ├── analyticsQueries.ts    # Analytics data queries
│   ├── dashboard.ts           # Dashboard statistics
│   ├── drafts.ts              # Draft management
│   ├── recommendations.ts     # Posting time recommendations
│   ├── postingPreferences.ts  # User custom posting preferences
│   ├── userPreferences.ts     # User settings
│   ├── tokenRefresh.ts        # OAuth token refresh
│   ├── notifications.ts       # Telegram failure notifications (future)
│   ├── auth.ts                # Better Auth Convex integration
│   ├── auth.config.ts         # Auth configuration
│   ├── gemini.ts              # Google Gemini AI client
│   ├── http.ts                # Convex HTTP endpoints
│   └── _generated/            # Auto-generated Convex types
│
├── hooks/                      # React custom hooks
│   └── use-mobile.ts          # Mobile detection hook
│
├── lib/                        # Utility libraries
│   ├── utils.ts               # General utilities (Tailwind merge, etc.)
│   ├── auth-client.ts         # Better Auth client configuration
│   ├── auth-server.ts         # Better Auth server configuration
│   ├── timeHelpers.ts         # Timezone and time utilities
│   └── utils/
│       └── characterCount.ts  # Platform-specific character counting
│
├── __tests__/                  # Test suites
│   ├── api/                   # API route tests (OAuth callbacks)
│   ├── components/            # Component tests (React Testing Library)
│   ├── convex/                # Convex function tests (unit + integration)
│   └── integration/           # End-to-end integration tests
│
├── __mocks__/                  # Jest mocks (Convex API, React)
│
├── docs/                       # Documentation ⭐
│   ├── architecture/          # Architecture documentation
│   ├── prd/                   # Product Requirements Document
│   ├── technical/             # Technical guides (API, deployment, setup)
│   ├── stories/               # User stories (archived)
│   ├── features/              # Feature specifications
│   ├── testing/               # Test documentation
│   ├── setup/                 # Setup guides (Gemini AI, etc.)
│   └── README.md              # Documentation index
│
├── .bmad/                      # BMAD AI agent system (workflow automation)
│   ├── bmm/                   # Business Modeling Method workflows
│   ├── cis/                   # Creative Intelligence System workflows
│   └── core/                  # Core BMAD engine
│
├── .claude/                    # Claude Code configuration
│   ├── agents/                # Agent configurations
│   └── commands/              # Custom slash commands
│
├── .cursor/                    # Cursor IDE rules
│   └── rules/                 # Custom coding rules
│
├── public/                     # Static assets
│
├── coverage/                   # Test coverage reports
│
├── middleware.ts               # Next.js middleware (Better Auth route protection)
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies and scripts
├── components.json             # shadcn/ui configuration
├── jest.config.ts              # Jest test configuration
├── eslint.config.mjs           # ESLint configuration
├── .env.example                # Environment variable template
├── CLAUDE.md                   # Claude Code project instructions
├── README.md                   # Project readme
└── CHANGELOG.md                # Version history
```

---

## Critical Directories

### 1. `/app` - Next.js App Router (Frontend)
**Purpose**: Application routes, pages, and layouts

**Structure**:
- **(auth)/** - Route group for authentication pages (login, signup)
- **(protected)/** - Route group for authenticated pages (requires login)
- **api/** - Next.js API routes (OAuth callbacks)
- **layout.tsx** - Root layout with providers (Convex, Better Auth, Theme)
- **page.tsx** - Landing page
- **globals.css** - Tailwind CSS + theme variables

**Key Pattern**: Next.js App Router with route groups for authentication

---

### 2. `/components` - React Components
**Purpose**: Reusable UI components and feature modules

**Structure**:
- **ui/** - shadcn/ui components (33 primitives: buttons, dialogs, forms, etc.)
- **features/** - Feature-specific components (PostScheduler, AI panels, etc.)
- Root-level layout components (sidebar, header, etc.)

**Key Pattern**: Atomic design - UI primitives + composed feature components

---

### 3. `/convex` - Convex Backend
**Purpose**: Serverless backend functions and database schema

**Categories**:
- **Data Layer**: `schema.ts`, `posts.ts`, `templates.ts`, `queues.ts`, `drafts.ts`
- **Business Logic**: `publishing.ts`, `aiAssistant.ts`, `analytics.ts`
- **Infrastructure**: `auth.ts`, `encryption.ts`, `tokenRefresh.ts`, `http.ts`
- **Utilities**: `gemini.ts`, `notifications.ts`, `dashboard.ts`

**Function Types**:
- **Queries** (`query`): Read data with automatic reactivity
- **Mutations** (`mutation`): Write data transactionally
- **Actions** (`action`): Call external APIs (Twitter, LinkedIn, Gemini)
- **Internal** (`internal*`): Private functions (encryption, scheduled tasks)

**Special Files**:
- `_generated/` - Auto-generated TypeScript types
- `convex.config.ts` - Convex configuration
- `auth.config.ts` - Better Auth configuration

---

### 4. `/lib` - Utility Libraries
**Purpose**: Shared utilities and helper functions

**Files**:
- `utils.ts` - General utilities (Tailwind merge, class composition)
- `auth-client.ts` - Better Auth client setup
- `auth-server.ts` - Better Auth server setup
- `timeHelpers.ts` - Timezone conversions, date utilities
- `utils/characterCount.ts` - Platform-specific character counting

---

### 5. `/hooks` - React Hooks
**Purpose**: Custom React hooks

**Files**:
- `use-mobile.ts` - Mobile viewport detection

**Note**: More hooks may exist in components - this directory is for shared hooks

---

### 6. `/__tests__` - Test Suites
**Purpose**: Comprehensive test coverage

**Structure**:
- **api/** - API route tests (OAuth callbacks)
- **components/** - Component tests (React Testing Library)
- **convex/** - Backend function tests (Convex Test)
- **integration/** - End-to-end tests

**Test Types**:
- Unit tests (`*.test.ts`, `*.test.tsx`)
- Integration tests (`*.integration.test.ts`)

---

### 7. `/docs` - Documentation
**Purpose**: Project documentation and planning artifacts

**Structure**:
- **architecture/** - Architecture documentation
- **prd/** - Product Requirements Document
- **technical/** - Technical guides (API reference, deployment, setup)
- **stories/** - User stories (archived after implementation)
- **features/** - Feature specifications
- **testing/** - Test documentation
- **setup/** - Setup guides

---

## Entry Points

### Frontend Entry Points
1. **app/layout.tsx** - Root React layout
   - Providers: ConvexClientProvider, Better Auth, ThemeProvider
   - Global styles: app/globals.css

2. **app/(protected)/layout.tsx** - Authenticated layout
   - Auth guard wrapper
   - Sidebar navigation

### Backend Entry Points
1. **convex/http.ts** - HTTP endpoints (Better Auth routes)
2. **convex/auth.ts** - Authentication component
3. **convex/queues.ts** - Cron jobs (queue processing every 15 minutes)

### API Entry Points
1. **app/api/auth/[...all]/route.ts** - Better Auth catch-all
2. **app/api/auth/twitter/callback/route.ts** - Twitter OAuth callback
3. **app/api/auth/linkedin/callback/route.ts** - LinkedIn OAuth callback

---

## Integration Points

### Internal Integration
- **App Router ↔ Convex**: React hooks (`useQuery`, `useMutation`) via ConvexClientProvider
- **Middleware ↔ Better Auth**: Route protection in middleware.ts
- **Convex Scheduler**: Timed function execution (post publishing)
- **Convex Cron**: Recurring task execution (queue processing)

### External APIs
- **Twitter API v2**: `/2/tweets` endpoint (publishing.ts)
- **LinkedIn API v2**: `/v2/ugcPosts` endpoint (publishing.ts)
- **Google Gemini AI**: Content generation (aiAssistant.ts)
- **Telegram Bot API**: Failure notifications (notifications.ts, future)

---

## Configuration Files

### Build & Runtime
- **next.config.ts** - Next.js configuration
- **tsconfig.json** - TypeScript compiler options
- **package.json** - Dependencies and npm scripts
- **convex.config.ts** - Convex backend configuration

### Tooling
- **components.json** - shadcn/ui configuration
- **jest.config.ts** - Jest test runner
- **eslint.config.mjs** - ESLint rules
- **.prettierrc** - Code formatting
- **vitest.config.ts** - Vitest configuration

### Environment
- **.env.example** - Environment variable template
- **.env.local** - Local development environment variables (git-ignored)
- **.env.production** - Production environment variables (git-ignored)

---

## Development Workflow Directories

### AI Agent System
- **.bmad/** - BMAD workflow automation (PRD generation, architecture planning, code generation)
- **.claude/** - Claude Code configuration (agents, commands)
- **.cursor/** - Cursor IDE rules (Convex patterns, project guidelines)

### Version Control
- **.git/** - Git repository
- **.gitignore** - Ignored files and directories

### Build Outputs
- **.next/** - Next.js build output (git-ignored)
- **node_modules/** - npm dependencies (git-ignored)
- **coverage/** - Test coverage reports (git-ignored)

---

## Asset Organization

### Static Assets
- **public/** - Static files served from root URL
  - Images
  - Fonts
  - Other static resources

---

## Testing Structure

### Test Organization
```
__tests__/
├── api/                      # Next.js API route tests
│   ├── twitter-callback.test.ts
│   └── linkedin-callback.test.ts
├── components/               # React component tests
│   ├── PostScheduler.test.tsx
│   ├── TemplateLibrary.test.tsx
│   └── ConnectionManager.test.tsx
├── convex/                   # Convex function tests
│   ├── posts.test.ts
│   ├── publishing.test.ts
│   ├── templates.test.ts
│   └── aiAssistant.test.ts
└── integration/              # End-to-end tests
    ├── auth.test.tsx
    ├── publishing-flow.test.ts
    └── post-history.test.ts
```

### Test Files in Source
Some tests live alongside source code:
- `convex/*.test.ts` - Convex function unit tests
- `components/features/__tests__/` - Feature component tests
- `lib/__tests__/` - Utility function tests

---

## Key Architectural Patterns

### 1. Monolith Structure
- Single codebase, no microservices
- Frontend and backend in same repository
- Convex handles backend (no separate API server)

### 2. Route-Based Code Splitting
- Next.js App Router automatically splits code by route
- Protected routes lazy-loaded after authentication
- Improved initial load time

### 3. Component Composition
- Small UI primitives (`components/ui/`)
- Composed into feature components (`components/features/`)
- Reusable across pages

### 4. Serverless Backend
- No backend server to manage
- Convex functions deployed independently
- Automatic scaling and caching

### 5. Scheduled Tasks
- **Convex Scheduler**: One-time scheduled functions (post publishing)
- **Convex Cron**: Recurring tasks (queue processing every 15 mins)

---

## File Naming Conventions

- **React Components**: PascalCase (`PostScheduler.tsx`, `Button.tsx`)
- **Convex Functions**: camelCase (`posts.ts`, `aiAssistant.ts`)
- **Utilities**: camelCase (`timeHelpers.ts`, `utils.ts`)
- **Tests**: Match source file with `.test` suffix (`posts.test.ts`)
- **Config Files**: kebab-case or dot-prefixed (`.env.local`, `next.config.ts`)

---

## Import Aliases

Configured in `tsconfig.json`:
- `@/*` → Root directory (e.g., `@/components`, `@/lib`)
- `convex/_generated/api` → Auto-generated Convex API exports

---

*Generated: 2025-11-12*
*Project: Social Post*
