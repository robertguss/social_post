# Social Posting Scheduler Fullstack Architecture Document

## Introduction

[cite\_start]This document outlines the complete fullstack architecture for **Social Posting Scheduler**, including backend systems, frontend implementation, and their integration[cite: 632]. [cite\_start]It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack[cite: 632]. [cite\_start]This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for modern fullstack applications where these concerns are increasingly intertwined[cite: 633].

### Change Log

| Date       | Version | Description                                                              | Author              |
| :--------- | :------ | :----------------------------------------------------------------------- | :------------------ |
| 2025-10-30 | 1.0     | Initial draft, incorporating PRD and existing starter template analysis. | Winston (Architect) |

### Starter Template or Existing Project

The project is built on the **Convex + Next.js + Clerk** starter template, which aligns with the PRD's specified stack: Next.js/Tailwind, Clerk Auth, and Convex Backend.

**Decision:** Maintain the current **Integrated Monorepo** style based on standard Next.js/Tailwind/Convex best practices, leveraging the starter's pre-configured structure and dependencies.

---

## High Level Architecture

### Technical Summary

The architecture will follow a **Serverless Fullstack** style, utilizing **Next.js** for a flexible frontend (with server-side and client-side rendering) and **Convex** for the unified backend (database, server logic, and the critical scheduled functions). **Clerk** is employed for secure single-user authentication and session management. The development structure will maintain the starter's **Integrated Monorepo** style for tight coupling between the frontend and the Convex backend functions.

### Platform and Infrastructure Choice

[cite\_start]The application is architected around **Convex backend services** and a standard **Next.js deployment platform** [such as Vercel](cite: 642).

**Key Services:**

| Layer        | Technology | Service                                         | Purpose                                                                                            |
| :----------- | :--------- | :---------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| **Backend**  | Convex     | Database, Queries, Mutations, Scheduled Actions | Handles all persistent data, server logic, and the time-sensitive scheduling required for posting. |
| **Auth**     | Clerk      | Authentication/Authorization                    | Secure user login and protected routes.                                                            |
| **Frontend** | Next.js    | App Routing, UI Hosting                         | Renders the mobile-responsive UI.                                                                  |
| **External** | N/A        | X/LinkedIn/Telegram APIs                        | Handled by Convex Actions, securely calling third-party services for publishing and notifications. |

### Repository Structure

The current structure is an effective **Integrated Monorepo** that accommodates both Next.js and Convex files within a single project.

```plaintext
social_post/
├── app/                    # Next.js pages and routing
│   ├── (server)/           # Server components
│   ├── globals.css         # Tailwind CSS
│   └── layout.tsx          # Root layout with Clerk/Convex Contexts
├── components/             # Reusable UI components
├── convex/                 # All backend logic (DB, Queries, Mutations, Actions)
│   ├── auth.config.ts      # Clerk/Convex integration config
│   ├── myFunctions.ts      # Example functions
│   └── schema.ts           # Database schema definition
├── hooks/                  # NEW: Custom Convex/React hooks
├── middleware.ts           # Clerk protection for routes
└── package.json            # Unified dependencies
```

### High Level Architecture Diagram

The core functionality relies on Convex Actions/Scheduler for offloading the time-sensitive publishing logic.

```mermaid
graph TD
    A[User (Web/Mobile)] --> B(Next.js Frontend);
    B -->|useMutation| C[Convex Mutation: schedulePost];
    C --> D[Convex DB: posts, user_connections];
    C --> E[Convex Scheduler: runAt];

    E --> F[Convex Action: publishPost];
    F --> G[X/LinkedIn/Telegram APIs];
    G --> H{Post Status};
    H -->|Success/Fail| D;
    H -->|Final Failure| I[Convex Action: sendTelegramNotification];

    D -->|useQuery (Realtime)| B;

    style A fill:#DCEFFB
    style B fill:#FFE4B5
    style C fill:#ADD8E6
    style F fill:#ADD8E6
    style G fill:#E6E6FA
    style D fill:#FAFAD2
```

---

## Tech Stack

This table is the **DEFINITIVE** technology selection for the entire project.

| Category                 | Technology                   | Version | Purpose                                                                                                    | Rationale                                                                                             |
| :----------------------- | :--------------------------- | :------ | :--------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------- |
| **Frontend Framework**   | Next.js                      | 15.5.4  | Optimized routing and rendering for Web-based, mobile-responsive UI.                                       | Already configured in the starter, provides flexibility for client/server components.                 |
| **UI Component Library** | shadcn/ui                    | N/A     | High-quality, accessible, customizable component set.                                                      | Aligns with the need for a simple, fast productivity tool.                                            |
| **Styling**              | Tailwind CSS                 | ^4      | Utility-first CSS for rapid, customizable styling.                                                         | Already configured in the starter, supports the fast/simple UI goal.                                  |
| **Backend Language**     | TypeScript                   | ^5      | Type safety for reliable server logic and data validation.                                                 | Consistent with the starter and aligns with engineer's preference for reliable code.                  |
| **Database/Functions**   | Convex                       | ^1.28.0 | Unified DB, realtime queries, and scheduled functions for timed publishing.                                | Provides built-in scheduling capabilities which are **critical** for the core publishing requirement. |
| **Authentication**       | Clerk                        | ^6.12.6 | Secure single-user authentication and session management.                                                  | Fully integrated into the starter and ideal for protected routes.                                     |
| **API Style**            | Convex/TS                    | N/A     | **Reactive Queries** (Convex), **Atomic Mutations** (Convex), **Node Actions** (Convex) for external APIs. | Leverages Convex's realtime features and isolates external API calls into safe `actions`.             |
| **Secrets Management**   | Convex Environment Variables | N/A     | Secure storage of X, LinkedIn, and Telegram API keys.                                                      | Convex `actions` can securely access environment variables, keeping secrets out of the client/repo.   |

