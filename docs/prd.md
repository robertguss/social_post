# Social Posting Scheduler Product Requirements Document (PRD)

## Overview

### Product Vision

A self-hosted social media scheduling application built to eliminate expensive subscription costs while providing a tailored workflow for content repurposing across X/Twitter and LinkedIn.

### Target User

Solo content creator (initially single-user) who posts daily/multiple times per day, creates content in batches and spontaneously, and repurposes content across platforms with platform-specific adaptations.

### Core Value Proposition

Zero recurring subscription costs, custom-built for specific workflow needs, full control over scheduling and content management, and built by engineer for engineer.

---

## 1. Goals and Background Context

### Goals

- Replace current paid social media scheduling tools completely.
- Successfully publish 95%+ of scheduled posts.
- Can schedule $7+$ posts per week.
- Achieve zero recurring subscription costs.
- Implement custom-built support for content repurposing between X/Twitter and LinkedIn.

### Background Context

The product is a productivity tool, requiring a simple, fast UI to minimize clicks and avoid feature creep until the core workflow is solid. The architecture is defined as a Serverless Fullstack using Next.js, Convex (for database and scheduled functions), and Clerk (for authentication).

### Change Log

| Date           | Version | Description                                                                                             | Author   |
| :------------- | :------ | :------------------------------------------------------------------------------------------------------ | :------- |
| **Original**   | 1.0     | Initial comprehensive document.                                                                         | User     |
| **2025-10-30** | 1.1     | **Formatted to BMad PRD standard** including Technical Assumptions and Epic Sequencing for Dev Handoff. | PO Agent |

---

## 2. Requirements

### Functional

1. **FR1 (Authentication):** The system must support single-user authentication and secure session management via Clerk.
2. **FR2 (Platform Connection):** The system must allow users to establish OAuth flows for X/Twitter and LinkedIn.
3. **FR3 (Content Input):** The system must provide a text input field for post content with separate character counters for X (280 max) and LinkedIn (3,000 max).
4. **FR4 (URL Handling):** The system must have a separate URL field, which is used for auto-posting as the first comment (LinkedIn) or as a thread reply (X).
5. **FR5 (Scheduling):** The system must allow manual time selection and support staggered posting times for X vs. LinkedIn in the user's local timezone.
6. **FR6 (Publishing):** The system must publish text posts to X and LinkedIn using Convex scheduled functions for timed publishing.
7. **FR7 (Post Management):** The system must display a list view of all scheduled posts and allow for editing, deleting, and rescheduling these posts.
8. **FR8 (Post Status):** The system must show clear status indicators: Scheduled, Publishing, Published, and Failed.
9. **FR9 (Post History):** The system must display a view of all published posts, filterable by date range and platform.

### Non Functional

1. **NFR1 (Cost):** The application must have zero recurring subscription costs for the core product.
2. **NFR2 (Performance):** Post publishing must be triggered within 30 seconds of the scheduled time.
3. **NFR3 (Reliability):** The scheduling service must target $99\%$ uptime.
4. **NFR4 (Resilience):** The system must auto-retry failed posts (2-3 attempts) and send a Telegram notification on final failure.
5. **NFR5 (Security):** The system must ensure secure OAuth token storage and use HTTPS only.
6. **NFR6 (Usability):** The interface must be mobile-responsive and minimal-click for post scheduling.

---

## 3. User Interface Design Goals

The core design principle is that the UI must be **simple and fast** as a productivity tool.

### Overall UX Vision

The application should prioritize utility and efficiency for the solo content creator, moving quickly from content creation to scheduling.

### Core Screens and Views

- **Authentication Screen:** Login/Signup (Clerk integration)
- **Connection Manager:** For linking X/Twitter and LinkedIn
- **Post Creation Form:** The primary, integrated workspace.
- **Dashboard/List View:** Main view for scheduled and pending posts.
- **History View:** Archival/Search view for past posts.

### Accessibility: None

_(Inherited from PRD - note: compliance with WCAG standards is a Phase 3 Nice-to-Have.)_

### Target Device and Platforms: Web Responsive

_(Mobile usage is secondary but should be functional.)_

---

## 4. Technical Assumptions

These decisions guide the Architect (Winston) and Developer (James) agents.

- **Repository Structure:** Monorepo (Next.js App with integrated Convex folder).
- **Service Architecture:** Serverless architecture leveraging **Convex Scheduled Functions** for publishing and **Convex Queries/Mutations** for data management.
- **Testing Requirements:** Full Testing Pyramid required, with **specialized Action Testing** (Node.js environment) for API calls, rate limits, and retries.
- **Additional Technical Assumptions and Requests:**
  - OAuth tokens (`accessToken`, `refreshToken`) must be stored **encrypted** within the database layer for security.
  - API integration will be handled by **Convex Actions** to securely access API keys and manage network retries.

