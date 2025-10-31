# Testing Strategy

The strategy focuses on validating the full stack, with specialized attention to the high-risk scheduling and external API logic.

| Test Level         | Scope                                                                                             | Tools                                                                   | Critical Focus Areas                                                                                                               |
| :----------------- | :------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**           | Convex functions (non-db logic), simple React components.                                         | Jest (or equivalent), Convex unit testing utilities.                    | **Character Counting** logic, **Timestamp conversion**, **Validation logic** (e.g., URL format).                                   |
| **Integration**    | **Convex Queries/Mutations** interacting with the DB; **Frontend Hooks** interacting with Convex. | Jest, Mocking libraries (for external APIs).                            | **Secure Post Creation**, **Data model integrity**, **Authentication** flow on protected routes, **Convex Index validation**.      |
| **Action Testing** | **Convex Actions** (the publishers) calling external APIs.                                        | Node.js testing environment, **Mocking libraries** (for external APIs). | **API Contract adherence**, **Rate Limit handling**, **Auto-retry logic**, and **Telegram notification trigger** on final failure. |

## Error Handling Strategy

- **Client/UI:** Use error boundaries and clearly present the `errorMessage` from the `Post` data model for failed posts.
- **Scheduled Functions (Convex Actions):** This is the **most critical** layer:
  1. Capture and handle HTTP errors from X/LinkedIn APIs.
  2. If the failure is transient, **trigger the auto-retry mechanism** via a new delayed Convex schedule.
  3. If the post fails after the maximum retry count ($2-3$ attempts), **update the post status to `failed`** and send the **Telegram notification**.
