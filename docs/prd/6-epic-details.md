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

1. The Next.js project runs with the Clerk/Convex context provided.
2. A user can successfully sign up and log in via Clerk/Next.js components.
3. The main app route is protected by Clerk middleware.
4. The foundational Convex database is initialized with the `posts` and `user_connections` tables defined in the schema.

### Story 1.2 Secure X/Twitter OAuth Integration

**As a** content creator, **I want** to connect my X/Twitter account securely, **so that** the scheduler can post on my behalf.

#### Acceptance Criteria

1. The UI displays a button to initiate the X/Twitter OAuth flow.
2. Upon successful OAuth, a single `user_connections` record is created for X/Twitter linked to the Clerk user ID.
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
2. Upon successful OAuth, a `user_connections` record is created for LinkedIn linked to the Clerk user ID.
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
