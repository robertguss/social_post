/**
 * Hashtag Suggestion Panel Component
 *
 * Displays AI-generated hashtag suggestions with individual/bulk insertion actions.
 * Supports both desktop (dialog) and mobile (drawer) layouts for optimal UX.
 *
 * @module components/features/HashtagSuggestionPanel
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
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IconSparkles, IconX, IconCheck } from "@tabler/icons-react";

interface HashtagSuggestionPanelProps {
  /**
   * Whether the panel is open
   */
  isOpen: boolean;

  /**
   * Callback when panel should close
   */
  onClose: () => void;

  /**
   * AI-generated hashtag suggestions (undefined while loading)
   */
  hashtags?: string[];

  /**
   * Whether AI is currently processing
   */
  isLoading: boolean;

  /**
   * Platform context for hashtag generation (twitter or linkedin)
   */
  platform: "twitter" | "linkedin";

  /**
   * Callback when user inserts a single hashtag
   */
  onInsertHashtag: (hashtag: string) => void;

  /**
   * Callback when user inserts all hashtags
   */
  onInsertAll: (hashtags: string[]) => void;

  /**
   * Callback when user cancels
   */
  onCancel: () => void;

  /**
   * Optional function to check if inserting hashtags would exceed character limit
   */
  checkCharacterLimit?: (hashtags: string[]) => { exceeds: boolean; message?: string };
}

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
 * Hashtag Suggestion Panel
 *
 * Displays AI-generated hashtags as clickable badges. Users can insert
 * individual hashtags or all at once.
 *
 * @example
 * <HashtagSuggestionPanel
 *   isOpen={showHashtags}
 *   onClose={() => setShowHashtags(false)}
 *   hashtags={["AI", "Tech", "Innovation"]}
 *   isLoading={isHashtagsLoading}
 *   platform="twitter"
 *   onInsertHashtag={(tag) => insertHashtagAtCursor(tag)}
 *   onInsertAll={(tags) => insertAllHashtags(tags)}
 *   onCancel={() => setShowHashtags(false)}
 * />
 */
export function HashtagSuggestionPanel({
  isOpen,
  onClose,
  hashtags,
  isLoading,
  platform,
  onInsertHashtag,
  onInsertAll,
  onCancel,
  checkCharacterLimit,
}: HashtagSuggestionPanelProps) {
  const isMobile = useIsMobile();
  const [selectedHashtags, setSelectedHashtags] = useState<Set<string>>(
    new Set(),
  );

  // Reset selected hashtags when hashtags change
  useEffect(() => {
    setSelectedHashtags(new Set());
  }, [hashtags]);

  /**
   * Toggle hashtag selection
   */
  const toggleHashtag = (hashtag: string) => {
    setSelectedHashtags((prev) => {
      const next = new Set(prev);
      if (next.has(hashtag)) {
        next.delete(hashtag);
      } else {
        next.add(hashtag);
      }
      return next;
    });
  };


  /**
   * Handle insert all hashtags
   */
  const handleInsertAll = () => {
    if (!hashtags || hashtags.length === 0) return;

    // Check character limit if function provided
    if (checkCharacterLimit) {
      const limitCheck = checkCharacterLimit(hashtags);
      if (limitCheck.exceeds) {
        // Show error message (handled by parent component)
        return;
      }
    }

    onInsertAll(hashtags);
  };

  /**
   * Handle insert selected hashtags
   */
  const handleInsertSelected = () => {
    if (selectedHashtags.size === 0) return;
    const selected = Array.from(selectedHashtags);

    // Check character limit if function provided
    if (checkCharacterLimit) {
      const limitCheck = checkCharacterLimit(selected);
      if (limitCheck.exceeds) {
        // Show error message (handled by parent component)
        return;
      }
    }

    onInsertAll(selected);
  };

  /**
   * Render loading state
   */
  const renderLoading = () => (
    <div className="space-y-3" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-muted-foreground">
        <IconSparkles className="w-5 h-5 animate-pulse" />
        <span className="text-sm">AI is analyzing content for hashtags...</span>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-28" />
      </div>
    </div>
  );

  /**
   * Render hashtag suggestions
   */
  const renderContent = () => {
    if (!hashtags || hashtags.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>No hashtags generated. Try different content.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Platform Info */}
        <div className="text-sm text-muted-foreground">
          <p>
            Generated {hashtags.length} hashtag{hashtags.length !== 1 ? "s" : ""} for{" "}
            <span className="font-medium capitalize">{platform}</span>
          </p>
        </div>

        {/* Hashtag Badges */}
        <div className="flex flex-wrap gap-2" role="list" aria-label="Suggested hashtags">
          {hashtags.map((hashtag, index) => {
            const isSelected = selectedHashtags.has(hashtag);
            return (
              <Badge
                key={`${hashtag}-${index}`}
                variant={isSelected ? "default" : "outline"}
                className="cursor-pointer text-sm px-3 py-1.5 hover:bg-primary/10 transition-colors select-none"
                onClick={() => toggleHashtag(hashtag)}
                role="listitem"
                aria-label={`Hashtag: ${hashtag}. Click to ${isSelected ? "deselect" : "select"}.`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleHashtag(hashtag);
                  }
                }}
              >
                #{hashtag}
              </Badge>
            );
          })}
        </div>

        {/* Usage Hint */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
          <p>
            <strong>Tip:</strong> Click hashtags to select/deselect them, or use &quot;Insert All&quot; to add all at once.
            {platform === "twitter" && " Hashtags will be added to your content and count toward the 280 character limit."}
            {platform === "linkedin" && " Hashtags will be added to your content."}
          </p>
        </div>
      </div>
    );
  };

  /**
   * Render action buttons
   */
  const renderActions = () => {
    const hasSelection = selectedHashtags.size > 0;
    const hasHashtags = hashtags && hashtags.length > 0;

    return (
      <>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          aria-label="Cancel and close"
        >
          <IconX className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        {hasSelection && (
          <Button
            type="button"
            variant="default"
            onClick={handleInsertSelected}
            className="flex-1"
            aria-label={`Insert ${selectedHashtags.size} selected hashtag${selectedHashtags.size !== 1 ? "s" : ""}`}
          >
            <IconCheck className="mr-2 h-4 w-4" />
            Insert Selected ({selectedHashtags.size})
          </Button>
        )}
        <Button
          type="button"
          onClick={handleInsertAll}
          className="flex-1"
          disabled={!hasHashtags}
          aria-label={`Insert all ${hashtags?.length || 0} hashtags`}
        >
          <IconCheck className="mr-2 h-4 w-4" />
          Insert All
        </Button>
      </>
    );
  };

  // Mobile: Use Drawer
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent
          aria-labelledby="hashtag-title"
          aria-describedby="hashtag-description"
        >
          <DrawerHeader>
            <DrawerTitle id="hashtag-title">
              Hashtag Suggestions
            </DrawerTitle>
            <DrawerDescription id="hashtag-description">
              Select and insert AI-generated hashtags
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 max-h-[60vh] overflow-y-auto">
            {isLoading ? renderLoading() : renderContent()}
          </div>
          <DrawerFooter>
            <div className="flex gap-2 w-full flex-wrap">
              {renderActions()}
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Use Dialog
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[600px]"
        aria-labelledby="hashtag-title"
        aria-describedby="hashtag-description"
      >
        <DialogHeader>
          <DialogTitle id="hashtag-title">
            Hashtag Suggestions
          </DialogTitle>
          <DialogDescription id="hashtag-description">
            Select and insert AI-generated hashtags
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? renderLoading() : renderContent()}
        </div>
        <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
          {renderActions()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
