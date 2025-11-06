# Tech Stack

This table is the **DEFINITIVE** technology selection for the entire project.

| Category                 | Technology                   | Version | Purpose                                                                                                    | Rationale                                                                                             |
| :----------------------- | :--------------------------- | :------ | :--------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------- |
| **Frontend Framework**   | Next.js                      | 15.5.4  | Optimized routing and rendering for Web-based, mobile-responsive UI.                                       | Already configured in the starter, provides flexibility for client/server components.                 |
| **UI Component Library** | shadcn/ui                    | N/A     | High-quality, accessible, customizable component set.                                                      | Aligns with the need for a simple, fast productivity tool.                                            |
| **Styling**              | Tailwind CSS                 | ^4      | Utility-first CSS for rapid, customizable styling.                                                         | Already configured in the starter, supports the fast/simple UI goal.                                  |
| **Backend Language**     | TypeScript                   | ^5      | Type safety for reliable server logic and data validation.                                                 | Consistent with the starter and aligns with engineer's preference for reliable code.                  |
| **Database/Functions**   | Convex                       | ^1.28.0 | Unified DB, realtime queries, and scheduled functions for timed publishing.                                | Provides built-in scheduling capabilities which are **critical** for the core publishing requirement. |
| **Authentication**       | Better Auth                        | ^1.1.11 | Secure single-user authentication and session management.                                                  | Fully integrated into the starter and ideal for protected routes.                                     |
| **API Style**            | Convex/TS                    | N/A     | **Reactive Queries** (Convex), **Atomic Mutations** (Convex), **Node Actions** (Convex) for external APIs. | Leverages Convex's realtime features and isolates external API calls into safe `actions`.             |
| **Secrets Management**   | Convex Environment Variables | N/A     | Secure storage of X, LinkedIn, and Telegram API keys.                                                      | Convex `actions` can securely access environment variables, keeping secrets out of the client/repo.   |

---
