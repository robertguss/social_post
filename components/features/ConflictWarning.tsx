"use client";

import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Id } from "@/convex/_generated/dataModel";

interface DuplicateQueue {
  queueId: Id<"recurring_queues">;
  status: string;
  interval: number;
  nextScheduledTime: number;
}

interface ConflictWarningProps {
  isOpen: boolean;
  onClose: () => void;
  duplicateQueue: DuplicateQueue;
  onCreateAnyway: () => void;
}

/**
 * ConflictWarning Component
 *
 * Displays a warning when user tries to create a duplicate queue.
 * Provides three action options:
 * - "View Existing Queue" - navigates to Queues page with queue highlighted
 * - "Create Anyway" - proceeds with queue creation (bypasses duplicate check)
 * - "Cancel" - closes modal/cancels action
 */
export function ConflictWarning({
  isOpen,
  onClose,
  duplicateQueue,
  onCreateAnyway,
}: ConflictWarningProps) {
  const router = useRouter();

  const handleViewExistingQueue = () => {
    router.push(`/queues?highlight=${duplicateQueue.queueId}`);
    onClose();
  };

  const handleCreateAnyway = () => {
    onCreateAnyway();
    onClose();
  };

  // Format next scheduled time for display
  const nextScheduledDate = new Date(duplicateQueue.nextScheduledTime);
  const formattedDate = nextScheduledDate.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Format interval for display
  const intervalText =
    duplicateQueue.interval === 1
      ? "every day"
      : `every ${duplicateQueue.interval} days`;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <IconAlertTriangle
              className="h-6 w-6 text-orange-500"
              aria-hidden="true"
            />
            <AlertDialogTitle>Queue Already Exists</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-4">
            <p>A queue for this post already exists.</p>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Status:</span>
                <span className="text-sm capitalize">{duplicateQueue.status}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Interval:</span>
                <span className="text-sm capitalize">{intervalText}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Next Post:</span>
                <span className="text-sm">{formattedDate}</span>
              </div>
            </div>

            <p className="text-sm">
              You can view the existing queue or create a new one anyway.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleViewExistingQueue}
            className="bg-primary hover:bg-primary/90"
          >
            View Existing Queue
          </AlertDialogAction>
          <AlertDialogAction
            onClick={handleCreateAnyway}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            Create Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
