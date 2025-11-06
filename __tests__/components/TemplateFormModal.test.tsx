/**
 * Unit Tests for TemplateFormModal Component
 *
 * Tests the TemplateFormModal component's form handling, validation, and submission.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TemplateFormModal } from "@/components/features/TemplateFormModal";
import { useMutation } from "convex/react";
import { Doc } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

// Mock Convex API
jest.mock("@/convex/_generated/api", () => ({
  api: {
    templates: {
      createTemplate: "mockCreateTemplate",
      updateTemplate: "mockUpdateTemplate",
    },
  },
}));

// Mock Convex React hooks
jest.mock("convex/react", () => ({
  useMutation: jest.fn(),
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

describe("TemplateFormModal Component", () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockCreateTemplate = jest.fn();
  const mockUpdateTemplate = jest.fn();

  const mockTemplate: Doc<"templates"> = {
    _id: "template1" as any,
    _creationTime: 1698768000000,
    userId: "user123",
    name: "Launch Announcement",
    content: "This is a template for launch announcements",
    tags: ["launch", "announcement"],
    usageCount: 5,
    lastUsedAt: 1698768000000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMutation
      .mockReturnValueOnce(mockCreateTemplate)
      .mockReturnValueOnce(mockUpdateTemplate);
  });

  describe("Create Mode", () => {
    it("should render create mode dialog when template is null", () => {
      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={null}
        />
      );

      expect(screen.getByText("Create Template")).toBeInTheDocument();
      expect(
        screen.getByText("Create a new reusable content template.")
      ).toBeInTheDocument();
    });

    it("should render empty form fields in create mode", () => {
      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={null}
        />
      );

      const nameInput = screen.getByLabelText("Template Name");
      const contentInput = screen.getByLabelText("Content");
      const tagsInput = screen.getByLabelText(/Tags/);

      expect(nameInput).toHaveValue("");
      expect(contentInput).toHaveValue("");
      expect(tagsInput).toHaveValue("");
    });

    it("should display create button in create mode", () => {
      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={null}
        />
      );

      expect(
        screen.getByRole("button", { name: "Create Template" })
      ).toBeInTheDocument();
    });

    it("should update character count as user types", () => {
      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={null}
        />
      );

      const contentInput = screen.getByLabelText("Content");
      fireEvent.change(contentInput, { target: { value: "Test content" } });

      expect(screen.getByText("12 characters")).toBeInTheDocument();
    });

    it("should call createTemplate mutation on submit in create mode", async () => {
      mockCreateTemplate.mockResolvedValue("newTemplateId");

      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={null}
        />
      );

      fireEvent.change(screen.getByLabelText("Template Name"), {
        target: { value: "New Template" },
      });
      fireEvent.change(screen.getByLabelText("Content"), {
        target: { value: "New template content" },
      });
      fireEvent.change(screen.getByLabelText(/Tags/), {
        target: { value: "tag1, tag2" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Template" }));

      await waitFor(() => {
        expect(mockCreateTemplate).toHaveBeenCalledWith({
          name: "New Template",
          content: "New template content",
          tags: ["tag1", "tag2"],
        });
      });
    });

    it("should show success toast after successful creation", async () => {
      mockCreateTemplate.mockResolvedValue("newTemplateId");

      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={null}
        />
      );

      fireEvent.change(screen.getByLabelText("Template Name"), {
        target: { value: "New Template" },
      });
      fireEvent.change(screen.getByLabelText("Content"), {
        target: { value: "Content" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Template" }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Template created successfully");
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe("Edit Mode", () => {
    it("should render edit mode dialog when template is provided", () => {
      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={mockTemplate}
        />
      );

      expect(screen.getByText("Edit Template")).toBeInTheDocument();
      expect(
        screen.getByText("Update your template information below.")
      ).toBeInTheDocument();
    });

    it("should populate form fields with template data in edit mode", () => {
      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={mockTemplate}
        />
      );

      const nameInput = screen.getByLabelText("Template Name");
      const contentInput = screen.getByLabelText("Content");
      const tagsInput = screen.getByLabelText(/Tags/);

      expect(nameInput).toHaveValue("Launch Announcement");
      expect(contentInput).toHaveValue(
        "This is a template for launch announcements"
      );
      expect(tagsInput).toHaveValue("launch, announcement");
    });

    it("should display update button in edit mode", () => {
      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={mockTemplate}
        />
      );

      expect(
        screen.getByRole("button", { name: "Update Template" })
      ).toBeInTheDocument();
    });

    it("should call updateTemplate mutation on submit in edit mode", async () => {
      mockUpdateTemplate.mockResolvedValue(true);

      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={mockTemplate}
        />
      );

      fireEvent.change(screen.getByLabelText("Template Name"), {
        target: { value: "Updated Name" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Update Template" }));

      await waitFor(() => {
        expect(mockUpdateTemplate).toHaveBeenCalledWith({
          templateId: mockTemplate._id,
          name: "Updated Name",
          content: "This is a template for launch announcements",
          tags: ["launch", "announcement"],
        });
      });
    });

    it("should show success toast after successful update", async () => {
      mockUpdateTemplate.mockResolvedValue(true);

      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={mockTemplate}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Update Template" }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Template updated successfully");
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe("Validation", () => {
    it("should show error toast when name is empty", async () => {
      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={null}
        />
      );

      fireEvent.change(screen.getByLabelText("Content"), {
        target: { value: "Content" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Template" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Please enter a template name");
      });
    });

    it("should show error toast when content is empty", async () => {
      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={null}
        />
      );

      fireEvent.change(screen.getByLabelText("Template Name"), {
        target: { value: "Name" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Template" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Please enter template content");
      });
    });

    it("should trim whitespace from name and content before submission", async () => {
      mockCreateTemplate.mockResolvedValue("newTemplateId");

      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={null}
        />
      );

      fireEvent.change(screen.getByLabelText("Template Name"), {
        target: { value: "  Name with spaces  " },
      });
      fireEvent.change(screen.getByLabelText("Content"), {
        target: { value: "  Content with spaces  " },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Template" }));

      await waitFor(() => {
        expect(mockCreateTemplate).toHaveBeenCalledWith({
          name: "Name with spaces",
          content: "Content with spaces",
          tags: [],
        });
      });
    });
  });

  describe("Tag Handling", () => {
    it("should parse comma-separated tags correctly", async () => {
      mockCreateTemplate.mockResolvedValue("newTemplateId");

      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={null}
        />
      );

      fireEvent.change(screen.getByLabelText("Template Name"), {
        target: { value: "Name" },
      });
      fireEvent.change(screen.getByLabelText("Content"), {
        target: { value: "Content" },
      });
      fireEvent.change(screen.getByLabelText(/Tags/), {
        target: { value: "tag1, tag2, tag3" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Template" }));

      await waitFor(() => {
        expect(mockCreateTemplate).toHaveBeenCalledWith({
          name: "Name",
          content: "Content",
          tags: ["tag1", "tag2", "tag3"],
        });
      });
    });

    it("should trim whitespace from tags", async () => {
      mockCreateTemplate.mockResolvedValue("newTemplateId");

      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={null}
        />
      );

      fireEvent.change(screen.getByLabelText("Template Name"), {
        target: { value: "Name" },
      });
      fireEvent.change(screen.getByLabelText("Content"), {
        target: { value: "Content" },
      });
      fireEvent.change(screen.getByLabelText(/Tags/), {
        target: { value: "  tag1  ,  tag2  " },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Template" }));

      await waitFor(() => {
        expect(mockCreateTemplate).toHaveBeenCalledWith({
          name: "Name",
          content: "Content",
          tags: ["tag1", "tag2"],
        });
      });
    });

    it("should filter out empty tags", async () => {
      mockCreateTemplate.mockResolvedValue("newTemplateId");

      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={null}
        />
      );

      fireEvent.change(screen.getByLabelText("Template Name"), {
        target: { value: "Name" },
      });
      fireEvent.change(screen.getByLabelText("Content"), {
        target: { value: "Content" },
      });
      fireEvent.change(screen.getByLabelText(/Tags/), {
        target: { value: "tag1, , tag2, , " },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Template" }));

      await waitFor(() => {
        expect(mockCreateTemplate).toHaveBeenCalledWith({
          name: "Name",
          content: "Content",
          tags: ["tag1", "tag2"],
        });
      });
    });
  });

  describe("Error Handling", () => {
    it("should show error toast when mutation fails", async () => {
      mockCreateTemplate.mockRejectedValue(
        new Error("Template with name already exists")
      );

      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={null}
        />
      );

      fireEvent.change(screen.getByLabelText("Template Name"), {
        target: { value: "Name" },
      });
      fireEvent.change(screen.getByLabelText("Content"), {
        target: { value: "Content" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Template" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Template with name already exists"
        );
      });
    });

    it("should not call onSuccess when mutation fails", async () => {
      mockCreateTemplate.mockRejectedValue(new Error("Failed"));

      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={null}
        />
      );

      fireEvent.change(screen.getByLabelText("Template Name"), {
        target: { value: "Name" },
      });
      fireEvent.change(screen.getByLabelText("Content"), {
        target: { value: "Content" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Template" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
        expect(mockOnSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe("Dialog Interaction", () => {
    it("should not render when isOpen is false", () => {
      render(
        <TemplateFormModal
          isOpen={false}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={null}
        />
      );

      expect(screen.queryByText("Create Template")).not.toBeInTheDocument();
    });

    it("should call onClose when cancel button is clicked", () => {
      render(
        <TemplateFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          template={null}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});
