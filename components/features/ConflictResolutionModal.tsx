"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { IconAlertTriangle, IconClock } from "@tabler/icons-react";
import { toast } from "sonner";

type Conflict = {
  queueId: Id<"recurring_queues">;
  postId: Id<"posts">;
  queueTime: number;
  postTime: number;
  platform: string;
};

type Queue = {
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

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Queue;
  conflicts: Conflict[];
}

/**
 * ConflictResolutionModal Component
 *
 * Displays scheduling conflicts for a queue and provides resolution options:
 * - "Adjust Queue Time" - opens time picker to modify queue's nextScheduledTime
 * - "Adjust Post Time" - navigates to post edit page
 * - "Ignore" - dismiss conflict (user accepts the conflict)
 */
export function ConflictResolutionModal({
  isOpen,
  onClose,
  queue,
  conflicts,
}: ConflictResolutionModalProps) {
  const router = useRouter();
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [newScheduledTime, setNewScheduledTime] = useState<Date | undefined>(
    new Date(queue.nextScheduledTime)
  );
  const updateQueue = useMutation(api.queues.updateQueue);

  // Reset newScheduledTime when the queue changes
  useEffect(() => {
    if (queue.nextScheduledTime) {
      setNewScheduledTime(new Date(queue.nextScheduledTime));
    } else {
      setNewScheduledTime(undefined);
    }
  }, [queue.nextScheduledTime]);

  // Filter conflicts for this queue
  const queueConflicts = conflicts.filter((c) => c.queueId === queue._id);

  const handleAdjustQueueTime = async () => {
    if (!newScheduledTime) {
      toast.error("Please select a new time");
      return;
    }

    setIsAdjusting(true);
    try {
      await updateQueue({
        queueId: queue._id,
        nextScheduledTime: newScheduledTime.getTime(),
      });
      toast.success("Queue time updated");
      setShowTimePicker(false);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update queue time"
      );
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleAdjustPostTime = (postId: Id<"posts">) => {
    // Navigate to post edit page
    router.push(`/posts/${postId}/edit`);
    onClose();
  };

  const handleIgnore = () => {
    toast.info("Conflict dismissed");
    onClose();
  };

  // Calculate time difference in minutes
  const getTimeDifference = (time1: number, time2: number) => {
    const diffMs = Math.abs(time1 - time2);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? "s" : ""} apart`;
    }
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return remainingMins > 0
      ? `${diffHours} hour${diffHours !== 1 ? "s" : ""} ${remainingMins} min apart`
      : `${diffHours} hour${diffHours !== 1 ? "s" : ""} apart`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <IconAlertTriangle className="h-6 w-6 text-orange-500" />
            <DialogTitle>Scheduling Conflicts</DialogTitle>
          </div>
          <DialogDescription>
            This queue&apos;s next scheduled time conflicts with {queueConflicts.length}{" "}
            existing post{queueConflicts.length !== 1 ? "s" : ""}. Choose how to
            resolve:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* List of conflicts */}
          {queueConflicts.map((conflict, idx) => (
            <div
              key={idx}
              className="border rounded-lg p-4 space-y-3 bg-muted/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <IconClock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium capitalize">
                      {conflict.platform}
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-muted-foreground">Queue posts at:</span>{" "}
                      {format(new Date(conflict.queueTime), "PPpp")}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Post scheduled at:</span>{" "}
                      {format(new Date(conflict.postTime), "PPpp")}
                    </div>
                    <div className="text-orange-600 font-medium">
                      {getTimeDifference(conflict.queueTime, conflict.postTime)}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAdjustPostTime(conflict.postId)}
                >
                  Edit Post
                </Button>
              </div>
            </div>
          ))}

          {/* Adjust queue time section */}
          {showTimePicker ? (
            <div className="border rounded-lg p-4 space-y-3">
              <Label htmlFor="new-queue-time">New Queue Time</Label>
              <DateTimePicker
                date={newScheduledTime}
                setDate={setNewScheduledTime}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTimePicker(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAdjustQueueTime}
                  disabled={isAdjusting}
                >
                  {isAdjusting ? "Updating..." : "Update Queue Time"}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowTimePicker(true)}
            >
              <IconClock className="h-4 w-4 mr-2" />
              Adjust Queue Time
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleIgnore}>
            Ignore Conflicts
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
