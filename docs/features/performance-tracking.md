# Performance Tracking Feature

## Overview

The Performance Tracking feature enables the Social Post Scheduler to learn from your posted content's performance and improve posting time recommendations based on your actual audience engagement data.

**Status**: Feature is implemented but **INACTIVE** until API access is configured.

## Table of Contents

1. [Feature Description](#feature-description)
2. [Requirements](#requirements)
3. [Twitter/X API Setup](#twitterx-api-setup)
4. [LinkedIn API Setup](#linkedin-api-setup)
5. [Convex Configuration](#convex-configuration)
6. [Activation Steps](#activation-steps)
7. [Rate Limits & Quotas](#rate-limits--quotas)
8. [Troubleshooting](#troubleshooting)
9. [API Pricing](#api-pricing)

---

## Feature Description

### What It Does

- **Fetches engagement metrics** (likes, shares, comments, impressions) from Twitter and LinkedIn APIs for your published posts
- **Stores historical performance data** in the `post_performance` table
- **Analyzes patterns** to identify your best-performing posting times
- **Personalizes recommendations** by weighting industry research (60%) with your historical data (40%)
- **Visualizes insights** through the Performance Insights page (`/insights`)

### How It Works

1. **Scheduled Fetch**: A cron job runs daily to fetch engagement metrics for posts published in the past 7 days
2. **Data Storage**: Metrics are stored in the `post_performance` table with links to the original post
3. **Algorithm Enhancement**: The `getRecommendedTimes` query uses historical data to adjust engagement scores
4. **UI Display**: The `/insights` page shows aggregated data by hour of day with filtering options

---

## Requirements

### API Access Levels

#### Twitter/X API

- **Required Tier**: Free tier or higher
- **OAuth Scopes**: `tweet.read`, `users.read`
- **Analytics Access**: Basic metrics (likes, retweets, replies, impressions) available in Free tier
- **Note**: Some analytics features may require Twitter API Premium ($100/month) or Enterprise tier

#### LinkedIn API

- **Required Tier**: LinkedIn Marketing Developer Platform (basic tier or higher)
- **OAuth Scopes**: `r_organization_social`, `r_basicprofile`
- **Analytics Access**: Post statistics available with Marketing API access
- **Note**: LinkedIn's free tier has limited analytics access; Marketing Developer Platform required for full features

### Technical Prerequisites

- Convex deployment (production or development)
- Environment variable access in Convex dashboard
- OAuth tokens for Twitter and LinkedIn (with appropriate scopes)

---

## Twitter/X API Setup

### Step 1: Create a Twitter Developer Account

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Sign in with your Twitter account
3. Apply for a developer account (approval can take 1-2 days)
4. Create a new project and app

### Step 2: Generate API Credentials

1. In your Twitter app settings, go to **Keys and Tokens**
2. Generate the following credentials:
   - **API Key** (also called Consumer Key)
   - **API Secret Key** (also called Consumer Secret)
   - **Bearer Token** (for app-only authentication)
3. Save these credentials securely (you'll need them for Convex)

### Step 3: Configure OAuth 2.0

1. Go to **User authentication settings**
2. Enable **OAuth 2.0**
3. Set the following permissions:
   - Read access to tweets
   - Read access to users
4. Add your callback URL: `https://your-app.convex.site/api/twitter/callback` (adjust based on your deployment)

### Step 4: Required API Endpoints

The feature uses the following Twitter API v2 endpoint:

```
GET https://api.twitter.com/2/tweets/:id
Query Parameters: tweet.fields=public_metrics
```

**Response Example**:
```json
{
  "data": {
    "id": "1234567890",
    "text": "Example tweet",
    "public_metrics": {
      "retweet_count": 10,
      "reply_count": 5,
      "like_count": 42,
      "quote_count": 2,
      "impression_count": 1200
    }
  }
}
```

### Step 5: Test API Access

Use curl to test your Bearer Token:

```bash
curl -X GET "https://api.twitter.com/2/tweets/1234567890?tweet.fields=public_metrics" \
  -H "Authorization: Bearer YOUR_BEARER_TOKEN"
```

---

## LinkedIn API Setup

### Step 1: Create a LinkedIn App

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Click **Create app**
3. Fill in app details:
   - App name: "Social Post Scheduler"
   - LinkedIn Page: Associate with your LinkedIn page
   - Privacy policy URL: Your app's privacy policy
   - App logo: Upload a logo

### Step 2: Request API Access

1. In your app settings, go to **Products**
2. Request access to:
   - **Share on LinkedIn** (for posting)
   - **Marketing Developer Platform** (for analytics)
3. LinkedIn will review your request (can take several days)

### Step 3: Configure OAuth 2.0

1. Go to **Auth** tab in your LinkedIn app
2. Add the following OAuth 2.0 scopes:
   - `r_basicprofile` - Read basic profile information
   - `w_member_social` - Post on user's behalf
   - `r_organization_social` - Read organization social posts
3. Add redirect URLs for OAuth flow

### Step 4: Generate Access Token

LinkedIn uses OAuth 2.0 with short-lived access tokens:

1. Implement OAuth 2.0 flow to get authorization code
2. Exchange code for access token
3. Refresh tokens expire after 60 days (must re-authenticate)

### Step 5: Required API Endpoints

The feature uses the following LinkedIn API endpoints:

```
GET https://api.linkedin.com/v2/socialActions/{shareUrn}/statistics
```

**Response Example**:
```json
{
  "totalShareStatistics": {
    "shareCount": 10,
    "likeCount": 42,
    "commentCount": 5,
    "impressionCount": 1500
  }
}
```

### Step 6: Test API Access

Use curl to test your access token:

```bash
curl -X GET "https://api.linkedin.com/v2/socialActions/{shareUrn}/statistics" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Convex Configuration

### Step 1: Add Environment Variables

1. Go to your [Convex Dashboard](https://dashboard.convex.dev/)
2. Select your project
3. Navigate to **Settings** > **Environment Variables**
4. Add the following variables:

```bash
TWITTER_API_KEY=your_twitter_bearer_token_here
LINKEDIN_API_KEY=your_linkedin_access_token_here
PERFORMANCE_TRACKING_ENABLED=false  # Set to "true" when ready to activate
```

**Security Note**: Never commit API keys to your repository. Always use Convex environment variables.

### Step 2: Verify Deployment

1. Deploy your Convex functions: `pnpm dlx convex deploy`
2. Check that `convex/analytics.ts` is deployed successfully
3. Verify environment variables are accessible in production

### Step 3: Set Up Scheduled Function

Create a `convex/crons.ts` file (if it doesn't exist) to schedule the metrics fetch:

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run daily at 6 AM UTC to fetch engagement metrics
crons.daily(
  "fetch-engagement-metrics",
  { hourUTC: 6 },
  internal.analytics.scheduledMetricsFetch
);

export default crons;
```

**Note**: Uncomment or activate this cron job only after verifying API access works.

---

## Activation Steps

### Pre-Activation Checklist

- [ ] Twitter API credentials configured and tested
- [ ] LinkedIn API credentials configured and tested
- [ ] Environment variables added to Convex
- [ ] Scheduled function created in `convex/crons.ts`
- [ ] Test with a small set of posts first

### Activation Process

1. **Test API Calls Manually**:
   - Use the Convex dashboard to manually trigger `fetchEngagementMetrics` with a test post ID
   - Verify that metrics are returned correctly
   - Check for errors in Convex logs

2. **Enable Feature Flag**:
   ```bash
   PERFORMANCE_TRACKING_ENABLED=true
   ```

3. **Activate Scheduled Function**:
   - Uncomment the cron job in `convex/crons.ts`
   - Deploy: `pnpm dlx convex deploy`

4. **Monitor Initial Run**:
   - Check Convex logs after the first scheduled run
   - Verify that posts are being processed
   - Confirm metrics are being stored in `post_performance` table

5. **Verify UI Display**:
   - Visit `/insights` page
   - Check that performance data is displayed correctly
   - Test filters (platform, date range)

### Rollback Steps

If you need to deactivate the feature:

1. Set environment variable: `PERFORMANCE_TRACKING_ENABLED=false`
2. Comment out the cron job in `convex/crons.ts`
3. Deploy changes

Data in the `post_performance` table will be preserved for future re-activation.

---

## Rate Limits & Quotas

### Twitter API Rate Limits

| Tier           | Requests per 15 minutes | Tweets per month |
|----------------|-------------------------|------------------|
| Free           | 900                     | 500,000          |
| Basic ($100/m) | 10,000                  | 10,000,000       |
| Pro ($5000/m)  | 10,000                  | 10,000,000       |

**Rate Limiting Strategy**:
- The scheduled function adds a 100ms delay between Twitter API calls
- This ensures we stay well under the 900 requests/15min limit (max 150 requests in 15 min)

### LinkedIn API Rate Limits

| Tier           | Requests per day | Notes                               |
|----------------|------------------|-------------------------------------|
| Basic (Free)   | ~100             | Throttled after initial quota       |
| Marketing API  | 1,000+           | Varies by partnership agreement     |

**Rate Limiting Strategy**:
- The scheduled function adds a 1-second delay between LinkedIn API calls
- Processes a maximum of 86 LinkedIn posts per day (24 hours × 3600 seconds / 1000ms delay)

### Handling Rate Limit Errors

If you hit rate limits:

1. **Twitter**:
   ```json
   {
     "errors": [{
       "message": "Rate limit exceeded",
       "code": 88
     }]
   }
   ```
   - Wait 15 minutes before retrying
   - Consider upgrading to Basic tier if regularly hitting limits

2. **LinkedIn**:
   ```json
   {
     "status": 429,
     "message": "Too Many Requests"
   }
   ```
   - Wait 24 hours before retrying
   - Consider applying for Marketing Developer Platform access

---

## Troubleshooting

### Common Issues

#### 1. "Performance tracking not yet implemented" Error

**Cause**: `PERFORMANCE_TRACKING_ENABLED` is set to `false` or not set.

**Solution**:
```bash
# In Convex dashboard > Environment Variables
PERFORMANCE_TRACKING_ENABLED=true
```

#### 2. "Authentication failed" Error

**Cause**: API credentials are invalid or expired.

**Solution**:
- Verify API keys in Convex environment variables
- For LinkedIn, refresh the OAuth token (expires after 60 days)
- For Twitter, regenerate Bearer Token if needed

#### 3. No Data in Performance Insights

**Cause**: Either:
- Feature is newly activated (no data collected yet)
- No posts have been published
- Scheduled function hasn't run yet

**Solution**:
- Wait for the scheduled cron job to run (daily at 6 AM UTC)
- Manually trigger `scheduledMetricsFetch` from Convex dashboard for testing
- Check Convex logs for any errors during execution

#### 4. Rate Limit Errors in Logs

**Cause**: Too many API calls in a short time period.

**Solution**:
- The scheduled function already implements delays (100ms for Twitter, 1s for LinkedIn)
- Consider reducing the frequency of the cron job (e.g., every 2 days instead of daily)
- Upgrade to higher API tier if needed

#### 5. Missing Engagement Metrics

**Cause**: API response doesn't include all metrics (e.g., impressions not available).

**Solution**:
- This is expected behavior - `impressions` field is optional
- Twitter Free tier may not include impression counts
- Upgrade to Twitter Premium for full analytics access

---

## API Pricing

### Twitter API Pricing (as of 2024)

- **Free Tier**: $0/month
  - 1,500 tweets per month (post limit)
  - 10,000 tweet reads per month
  - 500,000 tweets per month (read limit via API)

- **Basic Tier**: $100/month
  - 3,000 tweets per month
  - 50,000 tweets per month (read limit)
  - Access to advanced search

- **Pro Tier**: $5,000/month
  - 300,000 tweets per month
  - Full v2 access
  - Real-time streaming

**Recommendation**: Start with Free tier. Upgrade to Basic if you need more API calls or better analytics.

### LinkedIn API Pricing

- **Free Tier**: $0/month
  - Limited to ~100 API calls per day
  - Basic profile and post access

- **Marketing Developer Platform**: Varies
  - Contact LinkedIn for partnership pricing
  - Required for production-level analytics access
  - Typically $500-$5,000/month depending on usage

**Recommendation**: Start with Free tier for testing. Apply for Marketing Developer Platform if you need production-level access.

---

## Next Steps

After successfully activating performance tracking:

1. **Monitor Data Collection**: Check the `/insights` page regularly to see if data is being collected
2. **Verify Recommendations**: Test that the `getRecommendedTimes` query is using historical data (check for improved personalization)
3. **Optimize Posting Times**: Use the insights to schedule posts at your best-performing times
4. **Track ROI**: Monitor if personalized recommendations lead to better engagement over time

---

## Support

For issues or questions:

- Check [Convex Documentation](https://docs.convex.dev/)
- Review [Twitter API Documentation](https://developer.twitter.com/en/docs/twitter-api)
- Review [LinkedIn API Documentation](https://docs.microsoft.com/en-us/linkedin/marketing/)
- Open an issue in the project repository

---

## Changelog

| Date       | Version | Changes                            |
|------------|---------|-------------------------------------|
| 2025-11-03 | 1.0     | Initial documentation created       |
