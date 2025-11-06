# Social Posting Scheduler - Better Auth Migration PRD

## Intro Project Analysis and Context

### 1.1 Existing Project Overview

#### Analysis Source
✅ **IDE-based fresh analysis** - Project files available and analyzed

#### Current Project State

**Social Posting Scheduler** is a self-hosted, single-user social media scheduling application for X/Twitter and LinkedIn. The application is built with:

- **Frontend**: Next.js 15.5.4 (App Router), React 19, Tailwind CSS 4
- **Backend**: Convex (database, queries, mutations, scheduled actions)
- **Current Auth**: Clerk (single-user authentication)
- **Language**: TypeScript throughout

**Core Functionality**:
- Schedule posts for X/Twitter and LinkedIn with platform-specific content
- Automated publishing at scheduled times via Convex scheduled functions
- Draft management with content pre-population
- Recurring post queues for content recycling
- Templates for reusable content
- Analytics and posting time recommendations
- User preference management

**Current Authentication Architecture**:
- Clerk handles authentication on frontend via `middleware.ts`
- Protected routes: `/server`, `/settings`, `/schedule`, `/history`, `/dashboard`, `/insights`
- Convex functions verify users with `ctx.auth.getUserIdentity()`
- All data scoped to `clerkUserId` field in 8 database tables
- Convex integration via `ConvexProviderWithClerk` and `convex/auth.config.ts`

### 1.2 Available Documentation Analysis

#### Available Documentation
✅ **CLAUDE.md** - Comprehensive project documentation including:
- Architecture overview and critical patterns
- Data models and schema design
- Convex function patterns and authentication flow
- External API integration requirements
- Security requirements

✅ **Convex Schema** (`convex/schema.ts`) - Complete database schema with 8 tables all using `clerkUserId`

✅ **Implementation Files**:
- `middleware.ts` - Clerk route protection
- `convex/auth.config.ts` - Clerk JWT configuration
- `app/layout.tsx` - ClerkProvider setup
- `components/ConvexClientProvider.tsx` - Convex+Clerk integration

**Documentation Status**: ✅ Sufficient for proceeding with PRD

### 1.3 Enhancement Scope Definition

#### Enhancement Type
✅ **Technology Stack Upgrade** - Replacing Clerk authentication with Better Auth

#### Enhancement Description

Replace Clerk authentication system with Better Auth across the entire application stack. This involves migrating from Clerk's proprietary authentication to Better Auth, which Convex officially supports via the `@convex-dev/better-auth` integration. The migration will maintain all existing functionality while potentially simplifying the authentication architecture and reducing vendor lock-in.

#### Impact Assessment
✅ **Major Impact (architectural changes required)**

**Rationale**: This enhancement affects:
- All 8 database tables (migration from `clerkUserId` to Better Auth user IDs)
- All Convex functions (17 files using `ctx.auth.getUserIdentity()`)
- Frontend authentication providers and middleware
- Scheduled functions that rely on user identity
- Existing user data requiring migration

**CRITICAL CONSTRAINT**: Development-only environment with single user - breaking changes and data loss acceptable, enabling clean replacement strategy.

### 1.4 Goals and Background Context

#### Goals

- Replace Clerk with Better Auth without requiring data migration complexity
- Maintain all existing authentication and authorization patterns
- Preserve single-user application architecture with proper user scoping
- Ensure scheduled posts continue functioning after migration
- Reduce vendor lock-in and simplify authentication architecture
- Leverage Convex's official Better Auth integration for better ecosystem compatibility
- Maintain self-hosted architecture philosophy

#### Background Context

The application currently uses Clerk for authentication, which works well but creates vendor lock-in and adds complexity through its proprietary integration. Convex now officially supports Better Auth through the `@convex-dev/better-auth` package (https://github.com/get-convex/better-auth), offering a more open, TypeScript-first authentication solution.

Better Auth is a comprehensive authentication framework for TypeScript that supports email/password, social OAuth, two-factor authentication, and multi-tenant features. It's framework-agnostic and designed for ease of implementation. The migration to Better Auth will align the application with Convex's evolving ecosystem while maintaining the same security and functionality standards.

This migration is strategically important as it:
1. Reduces dependency on proprietary authentication services
2. Simplifies the authentication stack with native Convex integration
3. Provides more control over authentication logic and user data
4. Maintains self-hosted architecture philosophy

**Development Context**: Application is in active development with single user (developer only), allowing for breaking changes and schema modifications without migration concerns.

#### Change Log

| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|--------|
| Initial Draft | 2025-11-05 | 1.0 | Better Auth migration PRD created | John (PM Agent) |

---

