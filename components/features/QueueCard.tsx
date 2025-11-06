"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconEdit,
  IconTrash,
  IconRepeat,
  IconCalendar,
  IconCheck,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { QueueEditModal } from "./QueueEditModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Conflict = {
  queueId: Id<"recurring_queues">;
  postId: Id<"posts">;
  queueTime: number;
  postTime: number;
  platform: string;
};

type QueueCardProps = {
  queue: {
    _id: Id<"recurring_queues">;
    _creationTime: number;
    userId: string;
    originalPostId: Id<"posts">;
    status: string;
    interval: number;
    nextScheduledTime: number;
    lastExecutedTime?: number;
    executionCount: number;
    maxExecutions?: number;
    originalPost: {
      _id: Id<"posts">;
      twitterContent?: string;
      linkedInContent?: string;
      status: string;
    };
  };
  conflicts?: Conflict[];
  onConflictClick?: () => void;
};

/**
 * QueueCard Component
 *
 * Displays a single recurring queue with:
 * - Original post content preview (first 100 chars)
 * - Interval ("Every N days")
 * - Status badge (color-coded)
 * - Next scheduled time
 * - Execution count / max executions
 * - Action buttons (Pause/Resume/Edit/Delete) based on status
 * - Conflict indicator if conflicts exist (optional)
 */
export function QueueCard({ queue, conflicts = [], onConflictClick }: QueueCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter conflicts for this specific queue
  const queueConflicts = conflicts.filter((c) => c.queueId === queue._id);

  const pauseQueue = useMutation(api.queues.pauseQueue);
  const resumeQueue = useMutation(api.queues.resumeQueue);
  const deleteQueue = useMutation(api.queues.deleteQueue);

  // Get content preview (prioritize Twitter, fall back to LinkedIn)
  const contentPreview =
    queue.originalPost.twitterContent || queue.originalPost.linkedInContent || "";
  const truncatedContent =
    contentPreview.length > 100
      ? contentPreview.substring(0, 100) + "..."
      : contentPreview;

  // Format interval text
  const intervalText =
    queue.interval === 1 ? "Every day" : `Every ${queue.interval} days`;

  // Format next scheduled time
  const formattedNextTime = format(
    new Date(queue.nextScheduledTime),
    "PPpp"
  );

  // Format execution count
  const executionCountText = queue.maxExecutions
    ? `Executed ${queue.executionCount} of ${queue.maxExecutions} times`
    : `Executed ${queue.executionCount} times`;

  // Status badge styling
  const statusVariant =
    queue.status === "active"
      ? "default"
      : queue.status === "paused"
        ? "secondary"
        : "outline";

  // Handle pause
  const handlePause = async () => {
    setIsPausing(true);
    try {
      await pauseQueue({ queueId: queue._id });
      toast.success("Queue paused");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to pause queue"
      );
    } finally {
      setIsPausing(false);
    }
  };

  // Handle resume
  const handleResume = async () => {
    setIsResuming(true);
    try {
      await resumeQueue({ queueId: queue._id });
      toast.success("Queue resumed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to resume queue"
      );
    } finally {
      setIsResuming(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteQueue({ queueId: queue._id });
      toast.success("Queue deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete queue"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Format conflict tooltip text
  const getConflictTooltip = () => {
    if (queueConflicts.length === 0) return "";
    if (queueConflicts.length === 1) {
      const conflict = queueConflicts[0];
      const conflictDate = format(new Date(conflict.postTime), "PPpp");
      return `Conflicts with scheduled ${conflict.platform} post on ${conflictDate}`;
    }
    return `${queueConflicts.length} scheduling conflicts detected`;
  };

  return (
    <>
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant} className="capitalize">
                {queue.status}
              </Badge>
              {queueConflicts.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0"
                        onClick={onConflictClick}
                        aria-label="This queue has scheduling conflicts"
                      >
                        <IconAlertTriangle className="h-4 w-4 text-orange-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getConflictTooltip()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditModalOpen(true)}
                aria-label="Edit queue settings"
              >
                <IconEdit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete queue"
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Recurring Queue?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this recurring queue? This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {truncatedContent}
          </p>
        </CardHeader>

        <CardContent className="flex-1 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <IconRepeat className="h-4 w-4 text-muted-foreground" />
            <span>{intervalText}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconCalendar className="h-4 w-4 text-muted-foreground" />
            <span>Next: {formattedNextTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconCheck className="h-4 w-4 text-muted-foreground" />
            <span>{executionCountText}</span>
          </div>
        </CardContent>

        <CardFooter className="pt-3">
          {queue.status === "active" && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handlePause}
              disabled={isPausing}
              aria-label="Pause queue"
            >
              <IconPlayerPause className="h-4 w-4 mr-2" />
              {isPausing ? "Pausing..." : "Pause"}
            </Button>
          )}
          {queue.status === "paused" && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResume}
              disabled={isResuming}
              aria-label="Resume queue"
            >
              <IconPlayerPlay className="h-4 w-4 mr-2" />
              {isResuming ? "Resuming..." : "Resume"}
            </Button>
          )}
        </CardFooter>
      </Card>

      <QueueEditModal
        queue={queue}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </>
  );
}
