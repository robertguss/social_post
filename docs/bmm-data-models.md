# Data Models

## Overview

The Social Post application uses **Convex** as its database. The schema is defined in `convex/schema.ts` using Convex's type-safe schema definition.

---

## Database Tables

### `posts`

**Purpose**: Stores scheduled and published social media content

**Fields**:
- `userId` (string) - Better Auth user ID
- `status` (string) - Post lifecycle: "draft" | "scheduled" | "publishing" | "published" | "failed"
- `twitterContent` (optional string) - Twitter post text (max 280 chars)
- `linkedInContent` (optional string) - LinkedIn post text (max 3000 chars)
- `twitterScheduledTime` (optional number) - Unix timestamp (ms) for Twitter publishing
- `linkedInScheduledTime` (optional number) - Unix timestamp (ms) for LinkedIn publishing
- `twitterSchedulerId` (optional ID) - Reference to scheduled function for Twitter
- `linkedInSchedulerId` (optional ID) - Reference to scheduled function for LinkedIn
- `url` (optional string) - URL to post as comment after main post
- `errorMessage` (optional string) - Error details if publishing failed
- `retryCount` (optional number) - Number of retry attempts
- `twitterPostId` (optional string) - Twitter post ID after successful publish
- `linkedInPostId` (optional string) - LinkedIn post ID after successful publish
- `clonedFromPostId` (optional ID) - Reference to original post if cloned
- `createdByQueueId` (optional ID) - Reference to recurring queue if auto-created
- `twitterEnabled` (optional boolean) - Track platform selection in drafts
- `linkedInEnabled` (optional boolean) - Track platform selection in drafts
- `lastEditedTime` (optional number) - Timestamp for draft tracking

**Indexes**:
- `by_user` on `[userId]` - Fast lookup of all posts for a user
- `by_user_status` on `[userId, status]` - Filter posts by status

**System Fields** (auto-generated):
- `_id` - Unique document ID
- `_creationTime` - Automatic timestamp

**Relationships**:
- One-to-many with `recurring_queues` (posts created from queue)
- Self-referencing (cloned posts)

---

### `user_connections`

**Purpose**: Stores encrypted OAuth tokens for Twitter and LinkedIn

**Fields**:
- `userId` (string) - Better Auth user ID
- `platform` (string) - "twitter" | "linkedin"
- `accessToken` (string) - OAuth access token (ENCRYPTED)
- `refreshToken` (string) - OAuth refresh token (ENCRYPTED)
- `expiresAt` (number) - Unix timestamp (ms) for token expiration

**Indexes**:
- `by_user_platform` on `[userId, platform]` - Unique lookup per user per platform

**Security**:
- All tokens encrypted via internal action before storage
- Decryption only in internal actions, never exposed to client

---

### `templates`

**Purpose**: Stores reusable content templates

**Fields**:
- `userId` (string) - Template owner
- `name` (string) - Unique template name per user
- `content` (string) - Template text content
- `tags` (array of strings) - Categorization tags (e.g., ["hashtags", "closing"])
- `lastUsedAt` (optional number) - Timestamp of last usage
- `usageCount` (number) - Number of times template has been used (default 0)

**Indexes**:
- `by_user` on `[userId]` - Fast lookup of user's templates

---

### `recurring_queues`

**Purpose**: Stores recurring post schedules for automated content recycling

**Fields**:
- `userId` (string) - Queue owner
- `originalPostId` (ID) - Reference to post template
- `status` (string) - "active" | "paused" | "completed"
- `interval` (number) - Days between executions
- `nextScheduledTime` (number) - Unix timestamp (ms) for next execution
- `lastExecutedTime` (optional number) - Unix timestamp (ms) of last execution
- `executionCount` (number) - Total executions
- `maxExecutions` (optional number) - Max executions before auto-completion (null = infinite)

**Indexes**:
- `by_user_status` on `[userId, status]` - Filter user's queues by status
- `by_next_scheduled` on `[nextScheduledTime]` - Find due queues for cron processing
- `by_status_next_scheduled` on `[status, nextScheduledTime]` - Efficient cron queries

**Processing**:
- Cron job runs every 15 minutes
- Creates new posts from queue template when due
- Updates `nextScheduledTime` and `executionCount`

---

### `user_preferences`

**Purpose**: Stores user-specific application settings

**Fields**:
- `userId` (string) - Preference owner
- `enableContentPrePopulation` (boolean) - Smart content pre-fill from Twitter to LinkedIn (default: true)

**Indexes**:
- `by_user` on `[userId]` - Fast lookup of user preferences

**Future**: Additional preference fields can be added

---

### `posting_preferences`

**Purpose**: User-defined custom posting time preferences (override system recommendations)

**Fields**:
- `userId` (string) - Preference owner
- `platform` (string) - "twitter" | "linkedin"
- `dayOfWeek` (number) - 0-6 (Sunday=0, Saturday=6)
- `customTimeRanges` (array of objects):
  - `startHour` (number) - 0-23 in user's local timezone
  - `endHour` (number) - 0-23 in user's local timezone

**Indexes**:
- `by_user_platform` on `[userId, platform]`
- `by_user_platform_day` on `[userId, platform, dayOfWeek]`

**Note**: Times stored in user's local timezone (unlike system recommendations which use UTC)

---

### `posting_time_recommendations`

**Purpose**: System-wide optimal posting time recommendations based on research

