"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { TemplateCard } from "./TemplateCard";
import { TemplateFormModal } from "./TemplateFormModal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconPlus, IconTemplate } from "@tabler/icons-react";
import { toast } from "sonner";

/**
 * TemplateLibrary Component
 *
 * Main component for managing content templates.
 * Features:
 * - Display all user templates in a grid
 * - Create new templates
 * - Edit existing templates
 * - Delete templates with confirmation
 * - Real-time updates via Convex reactive queries
 * - Toast notifications for all operations
 */
export function TemplateLibrary() {
  // Query all templates
  const templates = useQuery(api.templates.getTemplates, {});

  // Mutations
  const deleteTemplate = useMutation(api.templates.deleteTemplate);

  // Modal state for create/edit
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Doc<"templates"> | null>(null);

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<Id<"templates"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Handle opening create modal
   */
  const handleCreate = () => {
    setEditingTemplate(null);
    setIsFormModalOpen(true);
  };

  /**
   * Handle opening edit modal
   */
  const handleEdit = (template: Doc<"templates">) => {
    setEditingTemplate(template);
    setIsFormModalOpen(true);
  };

  /**
   * Handle opening delete confirmation
   */
  const handleDelete = (template: Doc<"templates">) => {
    setDeleteConfirmId(template._id);
  };

  /**
   * Handle delete confirmation
   */
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;

    setIsDeleting(true);
    try {
      await deleteTemplate({ templateId: deleteConfirmId });
      toast.success("Template deleted successfully");
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete template");
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handle successful form submission
   */
  const handleFormSuccess = () => {
    setIsFormModalOpen(false);
    setEditingTemplate(null);
  };

  // Loading state
  if (templates === undefined) {
    return (
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading templates...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your reusable content templates
          </p>
        </div>
        <Button onClick={handleCreate}>
          <IconPlus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Empty state */}
      {templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <IconTemplate className="mb-4 h-16 w-16 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold">No templates yet</h2>
          <p className="mb-6 text-muted-foreground">
            Create your first template to get started
          </p>
          <Button onClick={handleCreate}>
            <IconPlus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>
      )}

      {/* Templates grid */}
      {templates.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template._id}
              template={template}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <TemplateFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingTemplate(null);
        }}
        onSuccess={handleFormSuccess}
        template={editingTemplate}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
