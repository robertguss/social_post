"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";

/**
 * Notifications Module - Telegram Failure Notifications
 *
 * This module sends Telegram notifications when post publishing fails after all retry attempts.
 */

/**
 * INTERNAL ACTION: Send failure notification via Telegram
 *
 * Sends a formatted notification message to the configured Telegram chat when a post fails.
 * Handles Telegram API errors gracefully to prevent notification failures from breaking the publishing flow.
 *
 * Environment Variables Required:
 * - TELEGRAM_BOT_TOKEN: Bot token from @BotFather
 * - TELEGRAM_CHAT_ID: Chat ID where notifications are sent
 *
 * @param postId - The ID of the failed post
 * @param content - The post content (will be truncated to 100 chars for preview)
 * @param errorMessage - The error message describing the failure
 * @param scheduledTime - UTC timestamp of the scheduled time
 * @param retryCount - Number of retry attempts made
 */
export const sendFailureNotification = internalAction({
  args: {
    postId: v.id("posts"),
    content: v.string(),
    errorMessage: v.string(),
    scheduledTime: v.number(),
    retryCount: v.number(),
  },
  handler: async (_ctx, args): Promise<void> => {
    // Get Telegram credentials from environment variables
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // Check if Telegram credentials are configured
    if (!botToken || !chatId) {
      console.error(
        "[Notifications] Telegram credentials not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables."
      );
      return;
    }

    // Prepare notification message
    const contentPreview =
      args.content.substring(0, 100) +
      (args.content.length > 100 ? "..." : "");
    const formattedTime = new Date(args.scheduledTime).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

    const message = `🚨 *Post Publishing Failed*\n\n*Content:* ${contentPreview}\n\n*Error:* ${args.errorMessage}\n\n*Scheduled Time:* ${formattedTime}\n\n*Retry Attempts:* ${args.retryCount}/3\n\n*Post ID:* ${args.postId}`;

    try {
      // Send notification via Telegram Bot API
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: "Markdown",
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[Notifications] Telegram API request failed: ${response.status} ${errorText}`
        );
      } else {
        console.log(
          `[Notifications] Successfully sent Telegram notification for post ${args.postId}`
        );
      }
    } catch (error) {
      // Log error but don't throw - notification failure should not break publishing flow
      console.error(
        `[Notifications] Failed to send Telegram notification:`,
        error
      );
    }
  },
});
