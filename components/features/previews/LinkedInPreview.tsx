"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThumbsUp, MessageSquare, Repeat2, Send } from "lucide-react";

interface LinkedInPreviewProps {
  content: string;
  url?: string;
}

export function LinkedInPreview({ content, url }: LinkedInPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const TRUNCATE_LENGTH = 140;

  const shouldTruncate = content.length > TRUNCATE_LENGTH;
  const displayContent =
    isExpanded || !shouldTruncate
      ? content
      : content.slice(0, TRUNCATE_LENGTH);

  return (
    <div className="flex flex-col h-full">
      {/* Platform Label */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          LinkedIn
        </h3>
      </div>

      {/* LinkedIn Card */}
      <div className="border rounded-lg bg-white dark:bg-gray-900 p-4 shadow-sm flex-1">
        <article className="space-y-3">
          {/* User Header */}
          <div className="flex items-start gap-3">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-[#0A66C2] text-white text-lg">
                Y
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="space-y-0.5">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  Your Name
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Your Headline
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Just now · 🌐
                </p>
              </div>
            </div>
          </div>

          {/* Post Content */}
          <div className="mt-3">
            <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words leading-relaxed">
              {displayContent}
              {shouldTruncate && !isExpanded && "..."}
              {shouldTruncate && !isExpanded && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="text-[#0A66C2] hover:underline ml-1 font-medium"
                >
                  see more
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons (Visual Only) */}
          <div className="flex items-center gap-1 pt-2 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-600 dark:text-gray-400 cursor-default flex-1 justify-center"
              aria-label="Like (preview only)"
            >
              <ThumbsUp className="w-5 h-5" />
              <span className="text-sm font-medium">Like</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-600 dark:text-gray-400 cursor-default flex-1 justify-center"
              aria-label="Comment (preview only)"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm font-medium">Comment</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-600 dark:text-gray-400 cursor-default flex-1 justify-center"
              aria-label="Repost (preview only)"
            >
              <Repeat2 className="w-5 h-5" />
              <span className="text-sm font-medium">Repost</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-600 dark:text-gray-400 cursor-default flex-1 justify-center"
              aria-label="Send (preview only)"
            >
              <Send className="w-5 h-5" />
              <span className="text-sm font-medium">Send</span>
            </button>
          </div>

          {/* URL Notice */}
          {url && (
            <div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <span className="text-base">ℹ️</span>
                <span>URL will be posted as first comment</span>
              </p>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
