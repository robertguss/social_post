"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Repeat2, Share } from "lucide-react";

interface TwitterPreviewProps {
  content: string;
  url?: string;
  characterCount: number;
}

export function TwitterPreview({
  content,
  url,
  characterCount,
}: TwitterPreviewProps) {
  const isOverLimit = characterCount > 280;
  const countColor = isOverLimit
    ? "text-red-600"
    : characterCount > 260
      ? "text-yellow-600"
      : "text-gray-500";

  // Show truncated content if over limit
  const displayContent =
    isOverLimit ? content.slice(0, 280) + "..." : content;

  return (
    <div className="flex flex-col h-full">
      {/* Platform Label */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Twitter
        </h3>
      </div>

      {/* Twitter Card */}
      <div className="border rounded-lg bg-white dark:bg-gray-900 p-4 shadow-sm flex-1">
        <article className="space-y-3">
          {/* User Header */}
          <div className="flex items-start gap-3">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-[#1DA1F2] text-white text-lg">
                Y
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-sm">
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  Your Name
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  @yourhandle
                </span>
                <span className="text-gray-500 dark:text-gray-400">·</span>
                <span className="text-gray-500 dark:text-gray-400">now</span>
              </div>

              {/* Post Content */}
              <div className="mt-2">
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                  {displayContent}
                </p>
                {isOverLimit && (
                  <p className="text-red-600 text-sm mt-1 italic">
                    Content exceeds 280 character limit and will be truncated
                  </p>
                )}
              </div>

              {/* Action Buttons (Visual Only) */}
              <div className="flex items-center gap-8 mt-3 text-gray-500">
                <button
                  type="button"
                  className="flex items-center gap-2 hover:text-[#1DA1F2] transition-colors cursor-default"
                  aria-label="Reply (preview only)"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs">0</span>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 hover:text-green-500 transition-colors cursor-default"
                  aria-label="Retweet (preview only)"
                >
                  <Repeat2 className="w-4 h-4" />
                  <span className="text-xs">0</span>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 hover:text-red-500 transition-colors cursor-default"
                  aria-label="Like (preview only)"
                >
                  <Heart className="w-4 h-4" />
                  <span className="text-xs">0</span>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 hover:text-[#1DA1F2] transition-colors cursor-default"
                  aria-label="Share (preview only)"
                >
                  <Share className="w-4 h-4" />
                </button>
              </div>

              {/* Character Count */}
              <div className="flex justify-end mt-3">
                <span className={`text-sm font-medium ${countColor}`}>
                  {characterCount} / 280
                </span>
              </div>
            </div>
          </div>

          {/* URL Notice */}
          {url && (
            <div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <span className="text-base">ℹ️</span>
                <span>URL will be posted as a reply</span>
              </p>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
