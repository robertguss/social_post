"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CharacterCounter } from "@/components/ui/CharacterCounter";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { TemplatePickerModal } from "./TemplatePickerModal";
import { QuickReschedule } from "./QuickReschedule";
import { LinkedInFormattingHints } from "./LinkedInFormattingHints";
import { PreviewModal } from "./PreviewModal";
import { RecommendedTimes } from "./RecommendedTimes";
import { AIAssistantButton, type AIFeatureType } from "./AIAssistantButton";
import { AISuggestionPanel } from "./AISuggestionPanel";
import { HashtagSuggestionPanel } from "./HashtagSuggestionPanel";
import { IconTemplate, IconInfoCircle, IconX, IconCalendar, IconEye, IconDeviceFloppy, IconBrandX, IconBrandLinkedin, IconCopy } from "@tabler/icons-react";
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

  // AI Assistant actions
  const adjustTone = useAction(api.aiAssistant.adjustTone);
  const expandForLinkedIn = useAction(api.aiAssistant.expandForLinkedIn);
  const generateHashtags = useAction(api.aiAssistant.generateHashtags);

  // Fetch original post if this is a cloned post
  const originalPost = useQuery(
    api.posts.getPost,
    postData?.clonedFromPostId ? { postId: postData.clonedFromPostId } : "skip"
  );

  // Platform selection - determined by whether content exists
  // Removed explicit enable/disable toggles for better UX

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

  // Textarea refs for template insertion
  const twitterTextareaRef = useRef<HTMLTextAreaElement>(null);
  const linkedInTextareaRef = useRef<HTMLTextAreaElement>(null);

  // LinkedIn hints visibility state with localStorage persistence
  const [showLinkedInHints, setShowLinkedInHints] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("linkedin-hints-visible");
      return stored === null ? true : stored === "true";
    }
    return true;
  });

  // AI Assistant state
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [selectedAIFeature, setSelectedAIFeature] = useState<AIFeatureType | undefined>();
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiSuggestion, setAISuggestion] = useState<string | undefined>();
  const [aiWarning, setAIWarning] = useState<string | undefined>();
  const [aiError, setAIError] = useState<string | undefined>();
  const [aiIsRetryable, setAIIsRetryable] = useState<boolean>(false);
  const [showAISuggestionPanel, setShowAISuggestionPanel] = useState(false);

  // Hashtag generation state
  const [isHashtagsLoading, setIsHashtagsLoading] = useState(false);
  const [generatedHashtags, setGeneratedHashtags] = useState<string[] | undefined>();
  const [showHashtagPanel, setShowHashtagPanel] = useState(false);

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

  // Derived state: platforms are enabled if they have content
  const enableTwitter = twitterContent.trim().length > 0;
  const enableLinkedIn = linkedInContent.trim().length > 0;

  /**
   * Pre-fill form when in edit mode
   */
  useEffect(() => {
    if (mode === "edit" && postData) {
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
   * Handle dismissing LinkedIn hints
   */
  const handleDismissLinkedInHints = () => {
    setShowLinkedInHints(false);
    localStorage.setItem("linkedin-hints-visible", "false");
  };

  /**
   * Handle pre-fill LinkedIn with Twitter content
   */
  const handlePreFillLinkedIn = () => {
    setLinkedInContent(twitterContent);
    toast.success("Pre-filled from Twitter", {
      description: "LinkedIn content has been populated with your Twitter content",
      duration: 3000,
    });
    // Focus LinkedIn textarea after pre-fill
    setTimeout(() => {
      linkedInTextareaRef.current?.focus();
    }, 0);
  };

  /**
   * Handle AI feature selection
   */
  const handleAIFeatureSelect = async (feature: AIFeatureType) => {
    // Close the AI Assistant popover
    setIsAIAssistantOpen(false);
    setSelectedAIFeature(feature);

    // Validate active field
    if (!activeField) {
      toast.error("Please select a text field first");
      return;
    }

    // Get content from active field
    const content = activeField === "twitter" ? twitterContent : linkedInContent;

    // Validate content
    if (!content.trim()) {
      toast.error("Please enter some content first");
      return;
    }

    // Set loading state and show suggestion panel
    setIsAILoading(true);
    setAISuggestion(undefined);
    setAIWarning(undefined);
    setAIError(undefined);
    setAIIsRetryable(false);
    setShowAISuggestionPanel(true);

    try {
      // Call appropriate AI action based on feature
      switch (feature) {
        case "tone": {
          // Default to "professional" tone for now
          // TODO (Story 7.3): Add tone selector UI
          const toneResult = await adjustTone({ content, tone: "professional" });
          setAISuggestion(toneResult.content);
          setAIWarning(toneResult.warning);

          // Show warning toast if present
          if (toneResult.warning) {
            toast.warning("Character Limit Exceeded", {
              description: toneResult.warning,
              duration: 6000,
            });
          }
          break;
        }

        case "expand": {
          // Validate expand conditions (AC 1)
          if (activeField !== "twitter") {
            toast.error("Expand for LinkedIn only works with Twitter content");
            setShowAISuggestionPanel(false);
            setIsAILoading(false);
            return;
          }
          // Check if expansion makes sense (LinkedIn should be empty or shorter)
          if (linkedInContent.trim() && linkedInContent.length >= twitterContent.length) {
            toast.error("LinkedIn content is already longer than Twitter content");
            setShowAISuggestionPanel(false);
            setIsAILoading(false);
            return;
          }
          const expandResult = await expandForLinkedIn({ twitterContent: content });
          setAISuggestion(expandResult.content);
          setAIWarning(expandResult.warning);

          // Show warning toast if present
          if (expandResult.warning) {
            toast.warning("Content Length Warning", {
              description: expandResult.warning,
              duration: 6000,
            });
          }
          break;
        }

        case "hashtags":
          // For hashtags, we use a separate panel instead of AISuggestionPanel
          setIsHashtagsLoading(true);
          setGeneratedHashtags(undefined);
          setShowHashtagPanel(true);
          setIsAILoading(false);

          try {
            const platform = activeField === "twitter" ? "twitter" : "linkedin";
            const hashtags = await generateHashtags({ content, count: 5, platform });
            setGeneratedHashtags(hashtags);
            setIsHashtagsLoading(false);
          } catch (error) {
            console.error("Hashtag generation error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to generate hashtags");
            setIsHashtagsLoading(false);
            setShowHashtagPanel(false);
          }
          // Return early to skip the AISuggestionPanel logic below
          return;

        default:
          throw new Error(`Unknown AI feature: ${feature}`);
      }

      setIsAILoading(false);
    } catch (error) {
      console.error("AI feature error:", error);
      const errorMessage = error instanceof Error ? error.message : "AI service temporarily unavailable";

      // Determine if error is retryable based on message content
      const isRetryable = errorMessage.includes("rate limit") ||
                          errorMessage.includes("timed out") ||
                          errorMessage.includes("Network error") ||
                          errorMessage.includes("temporarily unavailable");

      setAIError(errorMessage);
      setAIIsRetryable(isRetryable);
      setIsAILoading(false);

      // Show error toast
      toast.error(errorMessage);
    }
  };

  /**
   * Handle AI suggestion accept
   */
  const handleAISuggestionAccept = (content: string) => {
    if (!activeField) return;

    // Update active field content
    if (activeField === "twitter") {
      setTwitterContent(content);
    } else {
      setLinkedInContent(content);
    }

    // Show success toast
    toast.success("AI suggestion applied", {
      description: "Your content has been updated",
      duration: 3000,
    });

    // Close suggestion panel
    setShowAISuggestionPanel(false);
    setAISuggestion(undefined);
    setAIWarning(undefined);
    setSelectedAIFeature(undefined);

    // Focus the updated textarea
    setTimeout(() => {
      const textarea = activeField === "twitter" ? twitterTextareaRef : linkedInTextareaRef;
      textarea.current?.focus();
    }, 0);
  };

  /**
   * Handle AI suggestion reject
   */
  const handleAISuggestionReject = () => {
    toast("Suggestion discarded", {
      description: "Your original content remains unchanged",
      duration: 2000,
    });

    // Close suggestion panel
    setShowAISuggestionPanel(false);
    setAISuggestion(undefined);
    setAIWarning(undefined);
    setAIError(undefined);
    setSelectedAIFeature(undefined);
  };

  /**
   * Handle AI retry after error
   */
  const handleAIRetry = () => {
    if (selectedAIFeature) {
      // Retry the same feature
      handleAIFeatureSelect(selectedAIFeature);
    }
  };

  /**
   * Insert hashtag at cursor position or append to content
   */
  const insertHashtagAtCursor = (hashtag: string, content: string, textareaRef: React.RefObject<HTMLTextAreaElement | null>): string => {
    const hashtagWithPrefix = `#${hashtag}`;
    const textarea = textareaRef.current;
    const cursorPos = textarea?.selectionStart;

    if (cursorPos !== undefined && cursorPos >= 0) {
      // Insert at cursor position
      const before = content.substring(0, cursorPos);
      const after = content.substring(cursorPos);
      const newContent = `${before}${hashtagWithPrefix} ${after}`;

      // Update cursor position after state update
      setTimeout(() => {
        textarea?.focus();
        const newCursorPos = cursorPos + hashtagWithPrefix.length + 1;
        textarea?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);

      return newContent;
    } else {
      // Append at end
      return content.trim() ? `${content.trim()} ${hashtagWithPrefix}` : hashtagWithPrefix;
    }
  };

  /**
   * Handle insert single hashtag
   */
  const handleInsertHashtag = (hashtag: string) => {
    if (!activeField) return;

    const isTwitter = activeField === "twitter";
    const currentContent = isTwitter ? twitterContent : linkedInContent;
    const maxChars = isTwitter ? TWITTER_MAX_CHARS : LINKEDIN_MAX_CHARS;
    const textareaRef = isTwitter ? twitterTextareaRef : linkedInTextareaRef;

    // Check character limit
    const hashtagWithSpace = `#${hashtag} `;
    if (currentContent.length + hashtagWithSpace.length > maxChars) {
      toast.error("Cannot insert hashtag: would exceed character limit", {
        description: `${isTwitter ? "Twitter" : "LinkedIn"} has a ${maxChars} character limit`,
        duration: 4000,
      });
      return;
    }

    // Insert hashtag
    const newContent = insertHashtagAtCursor(hashtag, currentContent, textareaRef);

    // Update state
    if (isTwitter) {
      setTwitterContent(newContent);
    } else {
      setLinkedInContent(newContent);
    }

    toast.success(`Inserted #${hashtag}`);
  };

  /**
   * Handle insert all hashtags
   */
  const handleInsertAllHashtags = (hashtags: string[]) => {
    if (!activeField || hashtags.length === 0) return;

    const isTwitter = activeField === "twitter";
    const currentContent = isTwitter ? twitterContent : linkedInContent;
    const maxChars = isTwitter ? TWITTER_MAX_CHARS : LINKEDIN_MAX_CHARS;

    // Format all hashtags
    const hashtagsText = hashtags.map(tag => `#${tag}`).join(" ");
    const newContent = currentContent.trim()
      ? `${currentContent.trim()} ${hashtagsText}`
      : hashtagsText;

    // Check character limit
    if (newContent.length > maxChars) {
      toast.error("Cannot insert hashtags: would exceed character limit", {
        description: `${isTwitter ? "Twitter" : "LinkedIn"} has a ${maxChars} character limit`,
        duration: 4000,
      });
      return;
    }

    // Update state
    if (isTwitter) {
      setTwitterContent(newContent);
    } else {
      setLinkedInContent(newContent);
    }

    toast.success(`Inserted ${hashtags.length} hashtag${hashtags.length !== 1 ? "s" : ""}`);

    // Close hashtag panel
    setShowHashtagPanel(false);
    setGeneratedHashtags(undefined);

    // Focus textarea
    setTimeout(() => {
      const textarea = isTwitter ? twitterTextareaRef : linkedInTextareaRef;
      textarea.current?.focus();
    }, 0);
  };

  /**
   * Handle hashtag panel cancel
   */
  const handleHashtagPanelCancel = () => {
    setShowHashtagPanel(false);
    setGeneratedHashtags(undefined);
    toast("Hashtags discarded", {
      description: "Your content remains unchanged",
      duration: 2000,
    });
  };

  /**
   * Check if inserting hashtags would exceed character limit
   */
  const checkHashtagCharacterLimit = (hashtags: string[]): { exceeds: boolean; message?: string } => {
    if (!activeField) return { exceeds: false };

    const isTwitter = activeField === "twitter";
    const currentContent = isTwitter ? twitterContent : linkedInContent;
    const maxChars = isTwitter ? TWITTER_MAX_CHARS : LINKEDIN_MAX_CHARS;

    const hashtagsText = hashtags.map(tag => `#${tag}`).join(" ");
    const newContent = currentContent.trim()
      ? `${currentContent.trim()} ${hashtagsText}`
      : hashtagsText;

    if (newContent.length > maxChars) {
      return {
        exceeds: true,
        message: `Would exceed ${isTwitter ? "Twitter" : "LinkedIn"}'s ${maxChars} character limit (${newContent.length} chars)`,
      };
    }

    return { exceeds: false };
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

          {/* Tabbed Platform Interface */}
          <Tabs defaultValue="twitter" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="twitter" className="gap-2">
                <IconBrandX className="w-4 h-4" />
                Twitter
              </TabsTrigger>
              <TabsTrigger value="linkedin" className="gap-2">
                <IconBrandLinkedin className="w-4 h-4" />
                LinkedIn
              </TabsTrigger>
            </TabsList>

            {/* Twitter Tab */}
            <TabsContent value="twitter" className="space-y-4 mt-4">
              <div className="border-2 border-[#1DA1F2] rounded-lg p-4 bg-[#1DA1F2]/5">
                {/* Twitter Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <IconBrandX className="w-6 h-6 text-[#1DA1F2]" />
                    <Label className="text-base font-semibold">Twitter/X Content</Label>
                  </div>
                </div>

                {/* Twitter Content */}
                <div className="space-y-2">
                  <div className="flex items-center justify-end gap-2">
                    <AIAssistantButton
                      onFeatureSelect={handleAIFeatureSelect}
                      isLoading={isAILoading}
                      disabled={!twitterContent.trim()}
                      isOpen={isAIAssistantOpen && activeField === "twitter"}
                      onOpenChange={setIsAIAssistantOpen}
                    />
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
                    placeholder="What's happening?"
                    value={twitterContent}
                    onChange={(e) => setTwitterContent(e.target.value)}
                    onFocus={() => setActiveField("twitter")}
                    className="min-h-[120px] resize-y"
                  />
                  <div className="flex justify-end">
                    <CharacterCounter
                      currentCount={twitterCharCount}
                      maxCount={TWITTER_MAX_CHARS}
                      warningThreshold={TWITTER_WARNING_THRESHOLD}
                      platform="twitter"
                    />
                  </div>
                </div>
              </div>

              {/* Twitter Scheduling */}
              {enableTwitter && (
                <div className="space-y-2">
                  <Label htmlFor="twitter-scheduled-time">
                    Twitter Scheduled Time <span className="text-destructive">*</span>
                  </Label>

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

                  <RecommendedTimes
                    selectedDate={twitterScheduledTime}
                    platform="twitter"
                    onTimeSelect={handleTwitterTimeSelect}
                  />
                </div>
              )}
            </TabsContent>

            {/* LinkedIn Tab */}
            <TabsContent value="linkedin" className="space-y-4 mt-4">
              <div className="border-2 border-[#0A66C2] rounded-lg p-4 bg-[#0A66C2]/5">
                {/* LinkedIn Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <IconBrandLinkedin className="w-6 h-6 text-[#0A66C2]" />
                    <Label className="text-base font-semibold">LinkedIn Content</Label>
                  </div>
                </div>

                {/* LinkedIn Content */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    {twitterContent.trim() && !linkedInContent.trim() && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handlePreFillLinkedIn}
                        className="border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2]/10"
                      >
                        <IconCopy className="w-4 h-4 mr-2" />
                        Pre-fill from Twitter
                      </Button>
                    )}
                    <div className="flex-1" />
                    <div className="flex items-center gap-2">
                      <AIAssistantButton
                        onFeatureSelect={handleAIFeatureSelect}
                        isLoading={isAILoading}
                        disabled={!linkedInContent.trim()}
                        isOpen={isAIAssistantOpen && activeField === "linkedin"}
                        onOpenChange={setIsAIAssistantOpen}
                      />
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
                  </div>
                  <Textarea
                    ref={linkedInTextareaRef}
                    placeholder="Share your professional insights..."
                    value={linkedInContent}
                    onChange={(e) => setLinkedInContent(e.target.value)}
                    onFocus={() => setActiveField("linkedin")}
                    className="min-h-[120px] resize-y"
                  />
                  <div className="flex justify-end">
                    <CharacterCounter
                      currentCount={linkedInCharCount}
                      maxCount={LINKEDIN_MAX_CHARS}
                      warningThreshold={LINKEDIN_WARNING_THRESHOLD}
                      platform="linkedin"
                    />
                  </div>

                  {/* LinkedIn Formatting Hints */}
                  <LinkedInFormattingHints
                    content={linkedInContent}
                    isVisible={showLinkedInHints}
                    onDismiss={handleDismissLinkedInHints}
                  />
                </div>
              </div>

              {/* LinkedIn Scheduling */}
              {enableLinkedIn && (
                <div className="space-y-2">
                  <Label htmlFor="linkedin-scheduled-time">
                    LinkedIn Scheduled Time <span className="text-destructive">*</span>
                  </Label>

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

                  <RecommendedTimes
                    selectedDate={linkedInScheduledTime}
                    platform="linkedin"
                    onTimeSelect={handleLinkedInTimeSelect}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>

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

      {/* AI Suggestion Panel */}
      <AISuggestionPanel
        isOpen={showAISuggestionPanel}
        onClose={() => setShowAISuggestionPanel(false)}
        originalContent={activeField === "twitter" ? twitterContent : linkedInContent}
        suggestion={aiSuggestion}
        warning={aiWarning}
        error={aiError}
        isRetryable={aiIsRetryable}
        isLoading={isAILoading}
        featureType={selectedAIFeature}
        onAccept={handleAISuggestionAccept}
        onReject={handleAISuggestionReject}
        onRetry={handleAIRetry}
      />

      {/* Hashtag Suggestion Panel */}
      <HashtagSuggestionPanel
        isOpen={showHashtagPanel}
        onClose={() => setShowHashtagPanel(false)}
        hashtags={generatedHashtags}
        isLoading={isHashtagsLoading}
        platform={activeField === "twitter" ? "twitter" : "linkedin"}
        onInsertHashtag={handleInsertHashtag}
        onInsertAll={handleInsertAllHashtags}
        onCancel={handleHashtagPanelCancel}
        checkCharacterLimit={checkHashtagCharacterLimit}
      />
    </Card>
  );
}
