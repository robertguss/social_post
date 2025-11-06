# 6. Epic Details

## Epic 1: Foundation & Core Publishing

**Epic Goal:** Establish the secure single-user foundation and deploy the minimal end-to-end functionality to schedule and publish posts to at least one platform (X/Twitter).

| Story ID | Story Title                                | Prerequisite |
| :------- | :----------------------------------------- | :----------- |
| **1.1**  | Project Setup & Authentication             | None         |
| **1.2**  | Secure X/Twitter OAuth Integration         | 1.1          |
| **1.3**  | Secure Token Encryption & Storage          | 1.2          |
| **1.4**  | Post Creation Form (X Focus & Core Fields) | 1.3          |
| **1.5**  | Core Publishing Logic (X only)             | 1.4          |
| **1.6**  | Post Status & Basic History Readout        | 1.5          |

### Story 1.1 Project Setup & Authentication

**As a** user, **I want** a secure login and the base project structure, **so that** I can begin connecting my accounts.

#### Acceptance Criteria

1. The Next.js project runs with the Better Auth/Convex context provided.
2. A user can successfully sign up and log in via Better Auth/Next.js components.
3. The main app route is protected by Better Auth middleware.
4. The foundational Convex database is initialized with the `posts` and `user_connections` tables defined in the schema.

### Story 1.2 Secure X/Twitter OAuth Integration

**As a** content creator, **I want** to connect my X/Twitter account securely, **so that** the scheduler can post on my behalf.

#### Acceptance Criteria

1. The UI displays a button to initiate the X/Twitter OAuth flow.
2. Upon successful OAuth, a single `user_connections` record is created for X/Twitter linked to the Better Auth user ID.
3. The API credentials (`accessToken`, `refreshToken`) are stored and secured.
4. The UI displays the X/Twitter connection status (active/needs re-auth).

### Story 1.3 Secure Token Encryption & Storage

**As an** engineer, **I want** all sensitive OAuth tokens to be encrypted when stored in the database, **so that** unauthorized access risk is minimized.

#### Acceptance Criteria

1. A standard encryption/decryption utility is implemented in a secure Convex function.
2. The `accessToken` and `refreshToken` in the `user_connections` table are stored in their encrypted format.
3. Only authorized Convex Actions can decrypt and access these tokens for publishing.
4. Encryption keys are stored securely as Convex Environment Variables.

### Story 1.4 Post Creation Form (X Focus & Core Fields)

**As a** content creator, **I want** a form to enter my content and schedule it for X/Twitter, **so that** I can batch create my content.

#### Acceptance Criteria

1. A multi-line text input field is provided for post content.
2. A character counter for X/Twitter (280 max) displays with visual warnings (260 char limit).
3. A field for a separate URL is provided for threading.
4. A date/time selector is provided for manual time selection (local timezone only).
5. On submission, a `posts` record is created in the database with status `Scheduled`.

### Story 1.5 Core Publishing Logic (X only)

**As a** content creator, **I want** my scheduled X/Twitter posts to be reliably published at the designated time, **so that** my audience receives my content on schedule.

#### Acceptance Criteria

1. A Convex Mutation successfully schedules an internal Convex Action upon form submission.
2. The internal Action is triggered within 30 seconds of the scheduled time.
3. The Action successfully retrieves the encrypted X token, decrypts it, and publishes the text post to the X API.
4. If a URL is provided, the Action posts the URL as a reply in the X thread.
5. The Action updates the post status to `Published` and stores the `twitterPostId`.
6. The Action implements auto-retry (2-3 attempts) for transient API failures.

### Story 1.6 Post Status & Basic History Readout

**As a** content creator, **I want** to see a list of my posts and their outcome, **so that** I can manage my content stream.

#### Acceptance Criteria

1. The UI displays a basic list of posts in the `posts` table.
2. The list displays the current post status: `Scheduled`, `Publishing`, `Published`, or `Failed`.
3. The list displays posts filtered by date range and platform (X/Twitter only initially).
4. The system sends a Telegram notification if a post fails after all retry attempts.

## Epic 2: Core UX & LinkedIn Integration

**Epic Goal:** Extend the application to support LinkedIn as a second platform, enhance the post creation workflow for dual-platform scheduling, and implement comprehensive post management capabilities (edit, delete, reschedule).

