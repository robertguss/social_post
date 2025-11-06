/**
 * AI Assistant Button Component
 *
 * Provides quick access to AI-powered content enhancement features.
 * Features:
 * - Tone Adjustment
 * - Twitter-to-LinkedIn Expansion
 * - Hashtag Generation
 *
 * @module components/features/AIAssistantButton
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  IconSparkles,
  IconAdjustments,
  IconArrowsMaximize,
  IconHash,
  IconInfoCircle,
} from "@tabler/icons-react";

export type AIFeatureType = "tone" | "expand" | "hashtags";

export interface AIFeature {
  id: AIFeatureType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Available AI features
 */
export const AI_FEATURES: AIFeature[] = [
  {
    id: "tone",
    label: "Adjust Tone",
    description: "Make your content more formal, casual, or engaging",
    icon: IconAdjustments,
  },
  {
    id: "expand",
    label: "Expand for LinkedIn",
    description: "Turn your Twitter content into a longer LinkedIn post",
    icon: IconArrowsMaximize,
  },
  {
    id: "hashtags",
    label: "Generate Hashtags",
    description: "Get AI-suggested hashtags based on your content",
    icon: IconHash,
  },
];

interface AIAssistantButtonProps {
  /**
   * Callback when an AI feature is selected
   */
  onFeatureSelect: (feature: AIFeatureType) => void;

  /**
   * Whether the AI Assistant is currently processing
   */
  isLoading?: boolean;

  /**
   * Whether the button is disabled
   */
  disabled?: boolean;

  /**
   * Whether the popover is open (controlled)
   */
  isOpen?: boolean;

  /**
   * Callback when popover open state changes (controlled)
   */
  onOpenChange?: (open: boolean) => void;
}

/**
 * AI Assistant Button with Popover Menu
 *
 * Displays a prominent button that opens a popover menu with AI feature options.
 * Designed to be accessible, mobile-friendly, and non-disruptive to existing workflow.
 *
 * @example
 * <AIAssistantButton
 *   onFeatureSelect={(feature) => handleAIFeature(feature)}
 *   isLoading={isAIProcessing}
 *   disabled={!activeField}
 * />
 */
export function AIAssistantButton({
  onFeatureSelect,
  isLoading = false,
  disabled = false,
  isOpen,
  onOpenChange,
}: AIAssistantButtonProps) {
  // First-time user intro tooltip state
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    // Check if user has seen the AI Assistant intro
    if (typeof window !== "undefined") {
      const hasSeenIntro = localStorage.getItem("hasSeenAIAssistantIntro");
      if (!hasSeenIntro) {
        setShowIntro(true);
      }
    }
  }, []);

  /**
   * Handle dismissing intro tooltip
   */
  const handleDismissIntro = () => {
    setShowIntro(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("hasSeenAIAssistantIntro", "true");
    }
  };

  /**
   * Handle feature selection
   */
  const handleFeatureSelect = (featureId: AIFeatureType) => {
    // Dismiss intro if still showing
    if (showIntro) {
      handleDismissIntro();
    }

    onFeatureSelect(featureId);
    // Close popover after selection
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  /**
   * Handle keyboard navigation in menu
   */
  const handleKeyDown = (
    e: React.KeyboardEvent,
    featureId: AIFeatureType
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleFeatureSelect(featureId);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip open={showIntro && !disabled} onOpenChange={(open) => {
        if (!open && showIntro) {
          handleDismissIntro();
        }
      }}>
        <Popover open={isOpen} onOpenChange={onOpenChange}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || isLoading}
                aria-label="AI Assistant"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                className="gap-2"
                onClick={() => {
                  if (showIntro) {
                    handleDismissIntro();
                  }
                }}
              >
                <IconSparkles className="h-4 w-4" />
                <span className="hidden sm:inline">AI Assistant</span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <PopoverContent
            className="w-80 p-2"
            role="menu"
            aria-label="AI Assistant features"
          >
            <div className="space-y-1">
              {AI_FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <button
                    key={feature.id}
                    type="button"
                    role="menuitem"
                    tabIndex={0}
                    aria-label={`${feature.label}: ${feature.description}`}
                    onClick={() => handleFeatureSelect(feature.id)}
                    onKeyDown={(e) => handleKeyDown(e, feature.id)}
                    className="w-full flex items-start gap-3 p-3 rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none transition-colors text-left"
                  >
                    <Icon className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{feature.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {feature.description}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Help Link */}
              <div className="border-t pt-2 mt-2">
                <a
                  href="#"
                  className="w-full flex items-center gap-2 p-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    // TODO: Link to actual documentation when available
                    alert("AI Assistant Help:\n\n• Adjust Tone: Refine your message to be more professional, casual, or engaging\n• Expand for LinkedIn: Convert short Twitter posts into detailed LinkedIn content\n• Generate Hashtags: Get relevant hashtag suggestions based on your content");
                  }}
                >
                  <IconInfoCircle className="w-4 h-4" />
                  <span>Learn more about AI features</span>
                </a>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <TooltipContent
          side="bottom"
          className="bg-primary text-primary-foreground"
        >
          <div className="flex items-center gap-2">
            <IconSparkles className="w-4 h-4" />
            <span className="font-medium">Try the new AI Assistant!</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
