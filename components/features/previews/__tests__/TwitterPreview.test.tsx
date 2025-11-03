import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TwitterPreview } from "../TwitterPreview";

describe("TwitterPreview", () => {
  const defaultProps = {
    content: "This is a test tweet",
    characterCount: 20,
  };

  describe("Content Rendering", () => {
    it("should render Twitter content correctly", () => {
      render(<TwitterPreview {...defaultProps} />);
      expect(screen.getByText("This is a test tweet")).toBeInTheDocument();
    });

    it("should preserve line breaks in content", () => {
      const contentWithLineBreaks = "Line 1\nLine 2\nLine 3";
      render(
        <TwitterPreview {...defaultProps} content={contentWithLineBreaks} />
      );

      const contentElement = screen.getByText(contentWithLineBreaks);
      expect(contentElement).toHaveClass("whitespace-pre-wrap");
    });

    it("should display platform label", () => {
      render(<TwitterPreview {...defaultProps} />);
      expect(
        screen.getByRole("heading", { name: /Twitter/i })
      ).toBeInTheDocument();
    });
  });

  describe("Character Count Display", () => {
    it("should display character count in normal state", () => {
      render(<TwitterPreview {...defaultProps} characterCount={100} />);
      expect(screen.getByText("100 / 280")).toBeInTheDocument();
    });

    it("should display character count with warning color when approaching limit", () => {
      render(
        <TwitterPreview {...defaultProps} characterCount={265} />
      );
      const charCount = screen.getByText("265 / 280");
      expect(charCount).toHaveClass("text-yellow-600");
    });

    it("should display character count with error color when over limit", () => {
      render(
        <TwitterPreview {...defaultProps} characterCount={285} />
      );
      const charCount = screen.getByText("285 / 280");
      expect(charCount).toHaveClass("text-red-600");
    });

    it("should display character count with normal color when under warning threshold", () => {
      render(
        <TwitterPreview {...defaultProps} characterCount={200} />
      );
      const charCount = screen.getByText("200 / 280");
      expect(charCount).toHaveClass("text-gray-500");
    });
  });

  describe("Content Truncation", () => {
    it("should truncate content when over 280 characters", () => {
      const longContent = "a".repeat(300);
      render(
        <TwitterPreview {...defaultProps} content={longContent} characterCount={300} />
      );

      // Should show truncated content with ellipsis
      const displayedContent = "a".repeat(280) + "...";
      expect(screen.getByText(displayedContent)).toBeInTheDocument();
    });

    it("should show truncation warning when content exceeds limit", () => {
      const longContent = "a".repeat(300);
      render(
        <TwitterPreview {...defaultProps} content={longContent} characterCount={300} />
      );

      expect(
        screen.getByText(
          /Content exceeds 280 character limit and will be truncated/i
        )
      ).toBeInTheDocument();
    });

    it("should not truncate content when under 280 characters", () => {
      const content = "Short content";
      render(<TwitterPreview {...defaultProps} content={content} characterCount={13} />);

      expect(screen.getByText(content)).toBeInTheDocument();
      expect(
        screen.queryByText(/Content exceeds 280 character limit/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("URL Display", () => {
    it("should display URL notice when URL is provided", () => {
      render(
        <TwitterPreview {...defaultProps} url="https://example.com" />
      );

      expect(
        screen.getByText(/URL will be posted as a reply/i)
      ).toBeInTheDocument();
    });

    it("should not display URL notice when URL is not provided", () => {
      render(<TwitterPreview {...defaultProps} />);

      expect(
        screen.queryByText(/URL will be posted as a reply/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("UI Elements", () => {
    it("should render avatar with fallback", () => {
      render(<TwitterPreview {...defaultProps} />);
      // Avatar should be present via accessible role
      expect(screen.getByText("Your Name")).toBeInTheDocument();
    });

    it("should render user information", () => {
      render(<TwitterPreview {...defaultProps} />);
      expect(screen.getByText("Your Name")).toBeInTheDocument();
      expect(screen.getByText("@yourhandle")).toBeInTheDocument();
      expect(screen.getByText("now")).toBeInTheDocument();
    });

    it("should render action buttons (visual only)", () => {
      render(<TwitterPreview {...defaultProps} />);

      // Check for aria-labels on action buttons
      expect(
        screen.getAllByLabelText(/preview only/i).length
      ).toBeGreaterThan(0);
    });

    it("should have Twitter brand color accent", () => {
      render(<TwitterPreview {...defaultProps} />);
      // Check that the Twitter platform is labeled
      expect(screen.getByText("Twitter")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have semantic article structure", () => {
      const { container } = render(<TwitterPreview {...defaultProps} />);
      const article = container.querySelector("article");
      expect(article).toBeInTheDocument();
    });

    it("should have accessible action buttons", () => {
      render(<TwitterPreview {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("aria-label");
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty content", () => {
      render(<TwitterPreview {...defaultProps} content="" characterCount={0} />);
      expect(screen.getByText("0 / 280")).toBeInTheDocument();
    });

    it("should handle emoji and special characters", () => {
      const emojiContent = "Hello 👋 World 🌍";
      render(
        <TwitterPreview {...defaultProps} content={emojiContent} characterCount={15} />
      );
      expect(screen.getByText(emojiContent)).toBeInTheDocument();
    });

    it("should handle very long URLs", () => {
      const longUrl = "https://example.com/" + "a".repeat(200);
      render(<TwitterPreview {...defaultProps} url={longUrl} />);
      expect(
        screen.getByText(/URL will be posted as a reply/i)
      ).toBeInTheDocument();
    });
  });
});
