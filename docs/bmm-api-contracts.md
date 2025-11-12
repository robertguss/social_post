# API Contracts

## Overview

The Social Post application uses two primary API layers:
1. **Convex Backend Functions** - Query, mutation, and action functions for data operations
2. **Next.js API Routes** - OAuth callback handlers and auth endpoints

---

## Convex Backend API

### Posts Management

#### `createPost` (mutation)
- **Purpose**: Create a new scheduled or draft post
- **Access**: Authenticated users
- **Input**: Post content, scheduling times, platform selection
- **Returns**: Post ID
- **Triggers**: Scheduler for publishing at specified times

#### `updatePost` (mutation)
- **Purpose**: Edit an existing post
- **Access**: Post owner only
- **Input**: Post ID, updated fields
- **Returns**: Success status

#### `deletePost` (mutation)
- **Purpose**: Delete a post and cancel scheduled publishing
- **Access**: Post owner only
- **Input**: Post ID
- **Side Effects**: Cancels scheduled functions

#### `clonePost` (mutation)
- **Purpose**: Clone an existing post for reuse
- **Input**: Original post ID
- **Returns**: New post ID

#### `getPosts` (query)
- **Purpose**: Fetch user's posts with status filtering
- **Access**: Authenticated users
- **Input**: Optional status filter
- **Returns**: Array of posts

#### `getPost` (query)
- **Purpose**: Fetch single post by ID
- **Returns**: Post object or null

### Publishing & Scheduling

#### `publishTwitterPost` (internalAction)
- **Purpose**: Publish content to Twitter/X API
- **Trigger**: Scheduled function execution
- **External API**: Twitter API v2 POST /tweets
- **Side Effects**: Updates post status, stores post ID
- **Error Handling**: Retry logic with exponential backoff

#### `publishLinkedInPost` (internalAction)
- **Purpose**: Publish content to LinkedIn API
- **Trigger**: Scheduled function execution
- **External API**: LinkedIn API POST /v2/ugcPosts
- **Side Effects**: Updates post status, URL comment posting
- **Error Handling**: Retry logic with exponential backoff

### OAuth Connections

#### `saveConnection` (action)
- **Purpose**: Store encrypted OAuth tokens
- **Input**: Platform, access token, refresh token, expiry
- **Security**: Tokens encrypted before storage
- **Returns**: Success status

#### `getConnectionStatus` (query)
- **Purpose**: Check if user has connected a platform
- **Input**: Platform name
- **Returns**: Boolean connection status

#### `getDecryptedConnection` (internalAction)
- **Purpose**: Retrieve and decrypt OAuth tokens for API calls
- **Access**: Internal only
- **Security**: Decrypts tokens in action runtime

### Templates

#### `createTemplate` (mutation)
- **Purpose**: Save reusable content template
- **Input**: Name, content, tags
- **Returns**: Template ID

#### `updateTemplate` (mutation)
- **Purpose**: Edit existing template
- **Input**: Template ID, updated fields

#### `deleteTemplate` (mutation)
- **Purpose**: Remove template
- **Input**: Template ID

#### `getTemplates` (query)
- **Purpose**: Fetch user's templates
- **Returns**: Array of templates with usage stats

#### `incrementTemplateUsage` (mutation)
- **Purpose**: Track template usage statistics
- **Input**: Template ID

### Recurring Queues

#### `createQueue` (mutation)
- **Purpose**: Create recurring post schedule
- **Input**: Original post ID, interval (days), max executions
- **Returns**: Queue ID

#### `updateQueue` (mutation)
- **Purpose**: Modify queue settings
- **Input**: Queue ID, updated fields

#### `deleteQueue` (mutation)
- **Purpose**: Delete recurring queue

#### `pauseQueue` (mutation)
- **Purpose**: Temporarily stop queue execution

#### `resumeQueue` (mutation)
- **Purpose**: Resume paused queue

#### `getQueues` (query)
- **Purpose**: Fetch user's recurring queues
- **Returns**: Array of queues with status

#### `detectSchedulingConflicts` (query)
- **Purpose**: Check for overlapping scheduled posts
- **Input**: Proposed schedule time
- **Returns**: Array of conflicting posts

#### `processQueues` (internalMutation)
- **Purpose**: Process due queues and create new posts
- **Trigger**: Cron job every 15 minutes
- **Side Effects**: Creates new posts from queue templates

### AI Assistant

#### `adjustTone` (action)
- **Purpose**: AI tone adjustment for content
- **Input**: Content, target tone (professional, casual, etc.)
- **External API**: Google Gemini AI
- **Rate Limits**: Enforced per user
- **Returns**: Adjusted content

#### `expandForLinkedIn` (action)
- **Purpose**: Expand Twitter content for LinkedIn
- **Input**: Twitter content (280 chars)
- **External API**: Google Gemini AI
- **Returns**: Expanded LinkedIn content (up to 3000 chars)

#### `generateHashtags` (action)
- **Purpose**: Generate relevant hashtags
- **Input**: Post content
- **External API**: Google Gemini AI
- **Returns**: Array of hashtag suggestions

### AI Usage Tracking

#### `logAIUsage` (internalMutation)
- **Purpose**: Record AI API usage for rate limiting
- **Input**: User ID, feature, tokens, cost, duration
- **Automatic**: Called by all AI actions

#### `getRateLimitStatus` (internalQuery)
- **Purpose**: Check if user is within rate limits
- **Returns**: Daily/monthly usage vs limits

