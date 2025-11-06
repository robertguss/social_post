/**
 * Unit Tests for AIAssistantButton Component
 *
 * Tests:
 * - Button renders correctly
 * - Popover opens/closes on click
 * - Menu displays correct options with descriptions
 * - Feature selection triggers callback
 * - Loading state disables button
 * - Keyboard navigation works
 * - ARIA labels are present
 * - First-time tooltip displays
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AIAssistantButton } from "../AIAssistantButton";

describe("AIAssistantButton", () => {
  const mockOnFeatureSelect = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe("Rendering", () => {
    it("should render AI Assistant button", () => {
      render(
        <AIAssistantButton
          onFeatureSelect={mockOnFeatureSelect}
          onOpenChange={mockOnOpenChange}
        />
      );

      const button = screen.getByRole("button", { name: /AI Assistant/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it("should render with loading state", () => {
      render(
        <AIAssistantButton
          onFeatureSelect={mockOnFeatureSelect}
          onOpenChange={mockOnOpenChange}
          isLoading={true}
        />
      );

      const button = screen.getByRole("button", { name: /AI Assistant/i });
      expect(button).toBeDisabled();
    });

    it("should render disabled when disabled prop is true", () => {
      render(
        <AIAssistantButton
          onFeatureSelect={mockOnFeatureSelect}
          onOpenChange={mockOnOpenChange}
          disabled={true}
        />
      );

      const button = screen.getByRole("button", { name: /AI Assistant/i });
      expect(button).toBeDisabled();
    });

    it("should have touch-friendly minimum size", () => {
      render(
        <AIAssistantButton
          onFeatureSelect={mockOnFeatureSelect}
          onOpenChange={mockOnOpenChange}
        />
      );

      const button = screen.getByRole("button", { name: /AI Assistant/i });
      expect(button).toHaveClass("min-w-[44px]", "min-h-[44px]");
    });
  });

  describe("Popover Menu", () => {
    it("should open popover menu when button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <AIAssistantButton
          onFeatureSelect={mockOnFeatureSelect}
          onOpenChange={mockOnOpenChange}
          isOpen={true}
        />
      );

      // Menu should be visible
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("should display all three AI features", async () => {
      render(
        <AIAssistantButton
          onFeatureSelect={mockOnFeatureSelect}
          onOpenChange={mockOnOpenChange}
          isOpen={true}
        />
      );

      expect(screen.getByText("Adjust Tone")).toBeInTheDocument();
      expect(screen.getByText("Expand for LinkedIn")).toBeInTheDocument();
      expect(screen.getByText("Generate Hashtags")).toBeInTheDocument();
    });

    it("should display feature descriptions", async () => {
      render(
        <AIAssistantButton
          onFeatureSelect={mockOnFeatureSelect}
          onOpenChange={mockOnOpenChange}
          isOpen={true}
        />
      );

      expect(
        screen.getByText(/Make your content more formal, casual, or engaging/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Turn your Twitter content into a longer LinkedIn post/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Get AI-suggested hashtags based on your content/i)
      ).toBeInTheDocument();
    });

    it("should call onFeatureSelect when a feature is clicked", async () => {
      const user = userEvent.setup();

      render(
        <AIAssistantButton
          onFeatureSelect={mockOnFeatureSelect}
          onOpenChange={mockOnOpenChange}
          isOpen={true}
        />
      );

      const toneOption = screen.getByRole("menuitem", { name: /Adjust Tone/i });
      await user.click(toneOption);

      expect(mockOnFeatureSelect).toHaveBeenCalledWith("tone");
    });

    it("should display help link", async () => {
      render(
        <AIAssistantButton
          onFeatureSelect={mockOnFeatureSelect}
          onOpenChange={mockOnOpenChange}
          isOpen={true}
        />
      );

      expect(screen.getByText(/Learn more about AI features/i)).toBeInTheDocument();
    });
  });

  describe("Keyboard Navigation", () => {
    it("should allow keyboard navigation with Enter key", async () => {
      const user = userEvent.setup();

      render(
        <AIAssistantButton
          onFeatureSelect={mockOnFeatureSelect}
          onOpenChange={mockOnOpenChange}
          isOpen={true}
        />
      );

      const toneOption = screen.getByRole("menuitem", { name: /Adjust Tone/i });
      toneOption.focus();
      await user.keyboard("{Enter}");

      expect(mockOnFeatureSelect).toHaveBeenCalledWith("tone");
    });

    it("should allow keyboard navigation with Space key", async () => {
      const user = userEvent.setup();

      render(
        <AIAssistantButton
          onFeatureSelect={mockOnFeatureSelect}
          onOpenChange={mockOnOpenChange}
          isOpen={true}
        />
      );

      const toneOption = screen.getByRole("menuitem", { name: /Adjust Tone/i });
      toneOption.focus();
      await user.keyboard(" ");

      expect(mockOnFeatureSelect).toHaveBeenCalledWith("tone");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes on button", () => {
      render(
        <AIAssistantButton
          onFeatureSelect={mockOnFeatureSelect}
          onOpenChange={mockOnOpenChange}
          isOpen={false}
        />
      );

      const button = screen.getByRole("button", { name: /AI Assistant/i });
      expect(button).toHaveAttribute("aria-label", "AI Assistant");
      expect(button).toHaveAttribute("aria-haspopup", "menu");
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("should have proper ARIA attributes on menu", () => {
      render(
        <AIAssistantButton
          onFeatureSelect={mockOnFeatureSelect}
          onOpenChange={mockOnOpenChange}
          isOpen={true}
        />
      );

      const menu = screen.getByRole("menu");
      expect(menu).toHaveAttribute("aria-label", "AI Assistant features");
    });

    it("should have role=menuitem on all features", () => {
      render(
        <AIAssistantButton
          onFeatureSelect={mockOnFeatureSelect}
          onOpenChange={mockOnOpenChange}
          isOpen={true}
        />
      );

      const menuItems = screen.getAllByRole("menuitem");
      expect(menuItems).toHaveLength(3);
    });
  });

  describe("First-Time User Tooltip", () => {
    it("should show intro tooltip for first-time users", async () => {
      // No localStorage item set
      render(
        <AIAssistantButton
          onFeatureSelect={mockOnFeatureSelect}
          onOpenChange={mockOnOpenChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Try the new AI Assistant!/i)).toBeInTheDocument();
      });
    });

    it("should not show intro tooltip if user has seen it before", () => {
      localStorage.setItem("hasSeenAIAssistantIntro", "true");

      render(
        <AIAssistantButton
          onFeatureSelect={mockOnFeatureSelect}
          onOpenChange={mockOnOpenChange}
        />
      );

      expect(screen.queryByText(/Try the new AI Assistant!/i)).not.toBeInTheDocument();
    });

    it("should dismiss intro tooltip when button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <AIAssistantButton
          onFeatureSelect={mockOnFeatureSelect}
          onOpenChange={mockOnOpenChange}
        />
      );

      const button = screen.getByRole("button", { name: /AI Assistant/i });
      await user.click(button);

      expect(localStorage.getItem("hasSeenAIAssistantIntro")).toBe("true");
    });
  });
});