| Story ID | Story Title                              | Prerequisite |
| :------- | :--------------------------------------- | :----------- |
| **2.1**  | Secure LinkedIn OAuth Integration        | 1.6          |
| **2.2**  | LinkedIn Token Encryption & Storage      | 2.1          |
| **2.3**  | Dual Platform Post Creation Form         | 2.2          |
| **2.4**  | LinkedIn Publishing Logic                | 2.3          |
| **2.5**  | Post Management (Edit/Delete/Reschedule) | 2.4          |
| **2.6**  | Enhanced Post History - LinkedIn Support | 2.4          |

### Story 2.1 Secure LinkedIn OAuth Integration

**As a** content creator, **I want** to connect my LinkedIn account securely, **so that** the scheduler can post on my behalf to LinkedIn.

#### Acceptance Criteria

1. The UI displays a button to initiate the LinkedIn OAuth 2.0 flow.
2. Upon successful OAuth, a `user_connections` record is created for LinkedIn linked to the Better Auth user ID.
3. The LinkedIn API credentials (`accessToken`, `refreshToken`, `expiresAt`) are stored securely.
4. The UI displays the LinkedIn connection status (active/needs re-auth) alongside the existing X/Twitter status.

### Story 2.2 LinkedIn Token Encryption & Storage

**As an** engineer, **I want** LinkedIn OAuth tokens to be encrypted using the same encryption utility as X/Twitter tokens, **so that** security standards are consistent across all platforms.

#### Acceptance Criteria

1. The existing encryption/decryption utility from Story 1.3 is reused for LinkedIn tokens.
2. The LinkedIn `accessToken` and `refreshToken` in the `user_connections` table are stored in encrypted format.
3. Only authorized Convex Actions can decrypt and access LinkedIn tokens for publishing.
4. Token refresh logic is implemented for LinkedIn to handle token expiration.

### Story 2.3 Dual Platform Post Creation Form

**As a** content creator, **I want** to create posts for both X/Twitter and LinkedIn with separate content and staggered scheduling times, **so that** I can optimize content for each platform.

#### Acceptance Criteria

1. The post creation form includes separate text fields for X/Twitter content (280 char max) and LinkedIn content (3,000 char max).
2. Each text field has its own character counter with appropriate visual warnings.
3. A single URL field is provided that can be used for both platforms (threaded reply on X, first comment on LinkedIn).
4. Separate date/time selectors are provided for X/Twitter and LinkedIn to support staggered posting.
5. Users can optionally post to both platforms, X only, or LinkedIn only (via checkboxes or toggle).
6. On submission, a `posts` record is created with both `twitterContent`/`twitterScheduledTime` and `linkedInContent`/`linkedInScheduledTime` fields populated as applicable.

### Story 2.4 LinkedIn Publishing Logic

**As a** content creator, **I want** my scheduled LinkedIn posts to be reliably published at the designated time, **so that** my professional audience receives my content on schedule.

#### Acceptance Criteria

1. A Convex Mutation schedules a separate internal Action for LinkedIn publishing when a LinkedIn post is scheduled.
2. The LinkedIn publishing Action is triggered within 30 seconds of the scheduled time.
3. The Action successfully retrieves the encrypted LinkedIn token, decrypts it, and publishes the text post to the LinkedIn API (v2 UGC Posts).
4. If a URL is provided, the Action posts the URL as the first comment on the LinkedIn post.
5. The Action updates the post status to `Published` for LinkedIn and stores the `linkedInPostId`.
6. The Action implements auto-retry (2-3 attempts) for transient API failures with exponential backoff.
7. Failed LinkedIn posts trigger a Telegram notification similar to X/Twitter failures.

### Story 2.5 Post Management (Edit/Delete/Reschedule)

**As a** content creator, **I want** to edit, delete, or reschedule my posts before they are published, **so that** I can correct mistakes or adapt to changing circumstances.

#### Acceptance Criteria

1. The post history UI displays an "Edit" button for posts with status `Scheduled`.
2. Clicking "Edit" opens a pre-filled form with the existing post content, URL, and scheduled times.
3. Users can modify content, URL, and/or scheduled times and save changes.
4. Saving changes updates the `posts` record and reschedules the Convex Action(s) for the new time(s).
5. The post history UI displays a "Delete" button for posts with status `Scheduled`.
6. Clicking "Delete" prompts for confirmation and removes the post from the database.
7. Deleting a post cancels any scheduled Convex Actions for that post.
8. Posts with status `Publishing`, `Published`, or `Failed` cannot be edited or deleted (buttons are disabled/hidden).

### Story 2.6 Enhanced Post History - LinkedIn Support

**As a** content creator, **I want** to view and filter my LinkedIn posts in the post history, **so that** I can manage posts across both platforms.

#### Acceptance Criteria

