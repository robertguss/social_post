/**
 * AI Feedback Dialog Component
 *
 * Allows users to report issues with AI-generated content (inappropriate or low-quality).
 * Submits feedback to the backend for monitoring and analysis.
 *
 * @module components/features/AIFeedbackDialog
 */

"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { AIFeatureType } from "./AIAssistantButton";

interface AIFeedbackDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;

  /**
   * Callback when dialog should close
   */
  onClose: () => void;

  /**
   * AI feature that generated the content
   */
  feature: AIFeatureType;

  /**
   * Correlation ID from AI request logs
   */
  requestId: string;

  /**
   * User's original content
   */
  originalContent: string;

  /**
   * AI-generated content being reported
   */
  aiResponse: string;
}

type FeedbackType = "inappropriate" | "low-quality" | "other";

/**
 * AI Feedback Dialog
 *
 * Provides a form for users to submit feedback about AI-generated content.
 * Includes feedback type selection and optional details.
 *
 * @example
 * <AIFeedbackDialog
 *   isOpen={showFeedback}
 *   onClose={() => setShowFeedback(false)}
 *   feature="tone"
 *   requestId="tone-abc12345-1699999999999"
 *   originalContent="Original text"
 *   aiResponse="AI-generated text"
 * />
 */
export function AIFeedbackDialog({
  isOpen,
  onClose,
  feature,
  requestId,
  originalContent,
  aiResponse,
}: AIFeedbackDialogProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("low-quality");
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeedback = useMutation(api.aiFeedback.submitAIFeedback);

  /**
   * Handle feedback submission
   */
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      await submitFeedback({
        feature,
        requestId,
        originalContent,
        aiResponse,
        feedbackType,
        feedbackText: feedbackText.trim() || undefined,
      });

      toast.success("Feedback submitted", {
        description: "Thank you for helping us improve!",
        duration: 3000,
      });

      // Reset form and close
      setFeedbackType("low-quality");
      setFeedbackText("");
      onClose();
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      toast.error("Failed to submit feedback", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    if (!isSubmitting) {
      setFeedbackType("low-quality");
      setFeedbackText("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[500px]"
        aria-labelledby="feedback-title"
        aria-describedby="feedback-description"
      >
        <DialogHeader>
          <DialogTitle id="feedback-title">
            Report AI Content Issue
          </DialogTitle>
          <DialogDescription id="feedback-description">
            Help us improve by reporting issues with AI-generated content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Feedback Type */}
          <div className="space-y-2">
            <Label htmlFor="feedback-type">Issue Type</Label>
            <Select
              value={feedbackType}
              onValueChange={(value) => setFeedbackType(value as FeedbackType)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="feedback-type">
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inappropriate">
                  Inappropriate Content
                </SelectItem>
                <SelectItem value="low-quality">
                  Low Quality / Irrelevant
                </SelectItem>
                <SelectItem value="other">
                  Other Issue
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Feedback Details */}
          <div className="space-y-2">
            <Label htmlFor="feedback-text">
              Additional Details <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="feedback-text"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Describe the issue in more detail..."
              className="min-h-[100px] resize-y"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Your feedback helps us improve AI content quality
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
