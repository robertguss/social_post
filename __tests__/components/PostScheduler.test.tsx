import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PostScheduler } from "@/components/features/PostScheduler";
import "@testing-library/jest-dom";

describe("PostScheduler - Twitter Character Counter", () => {
  it("should display Twitter character count correctly", () => {
    render(<PostScheduler />);

    // Twitter is enabled by default
    const twitterTextarea = screen.getByPlaceholderText("What's happening?");
    const twitterCharCount = screen.getByText("0/280");

    expect(twitterCharCount).toBeInTheDocument();

    // Type some content
    fireEvent.change(twitterTextarea, { target: { value: "Hello World" } });
    expect(screen.getByText("11/280")).toBeInTheDocument();
  });

  it("should show warning state at 260 characters for Twitter", () => {
    render(<PostScheduler />);
    const twitterTextarea = screen.getByPlaceholderText("What's happening?");

    // Create a string with exactly 260 characters
    const warningText = "a".repeat(260);
    fireEvent.change(twitterTextarea, { target: { value: warningText } });

    const charCount = screen.getByText("260/280");
    expect(charCount).toBeInTheDocument();
    // Check that the element has warning styling (yellow text)
    expect(charCount).toHaveClass("text-yellow-600");
  });

  it("should show error state when Twitter content exceeds 280 characters", () => {
    render(<PostScheduler />);
    const twitterTextarea = screen.getByPlaceholderText("What's happening?");

    // Create a string with 281 characters
    const errorText = "a".repeat(281);
    fireEvent.change(twitterTextarea, { target: { value: errorText } });

    const charCount = screen.getByText("281/280");
    expect(charCount).toBeInTheDocument();
    // Check that the element has error styling (destructive color)
    expect(charCount).toHaveClass("text-destructive");
  });

  it("should update Twitter character count in real-time", () => {
    render(<PostScheduler />);
    const twitterTextarea = screen.getByPlaceholderText("What's happening?");

    // Type character by character
    fireEvent.change(twitterTextarea, { target: { value: "H" } });
    expect(screen.getByText("1/280")).toBeInTheDocument();

    fireEvent.change(twitterTextarea, { target: { value: "Hello" } });
    expect(screen.getByText("5/280")).toBeInTheDocument();
  });

  it("should not show warning or error states for Twitter content under 260 characters", () => {
    render(<PostScheduler />);
    const twitterTextarea = screen.getByPlaceholderText("What's happening?");

    // Type content under threshold
    const normalText = "a".repeat(259);
    fireEvent.change(twitterTextarea, { target: { value: normalText } });

    const charCount = screen.getByText("259/280");
    expect(charCount).toBeInTheDocument();
    // Should have normal muted styling
    expect(charCount).toHaveClass("text-muted-foreground");
    expect(charCount).not.toHaveClass("text-yellow-600");
    expect(charCount).not.toHaveClass("text-destructive");
  });
});