1. The post history UI displays posts for both X/Twitter and LinkedIn.
2. The platform filter includes active options for both "X/Twitter" and "LinkedIn" (no longer grayed out).
3. Each post card clearly indicates which platform(s) the post was scheduled for.
4. Status badges display separate status for X/Twitter and LinkedIn when a post is scheduled for both platforms.
5. The post details modal displays platform-specific information (twitterPostId, linkedInPostId) and links to published posts on both platforms.
6. The date range filter works correctly for LinkedIn posts using `linkedInScheduledTime`.

## Epic 3: Post Templates & Snippet Library

**Epic Goal:** Enable users to save, manage, and reuse content blocks (hashtags, closings, disclaimers) to speed up post creation and maintain consistency across posts.

| Story ID | Story Title                         | Prerequisite |
| :------- | :---------------------------------- | :----------- |
| **3.1**  | Template Data Model & Storage       | 2.6          |
| **3.2**  | Create/Edit/Delete Templates UI     | 3.1          |
| **3.3**  | Tag & Search System for Templates   | 3.2          |
| **3.4**  | Insert Templates into Post Composer | 3.3          |
| **3.5**  | Template Usage Analytics            | 3.4          |

### Story 3.1 Template Data Model & Storage

**As an** engineer, **I want** a database schema for storing reusable content templates, **so that** users can save and retrieve content blocks efficiently.

#### Acceptance Criteria

1. A `templates` table is defined in the Convex schema with fields: `userId`, `name`, `content`, `tags` (array), `createdAt`, `lastUsedAt`, `usageCount`.
2. The `templates` table has an index `by_user` on `userId` for efficient user-scoped queries.
3. Convex mutations are implemented for creating, updating, and deleting templates.
4. Convex queries are implemented for retrieving user's templates, optionally filtered by tag.
5. Template names must be unique per user (validation in mutation).

### Story 3.2 Create/Edit/Delete Templates UI

**As a** content creator, **I want** to create, edit, and delete my content templates, **so that** I can build a library of reusable content blocks.

#### Acceptance Criteria

1. A "Templates" page/tab is added to the main navigation.
2. The Templates page displays a list of all user templates with name, preview, tags, and usage count.
3. A "Create Template" button opens a modal/form with fields for name, content, and tags.
4. Each template in the list has "Edit" and "Delete" buttons.
5. Clicking "Edit" opens a pre-filled form allowing name, content, and tag modifications.
6. Clicking "Delete" prompts for confirmation and removes the template from the database.
7. All template operations (create/edit/delete) provide user feedback (success/error messages).

### Story 3.3 Tag & Search System for Templates

**As a** content creator, **I want** to tag and search my templates, **so that** I can quickly find the right content block when creating posts.

#### Acceptance Criteria

1. The template creation/edit form includes a tag input field supporting multiple tags (comma-separated or chip-based input).
2. The Templates page displays a search bar for filtering templates by name or content.
3. The Templates page displays tag filter chips/buttons showing all unique tags across user's templates.
4. Clicking a tag chip filters the template list to show only templates with that tag.
5. The search bar filters templates in real-time as the user types.
6. Search results highlight matching text in template name or content.
7. Combined search and tag filtering works correctly (AND logic).

### Story 3.4 Insert Templates into Post Composer

**As a** content creator, **I want** to insert saved templates into the post creation form, **so that** I can quickly reuse common content blocks.

#### Acceptance Criteria

1. The post composer displays an "Insert Template" button/icon next to the text input fields.
2. Clicking "Insert Template" opens a modal showing the user's template library with search and tag filters.
3. Templates in the modal display name, content preview, and tags.
4. Clicking a template inserts its content at the cursor position in the active text field (Twitter or LinkedIn).
5. After insertion, the modal closes and the `lastUsedAt` and `usageCount` fields are updated for the template.
6. If no cursor position is available, content is appended to the end of the text field.
7. Template insertion works correctly for both Twitter and LinkedIn text fields independently.

### Story 3.5 Template Usage Analytics

**As a** content creator, **I want** to see which templates I use most frequently, **so that** I can optimize my template library.

#### Acceptance Criteria

1. The Templates page displays templates sorted by usage count (most used first) by default.
2. Each template card shows the `usageCount` and `lastUsedAt` timestamp.
3. A sort dropdown allows sorting by: "Most Used", "Recently Used", "Name (A-Z)", "Date Created".
4. Templates that have never been used display "Never used" instead of a timestamp.
5. The usage count increments each time a template is inserted into the post composer.
6. Analytics are displayed in a clear, visually accessible format (e.g., badge for count, relative time for last used).

