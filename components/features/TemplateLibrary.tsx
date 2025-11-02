"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { TemplateCard } from "./TemplateCard";
import { TemplateFormModal } from "./TemplateFormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { IconPlus, IconTemplate, IconSearch, IconX, IconFilter, IconArrowsSort } from "@tabler/icons-react";
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

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"mostUsed" | "recentlyUsed" | "name" | "dateCreated">("mostUsed");

  /**
   * Extract all unique tags from templates
   */
  const allTags = useMemo(() => {
    if (!templates) return [];
    const tagSet = new Set(templates.flatMap((template) => template.tags));
    return Array.from(tagSet).sort();
  }, [templates]);

  /**
   * Toggle tag selection
   */
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  /**
   * Filter and sort templates by search query, tags, and sort option
   */
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];

    let filtered = templates;

    // Filter by selected tags (AND logic)
    if (selectedTags.length > 0) {
      filtered = filtered.filter((template) =>
        selectedTags.every((tag) => template.tags.includes(tag))
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(query) ||
          template.content.toLowerCase().includes(query)
      );
    }

    // Apply sorting (AFTER filtering)
    const sorted = [...filtered];
    switch (sortBy) {
      case "mostUsed":
        sorted.sort((a, b) => b.usageCount - a.usageCount);
        break;
      case "recentlyUsed":
        sorted.sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "dateCreated":
        sorted.sort((a, b) => a._creationTime - b._creationTime);
        break;
    }

    return sorted;
  }, [templates, searchQuery, selectedTags, sortBy]);

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

      {/* Search bar and sort dropdown */}
      {templates && templates.length > 0 && (
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <IconX className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <IconArrowsSort className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                <SelectTrigger className="w-[180px]" aria-label="Sort templates by">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mostUsed">Most Used</SelectItem>
                  <SelectItem value="recentlyUsed">Recently Used</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="dateCreated">Date Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tag filter chips */}
          {allTags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <IconFilter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter by tags:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <Badge
                      key={tag}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => toggleTag(tag)}
                    >
                      #{tag}
                    </Badge>
                  );
                })}
              </div>
              {selectedTags.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{selectedTags.length} tag{selectedTags.length > 1 ? "s" : ""} selected</span>
                  <button
                    onClick={() => setSelectedTags([])}
                    className="text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Results count */}
          {(searchQuery || selectedTags.length > 0) && (
            <p className="text-sm text-muted-foreground">
              {searchQuery && selectedTags.length > 0 ? (
                <>
                  {filteredTemplates.length} result{filteredTemplates.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot; with tags: {selectedTags.join(", ")}
                </>
              ) : searchQuery ? (
                <>Showing {filteredTemplates.length} of {templates.length} templates</>
              ) : (
                <>Showing {filteredTemplates.length} of {templates.length} templates with selected tags</>
              )}
            </p>
          )}
        </div>
      )}

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

      {/* No search/filter results */}
      {templates.length > 0 && filteredTemplates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <IconSearch className="mb-4 h-16 w-16 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold">No templates found</h2>
          <p className="mb-6 text-muted-foreground">
            {searchQuery && selectedTags.length > 0 ? (
              <>No results for &quot;{searchQuery}&quot; with tags: {selectedTags.join(", ")}</>
            ) : searchQuery ? (
              <>No templates match your search for &quot;{searchQuery}&quot;</>
            ) : (
              <>No templates with selected tags</>
            )}
          </p>
          <div className="flex gap-2">
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear search
              </Button>
            )}
            {selectedTags.length > 0 && (
              <Button variant="outline" onClick={() => setSelectedTags([])}>
                Clear filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Templates grid */}
      {filteredTemplates.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template._id}
              template={template}
              onEdit={handleEdit}
              onDelete={handleDelete}
              searchQuery={searchQuery}
              usageCount={template.usageCount}
              lastUsedAt={template.lastUsedAt}
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
