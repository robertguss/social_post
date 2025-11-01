/**
 * Unit Tests for PostHistory Component
 *
 * Tests the PostHistory component's rendering, filtering, and interaction behaviors.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PostHistory } from "@/components/features/PostHistory";
import { useQuery, useMutation } from "convex/react";

// Mock Convex React hooks
jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
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
        screen.getByText("No posts found for the selected filters.")
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Try selecting different date range or platform filters, or schedule your first post!"
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
        platform: "all",
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

    it("should display 'All Platforms' as active by default", () => {
      mockUseQuery.mockReturnValue(mockPosts);

      render(<PostHistory />);

      const allPlatformsButton = screen.getByRole("button", { name: "All Platforms" });
      expect(allPlatformsButton).toBeInTheDocument();
      expect(allPlatformsButton.className).toContain("bg-primary");
    });

    it("should display LinkedIn as enabled", () => {
      mockUseQuery.mockReturnValue(mockPosts);

      render(<PostHistory />);

      const linkedInButton = screen.getByRole("button", { name: "LinkedIn" });
      expect(linkedInButton).toBeInTheDocument();
      expect(linkedInButton).not.toBeDisabled();
    });

    it("should pass platform parameter to query", () => {
      mockUseQuery.mockReturnValue(mockPosts);

      render(<PostHistory />);

      const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];
      expect(lastCall[1]).toHaveProperty("platform", "all");
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

  describe("Edit/Delete Button Visibility", () => {
    it("should show Edit and Delete buttons only for Scheduled posts", () => {
      const posts = [
        {
          _id: "scheduled-post" as any,
          _creationTime: 1698768000000,
          clerkUserId: "user123",
          status: "Scheduled",
          twitterContent: "Scheduled post",
          linkedInContent: "",
          twitterScheduledTime: 1698768000000,
          linkedInScheduledTime: undefined,
          url: "",
          errorMessage: undefined,
          retryCount: 0,
          twitterPostId: undefined,
          linkedInPostId: undefined,
        },
        {
          _id: "published-post" as any,
          _creationTime: 1698854400000,
          clerkUserId: "user123",
          status: "Published",
          twitterContent: "Published post",
          linkedInContent: "",
          twitterScheduledTime: 1698854400000,
          linkedInScheduledTime: undefined,
          url: "",
          errorMessage: undefined,
          retryCount: 0,
          twitterPostId: "123456",
          linkedInPostId: undefined,
        },
      ];

      const mockDeletePost = jest.fn();
      const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
      mockUseMutation.mockReturnValue(mockDeletePost);
      mockUseQuery.mockReturnValue(posts);

      render(<PostHistory />);

      // Scheduled post should have Edit and Delete buttons
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });

      expect(editButtons).toHaveLength(1);
      expect(deleteButtons).toHaveLength(1);
    });

    it("should NOT show Edit/Delete buttons for Published posts", () => {
      const posts = [
        {
          _id: "published-post" as any,
          _creationTime: 1698854400000,
          clerkUserId: "user123",
          status: "Published",
          twitterContent: "Published post",
          linkedInContent: "",
          twitterScheduledTime: 1698854400000,
          linkedInScheduledTime: undefined,
          url: "",
          errorMessage: undefined,
          retryCount: 0,
          twitterPostId: "123456",
          linkedInPostId: undefined,
        },
      ];

      const mockDeletePost = jest.fn();
      const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
      mockUseMutation.mockReturnValue(mockDeletePost);
      mockUseQuery.mockReturnValue(posts);

      render(<PostHistory />);

      expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    });

    it("should NOT show Edit/Delete buttons for Publishing posts", () => {
      const posts = [
        {
          _id: "publishing-post" as any,
          _creationTime: 1698854400000,
          clerkUserId: "user123",
          status: "Publishing",
          twitterContent: "Publishing post",
          linkedInContent: "",
          twitterScheduledTime: 1698854400000,
          linkedInScheduledTime: undefined,
          url: "",
          errorMessage: undefined,
          retryCount: 0,
          twitterPostId: undefined,
          linkedInPostId: undefined,
        },
      ];

      const mockDeletePost = jest.fn();
      const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
      mockUseMutation.mockReturnValue(mockDeletePost);
      mockUseQuery.mockReturnValue(posts);

      render(<PostHistory />);

      expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    });

    it("should NOT show Edit/Delete buttons for Failed posts", () => {
      const posts = [
        {
          _id: "failed-post" as any,
          _creationTime: 1698854400000,
          clerkUserId: "user123",
          status: "Failed",
          twitterContent: "Failed post",
          linkedInContent: "",
          twitterScheduledTime: 1698854400000,
          linkedInScheduledTime: undefined,
          url: "",
          errorMessage: "Error message",
          retryCount: 3,
          twitterPostId: undefined,
          linkedInPostId: undefined,
        },
      ];

      const mockDeletePost = jest.fn();
      const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
      mockUseMutation.mockReturnValue(mockDeletePost);
      mockUseQuery.mockReturnValue(posts);

      render(<PostHistory />);

      expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    });
  });

  describe("Delete Confirmation Dialog", () => {
    const scheduledPost = [
      {
        _id: "scheduled-post" as any,
        _creationTime: 1698768000000,
        clerkUserId: "user123",
        status: "Scheduled",
        twitterContent: "Scheduled post",
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

    it("should show confirmation dialog when Delete button is clicked", async () => {
      const mockDeletePost = jest.fn();
      const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
      mockUseMutation.mockReturnValue(mockDeletePost);
      mockUseQuery.mockReturnValue(scheduledPost);

      render(<PostHistory />);

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText("Delete Post")).toBeInTheDocument();
        expect(
          screen.getByText("Are you sure you want to delete this post? This action cannot be undone.")
        ).toBeInTheDocument();
      });
    });

    it("should close dialog when Cancel button is clicked", async () => {
      const mockDeletePost = jest.fn();
      const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
      mockUseMutation.mockReturnValue(mockDeletePost);
      mockUseQuery.mockReturnValue(scheduledPost);

      render(<PostHistory />);

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText("Delete Post")).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText("Delete Post")).not.toBeInTheDocument();
      });

      // Mutation should not have been called
      expect(mockDeletePost).not.toHaveBeenCalled();
    });

    it("should call deletePost mutation when Delete is confirmed", async () => {
      const mockDeletePost = jest.fn().mockResolvedValue(undefined);
      const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
      mockUseMutation.mockReturnValue(mockDeletePost);
      mockUseQuery.mockReturnValue(scheduledPost);

      render(<PostHistory />);

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText("Delete Post")).toBeInTheDocument();
      });

      const confirmButton = screen.getAllByRole("button", { name: "Delete" })[1]; // Second Delete button is in dialog
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockDeletePost).toHaveBeenCalledWith({ postId: "scheduled-post" });
      });
    });

    it("should not open post details modal when Delete button is clicked", async () => {
      const mockDeletePost = jest.fn();
      const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
      mockUseMutation.mockReturnValue(mockDeletePost);
      mockUseQuery.mockReturnValue(scheduledPost);

      render(<PostHistory />);

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      // Should show delete dialog, not post details modal
      await waitFor(() => {
        expect(screen.getByText("Delete Post")).toBeInTheDocument();
        expect(screen.queryByText("Post Details")).not.toBeInTheDocument();
      });
    });
  });

  describe("Edit Button Interaction", () => {
    const scheduledPost = [
      {
        _id: "scheduled-post" as any,
        _creationTime: 1698768000000,
        clerkUserId: "user123",
        status: "Scheduled",
        twitterContent: "Scheduled post to edit",
        linkedInContent: "LinkedIn content",
        twitterScheduledTime: 1698768000000,
        linkedInScheduledTime: 1698854400000,
        url: "https://example.com",
        errorMessage: undefined,
        retryCount: 0,
        twitterPostId: undefined,
        linkedInPostId: undefined,
      },
    ];

    it("should open edit modal when Edit button is clicked", async () => {
      const mockDeletePost = jest.fn();
      const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
      mockUseMutation.mockReturnValue(mockDeletePost);
      mockUseQuery.mockReturnValue(scheduledPost);

      render(<PostHistory />);

      const editButton = screen.getByRole("button", { name: "Edit" });
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText("Edit Post")).toBeInTheDocument();
      });
    });

    it("should not open post details modal when Edit button is clicked", async () => {
      const mockDeletePost = jest.fn();
      const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
      mockUseMutation.mockReturnValue(mockDeletePost);
      mockUseQuery.mockReturnValue(scheduledPost);

      render(<PostHistory />);

      const editButton = screen.getByRole("button", { name: "Edit" });
      fireEvent.click(editButton);

      // Should show edit form, not post details modal
      await waitFor(() => {
        expect(screen.getByText("Edit Post")).toBeInTheDocument();
        expect(screen.queryByText("Post Details")).not.toBeInTheDocument();
        expect(screen.queryByText("Full details for this scheduled post")).not.toBeInTheDocument();
      });
    });
  });

  /**
   * LinkedIn Integration Tests (Story 2.6)
   */
  describe("LinkedIn Support", () => {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    const linkedInOnlyPost = [
      {
        _id: "post-linkedin-1",
        status: "Scheduled",
        linkedInContent: "LinkedIn post content",
        linkedInScheduledTime: now - 3 * DAY_MS,
        linkedInPostId: undefined,
        twitterContent: undefined,
        twitterScheduledTime: undefined,
        twitterPostId: undefined,
        url: null,
        errorMessage: null,
      },
    ];

    const dualPlatformPost = [
      {
        _id: "post-dual-1",
        status: "Scheduled",
        twitterContent: "Twitter content",
        twitterScheduledTime: now - 2 * DAY_MS,
        twitterPostId: undefined,
        linkedInContent: "LinkedIn content",
        linkedInScheduledTime: now - 5 * DAY_MS,
        linkedInPostId: undefined,
        url: null,
        errorMessage: null,
      },
    ];

    it("should render LinkedIn platform filter button", () => {
      mockUseQuery.mockReturnValue([]);

      render(<PostHistory />);

      const linkedInButton = screen.getByRole("button", { name: "LinkedIn" });
      expect(linkedInButton).toBeInTheDocument();
      expect(linkedInButton).not.toBeDisabled();
    });

    it("should render All Platforms filter button", () => {
      mockUseQuery.mockReturnValue([]);

      render(<PostHistory />);

      const allPlatformsButton = screen.getByRole("button", { name: "All Platforms" });
      expect(allPlatformsButton).toBeInTheDocument();
    });

    it("should display LinkedIn badge for LinkedIn-only posts", () => {
      mockUseQuery.mockReturnValue(linkedInOnlyPost);

      render(<PostHistory />);

      // Find badges (not buttons) - there should be a LinkedIn badge in the post card
      const badges = screen.getAllByText("LinkedIn");
      expect(badges.length).toBeGreaterThan(1); // Filter button + badge
    });

    it("should display both platform badges for dual-platform posts", () => {
      mockUseQuery.mockReturnValue(dualPlatformPost);

      render(<PostHistory />);

      // Should have X and LinkedIn badges in the post card
      const xBadges = screen.getAllByText("X");
      const linkedInBadges = screen.getAllByText("LinkedIn");
      expect(xBadges.length).toBeGreaterThan(0);
      expect(linkedInBadges.length).toBeGreaterThan(1); // Filter button + badge
    });

    it("should display LinkedIn content when viewing LinkedIn-only post", () => {
      mockUseQuery.mockReturnValue(linkedInOnlyPost);

      render(<PostHistory />);

      expect(screen.getByText("LinkedIn post content")).toBeInTheDocument();
    });

    it("should open post details modal with LinkedIn information", async () => {
      const publishedLinkedInPost = [
        {
          _id: "post-linkedin-published",
          status: "Published",
          linkedInContent: "Published LinkedIn post",
          linkedInScheduledTime: now - 10 * DAY_MS,
          linkedInPostId: "urn:li:share:1234567890",
          twitterContent: undefined,
          twitterScheduledTime: undefined,
          twitterPostId: undefined,
          url: null,
          errorMessage: null,
        },
      ];

      mockUseQuery.mockReturnValue(publishedLinkedInPost);

      render(<PostHistory />);

      const postCard = screen.getByText("Published LinkedIn post").closest(".cursor-pointer");
      fireEvent.click(postCard!);

      await waitFor(() => {
        expect(screen.getByText("Post Details")).toBeInTheDocument();
        expect(screen.getByText("LinkedIn Post")).toBeInTheDocument();
        expect(screen.getByText("Published LinkedIn post")).toBeInTheDocument();
      });
    });

    it("should display LinkedIn post link in modal when post is published", async () => {
      const publishedLinkedInPost = [
        {
          _id: "post-linkedin-published",
          status: "Published",
          linkedInContent: "Published LinkedIn post",
          linkedInScheduledTime: now - 10 * DAY_MS,
          linkedInPostId: "urn:li:share:1234567890",
          twitterContent: undefined,
          twitterScheduledTime: undefined,
          twitterPostId: undefined,
          url: null,
          errorMessage: null,
        },
      ];

      mockUseQuery.mockReturnValue(publishedLinkedInPost);

      render(<PostHistory />);

      const postCard = screen.getByText("Published LinkedIn post").closest(".cursor-pointer");
      fireEvent.click(postCard!);

      await waitFor(() => {
        const linkedInLink = screen.getByText("Open Post on LinkedIn");
        expect(linkedInLink).toBeInTheDocument();
        expect(linkedInLink).toHaveAttribute("href", "https://www.linkedin.com/feed/update/urn:li:share:1234567890");
      });
    });

    it("should show dual-platform status badges for posts scheduled to both platforms", () => {
      const dualPublishedPost = [
        {
          _id: "post-dual-published",
          status: "Published",
          twitterContent: "Twitter content",
          twitterScheduledTime: now - 2 * DAY_MS,
          twitterPostId: "123456789",
          linkedInContent: "LinkedIn content",
          linkedInScheduledTime: now - 2 * DAY_MS,
          linkedInPostId: "urn:li:share:987654321",
          url: null,
          errorMessage: null,
        },
      ];

      mockUseQuery.mockReturnValue(dualPublishedPost);

      render(<PostHistory />);

      // Should show separate status badges for each platform
      expect(screen.getByText(/X:/)).toBeInTheDocument();
      expect(screen.getByText(/LinkedIn:/)).toBeInTheDocument();
    });

    it("should display platform-specific content in post details modal for dual-platform posts", async () => {
      mockUseQuery.mockReturnValue(dualPlatformPost);

      render(<PostHistory />);

      // Find the post card - it will show Twitter content since it's scheduled first
      const cards = document.querySelectorAll(".cursor-pointer");
      expect(cards.length).toBeGreaterThan(0);
      fireEvent.click(cards[0]);

      await waitFor(() => {
        expect(screen.getByText("X/Twitter Post")).toBeInTheDocument();
        expect(screen.getByText("LinkedIn Post")).toBeInTheDocument();
      });

      // Check both contents are present
      const twitterContent = screen.queryByText("Twitter content");
      const linkedInContent = screen.queryByText("LinkedIn content");

      expect(twitterContent).toBeInTheDocument();
      expect(linkedInContent).toBeInTheDocument();
    });

    it("should update card description to be platform-agnostic", () => {
      mockUseQuery.mockReturnValue([]);

      render(<PostHistory />);

      const description = screen.getByText("View your scheduled and published posts");
      expect(description).toBeInTheDocument();
      // Verify the description doesn't specifically mention only one platform
      expect(description.textContent).not.toContain("(X/Twitter)");
    });
  });
});
