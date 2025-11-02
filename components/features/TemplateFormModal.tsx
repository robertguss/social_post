"use client";

import { useState, useEffect, KeyboardEvent } from "react";
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
import { Badge } from "@/components/ui/badge";
import { IconX } from "@tabler/icons-react";
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
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
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
        setTags(template.tags);
        setTagInput("");
      } else {
        // Create mode - reset form
        setName("");
        setContent("");
        setTags([]);
        setTagInput("");
      }
    }
  }, [isOpen, template]);

  /**
   * Add a tag from the input field
   */
  const addTag = (tagToAdd: string) => {
    const trimmedTag = tagToAdd.trim();

    // Prevent empty tags
    if (!trimmedTag) return;

    // Prevent duplicate tags (case-insensitive)
    if (tags.some((t) => t.toLowerCase() === trimmedTag.toLowerCase())) {
      toast.error("Tag already exists");
      return;
    }

    setTags([...tags, trimmedTag]);
    setTagInput("");
  };

  /**
   * Remove a tag by index
   */
  const removeTag = (indexToRemove: number) => {
    setTags(tags.filter((_, index) => index !== indexToRemove));
  };

  /**
   * Handle key press in tag input (Enter or comma)
   */
  const handleTagInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
  };

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

    // Add any pending tag input before submitting
    if (tagInput.trim()) {
      addTag(tagInput);
    }

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
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="Type a tag and press Enter or comma"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                disabled={isSubmitting}
              />
              {/* Tag chips display */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-1"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        disabled={isSubmitting}
                        className="ml-1 hover:text-destructive"
                        aria-label={`Remove ${tag} tag`}
                      >
                        <IconX size={14} />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Press Enter or comma to add tags
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
