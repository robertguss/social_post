"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";

/**
 * Notifications Module - Telegram Failure Notifications
 *
 * This module contains stub implementations for Telegram notifications.
 * Full implementation will be added in a future story.
 *
 * TODO: Implement actual Telegram Bot API integration
 */

/**
 * INTERNAL ACTION: Send failure notification via Telegram
 *
 * This is a stub implementation that logs the failure notification.
 * Full Telegram Bot API integration will be implemented in a future story.
 *
 * @param postId - The ID of the failed post
 * @param errorMessage - The error message describing the failure
 */
export const sendFailureNotification = internalAction({
  args: {
    postId: v.id("posts"),
    errorMessage: v.string(),
  },
  handler: async (_ctx, args): Promise<void> => {
    // TODO: Implement Telegram Bot API integration
    // For now, just log the notification
    console.log(
      `[Notifications] STUB: Would send Telegram notification for failed post ${args.postId}: ${args.errorMessage}`
    );

    // Future implementation will:
    // 1. Get Telegram Bot API token from environment variables
    // 2. Get user's Telegram chat ID from user settings
    // 3. Send formatted message via Telegram Bot API
    // 4. Handle Telegram API errors gracefully
  },
});
