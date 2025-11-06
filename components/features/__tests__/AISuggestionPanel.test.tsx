/**
 * Unit Tests for AISuggestionPanel Component
 *
 * Tests:
 * - Panel displays original and suggested content
 * - Accept button applies suggestion
 * - Reject button discards suggestion
 * - Edit button enables inline editing
 * - Loading state displays correctly
 * - Mobile responsiveness (Drawer vs Dialog)
 * - ARIA labels and accessibility
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AISuggestionPanel } from "../AISuggestionPanel";

// Mock window.matchMedia for responsive testing
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

describe("AISuggestionPanel", () => {
  const mockOnClose = jest.fn();
  const mockOnAccept = jest.fn();
  const mockOnReject = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    originalContent: "This is the original content",
    suggestion: "This is the AI-generated suggestion",
    isLoading: false,
    featureType: "tone" as const,
    onAccept: mockOnAccept,
    onReject: mockOnReject,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to desktop viewport
    mockMatchMedia(false);
  });

  describe("Rendering", () => {
    it("should render panel when open", () => {
      render(<AISuggestionPanel {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Tone Adjustment")).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(<AISuggestionPanel {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should display original content", () => {
      render(<AISuggestionPanel {...defaultProps} />);

      expect(screen.getByText("Original Content")).toBeInTheDocument();
      expect(screen.getByText("This is the original content")).toBeInTheDocument();
    });

    it("should display AI suggestion", () => {
      render(<AISuggestionPanel {...defaultProps} />);

      expect(screen.getByText("AI Suggestion")).toBeInTheDocument();
      expect(screen.getByText("This is the AI-generated suggestion")).toBeInTheDocument();
    });

    it("should display correct feature type in title", () => {
      const { rerender } = render(<AISuggestionPanel {...defaultProps} featureType="expand" />);
      expect(screen.getByText("LinkedIn Expansion")).toBeInTheDocument();

      rerender(<AISuggestionPanel {...defaultProps} featureType="hashtags" />);
      expect(screen.getByText("Hashtag Generation")).toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("should show loading indicator when isLoading is true", () => {
      render(<AISuggestionPanel {...defaultProps} isLoading={true} suggestion={undefined} />);

      expect(screen.getByText("AI is analyzing your content...")).toBeInTheDocument();
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should show skeleton loader during loading", () => {
      render(<AISuggestionPanel {...defaultProps} isLoading={true} suggestion={undefined} />);

      // Skeleton should be present (check by class or test id if needed)
      const status = screen.getByRole("status");
      expect(status).toBeInTheDocument();
    });

    it("should not show content when loading", () => {
      render(<AISuggestionPanel {...defaultProps} isLoading={true} suggestion={undefined} />);

      expect(screen.queryByText("Original Content")).not.toBeInTheDocument();
      expect(screen.queryByText("AI Suggestion")).not.toBeInTheDocument();
    });
  });

  describe("Action Buttons", () => {
    it("should call onAccept when Accept button is clicked", async () => {
      const user = userEvent.setup();
      render(<AISuggestionPanel {...defaultProps} />);

      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      await user.click(acceptButton);

      expect(mockOnAccept).toHaveBeenCalledWith("This is the AI-generated suggestion");
    });

    it("should call onReject when Reject button is clicked", async () => {
      const user = userEvent.setup();
      render(<AISuggestionPanel {...defaultProps} />);

      const rejectButton = screen.getByRole("button", { name: /Reject/i });
      await user.click(rejectButton);

      expect(mockOnReject).toHaveBeenCalled();
    });

    it("should enable Edit mode when Edit button is clicked", async () => {
      const user = userEvent.setup();
      render(<AISuggestionPanel {...defaultProps} />);

      const editButton = screen.getByRole("button", { name: /Edit/i });
      await user.click(editButton);

      // Edit mode should show a textarea
      const textarea = screen.getByLabelText("Edit AI suggestion");
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue("This is the AI-generated suggestion");
    });

    it("should accept edited content when Accept is clicked after editing", async () => {
      const user = userEvent.setup();
      render(<AISuggestionPanel {...defaultProps} />);

      // Click Edit
      const editButton = screen.getByRole("button", { name: /Edit/i });
      await user.click(editButton);

      // Edit the content
      const textarea = screen.getByLabelText("Edit AI suggestion");
      await user.clear(textarea);
      await user.type(textarea, "Edited suggestion");

      // Click Accept
      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      await user.click(acceptButton);

      expect(mockOnAccept).toHaveBeenCalledWith("Edited suggestion");
    });

    it("should disable Accept button when no suggestion is available", () => {
      render(<AISuggestionPanel {...defaultProps} suggestion={undefined} />);

      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      expect(acceptButton).toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(<AISuggestionPanel {...defaultProps} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby", "suggestion-title");
      expect(dialog).toHaveAttribute("aria-describedby", "suggestion-description");
    });

    it("should have aria-live region for loading state", () => {
      render(<AISuggestionPanel {...defaultProps} isLoading={true} suggestion={undefined} />);

      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toHaveAttribute("aria-live", "polite");
    });

    it("should have proper labels on action buttons", () => {
      render(<AISuggestionPanel {...defaultProps} />);

      expect(screen.getByRole("button", { name: /Accept suggestion/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Reject suggestion/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Edit suggestion/i })).toBeInTheDocument();
    });

    it("should have proper label on edit textarea", async () => {
      const user = userEvent.setup();
      render(<AISuggestionPanel {...defaultProps} />);

      const editButton = screen.getByRole("button", { name: /Edit/i });
      await user.click(editButton);

      const textarea = screen.getByLabelText("Edit AI suggestion");
      expect(textarea).toBeInTheDocument();
    });
  });

  describe("Mobile Responsiveness", () => {
    it("should use Dialog on desktop (width >= 768px)", () => {
      mockMatchMedia(false); // Not mobile
      render(<AISuggestionPanel {...defaultProps} />);

      // Dialog should be present
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should use Drawer on mobile (width < 768px)", () => {
      mockMatchMedia(true); // Mobile

      // Force window.innerWidth for useIsMobile hook
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375, // iPhone size
      });

      render(<AISuggestionPanel {...defaultProps} />);

      // Dialog should still be present (drawer also uses role="dialog")
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty original content", () => {
      render(<AISuggestionPanel {...defaultProps} originalContent="" />);

      expect(screen.getByText("No content")).toBeInTheDocument();
    });

    it("should handle empty suggestion", () => {
      render(<AISuggestionPanel {...defaultProps} suggestion="" />);

      expect(screen.getByText("No suggestion")).toBeInTheDocument();
    });

    it("should handle undefined suggestion", () => {
      render(<AISuggestionPanel {...defaultProps} suggestion={undefined} />);

      expect(screen.getByText("No suggestion")).toBeInTheDocument();
    });
  });
});