#### `getUserUsageStats` (query)
- **Purpose**: Get user's AI usage statistics
- **Returns**: Token usage, costs, request counts

#### `getAdminUsageStats` (query)
- **Purpose**: Admin-only system-wide AI usage stats
- **Access**: Admin users only
- **Returns**: Aggregated usage data

### AI Feedback

#### `submitAIFeedback` (mutation)
- **Purpose**: Report AI content quality issues
- **Input**: Feature, request ID, feedback type, optional text
- **Use Case**: User flags inappropriate/low-quality AI output

### Analytics

#### `fetchEngagementMetrics` (action)
- **Purpose**: Fetch post performance from platform APIs
- **External API**: Twitter/LinkedIn analytics APIs
- **Returns**: Likes, shares, comments, impressions
- **Note**: Feature currently inactive pending API access

#### `getPerformanceInsights` (action)
- **Purpose**: Analyze posting performance trends
- **Returns**: Best times, engagement patterns, recommendations

#### `scheduledMetricsFetch` (internalAction)
- **Purpose**: Automated metrics collection
- **Trigger**: Scheduled function
- **Note**: Currently disabled

### Dashboard

#### `getDashboardStats` (query)
- **Purpose**: Overview statistics for dashboard
- **Returns**: Total posts, scheduled count, published count, platform stats

#### `getRecentPosts` (query)
- **Purpose**: Recent posts for dashboard feed
- **Input**: Optional limit
- **Returns**: Array of recent posts

### Drafts

#### `saveDraft` (mutation)
- **Purpose**: Save post as draft
- **Input**: Draft content, platform enables
- **Returns**: Draft ID

#### `getDrafts` (query)
- **Purpose**: Fetch user's drafts
- **Returns**: Array of drafts

#### `getDraftById` (query)
- **Purpose**: Fetch specific draft
- **Returns**: Draft object

#### `deleteDraft` (mutation)
- **Purpose**: Delete draft
- **Input**: Draft ID

### User Preferences

#### `getUserPreferences` (query)
- **Purpose**: Get user settings
- **Returns**: Preference object

#### `updateUserPreferences` (mutation)
- **Purpose**: Update user settings
- **Input**: Preference fields

### Posting Preferences

#### `setPostingPreference` (mutation)
- **Purpose**: Set custom posting time preferences
- **Input**: Platform, day of week, time ranges

#### `deletePostingPreference` (mutation)
- **Purpose**: Remove custom time preference

#### `resetAllPostingPreferences` (mutation)
- **Purpose**: Clear all custom preferences

#### `getPostingPreferences` (query)
- **Purpose**: Get user's posting time preferences
- **Returns**: Array of preferences by platform/day

### Time Recommendations

#### `getRecommendedTimes` (query)
- **Purpose**: Get optimal posting times
- **Input**: Platform, day of week
- **Returns**: Research-based time recommendations
- **Merges**: System recommendations + user custom preferences

### Authentication

#### `getCurrentUser` (query)
- **Purpose**: Get authenticated user info
- **Returns**: User object from Better Auth

---

## Next.js API Routes

### Authentication Routes

#### `POST /api/auth/[...all]`
- **Purpose**: Better Auth catch-all route
- **Handles**: Login, signup, session management
- **Provider**: Better Auth library

#### `GET /api/auth/twitter/callback`
- **Purpose**: OAuth callback for Twitter/X
- **Flow**: Receives auth code → exchanges for tokens → stores encrypted tokens
- **Redirect**: Back to connections page

#### `GET /api/auth/linkedin/callback`
- **Purpose**: OAuth callback for LinkedIn
- **Flow**: Receives auth code → exchanges for tokens → stores encrypted tokens
- **Redirect**: Back to connections page

---

## Authentication Flow

1. User initiates OAuth connection
2. Redirect to Twitter/LinkedIn authorization
3. Platform redirects to callback route
4. Callback exchanges code for tokens
5. Tokens encrypted via Convex action
6. Stored in `user_connections` table
7. User redirected to app

---

## Error Handling

### Convex Functions
- All mutations/queries validate user authentication
- User ID scoping prevents cross-user data access
- Errors return descriptive messages
- Critical operations have retry logic

### Publishing Actions
- Automatic retry (2-3 attempts) with exponential backoff
- Error status stored in post record
- Telegram notification on final failure
- Error messages logged for debugging

### Rate Limiting
- AI actions enforce daily/monthly limits
- Returns 429-style error when exceeded
- Usage tracked automatically

---

## Security Considerations

- OAuth tokens encrypted at rest
- All Convex functions verify authentication
- User ID scoping on all data operations
- Environment variables for API keys
- No sensitive data in client bundles
- HTTPS required for all API communication

---

## Integration Points

### External APIs
- **Twitter API v2**: POST /tweets, threading
- **LinkedIn API v2**: POST /ugcPosts, comments
- **Google Gemini AI**: Content generation
- **Telegram Bot API**: Failure notifications (future)

### Internal Integration
- **Convex Scheduler**: Timed post publishing
- **Convex Cron**: Queue processing every 15 mins
- **Better Auth**: Session management

---

## Testing

Test files located in:
- `convex/*.test.ts` - Unit tests for Convex functions
- `__tests__/api/*.ts` - API integration tests
- `components/features/__tests__/*.tsx` - Component tests

---

*Generated: 2025-11-12*
*Project: Social Post*