## Epic 4: Content Recycling & Re-queue System

**Epic Goal:** Allow users to efficiently repurpose successful past posts by cloning and rescheduling them, including automated recurring queues for evergreen content.

| Story ID | Story Title                             | Prerequisite |
| :------- | :-------------------------------------- | :----------- |
| **4.1**  | Clone Past Post Functionality           | 3.5          |
| **4.2**  | Quick Reschedule Interface              | 4.1          |
| **4.3**  | Recurring Queue Data Model & Scheduler  | 4.2          |
| **4.4**  | Queue Management UI (Pause/Resume/Edit) | 4.3          |
| **4.5**  | Queue Conflict Detection & Resolution   | 4.4          |

### Story 4.1 Clone Past Post Functionality

**As a** content creator, **I want** to clone a successful past post, **so that** I can quickly repurpose content without retyping.

#### Acceptance Criteria

1. Published and failed posts in the post history display a "Clone" button/icon.
2. Clicking "Clone" opens the post creation form pre-filled with the original post's content (Twitter and/or LinkedIn), URL, and other metadata.
3. Scheduled times are cleared (not cloned) - user must set new times.
4. The cloned post creates a new record in the `posts` table with status "Draft".
5. A "Cloned from" reference is stored in the new post record linking to the original post ID.
6. Users can edit all fields before scheduling the cloned post.
7. The original post remains unchanged (no modification to source post).

### Story 4.2 Quick Reschedule Interface

**As a** content creator, **I want** to quickly reschedule a cloned post with smart time suggestions, **so that** I can batch schedule recurring content efficiently.

#### Acceptance Criteria

1. When cloning a post, the scheduling interface displays "Quick Reschedule" suggestions.
2. Suggestions include: "+1 week", "+1 month", "+3 months" relative to the original post's scheduled time.
3. Clicking a suggestion auto-fills the new scheduled time(s) for the selected platform(s).
4. Users can override suggestions and manually select any date/time.
5. The rescheduled post maintains the same platform selection as the original (Twitter, LinkedIn, or both).
6. A preview shows "Scheduled for {date/time}" before final confirmation.
7. Confirmation creates the scheduled post and displays success feedback.

### Story 4.3 Recurring Queue Data Model & Scheduler

**As an** engineer, **I want** a database schema and scheduling logic for recurring post queues, **so that** posts can be automatically rescheduled at defined intervals.

#### Acceptance Criteria

1. A `recurring_queues` table is defined in the Convex schema with fields: `userId`, `originalPostId`, `status` (active/paused), `interval` (days), `nextScheduledTime`, `lastExecutedTime`, `executionCount`, `maxExecutions` (optional).
2. The `recurring_queues` table has an index `by_user_status` on `["userId", "status"]` for efficient active queue queries.
3. A Convex scheduled function runs daily to check for queues due for execution (`nextScheduledTime` <= now).
4. When a queue is due, the scheduled function clones the original post and schedules it using the existing publishing logic.
5. After execution, `nextScheduledTime` is updated to `lastExecutedTime` + `interval`, and `executionCount` is incremented.
6. If `maxExecutions` is set and reached, the queue status is automatically set to "completed".
7. All queue operations are scoped to the authenticated user's `userId`.

### Story 4.4 Queue Management UI (Pause/Resume/Edit)

**As a** content creator, **I want** to manage my recurring post queues, **so that** I can pause, resume, or modify automated posting schedules.

#### Acceptance Criteria

1. A "Queues" page/tab is added to the main navigation displaying all user recurring queues.
2. Each queue card displays: original post content preview, interval, status (active/paused/completed), next scheduled time, and execution count.
3. Active queues display "Pause" and "Edit" buttons.
4. Paused queues display "Resume" and "Edit" buttons.
5. Clicking "Pause" changes queue status to "paused" and stops automatic scheduling.
6. Clicking "Resume" changes queue status to "active" and recalculates `nextScheduledTime`.
7. Clicking "Edit" opens a modal allowing changes to interval, max executions, and next scheduled time.
8. A "Delete Queue" option permanently removes the queue from the database (with confirmation prompt).

### Story 4.5 Queue Conflict Detection & Resolution

**As a** content creator, **I want** the system to detect and warn me about scheduling conflicts, **so that** I don't accidentally post duplicate content at the same time.

#### Acceptance Criteria

