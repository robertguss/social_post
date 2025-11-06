import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateLibrary } from "../TemplateLibrary";
import { useQuery, useMutation } from "convex/react";
import { Doc } from "@/convex/_generated/dataModel";

// Mock Convex hooks
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

// Mock shadcn/ui Select component
let mockOnValueChange: ((value: string) => void) | null = null;

jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange: (value: string) => void;
  }) => {
    mockOnValueChange = onValueChange;
    return <div data-testid="select-wrapper">{children}</div>;
  },
  SelectTrigger: ({ children, ...props }: { children: React.ReactNode }) => (
    <button {...props} role="combobox" aria-controls="select-content" aria-expanded="false">
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div
      role="option"
      aria-selected="false"
      data-value={value}
      onClick={() => mockOnValueChange && mockOnValueChange(value)}
    >
      {children}
    </div>
  ),
}));

const baseTime = Date.now();

const mockTemplates = [
  {
    _id: "1" as unknown as Doc<"templates">["_id"],
    _creationTime: baseTime - 3 * 24 * 60 * 60 * 1000, // 3 days ago
    userId: "user1",
    name: "Launch Announcement",
    content: "We're excited to launch our new feature! #hashtags #buildinpublic",
    tags: ["hashtags", "buildinpublic"],
    usageCount: 5,
    lastUsedAt: baseTime - 1 * 24 * 60 * 60 * 1000, // 1 day ago
  },
  {
    _id: "2" as unknown as Doc<"templates">["_id"],
    _creationTime: baseTime - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    userId: "user1",
    name: "Weekly Update",
    content: "Here's what we shipped this week at our startup",
    tags: ["updates", "twitter"],
    usageCount: 3,
    lastUsedAt: baseTime - 5 * 60 * 60 * 1000, // 5 hours ago
  },
  {
    _id: "3" as unknown as Doc<"templates">["_id"],
    _creationTime: baseTime - 1 * 24 * 60 * 60 * 1000, // 1 day ago
    userId: "user1",
    name: "Twitter Closing",
    content: "Thanks for reading! What do you think? #hashtags",
    tags: ["closing", "hashtags", "twitter"],
    usageCount: 10,
    lastUsedAt: baseTime - 2 * 60 * 60 * 1000, // 2 hours ago (most recent)
  },
  {
    _id: "4" as unknown as Doc<"templates">["_id"],
    _creationTime: baseTime - 4 * 24 * 60 * 60 * 1000, // 4 days ago (oldest)
    userId: "user1",
    name: "LinkedIn Post",
    content: "Professional insight about building products",
    tags: ["linkedin"],
    usageCount: 2,
    lastUsedAt: undefined, // Never used
  },
];

