import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateFormModal } from "../TemplateFormModal";
import { useMutation } from "convex/react";
import { Doc, Id } from "@/convex/_generated/dataModel";

// Mock Convex hooks
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

const mockOnClose = jest.fn();
const mockOnSuccess = jest.fn();

const mockTemplate: Doc<"templates"> = {
  _id: "1" as Id<"templates">,
  _creationTime: Date.now(),
  userId: "user1",
  name: "Existing Template",
  content: "Existing content",
  tags: ["existing", "tags"],
  usageCount: 5,
};

describe("TemplateFormModal - Tag Input", () => {
  const mockCreateTemplate = jest.fn();
  const mockUpdateTemplate = jest.fn();

  beforeEach(() => {
    // useMutation is called twice in TemplateFormModal (create and update)
    // Return mockCreateTemplate first, then mockUpdateTemplate
    (useMutation as jest.Mock)
      .mockReturnValueOnce(mockCreateTemplate)
      .mockReturnValueOnce(mockUpdateTemplate);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should add tag when Enter key is pressed", async () => {
    render(
      <TemplateFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        template={null}
      />
    );

    const tagInput = screen.getByPlaceholderText("Type a tag and press Enter or comma");
    await userEvent.type(tagInput, "newtag{Enter}");

    // Tag chip should appear
    await waitFor(() => {
      expect(screen.getByText("newtag")).toBeInTheDocument();
    });

    // Input should be cleared
    expect(tagInput).toHaveValue("");
  });

  it("should add tag when comma is pressed", async () => {
    render(
      <TemplateFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        template={null}
      />
    );

    const tagInput = screen.getByPlaceholderText("Type a tag and press Enter or comma");
    await userEvent.type(tagInput, "tag1,");

    await waitFor(() => {
      expect(screen.getByText("tag1")).toBeInTheDocument();
    });

    expect(tagInput).toHaveValue("");
  });

  it("should remove tag when X button is clicked", async () => {
    render(
      <TemplateFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        template={null}
      />
    );

    const tagInput = screen.getByPlaceholderText("Type a tag and press Enter or comma");
    await userEvent.type(tagInput, "removeme{Enter}");

    // Tag should appear
    await waitFor(() => {
      expect(screen.getByText("removeme")).toBeInTheDocument();
    });

    // Click remove button
    const removeButton = screen.getByLabelText("Remove removeme tag");
    await userEvent.click(removeButton);

    // Tag should be removed
    await waitFor(() => {
      expect(screen.queryByText("removeme")).not.toBeInTheDocument();
    });
  });

  it("should prevent duplicate tags (case-insensitive)", async () => {
    const { toast } = await import("sonner");

    render(
      <TemplateFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        template={null}
      />
    );

    const tagInput = screen.getByPlaceholderText("Type a tag and press Enter or comma");

    // Add first tag
    await userEvent.type(tagInput, "duplicate{Enter}");
    expect(screen.getByText("duplicate")).toBeInTheDocument();

    // Try to add same tag (different case)
    await userEvent.type(tagInput, "DUPLICATE{Enter}");

    // Should show error toast
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Tag already exists");
    });

    // Should only have one tag chip
    const tagChips = screen.getAllByText("duplicate");
    expect(tagChips).toHaveLength(1);
  });

  it("should trim whitespace from tags", async () => {
    render(
      <TemplateFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        template={null}
      />
    );

    const tagInput = screen.getByPlaceholderText("Type a tag and press Enter or comma");
    await userEvent.type(tagInput, "  trimmed  {Enter}");

    await waitFor(() => {
      expect(screen.getByText("trimmed")).toBeInTheDocument();
    });
  });

  it("should not add empty tags", async () => {
    render(
      <TemplateFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        template={null}
      />
    );

    const tagInput = screen.getByPlaceholderText("Type a tag and press Enter or comma");

    // Try to add empty tag
    await userEvent.type(tagInput, "{Enter}");

    // Should not create any tag chips
    const badges = screen.queryAllByRole("button", { name: /Remove .* tag/ });
    expect(badges).toHaveLength(0);

    // Try with whitespace only
    await userEvent.type(tagInput, "   {Enter}");

    const badgesAfter = screen.queryAllByRole("button", { name: /Remove .* tag/ });
    expect(badgesAfter).toHaveLength(0);
  });

  it("should display existing tags in edit mode", async () => {
    render(
      <TemplateFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        template={mockTemplate}
      />
    );

    // Should display existing tags as chips
    await waitFor(() => {
      expect(screen.getByText("existing")).toBeInTheDocument();
      expect(screen.getByText("tags")).toBeInTheDocument();
    });
  });

  it("should display tags as chips in real-time", async () => {
    render(
      <TemplateFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        template={null}
      />
    );

    const tagInput = screen.getByPlaceholderText("Type a tag and press Enter or comma");

    // Add first tag
    await userEvent.type(tagInput, "tag1{Enter}");
    await waitFor(() => {
      expect(screen.getByText("tag1")).toBeInTheDocument();
    });

    // Add second tag
    await userEvent.type(tagInput, "tag2{Enter}");
    await waitFor(() => {
      expect(screen.getByText("tag2")).toBeInTheDocument();
    });

    // Both tags should be visible
    expect(screen.getByText("tag1")).toBeInTheDocument();
    expect(screen.getByText("tag2")).toBeInTheDocument();
  });

  it("should submit tags array in create mode", async () => {
    mockCreateTemplate.mockResolvedValue(undefined);

    render(
      <TemplateFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        template={null}
      />
    );

    // Fill form
    const nameInput = screen.getByLabelText("Template Name");
    const contentInput = screen.getByLabelText("Content");
    const tagInput = screen.getByPlaceholderText("Type a tag and press Enter or comma");

    await userEvent.type(nameInput, "New Template");
    await userEvent.type(contentInput, "New content");
    await userEvent.type(tagInput, "tag1{Enter}");
    await userEvent.type(tagInput, "tag2{Enter}");

    // Submit form
    const submitButton = screen.getByRole("button", { name: /create template/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTemplate).toHaveBeenCalledWith({
        name: "New Template",
        content: "New content",
        tags: ["tag1", "tag2"],
      });
    });
  });

  it("should add pending tag input on form submit", async () => {
    mockCreateTemplate.mockResolvedValue(undefined);

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
    const tagInput = screen.getByPlaceholderText("Type a tag and press Enter or comma");

    await userEvent.type(nameInput, "Template");
    await userEvent.type(contentInput, "Content");

    // Type tag but don't press Enter - leave it pending
    await userEvent.type(tagInput, "pending");

    // Submit form
    const submitButton = screen.getByRole("button", { name: /create template/i });
    await userEvent.click(submitButton);

    // Should include the pending tag
    await waitFor(() => {
      expect(mockCreateTemplate).toHaveBeenCalledWith({
        name: "Template",
        content: "Content",
        tags: ["pending"],
      });
    });
  });
});
