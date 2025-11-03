"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { QueueCard } from "./QueueCard";
import { ConflictResolutionModal } from "./ConflictResolutionModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconRepeat, IconAlertTriangle } from "@tabler/icons-react";
import { useSearchParams } from "next/navigation";

type StatusFilter = "all" | "active" | "paused" | "completed";

type Queue = {
  _id: string;
  _creationTime: number;
  clerkUserId: string;
  originalPostId: string;
  status: string;
  interval: number;
  nextScheduledTime: number;
  lastExecutedTime?: number;
  executionCount: number;
  maxExecutions?: number;
  originalPost: {
    _id: string;
    twitterContent?: string;
    linkedInContent?: string;
    status: string;
  };
};

/**
 * QueueList Component
 *
 * Displays all recurring post queues for the authenticated user.
 * Features:
 * - Status-based filtering (All/Active/Paused/Completed)
 * - Grid layout (responsive: 1 column mobile, 2-3 columns desktop)
 * - Loading and empty states
 * - Sorted by nextScheduledTime (soonest first)
 * - Conflict detection and resolution
 * - Global conflict summary
 */
export function QueueList() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [highlightedQueueId, setHighlightedQueueId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Fetch queues with optional status filter
  const queues = useQuery(
    api.queues.getQueues,
    statusFilter === "all" ? {} : { status: statusFilter }
  );

  // Fetch scheduling conflicts
  const conflicts = useQuery(api.queues.detectSchedulingConflicts);

  // Handle URL highlight parameter
  useEffect(() => {
    const highlight = searchParams?.get("highlight");
    if (highlight) {
      setHighlightedQueueId(highlight);
      // Clear highlight after 2 seconds
      const timer = setTimeout(() => {
        setHighlightedQueueId(null);
      }, 2000);

      // Cleanup: clear timeout on unmount or when searchParams changes
      return () => {
        clearTimeout(timer);
      };
    }
  }, [searchParams]);

  // Loading state
  if (queues === undefined) {
    return (
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Recurring Post Queues</h1>
          <p className="text-muted-foreground">
            Manage automated recurring posts
          </p>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Empty state
  if (queues.length === 0) {
    return (
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Recurring Post Queues</h1>
          <p className="text-muted-foreground">
            Manage automated recurring posts
          </p>
        </div>

        {/* Status filter tabs */}
        <Tabs
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          className="mb-6"
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="paused">Paused</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <IconRepeat className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No recurring queues yet</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            Create a recurring queue to automatically repost your content at regular intervals
          </p>
        </div>
      </div>
    );
  }

  // Count unique queues with conflicts
  const conflictingQueueIds = new Set(conflicts?.map((c) => c.queueId) || []);
  const conflictCount = conflictingQueueIds.size;

  // Handle conflict click
  const handleConflictClick = (queue: Queue) => {
    setSelectedQueue(queue);
  };

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Recurring Post Queues</h1>
        <p className="text-muted-foreground">
          Manage automated recurring posts
        </p>
      </div>

      {/* Global conflict summary */}
      {conflictCount > 0 && (
        <div className="mb-6 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex items-center gap-3">
          <IconAlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
              {conflictCount} queue{conflictCount !== 1 ? "s have" : " has"}{" "}
              scheduling conflicts
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
              Click the warning icon on a queue card to review and resolve conflicts
            </p>
          </div>
        </div>
      )}

      {/* Status filter tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="paused">Paused</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Queue grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {queues.map((queue) => (
          <div
            key={queue._id}
            id={`queue-${queue._id}`}
            className={
              highlightedQueueId === queue._id
                ? "animate-pulse ring-2 ring-primary rounded-lg"
                : ""
            }
          >
            <QueueCard
              queue={queue}
              conflicts={conflicts || []}
              onConflictClick={() => handleConflictClick(queue)}
            />
          </div>
        ))}
      </div>

      {/* Conflict Resolution Modal */}
      {selectedQueue && (
        <ConflictResolutionModal
          isOpen={!!selectedQueue}
          onClose={() => setSelectedQueue(null)}
          queue={selectedQueue}
          conflicts={conflicts || []}
        />
      )}
    </div>
  );
}
