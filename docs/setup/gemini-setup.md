# Gemini API Setup Guide

This guide provides step-by-step instructions for configuring Google Gemini API access in the Social Posting Scheduler application.

## Overview

The application uses Google's Gemini AI API to power AI-assisted content generation features, including:

- Tone adjustment for social media posts
- Twitter-to-LinkedIn content expansion
- Hashtag generation
- Content suggestions and refinements

## Prerequisites

- Active Google account
- Access to the Convex Dashboard for your deployment
- Project deployed to Convex (development or production)

## Setup Steps

### Step 1: Obtain Gemini API Key

1. Navigate to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" in the left sidebar
4. Click "Create API Key in new project" (or select an existing project)
5. Copy the generated API key immediately (it will only be shown once)

**Security Note:** Store this API key securely. Never commit it to version control or share it publicly.

### Step 2: Configure Convex Environment Variable

#### For Development Environment:

1. Open your terminal in the project directory
2. Run `pnpm dlx convex dashboard` to open the Convex Dashboard
3. Navigate to your development deployment
4. Click "Settings" in the left sidebar
5. Click "Environment Variables"
6. Click "Add Variable"
7. Enter the following:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** [Your API key from Step 1]
8. Click "Save"
9. Redeploy your Convex functions by running `pnpm dlx convex dev` in your terminal

#### For Production Environment:

1. Follow the same steps as development, but select your production deployment in the Convex Dashboard
2. After adding the environment variable, deploy to production: `pnpm dlx convex deploy`

### Step 3: Verify Configuration

1. Open the Convex Dashboard
2. Navigate to "Functions" in the left sidebar
3. Find and run the `gemini:testGeminiConnection` action
4. Verify the response contains:
   - `success: true`
   - A text response from the Gemini API
   - A timestamp

If the test fails, check the error message in the Convex logs:
- Invalid API key: Verify the API key is correctly copied
- Missing API key: Ensure the environment variable is set and functions are redeployed
- Network errors: Check your internet connection and try again

## Model Selection

The application uses `gemini-2.5-flash` by default for optimal cost-performance balance:

- **gemini-2.5-flash:** Fast, cost-efficient, suitable for most content refinement tasks (auto-updated to latest stable version)
- **gemini-2.5-pro:** More capable but slower and more expensive (reserved for future complex tasks)

Model selection is configured in `convex/gemini.ts` and can be adjusted if needed.

**Note:** As of January 2025, Gemini 1.5 models have been deprecated. All users should use Gemini 2.* models.

## Security Best Practices

### API Key Security

1. **Never commit API keys to version control**
   - API keys should only exist in Convex environment variables
   - Do not store keys in `.env` files that are committed to git
   - Add `.env` files to `.gitignore` if using them for local development

2. **Use separate keys for development and production**
   - Generate different API keys for each environment
   - This allows for easier key rotation and usage tracking

3. **Rotate API keys regularly**
   - Rotate keys quarterly or immediately if compromised
   - Update the Convex environment variable with the new key
   - Redeploy Convex functions to activate the new key

4. **Monitor API usage**
   - Check Google AI Studio for API usage metrics
   - Review Convex logs for unusual activity
   - Set up usage alerts in Google Cloud Console if available

### Request Security

- All Gemini API requests are made server-side via Convex Actions
- API keys are never exposed to the client browser
- User authentication is required for all AI features (prevents abuse)
- Input validation is performed before sending data to the API

## Troubleshooting

### Common Issues

#### "GEMINI_API_KEY not configured in environment variables"

**Cause:** Environment variable not set or Convex functions not redeployed

**Solution:**
1. Verify the environment variable exists in Convex Dashboard
2. Redeploy Convex functions: `pnpm dlx convex dev` (development) or `pnpm dlx convex deploy` (production)
3. Wait 10-30 seconds for deployment to complete
4. Run the test action again

#### "Invalid Gemini API key - check credentials"

**Cause:** API key is incorrect or has been revoked

**Solution:**
1. Generate a new API key in Google AI Studio
2. Update the `GEMINI_API_KEY` environment variable in Convex Dashboard
3. Redeploy Convex functions
4. Run the test action again

#### "Network error connecting to Gemini API"

**Cause:** Internet connectivity issue or Google API service downtime

**Solution:**
1. Check your internet connection
2. Verify Google AI services status: [Google Cloud Status](https://status.cloud.google.com/)
3. Wait a few minutes and try again
4. Check Convex logs for detailed error messages

#### "Gemini API rate limit exceeded"

**Cause:** Too many requests sent to the API in a short time

**Solution:**
1. Wait 1-5 minutes before retrying
2. Review API usage in Google AI Studio
3. Consider upgrading your API quota if you consistently hit rate limits
4. Enable rate limit management (implemented in Story 7.7)

## API Usage and Costs

### Free Tier Limits

Google Gemini API offers a free tier with the following limits (as of January 2025):

- **gemini-2.5-flash:** 15 requests per minute, 1,500 requests per day
- **gemini-2.5-pro:** 2 requests per minute, 50 requests per day

Check [Google AI Pricing](https://ai.google.dev/pricing) for current limits and paid tier options.

### Cost Optimization

1. Use `gemini-2.5-flash` for most tasks (included in this implementation)
2. Implement caching for repeated requests (future enhancement)
3. Monitor usage via AI usage logs (implemented in Story 7.7)
4. Set up usage alerts to avoid unexpected charges

## Additional Resources

- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Google AI Studio](https://aistudio.google.com/)
- [Convex Environment Variables Guide](https://docs.convex.dev/production/environment-variables)
- [Project API Reference](../API_REFERENCE.md)

## Support

If you encounter issues not covered in this guide:

1. Check the Convex logs in the Dashboard for detailed error messages
2. Review the `convex/gemini.ts` file for implementation details
3. Consult the project's [Developer Guide](../DEVELOPER_GUIDE.md)
4. Check Google AI Studio for API-specific issues

---

**Last Updated:** January 6, 2025
**Version:** 1.1
**Related Stories:** Epic 7 - AI-Assisted Content Generation (Story 7.1)
