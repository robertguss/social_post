/**
 * Unit Tests for TemplateLibrary Component
 *
 * Tests the TemplateLibrary component's rendering, state management, and CRUD operations.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TemplateLibrary } from "@/components/features/TemplateLibrary";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";

// Mock Convex API
jest.mock("@/convex/_generated/api", () => ({
  api: {
    templates: {
      getTemplates: "mockGetTemplates",
      deleteTemplate: "mockDeleteTemplate",
    },
  },
}));

// Mock Convex React hooks
jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock TemplateCard component
jest.mock("@/components/features/TemplateCard", () => ({
  TemplateCard: ({
    template,
    onEdit,
    onDelete,
  }: {
    template: any;
    onEdit: any;
    onDelete: any;
  }) => (
    <div data-testid={`template-card-${template._id}`}>
      <h3>{template.name}</h3>
      <button onClick={() => onEdit(template)}>Edit</button>
      <button onClick={() => onDelete(template)}>Delete</button>
    </div>
  ),
}));

// Mock TemplateFormModal component
jest.mock("@/components/features/TemplateFormModal", () => ({
  TemplateFormModal: ({
    isOpen,
    onClose,
    onSuccess,
    template,
  }: {
    isOpen: boolean;
    onClose: any;
    onSuccess: any;
    template: any;
  }) =>
    isOpen ? (
      <div data-testid="template-form-modal">
        <h2>{template ? "Edit Template" : "Create Template"}</h2>
        <button onClick={onSuccess}>Submit</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}));

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

describe("TemplateLibrary Component", () => {
  const mockDeleteTemplate = jest.fn();

  const mockTemplates = [
    {
      _id: "template1" as any,
      _creationTime: 1698768000000,
      clerkUserId: "user123",
      name: "Launch Announcement",
      content: "Template for launch announcements",
      tags: ["launch", "announcement"],
      usageCount: 5,
      lastUsedAt: 1698768000000,
    },
    {
      _id: "template2" as any,
      _creationTime: 1698854400000,
      clerkUserId: "user123",
      name: "Weekly Update",
      content: "Template for weekly updates",
      tags: ["weekly", "update"],
      usageCount: 10,
      lastUsedAt: 1698854400000,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMutation.mockReturnValue(mockDeleteTemplate);
  });

  describe("Loading State", () => {
    it("should render loading state when templates are undefined", () => {
      mockUseQuery.mockReturnValue(undefined);

      render(<TemplateLibrary />);

      expect(screen.getByText("Loading templates...")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should render empty state when no templates exist", () => {
      mockUseQuery.mockReturnValue([]);

      render(<TemplateLibrary />);

      expect(screen.getByText("No templates yet")).toBeInTheDocument();
      expect(
        screen.getByText("Create your first template to get started")
      ).toBeInTheDocument();
    });

    it("should display create template button in empty state", () => {
      mockUseQuery.mockReturnValue([]);

      render(<TemplateLibrary />);

      const createButtons = screen.getAllByRole("button", {
        name: /create template/i,
      });
      expect(createButtons.length).toBeGreaterThan(0);
    });

    it("should open create modal when clicking create button in empty state", () => {
      mockUseQuery.mockReturnValue([]);

      render(<TemplateLibrary />);

      const createButton = screen.getAllByRole("button", {
        name: /create template/i,
      })[0];
      fireEvent.click(createButton);

      expect(screen.getByTestId("template-form-modal")).toBeInTheDocument();
      expect(screen.getByText("Create Template")).toBeInTheDocument();
    });
  });

  describe("Template List Rendering", () => {
    it("should render all templates in a grid", () => {
      mockUseQuery.mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      expect(screen.getByTestId("template-card-template1")).toBeInTheDocument();
      expect(screen.getByTestId("template-card-template2")).toBeInTheDocument();
    });

    it("should display header with title and description", () => {
      mockUseQuery.mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      expect(screen.getByText("Templates")).toBeInTheDocument();
      expect(
        screen.getByText("Manage your reusable content templates")
      ).toBeInTheDocument();
    });

    it("should display create template button in header", () => {
      mockUseQuery.mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      const headerButton = screen.getByRole("button", {
        name: /create template/i,
      });
      expect(headerButton).toBeInTheDocument();
    });
  });

  describe("Create Template", () => {
    it("should open create modal when clicking create button", () => {
      mockUseQuery.mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      const createButton = screen.getByRole("button", {
        name: /create template/i,
      });
      fireEvent.click(createButton);

      expect(screen.getByTestId("template-form-modal")).toBeInTheDocument();
      expect(screen.getByText("Create Template")).toBeInTheDocument();
    });

    it("should close create modal after successful submission", () => {
      mockUseQuery.mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      // Open modal
      const createButton = screen.getByRole("button", {
        name: /create template/i,
      });
      fireEvent.click(createButton);

      // Submit form
      const submitButton = screen.getByRole("button", { name: "Submit" });
      fireEvent.click(submitButton);

      // Modal should be closed
      expect(
        screen.queryByTestId("template-form-modal")
      ).not.toBeInTheDocument();
    });
  });

  describe("Edit Template", () => {
    it("should open edit modal when clicking edit on a template card", () => {
      mockUseQuery.mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      // Click edit on first template
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      fireEvent.click(editButtons[0]);

      expect(screen.getByTestId("template-form-modal")).toBeInTheDocument();
      expect(screen.getByText("Edit Template")).toBeInTheDocument();
    });

    it("should close edit modal after successful submission", () => {
      mockUseQuery.mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      // Open edit modal
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      fireEvent.click(editButtons[0]);

      // Submit form
      const submitButton = screen.getByRole("button", { name: "Submit" });
      fireEvent.click(submitButton);

      // Modal should be closed
      expect(
        screen.queryByTestId("template-form-modal")
      ).not.toBeInTheDocument();
    });
  });

  describe("Delete Template", () => {
    it("should open delete confirmation dialog when clicking delete", () => {
      mockUseQuery.mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      // Click delete on first template
      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText("Delete Template")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Are you sure you want to delete this template? This action cannot be undone."
        )
      ).toBeInTheDocument();
    });

    it("should close delete dialog when clicking cancel", () => {
      mockUseQuery.mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      // Open delete dialog
      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
      fireEvent.click(deleteButtons[0]);

      // Click cancel
      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelButton);

      expect(screen.queryByText("Delete Template")).not.toBeInTheDocument();
    });

    it("should call deleteTemplate mutation when confirming delete", async () => {
      mockUseQuery.mockReturnValue(mockTemplates);
      mockDeleteTemplate.mockResolvedValue(true);

      render(<TemplateLibrary />);

      // Open delete dialog
      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
      fireEvent.click(deleteButtons[0]);

      // Confirm delete
      const confirmButton = screen.getByRole("button", { name: /^Delete$/ });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteTemplate).toHaveBeenCalledWith({
          templateId: mockTemplates[0]._id,
        });
      });
    });

    it("should show success toast after successful delete", async () => {
      mockUseQuery.mockReturnValue(mockTemplates);
      mockDeleteTemplate.mockResolvedValue(true);

      render(<TemplateLibrary />);

      // Open delete dialog
      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
      fireEvent.click(deleteButtons[0]);

      // Confirm delete
      const confirmButton = screen.getByRole("button", { name: /^Delete$/ });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Template deleted successfully");
      });
    });

    it("should show error toast when delete fails", async () => {
      mockUseQuery.mockReturnValue(mockTemplates);
      mockDeleteTemplate.mockRejectedValue(new Error("Failed to delete"));

      render(<TemplateLibrary />);

      // Open delete dialog
      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
      fireEvent.click(deleteButtons[0]);

      // Confirm delete
      const confirmButton = screen.getByRole("button", { name: /^Delete$/ });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to delete");
      });
    });

    it("should close delete dialog after successful delete", async () => {
      mockUseQuery.mockReturnValue(mockTemplates);
      mockDeleteTemplate.mockResolvedValue(true);

      render(<TemplateLibrary />);

      // Open delete dialog
      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
      fireEvent.click(deleteButtons[0]);

      // Confirm delete
      const confirmButton = screen.getByRole("button", { name: /^Delete$/ });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText("Delete Template")).not.toBeInTheDocument();
      });
    });

    it("should disable buttons during delete operation", async () => {
      mockUseQuery.mockReturnValue(mockTemplates);
      mockDeleteTemplate.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(true), 100))
      );

      render(<TemplateLibrary />);

      // Open delete dialog
      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
      fireEvent.click(deleteButtons[0]);

      // Confirm delete
      const confirmButton = screen.getByRole("button", { name: /^Delete$/ });
      fireEvent.click(confirmButton);

      // Buttons should be disabled during operation
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Deleting..." })).toBeDisabled();

      await waitFor(() => {
        expect(mockDeleteTemplate).toHaveBeenCalled();
      });
    });
  });

  describe("Multiple Templates", () => {
    it("should render correct number of template cards", () => {
      mockUseQuery.mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      expect(screen.getByText("Launch Announcement")).toBeInTheDocument();
      expect(screen.getByText("Weekly Update")).toBeInTheDocument();
    });

    it("should handle individual template operations independently", () => {
      mockUseQuery.mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      // Edit first template
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      fireEvent.click(editButtons[0]);

      expect(screen.getByTestId("template-form-modal")).toBeInTheDocument();

      // Close modal
      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelButton);

      // Delete second template
      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
      fireEvent.click(deleteButtons[1]);

      expect(screen.getByText("Delete Template")).toBeInTheDocument();
    });
  });
});
