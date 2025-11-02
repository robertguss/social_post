import { render, screen } from "@testing-library/react";
import { TemplateCard } from "../TemplateCard";
import { Doc } from "@/convex/_generated/dataModel";

const mockTemplate: Doc<"templates"> = {
  _id: "1" as any,
  _creationTime: Date.now(),
  clerkUserId: "user1",
  name: "Test Template",
  content: "This is test content with hashtags",
  tags: ["test", "example"],
  usageCount: 5,
};

describe("TemplateCard - Search Highlighting", () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should render template without highlighting when no searchQuery", () => {
    render(
      <TemplateCard
        template={mockTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Template name should be visible
    expect(screen.getByText("Test Template")).toBeInTheDocument();

    // Should NOT have mark tags when no search query
    const cardHeader = screen.getByText("Test Template").closest("div");
    expect(cardHeader?.innerHTML).not.toContain("<mark");
  });

  it("should highlight matching text in template name (case-insensitive)", () => {
    const { container } = render(
      <TemplateCard
        template={mockTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        searchQuery="template"
      />
    );

    // Find the title element by its data-slot attribute
    const titleElement = container.querySelector('[data-slot="card-title"]');
    expect(titleElement?.innerHTML).toContain("<mark");
    expect(titleElement?.innerHTML).toContain("Template");
  });

  it("should highlight matching text in content (case-insensitive)", () => {
    const { container } = render(
      <TemplateCard
        template={mockTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        searchQuery="hashtags"
      />
    );

    // Content contains "hashtags"
    const contentElement = container.querySelector('[data-slot="card-content"] p');
    expect(contentElement?.innerHTML).toContain("<mark");
    expect(contentElement?.innerHTML).toContain("hashtags");
  });

  it("should preserve original case when highlighting", () => {
    const template: Doc<"templates"> = {
      ...mockTemplate,
      name: "IMPORTANT Announcement",
    };

    const { container } = render(
      <TemplateCard
        template={template}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        searchQuery="important"
      />
    );

    const titleElement = container.querySelector('[data-slot="card-title"]');
    // Should preserve "IMPORTANT" (uppercase) even though search was lowercase
    expect(titleElement?.innerHTML).toContain("IMPORTANT");
  });

  it("should highlight multiple matches", () => {
    const template: Doc<"templates"> = {
      ...mockTemplate,
      content: "test test test",
    };

    const { container } = render(
      <TemplateCard
        template={template}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        searchQuery="test"
      />
    );

    const contentElement = container.querySelector('[data-slot="card-content"] p');
    // Should have multiple mark tags
    const markCount = (contentElement?.innerHTML.match(/<mark/g) || []).length;
    expect(markCount).toBeGreaterThan(1);
  });

  it("should escape special regex characters in search query", () => {
    const template: Doc<"templates"> = {
      ...mockTemplate,
      content: "Price: $100 (special offer)",
    };

    // Test with special characters that would break regex if not escaped
    const { container } = render(
      <TemplateCard
        template={template}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        searchQuery="$100"
      />
    );

    const contentElement = container.querySelector('[data-slot="card-content"] p');
    expect(contentElement?.innerHTML).toContain("<mark");
    expect(contentElement?.innerHTML).toContain("$100");
  });

  it("should not highlight when searchQuery is empty string", () => {
    const { container } = render(
      <TemplateCard
        template={mockTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        searchQuery=""
      />
    );

    const titleElement = container.querySelector('[data-slot="card-title"]');
    expect(titleElement?.innerHTML).not.toContain("<mark");
  });

  it("should not highlight when searchQuery is only whitespace", () => {
    const { container } = render(
      <TemplateCard
        template={mockTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        searchQuery="   "
      />
    );

    const titleElement = container.querySelector('[data-slot="card-title"]');
    expect(titleElement?.innerHTML).not.toContain("<mark");
  });

  it("should use correct highlight styling classes", () => {
    const { container } = render(
      <TemplateCard
        template={mockTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        searchQuery="test"
      />
    );

    const titleElement = container.querySelector('[data-slot="card-title"]');
    // Should have bg-yellow-200 for light mode and dark:bg-yellow-900 for dark mode
    expect(titleElement?.innerHTML).toContain("bg-yellow-200");
    expect(titleElement?.innerHTML).toContain("dark:bg-yellow-900");
  });
});
