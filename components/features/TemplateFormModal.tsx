"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface TemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  template?: Doc<"templates"> | null;
}

/**
 * TemplateFormModal Component
 *
 * A modal form for creating and editing templates.
 * Features:
 * - Create mode (when template is null)
 * - Edit mode (when template is provided)
 * - Form validation
 * - Tag input (comma-separated, converted to array)
 * - Real-time character count for content
 * - Toast notifications for success/error
 */
export function TemplateFormModal({
  isOpen,
  onClose,
  onSuccess,
  template,
}: TemplateFormModalProps) {
  // Form state
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mutations
  const createTemplate = useMutation(api.templates.createTemplate);
  const updateTemplate = useMutation(api.templates.updateTemplate);

  // Determine if we're editing or creating
  const isEditing = template !== null && template !== undefined;

  // Reset form when modal opens/closes or template changes
  useEffect(() => {
    if (isOpen) {
      if (template) {
        // Edit mode - populate form with template data
        setName(template.name);
        setContent(template.content);
        setTagsInput(template.tags.join(", "));
      } else {
        // Create mode - reset form
        setName("");
        setContent("");
        setTagsInput("");
      }
    }
  }, [isOpen, template]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (!content.trim()) {
      toast.error("Please enter template content");
      return;
    }

    // Parse tags from comma-separated input
    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    setIsSubmitting(true);

    try {
      if (isEditing && template) {
        // Update existing template
        await updateTemplate({
          templateId: template._id,
          name: name.trim(),
          content: content.trim(),
          tags,
        });
        toast.success("Template updated successfully");
      } else {
        // Create new template
        await createTemplate({
          name: name.trim(),
          content: content.trim(),
          tags,
        });
        toast.success("Template created successfully");
      }

      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save template");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Template" : "Create Template"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your template information below."
              : "Create a new reusable content template."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                placeholder="e.g., Launch Announcement, Weekly Update"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Template Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">Content</Label>
                <span className="text-sm text-muted-foreground">
                  {content.length} characters
                </span>
              </div>
              <Textarea
                id="content"
                placeholder="Enter your template content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isSubmitting}
                required
                rows={8}
                className="resize-none"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="e.g., hashtags, closing, buildinpublic"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-sm text-muted-foreground">
                Separate tags with commas to organize your templates
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : isEditing
                ? "Update Template"
                : "Create Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
