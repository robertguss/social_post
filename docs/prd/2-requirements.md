# 2. Requirements

## Functional

1. **FR1 (Authentication):** The system must support single-user authentication and secure session management via Clerk.
2. **FR2 (Platform Connection):** The system must allow users to establish OAuth flows for X/Twitter and LinkedIn.
3. **FR3 (Content Input):** The system must provide a text input field for post content with separate character counters for X (280 max) and LinkedIn (3,000 max).
4. **FR4 (URL Handling):** The system must have a separate URL field, which is used for auto-posting as the first comment (LinkedIn) or as a thread reply (X).
5. **FR5 (Scheduling):** The system must allow manual time selection and support staggered posting times for X vs. LinkedIn in the user's local timezone.
6. **FR6 (Publishing):** The system must publish text posts to X and LinkedIn using Convex scheduled functions for timed publishing.
7. **FR7 (Post Management):** The system must display a list view of all scheduled posts and allow for editing, deleting, and rescheduling these posts.
8. **FR8 (Post Status):** The system must show clear status indicators: Scheduled, Publishing, Published, and Failed.
9. **FR9 (Post History):** The system must display a view of all published posts, filterable by date range and platform.
10. **FR10 (Post Templates):** The system must allow users to save, tag, search, and insert reusable content blocks (hashtags, closings, disclaimers) into posts.
11. **FR11 (Content Recycling):** The system must enable users to clone past posts for rescheduling and support recurring queue functionality with pause/resume controls.
12. **FR12 (Enhanced Cross-Platform Adaptation):** The system must provide separate text fields for X/Twitter and LinkedIn with smart pre-population and platform-specific character validation.
13. **FR13 (Posting Time Recommendations):** The system must suggest optimal posting times based on platform-specific best practices and allow custom user preferences.
14. **FR14 (AI Content Assistant):** The system must integrate with Gemini AI to provide tone adjustment, content expansion, and hashtag generation features.

## Non Functional

1. **NFR1 (Cost):** The application must have zero recurring subscription costs for the core product.
2. **NFR2 (Performance):** Post publishing must be triggered within 30 seconds of the scheduled time.
3. **NFR3 (Reliability):** The scheduling service must target $99\%$ uptime.
4. **NFR4 (Resilience):** The system must auto-retry failed posts (2-3 attempts) and send a Telegram notification on final failure.
5. **NFR5 (Security):** The system must ensure secure OAuth token storage and use HTTPS only.
6. **NFR6 (Usability):** The interface must be mobile-responsive and minimal-click for post scheduling.

---
