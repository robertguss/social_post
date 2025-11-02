# Changelog

All notable changes to the Social Posting Scheduler project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Image and video attachment support
- Post analytics and insights
- Bulk scheduling from CSV import
- Browser extension for quick scheduling
- Support for additional platforms (Mastodon, Bluesky)
- Recurring post scheduling

---

## [1.0.0] - 2025-01-15

### Added - Initial Release

#### Core Features
- **Multi-Platform Scheduling**: Schedule posts to X/Twitter and LinkedIn with platform-specific content
- **Staggered Posting**: Set different publish times for each platform
- **URL Auto-Posting**: Automatically post URLs as replies (Twitter) or comments (LinkedIn)
- **Smart Retry Logic**: Automatic retry with exponential backoff for failed posts (3 retries max)
- **Real-Time Updates**: Reactive UI updates powered by Convex subscriptions

#### Template System
- Create and manage reusable content templates
- Tag-based template organization
- Template usage tracking (usage count, last used date)
- Template picker modal in post scheduler
- Alphabetically sorted template library

#### OAuth Integration
- X/Twitter OAuth 2.0 connection with token management
- LinkedIn OAuth 2.0 connection with OpenID Connect
- Automatic LinkedIn token refresh (60-day validity)
- Connection status indicators (Connected, Needs Reauth, Not Connected)
- Secure token storage with AES-256-GCM encryption

#### Dashboard & Analytics
- Dashboard metrics: Total posts, Scheduled, Published, Failed, Connected platforms
- Recent activity feed (10 most recent posts)
- Post history with filtering by platform and date range
- Visual post activity charts with platform breakdown

#### Publishing Infrastructure
- Convex scheduled functions for timed publishing
- Twitter API v2 integration with thread support
- LinkedIn UGC API integration with comment support
- Error classification (transient vs permanent)
- Exponential backoff retry strategy (1min, 2min, 4min delays)
- Telegram failure notifications with detailed error messages

#### Security
- AES-256-GCM encryption for OAuth tokens
- Clerk authentication integration
- User data isolation via `clerkUserId`
- Encrypted token storage in Convex database
- Token migration utility for existing plain-text tokens

#### User Interface
- Mobile-responsive design with Tailwind CSS 4
- shadcn/ui component library integration
- Dark mode support
- Real-time character counting with visual feedback
- Date/time picker for scheduling
- Sidebar navigation with active states
- Toast notifications for user feedback

#### Developer Experience
- TypeScript throughout (Next.js 15.5.4 + React 19)
- Convex backend with type-safe functions
- Comprehensive test suite (Jest + Vitest)
- ESLint configuration with Convex rules
- Development scripts for parallel frontend/backend
- Detailed logging in Convex functions

#### Documentation
- Comprehensive README with quick start guide
- Complete API Reference for all Convex functions
- Architecture diagrams with Mermaid
- User Guide with step-by-step instructions
- Developer Guide with coding standards
- Deployment Guide for production setup
- Existing PRD and architecture documents

### Technical Details

#### Database Schema
- **posts**: Scheduled and published content with status tracking
  - Index: `by_user` on `[clerkUserId]`
- **user_connections**: Encrypted OAuth tokens per platform
  - Index: `by_user_platform` on `[clerkUserId, platform]`
- **templates**: Reusable content templates with tags
  - Index: `by_user` on `[clerkUserId]`

#### API Endpoints
- OAuth callback routes for Twitter and LinkedIn
- Health check endpoint for monitoring
- Clerk webhook support (infrastructure)

#### Environment Configuration
- Clerk authentication (development and production)
- Convex deployment URLs
- Twitter OAuth credentials
- LinkedIn OAuth credentials
- Encryption key (32-byte AES-256)
- Telegram bot configuration (optional)

---

## [0.3.0] - 2024-11-01

### Added
- Template library feature (Epic 3.0)
- Template CRUD operations (create, read, update, delete)
- Template picker modal in post scheduler
- Template usage analytics
- Tag-based filtering system
- Template form validation

### Changed
- Enhanced post scheduler UI with template integration
- Improved database schema with templates table
- Updated test suite with template coverage

### Fixed
- Template name uniqueness validation
- Character counting edge cases
- Template insertion cursor position

---

## [0.2.0] - 2024-10-15

### Added
- LinkedIn publishing support
- Token refresh mechanism for LinkedIn (60-day validity)
- LinkedIn-specific content field (3,000 character limit)
- LinkedIn UGC post and comment APIs
- Connection status monitoring

### Changed
- Updated schema to support dual-platform posts
- Enhanced publishing workflow to handle both platforms
- Improved error messages for platform-specific failures

### Fixed
- LinkedIn token expiration handling
- Person ID retrieval using OpenID Connect
- Comment posting on LinkedIn UGC posts

---

## [0.1.0] - 2024-10-01

### Added - MVP Release

#### Initial Features
- Twitter post scheduling with OAuth 2.0
- Basic post CRUD operations
- Post status tracking (Scheduled, Publishing, Published, Failed)
- Scheduled function execution via Convex
- Character limit validation (280 characters)
- Date/time picker for scheduling
- Post history view
- Dashboard with basic metrics

#### Infrastructure
- Next.js 15.5.4 with App Router
- Convex backend setup
- Clerk authentication integration
- Vercel deployment configuration
- Environment variable management

#### Security
- Token encryption implementation
- User authentication via Clerk
- Data isolation per user

#### Developer Setup
- Development environment configuration
- Testing framework setup (Jest)
- ESLint and Prettier configuration
- TypeScript configuration
- Git repository initialization

---

## Version History Summary

| Version | Release Date | Key Features |
|---------|-------------|--------------|
| **1.0.0** | 2025-01-15 | Full production release with templates, dual-platform support, comprehensive docs |
| **0.3.0** | 2024-11-01 | Template library system |
| **0.2.0** | 2024-10-15 | LinkedIn integration and token refresh |
| **0.1.0** | 2024-10-01 | MVP with Twitter scheduling |

---

## Release Notes Guidelines

### Version Numbering (Semantic Versioning)

- **MAJOR** (X.0.0): Breaking changes, major rewrites, or significant architectural changes
- **MINOR** (0.X.0): New features, non-breaking additions
- **PATCH** (0.0.X): Bug fixes, minor improvements, security patches

### Changelog Categories

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Features that will be removed in future versions
- **Removed**: Features that have been removed
- **Fixed**: Bug fixes
- **Security**: Security fixes and improvements

### Migration Guides

When upgrading between major versions, refer to:
- Migration guides in `/docs/migrations/`
- Breaking changes section in release notes
- API compatibility matrix

---

## Contributing

When contributing, please:
1. Update this CHANGELOG.md with your changes under `[Unreleased]`
2. Follow the Keep a Changelog format
3. Include issue/PR references where applicable
4. Use clear, concise descriptions
5. Categorize changes appropriately

Example:
```markdown
### Added
- New feature description (#123)

### Fixed
- Bug fix description (#124)
```

---

## Links

- [Project Repository](https://github.com/yourusername/social_post)
- [Documentation](https://github.com/yourusername/social_post/tree/main/docs)
- [Issue Tracker](https://github.com/yourusername/social_post/issues)
- [Releases](https://github.com/yourusername/social_post/releases)

---

## Support

For questions or support:
- Open an issue on GitHub
- Check the documentation in `/docs`
- Join discussions in GitHub Discussions
- Review the User Guide for common questions

---

**Note**: Dates are in YYYY-MM-DD format following ISO 8601.
