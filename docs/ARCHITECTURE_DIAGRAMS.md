# Architecture Diagrams

Visual representations of the Social Posting Scheduler architecture, data flows, and system interactions.

## Table of Contents

- [System Architecture](#system-architecture)
- [Authentication Flow](#authentication-flow)
- [Post Publishing Flow](#post-publishing-flow)
- [OAuth Connection Flow](#oauth-connection-flow)
- [Data Model](#data-model)
- [Error Handling and Retry Logic](#error-handling-and-retry-logic)
- [Token Refresh Flow](#token-refresh-flow)
- [Component Architecture](#component-architecture)

---

## System Architecture

### High-Level Overview

```mermaid
graph TB
    subgraph "Frontend (Next.js)"
        UI[React Components]
        Pages[App Router Pages]
        Providers[Clerk + Convex Providers]
    end

    subgraph "Authentication (Clerk)"
        ClerkAuth[Clerk Auth]
        ClerkMiddleware[Middleware]
    end

    subgraph "Backend (Convex)"
        Queries[Queries]
        Mutations[Mutations]
        Actions[Actions]
        Scheduler[Scheduled Functions]
        DB[(Convex Database)]
    end

    subgraph "External APIs"
        Twitter[X/Twitter API]
        LinkedIn[LinkedIn API]
        Telegram[Telegram Bot API]
    end

    UI --> Providers
    Providers --> ClerkAuth
    Providers --> Queries
    UI --> Mutations

    ClerkMiddleware --> Pages
    ClerkAuth --> ClerkMiddleware

    Queries --> DB
    Mutations --> DB
    Mutations --> Scheduler

    Scheduler --> Actions
    Actions --> DB
    Actions --> Twitter
    Actions --> LinkedIn
    Actions --> Telegram
```

### Technology Stack

```mermaid
graph LR
    subgraph "Frontend Stack"
        NextJS[Next.js 15.5.4]
        React[React 19]
        TailwindCSS[Tailwind CSS 4]
        ShadcnUI[shadcn/ui]
    end

    subgraph "Backend Stack"
        ConvexDB[Convex Database]
        ConvexFunctions[Convex Functions]
        TypeScript[TypeScript 5]
    end

    subgraph "Auth & Security"
        ClerkSDK[Clerk SDK]
        AES[AES-256-GCM Encryption]
    end

    NextJS --> React
    NextJS --> TailwindCSS
    React --> ShadcnUI

    ConvexFunctions --> ConvexDB
    ConvexFunctions --> TypeScript

    ClerkSDK --> NextJS
    AES --> ConvexFunctions
```

---

## Authentication Flow

### User Authentication Workflow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant ClerkMiddleware
    participant ClerkAuth
    participant ConvexQuery
    participant Database

    User->>Browser: Access /dashboard
    Browser->>ClerkMiddleware: HTTP Request

    alt Not Authenticated
        ClerkMiddleware->>Browser: Redirect to /sign-in
        Browser->>ClerkAuth: Show Sign In
        User->>ClerkAuth: Enter Credentials
        ClerkAuth->>ClerkMiddleware: Set Auth Cookie
        ClerkMiddleware->>Browser: Redirect to /dashboard
    else Authenticated
        ClerkMiddleware->>Browser: Serve Page
    end

    Browser->>ConvexQuery: Query with Clerk Token
    ConvexQuery->>ConvexQuery: ctx.auth.getUserIdentity()
    ConvexQuery->>Database: Query with clerkUserId
    Database->>ConvexQuery: User Data
    ConvexQuery->>Browser: Return Data
    Browser->>User: Display Dashboard
```

### Convex Function Authentication

```mermaid
graph TD
    A[Convex Function Called] --> B{Check ctx.auth}
    B -->|No identity| C[Throw 'Not authenticated']
    B -->|Has identity| D[Extract clerkUserId]
    D --> E[Query with clerkUserId filter]
    E --> F{Data belongs to user?}
    F -->|No| G[Throw 'Unauthorized']
    F -->|Yes| H[Return Data]
```

---

## Post Publishing Flow

### Complete Publishing Workflow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant createPost
    participant Database
    participant Scheduler
    participant publishTwitterPost
    participant TwitterAPI
    participant updatePostStatus
    participant Telegram

    User->>UI: Schedule Post
    UI->>createPost: mutation { twitterContent, scheduledTime }

    createPost->>createPost: Validate content & time
    createPost->>Database: Insert post (status: "Scheduled")
    Database->>createPost: Return postId

    createPost->>Scheduler: Schedule at twitterScheduledTime
    Scheduler->>createPost: Return schedulerId
    createPost->>Database: Update post with schedulerId
    createPost->>UI: Return postId
    UI->>User: Show success message

    Note over Scheduler: Wait until scheduled time...

    Scheduler->>publishTwitterPost: Trigger action(postId)
    publishTwitterPost->>Database: Get post by ID
    publishTwitterPost->>updatePostStatus: Set status to "Publishing"

    publishTwitterPost->>publishTwitterPost: Get decrypted tokens
    publishTwitterPost->>TwitterAPI: POST /2/tweets

    alt Success
        TwitterAPI->>publishTwitterPost: Return tweetId

        opt URL provided
            publishTwitterPost->>TwitterAPI: POST /2/tweets (reply)
            TwitterAPI->>publishTwitterPost: Success
        end

        publishTwitterPost->>updatePostStatus: Set status to "Published"
        updatePostStatus->>Database: Update post
    else API Error
        TwitterAPI->>publishTwitterPost: Error (429 or 5xx)
        publishTwitterPost->>publishTwitterPost: Check retry count

        alt Retry available
            publishTwitterPost->>Scheduler: Schedule retry (exponential backoff)
            publishTwitterPost->>updatePostStatus: Set status to "Scheduled"
        else Max retries reached
            publishTwitterPost->>updatePostStatus: Set status to "Failed"
            publishTwitterPost->>Telegram: Send failure notification
        end
    end
```

### Post Status State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft: User creates post
    Draft --> Scheduled: User clicks "Schedule"
    Scheduled --> Publishing: Scheduled time reached
    Publishing --> Published: API success
    Publishing --> Scheduled: Transient error (retry)
    Publishing --> Failed: Permanent error or max retries

    Scheduled --> Scheduled: User edits post
    Scheduled --> [*]: User deletes post

    Failed --> [*]: User acknowledges
    Published --> [*]: Post archived
```

---

## OAuth Connection Flow

### Twitter/LinkedIn OAuth Integration

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant NextJSRoute as /api/auth/twitter/callback
    participant OAuthProvider as Twitter OAuth
    participant saveConnection
    participant encrypt
    participant Database

    User->>UI: Click "Connect Twitter"
    UI->>OAuthProvider: Redirect with client_id & scopes
    OAuthProvider->>User: Show Authorization Screen
    User->>OAuthProvider: Grant Permission
    OAuthProvider->>NextJSRoute: Redirect with code

    NextJSRoute->>OAuthProvider: Exchange code for tokens
    OAuthProvider->>NextJSRoute: Return { accessToken, refreshToken, expiresIn }

    NextJSRoute->>saveConnection: action({ platform, tokens, expiresAt })

    saveConnection->>encrypt: Encrypt accessToken
    encrypt->>saveConnection: Return encrypted accessToken

    saveConnection->>encrypt: Encrypt refreshToken
    encrypt->>saveConnection: Return encrypted refreshToken

    saveConnection->>Database: Insert/Update user_connections
    Database->>saveConnection: Return connectionId

    saveConnection->>NextJSRoute: Success
    NextJSRoute->>UI: Redirect to /settings?success=true
    UI->>User: Show "Connected successfully"
```

### Connection Status Check

```mermaid
graph TD
    A[getConnectionStatus Query] --> B[Query user_connections]
    B --> C{Connection exists?}
    C -->|No| D[Return { connected: false, needsReauth: false }]
    C -->|Yes| E{Token expired?}
    E -->|No| F[Return { connected: true, needsReauth: false, expiresAt }]
    E -->|Yes| G[Return { connected: true, needsReauth: true, expiresAt }]
```

---

## Data Model

### Database Schema

```mermaid
erDiagram
    posts {
        string _id PK
        number _creationTime
        string clerkUserId FK
        string status
        string twitterContent
        string linkedInContent
        number twitterScheduledTime
        number linkedInScheduledTime
        string url
        string twitterSchedulerId
        string linkedInSchedulerId
        string twitterPostId
        string linkedInPostId
        string errorMessage
        number retryCount
    }

    user_connections {
        string _id PK
        number _creationTime
        string clerkUserId FK
        string platform
        string accessToken
        string refreshToken
        number expiresAt
    }

    templates {
        string _id PK
        number _creationTime
        string clerkUserId FK
        string name
        string content
        array tags
        number lastUsedAt
        number usageCount
    }

    posts ||--o{ user_connections : "requires"
    templates }o--|| posts : "used in"
```

### Index Structure

```mermaid
graph LR
    subgraph "posts table"
        PostsIndex["Index: by_user<br/>[clerkUserId]"]
    end

    subgraph "user_connections table"
        ConnectionsIndex["Index: by_user_platform<br/>[clerkUserId, platform]"]
    end

    subgraph "templates table"
        TemplatesIndex["Index: by_user<br/>[clerkUserId]"]
    end

    PostsIndex --> |"Fast lookup by user"| Query1[getPosts]
    ConnectionsIndex --> |"Fast lookup by user & platform"| Query2[getConnectionStatus]
    TemplatesIndex --> |"Fast lookup by user"| Query3[getTemplates]
```

---

## Error Handling and Retry Logic

### Retry Decision Flow

```mermaid
graph TD
    A[Publishing Error Occurs] --> B{Get retry count}
    B --> C{Error transient?}

    C -->|Yes| D{retry < MAX_RETRIES?}
    C -->|No| E[Mark as Failed]

    D -->|Yes| F[Calculate backoff delay]
    D -->|No| E

    F --> G[Update status to 'Scheduled']
    G --> H[Increment retry count]
    H --> I[Schedule retry]

    E --> J[Store error message]
    J --> K[Send Telegram notification]

    subgraph "Transient Errors"
        T1[429 Rate Limit]
        T2[5xx Server Errors]
        T3[Network Timeouts]
        T4[Connection Resets]
    end

    subgraph "Permanent Errors"
        P1[401 Unauthorized]
        P2[403 Forbidden]
        P3[400 Bad Request]
        P4[Invalid Token]
    end
```

### Exponential Backoff Strategy

```mermaid
gantt
    title Retry Backoff Timeline
    dateFormat mm:ss
    axisFormat %M:%S

    section Initial Attempt
    Publish attempt 1        :done, t1, 00:00, 10s

    section First Retry
    Wait (1 min)             :active, w1, after t1, 1m
    Publish attempt 2        :done, t2, after w1, 10s

    section Second Retry
    Wait (2 min)             :active, w2, after t2, 2m
    Publish attempt 3        :done, t3, after w2, 10s

    section Third Retry
    Wait (4 min)             :active, w3, after t3, 4m
    Publish attempt 4        :done, t4, after w3, 10s

    section Final
    Mark as Failed           :crit, f1, after t4, 1s
    Send notification        :crit, n1, after f1, 5s
```

---

## Token Refresh Flow

### LinkedIn Token Refresh Workflow

```mermaid
sequenceDiagram
    participant publishLinkedInPost
    participant getDecryptedConnection
    participant Database
    participant refreshLinkedInToken
    participant LinkedInOAuth
    participant encrypt

    publishLinkedInPost->>getDecryptedConnection: Get tokens
    getDecryptedConnection->>Database: Query user_connections
    Database->>getDecryptedConnection: Return encrypted tokens
    getDecryptedConnection->>getDecryptedConnection: Decrypt tokens
    getDecryptedConnection->>publishLinkedInPost: Return { accessToken, expiresAt }

    publishLinkedInPost->>publishLinkedInPost: Check expiresAt

    alt Token expires within 7 days
        publishLinkedInPost->>refreshLinkedInToken: Refresh token

        refreshLinkedInToken->>LinkedInOAuth: POST /oauth/v2/accessToken
        LinkedInOAuth->>refreshLinkedInToken: New tokens

        refreshLinkedInToken->>encrypt: Encrypt new accessToken
        encrypt->>refreshLinkedInToken: Encrypted accessToken

        refreshLinkedInToken->>encrypt: Encrypt new refreshToken
        encrypt->>refreshLinkedInToken: Encrypted refreshToken

        refreshLinkedInToken->>Database: Update user_connections
        refreshLinkedInToken->>publishLinkedInPost: { success: true, expiresAt }

        publishLinkedInPost->>getDecryptedConnection: Get refreshed tokens
    else Token still valid
        publishLinkedInPost->>publishLinkedInPost: Continue with existing token
    end

    publishLinkedInPost->>publishLinkedInPost: Publish post with valid token
```

### Token Expiration Timeline

```mermaid
gantt
    title LinkedIn Token Lifecycle
    dateFormat YYYY-MM-DD

    section Access Token (60 days)
    Valid period             :active, at1, 2025-01-01, 60d
    Refresh window (7 days)  :crit, at2, 2025-02-23, 7d
    Expired                  :done, at3, 2025-03-02, 1d

    section Refresh Token (365 days)
    Valid period             :active, rt1, 2025-01-01, 365d
    Expired (need reauth)    :done, rt2, 2026-01-01, 1d
```

---

## Component Architecture

### Frontend Component Hierarchy

```mermaid
graph TD
    RootLayout[app/layout.tsx<br/>Root Layout] --> Providers[ConvexClientProvider + ClerkProvider]

    Providers --> Dashboard[app/dashboard/page.tsx]
    Providers --> Schedule[app/schedule/page.tsx]
    Providers --> History[app/history/page.tsx]
    Providers --> Settings[app/settings/page.tsx]
    Providers --> Templates[app/templates/page.tsx]

    Dashboard --> DashboardMetrics[components/dashboard-metrics.tsx]
    Dashboard --> ChartArea[components/chart-area-interactive.tsx]

    Schedule --> PostScheduler[components/features/PostScheduler.tsx]
    Schedule --> TemplatePickerModal[components/features/TemplatePickerModal.tsx]

    History --> PostHistory[components/features/PostHistory.tsx]
    History --> DataTable[components/data-table.tsx]

    Settings --> ConnectionManager[components/features/ConnectionManager.tsx]

    Templates --> TemplateLibrary[components/features/TemplateLibrary.tsx]
    Templates --> TemplateCard[components/features/TemplateCard.tsx]
    Templates --> TemplateFormModal[components/features/TemplateFormModal.tsx]

    subgraph "Shared UI Components"
        UIButton[components/ui/button.tsx]
        UIDialog[components/ui/dialog.tsx]
        UICalendar[components/ui/calendar.tsx]
        UITable[components/ui/table.tsx]
    end

    PostScheduler --> UIButton
    PostScheduler --> UIDialog
    PostScheduler --> UICalendar

    DataTable --> UITable
```

### Data Flow Architecture

```mermaid
graph LR
    subgraph "React Components"
        UI[UI Layer]
    end

    subgraph "Convex Hooks"
        UseQuery[useQuery]
        UseMutation[useMutation]
        UseAction[useAction]
    end

    subgraph "Convex Backend"
        Queries[Query Functions]
        Mutations[Mutation Functions]
        Actions[Action Functions]
    end

    subgraph "Database"
        DB[(Convex DB)]
    end

    UI -->|Read| UseQuery
    UseQuery -->|Subscribe| Queries
    Queries -->|Realtime updates| UseQuery
    Queries <-->|Read| DB

    UI -->|Write| UseMutation
    UseMutation -->|Call| Mutations
    Mutations -->|Transactional| DB

    UI -->|External| UseAction
    UseAction -->|Call| Actions
    Actions -->|Side effects| DB
```

### Realtime Updates Flow

```mermaid
sequenceDiagram
    participant ComponentA as Component A (Post Scheduler)
    participant ComponentB as Component B (Post History)
    participant ConvexClient as Convex Client
    participant ConvexBackend as Convex Backend
    participant Database

    ComponentA->>ConvexClient: useMutation(createPost)
    ComponentB->>ConvexClient: useQuery(getPosts)

    ConvexClient->>ConvexBackend: Subscribe to getPosts query
    ConvexBackend->>Database: Watch posts table

    ComponentA->>ConvexClient: Execute createPost mutation
    ConvexClient->>ConvexBackend: Call mutation
    ConvexBackend->>Database: Insert new post

    Database->>ConvexBackend: Data changed notification
    ConvexBackend->>ConvexBackend: Re-run getPosts query
    ConvexBackend->>ConvexClient: Push updated results
    ConvexClient->>ComponentB: Trigger re-render with new data

    Note over ComponentA,ComponentB: Component B automatically shows new post
```

---

## Security Architecture

### Encryption Flow

```mermaid
graph TD
    A[OAuth Tokens Received] --> B[encrypt Action]
    B --> C[Generate Random IV]
    C --> D[Create AES-256-GCM Cipher]
    D --> E[Encrypt Token]
    E --> F[Get Auth Tag]
    F --> G[Combine IV + Auth Tag + Ciphertext]
    G --> H[Base64 Encode]
    H --> I[Store in Database]

    I --> J[decrypt Action]
    J --> K[Base64 Decode]
    K --> L[Extract IV, Auth Tag, Ciphertext]
    L --> M[Create Decipher]
    M --> N[Verify Auth Tag]
    N --> O{Valid?}
    O -->|Yes| P[Decrypt to Plaintext]
    O -->|No| Q[Throw Error]

    style I fill:#f9f,stroke:#333,stroke-width:2px
    style P fill:#9f9,stroke:#333,stroke-width:2px
```

### Security Layers

```mermaid
graph TB
    subgraph "Layer 1: Authentication"
        L1[Clerk JWT Verification]
    end

    subgraph "Layer 2: Authorization"
        L2[clerkUserId Check]
    end

    subgraph "Layer 3: Data Encryption"
        L3[AES-256-GCM]
    end

    subgraph "Layer 4: HTTPS"
        L4[TLS/SSL]
    end

    Request[API Request] --> L1
    L1 --> L2
    L2 --> L3
    L3 --> L4
    L4 --> Database[(Secure Database)]
```

---

## Deployment Architecture

### Production Infrastructure

```mermaid
graph TB
    subgraph "Vercel (Frontend)"
        NextJSApp[Next.js Application]
        EdgeFunctions[Edge Functions]
    end

    subgraph "Convex (Backend)"
        ConvexCloud[Convex Cloud]
        ConvexDB[(Convex Database)]
        ScheduledJobs[Scheduled Functions]
    end

    subgraph "Clerk (Auth)"
        ClerkService[Clerk Authentication]
    end

    subgraph "External Services"
        Twitter[X/Twitter API]
        LinkedIn[LinkedIn API]
        Telegram[Telegram Bot API]
    end

    Users[Users] --> NextJSApp
    NextJSApp --> ClerkService
    NextJSApp --> ConvexCloud

    ConvexCloud --> ConvexDB
    ConvexCloud --> ScheduledJobs

    ScheduledJobs --> Twitter
    ScheduledJobs --> LinkedIn
    ScheduledJobs --> Telegram
```

---

## Performance Considerations

### Query Optimization

```mermaid
graph TD
    A[Query Request] --> B{Has Index?}
    B -->|Yes| C[Index Scan O(log n)]
    B -->|No| D[Full Table Scan O(n)]

    C --> E[Fast Result <100ms]
    D --> F[Slow Result >1s]

    style C fill:#9f9
    style D fill:#f99
    style E fill:#9f9
    style F fill:#f99
```

### Caching Strategy

```mermaid
graph LR
    subgraph "Client"
        ReactQuery[Convex Client Cache]
    end

    subgraph "Network"
        HTTP[HTTP Request]
    end

    subgraph "Server"
        ConvexCache[Convex Query Cache]
        DB[(Database)]
    end

    Component[React Component] -->|useQuery| ReactQuery
    ReactQuery -->|Cache miss| HTTP
    HTTP --> ConvexCache
    ConvexCache -->|Cache miss| DB
    DB -->|Data| ConvexCache
    ConvexCache -->|Data| HTTP
    HTTP -->|Data| ReactQuery
    ReactQuery -->|Realtime updates| Component
```

---

## Additional Resources

- [Convex Architecture Docs](https://docs.convex.dev/production/architecture)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Clerk Authentication Flow](https://clerk.com/docs/authentication/overview)
- [Project PRD](./prd.md)
- [Architecture Document](./architecture.md)
- [API Reference](./API_REFERENCE.md)
