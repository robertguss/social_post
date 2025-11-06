/**
 * AI Suggestion Preview Panel Component
 *
 * Displays AI-generated content suggestions with Accept/Reject/Edit actions.
 * Supports both desktop (dialog) and mobile (drawer) layouts for optimal UX.
 *
 * @module components/features/AISuggestionPanel
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { IconCheck, IconX, IconEdit, IconSparkles, IconFlag } from "@tabler/icons-react";
import type { AIFeatureType } from "./AIAssistantButton";
import { AIFeedbackDialog } from "./AIFeedbackDialog";

interface AISuggestionPanelProps {
  /**
   * Whether the panel is open
   */
  isOpen: boolean;

  /**
   * Callback when panel should close
   */
  onClose: () => void;

  /**
   * Original content before AI processing
   */
  originalContent: string;

  /**
   * AI-generated suggestion (undefined while loading)
   */
  suggestion?: string;

  /**
   * Optional warning message (e.g., character limit exceeded)
   */
  warning?: string;

  /**
   * Whether AI is currently processing
   */
  isLoading: boolean;

  /**
   * Which AI feature generated this suggestion
   */
  featureType?: AIFeatureType;

  /**
   * Error message if AI request failed
   */
  error?: string;

  /**
   * Whether the error is retryable
   */
  isRetryable?: boolean;

  /**
   * Callback when user accepts the suggestion
   */
  onAccept: (content: string) => void;

  /**
   * Callback when user rejects the suggestion
   */
  onReject: () => void;

  /**
   * Callback when user wants to retry after error
   */
  onRetry?: () => void;
}

/**
 * Feature display names for UI
 */
const FEATURE_LABELS: Record<AIFeatureType, string> = {
  tone: "Tone Adjustment",
  expand: "LinkedIn Expansion",
  hashtags: "Hashtag Generation",
};

/**
 * Hook to detect mobile viewport
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

/**
 * AI Suggestion Preview Panel
 *
 * Displays original content and AI-generated suggestion side-by-side (desktop)
 * or stacked (mobile). Provides Accept/Reject/Edit actions.
 *
 * @example
 * <AISuggestionPanel
 *   isOpen={showSuggestion}
 *   onClose={() => setShowSuggestion(false)}
 *   originalContent={twitterContent}
 *   suggestion={aiSuggestion}
 *   isLoading={isAILoading}
 *   featureType="tone"
 *   onAccept={(content) => setTwitterContent(content)}
 *   onReject={() => setShowSuggestion(false)}
 * />
 */
