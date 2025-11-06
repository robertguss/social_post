"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconSearch, IconX, IconFilter, IconTemplate } from "@tabler/icons-react";

/**
 * TemplatePickerModal Component
 *
 * Modal dialog for selecting templates to insert into post composer.
 * Features:
 * - Displays user's templates in a scrollable list
 * - Search by template name or content
 * - Filter by tags (AND logic)
 * - Emits template selection event to parent
 * - Loading and empty states
 */

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: Doc<"templates">) => void;
}

export function TemplatePickerModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: TemplatePickerModalProps) {
  // Query all templates
  const templates = useQuery(api.templates.getTemplates, {});

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  /**
   * Extract all unique tags from templates
   */
  const allTags = useMemo(() => {
    if (!templates) return [];
    const tagSet = new Set(templates.flatMap((template: Doc<"templates">) => template.tags));
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
   * Filter templates by search query and tags
   */
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];

    let filtered = templates;

    // Filter by selected tags (AND logic)
    if (selectedTags.length > 0) {
      filtered = filtered.filter((template: Doc<"templates">) =>
        selectedTags.every((tag) => template.tags.includes(tag))
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (template: Doc<"templates">) =>
          template.name.toLowerCase().includes(query) ||
          template.content.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [templates, searchQuery, selectedTags]);

  /**
   * Handle template selection
   */
  const handleSelect = (template: Doc<"templates">) => {
    onSelectTemplate(template);
    // Reset search/filters
    setSearchQuery("");
    setSelectedTags([]);
    onClose();
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    // Reset search/filters
    setSearchQuery("");
    setSelectedTags([]);
    onClose();
  };

  // Loading state
  if (templates === undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Template</DialogTitle>
            <DialogDescription>
              Choose a template to insert into your post
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading templates...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Template</DialogTitle>
          <DialogDescription>
            Choose a template to insert into your post
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search bar */}
          <div className="relative">
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
                  <span>
                    {selectedTags.length} tag{selectedTags.length > 1 ? "s" : ""} selected
                  </span>
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

          {/* Empty state - no templates */}
          {templates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 flex-1">
              <IconTemplate className="mb-4 h-16 w-16 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-semibold">No templates yet</h2>
              <p className="text-muted-foreground text-center">
                Create your first template in the Templates page.
              </p>
            </div>
          )}

          {/* No search/filter results */}
          {templates.length > 0 && filteredTemplates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 flex-1">
              <IconSearch className="mb-4 h-16 w-16 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-semibold">No templates found</h2>
              <p className="mb-6 text-muted-foreground text-center">
                {searchQuery && selectedTags.length > 0 ? (
                  <>
                    No results for &quot;{searchQuery}&quot; with tags:{" "}
                    {selectedTags.join(", ")}
                  </>
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

          {/* Templates list */}
          {filteredTemplates.length > 0 && (
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {filteredTemplates.map((template: Doc<"templates">) => (
                <div
                  key={template._id}
                  className="border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => handleSelect(template)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-2 truncate">{template.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {template.content}
                      </p>
                      {template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {template.tags.map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button size="sm" className="shrink-0">
                      Select
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
