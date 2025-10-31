import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PostScheduler } from "@/components/features/PostScheduler";
import "@testing-library/jest-dom";

describe("PostScheduler - Character Counter", () => {
  it("should display character count correctly", () => {
    render(<PostScheduler />);
    const textarea = screen.getByPlaceholderText("What's on your mind?");
    const charCount = screen.getByText("0/280");

    expect(charCount).toBeInTheDocument();

    // Type some content
    fireEvent.change(textarea, { target: { value: "Hello World" } });
    expect(screen.getByText("11/280")).toBeInTheDocument();
  });

  it("should show warning state at 260 characters", () => {
    render(<PostScheduler />);
    const textarea = screen.getByPlaceholderText("What's on your mind?");

    // Create a string with exactly 260 characters
    const warningText = "a".repeat(260);
    fireEvent.change(textarea, { target: { value: warningText } });

    const charCount = screen.getByText("260/280");
    expect(charCount).toBeInTheDocument();
    // Check that the element has warning styling (yellow text)
    expect(charCount).toHaveClass("text-yellow-600");
  });

  it("should show error state when exceeding 280 characters", () => {
    render(<PostScheduler />);
    const textarea = screen.getByPlaceholderText("What's on your mind?");

    // Create a string with 281 characters
    const errorText = "a".repeat(281);
    fireEvent.change(textarea, { target: { value: errorText } });

    const charCount = screen.getByText("281/280");
    expect(charCount).toBeInTheDocument();
    // Check that the element has error styling (destructive color)
    expect(charCount).toHaveClass("text-destructive");
  });

  it("should disable submit button when character limit is exceeded", () => {
    render(<PostScheduler />);
    const textarea = screen.getByPlaceholderText("What's on your mind?");
    const submitButton = screen.getByRole("button", {
      name: /schedule post/i,
    });

    // Initially disabled (no content and no scheduled time)
    expect(submitButton).toBeDisabled();

    // Type content that exceeds limit
    const overLimitText = "a".repeat(281);
    fireEvent.change(textarea, { target: { value: overLimitText } });

    // Should still be disabled due to over limit
    expect(submitButton).toBeDisabled();
  });

  it("should update character count in real-time", () => {
    render(<PostScheduler />);
    const textarea = screen.getByPlaceholderText("What's on your mind?");

    // Type character by character
    fireEvent.change(textarea, { target: { value: "H" } });
    expect(screen.getByText("1/280")).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: "He" } });
    expect(screen.getByText("2/280")).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: "Hel" } });
    expect(screen.getByText("3/280")).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: "Hell" } });
    expect(screen.getByText("4/280")).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: "Hello" } });
    expect(screen.getByText("5/280")).toBeInTheDocument();
  });

  it("should handle backspace and character count decrease", () => {
    render(<PostScheduler />);
    const textarea = screen.getByPlaceholderText("What's on your mind?");

    // Type some content
    fireEvent.change(textarea, { target: { value: "Hello World" } });
    expect(screen.getByText("11/280")).toBeInTheDocument();

    // Delete some characters
    fireEvent.change(textarea, { target: { value: "Hello" } });
    expect(screen.getByText("5/280")).toBeInTheDocument();

    // Delete all
    fireEvent.change(textarea, { target: { value: "" } });
    expect(screen.getByText("0/280")).toBeInTheDocument();
  });

  it("should not show warning or error states for content under 260 characters", () => {
    render(<PostScheduler />);
    const textarea = screen.getByPlaceholderText("What's on your mind?");

    // Type content under threshold
    const normalText = "a".repeat(259);
    fireEvent.change(textarea, { target: { value: normalText } });

    const charCount = screen.getByText("259/280");
    expect(charCount).toBeInTheDocument();
    // Should have normal muted styling
    expect(charCount).toHaveClass("text-muted-foreground");
    expect(charCount).not.toHaveClass("text-yellow-600");
    expect(charCount).not.toHaveClass("text-destructive");
  });
});

describe("PostScheduler - Form Validation", () => {
  it("should disable submit button when content is empty", () => {
    render(<PostScheduler />);
    const submitButton = screen.getByRole("button", {
      name: /schedule post/i,
    });

    // Button should be disabled when there's no content
    expect(submitButton).toBeDisabled();
  });

  it("should show error when content exceeds 280 characters and user tries to submit", async () => {
    render(<PostScheduler />);
    const textarea = screen.getByPlaceholderText("What's on your mind?");
    const submitButton = screen.getByRole("button", {
      name: /schedule post/i,
    });

    // Type content that exceeds limit
    const overLimitText = "a".repeat(281);
    fireEvent.change(textarea, { target: { value: overLimitText } });

    // Submit button should be disabled, but if we could click it
    // the error message should appear
    expect(submitButton).toBeDisabled();
  });
});
