# User Guide

Complete guide for using the Social Posting Scheduler to schedule and publish content to X/Twitter and LinkedIn.

## Table of Contents

- [Getting Started](#getting-started)
- [Connecting Social Media Accounts](#connecting-social-media-accounts)
- [Scheduling Posts](#scheduling-posts)
- [Managing Templates](#managing-templates)
- [Viewing Post History](#viewing-post-history)
- [Dashboard Overview](#dashboard-overview)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [FAQs](#faqs)

---

## Getting Started

### First-Time Setup

1. **Create an Account**
   - Visit the application URL
   - Click "Sign Up" or "Sign In" (powered by Better Auth)
   - Complete the authentication process

2. **Connect Social Media Accounts**
   - Navigate to Settings page
   - Connect X/Twitter account
   - Connect LinkedIn account
   - Verify connections are active

3. **Schedule Your First Post**
   - Go to Schedule page
   - Write your content
   - Select publish time
   - Click "Schedule Post"

### Navigation

The application has five main pages accessible from the sidebar:

- **Dashboard** - Overview of your posting activity and stats
- **Schedule** - Create and schedule new posts
- **History** - View all past and upcoming posts
- **Templates** - Manage reusable content templates
- **Settings** - Connect social media accounts

---

## Connecting Social Media Accounts

### Connecting X/Twitter

1. Navigate to **Settings** page
2. Click **"Connect Twitter"** button
3. You'll be redirected to X/Twitter authorization page
4. Review the permissions requested:
   - Read tweets
   - Write tweets
   - View profile information
5. Click **"Authorize app"**
6. You'll be redirected back to Settings
7. Verify "Connected" status appears

**Permissions Explained:**
- **tweet.read**: Allows viewing your tweets
- **tweet.write**: Allows posting tweets on your behalf
- **users.read**: Allows reading your profile
- **offline.access**: Allows refresh tokens for long-term access

### Connecting LinkedIn

1. Navigate to **Settings** page
2. Click **"Connect LinkedIn"** button
3. You'll be redirected to LinkedIn authorization page
4. Review the permissions requested:
   - Profile information
   - Post on your behalf
5. Click **"Allow"**
6. You'll be redirected back to Settings
7. Verify "Connected" status appears

**Token Refresh:**
- LinkedIn tokens automatically refresh when expiring within 7 days
- Access tokens valid for 60 days
- Refresh tokens valid for 365 days
- No action required from you

### Connection Status

On the Settings page, you'll see:

- **Connected** - Account is active and ready to post
- **Needs Reauth** - Token expired, click "Reconnect"
- **Not Connected** - Click "Connect" to authorize

### Reconnecting Accounts

If you see "Needs Reauth":

1. Click the **"Reconnect"** button
2. Go through the OAuth flow again
3. Your previous posts remain intact

---

## Scheduling Posts

### Creating a Single-Platform Post

#### Twitter-Only Post

1. Go to **Schedule** page
2. Check the **Twitter** checkbox
3. Enter your content (max 280 characters)
   - Character count shown below textarea
   - Warning at 260 characters
   - Error at 280 characters
4. (Optional) Add a URL to post as reply
5. Click the **Twitter Scheduled Time** field
6. Select date and time
7. Click **"Schedule Post"**

**Character Counting:**
```
✓ 0-259 characters:   Normal (black)
⚠ 260-279 characters: Warning (orange)
✗ 280+ characters:    Error (red)
```

#### LinkedIn-Only Post

1. Go to **Schedule** page
2. Check the **LinkedIn** checkbox
3. Enter your content (max 3,000 characters)
4. (Optional) Add a URL to post as first comment
5. Click the **LinkedIn Scheduled Time** field
6. Select date and time
7. Click **"Schedule Post"**

### Creating a Multi-Platform Post

To post to both Twitter and LinkedIn:

1. Go to **Schedule** page
2. Check **both** Twitter and LinkedIn checkboxes
3. Enter platform-specific content:
   - **Twitter**: Short version (280 chars max)
   - **LinkedIn**: Expanded version (3,000 chars max)
4. Set **different** scheduled times for each platform
5. (Optional) Add URL for both platforms
6. Click **"Schedule Post"**

**Recommended Workflow:**
1. Write Twitter version first (constrained to 280 chars)
2. Copy and expand for LinkedIn
3. Stagger posting times (e.g., Twitter at 10 AM, LinkedIn at 2 PM)

### URL Auto-Posting

When you include a URL:

**Twitter:**
- URL posted as a **reply** to your main tweet
- Creates a thread: Main tweet → URL reply
- Example:
  ```
  Main tweet: "Check out my latest blog post!"
  Reply: "https://example.com/blog-post"
  ```

**LinkedIn:**
- URL posted as **first comment** on your post
- Example:
  ```
  Main post: "Excited to share my latest article..."
  Comment: "https://example.com/blog-post"
  ```

### Selecting Dates and Times

The datetime picker allows you to:

1. **Select Date**: Click on calendar to choose day
2. **Select Time**: Use hour/minute dropdowns
3. **Timezone**: Times are in your local timezone
4. **Future Only**: Cannot schedule posts in the past

**Tips:**
- Schedule at least 5 minutes in the future
- Consider your audience's timezone
- Stagger posts for different platforms

### Using Templates

Save time with reusable templates:

1. Click **"Use Template"** button on Schedule page
2. Browse your template library
3. Click on a template to insert its content
4. Edit as needed
5. Continue scheduling as normal

Templates support:
- **Placeholders**: [URL], [TITLE], etc. (manual replacement)
- **Tags**: Filter templates by category
- **Usage tracking**: See most-used templates

---

## Managing Templates

### Creating a Template

1. Go to **Templates** page
2. Click **"Create Template"** button
3. Fill in the form:
   - **Name**: Unique name (e.g., "Blog Promotion")
   - **Content**: Template text with placeholders
   - **Tags**: Add categorization tags
4. Click **"Create"**

**Example Template:**
```
Name: Blog Promotion
Content: Check out my latest blog post: [URL]

[SUMMARY]

#buildinpublic #tech

Tags: blog, promotion, buildinpublic
```

### Editing a Template

1. Find the template in the library
2. Click the **"Edit"** icon
3. Update name, content, or tags
4. Click **"Save"**

### Deleting a Template

1. Find the template in the library
2. Click the **"Delete"** icon
3. Confirm deletion
4. Template is permanently removed

### Filtering Templates by Tag

1. Go to **Templates** page
2. Click on a tag button (e.g., "promotion")
3. View only templates with that tag
4. Click "All" to clear filter

### Template Usage Stats

Each template shows:
- **Usage Count**: How many times it's been used
- **Last Used**: When it was last inserted
- Templates sorted alphabetically by name

---

## Viewing Post History

### Accessing Post History

1. Go to **History** page
2. View all your posts in a table

### Post Status Indicators

Posts can have the following statuses:

| Status | Meaning | Color |
|--------|---------|-------|
| **Scheduled** | Waiting to be published | Blue |
| **Publishing** | Currently being posted | Yellow |
| **Published** | Successfully posted | Green |
| **Failed** | Publishing failed after retries | Red |

### Filtering Posts

**By Platform:**
- Click "All", "Twitter", or "LinkedIn" tabs
- View posts for specific platform

**By Date Range:**
- Use date picker to select start and end dates
- Filter posts within time range
- Useful for monthly/quarterly reviews

### Viewing Post Details

Each row shows:
- **Content**: Preview of post text
- **Platform**: Twitter, LinkedIn, or both
- **Scheduled Time**: When it was/will be posted
- **Status**: Current state
- **Actions**: Edit or delete (for scheduled posts)

### Editing Scheduled Posts

For posts with "Scheduled" status:

1. Click the **"Edit"** icon
2. Modify content, URL, or scheduled time
3. Click **"Update Post"**
4. Old scheduled action canceled, new one created

**Note:** Only scheduled posts can be edited. Published/failed posts are read-only.

### Deleting Scheduled Posts

For posts with "Scheduled" status:

1. Click the **"Delete"** icon
2. Confirm deletion
3. Post removed and scheduled action canceled

### Understanding Failed Posts

If a post shows "Failed" status:

1. **Check Error Message**: Hover over status for details
2. **Common Causes**:
   - Token expired (reconnect account)
   - API rate limit (try again later)
   - Network issues (transient error)
   - Content policy violation
3. **Action**: Create a new post with corrected content

**Error Notification:**
- If Telegram is configured, you'll receive notification
- Includes post content, error details, and retry count

---

## Dashboard Overview

### Dashboard Metrics

The dashboard shows key statistics:

**Total Posts**
- Count of all posts (all statuses)
- Lifetime total

**Scheduled Posts**
- Posts with future scheduled times
- Waiting to be published

**Published Posts**
- Successfully published posts
- All-time count

**Failed Posts**
- Posts that failed after all retry attempts
- Requires attention

**Connected Platforms**
- Number of active platform connections (0-2)
- Shows if reconnection needed

### Recent Activity

View your 10 most recent posts:
- Quick overview of latest activity
- Shows status and platform
- Click to view full details in History

### Charts and Analytics

**Post Activity Chart:**
- Visual representation of posting trends
- Grouped by date
- Breakdown by platform and status

---

## Best Practices

### Content Strategy

**Twitter Best Practices:**
- Keep it concise (aim for 240-260 chars for best engagement)
- Use hashtags strategically (1-3 max)
- Include URL as reply, not in main tweet
- Post during peak hours (9-11 AM, 6-8 PM in your audience's timezone)

**LinkedIn Best Practices:**
- Longer-form content performs well (500-1,000 chars)
- Tell a story or share insights
- Use line breaks for readability
- Include URL as comment to avoid link preview issues
- Post during business hours (Tuesday-Thursday, 8 AM - 2 PM)

### Scheduling Strategy

**Staggered Posting:**
```
Twitter:   10:00 AM - Announcement
LinkedIn:   2:00 PM - Deep-dive version
```

**Batch Scheduling:**
- Set aside time weekly to schedule multiple posts
- Use templates for consistent messaging
- Plan content calendar in advance

**Optimal Frequency:**
- Twitter: 3-5 times per day
- LinkedIn: 1-2 times per day
- Space posts at least 3-4 hours apart

### Template Organization

**Use Tags Effectively:**
- `announcement` - Product launches
- `blog` - Blog post promotions
- `buildinpublic` - Startup journey posts
- `closing` - Sign-off phrases
- `hashtags` - Popular hashtag combinations

**Template Naming:**
- Use descriptive names: "Blog Promotion with Stats"
- Include platform if specific: "Twitter - Thread Starter"
- Version templates: "Product Launch v1", "Product Launch v2"

### Account Security

**Protect Your Access:**
- Use strong passwords for Better Auth account
- Enable 2FA on X/Twitter and LinkedIn accounts
- Regularly review connected apps
- Monitor unauthorized access

**Token Management:**
- Reconnect when you see "Needs Reauth"
- Don't ignore connection warnings
- Tokens expire for security reasons

---

## Troubleshooting

### Post Not Publishing

**Symptoms:** Post stuck in "Scheduled" status past scheduled time

**Solutions:**
1. Check Convex dashboard logs
2. Verify connection status in Settings
3. Look for error message in Post History
4. Check if scheduled function is running (admin)

### OAuth Connection Failed

**Symptoms:** Error message during connection flow

**Solutions:**
1. Verify callback URLs are correct
2. Clear browser cache and cookies
3. Try different browser
4. Check platform status (twitter.com/status, linkedin.com/help)
5. Ensure correct permissions granted

### Character Limit Exceeded

**Symptoms:** Cannot schedule post, character count red

**Solutions:**
1. Edit content to reduce characters
2. For Twitter, use URL as reply instead of in main text
3. Remove unnecessary words or hashtags
4. Use abbreviations where appropriate

### Template Not Saving

**Symptoms:** Template doesn't appear after creation

**Solutions:**
1. Ensure name is unique
2. Check content is not empty
3. Refresh the page
4. Check browser console for errors

### Posts Publishing to Wrong Platform

**Symptoms:** Post published to unexpected platform

**Solutions:**
1. Double-check checkboxes before scheduling
2. Review Post History to verify selected platforms
3. Edit scheduled post if caught early

### Rate Limit Errors

**Symptoms:** Post fails with "429 Rate Limit" error

**Solutions:**
1. Wait before rescheduling (retry logic handles automatically)
2. Space out scheduled posts more
3. Check X/Twitter or LinkedIn rate limits
4. System will auto-retry with exponential backoff

---

## FAQs

### General Questions

**Q: Can I schedule posts for multiple accounts?**
A: Currently, this is a single-user application. You can only connect one X/Twitter and one LinkedIn account.

**Q: How far in advance can I schedule posts?**
A: You can schedule posts as far into the future as you want. There's no limit.

**Q: Can I schedule recurring posts?**
A: Not currently. You need to manually schedule each post. This feature may be added in the future.

**Q: What happens if I delete a scheduled post?**
A: The post is removed from the database and the scheduled action is canceled. The post will not be published.

**Q: Can I preview how my post will look?**
A: Not currently. The app shows a textarea for content. Preview functionality may be added in the future.

### Platform-Specific Questions

**Q: Why is my Twitter post a thread when I didn't want it to be?**
A: If you added a URL, it's posted as a reply. This is intentional to avoid link preview issues in the main tweet.

**Q: Can I post images or videos?**
A: Not currently. The app only supports text posts with optional URLs.

**Q: Why is my LinkedIn post showing a link preview?**
A: If you include the URL in the main content, LinkedIn generates a preview. Use the URL field to post it as a comment instead.

**Q: Can I tag people in posts?**
A: Yes, include `@username` in your content. The platform will handle mentions.

**Q: Do hashtags work?**
A: Yes, include hashtags in your content (e.g., `#buildinpublic`).

### Technical Questions

**Q: Where is my data stored?**
A: All data is stored in Convex cloud database. OAuth tokens are encrypted with AES-256-GCM.

**Q: Is my data secure?**
A: Yes. Tokens are encrypted, authentication is required, and all data is scoped to your user ID.

**Q: What happens if the app goes down during scheduled time?**
A: Convex scheduled functions are reliable. If there's a brief outage, the function will run when the system recovers. For extended outages, posts may fail and you'll receive notification.

**Q: Can I export my post history?**
A: Not currently built-in. You can access your data via Convex dashboard or contact support.

**Q: How do I backup my templates?**
A: Templates are stored in Convex database. You can export via the dashboard or use the Convex CLI.

### Billing and Usage Questions

**Q: Is there a limit on how many posts I can schedule?**
A: No hard limit, but consider Convex database usage limits for your plan.

**Q: Do I need to pay for Twitter/LinkedIn API access?**
A: You need developer accounts (free tier available), but API usage limits apply.

**Q: What happens if I hit API rate limits?**
A: The system automatically retries with exponential backoff. Severe rate limiting may cause post failures.

### Error Messages

**Q: "Not authenticated" error**
A: Your session expired. Sign in again.

**Q: "Twitter connection not found" error**
A: You need to connect your Twitter account in Settings.

**Q: "Token expired" error**
A: Reconnect your account in Settings.

**Q: "Character limit exceeded" error**
A: Reduce content length to meet platform limits (280 for Twitter, 3000 for LinkedIn).

**Q: "Scheduled time must be in the future" error**
A: Select a time at least a few minutes from now.

---

## Getting Help

If you need additional assistance:

1. **Check Documentation**: Review API Reference and Architecture Diagrams
2. **Search Issues**: Look for similar problems in GitHub Issues
3. **Ask in Discussions**: Post questions in GitHub Discussions
4. **Review Logs**: Check Convex dashboard for detailed error logs
5. **Contact Support**: Create a GitHub Issue with details

---

## Keyboard Shortcuts

(If implemented in future versions)

- `Ctrl/Cmd + N` - New post
- `Ctrl/Cmd + T` - New template
- `Ctrl/Cmd + H` - Go to History
- `Ctrl/Cmd + D` - Go to Dashboard
- `Ctrl/Cmd + S` - Save/Schedule
- `Esc` - Close modal

---

## Mobile Usage

The app is mobile-responsive. On mobile devices:

- Sidebar collapses into hamburger menu
- Tables scroll horizontally
- Datetime picker optimized for touch
- All features work on mobile

**Recommended Mobile Workflow:**
1. Create templates on desktop
2. Schedule quick posts on mobile using templates
3. Review analytics on desktop

---

## Tips and Tricks

1. **Batch Content Creation**: Write multiple posts in one session, schedule throughout the week
2. **Template Variables**: Use [URL], [TITLE] in templates for easy replacement
3. **Stagger Times**: Post Twitter and LinkedIn at different times for max engagement
4. **Monitor Failures**: Set up Telegram notifications to catch issues immediately
5. **Review Analytics**: Use dashboard to identify best-performing posting times
6. **Test First**: Schedule one post in near future to test OAuth connections
7. **URL Strategy**: Post URLs as replies/comments to improve engagement vs. link previews

---

**Happy scheduling!**
