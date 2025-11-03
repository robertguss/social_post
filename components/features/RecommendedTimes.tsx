"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { IconInfoCircle, IconBrandTwitter, IconBrandLinkedin, IconClock, IconAlertTriangle } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * RecommendedTimes Component
 *
 * Displays recommended posting times for a selected date and platform.
 * Features:
 * - Shows top 3 time recommendations based on engagement research
 * - Displays platform icon, time range, and engagement reason
 * - Click to auto-fill scheduled time field
 * - Dynamic updates when date or platform changes
 * - Conflict warnings for overlapping scheduled posts
 * - Info tooltip explaining recommendation source
 */

interface RecommendedTimesProps {
  selectedDate: Date | undefined;
  platform: "twitter" | "linkedin";
  onTimeSelect: (timestamp: number) => void;
}

export function RecommendedTimes({ selectedDate, platform, onTimeSelect }: RecommendedTimesProps) {
  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Format date to ISO string (YYYY-MM-DD) or undefined if no date selected
  const dateString = selectedDate ? selectedDate.toISOString().split("T")[0] : undefined;

  // Fetch recommendations from Convex (skip if no date selected)
  const recommendations = useQuery(
    api.recommendations.getRecommendedTimes,
    selectedDate && dateString
      ? {
          date: dateString,
          platform: platform,
          userTimezone: userTimezone,
        }
      : "skip"
  );

  // Don't show if no date selected
  if (!selectedDate) {
    return null;
  }

  // Loading state
  if (recommendations === undefined) {
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <IconClock className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Recommended Times</h3>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Card>
    );
  }

  // No recommendations available
  if (!recommendations || recommendations.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <IconClock className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Recommended Times</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          No recommendations available for this date
        </p>
      </Card>
    );
  }

  // Map engagement score to user-friendly text and badge color
  const getEngagementLevel = (score: number): { text: string; variant: "default" | "secondary" | "destructive" } => {
    if (score >= 80) {
      return { text: "High engagement window", variant: "default" };
    } else if (score >= 60) {
      return { text: "Good engagement window", variant: "secondary" };
    } else if (score >= 40) {
      return { text: "Moderate engagement", variant: "secondary" };
    } else {
      return { text: "Low engagement", variant: "destructive" };
    }
  };

  // Platform icon component
  const PlatformIcon = platform === "twitter" ? IconBrandTwitter : IconBrandLinkedin;

  // Extract start time from time range and convert to timestamp
  const extractStartTime = (timeRange: string): number => {
    // Parse time range like "9:00 AM - 11:00 AM EST"
    const startTimeString = timeRange.split(" - ")[0].trim();

    // Parse time components
    const timeMatch = startTimeString.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeMatch) {
      // Fallback: return current time
      return Date.now();
    }

    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const period = timeMatch[3].toUpperCase();

    // Convert to 24-hour format
    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }

    // Create Date object with selected date and extracted time
    const dateTime = new Date(selectedDate);
    dateTime.setHours(hours, minutes, 0, 0);

    return dateTime.getTime();
  };

  return (
    <Card className="p-4 space-y-3">
      {/* Header with info tooltip */}
      <div className="flex items-center gap-2">
        <IconClock className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Recommended Times</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Learn about recommendations"
              >
                <IconInfoCircle className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                Based on industry research and best practices for optimal engagement.
                In the future, we&apos;ll personalize based on your posting history.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Recommendation suggestions */}
      <div className="space-y-2">
        {recommendations.map((rec, index) => {
          const engagementLevel = getEngagementLevel(rec.engagementScore);

          return (
            <button
              key={index}
              type="button"
              onClick={() => onTimeSelect(extractStartTime(rec.timeRange))}
              className="w-full p-3 border rounded-md hover:bg-accent hover:border-accent-foreground transition-colors text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label={`Select recommended time: ${rec.timeRange}`}
            >
              <div className="flex items-start gap-3">
                {/* Platform icon */}
                <PlatformIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Time range */}
                  <p className="text-sm font-medium">{rec.timeRange}</p>

                  {/* Engagement level and conflict warning */}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant={engagementLevel.variant} className="text-xs">
                      {engagementLevel.text}
                    </Badge>
                    {rec.conflictsWithPost && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <IconAlertTriangle className="w-3 h-3" />
                        <span>Conflicts with existing post</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
