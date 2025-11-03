import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DualPlatformTextFields } from "../DualPlatformTextFields";
import { toast } from "sonner";
import * as convexReact from "convex/react";

// Mock Convex useQuery hook
jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
}));

// Mock Convex API
jest.mock("@/convex/_generated/api", () => ({
  api: {
    userPreferences: {
      getUserPreferences: "userPreferences:getUserPreferences",
    },
  },
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseQuery = convexReact.useQuery as jest.MockedFunction<typeof convexReact.useQuery>;

describe("DualPlatformTextFields Component", () => {
  const mockTwitterChange = jest.fn();
  const mockLinkedInChange = jest.fn();
  const mockTwitterEnabledChange = jest.fn();
  const mockLinkedInEnabledChange = jest.fn();

  const defaultProps = {
    twitterContent: "",
    onTwitterChange: mockTwitterChange,
    twitterEnabled: true,
    onTwitterEnabledChange: mockTwitterEnabledChange,
    linkedInContent: "",
    onLinkedInChange: mockLinkedInChange,
    linkedInEnabled: true,
    onLinkedInEnabledChange: mockLinkedInEnabledChange,
  };

  beforeEach(() => {
    // Set default mock return value for useQuery (preferences enabled)
    mockUseQuery.mockReturnValue({ enableContentPrePopulation: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe("Rendering", () => {
    it("should render with correct labels for both platforms", () => {
      render(<DualPlatformTextFields {...defaultProps} />);

      expect(screen.getByText("Twitter/X Content")).toBeInTheDocument();
      expect(screen.getByText("LinkedIn Content")).toBeInTheDocument();
    });

    it("should render platform icons", () => {
      render(<DualPlatformTextFields {...defaultProps} />);

      // Icons should be rendered (IconBrandX and IconBrandLinkedin)
      const textareas = screen.getAllByRole("textbox");
      expect(textareas).toHaveLength(2);
    });

    it("should render with platform branding colors when enabled", () => {
      const { container } = render(<DualPlatformTextFields {...defaultProps} />);

      // Twitter section should have blue border
      const twitterSection = container.querySelector('[class*="border-[#1DA1F2]"]');
      expect(twitterSection).toBeInTheDocument();

      // LinkedIn section should have blue border
      const linkedInSection = container.querySelector('[class*="border-[#0A66C2]"]');
      expect(linkedInSection).toBeInTheDocument();
    });

    it("should render textareas with correct placeholders", () => {
      render(<DualPlatformTextFields {...defaultProps} />);

      expect(screen.getByPlaceholderText("What's happening?")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Share your professional insights...")).toBeInTheDocument();
    });

    it("should render character counters with correct default limits", () => {
      render(
        <DualPlatformTextFields
          {...defaultProps}
          twitterContent="Hello"
          linkedInContent="Hello World"
        />
      );

      expect(screen.getByText("5/280")).toBeInTheDocument();
      expect(screen.getByText("11/3000")).toBeInTheDocument();
    });

    it("should render custom labels when provided", () => {
      render(
        <DualPlatformTextFields
          {...defaultProps}
          twitterLabel="Custom Twitter Label"
          linkedInLabel="Custom LinkedIn Label"
        />
      );

      expect(screen.getByText("Custom Twitter Label")).toBeInTheDocument();
      expect(screen.getByText("Custom LinkedIn Label")).toBeInTheDocument();
    });
  });

  describe("Platform Toggle Switches", () => {
    it("should show 'Enabled' label when platform is enabled", () => {
      render(<DualPlatformTextFields {...defaultProps} />);

      const enabledLabels = screen.getAllByText("Enabled");
      expect(enabledLabels).toHaveLength(2);
    });

    it("should show 'Disabled' label when platform is disabled", () => {
      render(
        <DualPlatformTextFields
          {...defaultProps}
          twitterEnabled={false}
          linkedInEnabled={false}
        />
      );

      const disabledLabels = screen.getAllByText("Disabled");
      expect(disabledLabels).toHaveLength(2);
    });

    it("should call onTwitterEnabledChange when Twitter toggle is clicked", async () => {
      const user = userEvent.setup();
      render(<DualPlatformTextFields {...defaultProps} twitterEnabled={true} />);

      const twitterToggle = screen.getByRole("switch", { name: "Toggle Twitter posting" });
      await user.click(twitterToggle);

      expect(mockTwitterEnabledChange).toHaveBeenCalledWith(false);
    });

    it("should call onLinkedInEnabledChange when LinkedIn toggle is clicked", async () => {
      const user = userEvent.setup();
      render(<DualPlatformTextFields {...defaultProps} linkedInEnabled={true} />);

      const linkedInToggle = screen.getByRole("switch", { name: "Toggle LinkedIn posting" });
      await user.click(linkedInToggle);

      expect(mockLinkedInEnabledChange).toHaveBeenCalledWith(false);
    });

    it("should apply visual dimming when platform is disabled", () => {
      const { container } = render(
        <DualPlatformTextFields
          {...defaultProps}
          twitterEnabled={false}
          linkedInEnabled={false}
        />
      );

      // Both sections should have opacity-60 class when disabled
      const sections = container.querySelectorAll('[class*="opacity-60"]');
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });

    it("should disable textarea when platform is disabled", () => {
      render(
        <DualPlatformTextFields
          {...defaultProps}
          twitterEnabled={false}
          linkedInEnabled={false}
        />
      );

      const textareas = screen.getAllByRole("textbox");
      textareas.forEach((textarea) => {
        expect(textarea).toBeDisabled();
      });
    });

    it("should preserve content when platform is disabled", () => {
      render(
        <DualPlatformTextFields
          {...defaultProps}
          twitterContent="My tweet"
          linkedInContent="My post"
          twitterEnabled={false}
          linkedInEnabled={false}
        />
      );

      const twitterTextarea = screen.getByPlaceholderText("What's happening?");
      const linkedInTextarea = screen.getByPlaceholderText("Share your professional insights...");

      expect(twitterTextarea).toHaveValue("My tweet");
      expect(linkedInTextarea).toHaveValue("My post");
    });
  });

  describe("Independent Focus State", () => {
    it("should allow focusing on Twitter textarea independently", async () => {
      const user = userEvent.setup();
      render(<DualPlatformTextFields {...defaultProps} />);

      const twitterTextarea = screen.getByPlaceholderText("What's happening?");
      await user.click(twitterTextarea);

      expect(twitterTextarea).toHaveFocus();
    });

    it("should allow focusing on LinkedIn textarea independently", async () => {
      const user = userEvent.setup();
      render(<DualPlatformTextFields {...defaultProps} />);

      const linkedInTextarea = screen.getByPlaceholderText("Share your professional insights...");
      await user.click(linkedInTextarea);

      expect(linkedInTextarea).toHaveFocus();
    });
  });

  describe("Expand/Collapse Functionality", () => {
    it("should render expand/collapse buttons for both platforms", () => {
      render(<DualPlatformTextFields {...defaultProps} />);

      const expandButtons = screen.getAllByRole("button", {
        name: /collapse|expand/i,
      });
      expect(expandButtons.length).toBeGreaterThanOrEqual(2);
    });

    it("should collapse Twitter section when collapse button is clicked", async () => {
      const user = userEvent.setup();
      render(<DualPlatformTextFields {...defaultProps} />);

      const twitterCollapseButton = screen.getByRole("button", {
        name: "Collapse Twitter section",
      });
      await user.click(twitterCollapseButton);

      // Textarea should not be visible after collapse
      const twitterTextarea = screen.queryByPlaceholderText("What's happening?");
      expect(twitterTextarea).not.toBeInTheDocument();

      // Button should now show expand
      const expandButton = screen.getByRole("button", {
        name: "Expand Twitter section",
      });
      expect(expandButton).toBeInTheDocument();
    });

    it("should expand Twitter section when expand button is clicked", async () => {
      const user = userEvent.setup();
      render(<DualPlatformTextFields {...defaultProps} />);

      // First collapse
      const collapseButton = screen.getByRole("button", {
        name: "Collapse Twitter section",
      });
      await user.click(collapseButton);

      // Then expand
      const expandButton = screen.getByRole("button", {
        name: "Expand Twitter section",
      });
      await user.click(expandButton);

      // Textarea should be visible again
      const twitterTextarea = screen.getByPlaceholderText("What's happening?");
      expect(twitterTextarea).toBeInTheDocument();
    });

    it("should collapse LinkedIn section independently", async () => {
      const user = userEvent.setup();
      render(<DualPlatformTextFields {...defaultProps} />);

      const linkedInCollapseButton = screen.getByRole("button", {
        name: "Collapse LinkedIn section",
      });
      await user.click(linkedInCollapseButton);

      // LinkedIn textarea should not be visible
      const linkedInTextarea = screen.queryByPlaceholderText("Share your professional insights...");
      expect(linkedInTextarea).not.toBeInTheDocument();

      // Twitter textarea should still be visible
      const twitterTextarea = screen.getByPlaceholderText("What's happening?");
      expect(twitterTextarea).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("should call onTwitterChange when typing in Twitter textarea", async () => {
      const user = userEvent.setup();
      render(<DualPlatformTextFields {...defaultProps} />);

      const twitterTextarea = screen.getByPlaceholderText("What's happening?");
      await user.type(twitterTextarea, "Hello");

      expect(mockTwitterChange).toHaveBeenCalled();
    });

    it("should call onLinkedInChange when typing in LinkedIn textarea", async () => {
      const user = userEvent.setup();
      render(<DualPlatformTextFields {...defaultProps} />);

      const linkedInTextarea = screen.getByPlaceholderText("Share your professional insights...");
      await user.type(linkedInTextarea, "Hello");

      expect(mockLinkedInChange).toHaveBeenCalled();
    });
  });

  describe("Character Count Validation", () => {
    it("should apply warning styles when Twitter content nears limit", () => {
      const longContent = "a".repeat(265); // 265 chars, above 260 threshold

      const { container } = render(
        <DualPlatformTextFields
          {...defaultProps}
          twitterContent={longContent}
          twitterCharCount={265}
        />
      );

      const charCounter = container.querySelector('[class*="text-yellow-600"]');
      expect(charCounter).toBeInTheDocument();
    });

    it("should apply error styles when Twitter content exceeds limit", () => {
      const tooLongContent = "a".repeat(285); // 285 chars, over 280 limit

      const { container } = render(
        <DualPlatformTextFields
          {...defaultProps}
          twitterContent={tooLongContent}
          twitterCharCount={285}
        />
      );

      const charCounter = container.querySelector('[class*="text-destructive"]');
      expect(charCounter).toBeInTheDocument();
    });

    it("should apply warning styles when LinkedIn content nears limit", () => {
      const longContent = "a".repeat(2950); // 2950 chars, above 2900 threshold

      const { container } = render(
        <DualPlatformTextFields
          {...defaultProps}
          linkedInContent={longContent}
          linkedInCharCount={2950}
        />
      );

      const charCounter = container.querySelector('[class*="text-yellow-600"]');
      expect(charCounter).toBeInTheDocument();
    });

    it("should apply error styles when LinkedIn content exceeds limit", () => {
      const tooLongContent = "a".repeat(3050); // 3050 chars, over 3000 limit

      const { container } = render(
        <DualPlatformTextFields
          {...defaultProps}
          linkedInContent={tooLongContent}
          linkedInCharCount={3050}
        />
      );

      const charCounter = container.querySelector('[class*="text-destructive"]');
      expect(charCounter).toBeInTheDocument();
    });
  });

  describe("Action Buttons", () => {
    it("should render Twitter action buttons when provided", () => {
      render(
        <DualPlatformTextFields
          {...defaultProps}
          twitterActions={<button>Insert Template</button>}
        />
      );

      const buttons = screen.getAllByText("Insert Template");
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it("should render LinkedIn action buttons when provided", () => {
      render(
        <DualPlatformTextFields
          {...defaultProps}
          linkedInActions={<button>Insert LinkedIn Template</button>}
        />
      );

      expect(screen.getByText("Insert LinkedIn Template")).toBeInTheDocument();
    });

    it("should render both action buttons when provided", () => {
      render(
        <DualPlatformTextFields
          {...defaultProps}
          twitterActions={<button>Twitter Action</button>}
          linkedInActions={<button>LinkedIn Action</button>}
        />
      );

      expect(screen.getByText("Twitter Action")).toBeInTheDocument();
      expect(screen.getByText("LinkedIn Action")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper aria-labels for textareas", () => {
      render(<DualPlatformTextFields {...defaultProps} />);

      const twitterTextarea = screen.getByLabelText("Twitter/X Content");
      const linkedInTextarea = screen.getByLabelText("LinkedIn Content");

      expect(twitterTextarea).toBeInTheDocument();
      expect(linkedInTextarea).toBeInTheDocument();
    });

    it("should have proper aria-describedby for character counters", () => {
      render(<DualPlatformTextFields {...defaultProps} />);

      const twitterTextarea = screen.getByPlaceholderText("What's happening?");
      const linkedInTextarea = screen.getByPlaceholderText("Share your professional insights...");

      expect(twitterTextarea).toHaveAttribute("aria-describedby", "twitter-char-count");
      expect(linkedInTextarea).toHaveAttribute("aria-describedby", "linkedin-char-count");
    });

    it("should mark textarea as invalid when over limit", () => {
      render(
        <DualPlatformTextFields
          {...defaultProps}
          twitterContent={"a".repeat(285)}
          twitterCharCount={285}
          linkedInContent={"a".repeat(3050)}
          linkedInCharCount={3050}
        />
      );

      const twitterTextarea = screen.getByPlaceholderText("What's happening?");
      const linkedInTextarea = screen.getByPlaceholderText("Share your professional insights...");

      expect(twitterTextarea).toHaveAttribute("aria-invalid", "true");
      expect(linkedInTextarea).toHaveAttribute("aria-invalid", "true");
    });

    it("should have proper aria-expanded on collapse buttons", () => {
      render(<DualPlatformTextFields {...defaultProps} />);

      const collapseButtons = screen.getAllByRole("button", {
        name: /collapse/i,
      });

      collapseButtons.forEach((button) => {
        expect(button).toHaveAttribute("aria-expanded", "true");
      });
    });

    it("should have proper aria-labels for toggle switches", () => {
      render(<DualPlatformTextFields {...defaultProps} />);

      const twitterToggle = screen.getByRole("switch", { name: "Toggle Twitter posting" });
      const linkedInToggle = screen.getByRole("switch", { name: "Toggle LinkedIn posting" });

      expect(twitterToggle).toBeInTheDocument();
      expect(linkedInToggle).toBeInTheDocument();
    });
  });

  describe("Smart Content Pre-population (Story 5.2)", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it("should show pre-fill button after 2 second debounce when Twitter has content and LinkedIn is empty", async () => {
      const { rerender } = render(<DualPlatformTextFields {...defaultProps} />);

      // Initially no button
      expect(screen.queryByText("Pre-fill LinkedIn")).not.toBeInTheDocument();

      // Add Twitter content
      rerender(
        <DualPlatformTextFields
          {...defaultProps}
          twitterContent="Hello Twitter"
          linkedInContent=""
        />
      );

      // Button should not appear immediately
      expect(screen.queryByText("Pre-fill LinkedIn")).not.toBeInTheDocument();

      // Fast-forward 2 seconds for debounce
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Now button should appear
      await waitFor(() => {
        expect(screen.getByText("Pre-fill LinkedIn")).toBeInTheDocument();
      });
    });

    it("should NOT show pre-fill button when LinkedIn has content", async () => {
      render(
        <DualPlatformTextFields
          {...defaultProps}
          twitterContent="Hello Twitter"
          linkedInContent="Already has content"
        />
      );

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.queryByText("Pre-fill LinkedIn")).not.toBeInTheDocument();
      });
    });

    it("should NOT show pre-fill button when Twitter is empty", async () => {
      render(
        <DualPlatformTextFields
          {...defaultProps}
          twitterContent=""
          linkedInContent=""
        />
      );

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.queryByText("Pre-fill LinkedIn")).not.toBeInTheDocument();
      });
    });

    it("should NOT show pre-fill button when LinkedIn is disabled", async () => {
      render(
        <DualPlatformTextFields
          {...defaultProps}
          twitterContent="Hello Twitter"
          linkedInContent=""
          linkedInEnabled={false}
        />
      );

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.queryByText("Pre-fill LinkedIn")).not.toBeInTheDocument();
      });
    });

    it("should copy Twitter content to LinkedIn when pre-fill button is clicked", async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <DualPlatformTextFields
          {...defaultProps}
          twitterContent="Hello Twitter"
          linkedInContent=""
        />
      );

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText("Pre-fill LinkedIn")).toBeInTheDocument();
      });

      const preFillButton = screen.getByText("Pre-fill LinkedIn");
      await user.click(preFillButton);

      expect(mockLinkedInChange).toHaveBeenCalledWith("Hello Twitter");
    });

    it("should show success toast after pre-fill", async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <DualPlatformTextFields
          {...defaultProps}
          twitterContent="Hello Twitter"
          linkedInContent=""
        />
      );

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText("Pre-fill LinkedIn")).toBeInTheDocument();
      });

      const preFillButton = screen.getByText("Pre-fill LinkedIn");
      await user.click(preFillButton);

      expect(toast.success).toHaveBeenCalledWith("Pre-filled from Twitter", {
        description: "LinkedIn content has been populated with your Twitter content",
        duration: 3000,
      });
    });

    it("should NOT show pre-fill button when user preference is disabled", async () => {
      mockUseQuery.mockReturnValue({ enableContentPrePopulation: false });

      render(
        <DualPlatformTextFields
          {...defaultProps}
          twitterContent="Hello Twitter"
          linkedInContent=""
        />
      );

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.queryByText("Pre-fill LinkedIn")).not.toBeInTheDocument();
      });
    });

    it("should default to showing button when preferences haven't loaded yet", async () => {
      mockUseQuery.mockReturnValue(null);

      render(
        <DualPlatformTextFields
          {...defaultProps}
          twitterContent="Hello Twitter"
          linkedInContent=""
        />
      );

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText("Pre-fill LinkedIn")).toBeInTheDocument();
      });
    });

    it("should have proper aria-label on pre-fill button", async () => {
      render(
        <DualPlatformTextFields
          {...defaultProps}
          twitterContent="Hello Twitter"
          linkedInContent=""
        />
      );

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        const button = screen.getByRole("button", { name: "Copy Twitter content to LinkedIn" });
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe("LinkedIn Formatting Hints Integration", () => {
    // Mock localStorage
    let localStorageMock: { [key: string]: string } = {};

    beforeEach(() => {
      localStorageMock = {};
      global.Storage.prototype.getItem = jest.fn((key) => localStorageMock[key] || null);
      global.Storage.prototype.setItem = jest.fn((key, value) => {
        localStorageMock[key] = value;
      });
    });

    it("should show LinkedIn hints by default on first render", () => {
      render(<DualPlatformTextFields {...defaultProps} />);

      expect(screen.getByText("Formatting Tips")).toBeInTheDocument();
    });

    it("should restore hint visibility from localStorage on mount", () => {
      // Set localStorage to hide hints
      localStorageMock["linkedin-hints-visible"] = "false";

      render(<DualPlatformTextFields {...defaultProps} />);

      expect(screen.queryByText("Formatting Tips")).not.toBeInTheDocument();
    });

    it("should show hints when localStorage preference is true", () => {
      localStorageMock["linkedin-hints-visible"] = "true";

      render(<DualPlatformTextFields {...defaultProps} />);

      expect(screen.getByText("Formatting Tips")).toBeInTheDocument();
    });

    it("should persist hint dismissal to localStorage", async () => {
      const user = userEvent.setup();
      render(<DualPlatformTextFields {...defaultProps} />);

      const dismissButton = screen.getByLabelText("Dismiss hints");
      await user.click(dismissButton);

      expect(localStorage.setItem).toHaveBeenCalledWith("linkedin-hints-visible", "false");
    });

    it("should hide hints after dismissal", async () => {
      const user = userEvent.setup();
      render(<DualPlatformTextFields {...defaultProps} />);

      expect(screen.getByText("Formatting Tips")).toBeInTheDocument();

      const dismissButton = screen.getByLabelText("Dismiss hints");
      await user.click(dismissButton);

      expect(screen.queryByText("Formatting Tips")).not.toBeInTheDocument();
    });

    it("should update context-aware hints as user types in LinkedIn textarea", async () => {
      const { rerender } = render(<DualPlatformTextFields {...defaultProps} linkedInContent="" />);

      // Initially, no context-aware hints
      expect(screen.queryByText("Consider adding relevant hashtags")).not.toBeInTheDocument();

      // Type 101 characters without hashtags
      const longContent = "a".repeat(101);
      rerender(<DualPlatformTextFields {...defaultProps} linkedInContent={longContent} />);

      // Context-aware hashtag hint should appear
      expect(screen.getByText("Consider adding relevant hashtags")).toBeInTheDocument();
    });

    it("should show line break hint when typing long content without line breaks", async () => {
      const { rerender } = render(<DualPlatformTextFields {...defaultProps} linkedInContent="" />);

      // Initially, no line break hint
      expect(screen.queryByText("Add line breaks to improve readability")).not.toBeInTheDocument();

      // Type 201 characters without line breaks
      const longContent = "a".repeat(201);
      rerender(<DualPlatformTextFields {...defaultProps} linkedInContent={longContent} />);

      // Context-aware line break hint should appear
      expect(screen.getByText("Add line breaks to improve readability")).toBeInTheDocument();
    });

    it("should remove context-aware hints when conditions are no longer met", async () => {
      const longContent = "a".repeat(101);
      const { rerender } = render(
        <DualPlatformTextFields {...defaultProps} linkedInContent={longContent} />
      );

      // Hashtag hint should be present
      expect(screen.getByText("Consider adding relevant hashtags")).toBeInTheDocument();

      // Add hashtag to content
      const contentWithHashtag = longContent + " #test";
      rerender(<DualPlatformTextFields {...defaultProps} linkedInContent={contentWithHashtag} />);

      // Hashtag hint should disappear
      expect(screen.queryByText("Consider adding relevant hashtags")).not.toBeInTheDocument();
    });

    it("should show multiple context-aware hints when multiple conditions are met", async () => {
      const longContent = "a".repeat(250); // > 200 chars, no hashtags, no line breaks
      render(<DualPlatformTextFields {...defaultProps} linkedInContent={longContent} />);

      expect(screen.getByText("Consider adding relevant hashtags")).toBeInTheDocument();
      expect(screen.getByText("Add line breaks to improve readability")).toBeInTheDocument();
    });

    it("should not modify LinkedIn content automatically", async () => {
      const user = userEvent.setup();
      render(<DualPlatformTextFields {...defaultProps} />);

      const linkedInTextarea = screen.getByPlaceholderText("Share your professional insights...");
      await user.type(linkedInTextarea, "Test content");

      // onLinkedInChange should be called for each character typed
      expect(mockLinkedInChange).toHaveBeenCalled();
      // But the hint component should never call it
      const callCount = mockLinkedInChange.mock.calls.length;
      expect(callCount).toBe("Test content".length); // Only user typing, not hints
    });

    it("should not block LinkedIn textarea interaction when hints are visible", async () => {
      const user = userEvent.setup();
      render(<DualPlatformTextFields {...defaultProps} />);

      // Hints should be visible
      expect(screen.getByText("Formatting Tips")).toBeInTheDocument();

      // Should still be able to type in LinkedIn textarea
      const linkedInTextarea = screen.getByPlaceholderText("Share your professional insights...");
      await user.click(linkedInTextarea);
      await user.type(linkedInTextarea, "Test");

      expect(mockLinkedInChange).toHaveBeenCalled();
      expect(linkedInTextarea).toHaveFocus();
    });

    it("should not show hints when LinkedIn section is collapsed", async () => {
      const user = userEvent.setup();
      render(<DualPlatformTextFields {...defaultProps} />);

      // Initially hints should be visible
      expect(screen.getByText("Formatting Tips")).toBeInTheDocument();

      // Collapse LinkedIn section
      const linkedInCollapseButton = screen.getByRole("button", {
        name: "Collapse LinkedIn section",
      });
      await user.click(linkedInCollapseButton);

      // Hints should not be visible when section is collapsed
      expect(screen.queryByText("Formatting Tips")).not.toBeInTheDocument();
    });

    it("should show static formatting hints at all times (when visible and not dismissed)", () => {
      render(<DualPlatformTextFields {...defaultProps} linkedInContent="" />);

      // Static hints should always be present
      expect(screen.getByText("Use line breaks for readability")).toBeInTheDocument();
      expect(screen.getByText("Add emojis for engagement")).toBeInTheDocument();
      expect(screen.getByText("Include hashtags at the end")).toBeInTheDocument();
    });

    it("should show hints only in LinkedIn section, not Twitter section", () => {
      render(<DualPlatformTextFields {...defaultProps} />);

      // Hints should appear only once (in LinkedIn section)
      const formattingTips = screen.getByText("Formatting Tips");
      expect(formattingTips).toBeInTheDocument();

      // Should not be duplicated in Twitter section
      const allFormattingTips = screen.getAllByText("Formatting Tips");
      expect(allFormattingTips).toHaveLength(1);
    });

    it("should not interfere with character counter display", () => {
      const { container } = render(
        <DualPlatformTextFields
          {...defaultProps}
          linkedInContent="Test content"
        />
      );

      // Both hints and character counter should be visible
      expect(screen.getByText("Formatting Tips")).toBeInTheDocument();
      // Character counter should still be present in LinkedIn section
      const linkedInSection = container.querySelector('#linkedin-char-count');
      expect(linkedInSection).toBeInTheDocument();
      expect(linkedInSection).toHaveTextContent("12");
    });
  });
});
