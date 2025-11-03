"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IconX, IconInfoCircle } from "@tabler/icons-react";

/**
 * LinkedInFormattingHints Component
 *
 * Displays context-aware formatting hints for LinkedIn content creation.
 * Features:
 * - Static formatting tips (line breaks, emojis, hashtags)
 * - Context-aware dynamic hints based on content analysis
 * - Tips popover with LinkedIn best practices
 * - Dismissible/collapsible hint panel with localStorage persistence
 * - Non-intrusive, informational-only guidance (no enforcement)
 */

interface Hint {
  id: string;
  text: string;
  condition: (content: string) => boolean;
}

interface LinkedInFormattingHintsProps {
  content: string;
  isVisible: boolean;
  onDismiss: () => void;
}

// Context-aware hints that appear based on content analysis
const contextAwareHints: Hint[] = [
  {
    id: "add-hashtags",
    text: "Consider adding relevant hashtags",
    condition: (content) => content.length > 100 && !/#\w+/.test(content),
  },
  {
    id: "add-line-breaks",
    text: "Add line breaks to improve readability",
    condition: (content) => content.length > 200 && !content.includes("\n"),
  },
];

export function LinkedInFormattingHints({
  content,
  isVisible,
  onDismiss,
}: LinkedInFormattingHintsProps) {
  const [showTips, setShowTips] = useState(false);

  // Get active context-aware hints based on content
  const activeContextHints = contextAwareHints.filter((hint) =>
    hint.condition(content)
  );

  if (!isVisible) return null;

  return (
    <Card className="p-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 mt-2">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
          {/* Header with Tips Button */}
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Formatting Tips
            </p>
            {/* Tips Popover Button */}
            <Popover open={showTips} onOpenChange={setShowTips}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  aria-label="Show LinkedIn best practices"
                >
                  <IconInfoCircle className="w-4 h-4 mr-1" />
                  Tips
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 p-4"
                side="top"
                align="end"
                sideOffset={5}
              >
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-foreground">
                    LinkedIn Best Practices
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                      <span>
                        <strong>First 2-3 lines are critical</strong> - LinkedIn
                        truncates posts after ~140 characters in feed
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                      <span>
                        Use line breaks to create visual hierarchy
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                      <span>
                        Posts with 3-5 hashtags tend to perform well
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                      <span>
                        Tag relevant people or companies to increase reach
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                      <span>
                        Emoji can increase engagement, but use sparingly (1-3)
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                      <span>Ask questions to encourage comments</span>
                    </li>
                  </ul>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Static Formatting Hints */}
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>Use line breaks for readability</li>
            <li>Add emojis for engagement</li>
            <li>Include hashtags at the end</li>

            {/* Dynamic Context-Aware Hints */}
            {activeContextHints.map((hint) => (
              <li
                key={hint.id}
                className="text-orange-600 dark:text-orange-400 font-medium"
              >
                {hint.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Dismiss Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Dismiss hints"
        >
          <IconX className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