1. When creating a recurring queue, the system checks for existing queues with the same original post ID.
2. If a duplicate queue exists (active or paused), a warning message displays: "A queue for this post already exists."
3. The warning includes options: "View Existing Queue", "Create Anyway", or "Cancel".
4. When a queue's next scheduled time conflicts with an already scheduled post (within 1 hour window), a conflict notification is displayed in the Queues page.
5. Users can manually adjust the queue's next scheduled time to resolve conflicts.
6. The system prevents scheduling if the conflict is exact (same post, same platform, same exact time).
7. Conflict detection works across both manually scheduled posts and queue-generated posts.

## Epic 5: Enhanced Cross-Platform Content Adaptation

**Epic Goal:** Improve the dual-platform workflow with separate, clearly delineated text fields, smart content pre-population from Twitter to LinkedIn, and enhanced platform-specific validation and preview capabilities.

| Story ID | Story Title                                       | Prerequisite |
| :------- | :------------------------------------------------ | :----------- |
| **5.1**  | Dual Text Field UI Architecture                   | 4.5          |
| **5.2**  | Smart Content Pre-population (Twitter → LinkedIn) | 5.1          |
| **5.3**  | Platform-Specific Character Counters & Validation | 5.2          |
| **5.4**  | Extended Content Field with Formatting Hints      | 5.3          |
| **5.5**  | Preview Mode for Both Platforms Side-by-Side      | 5.4          |
| **5.6**  | Platform-Specific Post Drafts                     | 5.5          |

### Story 5.1 Dual Text Field UI Architecture

**As a** content creator, **I want** separate, visually distinct text fields for Twitter and LinkedIn content, **so that** I can clearly see and edit platform-specific content without confusion.

#### Acceptance Criteria

1. The post creation form displays two clearly labeled text areas: "Twitter/X Content" and "LinkedIn Content".
2. Each text area is visually distinct with platform branding (colors, icons).
3. Text areas are vertically stacked on mobile and can be displayed side-by-side on larger screens.
4. Each text area has independent focus state and cursor management.
5. Users can expand/collapse either text area to maximize editing space.
6. A toggle switch allows users to enable/disable posting to each platform independently.
7. When a platform is disabled, its text area is visually dimmed but content is preserved.

### Story 5.2 Smart Content Pre-population (Twitter → LinkedIn)

**As a** content creator, **I want** LinkedIn content to be automatically pre-filled with my Twitter content, **so that** I can easily expand the shorter Twitter version into a longer LinkedIn post.

#### Acceptance Criteria

1. When the user finishes typing in the Twitter text field (2 second debounce), the system detects if LinkedIn field is empty.
2. If LinkedIn field is empty, a "Pre-fill LinkedIn" button appears above the LinkedIn text area.
3. Clicking "Pre-fill LinkedIn" copies the Twitter content exactly to the LinkedIn field.
4. Pre-population only occurs if the LinkedIn field is completely empty (not if it has content).
5. A visual indicator (e.g., "Pre-filled from Twitter") displays briefly after pre-population.
6. Users can manually clear or edit the LinkedIn content after pre-population without affecting Twitter content.
7. Pre-population can be disabled via user preferences/settings.

### Story 5.3 Platform-Specific Character Counters & Validation

**As a** content creator, **I want** accurate, real-time character counters for each platform, **so that** I know immediately if my content exceeds platform limits.

#### Acceptance Criteria

1. Twitter text field displays a character counter showing "X / 280" with current count and limit.
2. LinkedIn text field displays a character counter showing "X / 3,000" with current count and limit.
3. Counters update in real-time as the user types (no debounce).
4. Twitter counter shows warning styling (yellow/orange) at 260 characters.
5. Twitter counter shows error styling (red) at 280+ characters and the "Schedule" button is disabled.
6. LinkedIn counter shows warning styling at 2,900 characters.
7. LinkedIn counter shows error styling at 3,000+ characters and the "Schedule" button is disabled.
8. Character counting accounts for emoji, special characters, and URLs correctly per platform rules.

### Story 5.4 Extended Content Field with Formatting Hints

**As a** content creator, **I want** formatting hints and guidance for LinkedIn posts, **so that** I can create professional, well-structured LinkedIn content.

#### Acceptance Criteria

1. The LinkedIn text area displays a subtle formatting toolbar or hint panel.
2. Formatting hints include: "Use line breaks for readability", "Add emojis for engagement", "Include hashtags at the end".
3. A "Tips" button/icon displays a popover with LinkedIn best practices (e.g., "First 2-3 lines are critical, longer posts get truncated").
4. The LinkedIn text area supports basic markdown preview (optional enhancement): line breaks, bold, bullet points.
5. Formatting hints are non-intrusive and can be dismissed/minimized.
6. Hints are context-aware: e.g., suggest adding hashtags if none are present in content > 100 characters.
7. All formatting guidance is informational only and does not enforce rules.

