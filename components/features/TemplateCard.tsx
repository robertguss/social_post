"use client";

import { Doc } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconEdit, IconTrash, IconChartBar, IconClock } from "@tabler/icons-react";

interface TemplateCardProps {
  template: Doc<"templates">;
  onEdit: (template: Doc<"templates">) => void;
  onDelete: (template: Doc<"templates">) => void;
  searchQuery?: string;
  usageCount: number;
  lastUsedAt?: number;
}

/**
 * Highlights matching text in a string using <mark> tags
 */
function highlightText(text: string, query?: string): string {
  if (!query || !query.trim()) return text;

  // Escape special regex characters in the query
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  return text.replace(regex, "<mark class='bg-yellow-200 dark:bg-yellow-900'>$1</mark>");
}

/**
 * Formats lastUsedAt timestamp as relative time or "Never used"
 */
function formatLastUsed(lastUsedAt?: number): string {
  if (!lastUsedAt) return "Never used";

  return formatDistanceToNow(new Date(lastUsedAt), { addSuffix: true });
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
 * - Search term highlighting (when searchQuery provided)
 */
export function TemplateCard({
  template,
  onEdit,
  onDelete,
  searchQuery,
  usageCount,
  lastUsedAt
}: TemplateCardProps) {
  // Truncate content for preview
  const contentPreview =
    template.content.length > 150
      ? template.content.substring(0, 150) + "..."
      : template.content;

  // Highlighted versions
  const highlightedName = highlightText(template.name, searchQuery);
  const highlightedContent = highlightText(contentPreview, searchQuery);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle
            className="text-lg flex-1"
            dangerouslySetInnerHTML={{ __html: highlightedName }}
          />
          <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
            <IconChartBar className="h-3 w-3" />
            <span>{usageCount}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <p
          className="text-sm text-muted-foreground whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: highlightedContent }}
        />

        {template.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {template.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className={`flex items-center gap-1.5 text-sm ${template.tags.length > 0 ? 'mt-3' : 'mt-4'} ${lastUsedAt ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
          <IconClock className="h-4 w-4" />
          <span>{formatLastUsed(lastUsedAt)}</span>
        </div>
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
