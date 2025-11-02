import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateLibrary } from "../TemplateLibrary";
import { useQuery, useMutation } from "convex/react";

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

const mockTemplates = [
  {
    _id: "1" as any,
    _creationTime: Date.now(),
    clerkUserId: "user1",
    name: "Launch Announcement",
    content: "We're excited to launch our new feature! #hashtags #buildinpublic",
    tags: ["hashtags", "buildinpublic"],
    usageCount: 5,
  },
  {
    _id: "2" as any,
    _creationTime: Date.now(),
    clerkUserId: "user1",
    name: "Weekly Update",
    content: "Here's what we shipped this week at our startup",
    tags: ["updates", "twitter"],
    usageCount: 3,
  },
  {
    _id: "3" as any,
    _creationTime: Date.now(),
    clerkUserId: "user1",
    name: "Twitter Closing",
    content: "Thanks for reading! What do you think? #hashtags",
    tags: ["closing", "hashtags", "twitter"],
    usageCount: 10,
  },
  {
    _id: "4" as any,
    _creationTime: Date.now(),
    clerkUserId: "user1",
    name: "LinkedIn Post",
    content: "Professional insight about building products",
    tags: ["linkedin"],
    usageCount: 2,
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
        expect(screen.getByText("Weekly Update")).toBeInTheDocument();
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
        expect(screen.getByText("Launch Announcement")).toBeInTheDocument();
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
      expect(screen.getByText("Clear filters")).toBeInTheDocument();
    });
  });
});