### Story 5.5 Preview Mode for Both Platforms Side-by-Side

**As a** content creator, **I want** to preview how my content will appear on Twitter and LinkedIn simultaneously, **so that** I can ensure optimal presentation before scheduling.

#### Acceptance Criteria

1. A "Preview" button is displayed in the post creation form.
2. Clicking "Preview" opens a modal showing side-by-side mockups of the Twitter and LinkedIn post appearance.
3. Twitter preview mimics the Twitter UI: avatar placeholder, content, character count visible, truncation if applicable.
4. LinkedIn preview mimics the LinkedIn feed UI: larger format, line breaks rendered, "see more" truncation at ~300 characters visible.
5. If a URL is provided, the preview shows "URL will be posted as a comment/reply" for each platform.
6. Preview updates dynamically if users make edits without closing the modal.
7. Preview modal is responsive: side-by-side on desktop, stacked on mobile.

### Story 5.6 Platform-Specific Post Drafts

**As a** content creator, **I want** to save draft posts with platform-specific content independently, **so that** I can work on Twitter and LinkedIn versions separately over time.

#### Acceptance Criteria

1. The post creation form has a "Save as Draft" button that saves the current state without scheduling.
2. Draft posts are stored in the `posts` table with status "Draft".
3. Draft posts preserve all content: Twitter content, LinkedIn content, URL, platform toggles, and any metadata.
4. The post history displays a "Drafts" filter/tab showing all draft posts.
5. Users can click on a draft to resume editing in the post creation form.
6. Drafts can be deleted individually with a confirmation prompt.
7. Draft timestamps show "Last edited: {relative time}" for easy tracking.

## Epic 6: Intelligent Posting Time Recommendations

**Epic Goal:** Provide data-driven suggestions for optimal posting times based on platform-specific best practices and industry research, helping users maximize engagement without requiring their own historical performance data.

| Story ID | Story Title                                | Prerequisite |
| :------- | :----------------------------------------- | :----------- |
| **6.1**  | Best Practices Data Model & Storage        | 5.6          |
| **6.2**  | Time Suggestion Algorithm (Platform-Aware) | 6.1          |
| **6.3**  | Suggestion UI in Scheduler Picker          | 6.2          |
| **6.4**  | Historical Performance Tracking (Future)   | 6.3          |
| **6.5**  | Custom User Preference Overrides           | 6.3          |

### Story 6.1 Best Practices Data Model & Storage

**As an** engineer, **I want** a data model for storing optimal posting time recommendations, **so that** the system can provide intelligent time suggestions based on research.

#### Acceptance Criteria

