"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { TemplatePickerModal } from "./TemplatePickerModal";
import { IconTemplate } from "@tabler/icons-react";
import { toast } from "sonner";

/**
 * PostScheduler Component
 *
 * Allows users to create and schedule posts for X/Twitter and LinkedIn.
 * Supports both "create" and "edit" modes for managing scheduled posts.
 * Features:
 * - Platform selection (Twitter, LinkedIn, or both)
 * - Separate content fields with character counters (Twitter: 280 chars, LinkedIn: 3,000 chars)
 * - Optional URL field for threading/commenting
 * - Separate date/time selectors for each platform (staggered scheduling)
 */

interface PostData {
  _id: Id<"posts">;
  twitterContent?: string;
  linkedInContent?: string;
  twitterScheduledTime?: number;
  linkedInScheduledTime?: number;
  url?: string;
}

interface PostSchedulerProps {
  mode?: "create" | "edit";
  postData?: PostData;
  onSuccess?: () => void;
}

export function PostScheduler({ mode = "create", postData, onSuccess }: PostSchedulerProps) {
  // Convex mutations
  const createPost = useMutation(api.posts.createPost);
  const updatePost = useMutation(api.posts.updatePost);
  const incrementTemplateUsage = useMutation(api.templates.incrementTemplateUsage);

  // Platform selection state
  const [enableTwitter, setEnableTwitter] = useState(true);
  const [enableLinkedIn, setEnableLinkedIn] = useState(false);

  // Twitter form state
  const [twitterContent, setTwitterContent] = useState("");
  const [twitterScheduledTime, setTwitterScheduledTime] = useState<Date | undefined>();

  // LinkedIn form state
  const [linkedInContent, setLinkedInContent] = useState("");
  const [linkedInScheduledTime, setLinkedInScheduledTime] = useState<Date | undefined>();

  // Shared state
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Template picker modal state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [activeField, setActiveField] = useState<"twitter" | "linkedin" | null>(null);

  // Textarea refs for cursor position
  const twitterTextareaRef = useRef<HTMLTextAreaElement>(null);
  const linkedInTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Twitter character count (280 max, warning at 260)
  const twitterCharCount = twitterContent.length;
  const TWITTER_MAX_CHARS = 280;
  const TWITTER_WARNING_THRESHOLD = 260;
  const isTwitterOverLimit = twitterCharCount > TWITTER_MAX_CHARS;
  const isTwitterNearLimit = twitterCharCount >= TWITTER_WARNING_THRESHOLD && !isTwitterOverLimit;

  // LinkedIn character count (3,000 max, warning at 2,900)
  const linkedInCharCount = linkedInContent.length;
  const LINKEDIN_MAX_CHARS = 3000;
  const LINKEDIN_WARNING_THRESHOLD = 2900;
  const isLinkedInOverLimit = linkedInCharCount > LINKEDIN_MAX_CHARS;
  const isLinkedInNearLimit = linkedInCharCount >= LINKEDIN_WARNING_THRESHOLD && !isLinkedInOverLimit;

  /**
   * Pre-fill form when in edit mode
   */
  useEffect(() => {
    if (mode === "edit" && postData) {
      // Pre-fill platform selection
      setEnableTwitter(!!postData.twitterContent);
      setEnableLinkedIn(!!postData.linkedInContent);

      // Pre-fill Twitter fields
      if (postData.twitterContent) {
        setTwitterContent(postData.twitterContent);
      }
      if (postData.twitterScheduledTime) {
        setTwitterScheduledTime(new Date(postData.twitterScheduledTime));
      }

      // Pre-fill LinkedIn fields
      if (postData.linkedInContent) {
        setLinkedInContent(postData.linkedInContent);
      }
      if (postData.linkedInScheduledTime) {
        setLinkedInScheduledTime(new Date(postData.linkedInScheduledTime));
      }

      // Pre-fill URL
      if (postData.url) {
        setUrl(postData.url);
      }
    }
  }, [mode, postData]);

  /**
   * Handle opening template picker modal
   */
  const handleOpenTemplatePicker = (field: "twitter" | "linkedin") => {
    setActiveField(field);
    setIsTemplateModalOpen(true);
  };

  /**
   * Handle template selection and insertion
   */
  const handleTemplateSelect = async (template: Doc<"templates">) => {
    if (!activeField) return;

    const templateContent = template.content;
    const isTwitter = activeField === "twitter";
    const existingContent = isTwitter ? twitterContent : linkedInContent;
    const textareaRef = isTwitter ? twitterTextareaRef : linkedInTextareaRef;
    const maxChars = isTwitter ? TWITTER_MAX_CHARS : LINKEDIN_MAX_CHARS;

    // Check if insertion would exceed character limit
    const newContentLength = existingContent.length + templateContent.length;
    if (newContentLength > maxChars) {
      toast.error(
        `Template insertion would exceed ${isTwitter ? "Twitter" : "LinkedIn"}'s ${maxChars} character limit`
      );
      return;
    }

    // Get cursor position from textarea
    const textarea = textareaRef.current;
    const cursorPos = textarea?.selectionStart;

    let newContent: string;
    let newCursorPos: number;

    // Insert at cursor position or append to end
    if (cursorPos !== undefined && cursorPos >= 0) {
      const before = existingContent.substring(0, cursorPos);
      const after = existingContent.substring(cursorPos);
      newContent = before + templateContent + after;
      newCursorPos = cursorPos + templateContent.length;
    } else {
      // Fallback: Append to end
      newContent = existingContent + templateContent;
      newCursorPos = newContent.length;
    }

    // Update state
    if (isTwitter) {
      setTwitterContent(newContent);
    } else {
      setLinkedInContent(newContent);
    }

    // Focus textarea and set cursor position after state update
    setTimeout(() => {
      textarea?.focus();
      textarea?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    // Increment usage stats (fire-and-forget, don't block UI)
    try {
      await incrementTemplateUsage({ templateId: template._id });
    } catch (error) {
      // Log error but don't block insertion
      console.error("Failed to increment template usage:", error);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous states
    setError(null);
    setSuccess(false);

    // Validation: At least one platform must be selected
    if (!enableTwitter && !enableLinkedIn) {
      setError("Please select at least one platform");
      return;
    }

    // Twitter validation (if enabled)
    if (enableTwitter) {
      if (!twitterContent.trim()) {
        setError("Twitter content is required");
        return;
      }
      if (isTwitterOverLimit) {
        setError("Twitter content exceeds 280 character limit");
        return;
      }
      if (!twitterScheduledTime) {
        setError("Please select a Twitter scheduled time");
        return;
      }
    }

    // LinkedIn validation (if enabled)
    if (enableLinkedIn) {
      if (!linkedInContent.trim()) {
        setError("LinkedIn content is required");
        return;
      }
      if (isLinkedInOverLimit) {
        setError("LinkedIn content exceeds 3,000 character limit");
        return;
      }
      if (!linkedInScheduledTime) {
        setError("Please select a LinkedIn scheduled time");
        return;
      }
    }

    try {
      setIsSubmitting(true);

      // Build mutation args based on platform selection
      const mutationArgs: {
        twitterContent?: string;
        linkedInContent?: string;
        twitterScheduledTime?: number;
        linkedInScheduledTime?: number;
        url?: string;
      } = {};

      // Add Twitter fields if enabled
      if (enableTwitter && twitterScheduledTime) {
        mutationArgs.twitterContent = twitterContent;
        mutationArgs.twitterScheduledTime = twitterScheduledTime.getTime();
      }

      // Add LinkedIn fields if enabled
      if (enableLinkedIn && linkedInScheduledTime) {
        mutationArgs.linkedInContent = linkedInContent;
        mutationArgs.linkedInScheduledTime = linkedInScheduledTime.getTime();
      }

      // Add URL if provided
      if (url.trim()) {
        mutationArgs.url = url;
      }

      // Call appropriate mutation based on mode
      if (mode === "edit" && postData) {
        await updatePost({
          postId: postData._id,
          ...mutationArgs,
        });
      } else {
        await createPost(mutationArgs);
      }

      // Success - show message and callback
      setSuccess(true);

      if (mode === "create") {
        // Clear form on create
        setTwitterContent("");
        setLinkedInContent("");
        setUrl("");
        setTwitterScheduledTime(undefined);
        setLinkedInScheduledTime(undefined);

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        // Call onSuccess callback for edit mode (e.g., close modal)
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1000);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule post");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if submit should be disabled
  const isSubmitDisabled =
    isSubmitting ||
    (!enableTwitter && !enableLinkedIn) ||
    (enableTwitter && (isTwitterOverLimit || !twitterContent.trim() || !twitterScheduledTime)) ||
    (enableLinkedIn && (isLinkedInOverLimit || !linkedInContent.trim() || !linkedInScheduledTime));

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{mode === "edit" ? "Edit Post" : "Schedule Post"}</CardTitle>
        <CardDescription>
          {mode === "edit"
            ? "Update your scheduled post"
            : "Create and schedule posts for X/Twitter and LinkedIn"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Platform Selection */}
          <div className="space-y-4">
            <Label>Select Platforms <span className="text-destructive">*</span></Label>
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-6 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-twitter"
                  checked={enableTwitter}
                  onCheckedChange={(checked) => setEnableTwitter(checked === true)}
                />
                <label
                  htmlFor="enable-twitter"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Post to X/Twitter
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-linkedin"
                  checked={enableLinkedIn}
                  onCheckedChange={(checked) => setEnableLinkedIn(checked === true)}
                />
                <label
                  htmlFor="enable-linkedin"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Post to LinkedIn
                </label>
              </div>
            </div>
          </div>

          {/* Twitter Section */}
          {enableTwitter && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="text-sm font-semibold text-foreground">X/Twitter Post</h3>

              {/* Twitter Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="twitter-content">
                    Content <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenTemplatePicker("twitter")}
                  >
                    <IconTemplate className="mr-2 h-4 w-4" />
                    Insert Template
                  </Button>
                </div>
                <Textarea
                  ref={twitterTextareaRef}
                  id="twitter-content"
                  placeholder="What's happening?"
                  value={twitterContent}
                  onChange={(e) => setTwitterContent(e.target.value)}
                  className="min-h-[120px] resize-none"
                  aria-describedby="twitter-char-count"
                  aria-invalid={isTwitterOverLimit}
                />
                <div
                  id="twitter-char-count"
                  className={`text-sm text-right ${
                    isTwitterOverLimit ? 'text-destructive font-semibold' :
                    isTwitterNearLimit ? 'text-yellow-600 font-medium' :
                    'text-muted-foreground'
                  }`}
                >
                  {twitterCharCount}/{TWITTER_MAX_CHARS}
                </div>
              </div>

              {/* Twitter Date/Time Selector */}
              <div className="space-y-2">
                <Label htmlFor="twitter-scheduled-time">
                  Scheduled Time <span className="text-destructive">*</span>
                </Label>
                <DateTimePicker
                  date={twitterScheduledTime}
                  setDate={setTwitterScheduledTime}
                  placeholder="Select date and time"
                />
                <p className="text-sm text-muted-foreground">
                  Time is in your local timezone
                </p>
              </div>
            </div>
          )}

          {/* LinkedIn Section */}
          {enableLinkedIn && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="text-sm font-semibold text-foreground">LinkedIn Post</h3>

              {/* LinkedIn Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="linkedin-content">
                    Content <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenTemplatePicker("linkedin")}
                  >
                    <IconTemplate className="mr-2 h-4 w-4" />
                    Insert Template
                  </Button>
                </div>
                <Textarea
                  ref={linkedInTextareaRef}
                  id="linkedin-content"
                  placeholder="Share your professional insights..."
                  value={linkedInContent}
                  onChange={(e) => setLinkedInContent(e.target.value)}
                  className="min-h-[120px] resize-none"
                  aria-describedby="linkedin-char-count"
                  aria-invalid={isLinkedInOverLimit}
                />
                <div
                  id="linkedin-char-count"
                  className={`text-sm text-right ${
                    isLinkedInOverLimit ? 'text-destructive font-semibold' :
                    isLinkedInNearLimit ? 'text-yellow-600 font-medium' :
                    'text-muted-foreground'
                  }`}
                >
                  {linkedInCharCount}/{LINKEDIN_MAX_CHARS}
                </div>
              </div>

              {/* LinkedIn Date/Time Selector */}
              <div className="space-y-2">
                <Label htmlFor="linkedin-scheduled-time">
                  Scheduled Time <span className="text-destructive">*</span>
                </Label>
                <DateTimePicker
                  date={linkedInScheduledTime}
                  setDate={setLinkedInScheduledTime}
                  placeholder="Select date and time"
                />
                <p className="text-sm text-muted-foreground">
                  Time is in your local timezone
                </p>
              </div>
            </div>
          )}

          {/* URL Field (Shared) */}
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
              URL will be posted as a reply on X/Twitter and as the first comment on LinkedIn
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
              {mode === "edit" ? "Post updated successfully!" : "Post scheduled successfully!"}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitDisabled}
          >
            {isSubmitting
              ? (mode === "edit" ? "Updating..." : "Scheduling...")
              : (mode === "edit" ? "Update Post" : "Schedule Post")}
          </Button>
        </form>
      </CardContent>

      {/* Template Picker Modal */}
      <TemplatePickerModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleTemplateSelect}
      />
    </Card>
  );
}
