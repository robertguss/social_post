"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TwitterPreview } from "./previews/TwitterPreview";
import { TwitterThreadPreview } from "./previews/TwitterThreadPreview";
import { LinkedInPreview } from "./previews/LinkedInPreview";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  twitterContent: string;
  twitterThread?: string[];
  linkedInContent: string;
  url?: string;
  twitterEnabled: boolean;
  linkedInEnabled: boolean;
  twitterCharacterCount: number;
}

export function PreviewModal({
  isOpen,
  onClose,
  twitterContent,
  twitterThread,
  linkedInContent,
  url,
  twitterEnabled,
  linkedInEnabled,
  twitterCharacterCount,
}: PreviewModalProps) {
  // Determine if we show one or both previews
  const showBothPlatforms = twitterEnabled && linkedInEnabled;

  // Check if this is a thread or single tweet
  const isThread = twitterThread && twitterThread.length > 0 && twitterThread.some(t => t.trim() !== "");

  // Handle empty content
  const hasTwitterContent = isThread
    ? twitterThread.some(t => t.trim() !== "")
    : twitterContent.trim() !== "";
  const hasContent = hasTwitterContent || linkedInContent.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] overflow-y-auto"
        aria-describedby="preview-description"
      >
        <DialogHeader>
          <DialogTitle>Preview</DialogTitle>
          <p id="preview-description" className="text-sm text-gray-500">
            See how your content will appear on each platform
          </p>
        </DialogHeader>

        {!hasContent ? (
          <div className="py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No content to preview. Start typing to see your post previews.
            </p>
          </div>
        ) : (
          <div
            className={`grid gap-6 ${
              showBothPlatforms
                ? "grid-cols-1 lg:grid-cols-2"
                : "grid-cols-1 max-w-2xl mx-auto"
            }`}
          >
            {/* Twitter Preview - Show thread or single tweet */}
            {twitterEnabled && (
              <>
                {isThread ? (
                  <TwitterThreadPreview tweets={twitterThread!} url={url} />
                ) : (
                  <TwitterPreview
                    content={twitterContent}
                    url={url}
                    characterCount={twitterCharacterCount}
                  />
                )}
              </>
            )}

            {/* LinkedIn Preview */}
            {linkedInEnabled && (
              <LinkedInPreview content={linkedInContent} url={url} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