1. A `posting_time_recommendations` table is defined in the Convex schema with fields: `platform`, `dayOfWeek`, `hourRanges` (array of time windows), `engagementScore`, `source` (e.g., "industry research", "user data").
2. The table is seeded with research-based best practices for Twitter and LinkedIn (e.g., "Twitter: Tue-Thu 9-11am EST", "LinkedIn: Wed 10am-12pm EST").
3. The schema supports multiple recommendations per platform/day combination with different engagement scores.
4. Recommendations are timezone-agnostic (stored in UTC, displayed in user's local timezone).
5. An index on `["platform", "dayOfWeek"]` enables efficient lookups.
6. Admin/seed functions populate the table with initial best practice data.

### Story 6.2 Time Suggestion Algorithm (Platform-Aware)

**As an** engineer, **I want** an algorithm that calculates optimal posting times based on the user's selected date and platform, **so that** intelligent suggestions can be presented in the UI.

#### Acceptance Criteria

1. A Convex query `getRecommendedTimes` accepts parameters: `date`, `platform`, and `userTimezone`.
2. The query retrieves recommendations for the specified platform and day of week.
3. Recommendations are sorted by `engagementScore` (highest first).
4. The query returns the top 3 time suggestions converted to the user's local timezone.
5. If no recommendations exist for the specific day/platform, fallback to general recommendations (e.g., "mid-morning" as a default).
6. Time suggestions avoid conflicts with the user's already scheduled posts (optional check).
7. The algorithm considers the user's posting history to avoid suggesting times they never use (future enhancement placeholder).

### Story 6.3 Suggestion UI in Scheduler Picker

**As a** content creator, **I want** to see recommended posting times when scheduling content, **so that** I can choose optimal times without researching best practices myself.

#### Acceptance Criteria

1. The date/time picker in the post creation form displays a "Recommended Times" section.
2. When the user selects a date, the "Recommended Times" section shows 3 suggested time slots for each enabled platform.
3. Each suggestion displays: time (in user's timezone), platform icon, and a brief reason (e.g., "High engagement window").
4. Clicking a suggested time auto-fills the corresponding platform's scheduled time field.
5. Recommendations update dynamically when the user changes the selected date or toggles platform selection.
6. If the user manually enters a time, suggestions remain visible but are not automatically applied.
7. A small info icon/tooltip explains the source of recommendations (e.g., "Based on industry research").

### Story 6.4 Historical Performance Tracking (Future)

**As a** content creator, **I want** the system to learn from my posted content's performance, **so that** time recommendations improve over time based on my audience. _(Note: This story is a placeholder for future enhancement when API access to engagement metrics becomes available.)_

#### Acceptance Criteria

1. A `post_performance` table is defined in the Convex schema with fields: `postId`, `platform`, `publishedTime`, `engagementMetrics` (likes, shares, comments), `fetchedAt`.
2. A Convex action periodically fetches engagement metrics from Twitter/LinkedIn APIs (if access is available).
3. Fetched performance data is stored in the `post_performance` table linked to the original post.
4. The time suggestion algorithm considers historical performance when calculating recommendations (weighted average with research-based data).
5. Users can view a "Performance Insights" page showing their best-performing posting times.
6. This feature remains inactive until API access to engagement metrics is configured.
7. Documentation notes the API requirements and setup steps for enabling this feature.

### Story 6.5 Custom User Preference Overrides

**As a** content creator, **I want** to set my own preferred posting times, **so that** recommendations align with my personal schedule and audience.

#### Acceptance Criteria

1. A "Posting Preferences" settings page is added to the application.
2. Users can define their own "preferred posting windows" for each platform (e.g., "Twitter: Mon-Fri 7-9am, Sat 10am").
3. Preferred windows are stored in a `user_preferences` table with fields: `userId`, `platform`, `dayOfWeek`, `customTimeRanges`.
4. When custom preferences exist, the time suggestion algorithm prioritizes user-defined windows over research-based recommendations.
5. Users can reset preferences to default (research-based) recommendations at any time.
6. The settings page displays both custom preferences and default recommendations side-by-side for comparison.
7. Custom preferences are reflected immediately in the scheduler picker's recommended times.

## Epic 7: AI Content Assistant - Gemini Integration

**Epic Goal:** Integrate Google Gemini AI to assist with content refinement, expansion for LinkedIn, tone adjustment, and hashtag generation, reducing the cognitive load of content creation.

| Story ID | Story Title                             | Prerequisite  |
| :------- | :-------------------------------------- | :------------ |
| **7.1**  | Gemini API Setup & Authentication       | 6.5           |
| **7.2**  | AI Assistant UI Controls in Composer    | 7.1           |
| **7.3**  | Tone Adjustment Feature                 | 7.2           |
| **7.4**  | Twitter-to-LinkedIn Expansion           | 7.2           |
| **7.5**  | Hashtag Generation Based on Content     | 7.2           |
| **7.6**  | AI Response Handling & Error Management | 7.3, 7.4, 7.5 |
| **7.7**  | Rate Limit Management & Cost Tracking   | 7.6           |

### Story 7.1 Gemini API Setup & Authentication

**As an** engineer, **I want** to configure Google Gemini API access and authentication, **so that** the application can make AI-powered content suggestions.

#### Acceptance Criteria

1. A Gemini API key is obtained from Google AI Studio and stored as a Convex environment variable.
2. A Convex action is created that authenticates with the Gemini API using the stored API key.
3. The action successfully makes a test request to the Gemini API and receives a response.
4. Error handling is implemented for authentication failures (invalid API key, network errors).
5. API requests are logged for debugging and monitoring purposes.
6. Documentation is created detailing how to set up the Gemini API key in the project.
7. The Gemini API client is initialized with appropriate model selection (e.g., `gemini-1.5-flash` for cost efficiency).

### Story 7.2 AI Assistant UI Controls in Composer

**As a** content creator, **I want** easily accessible AI assistant controls in the post composer, **so that** I can quickly invoke AI features without disrupting my workflow.

#### Acceptance Criteria

1. An "AI Assistant" button/icon is displayed prominently in the post composer near the text input fields.
2. Clicking the "AI Assistant" button opens a popover/menu with options: "Adjust Tone", "Expand for LinkedIn", "Generate Hashtags".
3. Each AI feature displays a brief description of what it does.
4. When an AI feature is selected, a loading indicator displays while the AI processes the request.
5. AI-generated content appears in a preview/suggestion panel, not immediately replacing the user's content.
6. Users can "Accept", "Reject", or "Edit" AI suggestions before applying them to their post.
7. The AI Assistant UI is responsive and accessible on mobile devices.

### Story 7.3 Tone Adjustment Feature

**As a** content creator, **I want** to adjust the tone of my content (formal, casual, engaging), **so that** I can match the style to my audience and platform.

#### Acceptance Criteria

1. The "Adjust Tone" option presents tone choices: "More Formal", "More Casual", "More Engaging/Enthusiastic".
2. Selecting a tone sends the current post content to the Gemini API with a tone-specific prompt.
3. The Gemini API returns a rewritten version of the content matching the requested tone.
4. The rewritten content is displayed in a preview panel with the original content visible for comparison.
5. Users can accept the rewrite (replaces original), reject it (keeps original), or manually edit the suggestion.
6. Tone adjustment works independently for Twitter and LinkedIn content fields.
7. Character limits are respected - if the rewritten content exceeds limits, a warning is displayed and the user is prompted to manually shorten.

### Story 7.4 Twitter-to-LinkedIn Expansion

**As a** content creator, **I want** to automatically expand my short Twitter content into a longer, more professional LinkedIn post, **so that** I can save time when repurposing content.

#### Acceptance Criteria

1. The "Expand for LinkedIn" option is available when the Twitter content field has text and the LinkedIn field is empty or shorter.
2. Clicking "Expand for LinkedIn" sends the Twitter content to the Gemini API with a prompt to create a longer, professional version suitable for LinkedIn.
3. The Gemini API returns an expanded version (500-1000 characters) maintaining the core message but with more detail and professional tone.
4. The expanded content is displayed in the LinkedIn field preview panel.
5. Users can accept, reject, or edit the expanded content before applying it to the LinkedIn field.
6. The expansion maintains key elements like hashtags, mentions, and links from the original Twitter content.
7. If the Twitter content already references a URL, the expansion includes context about the link.

### Story 7.5 Hashtag Generation Based on Content

**As a** content creator, **I want** AI-generated hashtag suggestions based on my post content, **so that** I can improve discoverability without manual hashtag research.

#### Acceptance Criteria

1. The "Generate Hashtags" option analyzes the current post content in either the Twitter or LinkedIn field.
2. The Gemini API is sent a prompt to generate 3-5 relevant hashtags based on the content's topic and keywords.
3. The AI returns hashtags that are relevant, popular, and appropriate for the selected platform.
4. Generated hashtags are displayed in a suggestion panel with a brief explanation of why each hashtag is relevant (optional).
5. Users can select individual hashtags to insert into their post (at cursor position or appended at the end).
6. Users can select "Insert All" to add all suggested hashtags to their content.
7. Hashtag suggestions account for platform-specific conventions (e.g., LinkedIn accepts longer, more professional hashtags).

### Story 7.6 AI Response Handling & Error Management

**As an** engineer, **I want** robust error handling for AI API responses, **so that** the application gracefully handles failures and provides helpful feedback to users.

#### Acceptance Criteria

1. All Gemini API calls implement try-catch error handling in Convex actions.
2. Common error scenarios are handled with user-friendly messages: API rate limits, network failures, invalid responses, API key issues.
3. If the Gemini API returns an error, the user sees a clear message (e.g., "AI service temporarily unavailable, please try again").
4. Failed AI requests are logged with error details for debugging purposes.
5. The application implements retry logic (1-2 retries with exponential backoff) for transient network errors.
6. If the AI returns inappropriate or low-quality content, users can report it (feedback mechanism).
7. Timeout handling is implemented - if the AI takes longer than 10 seconds, the request is cancelled and an error is displayed.

### Story 7.7 Rate Limit Management & Cost Tracking

**As an** engineer and user, **I want** to manage Gemini API rate limits and track costs, **so that** the application remains within budget and users aren't blocked by rate limits.

#### Acceptance Criteria

1. The application tracks the number of Gemini API calls made per day/month.
2. A `ai_usage_logs` table stores: `userId`, `timestamp`, `feature` (tone/expand/hashtags), `tokensUsed`, `cost` (estimated).
3. If the daily rate limit is approaching (e.g., 90% of quota), users receive a warning message when invoking AI features.
4. Admin users can view total API usage and estimated costs in a dashboard or logs.
5. The application respects Gemini API rate limits and implements exponential backoff if rate-limited.
6. Users can view their personal AI usage stats in the settings/preferences page (optional).
7. Documentation includes cost estimates per feature (e.g., "~$0.001 per tone adjustment") to set user expectations.
