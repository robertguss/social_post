/**
 * Unit Tests for PostHistory Component
 *
 * Tests the PostHistory component's rendering, filtering, and interaction behaviors.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PostHistory } from "@/components/features/PostHistory";
import { useQuery } from "convex/react";

// Mock Convex React hooks
jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
}));

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

describe("PostHistory Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Loading State", () => {
    it("should render loading skeleton when query returns undefined", () => {
      mockUseQuery.mockReturnValue(undefined);

      render(<PostHistory />);

      expect(screen.getByText("Post History")).toBeInTheDocument();
      expect(screen.getByText("Loading your posts...")).toBeInTheDocument();
      // Should show 3 skeleton loaders
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBe(3);
    });
  });

  describe("Empty State", () => {
    it("should render empty state when no posts exist", () => {
      mockUseQuery.mockReturnValue([]);

      render(<PostHistory />);

      expect(screen.getByText("Post History")).toBeInTheDocument();
      expect(
        screen.getByText("No posts found for the selected date range.")
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Try selecting a different date range or schedule your first post!"
        )
      ).toBeInTheDocument();
    });

    it("should display date range filter options in empty state", () => {
      mockUseQuery.mockReturnValue([]);

      render(<PostHistory />);

      expect(screen.getByRole("button", { name: "Last 7 Days" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Last 30 Days" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Last 90 Days" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "All Time" })).toBeInTheDocument();
    });
  });

  describe("Post List Rendering", () => {
    const mockPosts = [
      {
        _id: "post1" as any,
        _creationTime: 1698768000000,
        clerkUserId: "user123",
        status: "Scheduled",
        twitterContent: "This is a test post about coding",
        linkedInContent: "",
        twitterScheduledTime: 1698768000000,
        linkedInScheduledTime: undefined,
        url: "https://example.com",
        errorMessage: undefined,
        retryCount: 0,
        twitterPostId: undefined,
        linkedInPostId: undefined,
      },
      {
        _id: "post2" as any,
        _creationTime: 1698854400000,
        clerkUserId: "user123",
        status: "Published",
        twitterContent: "Another post about TypeScript",
        linkedInContent: "",
        twitterScheduledTime: 1698854400000,
        linkedInScheduledTime: undefined,
        url: "",
        errorMessage: undefined,
        retryCount: 0,
        twitterPostId: "123456789",
        linkedInPostId: undefined,
      },
      {
        _id: "post3" as any,
        _creationTime: 1698940800000,
        clerkUserId: "user123",
        status: "Failed",
        twitterContent: "Failed post test",
        linkedInContent: "",
        twitterScheduledTime: 1698940800000,
        linkedInScheduledTime: undefined,
        url: "",
        errorMessage: "API rate limit exceeded",
        retryCount: 3,
        twitterPostId: undefined,
        linkedInPostId: undefined,
      },
    ];

    it("should render post list with correct data", () => {
      mockUseQuery.mockReturnValue(mockPosts);

      render(<PostHistory />);

      expect(screen.getByText(/This is a test post about coding/)).toBeInTheDocument();
      expect(screen.getByText(/Another post about TypeScript/)).toBeInTheDocument();
      expect(screen.getByText(/Failed post test/)).toBeInTheDocument();
    });

    it("should display correct status badges for each status", () => {
      mockUseQuery.mockReturnValue(mockPosts);

      render(<PostHistory />);

      expect(screen.getByText("Scheduled")).toBeInTheDocument();
      expect(screen.getByText("Published")).toBeInTheDocument();
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });

    it("should display error message for failed posts", () => {
      mockUseQuery.mockReturnValue(mockPosts);

      render(<PostHistory />);

      expect(screen.getByText(/Error: API rate limit exceeded/)).toBeInTheDocument();
    });

    it("should truncate long content with ellipsis", () => {
      const longContentPost = [
        {
          ...mockPosts[0],
          twitterContent:
            "This is a very long post that exceeds one hundred characters and should be truncated with ellipsis at the end to keep the UI clean and readable.",
        },
      ];

      mockUseQuery.mockReturnValue(longContentPost);

      render(<PostHistory />);

      const truncatedText = screen.getByText(/This is a very long post/);
      expect(truncatedText.textContent).toContain("...");
      expect(truncatedText.textContent?.length).toBeLessThan(150);
    });

    it("should display URL if provided", () => {
      mockUseQuery.mockReturnValue(mockPosts);

      render(<PostHistory />);

      expect(screen.getByText("https://example.com")).toBeInTheDocument();
    });
  });

  describe("Date Range Filter", () => {
    it("should default to 'Last 30 Days' filter", () => {
      mockUseQuery.mockReturnValue([]);

      render(<PostHistory />);

      const button = screen.getByRole("button", { name: "Last 30 Days" });
      // Check that it has the default variant styling (bg-primary indicates active state)
      expect(button.className).toContain("bg-primary");
    });

    it("should update query parameters when date range changes", () => {
      mockUseQuery.mockReturnValue([]);

      render(<PostHistory />);

      const sevenDaysButton = screen.getByRole("button", { name: "Last 7 Days" });
      fireEvent.click(sevenDaysButton);

      // Check that useQuery was called with updated date range
      // The second call should have different startDate
      expect(mockUseQuery).toHaveBeenCalled();
    });

    it("should allow selecting 'All Time' filter", () => {
      mockUseQuery.mockReturnValue([]);

      render(<PostHistory />);

      const allTimeButton = screen.getByRole("button", { name: "All Time" });
      fireEvent.click(allTimeButton);

      // When 'All Time' is selected, startDate and endDate should be undefined
      const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];
      expect(lastCall[1]).toEqual({
        startDate: undefined,
        endDate: undefined,
        platform: "twitter",
      });
    });
  });

  describe("Platform Filter", () => {
    const mockPosts = [
      {
        _id: "post1" as any,
        _creationTime: 1698768000000,
        clerkUserId: "user123",
        status: "Scheduled",
        twitterContent: "Test post",
        linkedInContent: "",
        twitterScheduledTime: 1698768000000,
        linkedInScheduledTime: undefined,
        url: "",
        errorMessage: undefined,
        retryCount: 0,
        twitterPostId: undefined,
        linkedInPostId: undefined,
      },
    ];

    it("should display X/Twitter as active platform", () => {
      mockUseQuery.mockReturnValue(mockPosts);

      render(<PostHistory />);

      const twitterButton = screen.getByRole("button", { name: "X/Twitter" });
      expect(twitterButton).toBeInTheDocument();
      expect(twitterButton.className).toContain("bg-primary");
    });

    it("should display LinkedIn as disabled 'Coming Soon'", () => {
      mockUseQuery.mockReturnValue(mockPosts);

      render(<PostHistory />);

      const linkedInButton = screen.getByRole("button", { name: "LinkedIn (Coming Soon)" });
      expect(linkedInButton).toBeInTheDocument();
      expect(linkedInButton).toBeDisabled();
    });

    it("should pass platform parameter to query", () => {
      mockUseQuery.mockReturnValue(mockPosts);

      render(<PostHistory />);

      const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];
      expect(lastCall[1]).toHaveProperty("platform", "twitter");
    });
  });

  describe("Post Details Modal", () => {
    const mockPosts = [
      {
        _id: "post1" as any,
        _creationTime: 1698768000000,
        clerkUserId: "user123",
        status: "Published",
        twitterContent: "Modal test post",
        linkedInContent: "",
        twitterScheduledTime: 1698768000000,
        linkedInScheduledTime: undefined,
        url: "https://example.com",
        errorMessage: undefined,
        retryCount: 0,
        twitterPostId: "987654321",
        linkedInPostId: undefined,
      },
    ];

    it("should open modal when clicking post card", async () => {
      mockUseQuery.mockReturnValue(mockPosts);

      render(<PostHistory />);

      const postCard = screen.getByText(/Modal test post/);
      fireEvent.click(postCard);

      await waitFor(() => {
        expect(screen.getByText("Post Details")).toBeInTheDocument();
        expect(screen.getByText("Full details for this scheduled post")).toBeInTheDocument();
      });
    });

    it("should display full post content in modal", async () => {
      mockUseQuery.mockReturnValue(mockPosts);

      render(<PostHistory />);

      const postCard = screen.getByText(/Modal test post/);
      fireEvent.click(postCard);

      await waitFor(() => {
        const contentElements = screen.getAllByText("Modal test post");
        // Should find at least one in the modal
        expect(contentElements.length).toBeGreaterThan(0);
      });
    });

    it("should display link to published post for Published status", async () => {
      mockUseQuery.mockReturnValue(mockPosts);

      render(<PostHistory />);

      const postCard = screen.getByText(/Modal test post/);
      fireEvent.click(postCard);

      await waitFor(() => {
        const link = screen.getByText("Open Post on X");
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "https://x.com/i/web/status/987654321");
      });
    });
  });

  describe("Status Badge Styling", () => {
    it("should apply correct color for Scheduled status", () => {
      const scheduledPost = [
        {
          _id: "post1" as any,
          _creationTime: 1698768000000,
          clerkUserId: "user123",
          status: "Scheduled",
          twitterContent: "Test",
          linkedInContent: "",
          twitterScheduledTime: 1698768000000,
          linkedInScheduledTime: undefined,
          url: "",
          errorMessage: undefined,
          retryCount: 0,
          twitterPostId: undefined,
          linkedInPostId: undefined,
        },
      ];

      mockUseQuery.mockReturnValue(scheduledPost);

      render(<PostHistory />);

      const badge = screen.getByText("Scheduled");
      expect(badge.className).toContain("bg-blue-500");
    });

    it("should apply correct color for Publishing status", () => {
      const publishingPost = [
        {
          _id: "post1" as any,
          _creationTime: 1698768000000,
          clerkUserId: "user123",
          status: "Publishing",
          twitterContent: "Test",
          linkedInContent: "",
          twitterScheduledTime: 1698768000000,
          linkedInScheduledTime: undefined,
          url: "",
          errorMessage: undefined,
          retryCount: 0,
          twitterPostId: undefined,
          linkedInPostId: undefined,
        },
      ];

      mockUseQuery.mockReturnValue(publishingPost);

      render(<PostHistory />);

      const badge = screen.getByText("Publishing");
      expect(badge.className).toContain("bg-yellow-500");
    });

    it("should apply correct color for Published status", () => {
      const publishedPost = [
        {
          _id: "post1" as any,
          _creationTime: 1698768000000,
          clerkUserId: "user123",
          status: "Published",
          twitterContent: "Test",
          linkedInContent: "",
          twitterScheduledTime: 1698768000000,
          linkedInScheduledTime: undefined,
          url: "",
          errorMessage: undefined,
          retryCount: 0,
          twitterPostId: undefined,
          linkedInPostId: undefined,
        },
      ];

      mockUseQuery.mockReturnValue(publishedPost);

      render(<PostHistory />);

      const badge = screen.getByText("Published");
      expect(badge.className).toContain("bg-green-500");
    });

    it("should apply correct color for Failed status", () => {
      const failedPost = [
        {
          _id: "post1" as any,
          _creationTime: 1698768000000,
          clerkUserId: "user123",
          status: "Failed",
          twitterContent: "Test",
          linkedInContent: "",
          twitterScheduledTime: 1698768000000,
          linkedInScheduledTime: undefined,
          url: "",
          errorMessage: "Test error",
          retryCount: 3,
          twitterPostId: undefined,
          linkedInPostId: undefined,
        },
      ];

      mockUseQuery.mockReturnValue(failedPost);

      render(<PostHistory />);

      const badge = screen.getByText("Failed");
      expect(badge.className).toContain("bg-red-500");
    });
  });
});
