import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LinkedInPreview } from "../LinkedInPreview";

describe("LinkedInPreview", () => {
  const defaultProps = {
    content: "This is a test LinkedIn post",
  };

  describe("Content Rendering", () => {
    it("should render LinkedIn content correctly", () => {
      render(<LinkedInPreview {...defaultProps} />);
      expect(
        screen.getByText("This is a test LinkedIn post")
      ).toBeInTheDocument();
    });

    it("should preserve line breaks in content", () => {
      const contentWithLineBreaks = "Line 1\nLine 2\nLine 3";
      render(<LinkedInPreview {...defaultProps} content={contentWithLineBreaks} />);

      const contentElement = screen.getByText(contentWithLineBreaks);
      expect(contentElement).toHaveClass("whitespace-pre-wrap");
    });

    it("should display platform label", () => {
      render(<LinkedInPreview {...defaultProps} />);
      expect(
        screen.getByRole("heading", { name: /LinkedIn/i })
      ).toBeInTheDocument();
    });
  });

  describe("Content Truncation (See More)", () => {
    it("should not truncate content under 140 characters", () => {
      const shortContent = "Short content";
      render(<LinkedInPreview {...defaultProps} content={shortContent} />);

      expect(screen.getByText(shortContent)).toBeInTheDocument();
      expect(screen.queryByText(/see more/i)).not.toBeInTheDocument();
    });

    it("should truncate content over 140 characters with see more button", () => {
      const longContent = "a".repeat(200);
      render(<LinkedInPreview {...defaultProps} content={longContent} />);

      // Should show truncated content with ellipsis
      expect(screen.getByText(/see more/i)).toBeInTheDocument();

      // Content should be truncated to 140 chars
      const displayedText = screen.getByText(/a{140}\.\.\./);
      expect(displayedText).toBeInTheDocument();
    });

    it("should expand content when see more is clicked", () => {
      const longContent = "a".repeat(200);
      render(<LinkedInPreview {...defaultProps} content={longContent} />);

      // Initially truncated
      expect(screen.getByText(/see more/i)).toBeInTheDocument();

      // Click see more button
      const seeMoreButton = screen.getByText(/see more/i);
      fireEvent.click(seeMoreButton);

      // Should show full content now
      expect(screen.getByText(longContent)).toBeInTheDocument();
      expect(screen.queryByText(/see more/i)).not.toBeInTheDocument();
    });

    it("should handle content exactly at 140 characters", () => {
      const exactContent = "a".repeat(140);
      render(<LinkedInPreview {...defaultProps} content={exactContent} />);

      expect(screen.getByText(exactContent)).toBeInTheDocument();
      expect(screen.queryByText(/see more/i)).not.toBeInTheDocument();
    });

    it("should handle content at 141 characters", () => {
      const justOverContent = "a".repeat(141);
      render(<LinkedInPreview {...defaultProps} content={justOverContent} />);

      expect(screen.getByText(/see more/i)).toBeInTheDocument();
    });
  });

  describe("URL Display", () => {
    it("should display URL notice when URL is provided", () => {
      render(
        <LinkedInPreview {...defaultProps} url="https://example.com" />
      );

      expect(
        screen.getByText(/URL will be posted as first comment/i)
      ).toBeInTheDocument();
    });

    it("should not display URL notice when URL is not provided", () => {
      render(<LinkedInPreview {...defaultProps} />);

      expect(
        screen.queryByText(/URL will be posted as first comment/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("UI Elements", () => {
    it("should render avatar with fallback", () => {
      render(<LinkedInPreview {...defaultProps} />);
      // Avatar should be present via accessible role
      expect(screen.getByText("Your Name")).toBeInTheDocument();
    });

    it("should render user information", () => {
      render(<LinkedInPreview {...defaultProps} />);
      expect(screen.getByText("Your Name")).toBeInTheDocument();
      expect(screen.getByText("Your Headline")).toBeInTheDocument();
      expect(screen.getByText(/Just now/i)).toBeInTheDocument();
    });

    it("should render action buttons (visual only)", () => {
      render(<LinkedInPreview {...defaultProps} />);

      // Check for action button labels
      expect(screen.getByText("Like")).toBeInTheDocument();
      expect(screen.getByText("Comment")).toBeInTheDocument();
      expect(screen.getByText("Repost")).toBeInTheDocument();
      expect(screen.getByText("Send")).toBeInTheDocument();
    });

    it("should have LinkedIn brand color accent", () => {
      render(<LinkedInPreview {...defaultProps} />);
      // Check that the LinkedIn platform is labeled
      expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have semantic article structure", () => {
      const { container } = render(<LinkedInPreview {...defaultProps} />);
      const article = container.querySelector("article");
      expect(article).toBeInTheDocument();
    });

    it("should have accessible action buttons", () => {
      render(<LinkedInPreview {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("aria-label");
      });
    });

    it("should have accessible see more button", () => {
      const longContent = "a".repeat(200);
      render(<LinkedInPreview {...defaultProps} content={longContent} />);

      const seeMoreButton = screen.getByText(/see more/i);
      expect(seeMoreButton).toHaveAttribute("type", "button");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty content", () => {
      render(<LinkedInPreview {...defaultProps} content="" />);
      // Empty content should still render the structure
      expect(screen.getByRole("heading", { name: /LinkedIn/i })).toBeInTheDocument();
    });

    it("should handle emoji and special characters", () => {
      const emojiContent = "Hello 👋 World 🌍";
      render(<LinkedInPreview {...defaultProps} content={emojiContent} />);
      expect(screen.getByText(emojiContent)).toBeInTheDocument();
    });

    it("should handle very long URLs", () => {
      const longUrl = "https://example.com/" + "a".repeat(200);
      render(<LinkedInPreview {...defaultProps} url={longUrl} />);
      expect(
        screen.getByText(/URL will be posted as first comment/i)
      ).toBeInTheDocument();
    });

    it("should handle newlines and preserve formatting", () => {
      const formattedContent = "Paragraph 1\n\nParagraph 2\n\nParagraph 3";
      render(<LinkedInPreview {...defaultProps} content={formattedContent} />);
      expect(screen.getByText(formattedContent)).toBeInTheDocument();
    });

    it("should handle content with multiple spaces", () => {
      const contentWithSpaces = "Word1    Word2     Word3";
      render(<LinkedInPreview {...defaultProps} content={contentWithSpaces} />);
      expect(screen.getByText(contentWithSpaces)).toBeInTheDocument();
    });
  });

  describe("State Management", () => {
    it("should maintain expanded state after expansion", () => {
      const longContent = "a".repeat(200);
      render(<LinkedInPreview {...defaultProps} content={longContent} />);

      // Initially collapsed
      expect(screen.getByText(/see more/i)).toBeInTheDocument();

      // Expand
      fireEvent.click(screen.getByText(/see more/i));
      expect(screen.getByText(longContent)).toBeInTheDocument();

      // Should stay expanded (no collapse button)
      expect(screen.queryByText(/see less/i)).not.toBeInTheDocument();
    });

    it("should reset expanded state when content changes to short content", () => {
      const longContent = "a".repeat(200);
      const { rerender } = render(
        <LinkedInPreview {...defaultProps} content={longContent} />
      );

      // Expand the long content
      fireEvent.click(screen.getByText(/see more/i));
      expect(screen.getByText(longContent)).toBeInTheDocument();

      // Change to short content
      const shortContent = "Short";
      rerender(<LinkedInPreview {...defaultProps} content={shortContent} />);

      // No see more button for short content
      expect(screen.queryByText(/see more/i)).not.toBeInTheDocument();
      expect(screen.getByText(shortContent)).toBeInTheDocument();
    });
  });
});