export function AISuggestionPanel({
  isOpen,
  onClose,
  originalContent,
  suggestion,
  warning,
  isLoading,
  featureType,
  error,
  isRetryable,
  onAccept,
  onReject,
  onRetry,
}: AISuggestionPanelProps) {
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [requestId] = useState(() => `${featureType || 'ai'}-${Date.now()}`);

  // Update edited content when suggestion changes
  useEffect(() => {
    if (suggestion) {
      setEditedContent(suggestion);
      setIsEditing(false);
    }
  }, [suggestion]);

  /**
   * Handle Accept action
   */
  const handleAccept = () => {
    const contentToAccept = isEditing ? editedContent : suggestion || "";
    onAccept(contentToAccept);
    setIsEditing(false);
  };

  /**
   * Handle Reject action
   */
  const handleReject = () => {
    onReject();
    setIsEditing(false);
  };

  /**
   * Handle Edit action
   */
  const handleEdit = () => {
    setIsEditing(true);
  };

  /**
   * Render loading state
   */
  const renderLoading = () => (
    <div className="space-y-3" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-muted-foreground">
        <IconSparkles className="w-5 h-5 animate-pulse" />
        <span className="text-sm">AI is analyzing your content...</span>
      </div>
      <Skeleton className="h-32 w-full" />
    </div>
  );

  /**
   * Render error state
   */
  const renderError = () => (
    <div className="space-y-4">
      {/* Error Message */}
      <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-md">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <h5 className="text-sm font-medium text-red-800 dark:text-red-200">
              AI Request Failed
            </h5>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {error || "An unexpected error occurred"}
            </p>
            {isRetryable && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                This error is temporary. You can try again.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Original Content for Reference */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">
          Original Content
        </h4>
        <div className="p-3 bg-muted rounded-md text-sm">
          {originalContent || <span className="text-muted-foreground italic">No content</span>}
        </div>
      </div>
    </div>
  );

  /**
   * Render content comparison
   */
  const renderContent = () => (
    <div className="space-y-4">
      {/* Character Limit Warning */}
      {warning && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50 rounded-md">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Character Limit Exceeded
              </h5>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {warning}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Original Content */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">
          Original Content
        </h4>
        <div className="p-3 bg-muted rounded-md text-sm">
          {originalContent || <span className="text-muted-foreground italic">No content</span>}
        </div>
      </div>

      {/* AI Suggestion */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-primary">
          AI Suggestion
        </h4>
        {isEditing ? (
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[120px] resize-y"
            aria-label="Edit AI suggestion"
            autoFocus
          />
        ) : (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-md text-sm">
            {suggestion || <span className="text-muted-foreground italic">No suggestion</span>}
          </div>
        )}
      </div>
    </div>
  );

  /**
   * Render action buttons
   */
  const renderActions = () => {
    // Error state actions
    if (error) {
      return (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
            aria-label="Close panel"
          >
            <IconX className="mr-2 h-4 w-4" />
            Close
          </Button>
          {isRetryable && onRetry && (
            <Button
              type="button"
              onClick={onRetry}
              className="flex-1"
              aria-label="Try again"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Try Again
            </Button>
          )}
        </>
      );
    }

    // Normal state actions
    return (
      <>
        <Button
          type="button"
          variant="outline"
          onClick={handleReject}
          className="flex-1"
          aria-label="Reject suggestion"
        >
          <IconX className="mr-2 h-4 w-4" />
          Reject
        </Button>
        {!isEditing && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleEdit}
              className="flex-1"
              disabled={!suggestion}
              aria-label="Edit suggestion"
            >
              <IconEdit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFeedbackDialog(true)}
              className="flex-1"
              disabled={!suggestion}
              aria-label="Report issue"
            >
              <IconFlag className="mr-2 h-4 w-4" />
              Report
            </Button>
          </>
        )}
        <Button
          type="button"
          onClick={handleAccept}
          className="flex-1"
          disabled={!suggestion && !isEditing}
          aria-label="Accept suggestion"
        >
          <IconCheck className="mr-2 h-4 w-4" />
          Accept
        </Button>
      </>
    );
  };

  // Render feedback dialog (shared for both mobile and desktop)
  const feedbackDialog = featureType && suggestion ? (
    <AIFeedbackDialog
      isOpen={showFeedbackDialog}
      onClose={() => setShowFeedbackDialog(false)}
      feature={featureType}
      requestId={requestId}
      originalContent={originalContent}
      aiResponse={suggestion}
    />
  ) : null;

  // Return appropriate view
  if (isMobile) {
    return (
      <>
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent
            aria-labelledby="suggestion-title"
            aria-describedby="suggestion-description"
          >
            <DrawerHeader>
              <DrawerTitle id="suggestion-title">
                {featureType ? FEATURE_LABELS[featureType] : "AI Suggestion"}
              </DrawerTitle>
              <DrawerDescription id="suggestion-description">
                Review and apply AI-generated content
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-4">
              {isLoading ? renderLoading() : error ? renderError() : renderContent()}
            </div>
            <DrawerFooter>
              <div className="flex gap-2 w-full">
                {renderActions()}
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
        {feedbackDialog}
      </>
    );
  }

  // Desktop view
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-[600px]"
          aria-labelledby="suggestion-title"
          aria-describedby="suggestion-description"
        >
          <DialogHeader>
            <DialogTitle id="suggestion-title">
              {featureType ? FEATURE_LABELS[featureType] : "AI Suggestion"}
            </DialogTitle>
            <DialogDescription id="suggestion-description">
              Review and apply AI-generated content
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isLoading ? renderLoading() : error ? renderError() : renderContent()}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {renderActions()}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {feedbackDialog}
    </>
  );
}
