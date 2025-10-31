"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/datetime-picker";

/**
 * PostScheduler Component
 *
 * Allows users to create and schedule posts for X/Twitter.
 * Features:
 * - Multi-line text input for post content
 * - Character counter with visual warnings (260 char warning, 280 char max)
 * - Optional URL field for threading
 * - Date/time selector for scheduling (local timezone)
 */
export function PostScheduler() {
  // Convex mutation
  const createPost = useMutation(api.posts.createPost);

  // Form state
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [scheduledTime, setScheduledTime] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Character count for Twitter/X (280 max, warning at 260)
  const charCount = content.length;
  const MAX_CHARS = 280;
  const WARNING_THRESHOLD = 260;
  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = charCount >= WARNING_THRESHOLD && !isOverLimit;

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous states
    setError(null);
    setSuccess(false);

    // Validation
    if (!content.trim()) {
      setError("Post content is required");
      return;
    }

    if (isOverLimit) {
      setError("Post exceeds 280 character limit");
      return;
    }

    if (!scheduledTime) {
      setError("Please select a date and time");
      return;
    }

    try {
      setIsSubmitting(true);

      // Convert local date/time to UTC timestamp
      const utcTimestamp = scheduledTime.getTime();

      // Call Convex mutation to create post
      await createPost({
        content,
        url: url || undefined,
        scheduledTime: utcTimestamp,
      });

      // Success - clear form
      setSuccess(true);
      setContent("");
      setUrl("");
      setScheduledTime(undefined);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Schedule Post</CardTitle>
        <CardDescription>
          Create and schedule a post for X/Twitter
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Post Content */}
          <div className="space-y-2">
            <Label htmlFor="content">
              Post Content <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="content"
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none"
              aria-describedby="char-count"
              aria-invalid={isOverLimit}
            />
            <div
              id="char-count"
              className={`text-sm text-right ${
                isOverLimit ? 'text-destructive font-semibold' :
                isNearLimit ? 'text-yellow-600 font-medium' :
                'text-muted-foreground'
              }`}
            >
              {charCount}/{MAX_CHARS}
            </div>
          </div>

          {/* URL Field */}
          <div className="space-y-2">
            <Label htmlFor="url">
              URL (optional)
            </Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              URL will be posted as a reply to your main post
            </p>
          </div>

          {/* Date/Time Selector */}
          <div className="space-y-2">
            <Label htmlFor="scheduled-time">
              Scheduled Time <span className="text-destructive">*</span>
            </Label>
            <DateTimePicker
              date={scheduledTime}
              setDate={setScheduledTime}
              placeholder="Select date and time"
            />
            <p className="text-sm text-muted-foreground">
              Time is in your local timezone
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
              Post scheduled successfully!
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || isOverLimit || !content.trim() || !scheduledTime}
          >
            {isSubmitting ? "Scheduling..." : "Schedule Post"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
