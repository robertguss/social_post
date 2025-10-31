# Data Models

## Post

```
{
  id: string
  userId: string
  status: "draft" | "scheduled" | "publishing" | "published" | "failed"

  twitterContent: string
  linkedInContent: string
  url?: string

  twitterScheduledTime?: timestamp
  linkedInScheduledTime?: timestamp

  twitterPublishedTime?: timestamp
  linkedInPublishedTime?: timestamp

  twitterPostId?: string
  linkedInPostId?: string

  tags?: string[]
  category?: string

  errorMessage?: string
  retryCount?: number

  createdAt: timestamp
  updatedAt: timestamp
}
```

## Template (Phase 3)

```
{
  id: string
  userId: string
  title: string
  content: string
  platform: "twitter" | "linkedin" | "both"
  contentType: string (hook, thread, announcement, etc.)
  creator?: string
  effectiveness?: 1-5 rating
  notes?: string
  createdAt: timestamp
}
```

## UserConnection

```
{
  id: string
  userId: string
  platform: "twitter" | "linkedin"
  accessToken: string (encrypted)
  refreshToken: string (encrypted)
  expiresAt: timestamp
  status: "active" | "expired" | "revoked"
  lastChecked: timestamp
}
```

---