describe("PostScheduler - LinkedIn Character Counter", () => {
  it("should display LinkedIn character count correctly when enabled", () => {
    render(<PostScheduler />);

    // Enable LinkedIn
    const linkedInCheckbox = screen.getByLabelText("Post to LinkedIn");
    fireEvent.click(linkedInCheckbox);

    const linkedInTextarea = screen.getByPlaceholderText("Share your professional insights...");
    const linkedInCharCount = screen.getByText("0/3000");

    expect(linkedInCharCount).toBeInTheDocument();

    // Type some content
    fireEvent.change(linkedInTextarea, { target: { value: "Hello LinkedIn" } });
    expect(screen.getByText("14/3000")).toBeInTheDocument();
  });

  it("should show warning state at 2,900 characters for LinkedIn", () => {
    render(<PostScheduler />);

    // Enable LinkedIn
    const linkedInCheckbox = screen.getByLabelText("Post to LinkedIn");
    fireEvent.click(linkedInCheckbox);

    const linkedInTextarea = screen.getByPlaceholderText("Share your professional insights...");

    // Create a string with exactly 2,900 characters
    const warningText = "a".repeat(2900);
    fireEvent.change(linkedInTextarea, { target: { value: warningText } });

    const charCount = screen.getByText("2900/3000");
    expect(charCount).toBeInTheDocument();
    // Check that the element has warning styling (yellow text)
    expect(charCount).toHaveClass("text-yellow-600");
  });

  it("should show error state when LinkedIn content exceeds 3,000 characters", () => {
    render(<PostScheduler />);

    // Enable LinkedIn
    const linkedInCheckbox = screen.getByLabelText("Post to LinkedIn");
    fireEvent.click(linkedInCheckbox);

    const linkedInTextarea = screen.getByPlaceholderText("Share your professional insights...");

    // Create a string with 3,001 characters
    const errorText = "a".repeat(3001);
    fireEvent.change(linkedInTextarea, { target: { value: errorText } });

    const charCount = screen.getByText("3001/3000");
    expect(charCount).toBeInTheDocument();
    // Check that the element has error styling (destructive color)
    expect(charCount).toHaveClass("text-destructive");
  });

  it("should disable submit button when LinkedIn limit exceeded", () => {
    render(<PostScheduler />);

    // Enable LinkedIn
    const linkedInCheckbox = screen.getByLabelText("Post to LinkedIn");
    fireEvent.click(linkedInCheckbox);

    const linkedInTextarea = screen.getByPlaceholderText("Share your professional insights...");
    const submitButton = screen.getByRole("button", {
      name: /schedule post/i,
    });

    // Type content that exceeds limit
    const overLimitText = "a".repeat(3001);
    fireEvent.change(linkedInTextarea, { target: { value: overLimitText } });

    // Should be disabled due to over limit
    expect(submitButton).toBeDisabled();
  });

  it("should not show warning or error states for LinkedIn content under 2,900 characters", () => {
    render(<PostScheduler />);

    // Enable LinkedIn
    const linkedInCheckbox = screen.getByLabelText("Post to LinkedIn");
    fireEvent.click(linkedInCheckbox);

    const linkedInTextarea = screen.getByPlaceholderText("Share your professional insights...");

    // Type content under threshold
    const normalText = "a".repeat(2899);
    fireEvent.change(linkedInTextarea, { target: { value: normalText } });

    const charCount = screen.getByText("2899/3000");
    expect(charCount).toBeInTheDocument();
    // Should have normal muted styling
    expect(charCount).toHaveClass("text-muted-foreground");
    expect(charCount).not.toHaveClass("text-yellow-600");
    expect(charCount).not.toHaveClass("text-destructive");
  });
});

describe("PostScheduler - Dual Character Counters Working Independently", () => {
  it("should track both character counters independently", () => {
    render(<PostScheduler />);

    // Enable LinkedIn
    const linkedInCheckbox = screen.getByLabelText("Post to LinkedIn");
    fireEvent.click(linkedInCheckbox);

    const twitterTextarea = screen.getByPlaceholderText("What's happening?");
    const linkedInTextarea = screen.getByPlaceholderText("Share your professional insights...");

    // Type different content in each
    fireEvent.change(twitterTextarea, { target: { value: "Twitter content" } });
    fireEvent.change(linkedInTextarea, { target: { value: "LinkedIn content here" } });

    // Each should show its own count
    expect(screen.getByText("15/280")).toBeInTheDocument(); // Twitter
    expect(screen.getByText("22/3000")).toBeInTheDocument(); // LinkedIn
  });

  it("should allow one counter to be in error state while other is normal", () => {
    render(<PostScheduler />);

    // Enable LinkedIn
    const linkedInCheckbox = screen.getByLabelText("Post to LinkedIn");
    fireEvent.click(linkedInCheckbox);

    const twitterTextarea = screen.getByPlaceholderText("What's happening?");
    const linkedInTextarea = screen.getByPlaceholderText("Share your professional insights...");

    // Twitter over limit, LinkedIn normal
    fireEvent.change(twitterTextarea, { target: { value: "a".repeat(281) } });
    fireEvent.change(linkedInTextarea, { target: { value: "Normal content" } });

    const twitterCount = screen.getByText("281/280");
    const linkedInCount = screen.getByText("14/3000");

    expect(twitterCount).toHaveClass("text-destructive");
    expect(linkedInCount).toHaveClass("text-muted-foreground");
  });
});

