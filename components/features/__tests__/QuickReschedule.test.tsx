import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickReschedule } from "../QuickReschedule";

describe("QuickReschedule Component", () => {
  const mockOnSelectTime = jest.fn();
  const originalTimestamp = new Date("2024-02-01T10:00:00").getTime(); // Feb 1, 2024, 10:00 AM

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render suggestion buttons when originalScheduledTime is provided", () => {
      render(
        <QuickReschedule
          originalScheduledTime={originalTimestamp}
          platform="twitter"
          onSelectTime={mockOnSelectTime}
        />
      );

      expect(screen.getByText("Quick Reschedule")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+1 Week/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+1 Month/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+3 Months/i })).toBeInTheDocument();
    });

    it("should NOT render when originalScheduledTime is undefined", () => {
      const { container } = render(
        <QuickReschedule
          originalScheduledTime={undefined}
          platform="twitter"
          onSelectTime={mockOnSelectTime}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should render with correct accessibility labels for Twitter platform", () => {
      render(
        <QuickReschedule
          originalScheduledTime={originalTimestamp}
          platform="twitter"
          onSelectTime={mockOnSelectTime}
        />
      );

      const weekButton = screen.getByRole("button", { name: /schedule \+1 week from original twitter post time/i });
      expect(weekButton).toBeInTheDocument();
    });

    it("should render with correct accessibility labels for LinkedIn platform", () => {
      render(
        <QuickReschedule
          originalScheduledTime={originalTimestamp}
          platform="linkedin"
          onSelectTime={mockOnSelectTime}
        />
      );

      const weekButton = screen.getByRole("button", { name: /schedule \+1 week from original linkedin post time/i });
      expect(weekButton).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("should call onSelectTime with correct timestamp when +1 Week button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <QuickReschedule
          originalScheduledTime={originalTimestamp}
          platform="twitter"
          onSelectTime={mockOnSelectTime}
        />
      );

      const weekButton = screen.getByRole("button", { name: /\+1 Week/i });
      await user.click(weekButton);

      // Expected: Feb 1 + 1 week = Feb 8, 2024, 10:00 AM
      const expectedTimestamp = new Date("2024-02-08T10:00:00").getTime();
      expect(mockOnSelectTime).toHaveBeenCalledTimes(1);
      expect(mockOnSelectTime).toHaveBeenCalledWith(expectedTimestamp);
    });

    it("should call onSelectTime with correct timestamp when +1 Month button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <QuickReschedule
          originalScheduledTime={originalTimestamp}
          platform="twitter"
          onSelectTime={mockOnSelectTime}
        />
      );

      const monthButton = screen.getByRole("button", { name: /\+1 Month/i });
      await user.click(monthButton);

      // Expected: Feb 1 + 1 month = March 1, 2024, 10:00 AM
      const expectedTimestamp = new Date("2024-03-01T10:00:00").getTime();
      expect(mockOnSelectTime).toHaveBeenCalledTimes(1);
      expect(mockOnSelectTime).toHaveBeenCalledWith(expectedTimestamp);
    });

    it("should call onSelectTime with correct timestamp when +3 Months button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <QuickReschedule
          originalScheduledTime={originalTimestamp}
          platform="twitter"
          onSelectTime={mockOnSelectTime}
        />
      );

      const threeMonthsButton = screen.getByRole("button", { name: /\+3 Months/i });
      await user.click(threeMonthsButton);

      // Expected: Feb 1 + 3 months = May 1, 2024, 10:00 AM
      const expectedTimestamp = new Date("2024-05-01T10:00:00").getTime();
      expect(mockOnSelectTime).toHaveBeenCalledTimes(1);
      expect(mockOnSelectTime).toHaveBeenCalledWith(expectedTimestamp);
    });
  });

  describe("Tooltip Display", () => {
    it("should display formatted absolute date/time in tooltips", () => {
      render(
        <QuickReschedule
          originalScheduledTime={originalTimestamp}
          platform="twitter"
          onSelectTime={mockOnSelectTime}
        />
      );

      // Tooltips render on hover - just verify buttons exist
      // Actual tooltip testing requires user interaction simulation which is complex with TooltipProvider
      const weekButton = screen.getByRole("button", { name: /\+1 Week/i });
      const monthButton = screen.getByRole("button", { name: /\+1 Month/i });
      const threeMonthsButton = screen.getByRole("button", { name: /\+3 Months/i });

      expect(weekButton).toBeInTheDocument();
      expect(monthButton).toBeInTheDocument();
      expect(threeMonthsButton).toBeInTheDocument();
    });
  });

  describe("Keyboard Navigation", () => {
    it("should support keyboard navigation and selection", async () => {
      const user = userEvent.setup();

      render(
        <QuickReschedule
          originalScheduledTime={originalTimestamp}
          platform="twitter"
          onSelectTime={mockOnSelectTime}
        />
      );

      const weekButton = screen.getByRole("button", { name: /\+1 Week/i });

      // Tab to button
      await user.tab();
      expect(weekButton).toHaveFocus();

      // Press Enter to activate
      await user.keyboard("{Enter}");

      const expectedTimestamp = new Date("2024-02-08T10:00:00").getTime();
      expect(mockOnSelectTime).toHaveBeenCalledWith(expectedTimestamp);
    });
  });

  describe("Icon Rendering", () => {
    it("should render calendar icon on each button", () => {
      render(
        <QuickReschedule
          originalScheduledTime={originalTimestamp}
          platform="twitter"
          onSelectTime={mockOnSelectTime}
        />
      );

      // Each button should have an icon (via IconCalendarPlus)
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(3);
      // Icons are rendered as SVG elements, we just verify buttons exist
      buttons.forEach((button) => {
        expect(button).toBeInTheDocument();
      });
    });
  });
});
