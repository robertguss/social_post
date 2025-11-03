import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PreviewModal } from "../PreviewModal";

interface TwitterPreviewProps {
  content: string;
  url?: string;
  characterCount: number;
}

interface LinkedInPreviewProps {
  content: string;
  url?: string;
}

// Mock the preview components
jest.mock("../previews/TwitterPreview", () => ({
  TwitterPreview: ({ content, url, characterCount }: TwitterPreviewProps) => (
    <div data-testid="twitter-preview">
      <div data-testid="twitter-content">{content}</div>
      <div data-testid="twitter-char-count">{characterCount}</div>
      {url && <div data-testid="twitter-url">{url}</div>}
    </div>
  ),
}));

jest.mock("../previews/LinkedInPreview", () => ({
  LinkedInPreview: ({ content, url }: LinkedInPreviewProps) => (
    <div data-testid="linkedin-preview">
      <div data-testid="linkedin-content">{content}</div>
      {url && <div data-testid="linkedin-url">{url}</div>}
    </div>
  ),
}));

describe("PreviewModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    twitterContent: "Test Twitter content",
    linkedInContent: "Test LinkedIn content",
    url: "",
    twitterEnabled: true,
    linkedInEnabled: true,
    twitterCharacterCount: 20,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Modal Open/Close Behavior", () => {
    it("should render when isOpen is true", () => {
      render(<PreviewModal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should call onClose when dialog is closed", async () => {
      const onClose = jest.fn();
      render(<PreviewModal {...defaultProps} onClose={onClose} />);

      // Find and click the close button (X button in DialogPrimitive)
      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe("Content Display", () => {
    it("should show both previews when both platforms are enabled", () => {
      render(<PreviewModal {...defaultProps} />);

      expect(screen.getByTestId("twitter-preview")).toBeInTheDocument();
      expect(screen.getByTestId("linkedin-preview")).toBeInTheDocument();
    });

    it("should show only Twitter preview when only Twitter is enabled", () => {
      render(
        <PreviewModal {...defaultProps} linkedInEnabled={false} />
      );

      expect(screen.getByTestId("twitter-preview")).toBeInTheDocument();
      expect(screen.queryByTestId("linkedin-preview")).not.toBeInTheDocument();
    });

    it("should show only LinkedIn preview when only LinkedIn is enabled", () => {
      render(
        <PreviewModal {...defaultProps} twitterEnabled={false} />
      );

      expect(screen.queryByTestId("twitter-preview")).not.toBeInTheDocument();
      expect(screen.getByTestId("linkedin-preview")).toBeInTheDocument();
    });

    it("should display empty state when no content is provided", () => {
      render(
        <PreviewModal
          {...defaultProps}
          twitterContent=""
          linkedInContent=""
        />
      );

      expect(
        screen.getByText(/No content to preview/i)
      ).toBeInTheDocument();
      expect(screen.queryByTestId("twitter-preview")).not.toBeInTheDocument();
      expect(screen.queryByTestId("linkedin-preview")).not.toBeInTheDocument();
    });
  });

  describe("Props Passing", () => {
    it("should pass correct props to TwitterPreview", () => {
      const twitterContent = "Twitter test content";
      const url = "https://example.com";
      const characterCount = 20;

      render(
        <PreviewModal
          {...defaultProps}
          twitterContent={twitterContent}
          url={url}
          twitterCharacterCount={characterCount}
        />
      );

      expect(screen.getByTestId("twitter-content")).toHaveTextContent(
        twitterContent
      );
      expect(screen.getByTestId("twitter-char-count")).toHaveTextContent(
        characterCount.toString()
      );
      expect(screen.getByTestId("twitter-url")).toHaveTextContent(url);
    });

    it("should pass correct props to LinkedInPreview", () => {
      const linkedInContent = "LinkedIn test content";
      const url = "https://example.com";

      render(
        <PreviewModal
          {...defaultProps}
          linkedInContent={linkedInContent}
          url={url}
        />
      );

      expect(screen.getByTestId("linkedin-content")).toHaveTextContent(
        linkedInContent
      );
      expect(screen.getByTestId("linkedin-url")).toHaveTextContent(url);
    });
  });

  describe("Dynamic Updates", () => {
    it("should update preview when content changes", () => {
      const { rerender } = render(<PreviewModal {...defaultProps} />);

      expect(screen.getByTestId("twitter-content")).toHaveTextContent(
        "Test Twitter content"
      );

      // Update with new content
      rerender(
        <PreviewModal
          {...defaultProps}
          twitterContent="Updated Twitter content"
        />
      );

      expect(screen.getByTestId("twitter-content")).toHaveTextContent(
        "Updated Twitter content"
      );
    });

    it("should update character count when it changes", () => {
      const { rerender } = render(<PreviewModal {...defaultProps} />);

      expect(screen.getByTestId("twitter-char-count")).toHaveTextContent("20");

      // Update with new character count
      rerender(
        <PreviewModal {...defaultProps} twitterCharacterCount={50} />
      );

      expect(screen.getByTestId("twitter-char-count")).toHaveTextContent("50");
    });

    it("should show/hide previews when platform enabled state changes", () => {
      const { rerender } = render(<PreviewModal {...defaultProps} />);

      expect(screen.getByTestId("twitter-preview")).toBeInTheDocument();
      expect(screen.getByTestId("linkedin-preview")).toBeInTheDocument();

      // Disable Twitter
      rerender(<PreviewModal {...defaultProps} twitterEnabled={false} />);

      expect(screen.queryByTestId("twitter-preview")).not.toBeInTheDocument();
      expect(screen.getByTestId("linkedin-preview")).toBeInTheDocument();
    });
  });

  describe("Responsive Layout", () => {
    it("should apply correct grid layout classes for both platforms", () => {
      const { container } = render(<PreviewModal {...defaultProps} />);

      // Check for the grid container with responsive classes
      const gridContainer = container.querySelector(
        ".grid.grid-cols-1.lg\\:grid-cols-2"
      );
      expect(gridContainer).toBeInTheDocument();
    });

    it("should apply single column layout when only one platform is enabled", () => {
      const { container } = render(
        <PreviewModal {...defaultProps} linkedInEnabled={false} />
      );

      // Check for single column centered layout
      const gridContainer = container.querySelector(
        ".grid.grid-cols-1.max-w-2xl.mx-auto"
      );
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper dialog role", () => {
      render(<PreviewModal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should have dialog title", () => {
      render(<PreviewModal {...defaultProps} />);
      expect(
        screen.getByRole("heading", { name: /Preview/i })
      ).toBeInTheDocument();
    });

    it("should have dialog description", () => {
      render(<PreviewModal {...defaultProps} />);
      expect(
        screen.getByText(/See how your content will appear on each platform/i)
      ).toBeInTheDocument();
    });
  });
});