**Fields**:
- `platform` (string) - "twitter" | "linkedin"
- `dayOfWeek` (number) - 0-6 (Sunday=0, Saturday=6)
- `hourRanges` (array of objects):
  - `startHour` (number) - 0-23 in UTC
  - `endHour` (number) - 0-23 in UTC
- `engagementScore` (number) - Normalized 0-100 expected engagement
- `source` (string) - "industry research" | "user data"

**Indexes**:
- `by_platform_day` on `[platform, dayOfWeek]`

**Note**: System-wide data, not user-scoped. Seeded with industry research data.

---

### `post_performance`

**Purpose**: Historical engagement metrics for published posts

**Status**: Schema defined but feature inactive (requires Twitter/LinkedIn analytics API access)

**Fields**:
- `postId` (ID) - Reference to published post
- `platform` (string) - "twitter" | "linkedin"
- `publishedTime` (number) - Unix timestamp (ms) when published
- `engagementMetrics` (object):
  - `likes` (number)
  - `shares` (number)
  - `comments` (number)
  - `impressions` (optional number)
- `fetchedAt` (number) - Unix timestamp (ms) when metrics fetched

**Indexes**:
- `by_post` on `[postId]` - Lookup metrics for specific post
- `by_platform_time` on `[platform, publishedTime]` - Time-of-day analysis

**Future Use**: Learning optimal posting times from actual performance data

---

### `ai_feedback`

**Purpose**: User feedback about AI-generated content quality

**Fields**:
- `userId` (string) - Feedback submitter
- `feature` (string) - "tone" | "expand" | "hashtags"
- `requestId` (string) - Correlation ID from AI request logs
- `originalContent` (string) - User's original content
- `aiResponse` (string) - AI-generated content being reported
- `feedbackType` (string) - "inappropriate" | "low-quality" | "other"
- `feedbackText` (optional string) - User-provided details
- `timestamp` (number) - Unix timestamp (ms)

**Indexes**:
- `by_user` on `[userId]`
- `by_feature` on `[feature]`
- `by_timestamp` on `[timestamp]`

**Purpose**: Monitor AI quality, improve prompts, identify issues

---

### `ai_usage_logs`

**Purpose**: Gemini AI usage tracking for rate limiting and cost monitoring

**Fields**:
- `userId` (string) - Request maker
- `timestamp` (number) - Unix timestamp (ms)
- `feature` (string) - "tone" | "expand" | "hashtags"
- `tokensUsed` (number) - Estimated token consumption
- `cost` (number) - Estimated cost in USD
- `modelUsed` (string) - Gemini model name (e.g., "gemini-2.5-flash")
- `requestId` (string) - Correlation ID for debugging
- `duration` (number) - Request duration in ms
- `success` (boolean) - Success/failure status

**Indexes**:
- `by_user` on `[userId]` - User-specific lookups
- `by_timestamp` on `[timestamp]` - Chronological queries
- `by_user_timestamp` on `[userId, timestamp]` - User-scoped time ranges
- `by_feature` on `[feature]` - Feature-specific aggregation

**Rate Limits**:
- Daily token limit: 50,000 per user
- Monthly token limit: 500,000 per user
- Enforced before AI action execution

---

## Data Relationships

```
users (Better Auth)
  ↓ (1:many)
  ├─ posts
  │   ↓ (self-referencing)
  │   └─ clonedFromPostId → posts
  ├─ user_connections
  ├─ templates
  ├─ recurring_queues
  │   └─ originalPostId → posts
  │   └─ creates → posts (via cron)
  ├─ user_preferences
  ├─ posting_preferences
  ├─ ai_feedback
  └─ ai_usage_logs

posts
  └─ (1:many) post_performance

recurring_queues
  └─ originalPostId → posts
  └─ creates → posts (createdByQueueId)

posting_time_recommendations (system-wide, not user-scoped)
```

---

## Key Design Patterns

### User Scoping
- All user data tables have `userId` field
- All queries filter by authenticated user's ID
- Prevents cross-user data access

### Encryption
- OAuth tokens encrypted before storage
- Decryption only in internal actions
- Never exposed to client

### Timestamps
- All times stored as Unix timestamps in milliseconds
- Convex auto-generates `_creationTime` for all documents
- Posting preferences use local timezone
- System recommendations use UTC

### Scheduled Functions
- Post creation stores scheduler IDs in post document
- Allows cancellation when post is edited/deleted
- Scheduler IDs reference Convex's `_scheduled_functions` table

### Cron Processing
- Recurring queues processed every 15 minutes
- Queries by `status` and `nextScheduledTime` indexes
- Creates new posts and updates queue state atomically

---

## Schema Validation

Convex enforces schema validation at runtime:
- Type safety via TypeScript
- Required fields validated automatically
- Optional fields use `v.optional()`
- Arrays and objects have nested validation
- ID references validated (e.g., `v.id("posts")`)

---

## Migration Strategy

Schema changes are handled via Convex's migration approach:
1. Add new optional fields to schema
2. Deploy schema change
3. Backfill data via mutation if needed
4. Make field required in future version if desired

No traditional SQL migrations needed.

---

## Indexes and Performance

### Query Patterns
- All user data queries use `by_user` or `by_user_*` indexes
- Status filtering uses compound indexes (e.g., `by_user_status`)
- Time-based queries use timestamp indexes
- Cron jobs use specialized indexes (e.g., `by_status_next_scheduled`)

### Optimization
- Compound indexes reduce query time
- User scoping prevents full table scans
- Convex handles index maintenance automatically

---

*Generated: 2025-11-12*
*Project: Social Post*
