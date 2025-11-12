# Developer Guide

Complete guide for developers working on the Social Posting Scheduler codebase.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Coding Standards](#coding-standards)
- [Working with Convex](#working-with-convex)
- [Frontend Development](#frontend-development)
- [Backend Development](#backend-development)
- [Testing](#testing)
- [Debugging](#debugging)
- [Contributing](#contributing)
- [Release Process](#release-process)

---

## Development Setup

### Prerequisites

- **Node.js** 20+ (check with `node --version`)
- **pnpm** 8+ (install with `npm i -g pnpm`)
- **Git** 2.30+
- **VS Code** (recommended) with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - Convex

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/social_post.git
cd social_post

# Install dependencies
pnpm install

# Copy environment variables template
cp .env.example .env.local

# Initialize Convex
pnpm dlx convex dev
```

### Environment Configuration

#### .env.local (Next.js)

```bash
# Better Auth
BETTER_AUTH_SECRET=your_secret_key_here
BETTER_AUTH_URL=http://localhost:3000

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-dev-deployment.convex.cloud

# OAuth Callbacks
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

#### Convex Environment Variables

Set in Convex Dashboard → Settings → Environment Variables:

```bash
# Auth
BETTER_AUTH_SECRET=your_secret_key_here

# OAuth
TWITTER_CLIENT_ID=your_dev_twitter_client_id
TWITTER_CLIENT_SECRET=your_dev_twitter_client_secret
LINKEDIN_CLIENT_ID=your_dev_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_dev_linkedin_client_secret

# Security
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Notifications (optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# AI-Assisted Content Generation
# Obtain from: https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key
```

### Development Workflow

```bash
# Start development servers (parallel)
pnpm run dev

# Or start individually
pnpm run dev:frontend  # Next.js on :3000
pnpm run dev:backend   # Convex functions

# Open Convex dashboard
pnpm dlx convex dashboard

# Run tests
pnpm run test

# Run linter
pnpm run lint
```

---

## Project Architecture

### Directory Structure

```
social_post/
├── app/                       # Next.js App Router
│   ├── layout.tsx             # Root layout (providers)
│   ├── page.tsx               # Landing page
│   ├── dashboard/             # Dashboard page
│   ├── schedule/              # Schedule page
│   ├── history/               # History page
│   ├── settings/              # Settings page
│   ├── templates/             # Templates page
│   └── api/                   # API routes
│       ├── auth/
│       │   └── [...all]/
│       │       └── route.ts   # Better Auth routes
│       ├── twitter/
│       │   └── callback/
│       │       └── route.ts
│       └── linkedin/
│           └── callback/
│               └── route.ts
├── components/                # React components
│   ├── ui/                    # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── calendar.tsx
│   │   └── ...
│   ├── features/              # Feature components
│   │   ├── PostScheduler.tsx
│   │   ├── PostHistory.tsx
│   │   ├── ConnectionManager.tsx
│   │   ├── TemplateLibrary.tsx
│   │   └── ...
│   └── ConvexClientProvider.tsx
├── convex/                    # Backend (Convex)
│   ├── _generated/            # Auto-generated types
│   ├── schema.ts              # Database schema
│   ├── auth.config.ts         # Better Auth config
│   ├── posts.ts               # Post CRUD
│   ├── publishing.ts          # Publishing actions
│   ├── connections.ts         # OAuth connections
│   ├── templates.ts           # Template CRUD
│   ├── dashboard.ts           # Dashboard queries
│   ├── encryption.ts          # Token encryption
│   ├── tokenRefresh.ts        # Token refresh
│   └── notifications.ts       # Telegram notifications
├── hooks/                     # Custom React hooks
│   └── use-mobile.ts
├── lib/                       # Utilities
│   └── utils.ts               # cn() helper
├── docs/                      # Documentation
├── __tests__/                 # Test files
│   ├── components/
│   ├── convex/
│   ├── integration/
│   └── api/
├── __mocks__/                 # Test mocks
├── middleware.ts              # Better Auth route protection
├── jest.config.ts             # Jest configuration
├── vitest.config.ts           # Vitest configuration
└── package.json
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15.5.4 | React framework with App Router |
| **UI** | React 19 | Component library |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |
| **Components** | shadcn/ui | Accessible UI components |
| **Backend** | Convex 1.28.0 | Database + serverless functions |
| **Auth** | Better Auth | User authentication |
| **Language** | TypeScript 5 | Type safety |
| **Testing** | Jest + Vitest | Unit + integration tests |
| **Linting** | ESLint 9 | Code quality |

---

## Coding Standards

### TypeScript

**Use Explicit Types:**
```typescript
// ✅ Good
function calculateTotal(price: number, quantity: number): number {
  return price * quantity;
}

// ❌ Bad
function calculateTotal(price, quantity) {
  return price * quantity;
}
```

**Avoid `any`:**
```typescript
// ✅ Good
interface Post {
  _id: Id<"posts">;
  status: string;
  content: string;
}

// ❌ Bad
const post: any = await ctx.db.get(postId);
```

**Use Convex Validators:**
```typescript
// ✅ Good
export const createPost = mutation({
  args: {
    content: v.string(),
    scheduledTime: v.number(),
  },
  handler: async (ctx, args) => {
    // ...
  },
});
```

### React Components

**Functional Components:**
```typescript
// ✅ Good
export function PostScheduler() {
  const [content, setContent] = useState("");
  return <div>{content}</div>;
}

// ❌ Bad (class components)
export class PostScheduler extends React.Component {
  // ...
}
```

**Props Typing:**
```typescript
interface PostCardProps {
  post: Doc<"posts">;
  onEdit: (id: Id<"posts">) => void;
  onDelete: (id: Id<"posts">) => void;
}

export function PostCard({ post, onEdit, onDelete }: PostCardProps) {
  // ...
}
```

**Hooks Best Practices:**
```typescript
// ✅ Good - Custom hooks
function usePostScheduler() {
  const [content, setContent] = useState("");
  const createPost = useMutation(api.posts.createPost);

  const handleSubmit = async () => {
    await createPost({ content, scheduledTime: Date.now() });
  };

  return { content, setContent, handleSubmit };
}
```

### Convex Functions

**Always Verify Auth:**
```typescript
export const myQuery = query({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // ✅ Always check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    // Use userId for queries
  },
});
```

**Use Indexes:**
```typescript
// ✅ Good - Uses index
const posts = await ctx.db
  .query("posts")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .collect();

// ❌ Bad - Full table scan
const posts = await ctx.db
  .query("posts")
  .filter((q) => q.eq(q.field("userId"), userId))
  .collect();
```

**Internal vs Public:**
```typescript
// Public - accessible from frontend
export const createPost = mutation({ /* ... */ });

// Internal - only accessible from backend
export const updatePostStatus = internalMutation({ /* ... */ });
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| **Files** | kebab-case | `post-scheduler.tsx` |
| **Components** | PascalCase | `PostScheduler` |
| **Functions** | camelCase | `handleSubmit` |
| **Constants** | SCREAMING_SNAKE_CASE | `MAX_RETRIES` |
| **Types/Interfaces** | PascalCase | `PostCardProps` |
| **Convex Tables** | snake_case | `user_connections` |

### File Organization

**Component Files:**
```typescript
// imports
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// types
interface PostSchedulerProps {
  // ...
}

// component
export function PostScheduler({ }: PostSchedulerProps) {
  // hooks
  const [content, setContent] = useState("");
  const createPost = useMutation(api.posts.createPost);

  // handlers
  const handleSubmit = async () => {
    // ...
  };

  // render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

---

## Working with Convex

### Schema Design

Define schemas in `convex/schema.ts`:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  posts: defineTable({
    userId: v.string(),
    status: v.string(),
    twitterContent: v.optional(v.string()),
    linkedInContent: v.optional(v.string()),
    // ...
  }).index("by_user", ["userId"]),

  user_connections: defineTable({
    userId: v.string(),
    platform: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
  }).index("by_user_platform", ["userId", "platform"]),
});
```

**Index Best Practices:**
- Always index fields used in `withIndex()` queries
- Multi-field indexes for compound queries
- Index the most selective field first

### Query Patterns

**Basic Query:**
```typescript
export const getPosts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});
```

**Query with Filters:**
```typescript
export const getScheduledPosts = query({
  args: { startDate: v.number(), endDate: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "Scheduled"),
          q.gte(q.field("scheduledTime"), args.startDate),
          q.lte(q.field("scheduledTime"), args.endDate)
        )
      )
      .collect();

    return posts;
  },
});
```

### Mutation Patterns

**Create:**
```typescript
export const createPost = mutation({
  args: {
    content: v.string(),
    scheduledTime: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const postId = await ctx.db.insert("posts", {
      userId: identity.subject,
      content: args.content,
      scheduledTime: args.scheduledTime,
      status: "Scheduled",
    });

    return postId;
  },
});
```

**Update:**
```typescript
export const updatePost = mutation({
  args: {
    postId: v.id("posts"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (post.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.postId, {
      content: args.content,
    });
  },
});
```

**Delete:**
```typescript
export const deletePost = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (post.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.postId);
  },
});
```

### Action Patterns

**External API Call:**
```typescript
"use node";  // Required for Node.js APIs

import { action } from "./_generated/server";

export const publishToTwitter = action({
  args: { content: v.string() },
  handler: async (ctx, args) => {
    // Call external API
    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.TWITTER_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: args.content }),
    });

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.id;
  },
});
```

**Calling Internal Mutations from Actions:**
```typescript
export const publishPost = internalAction({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    // Get post data
    const post = await ctx.runQuery(internal.posts.getPostById, {
      postId: args.postId,
    });

    // Call external API
    const tweetId = await publishToTwitter(post.content);

    // Update database
    await ctx.runMutation(internal.posts.updatePostStatus, {
      postId: args.postId,
      status: "Published",
      twitterPostId: tweetId,
    });
  },
});
```

### Scheduled Functions

```typescript
import { internal } from "./_generated/api";

export const schedulePost = mutation({
  args: {
    content: v.string(),
    scheduledTime: v.number(),
  },
  handler: async (ctx, args) => {
    // Create post
    const postId = await ctx.db.insert("posts", {
      content: args.content,
      status: "Scheduled",
    });

    // Schedule publishing action
    await ctx.scheduler.runAt(
      args.scheduledTime,
      internal.publishing.publishPost,
      { postId }
    );

    return postId;
  },
});
```

---

## Frontend Development

### Convex React Hooks

**useQuery:**
```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function PostList() {
  const posts = useQuery(api.posts.getPosts);

  if (posts === undefined) return <div>Loading...</div>;
  if (posts === null) return <div>Error loading posts</div>;

  return (
    <div>
      {posts.map((post) => (
        <div key={post._id}>{post.content}</div>
      ))}
    </div>
  );
}
```

**useMutation:**
```typescript
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function CreatePost() {
  const [content, setContent] = useState("");
  const createPost = useMutation(api.posts.createPost);

  const handleSubmit = async () => {
    try {
      await createPost({ content, scheduledTime: Date.now() });
      setContent("");
      toast.success("Post scheduled!");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={content} onChange={(e) => setContent(e.target.value)} />
      <button type="submit">Schedule</button>
    </form>
  );
}
```

**useAction:**
```typescript
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export function SaveConnection() {
  const saveConnection = useAction(api.connections.saveConnection);

  const handleConnect = async (tokens) => {
    await saveConnection({
      platform: "twitter",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    });
  };

  return <button onClick={handleConnect}>Connect Twitter</button>;
}
```

### shadcn/ui Components

```bash
# Add new components
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add calendar
```

**Usage:**
```typescript
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function MyComponent() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Dialog</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogHeader>
          <div>Dialog content...</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### Tailwind CSS

**Utility Classes:**
```tsx
<div className="flex items-center justify-between p-4 bg-background rounded-lg border">
  <h2 className="text-2xl font-bold">Title</h2>
  <Button variant="outline">Action</Button>
</div>
```

**Responsive Design:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Grid items */}
</div>
```

**Dark Mode:**
```tsx
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
  {/* Content adapts to theme */}
</div>
```

---

## Testing

### Unit Tests (Jest)

**Test Convex Functions:**
```typescript
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../convex/schema";
import { createPost, getPosts } from "../convex/posts";

describe("posts", () => {
  it("should create a post", async () => {
    const t = convexTest(schema);

    const postId = await t.mutation(createPost, {
      content: "Test post",
      scheduledTime: Date.now() + 3600000,
    });

    expect(postId).toBeDefined();
  });

  it("should retrieve user's posts", async () => {
    const t = convexTest(schema);

    // Create test posts
    await t.mutation(createPost, { /* ... */ });

    // Query posts
    const posts = await t.query(getPosts, {});

    expect(posts).toHaveLength(1);
    expect(posts[0].content).toBe("Test post");
  });
});
```

**Test React Components:**
```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { PostScheduler } from "@/components/features/PostScheduler";

describe("PostScheduler", () => {
  it("should render form", () => {
    render(<PostScheduler />);
    expect(screen.getByLabelText("Content")).toBeInTheDocument();
  });

  it("should update character count", () => {
    render(<PostScheduler />);
    const textarea = screen.getByLabelText("Content");

    fireEvent.change(textarea, { target: { value: "Test" } });

    expect(screen.getByText("4 / 280")).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
import { convexTest } from "convex-test";
import schema from "../convex/schema";

describe("Post Publishing Flow", () => {
  it("should schedule and publish post", async () => {
    const t = convexTest(schema);

    // 1. Create post
    const postId = await t.mutation(createPost, {
      content: "Integration test",
      scheduledTime: Date.now() + 1000,
    });

    // 2. Verify status is Scheduled
    let post = await t.query(getPostById, { postId });
    expect(post.status).toBe("Scheduled");

    // 3. Simulate scheduled function execution
    await t.action(publishPost, { postId });

    // 4. Verify status is Published
    post = await t.query(getPostById, { postId });
    expect(post.status).toBe("Published");
  });
});
```

---

## Debugging

### Convex Logs

**Console Logging:**
```typescript
export const myFunction = mutation({
  handler: async (ctx, args) => {
    console.log("[Debug] Starting function", { args });

    try {
      const result = await someOperation();
      console.log("[Debug] Operation successful", { result });
      return result;
    } catch (error) {
      console.error("[Debug] Operation failed", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  },
});
```

**View Logs:**
- Convex Dashboard → Logs
- Filter by log level, function name, time range
- Search for specific log messages

### Browser DevTools

**React DevTools:**
- Install React DevTools extension
- Inspect component tree
- View props and state
- Track re-renders

**Network Tab:**
- Monitor Convex WebSocket connection
- View query/mutation calls
- Check OAuth callback responses

### VS Code Debugging

**launch.json:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "pnpm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

---

## Contributing

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to GitHub
git push origin feature/my-feature

# Open Pull Request on GitHub
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add template picker modal
fix: resolve character count bug
docs: update API reference
chore: upgrade dependencies
test: add integration tests for publishing
refactor: extract validation logic
```

### Pull Request Process

1. **Create PR** with descriptive title and description
2. **Run Tests**: Ensure all tests pass
3. **Run Linter**: Fix any linting errors
4. **Request Review**: Assign reviewers
5. **Address Feedback**: Make requested changes
6. **Merge**: Squash and merge when approved

### Code Review Checklist

- [ ] Code follows style guide
- [ ] Tests added for new features
- [ ] Documentation updated
- [ ] No console.log in production code
- [ ] Error handling implemented
- [ ] Performance considerations addressed
- [ ] Security best practices followed

---

## Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes

### Release Steps

```bash
# 1. Update version in package.json
pnpm version patch  # or minor, major

# 2. Update CHANGELOG.md
# Add new version section with changes

# 3. Commit and tag
git add .
git commit -m "chore: release v1.2.3"
git tag v1.2.3

# 4. Push to GitHub
git push && git push --tags

# 5. Deploy Convex
pnpm dlx convex deploy --prod

# 6. Deploy Frontend
vercel --prod

# 7. Create GitHub Release
# Via GitHub UI with changelog
```

---

## Additional Resources

- [Convex Documentation](https://docs.convex.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Better Auth Documentation](https://www.better-auth.com/docs)

---

**Happy coding!**