describe("PostScheduler - Platform Selection", () => {
  it("should have Twitter enabled by default and LinkedIn disabled", () => {
    render(<PostScheduler />);

    const twitterCheckbox = screen.getByLabelText("Post to X/Twitter") as HTMLInputElement;
    const linkedInCheckbox = screen.getByLabelText("Post to LinkedIn") as HTMLInputElement;

    expect(twitterCheckbox.checked).toBe(true);
    expect(linkedInCheckbox.checked).toBe(false);
  });

  it("should show Twitter fields when Twitter is enabled", () => {
    render(<PostScheduler />);

    expect(screen.getByPlaceholderText("What's happening?")).toBeInTheDocument();
    expect(screen.getByText("0/280")).toBeInTheDocument();
  });

  it("should show LinkedIn fields when LinkedIn is enabled", () => {
    render(<PostScheduler />);

    const linkedInCheckbox = screen.getByLabelText("Post to LinkedIn");
    fireEvent.click(linkedInCheckbox);

    expect(screen.getByPlaceholderText("Share your professional insights...")).toBeInTheDocument();
    expect(screen.getByText("0/3000")).toBeInTheDocument();
  });

  it("should hide Twitter fields when Twitter is disabled", () => {
    render(<PostScheduler />);

    const twitterCheckbox = screen.getByLabelText("Post to X/Twitter");
    fireEvent.click(twitterCheckbox); // Disable Twitter

    expect(screen.queryByPlaceholderText("What's happening?")).not.toBeInTheDocument();
  });

  it("should hide LinkedIn fields when LinkedIn is disabled", () => {
    render(<PostScheduler />);

    const linkedInCheckbox = screen.getByLabelText("Post to LinkedIn");

    // LinkedIn is disabled by default
    expect(screen.queryByPlaceholderText("Share your professional insights...")).not.toBeInTheDocument();
  });

  it("should disable submit button when no platform is selected", () => {
    render(<PostScheduler />);

    const twitterCheckbox = screen.getByLabelText("Post to X/Twitter");
    const submitButton = screen.getByRole("button", { name: /schedule post/i });

    // Disable Twitter (LinkedIn is already disabled)
    fireEvent.click(twitterCheckbox);

    expect(submitButton).toBeDisabled();
  });
});

describe("PostScheduler - Form Validation", () => {
  it("should disable submit button when Twitter content is empty", () => {
    render(<PostScheduler />);
    const submitButton = screen.getByRole("button", {
      name: /schedule post/i,
    });

    // Button should be disabled when there's no content
    expect(submitButton).toBeDisabled();
  });

  it("should disable submit button when Twitter character limit is exceeded", () => {
    render(<PostScheduler />);
    const twitterTextarea = screen.getByPlaceholderText("What's happening?");
    const submitButton = screen.getByRole("button", {
      name: /schedule post/i,
    });

    // Type content that exceeds limit
    const overLimitText = "a".repeat(281);
    fireEvent.change(twitterTextarea, { target: { value: overLimitText } });

    // Submit button should be disabled
    expect(submitButton).toBeDisabled();
  });

  it("should disable submit button when LinkedIn character limit is exceeded", () => {
    render(<PostScheduler />);

    // Enable LinkedIn
    const linkedInCheckbox = screen.getByLabelText("Post to LinkedIn");
    fireEvent.click(linkedInCheckbox);

    const linkedInTextarea = screen.getByPlaceholderText("Share your professional insights...");
    const submitButton = screen.getByRole("button", {
      name: /schedule post/i,
    });

    // Type content that exceeds limit
    const overLimitText = "a".repeat(3001);
    fireEvent.change(linkedInTextarea, { target: { value: overLimitText } });

    // Submit button should be disabled
    expect(submitButton).toBeDisabled();
  });
});
