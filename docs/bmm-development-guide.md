# Development Guide

## Prerequisites

### Required Software
- **Node.js**: 20.x or later
- **pnpm**: Latest version (`npm install -g pnpm`)
- **Git**: For version control

### External Accounts
- **Convex Account**: [convex.dev](https://convex.dev) (free tier available)
- **Twitter Developer Account**: [developer.twitter.com](https://developer.twitter.com)
- **LinkedIn Developer Account**: [developer.linkedin.com](https://developer.linkedin.com)
- **Google AI Studio**: [aistudio.google.com](https://aistudio.google.com) (Gemini API key)
- **Telegram** (optional): For failure notifications

---

## Initial Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd social_post
pnpm install
```

### 2. Environment Configuration

Create `.env.local` file in project root:

```bash
# Convex
CONVEX_DEPLOYMENT=<your-convex-deployment-url>
NEXT_PUBLIC_CONVEX_URL=<your-convex-deployment-url>

# Better Auth
BETTER_AUTH_SECRET=<generate-random-secret>
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

# Twitter/X OAuth
TWITTER_CLIENT_ID=<from-twitter-developer-portal>
TWITTER_CLIENT_SECRET=<from-twitter-developer-portal>
TWITTER_CALLBACK_URL=http://localhost:3000/api/auth/twitter/callback

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=<from-linkedin-developer-portal>
LINKEDIN_CLIENT_SECRET=<from-linkedin-developer-portal>
LINKEDIN_CALLBACK_URL=http://localhost:3000/api/auth/linkedin/callback

# Google Gemini AI
GEMINI_API_KEY=<from-google-ai-studio>

# Encryption (for OAuth tokens)
ENCRYPTION_KEY=<generate-32-byte-hex-string>

# Single-User Mode (optional)
DISABLE_SIGNUPS=true
NEXT_PUBLIC_DISABLE_SIGNUPS=true

# Telegram (optional, future feature)
# TELEGRAM_BOT_TOKEN=<your-bot-token>
# TELEGRAM_CHAT_ID=<your-chat-id>
```

### 3. Convex Setup

```bash
# Initialize Convex (first time only)
pnpm dlx convex dev --once

# Start Convex dev server
pnpm dlx convex dev
```

This will:
1. Create a Convex project (if not exists)
2. Deploy schema and functions
3. Start local development server
4. Open Convex dashboard

### 4. OAuth App Setup

#### Twitter/X
1. Go to [developer.twitter.com/en/portal/dashboard](https://developer.twitter.com/en/portal/dashboard)
2. Create new app (or use existing)
3. Settings → User authentication settings
4. Enable OAuth 2.0
5. Add callback URL: `http://localhost:3000/api/auth/twitter/callback`
6. Copy Client ID and Client Secret to `.env.local`

#### LinkedIn
1. Go to [developer.linkedin.com/apps](https://developer.linkedin.com/apps)
2. Create new app
3. Products → Request "Share on LinkedIn" and "Sign In with LinkedIn"
4. Auth → Add redirect URL: `http://localhost:3000/api/auth/linkedin/callback`
5. Copy Client ID and Client Secret to `.env.local`

### 5. Generate Encryption Key

```bash
# Generate 32-byte hex string for token encryption
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy output to `ENCRYPTION_KEY` in `.env.local`

---

## Development Commands

### Start Development

```bash
# Run both frontend and backend (recommended)
pnpm run dev

# Or run separately:
pnpm run dev:frontend    # Next.js dev server (port 3000)
pnpm run dev:backend     # Convex dev server
```

### Pre-development Setup
```bash
# Ensure Convex is running and open dashboard
pnpm run predev
```

### Testing

```bash
# Run all tests
pnpm run test

# Watch mode
pnpm run test:watch

# Coverage report
pnpm run test:coverage
```

### Build

```bash
# Build Next.js for production
pnpm run build

# Start production server
pnpm run start
```

### Convex Commands

```bash
# Deploy to production
pnpm dlx convex deploy

# Open Convex dashboard
pnpm dlx convex dashboard

# View Convex documentation
pnpm dlx convex docs
```

### Code Quality

```bash
# Lint code
pnpm run lint

# Format code (Prettier)
pnpm dlx prettier --write .
```

---

## Project Structure

### Key Directories

```
social_post/
├── app/              # Next.js App Router (pages & routes)
├── components/       # React components
├── convex/           # Backend (database + functions)
├── lib/              # Utilities
├── hooks/            # Custom React hooks
├── __tests__/        # Test suites
└── docs/             # Documentation
```

For detailed structure, see `bmm-source-tree-analysis.md`.

---

## Development Workflow

### 1. Feature Development Flow

1. **Create Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Develop Feature**
   - Add/modify components in `components/`
   - Add Convex functions in `convex/`
   - Update schema if needed (`convex/schema.ts`)
   - Write tests in `__tests__/`

3. **Test Changes**
   ```bash
   pnpm run test
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### 2. Adding New Convex Functions

1. Create function file in `convex/`
2. Define function with proper validators:
   ```typescript
   import { query, mutation, action } from "./_generated/server";
   import { v } from "convex/values";

   export const myQuery = query({
     args: { userId: v.string() },
     returns: v.array(v.object({ ... })),
     handler: async (ctx, args) => {
       // Implementation
     },
   });
   ```

3. Use in React component:
   ```typescript
   import { useQuery } from "convex/react";
   import { api } from "@/convex/_generated/api";

   const data = useQuery(api.myFile.myQuery, { userId });
   ```

### 3. Adding New Components

1. Create component file:
   - UI primitives: `components/ui/`
   - Feature components: `components/features/`

2. Use shadcn CLI for new UI primitives:
   ```bash
   pnpm dlx shadcn add button
   pnpm dlx shadcn add dialog
   # etc.
   ```

3. Import and use:
   ```tsx
   import { Button } from "@/components/ui/button";
   ```

### 4. Schema Changes

1. Edit `convex/schema.ts`
2. Convex automatically deploys changes on save
3. For breaking changes:
   - Add new optional fields first
   - Deploy
   - Backfill data via mutation
   - Make required in next version

---

## Testing Strategy

### Unit Tests

**Convex Functions**:
```typescript
// convex/myFunctions.test.ts
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";

describe("myFunction", () => {
  it("should work", async () => {
    const t = convexTest(schema);
    const result = await t.query(api.myFile.myFunction, { arg: "value" });
    expect(result).toBe("expected");
  });
});
```

**React Components**:
```typescript
// __tests__/components/MyComponent.test.tsx
import { render, screen } from "@testing-library/react";
import MyComponent from "@/components/features/MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

### Integration Tests

Located in `__tests__/integration/`:
- Auth flow tests
- Publishing flow tests
- Full user journeys

---

## Common Development Tasks

### Add New shadcn Component

```bash
pnpm dlx shadcn add <component-name>
```

Example:
```bash
pnpm dlx shadcn add alert
pnpm dlx shadcn add popover
```

### Debug Convex Functions

1. Open Convex dashboard:
   ```bash
   pnpm dlx convex dashboard
   ```

2. Go to Functions tab
3. Select function
4. Use "Run Function" to test with custom inputs
5. View logs in Logs tab

### Add Environment Variable

1. Add to `.env.local`
2. Reference in code:
   - **Client-side**: Prefix with `NEXT_PUBLIC_`
   - **Server-side** (Convex): Use `process.env.VAR_NAME` in actions

3. Add to `.env.example` for documentation

### Database Queries

Use Convex dashboard:
1. Open Data tab
2. Select table
3. View documents
4. Edit/delete records
5. Run custom queries

---

## Debugging

### Frontend Debugging

- **React DevTools**: Browser extension
- **Next.js DevTools**: Built-in (appears in dev mode)
- **Console Logs**: `console.log()` in components
- **Breakpoints**: Browser DevTools

### Backend Debugging

- **Convex Dashboard Logs**: Real-time function logs
- **console.log() in Functions**: Shows in Convex dashboard
- **Error Messages**: Detailed stack traces in dashboard
- **Function Explorer**: Test functions with custom inputs

### Common Issues

#### Convex Not Connecting
- Check `NEXT_PUBLIC_CONVEX_URL` is set correctly
- Ensure Convex dev server is running (`pnpm dlx convex dev`)
- Verify ConvexClientProvider is in root layout

#### OAuth Callback Errors
- Verify callback URLs match in OAuth provider settings
- Check client ID/secret are correct
- Ensure redirect URLs are whitelisted

#### Build Errors
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && pnpm install`
- Check TypeScript errors: `pnpm run lint`

---

## Code Style Guidelines

### TypeScript
- Use strict type checking
- Define interfaces for all objects
- Avoid `any` type
- Use Convex validators (`v.*`) for runtime validation

### React Components
- Use functional components
- Prefer hooks over class components
- Extract reusable logic into custom hooks
- Keep components focused (single responsibility)

### Naming Conventions
- **Components**: PascalCase (`PostScheduler.tsx`)
- **Functions**: camelCase (`createPost`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Types/Interfaces**: PascalCase (`PostStatus`)

### File Organization
- Group related components in folders
- Keep test files alongside source when possible
- Use index files for clean imports

---

## Performance Optimization

### Frontend
- Use React Server Components where possible
- Lazy load heavy components
- Optimize images with Next.js `<Image />`
- Minimize bundle size

### Backend
- Use Convex indexes for efficient queries
- Avoid full table scans
- Batch operations where possible
- Cache expensive computations

---

## Deployment

### Production Deployment

1. **Build and Test**
   ```bash
   pnpm run build
   pnpm run test
   ```

2. **Deploy Convex**
   ```bash
   pnpm dlx convex deploy --prod
   ```

3. **Deploy Next.js** (Vercel example)
   ```bash
   vercel --prod
   ```

4. **Update Environment Variables**
   - Set production environment variables in hosting platform
   - Update OAuth callback URLs to production domains

### Environment Variables for Production

Update `.env.production`:
- Change `NEXT_PUBLIC_BETTER_AUTH_URL` to production URL
- Update `TWITTER_CALLBACK_URL` to production URL
- Update `LINKEDIN_CALLBACK_URL` to production URL
- Keep all API keys secure (use platform's secret management)

---

## Monitoring & Maintenance

### Convex Dashboard
- Monitor function execution times
- Track error rates
- View database size and usage
- Analyze query performance

### Error Tracking
- Check Convex logs for backend errors
- Monitor browser console for frontend errors
- Review failed post publishes in database

### Performance Monitoring
- Use Next.js built-in analytics
- Monitor Core Web Vitals
- Track API response times

---

## Getting Help

### Documentation
- See `docs/` folder for comprehensive guides
- Read CLAUDE.md for AI development guidelines
- Check Convex docs: [docs.convex.dev](https://docs.convex.dev)
- Read Next.js docs: [nextjs.org/docs](https://nextjs.org/docs)

### Community
- Convex Discord: [convex.dev/community](https://convex.dev/community)
- Next.js Discord: [nextjs.org/discord](https://nextjs.org/discord)

### Common Resources
- shadcn/ui: [ui.shadcn.com](https://ui.shadcn.com)
- Better Auth: [better-auth.com](https://better-auth.com)
- Tailwind CSS: [tailwindcss.com](https://tailwindcss.com)

---

*Generated: 2025-11-12*
*Project: Social Post*
