"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type QueueEditModalProps = {
  queue: {
    _id: Id<"recurring_queues">;
    interval: number;
    nextScheduledTime: number;
    maxExecutions?: number;
  };
  isOpen: boolean;
  onClose: () => void;
};

/**
 * QueueEditModal Component
 *
 * Modal dialog for editing a recurring queue's settings:
 * - Interval (number of days, min 1)
 * - Next scheduled time (date/time picker)
 * - Max executions (optional, can be cleared for infinite)
 *
 * Features form validation and error handling.
 */
export function QueueEditModal({
  queue,
  isOpen,
  onClose,
}: QueueEditModalProps) {
  const [interval, setInterval] = useState(queue.interval);
  const [nextScheduledTime, setNextScheduledTime] = useState("");
  const [maxExecutions, setMaxExecutions] = useState(
    queue.maxExecutions?.toString() || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateQueue = useMutation(api.queues.updateQueue);

  // Initialize form values when modal opens
  useEffect(() => {
    if (isOpen) {
      setInterval(queue.interval);
      // Convert timestamp to datetime-local format: YYYY-MM-DDTHH:MM
      const date = new Date(queue.nextScheduledTime);
      const localDateTime = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16);
      setNextScheduledTime(localDateTime);
      setMaxExecutions(queue.maxExecutions?.toString() || "");
      setError("");
    }
  }, [isOpen, queue]);

  // Form validation
  const validateForm = (): boolean => {
    if (interval < 1) {
      setError("Interval must be at least 1 day");
      return false;
    }

    if (!nextScheduledTime) {
      setError("Next scheduled time is required");
      return false;
    }

    const nextTime = new Date(nextScheduledTime).getTime();
    if (nextTime <= Date.now()) {
      setError("Next scheduled time must be in the future");
      return false;
    }

    if (maxExecutions && parseInt(maxExecutions) < 1) {
      setError("Max executions must be at least 1");
      return false;
    }

    setError("");
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert datetime-local to timestamp
      const nextTime = new Date(nextScheduledTime).getTime();

      await updateQueue({
        queueId: queue._id,
        interval,
        nextScheduledTime: nextTime,
        maxExecutions: maxExecutions ? parseInt(maxExecutions) : undefined,
      });

      toast.success("Queue updated successfully");
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update queue";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Queue Settings</DialogTitle>
            <DialogDescription>
              Update the interval, next scheduled time, and max executions for
              this recurring queue.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Interval field */}
            <div className="grid gap-2">
              <Label htmlFor="interval">
                Interval (days) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="interval"
                type="number"
                min="1"
                value={interval}
                onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                required
              />
            </div>

            {/* Next scheduled time field */}
            <div className="grid gap-2">
              <Label htmlFor="nextScheduledTime">
                Next Scheduled Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nextScheduledTime"
                type="datetime-local"
                value={nextScheduledTime}
                onChange={(e) => setNextScheduledTime(e.target.value)}
                required
              />
            </div>

            {/* Max executions field */}
            <div className="grid gap-2">
              <Label htmlFor="maxExecutions">
                Max Executions (leave empty for infinite)
              </Label>
              <Input
                id="maxExecutions"
                type="number"
                min="1"
                value={maxExecutions}
                onChange={(e) => setMaxExecutions(e.target.value)}
                placeholder="Infinite"
              />
            </div>

            {/* Error message */}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
