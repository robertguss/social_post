"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CharacterCounter } from "@/components/ui/CharacterCounter";
import { getTwitterCharacterCount } from "@/lib/utils/characterCount";
import {
  IconPlus,
  IconTrash,
  IconChevronUp,
  IconChevronDown,
  IconBrandX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface TwitterThreadComposerProps {
  value: string[]; // Array of tweets in the thread
  onChange: (tweets: string[]) => void;
  disabled?: boolean;
}

const MAX_TWEETS = 25; // Twitter API limit
const MAX_CHARS_PER_TWEET = 280;

export function TwitterThreadComposer({
  value,
  onChange,
  disabled = false,
}: TwitterThreadComposerProps) {
  const [tweets, setTweets] = useState<string[]>(value.length > 0 ? value : [""]);

  // Sync internal state with external value
  useEffect(() => {
    if (value.length > 0 && JSON.stringify(value) !== JSON.stringify(tweets)) {
      setTweets(value);
    }
  }, [value]);

  // Notify parent of changes
  const notifyChange = (newTweets: string[]) => {
    setTweets(newTweets);
    onChange(newTweets);
  };

  const handleTweetChange = (index: number, content: string) => {
    const newTweets = [...tweets];
    newTweets[index] = content;
    notifyChange(newTweets);
  };

  const addTweet = () => {
    if (tweets.length < MAX_TWEETS) {
      notifyChange([...tweets, ""]);
    }
  };

  const removeTweet = (index: number) => {
    if (tweets.length > 1) {
      const newTweets = tweets.filter((_, i) => i !== index);
      notifyChange(newTweets);
    }
  };

  const moveTweetUp = (index: number) => {
    if (index > 0) {
      const newTweets = [...tweets];
      [newTweets[index - 1], newTweets[index]] = [
        newTweets[index],
        newTweets[index - 1],
      ];
      notifyChange(newTweets);
    }
  };

  const moveTweetDown = (index: number) => {
    if (index < tweets.length - 1) {
      const newTweets = [...tweets];
      [newTweets[index], newTweets[index + 1]] = [
        newTweets[index + 1],
        newTweets[index],
      ];
      notifyChange(newTweets);
    }
  };

  const getTweetCharCount = (content: string) => {
    return getTwitterCharacterCount(content);
  };

  const isTweetOverLimit = (content: string) => {
    return getTweetCharCount(content) > MAX_CHARS_PER_TWEET;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <IconBrandX className="h-4 w-4" />
          Twitter Thread ({tweets.length} {tweets.length === 1 ? "tweet" : "tweets"})
        </Label>
        {tweets.length < MAX_TWEETS && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTweet}
            disabled={disabled}
            className="gap-2"
          >
            <IconPlus className="h-4 w-4" />
            Add Tweet
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {tweets.map((tweet, index) => {
          const charCount = getTweetCharCount(tweet);
          const isOverLimit = isTweetOverLimit(tweet);
          const isEmpty = tweet.trim() === "";

          return (
            <div
              key={index}
              className={cn(
                "relative rounded-lg border p-4 transition-colors",
                isOverLimit && "border-destructive bg-destructive/5",
                isEmpty && tweets.length > 1 && "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/10"
              )}
            >
              {/* Tweet Number Badge */}
              <div className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {index + 1}
              </div>

              {/* Tweet Content */}
              <div className="space-y-2">
                <Textarea
                  value={tweet}
                  onChange={(e) => handleTweetChange(index, e.target.value)}
                  disabled={disabled}
                  placeholder={`Tweet ${index + 1}${index === 0 ? " (First tweet in thread)" : ""}`}
                  className={cn(
                    "min-h-[100px] resize-none",
                    isOverLimit && "border-destructive focus-visible:ring-destructive"
                  )}
                  maxLength={MAX_CHARS_PER_TWEET + 100} // Allow typing a bit over for better UX
                />

                {/* Character Counter */}
                <div className="flex items-center justify-between">
                  <CharacterCounter
                    count={charCount}
                    max={MAX_CHARS_PER_TWEET}
                    warnAt={260}
                  />

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    {/* Move Up */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveTweetUp(index)}
                      disabled={disabled || index === 0}
                      className="h-8 w-8 p-0"
                      title="Move up"
                    >
                      <IconChevronUp className="h-4 w-4" />
                    </Button>

                    {/* Move Down */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveTweetDown(index)}
                      disabled={disabled || index === tweets.length - 1}
                      className="h-8 w-8 p-0"
                      title="Move down"
                    >
                      <IconChevronDown className="h-4 w-4" />
                    </Button>

                    {/* Delete */}
                    {tweets.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTweet(index)}
                        disabled={disabled}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Delete tweet"
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Warnings */}
                {isEmpty && tweets.length > 1 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-500">
                    ⚠️ This tweet is empty and will be removed when scheduling
                  </p>
                )}
                {isOverLimit && (
                  <p className="text-xs text-destructive">
                    ⚠️ Tweet exceeds {MAX_CHARS_PER_TWEET} character limit
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Thread Info */}
      <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <IconBrandX className="h-4 w-4" />
          <span>
            Tweets will be published as a thread in order. Maximum {MAX_TWEETS}{" "}
            tweets per thread.
          </span>
        </p>
      </div>
    </div>
  );
}