---

## Data Models

The data models defined in the PRD will be implemented in `convex/schema.ts`.

| Model Name           | Purpose                                | Key Fields (Convex Type)                                                                                                                                                                         | Indexes                                         | Rationale                                                                        |
| :------------------- | :------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------- | :------------------------------------------------------------------------------- |
| **posts**            | Stores content and scheduling details. | `clerkUserId`: string (Clerk ID), `status`: string, `twitterContent`: string, `linkedInContent`: string, `twitterScheduledTime`: number (timestamp), `linkedInScheduledTime`: number (timestamp) | `by_user`: ["clerkUserId"]                      | Allows fast lookup of all posts for the current authenticated user.              |
| **user_connections** | Stores secure, encrypted OAuth tokens. | `clerkUserId`: string (Clerk ID), `platform`: string, `accessToken`: string (encrypted), `refreshToken`: string (encrypted), `expiresAt`: number (timestamp)                                     | `by_user_platform`: ["clerkUserId", "platform"] | Enables quick, secure retrieval of credentials for a specific user and platform. |

---

## Frontend Architecture

### Component Architecture

**Decision:** **Feature-First / Component-Based** architecture, utilizing Next.js/React and integrating **shadcn/ui** primitives.

| Component Type    | Location               | Purpose                                                                               |
| :---------------- | :--------------------- | :------------------------------------------------------------------------------------ |
| **App Shell**     | `app/layout.tsx`       | Provides Clerk and Convex contexts, handles global styling.                           |
| **Pages/Views**   | `app/`                 | Defines routes and assembles features into a view.                                    |
| **Core Features** | `components/features/` | Components for complex workflows, e.g., `PostScheduler.tsx`, `ConnectionManager.tsx`. |
| **UI Primitives** | `components/ui/`       | Exports from `shadcn/ui`.                                                             |
| **Convex Hooks**  | `hooks/`               | Custom hooks for complex data fetching or mutations, abstracting Convex interaction.  |

### State Management Architecture

- **Global State (Data)**: Primary state driven by **Convex** via `useQuery` hooks, ensuring real-time data sync.
- **Local UI State**: Standard React hooks (`useState`) manage temporary UI state like form inputs, modal visibility, and tab selection.

### Routing Architecture

The application relies entirely on the **Next.js App Router** structure.

| Route Requirement               | Implementation Path (Example)        |
| :------------------------------ | :----------------------------------- |
| **Post Creation/Scheduling**    | `app/schedule/page.tsx`              |
| **List View / Post Management** | `app/dashboard/page.tsx` (Protected) |
| **Post History**                | `app/history/page.tsx` (Protected)   |
| **Authentication Flow**         | Handled by Clerk components          |

---

## Security

### Authentication & Authorization

- **Provider:** Clerk.
- **Client Authorization:** Clerk's middleware (`middleware.ts`) protects core application routes.
- **Convex Authorization:** All critical Queries and Mutations must use `ctx.auth.getUserIdentity()` to verify the user is authenticated and that they are only accessing their own data (i.e., verifying `userId` against the document's `clerkUserId`).

### Secure Secrets Management

- **Sensitive Data:** **X, LinkedIn, and Telegram API credentials** must be treated as production secrets.
- **Storage:** The OAuth tokens (`accessToken`, `refreshToken`) stored in the `user_connections` table **must be encrypted** at the application level before being saved to Convex.
- **Access:** Only **Convex Actions** are permitted to access the sensitive environment variables (API keys, encryption keys) required for publishing and notification.

---

## Testing Strategy

The strategy focuses on validating the full stack, with specialized attention to the high-risk scheduling and external API logic.

| Test Level         | Scope                                                                                             | Tools                                                                   | Critical Focus Areas                                                                                                               |
| :----------------- | :------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**           | Convex functions (non-db logic), simple React components.                                         | Jest (or equivalent), Convex unit testing utilities.                    | **Character Counting** logic, **Timestamp conversion**, **Validation logic** (e.g., URL format).                                   |
| **Integration**    | **Convex Queries/Mutations** interacting with the DB; **Frontend Hooks** interacting with Convex. | Jest, Mocking libraries (for external APIs).                            | **Secure Post Creation**, **Data model integrity**, **Authentication** flow on protected routes, **Convex Index validation**.      |
| **Action Testing** | **Convex Actions** (the publishers) calling external APIs.                                        | Node.js testing environment, **Mocking libraries** (for external APIs). | **API Contract adherence**, **Rate Limit handling**, **Auto-retry logic**, and **Telegram notification trigger** on final failure. |

### Error Handling Strategy

- **Client/UI:** Use error boundaries and clearly present the `errorMessage` from the `Post` data model for failed posts.
- **Scheduled Functions (Convex Actions):** This is the **most critical** layer:
  1. Capture and handle HTTP errors from X/LinkedIn APIs.
  2. If the failure is transient, **trigger the auto-retry mechanism** via a new delayed Convex schedule.
  3. If the post fails after the maximum retry count ($2-3$ attempts), **update the post status to `failed`** and send the **Telegram notification**.
