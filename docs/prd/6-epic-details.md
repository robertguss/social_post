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
