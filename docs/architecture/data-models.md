# Data Models

The data models defined in the PRD will be implemented in `convex/schema.ts`.

| Model Name           | Purpose                                | Key Fields (Convex Type)                                                                                                                                                                         | Indexes                                         | Rationale                                                                        |
| :------------------- | :------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------- | :------------------------------------------------------------------------------- |
| **posts**            | Stores content and scheduling details. | `clerkUserId`: string (Clerk ID), `status`: string, `twitterContent`: string, `linkedInContent`: string, `twitterScheduledTime`: number (timestamp), `linkedInScheduledTime`: number (timestamp) | `by_user`: ["clerkUserId"]                      | Allows fast lookup of all posts for the current authenticated user.              |
| **user_connections** | Stores secure, encrypted OAuth tokens. | `clerkUserId`: string (Clerk ID), `platform`: string, `accessToken`: string (encrypted), `refreshToken`: string (encrypted), `expiresAt`: number (timestamp)                                     | `by_user_platform`: ["clerkUserId", "platform"] | Enables quick, secure retrieval of credentials for a specific user and platform. |

---
