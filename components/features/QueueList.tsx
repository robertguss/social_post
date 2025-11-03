"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { QueueCard } from "./QueueCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconRepeat } from "@tabler/icons-react";

type StatusFilter = "all" | "active" | "paused" | "completed";

/**
 * QueueList Component
 *
 * Displays all recurring post queues for the authenticated user.
 * Features:
 * - Status-based filtering (All/Active/Paused/Completed)
 * - Grid layout (responsive: 1 column mobile, 2-3 columns desktop)
 * - Loading and empty states
 * - Sorted by nextScheduledTime (soonest first)
 */
export function QueueList() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Fetch queues with optional status filter
  const queues = useQuery(
    api.queues.getQueues,
    statusFilter === "all" ? {} : { status: statusFilter }
  );

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

      {/* Queue grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {queues.map((queue) => (
          <QueueCard key={queue._id} queue={queue} />
        ))}
      </div>
    </div>
  );
}
