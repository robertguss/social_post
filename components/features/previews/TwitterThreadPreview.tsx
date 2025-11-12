"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Repeat2, Share } from "lucide-react";
import { getTwitterCharacterCount } from "@/lib/utils/characterCount";

interface TwitterThreadPreviewProps {
  tweets: string[];
  url?: string;
}

export function TwitterThreadPreview({ tweets, url }: TwitterThreadPreviewProps) {
  // Filter out empty tweets
  const nonEmptyTweets = tweets.filter(t => t.trim() !== "");

  if (nonEmptyTweets.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Twitter Thread
          </h3>
        </div>
        <div className="border rounded-lg bg-white dark:bg-gray-900 p-8 shadow-sm flex-1 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            No content to preview
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Platform Label */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Twitter Thread ({nonEmptyTweets.length} {nonEmptyTweets.length === 1 ? "tweet" : "tweets"})
        </h3>
      </div>

      {/* Thread Container */}
      <div className="border rounded-lg bg-white dark:bg-gray-900 p-4 shadow-sm flex-1 space-y-4 max-h-[600px] overflow-y-auto">
        {nonEmptyTweets.map((tweetContent, index) => {
          const charCount = getTwitterCharacterCount(tweetContent);
          const isOverLimit = charCount > 280;
          const countColor = isOverLimit
            ? "text-red-600"
            : charCount > 260
              ? "text-yellow-600"
              : "text-gray-500";

          const displayContent = isOverLimit
            ? tweetContent.slice(0, 280) + "..."
            : tweetContent;

          const isLastTweet = index === nonEmptyTweets.length - 1;

          return (
            <div key={index} className="relative">
              {/* Thread Line */}
              {!isLastTweet && (
                <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-700 -mb-4" />
              )}

              {/* Tweet Card */}
              <article className="relative bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                {/* Tweet Number Badge */}
                <div className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#1DA1F2] text-xs font-bold text-white shadow-md">
                  {index + 1}
                </div>

                {/* User Header */}
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-[#1DA1F2] text-white">
                      Y
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-xs">
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
                      <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                        {displayContent}
                      </p>
                      {isOverLimit && (
                        <p className="text-red-600 text-xs mt-1 italic">
                          ⚠️ Exceeds 280 chars (will be truncated)
                        </p>
                      )}
                    </div>

                    {/* Action Buttons (Visual Only) */}
                    <div className="flex items-center gap-6 mt-2 text-gray-500">
                      <button
                        type="button"
                        className="flex items-center gap-1 hover:text-[#1DA1F2] transition-colors cursor-default"
                        aria-label="Reply (preview only)"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="text-xs">0</span>
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1 hover:text-green-500 transition-colors cursor-default"
                        aria-label="Retweet (preview only)"
                      >
                        <Repeat2 className="w-3.5 h-3.5" />
                        <span className="text-xs">0</span>
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1 hover:text-red-500 transition-colors cursor-default"
                        aria-label="Like (preview only)"
                      >
                        <Heart className="w-3.5 h-3.5" />
                        <span className="text-xs">0</span>
                      </button>
                    </div>

                    {/* Character Count */}
                    <div className="flex justify-end mt-2">
                      <span className={`text-xs font-medium ${countColor}`}>
                        {charCount} / 280
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          );
        })}

        {/* URL Notice */}
        {url && (
          <div className="mt-4 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <span className="text-base">ℹ️</span>
              <span>URL will be posted as final reply in thread</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
