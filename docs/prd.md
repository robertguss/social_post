# Social Posting Scheduler - Product Requirements Document

## Overview

### Product Vision

A self-hosted social media scheduling application built to eliminate expensive subscription costs while providing a tailored workflow for content repurposing across X/Twitter and LinkedIn.

### Target User

Solo content creator (initially single-user) who:

- Posts daily, scaling to multiple times per day
- Creates content in batches and spontaneously
- Repurposes content across platforms with platform-specific adaptations
- Starts with Twitter due to character constraints, then expands for LinkedIn

### Core Value Proposition

- Zero recurring subscription costs
- Custom-built for specific workflow needs
- Full control over scheduling and content management
- Built by engineer for engineer

---

## Technical Stack

- **Frontend**: Next.js, Tailwind CSS, shadcn/ui
- **Backend**: Convex (database + scheduled functions)
- **Authentication**: Clerk
- **Integrations**: X API, LinkedIn API, Telegram Bot API
- **Deployment**: Web-based, mobile-responsive

---

## Feature Prioritization

### MVP - Phase 1 (Must Have for Launch)

These are the absolute essentials to replace current paid tools:

#### 1. Authentication & Security

- Single-user authentication via Clerk
- Secure session management
- Protected routes

#### 2. Platform Connections

- OAuth flow for X/Twitter
- OAuth flow for LinkedIn
- Store API credentials securely
- Connection status indicator (active/needs re-auth)

#### 3. Post Creation & Scheduling

- Text input for post content
- Separate URL field for auto-commenting/threading
- Character counter with visual warnings
  - X: 280 characters (highlight at 260, error at 280)
  - LinkedIn: 3,000 characters
- Manual time selection for each platform
- Staggered posting (different times for X vs LinkedIn)
- Timezone: Local timezone only

#### 4. Post Management

- List view of all scheduled posts
- Edit scheduled posts
- Delete scheduled posts
- Reschedule posts (change time)
- Post status indicators:
  - Scheduled
  - Publishing
  - Published
  - Failed

#### 5. Post History

- View all published posts
- Search by date range
- Filter by platform

#### 6. Error Handling & Notifications

- Auto-retry failed posts (2-3 attempts)
- Telegram notification on final failure
- Display error messages in UI
- Manual retry option

#### 7. Core Publishing

- Publish text posts to X
- Publish text posts to LinkedIn
- Auto-post URL as first comment on LinkedIn
- Auto-post URL as reply in X thread
- Convex scheduled functions for timed publishing

---

### Phase 2 (Should Have Soon)

Features that significantly enhance usability but aren't blocking:

#### 1. Enhanced Views

- Calendar view (week and month)
- Visual schedule overview
- Drag-and-drop rescheduling in calendar

#### 2. Post Previews

- Real-time preview for X
- Real-time preview for LinkedIn
- LinkedIn "below the fold" indicator
  - Show first ~140 characters clearly
  - Indicate where "see more" appears

#### 3. Drafts System

- Save posts as drafts
- Draft management section
- Convert draft to scheduled post
- Edit drafts without scheduling

#### 4. Post Duplication

- One-click duplicate of existing posts
- Duplicate from scheduled posts
- Duplicate from post history
- Creates new draft by default

---

### Phase 3 (Nice to Have)

Features for long-term enhancement and scalability:

#### 1. Swipe File / Templates

- Create templates from successful posts
- Save examples from other creators
- Organize by:
  - Content type (hooks, threads, announcements, etc.)
  - Creator/source
  - Effectiveness rating
- Click template to pre-populate new draft
- Search and filter templates

#### 2. Content Organization

- Tags/categories for posts (e.g., "AI tips," "course promo")
- Bulk tagging
- Filter history by tags
- Tag-based analytics (what types you post most)

#### 3. Advanced Search & Filtering

- Full-text search in post history
- Filter by multiple criteria:
  - Date range
  - Platform
  - Status
  - Tags
  - Contains URL

#### 4. Analytics (Future)

- Basic post performance tracking
- Engagement metrics (if APIs allow)
- Best posting times analysis

---

## User Workflows

### Primary Workflow: Batch Content Creation

1. User drafts multiple posts in notes app
2. Opens scheduler app
3. For each piece of content:
   - Creates Twitter version first (working within 280 characters)
   - Expands content for LinkedIn version
   - Adds URL if applicable (same for both platforms)
   - Schedules Twitter post for specific time
   - Schedules LinkedIn post for staggered time (e.g., 30 mins later)
   - Reviews character counts and previews
   - Saves as scheduled post
4. Views calendar to ensure distribution looks good
5. App automatically publishes at scheduled times

### Secondary Workflow: Spontaneous Post Creation

1. User gets content idea
2. Opens scheduler app
3. Writes Twitter version
4. Expands for LinkedIn
5. Schedules both with staggered times
6. Continues work

### Tertiary Workflow: Using Templates

1. User browses swipe file
2. Finds relevant template/example
3. Clicks to populate new draft
4. Customizes for current topic
5. Schedules as normal

