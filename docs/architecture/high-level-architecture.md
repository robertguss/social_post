# High Level Architecture

## Technical Summary

The architecture will follow a **Serverless Fullstack** style, utilizing **Next.js** for a flexible frontend (with server-side and client-side rendering) and **Convex** for the unified backend (database, server logic, and the critical scheduled functions). **Better Auth** is employed for secure single-user authentication and session management. The development structure will maintain the starter's **Integrated Monorepo** style for tight coupling between the frontend and the Convex backend functions.

## Platform and Infrastructure Choice

[cite\_start]The application is architected around **Convex backend services** and a standard **Next.js deployment platform** [such as Vercel](cite: 642).

**Key Services:**

| Layer        | Technology | Service                                         | Purpose                                                                                            |
| :----------- | :--------- | :---------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| **Backend**  | Convex     | Database, Queries, Mutations, Scheduled Actions | Handles all persistent data, server logic, and the time-sensitive scheduling required for posting. |
| **Auth**     | Better Auth      | Authentication/Authorization                    | Secure user login and protected routes.                                                            |
| **Frontend** | Next.js    | App Routing, UI Hosting                         | Renders the mobile-responsive UI.                                                                  |
| **External** | N/A        | X/LinkedIn/Telegram APIs                        | Handled by Convex Actions, securely calling third-party services for publishing and notifications. |

## Repository Structure

The current structure is an effective **Integrated Monorepo** that accommodates both Next.js and Convex files within a single project.

```plaintext
social_post/
├── app/                    # Next.js pages and routing
│   ├── (server)/           # Server components
│   ├── globals.css         # Tailwind CSS
│   └── layout.tsx          # Root layout with Better Auth/Convex Contexts
├── components/             # Reusable UI components
├── convex/                 # All backend logic (DB, Queries, Mutations, Actions)
│   ├── auth.config.ts      # Better Auth/Convex integration config
│   ├── myFunctions.ts      # Example functions
│   └── schema.ts           # Database schema definition
├── hooks/                  # NEW: Custom Convex/React hooks
├── middleware.ts           # Better Auth protection for routes
└── package.json            # Unified dependencies
```

## High Level Architecture Diagram

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
