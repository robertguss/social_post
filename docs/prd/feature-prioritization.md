# Feature Prioritization

## MVP - Phase 1 (Must Have for Launch)

These are the absolute essentials to replace current paid tools:

### 1. Authentication & Security

- Single-user authentication via Clerk
- Secure session management
- Protected routes

### 2. Platform Connections

- OAuth flow for X/Twitter
- OAuth flow for LinkedIn
- Store API credentials securely
- Connection status indicator (active/needs re-auth)

### 3. Post Creation & Scheduling

- Text input for post content
- Separate URL field for auto-commenting/threading
- Character counter with visual warnings
  - X: 280 characters (highlight at 260, error at 280)
  - LinkedIn: 3,000 characters
- Manual time selection for each platform
- Staggered posting (different times for X vs LinkedIn)
- Timezone: Local timezone only

### 4. Post Management

- List view of all scheduled posts
- Edit scheduled posts
- Delete scheduled posts
- Reschedule posts (change time)
- Post status indicators:
  - Scheduled
  - Publishing
  - Published
  - Failed

### 5. Post History

- View all published posts
- Search by date range
- Filter by platform

### 6. Error Handling & Notifications

- Auto-retry failed posts (2-3 attempts)
- Telegram notification on final failure
- Display error messages in UI
- Manual retry option

### 7. Core Publishing

- Publish text posts to X
- Publish text posts to LinkedIn
- Auto-post URL as first comment on LinkedIn
- Auto-post URL as reply in X thread
- Convex scheduled functions for timed publishing

---

## Phase 2 (Should Have Soon)

Features that significantly enhance usability but aren't blocking:

### 1. Enhanced Views

- Calendar view (week and month)
- Visual schedule overview
- Drag-and-drop rescheduling in calendar

### 2. Post Previews

- Real-time preview for X
- Real-time preview for LinkedIn
- LinkedIn "below the fold" indicator
  - Show first ~140 characters clearly
  - Indicate where "see more" appears

### 3. Drafts System

- Save posts as drafts
- Draft management section
- Convert draft to scheduled post
- Edit drafts without scheduling

### 4. Post Duplication

- One-click duplicate of existing posts
- Duplicate from scheduled posts
- Duplicate from post history
- Creates new draft by default

---

## Phase 3 (Nice to Have)

Features for long-term enhancement and scalability:

### 1. Swipe File / Templates

- Create templates from successful posts
- Save examples from other creators
- Organize by:
  - Content type (hooks, threads, announcements, etc.)
  - Creator/source
  - Effectiveness rating
- Click template to pre-populate new draft
- Search and filter templates

### 2. Content Organization

- Tags/categories for posts (e.g., "AI tips," "course promo")
- Bulk tagging
- Filter history by tags
- Tag-based analytics (what types you post most)

### 3. Advanced Search & Filtering

- Full-text search in post history
- Filter by multiple criteria:
  - Date range
  - Platform
  - Status
  - Tags
  - Contains URL

### 4. Analytics (Future)

- Basic post performance tracking
- Engagement metrics (if APIs allow)
- Best posting times analysis

---