---

## Non-Functional Requirements

### Performance

- Schedule creation < 2 seconds
- Post publishing triggered within 30 seconds of scheduled time
- Calendar view loads < 1 second

### Reliability

- 99% uptime for scheduling service
- Auto-retry for transient API failures
- Graceful degradation if one platform API is down

### Usability

- Mobile-responsive design
- Keyboard shortcuts for power users
- Minimal clicks to schedule post

### Security

- Secure OAuth token storage
- HTTPS only
- Session timeouts
- No logging of post content

---

## API Integration Requirements

### X/Twitter API

- OAuth 2.0 authentication
- POST /2/tweets (create tweet)
- POST /2/tweets/:id/replies (for URL threading)
- Rate limit handling
- Error handling for:
  - Duplicate content
  - Rate limits
  - Authentication failures

### LinkedIn API

- OAuth 2.0 authentication
- POST /v2/ugcPosts (create post)
- POST /v2/socialActions/:urn/comments (for URL commenting)
- Rate limit handling
- Error handling for:
  - Invalid content
  - Rate limits
  - Authentication failures

### Telegram API

- Bot token authentication
- sendMessage for failure notifications
- Simple webhook or polling setup

---

## Data Models

### Post

```
{
  id: string
  userId: string
  status: "draft" | "scheduled" | "publishing" | "published" | "failed"

  twitterContent: string
  linkedInContent: string
  url?: string

  twitterScheduledTime?: timestamp
  linkedInScheduledTime?: timestamp

  twitterPublishedTime?: timestamp
  linkedInPublishedTime?: timestamp

  twitterPostId?: string
  linkedInPostId?: string

  tags?: string[]
  category?: string

  errorMessage?: string
  retryCount?: number

  createdAt: timestamp
  updatedAt: timestamp
}
```

### Template (Phase 3)

```
{
  id: string
  userId: string
  title: string
  content: string
  platform: "twitter" | "linkedin" | "both"
  contentType: string (hook, thread, announcement, etc.)
  creator?: string
  effectiveness?: 1-5 rating
  notes?: string
  createdAt: timestamp
}
```

### UserConnection

```
{
  id: string
  userId: string
  platform: "twitter" | "linkedin"
  accessToken: string (encrypted)
  refreshToken: string (encrypted)
  expiresAt: timestamp
  status: "active" | "expired" | "revoked"
  lastChecked: timestamp
}
```

---

## Success Metrics

### MVP Success Criteria

- Can schedule 7+ posts per week
- Successfully publishes 95%+ of scheduled posts
- Zero subscription costs
- Can replace current paid tool completely

### Phase 2 Success Criteria

- Drafts feature reduces scheduling time by 30%
- Calendar view used in 80%+ of sessions
- Preview feature catches formatting issues before publishing

### Phase 3 Success Criteria

- Swipe file has 20+ templates
- Templates used for 40%+ of posts
- Search used regularly to find past content

---

## Future Considerations (Not Prioritized)

- Multi-user support
- Team collaboration features
- Content approval workflows
- Instagram/Facebook integration
- Image/video support
- AI-powered features (content suggestions, optimal timing)
- Analytics dashboard
- A/B testing
- Bulk import from spreadsheet
- Browser extension for capturing content ideas
- Mobile apps (native iOS/Android)

---

## Launch Checklist

### Pre-Launch (MVP)

- [ ] Set up Next.js + Convex + Clerk
- [ ] Implement authentication
- [ ] Build X OAuth flow
- [ ] Build LinkedIn OAuth flow
- [ ] Create post scheduling UI
- [ ] Implement Convex scheduled functions
- [ ] Build post publishing logic
- [ ] Add URL auto-commenting/threading
- [ ] Implement error handling + retries
- [ ] Set up Telegram notifications
- [ ] Build post management (edit/delete/reschedule)
- [ ] Create list view
- [ ] Add post history
- [ ] Test end-to-end workflow
- [ ] Deploy to production
- [ ] Monitor first week of scheduled posts

### Post-Launch (Phase 2)

- [ ] Add calendar view
- [ ] Build post previews
- [ ] Implement LinkedIn fold indicator
- [ ] Create drafts system
- [ ] Add post duplication

### Later (Phase 3)

- [ ] Build swipe file
- [ ] Add tags/categories
- [ ] Implement advanced search
- [ ] Consider analytics

---

## Open Questions

1. Should failed posts automatically reschedule for X hours later, or require manual intervention?
2. What's the maximum number of retries before giving up? (Current: 2-3)
3. Should the app archive old posts after X days/months?
4. Do we need export functionality (CSV, JSON) for post history?
5. Should there be a "queue" mode where posts auto-schedule at optimal times?

---

## Notes

- Keep UI simple and fast - this is a productivity tool
- Avoid feature creep - resist adding complexity until core workflow is solid
- Consider each feature's impact on the primary workflow
- Mobile usage is secondary but should be functional
- This is a tool, not a product (initially) - build for speed and utility
