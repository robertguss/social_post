# **Social Media Post Scheduler: Feature Brainstorm**

This document outlines the key features and technical considerations for building a personal social media post scheduler application.

## **I. Core Functionality (MVP \- Minimum Viable Product)**

These features are essential for the app to function as a scheduler.

1. **Platform Integration & Authentication (X/Twitter & LinkedIn):**
   - Ability to securely connect and authenticate with **X/Twitter** and **LinkedIn**.
   - Store the OAuth tokens and secrets necessary for these platforms securely within the Convex backend.
2. **Post Creation Interface:**
   - A single text area to input the post content.
   - A simple button or field to attach a single image or video file.
   - A character counter that updates based on the selected platform's limits.
3. **Scheduling Logic:**
   - Date and Time Picker: Allow the user to select the exact future date and time for publishing.
   - Platform Selector: Allow choosing which connected accounts the post should go to.
   - Confirmation: Display a summary before saving the scheduled post.
4. **Content Management Dashboard:**
   - A list view showing all _scheduled_ and _past_ posts, including the platform, scheduled time, and status (Scheduled, Posted, Failed).
5. **Execution & Delivery (The Backend):**
   - A mechanism (using Convex Scheduled Functions) that wakes up at the scheduled time to make the API call to the respective social platform.

## **II. User Experience (UX) Enhancements**

Features that make the app pleasant and efficient to use.

1. **Visual Calendar View:**
   - A month-view calendar showing little icons or dots on days where posts are scheduled. Clicking a day reveals the scheduled posts.
2. **Post Preview:**
   - A side-by-side display of the post content rendered as closely as possible to the target platform's actual look (especially for image ratios and text formatting).
3. **Drafts Feature:**
   - Ability to save a post without scheduling a time, allowing for iteration and review later.
4. **Bulk Upload/Media Library:**
   - A central place to upload and manage media assets (images, videos) that can be easily attached to new posts.

## **III. Technical Considerations**

Key technology choices and implementation notes using **React/Next.js** and **Convex**.

1. **API Documentation Review (X/Twitter & LinkedIn):**
   - **Crucial First Step:** Thoroughly review the developer documentation for the **X API** and the **LinkedIn Marketing API**. Focus specifically on the endpoints for text-and-media posting and the official rate limits.
2. **Database & Media Storage (Convex):**
   - **Post Data:** Utilize the **Convex integrated database** to store all post metadata (content, scheduled time, platform IDs, status).
   - **Media Storage:** Since Convex's database is for metadata, you'll need a separate service (like Firebase Storage, AWS S3, or a Convex-compatible file storage solution) to host the image/video files until they are posted.
3. **Authentication & Security:**
   - All integrations require OAuth or a similar secure token system. Tokens must be encrypted or stored securely in your database.
4. **Time Management (Convex Scheduled Functions):**
   - Use **Convex's built-in Scheduled Functions** to reliably execute the API calls at the exact future time specified by the user, ensuring time-zone awareness.

## **IV. Advanced & Workflow Features (New)**

Features focused on efficiency, content optimization, and intelligent assistance.

1. **Post Templates & Snippets:**
   - Ability to save frequently used content blocks (e.g., standard closings, recurring hashtags like \#buildinpublic, or disclaimers).
   - Allow users to tag templates for easy searching and insertion into new posts.
2. **Content Recycling/Re-queue:**
   - A feature to quickly clone a successful _past_ post and schedule it again with a new date/time.
   - _Idea:_ A "Queue" setting where a post is repeatedly scheduled (e.g., every 3 months) until manually paused.
3. **Cross-Platform Adaptation:**
   - When scheduling a single post to both X/Twitter (280 characters) and LinkedIn (3000 characters), the app should allow for two separate text fields or an 'Extended Content' field for the longer-form platform.
   - Pre-populate the LinkedIn field with the X/Twitter content, allowing the user to easily expand it.
4. **Optimal Posting Time Suggestions:**
   - Based on historical performance (if that data can be accessed or mocked) or general best practices, suggest optimal posting windows (e.g., "Tuesdays at 10 AM EST").
5. **AI Content Assistant (Gemini Integration):**
   - A button (e.g., "Refine," "Expand," or "Brainstorm") next to the post text area.
   - Uses the Gemini API to take the current draft text and offer suggestions:
     - **Tone Adjustment:** Rewrite the post to be more formal, casual, or engaging.
     - **Expand for LinkedIn:** Take the short X post and expand it into a longer, more professional LinkedIn article summary.
     - **Hashtag Generation:** Suggest 3-5 relevant hashtags based on the content.
