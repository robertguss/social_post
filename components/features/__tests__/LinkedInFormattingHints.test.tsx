import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinkedInFormattingHints } from "../LinkedInFormattingHints";

describe("LinkedInFormattingHints Component", () => {
  const mockOnDismiss = jest.fn();

  const defaultProps = {
    content: "",
    isVisible: true,
    onDismiss: mockOnDismiss,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render with default static hints when visible", () => {
      render(<LinkedInFormattingHints {...defaultProps} />);

      expect(screen.getByText("Formatting Tips")).toBeInTheDocument();
      expect(screen.getByText("Use line breaks for readability")).toBeInTheDocument();
      expect(screen.getByText("Add emojis for engagement")).toBeInTheDocument();
      expect(screen.getByText("Include hashtags at the end")).toBeInTheDocument();
    });

    it("should not render when isVisible is false", () => {
      render(<LinkedInFormattingHints {...defaultProps} isVisible={false} />);

      expect(screen.queryByText("Formatting Tips")).not.toBeInTheDocument();
    });

    it("should render dismiss button", () => {
      render(<LinkedInFormattingHints {...defaultProps} />);

      const dismissButton = screen.getByLabelText("Dismiss hints");
      expect(dismissButton).toBeInTheDocument();
    });

    it("should render Tips button", () => {
      render(<LinkedInFormattingHints {...defaultProps} />);

      const tipsButton = screen.getByLabelText("Show LinkedIn best practices");
      expect(tipsButton).toBeInTheDocument();
    });
  });

  describe("Dismiss Functionality", () => {
    it("should call onDismiss when dismiss button is clicked", async () => {
      const user = userEvent.setup();
      render(<LinkedInFormattingHints {...defaultProps} />);

      const dismissButton = screen.getByLabelText("Dismiss hints");
      await user.click(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe("Context-Aware Hints - Hashtags", () => {
    it("should NOT show hashtag hint for short content", () => {
      render(
        <LinkedInFormattingHints
          {...defaultProps}
          content="Short post"
        />
      );

      expect(screen.queryByText("Consider adding relevant hashtags")).not.toBeInTheDocument();
    });

    it("should NOT show hashtag hint when content has hashtags", () => {
      render(
        <LinkedInFormattingHints
          {...defaultProps}
          content="This is a long post with more than 100 characters to trigger the hint but it has hashtags like #test and #linkedin so the hint should not appear"
        />
      );

      expect(screen.queryByText("Consider adding relevant hashtags")).not.toBeInTheDocument();
    });

    it("should show hashtag hint when content > 100 chars and no hashtags", () => {
      render(
        <LinkedInFormattingHints
          {...defaultProps}
          content="This is a sufficiently long LinkedIn post that exceeds the 100 character threshold required to trigger the context-aware hashtag hint but contains no hashtags whatsoever"
        />
      );

      expect(screen.getByText("Consider adding relevant hashtags")).toBeInTheDocument();
    });

    it("should show hashtag hint for exactly 101 characters without hashtags", () => {
      const content = "a".repeat(101); // Exactly 101 characters
      render(
        <LinkedInFormattingHints
          {...defaultProps}
          content={content}
        />
      );

      expect(screen.getByText("Consider adding relevant hashtags")).toBeInTheDocument();
    });

    it("should NOT show hashtag hint for exactly 100 characters without hashtags", () => {
      const content = "a".repeat(100); // Exactly 100 characters
      render(
        <LinkedInFormattingHints
          {...defaultProps}
          content={content}
        />
      );

      expect(screen.queryByText("Consider adding relevant hashtags")).not.toBeInTheDocument();
    });
  });

  describe("Context-Aware Hints - Line Breaks", () => {
    it("should NOT show line break hint for short content", () => {
      render(
        <LinkedInFormattingHints
          {...defaultProps}
          content="Short post"
        />
      );

      expect(screen.queryByText("Add line breaks to improve readability")).not.toBeInTheDocument();
    });

    it("should NOT show line break hint when content has line breaks", () => {
      render(
        <LinkedInFormattingHints
          {...defaultProps}
          content={"This is a very long post with more than 200 characters to trigger the line break hint.\n\nHowever, it already has line breaks in it, so the hint should not appear.\n\nThis demonstrates that the component correctly detects line breaks in the content."}
        />
      );

      expect(screen.queryByText("Add line breaks to improve readability")).not.toBeInTheDocument();
    });

    it("should show line break hint when content > 200 chars and no line breaks", () => {
      const content = "a".repeat(201); // 201 characters without line breaks
      render(
        <LinkedInFormattingHints
          {...defaultProps}
          content={content}
        />
      );

      expect(screen.getByText("Add line breaks to improve readability")).toBeInTheDocument();
    });

    it("should show line break hint for exactly 201 characters without line breaks", () => {
      const content = "a".repeat(201); // Exactly 201 characters
      render(
        <LinkedInFormattingHints
          {...defaultProps}
          content={content}
        />
      );

      expect(screen.getByText("Add line breaks to improve readability")).toBeInTheDocument();
    });

    it("should NOT show line break hint for exactly 200 characters without line breaks", () => {
      const content = "a".repeat(200); // Exactly 200 characters
      render(
        <LinkedInFormattingHints
          {...defaultProps}
          content={content}
        />
      );

      expect(screen.queryByText("Add line breaks to improve readability")).not.toBeInTheDocument();
    });
  });

  describe("Multiple Context-Aware Hints", () => {
    it("should show both hashtag and line break hints when both conditions are met", () => {
      const content = "a".repeat(250); // Long enough for both hints, no hashtags, no line breaks
      render(
        <LinkedInFormattingHints
          {...defaultProps}
          content={content}
        />
      );

      expect(screen.getByText("Consider adding relevant hashtags")).toBeInTheDocument();
      expect(screen.getByText("Add line breaks to improve readability")).toBeInTheDocument();
    });

    it("should show only hashtag hint when line break condition is not met", () => {
      const contentWithLineBreaks = "a".repeat(50) + "\n" + "a".repeat(60); // > 100 chars, has line breaks
      render(
        <LinkedInFormattingHints
          {...defaultProps}
          content={contentWithLineBreaks}
        />
      );

      expect(screen.getByText("Consider adding relevant hashtags")).toBeInTheDocument();
      expect(screen.queryByText("Add line breaks to improve readability")).not.toBeInTheDocument();
    });

    it("should show only line break hint when hashtag condition is not met", () => {
      const contentWithHashtag = "a".repeat(210) + " #test"; // > 200 chars, has hashtag
      render(
        <LinkedInFormattingHints
          {...defaultProps}
          content={contentWithHashtag}
        />
      );

      expect(screen.queryByText("Consider adding relevant hashtags")).not.toBeInTheDocument();
      expect(screen.getByText("Add line breaks to improve readability")).toBeInTheDocument();
    });
  });

  describe("Tips Popover", () => {
    it("should open tips popover when Tips button is clicked", async () => {
      const user = userEvent.setup();
      render(<LinkedInFormattingHints {...defaultProps} />);

      const tipsButton = screen.getByLabelText("Show LinkedIn best practices");
      await user.click(tipsButton);

      // Check for popover content
      expect(screen.getByText("LinkedIn Best Practices")).toBeInTheDocument();
      expect(screen.getByText(/First 2-3 lines are critical/i)).toBeInTheDocument();
      expect(screen.getByText(/Use line breaks to create visual hierarchy/i)).toBeInTheDocument();
      expect(screen.getByText(/Posts with 3-5 hashtags tend to perform well/i)).toBeInTheDocument();
      expect(screen.getByText(/Tag relevant people or companies to increase reach/i)).toBeInTheDocument();
      expect(screen.getByText(/Emoji can increase engagement, but use sparingly/i)).toBeInTheDocument();
      expect(screen.getByText(/Ask questions to encourage comments/i)).toBeInTheDocument();
    });

    it("should close tips popover when clicking outside or pressing escape", async () => {
      const user = userEvent.setup();
      render(<LinkedInFormattingHints {...defaultProps} />);

      const tipsButton = screen.getByLabelText("Show LinkedIn best practices");
      await user.click(tipsButton);

      expect(screen.getByText("LinkedIn Best Practices")).toBeInTheDocument();

      // Press Escape to close
      await user.keyboard("{Escape}");

      // Popover content should be removed from document
      expect(screen.queryByText("LinkedIn Best Practices")).not.toBeInTheDocument();
    });
  });

  describe("Hint Styling", () => {
    it("should apply different styling to context-aware hints", () => {
      const content = "a".repeat(250); // Trigger both context hints
      const { container } = render(
        <LinkedInFormattingHints
          {...defaultProps}
          content={content}
        />
      );

      // Context-aware hints should have orange/warning color class
      const contextHints = container.querySelectorAll("li.text-orange-600");
      expect(contextHints.length).toBeGreaterThan(0);
    });
  });

  describe("Accessibility", () => {
    it("should have proper aria-label for dismiss button", () => {
      render(<LinkedInFormattingHints {...defaultProps} />);

      const dismissButton = screen.getByLabelText("Dismiss hints");
      expect(dismissButton).toHaveAttribute("aria-label", "Dismiss hints");
    });

    it("should have proper aria-label for tips button", () => {
      render(<LinkedInFormattingHints {...defaultProps} />);

      const tipsButton = screen.getByLabelText("Show LinkedIn best practices");
      expect(tipsButton).toHaveAttribute("aria-label", "Show LinkedIn best practices");
    });

    it("should be keyboard navigable", async () => {
      const user = userEvent.setup();
      render(<LinkedInFormattingHints {...defaultProps} />);

      // Tab to tips button
      await user.tab();
      const tipsButton = screen.getByLabelText("Show LinkedIn best practices");
      expect(tipsButton).toHaveFocus();

      // Tab to dismiss button
      await user.tab();
      const dismissButton = screen.getByLabelText("Dismiss hints");
      expect(dismissButton).toHaveFocus();
    });
  });
});
