"use client";

import { Doc } from "@/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconEdit, IconTrash, IconCopy } from "@tabler/icons-react";

interface TemplateCardProps {
  template: Doc<"templates">;
  onEdit: (template: Doc<"templates">) => void;
  onDelete: (template: Doc<"templates">) => void;
}

/**
 * TemplateCard Component
 *
 * Displays an individual template in a card format with:
 * - Template name
 * - Content preview (truncated to 150 characters)
 * - Tags as badges
 * - Usage count
 * - Edit and Delete action buttons
 */
export function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  // Truncate content for preview
  const contentPreview =
    template.content.length > 150
      ? template.content.substring(0, 150) + "..."
      : template.content;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2">
              <IconCopy className="h-4 w-4" />
              <span>Used {template.usageCount} times</span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {contentPreview}
        </p>

        {template.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {template.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(template)}
        >
          <IconEdit className="mr-2 h-4 w-4" />
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(template)}
        >
          <IconTrash className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