---

## 5. Epic List

The MVP is sequenced into a single, comprehensive Epic to deliver core scheduling functionality.

- **Epic 1: Foundation & Core Publishing:** Establish authentication, platform connections, secure storage, and implement the minimal core publishing logic for X/Twitter.
- **Epic 2: Core UX & LinkedIn Integration:** Complete the UI/UX features, integrate LinkedIn, and implement post management/history.

---

## 6. Epic Details

### Epic 1: Foundation & Core Publishing

**Epic Goal:** Establish the secure single-user foundation and deploy the minimal end-to-end functionality to schedule and publish posts to at least one platform (X/Twitter).

| Story ID | Story Title                                | Prerequisite |
| :------- | :----------------------------------------- | :----------- |
| **1.1**  | Project Setup & Authentication             | None         |
| **1.2**  | Secure X/Twitter OAuth Integration         | 1.1          |
| **1.3**  | Secure Token Encryption & Storage          | 1.2          |
| **1.4**  | Post Creation Form (X Focus & Core Fields) | 1.3          |
| **1.5**  | Core Publishing Logic (X only)             | 1.4          |
| **1.6**  | Post Status & Basic History Readout        | 1.5          |

#### Story 1.1 Project Setup & Authentication

**As a** user, **I want** a secure login and the base project structure, **so that** I can begin connecting my accounts.

##### Acceptance Criteria

1. The Next.js project runs with the Clerk/Convex context provided.
2. A user can successfully sign up and log in via Clerk/Next.js components.
3. The main app route is protected by Clerk middleware.
4. The foundational Convex database is initialized with the `posts` and `user_connections` tables defined in the schema.

#### Story 1.2 Secure X/Twitter OAuth Integration

**As a** content creator, **I want** to connect my X/Twitter account securely, **so that** the scheduler can post on my behalf.

##### Acceptance Criteria

1. The UI displays a button to initiate the X/Twitter OAuth flow.
2. Upon successful OAuth, a single `user_connections` record is created for X/Twitter linked to the Clerk user ID.
3. The API credentials (`accessToken`, `refreshToken`) are stored and secured.
4. The UI displays the X/Twitter connection status (active/needs re-auth).

#### Story 1.3 Secure Token Encryption & Storage

**As an** engineer, **I want** all sensitive OAuth tokens to be encrypted when stored in the database, **so that** unauthorized access risk is minimized.

##### Acceptance Criteria

1. A standard encryption/decryption utility is implemented in a secure Convex function.
2. The `accessToken` and `refreshToken` in the `user_connections` table are stored in their encrypted format.
3. Only authorized Convex Actions can decrypt and access these tokens for publishing.
4. Encryption keys are stored securely as Convex Environment Variables.

#### Story 1.4 Post Creation Form (X Focus & Core Fields)

**As a** content creator, **I want** a form to enter my content and schedule it for X/Twitter, **so that** I can batch create my content.

##### Acceptance Criteria

1. A multi-line text input field is provided for post content.
2. A character counter for X/Twitter (280 max) displays with visual warnings (260 char limit).
3. A field for a separate URL is provided for threading.
4. A date/time selector is provided for manual time selection (local timezone only).
5. On submission, a `posts` record is created in the database with status `Scheduled`.

#### Story 1.5 Core Publishing Logic (X only)

**As a** content creator, **I want** my scheduled X/Twitter posts to be reliably published at the designated time, **so that** my audience receives my content on schedule.

##### Acceptance Criteria

1. A Convex Mutation successfully schedules an internal Convex Action upon form submission.
2. The internal Action is triggered within 30 seconds of the scheduled time.
3. The Action successfully retrieves the encrypted X token, decrypts it, and publishes the text post to the X API.
4. If a URL is provided, the Action posts the URL as a reply in the X thread.
5. The Action updates the post status to `Published` and stores the `twitterPostId`.
6. The Action implements auto-retry (2-3 attempts) for transient API failures.

#### Story 1.6 Post Status & Basic History Readout

**As a** content creator, **I want** to see a list of my posts and their outcome, **so that** I can manage my content stream.

##### Acceptance Criteria

1. The UI displays a basic list of posts in the `posts` table.
2. The list displays the current post status: `Scheduled`, `Publishing`, `Published`, or `Failed`.
3. The list displays posts filtered by date range and platform (X/Twitter only initially).
4. The system sends a Telegram notification if a post fails after all retry attempts.
