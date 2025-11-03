"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { addWeeks, addMonths } from "@/lib/timeHelpers";
import { IconCalendarPlus } from "@tabler/icons-react";

interface QuickRescheduleProps {
  /** Original scheduled timestamp in milliseconds */
  originalScheduledTime: number | undefined;
  /** Platform identifier for accessibility labels */
  platform: "twitter" | "linkedin";
  /** Callback when user selects a suggested time */
  onSelectTime: (time: number) => void;
}

interface TimeSuggestion {
  label: string;
  calculate: (timestamp: number) => number;
}

const TIME_SUGGESTIONS: TimeSuggestion[] = [
  {
    label: "+1 Week",
    calculate: (ts) => addWeeks(ts, 1),
  },
  {
    label: "+1 Month",
    calculate: (ts) => addMonths(ts, 1),
  },
  {
    label: "+3 Months",
    calculate: (ts) => addMonths(ts, 3),
  },
];

/**
 * QuickReschedule component provides smart time suggestions for rescheduling cloned posts
 * Displays +1 week, +1 month, +3 months suggestions relative to original post time
 */
export function QuickReschedule({
  originalScheduledTime,
  platform,
  onSelectTime,
}: QuickRescheduleProps) {
  // Don't render if no original time is available
  if (!originalScheduledTime) {
    return null;
  }

  /**
   * Formats timestamp to user-friendly absolute date/time string
   * Example: "Mon, Feb 15, 2024, 10:00 AM"
   */
  const formatDateTime = (timestamp: number): string => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(timestamp));
  };

  const handleSuggestionClick = (suggestion: TimeSuggestion) => {
    const newTime = suggestion.calculate(originalScheduledTime);
    onSelectTime(newTime);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        Quick Reschedule
      </p>
      <div className="flex flex-wrap gap-2">
        {TIME_SUGGESTIONS.map((suggestion) => {
          const calculatedTime = suggestion.calculate(originalScheduledTime);
          const formattedTime = formatDateTime(calculatedTime);

          return (
            <TooltipProvider key={suggestion.label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                    aria-label={`Schedule ${suggestion.label.toLowerCase()} from original ${platform} post time: ${formattedTime}`}
                    className="gap-1.5"
                  >
                    <IconCalendarPlus className="h-4 w-4" />
                    {suggestion.label}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{formattedTime}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}
