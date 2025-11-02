/**
 * Unit Tests for TemplateCard Component
 *
 * Tests the TemplateCard component's rendering and interaction behaviors.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TemplateCard } from "@/components/features/TemplateCard";
import { Doc } from "@/convex/_generated/dataModel";

describe("TemplateCard Component", () => {
  const mockTemplate: Doc<"templates"> = {
    _id: "template1" as any,
    _creationTime: 1698768000000,
    clerkUserId: "user123",
    name: "Launch Announcement",
    content: "This is a template for launch announcements with hashtags and call to action",
    tags: ["launch", "announcement", "buildinpublic"],
    usageCount: 5,
    lastUsedAt: 1698768000000,
  };

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render template name", () => {
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("Launch Announcement")).toBeInTheDocument();
    });

    it("should render usage count", () => {
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("Used 5 times")).toBeInTheDocument();
    });

    it("should render content preview", () => {
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(
        screen.getByText(
          "This is a template for launch announcements with hashtags and call to action"
        )
      ).toBeInTheDocument();
    });

    it("should render all tags", () => {
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("launch")).toBeInTheDocument();
      expect(screen.getByText("announcement")).toBeInTheDocument();
      expect(screen.getByText("buildinpublic")).toBeInTheDocument();
    });

    it("should not render tags section when template has no tags", () => {
      const templateWithoutTags = { ...mockTemplate, tags: [] };

      render(
        <TemplateCard
          template={templateWithoutTags}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.queryByText("launch")).not.toBeInTheDocument();
    });

    it("should truncate long content with ellipsis", () => {
      const longContent = "a".repeat(200);
      const templateWithLongContent = { ...mockTemplate, content: longContent };

      render(
        <TemplateCard
          template={templateWithLongContent}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const contentElement = screen.getByText(/a+\.\.\./);
      expect(contentElement.textContent?.length).toBe(153); // 150 + "..."
    });

    it("should not truncate short content", () => {
      const shortContent = "Short template";
      const templateWithShortContent = {
        ...mockTemplate,
        content: shortContent,
      };

      render(
        <TemplateCard
          template={templateWithShortContent}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("Short template")).toBeInTheDocument();
    });

    it("should render edit and delete buttons", () => {
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /delete/i })
      ).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should call onEdit when edit button is clicked", () => {
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const editButton = screen.getByRole("button", { name: /edit/i });
      fireEvent.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledTimes(1);
      expect(mockOnEdit).toHaveBeenCalledWith(mockTemplate);
    });

    it("should call onDelete when delete button is clicked", () => {
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      fireEvent.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith(mockTemplate);
    });
  });

  describe("Edge Cases", () => {
    it("should handle template with zero usage count", () => {
      const unusedTemplate = { ...mockTemplate, usageCount: 0 };

      render(
        <TemplateCard
          template={unusedTemplate}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("Used 0 times")).toBeInTheDocument();
    });

    it("should handle template with high usage count", () => {
      const popularTemplate = { ...mockTemplate, usageCount: 999 };

      render(
        <TemplateCard
          template={popularTemplate}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("Used 999 times")).toBeInTheDocument();
    });

    it("should handle template with special characters in content", () => {
      const specialCharsTemplate = {
        ...mockTemplate,
        content: "Special chars: @#$%^&*() <div>HTML</div>",
      };

      render(
        <TemplateCard
          template={specialCharsTemplate}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(
        screen.getByText("Special chars: @#$%^&*() <div>HTML</div>")
      ).toBeInTheDocument();
    });
  });
});