describe("TemplateLibrary - Search and Filter", () => {
  beforeEach(() => {
    (useMutation as jest.Mock).mockReturnValue(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Search Filtering", () => {
    it("should filter templates by name (case-insensitive)", async () => {
      (useQuery as jest.Mock).mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      const searchInput = screen.getByPlaceholderText("Search templates...");
      await userEvent.type(searchInput, "weekly");

      // Should show only "Weekly Update" template
      await waitFor(() => {
        const templateName = screen.getByText((content, element) => {
          return element?.textContent === "Weekly Update" || false;
        });
        expect(templateName).toBeInTheDocument();
        expect(screen.queryByText("Launch Announcement")).not.toBeInTheDocument();
        expect(screen.queryByText("Twitter Closing")).not.toBeInTheDocument();
        expect(screen.queryByText("LinkedIn Post")).not.toBeInTheDocument();
      });

      // Should show results count
      expect(screen.getByText("Showing 1 of 4 templates")).toBeInTheDocument();
    });

    it("should filter templates by content (case-insensitive)", async () => {
      (useQuery as jest.Mock).mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      const searchInput = screen.getByPlaceholderText("Search templates...");
      await userEvent.type(searchInput, "startup");

      // Should show "Weekly Update" which contains "startup" in content
      await waitFor(() => {
        expect(screen.getByText("Weekly Update")).toBeInTheDocument();
        expect(screen.queryByText("Launch Announcement")).not.toBeInTheDocument();
      });
    });

    it("should show empty state when search returns no results", async () => {
      (useQuery as jest.Mock).mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      const searchInput = screen.getByPlaceholderText("Search templates...");
      await userEvent.type(searchInput, "nonexistent");

      await waitFor(() => {
        expect(screen.getByText("No templates found")).toBeInTheDocument();
        expect(
          screen.getByText(/No templates match your search for "nonexistent"/i)
        ).toBeInTheDocument();
      });

      // Should show clear search button
      expect(screen.getByText("Clear search")).toBeInTheDocument();
    });

    it("should clear search when clear button clicked", async () => {
      (useQuery as jest.Mock).mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      const searchInput = screen.getByPlaceholderText("Search templates...");
      await userEvent.type(searchInput, "test");

      // Click the X button
      const clearButton = screen.getByLabelText("Clear search");
      await userEvent.click(clearButton);

      // Search input should be cleared
      expect(searchInput).toHaveValue("");

      // All templates should be visible again
      await waitFor(() => {
        expect(screen.getByText("Launch Announcement")).toBeInTheDocument();
        expect(screen.getByText("Weekly Update")).toBeInTheDocument();
        expect(screen.getByText("Twitter Closing")).toBeInTheDocument();
        expect(screen.getByText("LinkedIn Post")).toBeInTheDocument();
      });
    });
  });

  describe("Tag Filtering", () => {
    it("should display all unique tags", () => {
      (useQuery as jest.Mock).mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      // Should show all unique tags sorted alphabetically
      expect(screen.getByText("#buildinpublic")).toBeInTheDocument();
      expect(screen.getByText("#closing")).toBeInTheDocument();
      expect(screen.getByText("#hashtags")).toBeInTheDocument();
      expect(screen.getByText("#linkedin")).toBeInTheDocument();
      expect(screen.getByText("#twitter")).toBeInTheDocument();
      expect(screen.getByText("#updates")).toBeInTheDocument();
    });

    it("should filter templates by single tag", async () => {
      (useQuery as jest.Mock).mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      // Click on "linkedin" tag
      const linkedinTag = screen.getByText("#linkedin");
      await userEvent.click(linkedinTag);

      // Should show only LinkedIn Post
      await waitFor(() => {
        expect(screen.getByText("LinkedIn Post")).toBeInTheDocument();
        expect(screen.queryByText("Launch Announcement")).not.toBeInTheDocument();
        expect(screen.queryByText("Weekly Update")).not.toBeInTheDocument();
        expect(screen.queryByText("Twitter Closing")).not.toBeInTheDocument();
      });

      // Should show selected count
      expect(screen.getByText("1 tag selected")).toBeInTheDocument();
    });

    it("should filter templates with multiple tags (AND logic)", async () => {
      (useQuery as jest.Mock).mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      // Click on "hashtags" and "twitter" tags
      const hashtagsTag = screen.getByText("#hashtags");
      const twitterTag = screen.getByText("#twitter");

      await userEvent.click(hashtagsTag);
      await userEvent.click(twitterTag);

      // Should show only "Twitter Closing" which has BOTH tags
      await waitFor(() => {
        expect(screen.getByText("Twitter Closing")).toBeInTheDocument();
        expect(screen.queryByText("Launch Announcement")).not.toBeInTheDocument(); // has hashtags but not twitter
        expect(screen.queryByText("Weekly Update")).not.toBeInTheDocument();
      });

      // Should show selected count
      expect(screen.getByText("2 tags selected")).toBeInTheDocument();
    });

    it("should deselect tag when clicked again", async () => {
      (useQuery as jest.Mock).mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      const linkedinTag = screen.getByText("#linkedin");

      // Select tag
      await userEvent.click(linkedinTag);
      expect(screen.getByText("1 tag selected")).toBeInTheDocument();

      // Deselect tag
      await userEvent.click(linkedinTag);

      // All templates should be visible
      await waitFor(() => {
        expect(screen.getByText("Launch Announcement")).toBeInTheDocument();
        expect(screen.getByText("Weekly Update")).toBeInTheDocument();
        expect(screen.getByText("Twitter Closing")).toBeInTheDocument();
        expect(screen.getByText("LinkedIn Post")).toBeInTheDocument();
      });
    });

    it("should clear all tag filters when clear filters clicked", async () => {
      (useQuery as jest.Mock).mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      // Select multiple tags
      await userEvent.click(screen.getByText("#hashtags"));
      await userEvent.click(screen.getByText("#twitter"));

      expect(screen.getByText("2 tags selected")).toBeInTheDocument();

      // Click clear filters
      const clearButton = screen.getByText("Clear filters");
      await userEvent.click(clearButton);

      // All templates should be visible
      await waitFor(() => {
        expect(screen.getByText("Launch Announcement")).toBeInTheDocument();
        expect(screen.getByText("Weekly Update")).toBeInTheDocument();
        expect(screen.getByText("Twitter Closing")).toBeInTheDocument();
        expect(screen.getByText("LinkedIn Post")).toBeInTheDocument();
      });
    });

    it("should show empty state when tag filter returns no results", async () => {
      (useQuery as jest.Mock).mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      // Select tags that no template has together
      await userEvent.click(screen.getByText("#linkedin"));
      await userEvent.click(screen.getByText("#buildinpublic"));

      await waitFor(() => {
        expect(screen.getByText("No templates found")).toBeInTheDocument();
        expect(screen.getByText("No templates with selected tags")).toBeInTheDocument();
      });
    });
  });

  describe("Combined Search and Tag Filtering", () => {
    it("should apply both search and tag filters (AND logic)", async () => {
      (useQuery as jest.Mock).mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      // Select hashtags tag (should show Launch Announcement and Twitter Closing)
      await userEvent.click(screen.getByText("#hashtags"));

      // Then search for "launch"
      const searchInput = screen.getByPlaceholderText("Search templates...");
      await userEvent.type(searchInput, "launch");

      // Should show only Launch Announcement (has hashtags AND contains "launch")
      await waitFor(() => {
        const templateName = screen.getByText((content, element) => {
          return element?.textContent === "Launch Announcement" || false;
        });
        expect(templateName).toBeInTheDocument();
        expect(screen.queryByText("Twitter Closing")).not.toBeInTheDocument();
      });

      // Should show combined filter status
      expect(
        screen.getByText(/1 result.* for "launch" with tags: hashtags/i)
      ).toBeInTheDocument();
    });

    it("should show appropriate empty state for combined filters", async () => {
      (useQuery as jest.Mock).mockReturnValue(mockTemplates);

      render(<TemplateLibrary />);

      // Select tag and search for non-matching term
      await userEvent.click(screen.getByText("#linkedin"));

      const searchInput = screen.getByPlaceholderText("Search templates...");
      await userEvent.type(searchInput, "hashtags");

      await waitFor(() => {
        expect(screen.getByText("No templates found")).toBeInTheDocument();
        expect(
          screen.getByText(/No results for "hashtags" with tags: linkedin/i)
        ).toBeInTheDocument();
      });

      // Should show both clear buttons
      expect(screen.getByText("Clear search")).toBeInTheDocument();
      const clearFiltersButtons = screen.getAllByText("Clear filters");
      expect(clearFiltersButtons.length).toBeGreaterThan(0);
    });
  });
});

describe("TemplateLibrary - Sorting", () => {
  beforeEach(() => {
    (useMutation as jest.Mock).mockReturnValue(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should default to Most Used sort", () => {
    (useQuery as jest.Mock).mockReturnValue(mockTemplates);

    render(<TemplateLibrary />);

    // Templates should be sorted by usageCount descending
    // Order: Twitter Closing (10), Launch Announcement (5), Weekly Update (3), LinkedIn Post (2)
    const templateCards = screen.getAllByText(/^(Launch Announcement|Weekly Update|Twitter Closing|LinkedIn Post)$/);

    expect(templateCards[0]).toHaveTextContent("Twitter Closing"); // usageCount: 10
    expect(templateCards[1]).toHaveTextContent("Launch Announcement"); // usageCount: 5
    expect(templateCards[2]).toHaveTextContent("Weekly Update"); // usageCount: 3
    expect(templateCards[3]).toHaveTextContent("LinkedIn Post"); // usageCount: 2
  });

  it("should sort by Recently Used when selected", async () => {
    (useQuery as jest.Mock).mockReturnValue(mockTemplates);

    render(<TemplateLibrary />);

    // Open sort dropdown and select "Recently Used"
    const sortTrigger = screen.getByRole("combobox", { name: /sort templates by/i });
    await userEvent.click(sortTrigger);

    const recentlyUsedOption = screen.getByRole("option", { name: /recently used/i });
    await userEvent.click(recentlyUsedOption);

    // Templates should be sorted by lastUsedAt descending
    // Order: Twitter Closing (2h ago), Weekly Update (5h ago), Launch Announcement (1d ago), LinkedIn Post (undefined)
    await waitFor(() => {
      const templateCards = screen.getAllByText(/^(Launch Announcement|Weekly Update|Twitter Closing|LinkedIn Post)$/);

      expect(templateCards[0]).toHaveTextContent("Twitter Closing"); // 2 hours ago
      expect(templateCards[1]).toHaveTextContent("Weekly Update"); // 5 hours ago
      expect(templateCards[2]).toHaveTextContent("Launch Announcement"); // 1 day ago
      expect(templateCards[3]).toHaveTextContent("LinkedIn Post"); // Never used (undefined)
    });
  });

  it("should sort by Name (A-Z) when selected", async () => {
    (useQuery as jest.Mock).mockReturnValue(mockTemplates);

    render(<TemplateLibrary />);

    // Open sort dropdown and select "Name (A-Z)"
    const sortTrigger = screen.getByRole("combobox", { name: /sort templates by/i });
    await userEvent.click(sortTrigger);

    const nameOption = screen.getByRole("option", { name: /name \(a-z\)/i });
    await userEvent.click(nameOption);

    // Templates should be sorted alphabetically
    // Order: Launch Announcement, LinkedIn Post, Twitter Closing, Weekly Update
    await waitFor(() => {
      const templateCards = screen.getAllByText(/^(Launch Announcement|Weekly Update|Twitter Closing|LinkedIn Post)$/);

      expect(templateCards[0]).toHaveTextContent("Launch Announcement");
      expect(templateCards[1]).toHaveTextContent("LinkedIn Post");
      expect(templateCards[2]).toHaveTextContent("Twitter Closing");
      expect(templateCards[3]).toHaveTextContent("Weekly Update");
    });
  });

  it("should sort by Date Created when selected", async () => {
    (useQuery as jest.Mock).mockReturnValue(mockTemplates);

    render(<TemplateLibrary />);

    // Open sort dropdown and select "Date Created"
    const sortTrigger = screen.getByRole("combobox", { name: /sort templates by/i });
    await userEvent.click(sortTrigger);

    const dateCreatedOption = screen.getByRole("option", { name: /date created/i });
    await userEvent.click(dateCreatedOption);

    // Templates should be sorted by _creationTime ascending (oldest first)
    // Order: LinkedIn Post (4d ago), Launch Announcement (3d ago), Weekly Update (2d ago), Twitter Closing (1d ago)
    await waitFor(() => {
      const templateCards = screen.getAllByText(/^(Launch Announcement|Weekly Update|Twitter Closing|LinkedIn Post)$/);

      expect(templateCards[0]).toHaveTextContent("LinkedIn Post"); // 4 days ago
      expect(templateCards[1]).toHaveTextContent("Launch Announcement"); // 3 days ago
      expect(templateCards[2]).toHaveTextContent("Weekly Update"); // 2 days ago
      expect(templateCards[3]).toHaveTextContent("Twitter Closing"); // 1 day ago
    });
  });

  it("should apply sorting after filtering by search", async () => {
    (useQuery as jest.Mock).mockReturnValue(mockTemplates);

    render(<TemplateLibrary />);

    // Search for templates containing "hashtags"
    const searchInput = screen.getByPlaceholderText("Search templates...");
    await userEvent.type(searchInput, "hashtags");

    // Should show Launch Announcement and Twitter Closing (both contain "hashtags")
    // Default sort is Most Used, so Twitter Closing (10) should be first
    await waitFor(() => {
      const templateCards = screen.getAllByText(/^(Launch Announcement|Twitter Closing)$/);

      expect(templateCards[0]).toHaveTextContent("Twitter Closing"); // usageCount: 10
      expect(templateCards[1]).toHaveTextContent("Launch Announcement"); // usageCount: 5
    });
  });

  it("should apply sorting after filtering by tags", async () => {
    (useQuery as jest.Mock).mockReturnValue(mockTemplates);

    render(<TemplateLibrary />);

    // Select "twitter" tag (Weekly Update and Twitter Closing have this tag)
    await userEvent.click(screen.getByText("#twitter"));

    // Default sort is Most Used, so Twitter Closing (10) should be first
    await waitFor(() => {
      const templateCards = screen.getAllByText(/^(Weekly Update|Twitter Closing)$/);

      expect(templateCards[0]).toHaveTextContent("Twitter Closing"); // usageCount: 10
      expect(templateCards[1]).toHaveTextContent("Weekly Update"); // usageCount: 3
    });
  });

  it("should maintain sort order when filters change", async () => {
    (useQuery as jest.Mock).mockReturnValue(mockTemplates);

    render(<TemplateLibrary />);

    // Change to Name (A-Z) sort
    const sortTrigger = screen.getByRole("combobox", { name: /sort templates by/i });
    await userEvent.click(sortTrigger);
    await userEvent.click(screen.getByRole("option", { name: /name \(a-z\)/i }));

    // Then apply a tag filter
    await userEvent.click(screen.getByText("#hashtags"));

    // Should still be sorted alphabetically (Launch Announcement, Twitter Closing)
    await waitFor(() => {
      const templateCards = screen.getAllByText(/^(Launch Announcement|Twitter Closing)$/);

      expect(templateCards[0]).toHaveTextContent("Launch Announcement");
      expect(templateCards[1]).toHaveTextContent("Twitter Closing");
    });
  });
});
