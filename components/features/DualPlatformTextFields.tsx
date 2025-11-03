"use client";

import { useState, forwardRef, useImperativeHandle, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { IconChevronDown, IconChevronUp, IconBrandX, IconBrandLinkedin } from "@tabler/icons-react";

/**
 * DualPlatformTextFields Component
 *
 * Provides separate, visually distinct text fields for Twitter/X and LinkedIn content.
 * Features:
 * - Platform branding with colors and icons
 * - Independent focus state for each textarea
 * - Expand/collapse functionality for better focus
 * - Toggle switches to enable/disable each platform
 * - Visual dimming when platform is disabled
 * - Content preservation when toggling platforms
 */

interface DualPlatformTextFieldsProps {
  // Twitter props
  twitterContent: string;
  onTwitterChange: (content: string) => void;
  twitterEnabled: boolean;
  onTwitterEnabledChange: (enabled: boolean) => void;
  twitterCharCount?: number;
  twitterMaxChars?: number;
  twitterWarningThreshold?: number;
  twitterLabel?: string;
  twitterPlaceholder?: string;

  // LinkedIn props
  linkedInContent: string;
  onLinkedInChange: (content: string) => void;
  linkedInEnabled: boolean;
  onLinkedInEnabledChange: (enabled: boolean) => void;
  linkedInCharCount?: number;
  linkedInMaxChars?: number;
  linkedInWarningThreshold?: number;
  linkedInLabel?: string;
  linkedInPlaceholder?: string;

  // Optional action buttons (e.g., Insert Template)
  twitterActions?: React.ReactNode;
  linkedInActions?: React.ReactNode;
}

export interface DualPlatformTextFieldsRef {
  twitterTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  linkedInTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export const DualPlatformTextFields = forwardRef<DualPlatformTextFieldsRef, DualPlatformTextFieldsProps>(
  (
    {
      twitterContent,
      onTwitterChange,
      twitterEnabled,
      onTwitterEnabledChange,
      twitterCharCount,
      twitterMaxChars = 280,
      twitterWarningThreshold = 260,
      twitterLabel = "Twitter/X Content",
      twitterPlaceholder = "What's happening?",
      linkedInContent,
      onLinkedInChange,
      linkedInEnabled,
      onLinkedInEnabledChange,
      linkedInCharCount,
      linkedInMaxChars = 3000,
      linkedInWarningThreshold = 2900,
      linkedInLabel = "LinkedIn Content",
      linkedInPlaceholder = "Share your professional insights...",
      twitterActions,
      linkedInActions,
    },
    ref
  ) => {
    // Expand/collapse state
    const [twitterExpanded, setTwitterExpanded] = useState(true);
    const [linkedInExpanded, setLinkedInExpanded] = useState(true);

    // Textarea refs
    const twitterTextareaRef = useRef<HTMLTextAreaElement>(null);
    const linkedInTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Expose refs to parent component
    useImperativeHandle(ref, () => ({
      twitterTextareaRef,
      linkedInTextareaRef,
    }));

    // Calculate character counts
    const actualTwitterCharCount = twitterCharCount ?? twitterContent.length;
    const actualLinkedInCharCount = linkedInCharCount ?? linkedInContent.length;

    // Character count validation states
    const isTwitterOverLimit = actualTwitterCharCount > twitterMaxChars;
    const isTwitterNearLimit = actualTwitterCharCount >= twitterWarningThreshold && !isTwitterOverLimit;
    const isLinkedInOverLimit = actualLinkedInCharCount > linkedInMaxChars;
    const isLinkedInNearLimit = actualLinkedInCharCount >= linkedInWarningThreshold && !isLinkedInOverLimit;

    // Toggle expand/collapse
    const toggleTwitterExpanded = () => setTwitterExpanded(!twitterExpanded);
    const toggleLinkedInExpanded = () => setLinkedInExpanded(!linkedInExpanded);

    return (
      <div className="space-y-4">
        {/* Twitter/X Section */}
        <div
          className={`border-2 rounded-lg transition-all ${
            twitterEnabled
              ? "border-[#1DA1F2] bg-[#1DA1F2]/5"
              : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-2">
            <div className="flex items-center gap-3 flex-1">
              <IconBrandX
                className={`w-6 h-6 ${
                  twitterEnabled ? "text-[#1DA1F2]" : "text-gray-400 dark:text-gray-600"
                }`}
              />
              <Label
                htmlFor="twitter-content"
                className={`text-base font-semibold ${
                  twitterEnabled ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {twitterLabel}
              </Label>
            </div>

            <div className="flex items-center gap-2">
              {/* Enable/Disable Switch */}
              <div className="flex items-center gap-2">
                <Switch
                  id="twitter-enabled"
                  checked={twitterEnabled}
                  onCheckedChange={onTwitterEnabledChange}
                  aria-label="Toggle Twitter posting"
                />
                <Label
                  htmlFor="twitter-enabled"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  {twitterEnabled ? "Enabled" : "Disabled"}
                </Label>
              </div>

              {/* Expand/Collapse Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleTwitterExpanded}
                aria-expanded={twitterExpanded}
                aria-label={twitterExpanded ? "Collapse Twitter section" : "Expand Twitter section"}
              >
                {twitterExpanded ? (
                  <IconChevronUp className="w-4 h-4" />
                ) : (
                  <IconChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Content (Collapsible) */}
          {twitterExpanded && (
            <div className="px-4 pb-4 space-y-2">
              {/* Action buttons (e.g., Insert Template) */}
              {twitterActions && <div className="flex justify-end">{twitterActions}</div>}

              {/* Textarea */}
              <Textarea
                ref={twitterTextareaRef}
                id="twitter-content"
                placeholder={twitterPlaceholder}
                value={twitterContent}
                onChange={(e) => onTwitterChange(e.target.value)}
                disabled={!twitterEnabled}
                className={`min-h-[120px] resize-y ${
                  !twitterEnabled ? "cursor-not-allowed" : ""
                }`}
                aria-describedby="twitter-char-count"
                aria-invalid={isTwitterOverLimit}
                aria-label={twitterLabel}
              />

              {/* Character Counter */}
              <div
                id="twitter-char-count"
                className={`text-sm text-right ${
                  isTwitterOverLimit
                    ? "text-destructive font-semibold"
                    : isTwitterNearLimit
                    ? "text-yellow-600 font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {actualTwitterCharCount}/{twitterMaxChars}
              </div>
            </div>
          )}
        </div>

        {/* LinkedIn Section */}
        <div
          className={`border-2 rounded-lg transition-all ${
            linkedInEnabled
              ? "border-[#0A66C2] bg-[#0A66C2]/5"
              : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-2">
            <div className="flex items-center gap-3 flex-1">
              <IconBrandLinkedin
                className={`w-6 h-6 ${
                  linkedInEnabled ? "text-[#0A66C2]" : "text-gray-400 dark:text-gray-600"
                }`}
              />
              <Label
                htmlFor="linkedin-content"
                className={`text-base font-semibold ${
                  linkedInEnabled ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {linkedInLabel}
              </Label>
            </div>

            <div className="flex items-center gap-2">
              {/* Enable/Disable Switch */}
              <div className="flex items-center gap-2">
                <Switch
                  id="linkedin-enabled"
                  checked={linkedInEnabled}
                  onCheckedChange={onLinkedInEnabledChange}
                  aria-label="Toggle LinkedIn posting"
                />
                <Label
                  htmlFor="linkedin-enabled"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  {linkedInEnabled ? "Enabled" : "Disabled"}
                </Label>
              </div>

              {/* Expand/Collapse Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleLinkedInExpanded}
                aria-expanded={linkedInExpanded}
                aria-label={linkedInExpanded ? "Collapse LinkedIn section" : "Expand LinkedIn section"}
              >
                {linkedInExpanded ? (
                  <IconChevronUp className="w-4 h-4" />
                ) : (
                  <IconChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Content (Collapsible) */}
          {linkedInExpanded && (
            <div className="px-4 pb-4 space-y-2">
              {/* Action buttons (e.g., Insert Template) */}
              {linkedInActions && <div className="flex justify-end">{linkedInActions}</div>}

              {/* Textarea */}
              <Textarea
                ref={linkedInTextareaRef}
                id="linkedin-content"
                placeholder={linkedInPlaceholder}
                value={linkedInContent}
                onChange={(e) => onLinkedInChange(e.target.value)}
                disabled={!linkedInEnabled}
                className={`min-h-[120px] resize-y ${
                  !linkedInEnabled ? "cursor-not-allowed" : ""
                }`}
                aria-describedby="linkedin-char-count"
                aria-invalid={isLinkedInOverLimit}
                aria-label={linkedInLabel}
              />

              {/* Character Counter */}
              <div
                id="linkedin-char-count"
                className={`text-sm text-right ${
                  isLinkedInOverLimit
                    ? "text-destructive font-semibold"
                    : isLinkedInNearLimit
                    ? "text-yellow-600 font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {actualLinkedInCharCount}/{linkedInMaxChars}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

DualPlatformTextFields.displayName = "DualPlatformTextFields";
