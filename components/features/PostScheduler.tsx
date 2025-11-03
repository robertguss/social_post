"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { TemplatePickerModal } from "./TemplatePickerModal";
import { QuickReschedule } from "./QuickReschedule";
import { DualPlatformTextFields, DualPlatformTextFieldsRef } from "./DualPlatformTextFields";
import { PreviewModal } from "./PreviewModal";
import { RecommendedTimes } from "./RecommendedTimes";
import { IconTemplate, IconInfoCircle, IconX, IconCalendar, IconEye, IconDeviceFloppy } from "@tabler/icons-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  getTwitterCharacterCount,
  getLinkedInCharacterCount,
} from "@/lib/utils/characterCount";

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
  clonedFromPostId?: Id<"posts">;
  status?: string;
}

interface PostSchedulerProps {
  mode?: "create" | "edit";
  postData?: PostData;
  onSuccess?: () => void;
}

export function PostScheduler({ mode = "create", postData, onSuccess }: PostSchedulerProps) {
  // Router for navigation
  const router = useRouter();

  // Convex mutations
  const createPost = useMutation(api.posts.createPost);
  const updatePost = useMutation(api.posts.updatePost);
  const incrementTemplateUsage = useMutation(api.templates.incrementTemplateUsage);
  const saveDraft = useMutation(api.drafts.saveDraft);

  // Fetch original post if this is a cloned post
  const originalPost = useQuery(
    api.posts.getPost,
    postData?.clonedFromPostId ? { postId: postData.clonedFromPostId } : "skip"
  );

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
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Draft ID for updating existing drafts
  const [draftId, setDraftId] = useState<Id<"posts"> | undefined>(
    postData?.status === "draft" ? postData._id : undefined
  );

  // Template picker modal state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [activeField, setActiveField] = useState<"twitter" | "linkedin" | null>(null);

  // Preview modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Clone indicator state
  const [showCloneBadge, setShowCloneBadge] = useState(!!postData?.clonedFromPostId);

  // Ref for DualPlatformTextFields component (to access textarea refs)
  const dualFieldsRef = useRef<DualPlatformTextFieldsRef>(null);

  // Twitter character count (280 max, warning at 260) using platform-specific rules
  const twitterCharCount = getTwitterCharacterCount(twitterContent);
  const TWITTER_MAX_CHARS = 280;
  const TWITTER_WARNING_THRESHOLD = 260;
  const isTwitterOverLimit = twitterCharCount > TWITTER_MAX_CHARS;

  // LinkedIn character count (3,000 max, warning at 2,900) using platform-specific rules
  const linkedInCharCount = getLinkedInCharacterCount(linkedInContent);
  const LINKEDIN_MAX_CHARS = 3000;
  const LINKEDIN_WARNING_THRESHOLD = 2900;
  const isLinkedInOverLimit = linkedInCharCount > LINKEDIN_MAX_CHARS;

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
   * Format timestamp to user-friendly date/time string with timezone
   * Example: "Monday, Feb 15, 2024 at 10:00 AM (Local time)"
   */
  const formatScheduledTime = (date: Date): string => {
    const formatted = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);

    return `${formatted} (Local time)`;
  };

  /**
   * Handle QuickReschedule time selection for Twitter
   */
  const handleTwitterTimeSelect = (timestamp: number) => {
    setTwitterScheduledTime(new Date(timestamp));
  };

  /**
   * Handle QuickReschedule time selection for LinkedIn
   */
  const handleLinkedInTimeSelect = (timestamp: number) => {
    setLinkedInScheduledTime(new Date(timestamp));
  };

  /**
   * Handle template selection and insertion
   */
  const handleTemplateSelect = async (template: Doc<"templates">) => {
    if (!activeField) return;

    const templateContent = template.content;
    const isTwitter = activeField === "twitter";
    const existingContent = isTwitter ? twitterContent : linkedInContent;
    const textareaRef = isTwitter
      ? dualFieldsRef.current?.twitterTextareaRef
      : dualFieldsRef.current?.linkedInTextareaRef;
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
    const textarea = textareaRef?.current;
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
   * Handle save as draft
   */
  const handleSaveDraft = async () => {
    try {
      setIsSavingDraft(true);
      setError(null);

      // Save draft with current form state
      const savedDraftId = await saveDraft({
        draftId: draftId,
        twitterContent: twitterContent,
        linkedInContent: linkedInContent,
        url: url.trim() || undefined,
        twitterEnabled: enableTwitter,
        linkedInEnabled: enableLinkedIn,
      });

      toast.success("Draft saved");

      // Update URL to reflect draft ID (for subsequent saves)
      if (!draftId) {
        setDraftId(savedDraftId);
        router.push(`/schedule?postId=${savedDraftId}`);
      }
    } catch (err) {
      toast.error("Failed to save draft");
      console.error("Error saving draft:", err);
    } finally {
      setIsSavingDraft(false);
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

      // Build success message with platform names and date/time
      const platforms: string[] = [];
      if (enableTwitter && twitterScheduledTime) {
        platforms.push("Twitter");
      }
      if (enableLinkedIn && linkedInScheduledTime) {
        platforms.push("LinkedIn");
      }
      const platformText = platforms.join(" and ");

      // Show success toast
      toast.success(
        mode === "edit"
          ? `Post updated successfully for ${platformText}`
          : `Post scheduled successfully for ${platformText}`
      );

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
          {/* Clone Indicator - Show if post is cloned and not dismissed */}
          {showCloneBadge && postData?.clonedFromPostId && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
              <IconInfoCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This is a draft cloned from a previous post
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCloneBadge(false)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex-shrink-0"
                aria-label="Dismiss"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Dual Platform Text Fields */}
          <DualPlatformTextFields
            ref={dualFieldsRef}
            twitterContent={twitterContent}
            onTwitterChange={setTwitterContent}
            twitterEnabled={enableTwitter}
            onTwitterEnabledChange={setEnableTwitter}
            twitterCharCount={twitterCharCount}
            twitterMaxChars={TWITTER_MAX_CHARS}
            twitterWarningThreshold={TWITTER_WARNING_THRESHOLD}
            linkedInContent={linkedInContent}
            onLinkedInChange={setLinkedInContent}
            linkedInEnabled={enableLinkedIn}
            onLinkedInEnabledChange={setEnableLinkedIn}
            linkedInCharCount={linkedInCharCount}
            linkedInMaxChars={LINKEDIN_MAX_CHARS}
            linkedInWarningThreshold={LINKEDIN_WARNING_THRESHOLD}
            twitterActions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenTemplatePicker("twitter")}
              >
                <IconTemplate className="mr-2 h-4 w-4" />
                Insert Template
              </Button>
            }
            linkedInActions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenTemplatePicker("linkedin")}
              >
                <IconTemplate className="mr-2 h-4 w-4" />
                Insert Template
              </Button>
            }
          />

          {/* Twitter Date/Time Selector */}
          {enableTwitter && (
            <div className="space-y-2">
              <Label htmlFor="twitter-scheduled-time">
                Twitter Scheduled Time <span className="text-destructive">*</span>
              </Label>

              {/* Quick Reschedule Suggestions for Twitter */}
              {postData?.clonedFromPostId && originalPost?.twitterScheduledTime && (
                <QuickReschedule
                  originalScheduledTime={originalPost.twitterScheduledTime}
                  platform="twitter"
                  onSelectTime={handleTwitterTimeSelect}
                />
              )}

              <DateTimePicker
                date={twitterScheduledTime}
                setDate={setTwitterScheduledTime}
                placeholder="Select date and time"
              />
              <p className="text-sm text-muted-foreground">
                Time is in your local timezone
              </p>

              {/* Recommended Times for Twitter */}
              <RecommendedTimes
                selectedDate={twitterScheduledTime}
                platform="twitter"
                onTimeSelect={handleTwitterTimeSelect}
              />
            </div>
          )}

          {/* LinkedIn Date/Time Selector */}
          {enableLinkedIn && (
            <div className="space-y-2">
              <Label htmlFor="linkedin-scheduled-time">
                LinkedIn Scheduled Time <span className="text-destructive">*</span>
              </Label>

              {/* Quick Reschedule Suggestions for LinkedIn */}
              {postData?.clonedFromPostId && originalPost?.linkedInScheduledTime && (
                <QuickReschedule
                  originalScheduledTime={originalPost.linkedInScheduledTime}
                  platform="linkedin"
                  onSelectTime={handleLinkedInTimeSelect}
                />
              )}

              <DateTimePicker
                date={linkedInScheduledTime}
                setDate={setLinkedInScheduledTime}
                placeholder="Select date and time"
              />
              <p className="text-sm text-muted-foreground">
                Time is in your local timezone
              </p>

              {/* Recommended Times for LinkedIn */}
              <RecommendedTimes
                selectedDate={linkedInScheduledTime}
                platform="linkedin"
                onTimeSelect={handleLinkedInTimeSelect}
              />
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

          {/* Scheduling Preview */}
          {(enableTwitter && twitterScheduledTime) || (enableLinkedIn && linkedInScheduledTime) ? (
            <div
              className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md space-y-2"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-2">
                <IconCalendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Scheduled for:
                </p>
              </div>
              <div className="space-y-1 ml-7">
                {enableTwitter && twitterScheduledTime && (
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <span className="font-medium">Twitter:</span> {formatScheduledTime(twitterScheduledTime)}
                  </p>
                )}
                {enableLinkedIn && linkedInScheduledTime && (
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <span className="font-medium">LinkedIn:</span> {formatScheduledTime(linkedInScheduledTime)}
                  </p>
                )}
              </div>
            </div>
          ) : null}

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

          {/* Character Limit Exceeded Warning */}
          {(enableTwitter && isTwitterOverLimit) || (enableLinkedIn && isLinkedInOverLimit) ? (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md flex items-start gap-2">
              <IconInfoCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Character limit exceeded</p>
                <p className="mt-1 text-xs">
                  {enableTwitter && isTwitterOverLimit && (
                    <span>Twitter: {twitterCharCount}/{TWITTER_MAX_CHARS} characters</span>
                  )}
                  {enableTwitter && isTwitterOverLimit && enableLinkedIn && isLinkedInOverLimit && (
                    <span> • </span>
                  )}
                  {enableLinkedIn && isLinkedInOverLimit && (
                    <span>LinkedIn: {linkedInCharCount}/{LINKEDIN_MAX_CHARS} characters</span>
                  )}
                </p>
              </div>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || (!twitterContent.trim() && !linkedInContent.trim())}
              aria-label="Save as draft"
            >
              <IconDeviceFloppy className="mr-2 h-4 w-4" />
              {isSavingDraft ? "Saving..." : "Save as Draft"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsPreviewModalOpen(true)}
              disabled={!twitterContent.trim() && !linkedInContent.trim()}
              aria-label="Preview post"
            >
              <IconEye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitDisabled}
              aria-label={isSubmitDisabled && (isTwitterOverLimit || isLinkedInOverLimit) ? "Cannot submit: Character limit exceeded" : undefined}
            >
              {isSubmitting
                ? (mode === "edit" ? "Updating..." : "Scheduling...")
                : (mode === "edit" ? "Update Post" : "Schedule Post")}
            </Button>
          </div>
        </form>
      </CardContent>

      {/* Template Picker Modal */}
      <TemplatePickerModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleTemplateSelect}
      />

      {/* Preview Modal */}
      <PreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        twitterContent={twitterContent}
        linkedInContent={linkedInContent}
        url={url}
        twitterEnabled={enableTwitter}
        linkedInEnabled={enableLinkedIn}
        twitterCharacterCount={twitterCharCount}
      />
    </Card>
  );
}
