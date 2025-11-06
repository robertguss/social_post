# API Reference

Complete reference for all Convex backend functions in the Social Posting Scheduler.

## Table of Contents

- [Posts API](#posts-api)
- [Connections API](#connections-api)
- [Templates API](#templates-api)
- [Dashboard API](#dashboard-api)
- [Publishing API](#publishing-api)
- [Notifications API](#notifications-api)
- [Token Refresh API](#token-refresh-api)
- [Encryption API](#encryption-api)

---

## Posts API

### `createPost`

**Type:** Public Mutation
**File:** `convex/posts.ts:19`

Creates a new scheduled post for X/Twitter and/or LinkedIn.

**Arguments:**

| Parameter               | Type     | Required | Description                                      |
| ----------------------- | -------- | -------- | ------------------------------------------------ |
| `twitterContent`        | `string` | No       | Post content for X/Twitter (max 280 characters)  |
| `linkedInContent`       | `string` | No       | Post content for LinkedIn (max 3,000 characters) |
| `twitterScheduledTime`  | `number` | No       | UTC timestamp for Twitter post                   |
| `linkedInScheduledTime` | `number` | No       | UTC timestamp for LinkedIn post                  |
| `url`                   | `string` | No       | URL to be posted as reply/comment                |

**Returns:** `Id<"posts">` - The ID of the created post

**Validation Rules:**

- At least one platform must be selected with content and scheduled time
- Twitter content cannot exceed 280 characters
- LinkedIn content cannot exceed 3,000 characters
- Scheduled times must be in the future
- Content cannot be empty strings

**Usage Example:**

```typescript
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function SchedulePost() {
  const createPost = useMutation(api.posts.createPost);

  const handleSubmit = async () => {
    const postId = await createPost({
      twitterContent: "Check out my latest blog post!",
      twitterScheduledTime: Date.now() + 3600000, // 1 hour from now
      url: "https://example.com/blog-post",
    });
  };
}
```

---

### `updatePost`

**Type:** Public Mutation
**File:** `convex/posts.ts:143`

Updates an existing scheduled post. Cancels existing scheduled actions and creates new ones.

**Arguments:**

| Parameter               | Type          | Required | Description                        |
| ----------------------- | ------------- | -------- | ---------------------------------- |
| `postId`                | `Id<"posts">` | Yes      | The ID of the post to update       |
| `twitterContent`        | `string`      | No       | Updated post content for X/Twitter |
| `linkedInContent`       | `string`      | No       | Updated post content for LinkedIn  |
| `twitterScheduledTime`  | `number`      | No       | Updated UTC timestamp for Twitter  |
| `linkedInScheduledTime` | `number`      | No       | Updated UTC timestamp for LinkedIn |
| `url`                   | `string`      | No       | Updated URL                        |

**Returns:** `void`

**Constraints:**

- Only posts with status "Scheduled" can be edited
- User must own the post (verified via `clerkUserId`)
- Same validation rules as `createPost`

**Usage Example:**

```typescript
const updatePost = useMutation(api.posts.updatePost);

await updatePost({
  postId: "j17b4b7k8p9q5r6s7t8u9v0w",
  twitterContent: "Updated: Check out my blog!",
  twitterScheduledTime: Date.now() + 7200000, // 2 hours from now
});
```

---

### `deletePost`

**Type:** Public Mutation
**File:** `convex/posts.ts:287`

Deletes a scheduled post and cancels any scheduled publishing actions.

**Arguments:**

| Parameter | Type          | Required | Description                  |
| --------- | ------------- | -------- | ---------------------------- |
| `postId`  | `Id<"posts">` | Yes      | The ID of the post to delete |

**Returns:** `void`

**Constraints:**

- Only posts with status "Scheduled" can be deleted
- User must own the post

**Usage Example:**

```typescript
const deletePost = useMutation(api.posts.deletePost);

await deletePost({
  postId: "j17b4b7k8p9q5r6s7t8u9v0w",
});
```

---

### `getPosts`

**Type:** Public Query
**File:** `convex/posts.ts:417`

Retrieves posts for the authenticated user with optional filters.

**Arguments:**

| Parameter   | Type     | Required | Description                                        |
| ----------- | -------- | -------- | -------------------------------------------------- |
| `startDate` | `number` | No       | Start date filter (UTC timestamp)                  |
| `endDate`   | `number` | No       | End date filter (UTC timestamp)                    |
| `platform`  | `string` | No       | Platform filter ("twitter" \| "linkedin" \| "all") |

**Returns:** `Array<Post>` - Array of posts sorted by scheduled time descending (newest first)

**Usage Example:**

```typescript
const posts = useQuery(api.posts.getPosts, {
  platform: "twitter",
  startDate: new Date("2025-01-01").getTime(),
  endDate: new Date("2025-01-31").getTime(),
});
```

---

### `updatePostStatus` (Internal)

**Type:** Internal Mutation
**File:** `convex/posts.ts:346`

Updates post status and related fields during the publishing lifecycle. Only accessible from internal actions.

**Arguments:**

| Parameter        | Type          | Required | Description                                                         |
| ---------------- | ------------- | -------- | ------------------------------------------------------------------- |
| `postId`         | `Id<"posts">` | Yes      | The ID of the post to update                                        |
| `status`         | `string`      | Yes      | New status ("Scheduled" \| "Publishing" \| "Published" \| "Failed") |
| `twitterPostId`  | `string`      | No       | Twitter post ID when published                                      |
| `linkedInPostId` | `string`      | No       | LinkedIn post URN when published                                    |
| `errorMessage`   | `string`      | No       | Error message when failed                                           |
| `retryCount`     | `number`      | No       | Retry count for tracking                                            |

---

### `getPostById` (Internal)

**Type:** Internal Query
**File:** `convex/posts.ts:397`

Retrieves a post by ID. Only accessible from internal actions/mutations.

**Arguments:**

| Parameter | Type          | Required | Description                    |
| --------- | ------------- | -------- | ------------------------------ |
| `postId`  | `Id<"posts">` | Yes      | The ID of the post to retrieve |

**Returns:** `Post | null`

---

## Connections API

### `saveConnection`

**Type:** Public Action
**File:** `convex/connections.ts:24`

Saves or updates a user's OAuth connection with encrypted tokens. Called from OAuth callback flows.

**Arguments:**

| Parameter      | Type     | Required | Description                             |
| -------------- | -------- | -------- | --------------------------------------- |
| `platform`     | `string` | Yes      | Platform name ("twitter" \| "linkedin") |
| `accessToken`  | `string` | Yes      | OAuth access token (will be encrypted)  |
| `refreshToken` | `string` | Yes      | OAuth refresh token (will be encrypted) |
| `expiresAt`    | `number` | Yes      | Token expiration timestamp              |

**Returns:** `Id<"user_connections">`

**Security:**

- Tokens are encrypted using AES-256-GCM before storage
- Uses the `ENCRYPTION_KEY` environment variable

**Usage Example:**

```typescript
const saveConnection = useAction(api.connections.saveConnection);

await saveConnection({
  platform: "twitter",
  accessToken: "oauth_token_from_callback",
  refreshToken: "refresh_token_from_callback",
  expiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 days
});
```

---

### `getConnectionStatus`

**Type:** Public Query
**File:** `convex/connections.ts:230`

Gets the connection status for a specific platform for the authenticated user.

**Arguments:**

| Parameter  | Type     | Required | Description                             |
| ---------- | -------- | -------- | --------------------------------------- |
| `platform` | `string` | Yes      | Platform name ("twitter" \| "linkedin") |

**Returns:**

```typescript
{
  connected: boolean;
  expiresAt?: number;
  needsReauth: boolean;
}
```

**Usage Example:**

```typescript
const twitterStatus = useQuery(api.connections.getConnectionStatus, {
  platform: "twitter",
});

if (twitterStatus?.needsReauth) {
  // Show reconnect button
}
```

---

### `getDecryptedConnection` (Internal)

**Type:** Internal Action
**File:** `convex/connections.ts:136`

Retrieves and decrypts OAuth tokens for a specific platform. Restricted to internal use only.

**Arguments:**

| Parameter     | Type     | Required | Description   |
| ------------- | -------- | -------- | ------------- |
| `clerkUserId` | `string` | Yes      | The user's ID |
| `platform`    | `string` | Yes      | Platform name |

**Returns:**

```typescript
{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
} | null
```

---

## Templates API

### `createTemplate`

**Type:** Public Mutation
**File:** `convex/templates.ts:7`

Creates a new reusable content template.

**Arguments:**

| Parameter | Type       | Required | Description                             |
| --------- | ---------- | -------- | --------------------------------------- |
| `name`    | `string`   | Yes      | Template name (must be unique per user) |
| `content` | `string`   | Yes      | Template text content                   |
| `tags`    | `string[]` | Yes      | Tags for categorization                 |

**Returns:** `Id<"templates">`

**Validation:**

- Content cannot be empty
- Template name must be unique for the user

**Usage Example:**

```typescript
const createTemplate = useMutation(api.templates.createTemplate);

const templateId = await createTemplate({
  name: "Blog Promotion",
  content: "Check out my latest blog post: [URL]\n\n#buildinpublic",
  tags: ["blog", "promotion"],
});
```

---

### `updateTemplate`

**Type:** Public Mutation
**File:** `convex/templates.ts:54`

Updates an existing template.

**Arguments:**

| Parameter    | Type              | Required | Description                      |
| ------------ | ----------------- | -------- | -------------------------------- |
| `templateId` | `Id<"templates">` | Yes      | The ID of the template to update |
| `name`       | `string`          | No       | Updated name                     |
| `content`    | `string`          | No       | Updated content                  |
| `tags`       | `string[]`        | No       | Updated tags                     |

**Returns:** `boolean`

---

### `deleteTemplate`

**Type:** Public Mutation
**File:** `convex/templates.ts:115`

Deletes a template.

**Arguments:**

| Parameter    | Type              | Required | Description                      |
| ------------ | ----------------- | -------- | -------------------------------- |
| `templateId` | `Id<"templates">` | Yes      | The ID of the template to delete |

**Returns:** `boolean`

---

### `getTemplates`

**Type:** Public Query
**File:** `convex/templates.ts:149`

Retrieves user's templates, optionally filtered by tag.

**Arguments:**

| Parameter | Type     | Required | Description   |
| --------- | -------- | -------- | ------------- |
| `tag`     | `string` | No       | Filter by tag |

**Returns:** `Array<Template>` - Sorted alphabetically by name

**Usage Example:**

```typescript
const templates = useQuery(api.templates.getTemplates, {
  tag: "buildinpublic",
});
```

---

### `incrementTemplateUsage`

**Type:** Public Mutation
**File:** `convex/templates.ts:196`

Increments template usage count and updates last used timestamp.

**Arguments:**

| Parameter    | Type              | Required | Description            |
| ------------ | ----------------- | -------- | ---------------------- |
| `templateId` | `Id<"templates">` | Yes      | The ID of the template |

**Returns:** `boolean`

---

## Dashboard API

### `getDashboardStats`

**Type:** Public Query
**File:** `convex/dashboard.ts:14`

Gets dashboard statistics for the authenticated user.

**Returns:**

```typescript
{
  totalPosts: number;
  scheduledPosts: number;
  publishedPosts: number;
  failedPosts: number;
  connectedPlatforms: number;
}
```

**Usage Example:**

```typescript
const stats = useQuery(api.dashboard.getDashboardStats);

console.log(`Total posts: ${stats?.totalPosts}`);
```

---

### `getRecentPosts`

**Type:** Public Query
**File:** `convex/dashboard.ts:79`

Gets recent posts for dashboard activity feed.

**Arguments:**

| Parameter | Type     | Required | Description                             |
| --------- | -------- | -------- | --------------------------------------- |
| `limit`   | `number` | No       | Number of posts to return (default: 10) |

**Returns:** `Array<Post>` - Sorted by creation time descending

---

## Publishing API

### `publishTwitterPost` (Internal)

**Type:** Internal Action
**File:** `convex/publishing.ts:31`

Publishes a Twitter post at scheduled time. Triggered by Convex scheduler.

**Workflow:**

1. Retrieve post record
2. Update status to "Publishing"
3. Retrieve and decrypt OAuth tokens
4. Publish text post to X API
5. Post URL as reply thread (if provided)
6. Update status to "Published"
7. Handle errors with retry logic

**Error Handling:**

- Max retries: 3
- Retry delay: Exponential backoff (1 min, 2 min, 4 min)
- Transient errors (429, 5xx): Retry
- Permanent errors (401, 403, 400): No retry
- Sends Telegram notification on final failure

---

### `publishLinkedInPost` (Internal)

**Type:** Internal Action
**File:** `convex/publishing.ts:432`

Publishes a LinkedIn post at scheduled time. Triggered by Convex scheduler.

**Workflow:**

1. Retrieve post record
2. Check token expiration and refresh if needed (< 7 days)
3. Update status to "Publishing"
4. Get LinkedIn person ID
5. Publish UGC post to LinkedIn API
6. Post URL as comment (if provided)
7. Update status to "Published"
8. Handle errors with retry logic

**Token Refresh:**

- Automatically refreshes tokens expiring within 7 days
- LinkedIn access tokens: 60 days validity
- LinkedIn refresh tokens: 365 days validity

---

## Notifications API

### `sendFailureNotification` (Internal)

**Type:** Internal Action
**File:** `convex/notifications.ts:29`

Sends Telegram notification when post publishing fails.

**Arguments:**

| Parameter       | Type          | Required | Description                                  |
| --------------- | ------------- | -------- | -------------------------------------------- |
| `postId`        | `Id<"posts">` | Yes      | The ID of the failed post                    |
| `content`       | `string`      | Yes      | Post content (truncated to 100 chars)        |
| `errorMessage`  | `string`      | Yes      | Error description                            |
| `scheduledTime` | `number`      | Yes      | UTC timestamp                                |
| `retryCount`    | `number`      | Yes      | Number of retry attempts                     |
| `platform`      | `string`      | No       | "twitter" \| "linkedin" (default: "twitter") |

**Environment Variables:**

- `TELEGRAM_BOT_TOKEN` - Bot token from @BotFather
- `TELEGRAM_CHAT_ID` - Chat ID for notifications

**Message Format:**

```
🚨 *X/Twitter Post Publishing Failed*

*Content:* Check out my latest...

*Error:* X API Error 429: Rate limit exceeded

*Scheduled Time:* Jan 15, 2025, 10:00 AM PST

*Retry Attempts:* 3/3

*Post ID:* j17b4b7k8p9q5r6s7t8u9v0w
```

---

## Token Refresh API

### `refreshLinkedInToken` (Internal)

**Type:** Internal Action
**File:** `convex/tokenRefresh.ts:22`

Refreshes expired LinkedIn OAuth tokens.

**Arguments:**

| Parameter     | Type     | Required | Description   |
| ------------- | -------- | -------- | ------------- |
| `clerkUserId` | `string` | Yes      | The user's ID |

**Returns:**

```typescript
{
  success: boolean;
  expiresAt?: number;
  error?: string;
  needsReauth?: boolean; // true if refresh token expired
}
```

**Retry Logic:**

- Max retries: 3
- Timeout: 10 seconds per attempt
- Delay: Exponential backoff (1s, 2s, 4s)
- Retries on: 5xx errors, 429 rate limiting, timeouts

**Environment Variables:**

- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`

---

## Encryption API

### `encrypt` (Internal)

**Type:** Internal Action
**File:** `convex/encryption.ts:33`

Encrypts a plaintext string using AES-256-GCM encryption.

**Arguments:**

| Parameter   | Type     | Required | Description           |
| ----------- | -------- | -------- | --------------------- |
| `plaintext` | `string` | Yes      | The string to encrypt |

**Returns:** `string` - Base64-encoded string containing IV + auth tag + ciphertext

**Format:** `[IV (12 bytes)][Auth Tag (16 bytes)][Ciphertext]`

**Environment Variables:**

- `ENCRYPTION_KEY` - 32-byte base64-encoded key

---

### `decrypt` (Internal)

**Type:** Internal Action
**File:** `convex/encryption.ts:94`

Decrypts a ciphertext string encrypted with AES-256-GCM.

**Arguments:**

| Parameter    | Type     | Required | Description                     |
| ------------ | -------- | -------- | ------------------------------- |
| `ciphertext` | `string` | Yes      | Base64-encoded encrypted string |

**Returns:** `string` - The decrypted plaintext

---

### `migrateTokensToEncrypted`

**Type:** Public Action
**File:** `convex/encryption.ts:164`

Migration action to encrypt existing plain-text tokens in the `user_connections` table.

**Arguments:**

| Parameter | Type      | Required | Description                               |
| --------- | --------- | -------- | ----------------------------------------- |
| `dryRun`  | `boolean` | No       | If true, simulates without modifying data |

**Returns:**

```typescript
{
  totalRecords: number;
  encrypted: number;
  alreadyEncrypted: number;
  errors: number;
  dryRun: boolean;
}
```

**Usage:**

```typescript
// Dry run first
const dryRunResult = await migrateTokens({ dryRun: true });

// Then run actual migration
const result = await migrateTokens({ dryRun: false });
```

---

## Error Handling

### Common Error Patterns

**Authentication Errors:**

```typescript
throw new Error("Not authenticated");
```

- All public queries/mutations verify `ctx.auth.getUserIdentity()`
- Frontend should redirect to login on auth errors

**Validation Errors:**

```typescript
throw new Error("Twitter content exceeds 280 character limit");
```

- Client-side validation should prevent most validation errors
- Use error messages for user feedback

**Permission Errors:**

```typescript
throw new Error("Unauthorized: You can only edit your own posts");
```

- All operations verify ownership via `clerkUserId`

**API Errors:**

- X API errors: `XApiError` class with HTTP status code
- LinkedIn API errors: `LinkedInApiError` class with HTTP status code
- Classified as transient (retry) or permanent (no retry)

---

## Rate Limits

### X/Twitter API

- Rate limits vary by endpoint and account type
- 429 errors trigger automatic retry with exponential backoff
- Consider spacing scheduled posts to avoid rate limits

### LinkedIn API

- Rate limits: varies by endpoint
- 429 errors trigger automatic retry
- Access tokens: 60 days validity
- Refresh tokens: 365 days validity

---

## Best Practices

### Frontend Usage

**1. Use Reactive Queries:**

```typescript
const posts = useQuery(api.posts.getPosts);
// Automatically updates when data changes
```

**2. Handle Loading and Error States:**

```typescript
if (posts === undefined) return <Loading />;
if (posts === null) return <Error />;
```

**3. Optimistic Updates:**

```typescript
const createPost = useMutation(api.posts.createPost);

// Show immediate feedback, Convex handles sync
await createPost({ ... });
```

**4. Error Handling:**

```typescript
try {
  await createPost({ ... });
} catch (error) {
  toast.error(error.message);
}
```

### Backend Best Practices

**1. Always Verify Authentication:**

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");
```

**2. Use Indexes for Queries:**

```typescript
ctx.db
  .query("posts")
  .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
  .collect();
```

**3. Never Log Sensitive Data:**

```typescript
// ❌ Bad
console.log("Access token:", accessToken);

// ✅ Good
console.log("Token refresh successful");
```

**4. Use Transactions:**

- Convex mutations are automatically transactional
- Multiple database operations succeed or fail together

---

## Additional Resources

- [Convex Documentation](https://docs.convex.dev)
- [Clerk Authentication](https://clerk.com/docs)
- [X/Twitter API Reference](https://developer.twitter.com/en/docs/api-reference-index)
- [LinkedIn API Reference](https://learn.microsoft.com/en-us/linkedin/)
- [Project PRD](../docs/prd.md)
- [Architecture Document](../docs/architecture.md)
