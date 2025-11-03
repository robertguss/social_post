import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecommendedTimes } from "../RecommendedTimes";
import { useQuery } from "convex/react";

// Mock Convex useQuery hook
jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
}));

// Mock Tabler icons
jest.mock("@tabler/icons-react", () => ({
  IconInfoCircle: () => <div data-testid="icon-info-circle" />,
  IconBrandTwitter: () => <div data-testid="icon-twitter" />,
  IconBrandLinkedin: () => <div data-testid="icon-linkedin" />,
  IconClock: () => <div data-testid="icon-clock" />,
  IconAlertTriangle: () => <div data-testid="icon-alert-triangle" />,
}));

// Mock shadcn/ui Tooltip component
jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div>{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("RecommendedTimes Component", () => {
  const mockOnTimeSelect = jest.fn();
  const selectedDate = new Date("2025-11-15T12:00:00");

  const mockRecommendations = [
    {
      timeRange: "9:00 AM - 11:00 AM EST",
      engagementScore: 85,
      source: "industry research",
      conflictsWithPost: false,
    },
    {
      timeRange: "2:00 PM - 4:00 PM EST",
      engagementScore: 72,
      source: "industry research",
      conflictsWithPost: false,
    },
    {
      timeRange: "6:00 PM - 8:00 PM EST",
      engagementScore: 65,
      source: "industry research",
      conflictsWithPost: true,
    },
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should NOT render when selectedDate is undefined", () => {
      (useQuery as jest.Mock).mockReturnValue(undefined);

      const { container } = render(
        <RecommendedTimes
          selectedDate={undefined}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should render loading skeleton when recommendations are loading", () => {
      (useQuery as jest.Mock).mockReturnValue(undefined);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      expect(screen.getByText("Recommended Times")).toBeInTheDocument();
      // Skeleton components should be rendered (check for Card container)
      expect(screen.getByTestId("icon-clock")).toBeInTheDocument();
    });

    it("should render empty state when no recommendations available", () => {
      (useQuery as jest.Mock).mockReturnValue([]);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      expect(screen.getByText("Recommended Times")).toBeInTheDocument();
      expect(screen.getByText("No recommendations available for this date")).toBeInTheDocument();
    });

    it("should render recommendation suggestions when data is available", () => {
      (useQuery as jest.Mock).mockReturnValue(mockRecommendations);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      expect(screen.getByText("Recommended Times")).toBeInTheDocument();
      expect(screen.getByText("9:00 AM - 11:00 AM EST")).toBeInTheDocument();
      expect(screen.getByText("2:00 PM - 4:00 PM EST")).toBeInTheDocument();
      expect(screen.getByText("6:00 PM - 8:00 PM EST")).toBeInTheDocument();
    });

    it("should render Twitter icon when platform is twitter", () => {
      (useQuery as jest.Mock).mockReturnValue(mockRecommendations);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      const twitterIcons = screen.getAllByTestId("icon-twitter");
      expect(twitterIcons).toHaveLength(3); // One for each recommendation
    });

    it("should render LinkedIn icon when platform is linkedin", () => {
      (useQuery as jest.Mock).mockReturnValue(mockRecommendations);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="linkedin"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      const linkedinIcons = screen.getAllByTestId("icon-linkedin");
      expect(linkedinIcons).toHaveLength(3); // One for each recommendation
    });

    it("should render info icon for tooltip", () => {
      (useQuery as jest.Mock).mockReturnValue(mockRecommendations);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      expect(screen.getByTestId("icon-info-circle")).toBeInTheDocument();
    });

    it("should render tooltip content with explanation", () => {
      (useQuery as jest.Mock).mockReturnValue(mockRecommendations);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      const tooltipContent = screen.getByTestId("tooltip-content");
      expect(tooltipContent).toHaveTextContent(
        "Based on industry research and best practices for optimal engagement."
      );
      expect(tooltipContent).toHaveTextContent(
        "In the future, we'll personalize based on your posting history."
      );
    });
  });

  describe("Engagement Level Display", () => {
    it("should display 'High engagement window' badge for score >= 80", () => {
      (useQuery as jest.Mock).mockReturnValue([
        {
          timeRange: "9:00 AM - 11:00 AM EST",
          engagementScore: 85,
          source: "industry research",
          conflictsWithPost: false,
        },
      ]);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      expect(screen.getByText("High engagement window")).toBeInTheDocument();
    });

    it("should display 'Good engagement window' badge for score 60-79", () => {
      (useQuery as jest.Mock).mockReturnValue([
        {
          timeRange: "2:00 PM - 4:00 PM EST",
          engagementScore: 72,
          source: "industry research",
          conflictsWithPost: false,
        },
      ]);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      expect(screen.getByText("Good engagement window")).toBeInTheDocument();
    });

    it("should display 'Moderate engagement' badge for score 40-59", () => {
      (useQuery as jest.Mock).mockReturnValue([
        {
          timeRange: "3:00 PM - 5:00 PM EST",
          engagementScore: 55,
          source: "industry research",
          conflictsWithPost: false,
        },
      ]);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      expect(screen.getByText("Moderate engagement")).toBeInTheDocument();
    });

    it("should display 'Low engagement' badge for score < 40", () => {
      (useQuery as jest.Mock).mockReturnValue([
        {
          timeRange: "3:00 AM - 5:00 AM EST",
          engagementScore: 30,
          source: "default",
          conflictsWithPost: false,
        },
      ]);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      expect(screen.getByText("Low engagement")).toBeInTheDocument();
    });
  });

  describe("Conflict Warnings", () => {
    it("should display conflict warning when conflictsWithPost is true", () => {
      (useQuery as jest.Mock).mockReturnValue([
        {
          timeRange: "6:00 PM - 8:00 PM EST",
          engagementScore: 65,
          source: "industry research",
          conflictsWithPost: true,
        },
      ]);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      expect(screen.getByText("Conflicts with existing post")).toBeInTheDocument();
      expect(screen.getByTestId("icon-alert-triangle")).toBeInTheDocument();
    });

    it("should NOT display conflict warning when conflictsWithPost is false", () => {
      (useQuery as jest.Mock).mockReturnValue([
        {
          timeRange: "9:00 AM - 11:00 AM EST",
          engagementScore: 85,
          source: "industry research",
          conflictsWithPost: false,
        },
      ]);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      expect(screen.queryByText("Conflicts with existing post")).not.toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("should call onTimeSelect with correct timestamp when suggestion is clicked", async () => {
      const user = userEvent.setup();
      (useQuery as jest.Mock).mockReturnValue(mockRecommendations);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      const firstSuggestion = screen.getByRole("button", {
        name: /select recommended time: 9:00 AM - 11:00 AM EST/i,
      });

      await user.click(firstSuggestion);

      expect(mockOnTimeSelect).toHaveBeenCalledTimes(1);
      expect(mockOnTimeSelect).toHaveBeenCalledWith(expect.any(Number));

      // Verify the timestamp corresponds to 9:00 AM on the selected date
      const calledTimestamp = mockOnTimeSelect.mock.calls[0][0];
      const calledDate = new Date(calledTimestamp);
      expect(calledDate.getHours()).toBe(9);
      expect(calledDate.getMinutes()).toBe(0);
    });

    it("should call onTimeSelect with correct timestamp for PM times", async () => {
      const user = userEvent.setup();
      (useQuery as jest.Mock).mockReturnValue(mockRecommendations);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      const secondSuggestion = screen.getByRole("button", {
        name: /select recommended time: 2:00 PM - 4:00 PM EST/i,
      });

      await user.click(secondSuggestion);

      expect(mockOnTimeSelect).toHaveBeenCalledTimes(1);

      // Verify the timestamp corresponds to 2:00 PM (14:00) on the selected date
      const calledTimestamp = mockOnTimeSelect.mock.calls[0][0];
      const calledDate = new Date(calledTimestamp);
      expect(calledDate.getHours()).toBe(14);
      expect(calledDate.getMinutes()).toBe(0);
    });

    it("should handle 12:00 PM (noon) correctly", async () => {
      const user = userEvent.setup();
      (useQuery as jest.Mock).mockReturnValue([
        {
          timeRange: "12:00 PM - 2:00 PM EST",
          engagementScore: 75,
          source: "industry research",
          conflictsWithPost: false,
        },
      ]);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      const suggestion = screen.getByRole("button", {
        name: /select recommended time: 12:00 PM - 2:00 PM EST/i,
      });

      await user.click(suggestion);

      const calledTimestamp = mockOnTimeSelect.mock.calls[0][0];
      const calledDate = new Date(calledTimestamp);
      expect(calledDate.getHours()).toBe(12);
    });

    it("should handle 12:00 AM (midnight) correctly", async () => {
      const user = userEvent.setup();
      (useQuery as jest.Mock).mockReturnValue([
        {
          timeRange: "12:00 AM - 2:00 AM EST",
          engagementScore: 40,
          source: "default",
          conflictsWithPost: false,
        },
      ]);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      const suggestion = screen.getByRole("button", {
        name: /select recommended time: 12:00 AM - 2:00 AM EST/i,
      });

      await user.click(suggestion);

      const calledTimestamp = mockOnTimeSelect.mock.calls[0][0];
      const calledDate = new Date(calledTimestamp);
      expect(calledDate.getHours()).toBe(0);
    });
  });

  describe("Accessibility", () => {
    it("should have proper aria-label on suggestion buttons", () => {
      (useQuery as jest.Mock).mockReturnValue(mockRecommendations);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      const firstSuggestion = screen.getByRole("button", {
        name: /select recommended time: 9:00 AM - 11:00 AM EST/i,
      });
      expect(firstSuggestion).toBeInTheDocument();
    });

    it("should have proper aria-label on info icon button", () => {
      (useQuery as jest.Mock).mockReturnValue(mockRecommendations);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      const infoButton = screen.getByRole("button", { name: /learn about recommendations/i });
      expect(infoButton).toBeInTheDocument();
    });

    it("should be keyboard navigable (button elements)", () => {
      (useQuery as jest.Mock).mockReturnValue(mockRecommendations);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);

      // All suggestion buttons should be proper button elements
      const suggestionButtons = buttons.filter((btn) =>
        btn.getAttribute("aria-label")?.includes("Select recommended time")
      );
      expect(suggestionButtons.length).toBe(3);
    });
  });

  describe("Query Parameters", () => {
    it("should call useQuery with correct parameters for Twitter", () => {
      (useQuery as jest.Mock).mockReturnValue(mockRecommendations);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      expect(useQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          date: "2025-11-15",
          platform: "twitter",
          userTimezone: expect.any(String),
        })
      );
    });

    it("should call useQuery with correct parameters for LinkedIn", () => {
      (useQuery as jest.Mock).mockReturnValue(mockRecommendations);

      render(
        <RecommendedTimes
          selectedDate={selectedDate}
          platform="linkedin"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      expect(useQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          date: "2025-11-15",
          platform: "linkedin",
          userTimezone: expect.any(String),
        })
      );
    });

    it("should call useQuery with 'skip' when selectedDate is undefined", () => {
      (useQuery as jest.Mock).mockReturnValue(undefined);

      render(
        <RecommendedTimes
          selectedDate={undefined}
          platform="twitter"
          onTimeSelect={mockOnTimeSelect}
        />
      );

      expect(useQuery).toHaveBeenCalledWith(expect.anything(), "skip");
    });
  });
});
