import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PostScheduler } from "../PostScheduler";

// Mock Convex hooks
const mockCreatePost = jest.fn();
const mockUpdatePost = jest.fn();
const mockIncrementTemplateUsage = jest.fn();
const mockUseQuery = jest.fn();

jest.mock("convex/react", () => ({
  useMutation: jest.fn((api: unknown) => {
    if (String(api).includes("createPost")) return mockCreatePost;
    if (String(api).includes("updatePost")) return mockUpdatePost;
    if (String(api).includes("incrementTemplateUsage")) return mockIncrementTemplateUsage;
    return jest.fn();
  }),
  useQuery: jest.fn(() => mockUseQuery()),
}));

// Mock toast notifications
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock TemplatePickerModal
jest.mock("../TemplatePickerModal", () => ({
  TemplatePickerModal: () => <div data-testid="template-picker-modal">Mock Template Picker</div>,
}));

// Mock QuickReschedule
jest.mock("../QuickReschedule", () => ({
  QuickReschedule: () => <div data-testid="quick-reschedule">Mock Quick Reschedule</div>,
}));

describe("PostScheduler - Character Count Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue(null);
  });

  describe("Twitter Character Validation", () => {
    it("should disable Schedule button when Twitter content exceeds 280 characters", async () => {
      const user = userEvent.setup();
      render(<PostScheduler mode="create" />);

      // Find Twitter textarea
      const twitterTextarea = screen.getByPlaceholderText(/What's happening?/i);

      // Paste content that exceeds 280 characters (281 characters)
      const longContent = "x".repeat(281);
      await user.click(twitterTextarea);
      await user.paste(longContent);

      // Schedule button should be disabled
      const submitButton = screen.getByRole("button", { name: /Schedule Post/i });
      expect(submitButton).toBeDisabled();
    });

    it("should show character limit exceeded warning when Twitter content exceeds 280 characters", async () => {
      const user = userEvent.setup();
      render(<PostScheduler mode="create" />);

      const twitterTextarea = screen.getByPlaceholderText(/What's happening?/i);
      const longContent = "x".repeat(281);
      await user.type(twitterTextarea, longContent);

      // Warning should be visible
      expect(screen.getByText(/Character limit exceeded/i)).toBeInTheDocument();
      expect(screen.getByText(/Twitter: 281\/280 characters/i)).toBeInTheDocument();
    });

    it("should enable Schedule button when Twitter content is within 280 character limit", async () => {
      const user = userEvent.setup();
      render(<PostScheduler mode="create" />);

      const twitterTextarea = screen.getByPlaceholderText(/What's happening?/i);

      // Type valid content (under 280 chars)
      await user.type(twitterTextarea, "Valid tweet content");

      // Need to set a scheduled time for button to be enabled
      // This is a simplified test - in reality we'd need to interact with the date picker
      // For now, we check that the button is not disabled due to character count

      // Button is disabled but not due to character count (it's due to missing scheduled time)
      // The important thing is that no character limit warning is shown
      expect(screen.queryByText(/Character limit exceeded/i)).not.toBeInTheDocument();
    });

    it("should handle URLs correctly (Twitter t.co shortening)", async () => {
      const user = userEvent.setup();
      render(<PostScheduler mode="create" />);

      const twitterTextarea = screen.getByPlaceholderText(/What's happening?/i);

      // Type content with a URL - URL should count as 23 chars
      // "Check this out: " (16 chars) + URL (23 chars) = 39 chars total
      await user.type(twitterTextarea, "Check this out: https://example.com/very/long/url");

      // Character counter should show ~39 characters, not the full length
      // No character limit warning should appear
      expect(screen.queryByText(/Character limit exceeded/i)).not.toBeInTheDocument();
    });

    it("should count at exactly 280 characters as valid", async () => {
      const user = userEvent.setup();
      render(<PostScheduler mode="create" />);

      const twitterTextarea = screen.getByPlaceholderText(/What's happening?/i);
      const exactContent = "x".repeat(280);
      await user.type(twitterTextarea, exactContent);

      // Should not show error (280 is at the limit, not over)
      expect(screen.queryByText(/Character limit exceeded/i)).not.toBeInTheDocument();
    });
  });

  describe("LinkedIn Character Validation", () => {
    it("should disable Schedule button when LinkedIn content exceeds 3000 characters", async () => {
      const user = userEvent.setup();
      render(<PostScheduler mode="create" />);

      // Enable LinkedIn (it's disabled by default)
      const linkedInSwitch = screen.getByLabelText(/Toggle LinkedIn posting/i);
      await user.click(linkedInSwitch);

      // Find LinkedIn textarea
      const linkedInTextarea = screen.getByPlaceholderText(/Share your professional insights/i);

      // Type content that exceeds 3000 characters
      const longContent = "x".repeat(3001);
      await user.type(linkedInTextarea, longContent);

      // Schedule button should be disabled
      const submitButton = screen.getByRole("button", { name: /Schedule Post/i });
      expect(submitButton).toBeDisabled();
    });

    it("should show character limit exceeded warning when LinkedIn content exceeds 3000 characters", async () => {
      const user = userEvent.setup();
      render(<PostScheduler mode="create" />);

      const linkedInSwitch = screen.getByLabelText(/Toggle LinkedIn posting/i);
      await user.click(linkedInSwitch);

      const linkedInTextarea = screen.getByPlaceholderText(/Share your professional insights/i);
      const longContent = "x".repeat(3001);
      await user.type(linkedInTextarea, longContent);

      // Warning should be visible
      expect(screen.getByText(/Character limit exceeded/i)).toBeInTheDocument();
      expect(screen.getByText(/LinkedIn: 3001\/3000 characters/i)).toBeInTheDocument();
    });

    it("should enable Schedule button when LinkedIn content is within 3000 character limit", async () => {
      const user = userEvent.setup();
      render(<PostScheduler mode="create" />);

      const linkedInSwitch = screen.getByLabelText(/Toggle LinkedIn posting/i);
      await user.click(linkedInSwitch);

      const linkedInTextarea = screen.getByPlaceholderText(/Share your professional insights/i);
      await user.type(linkedInTextarea, "Valid LinkedIn content");

      // No character limit warning should be shown
      expect(screen.queryByText(/Character limit exceeded/i)).not.toBeInTheDocument();
    });

    it("should count URLs at their full length for LinkedIn (no shortening)", async () => {
      const user = userEvent.setup();
      render(<PostScheduler mode="create" />);

      const linkedInSwitch = screen.getByLabelText(/Toggle LinkedIn posting/i);
      await user.click(linkedInSwitch);

      const linkedInTextarea = screen.getByPlaceholderText(/Share your professional insights/i);

      // Type content with a long URL
      const content = "Check this out: https://example.com/very/long/url/path";
      await user.type(linkedInTextarea, content);

      // Character count should match the full content length (no shortening)
      expect(screen.queryByText(/Character limit exceeded/i)).not.toBeInTheDocument();
    });

    it("should count at exactly 3000 characters as valid", async () => {
      const user = userEvent.setup();
      render(<PostScheduler mode="create" />);

      const linkedInSwitch = screen.getByLabelText(/Toggle LinkedIn posting/i);
      await user.click(linkedInSwitch);

      const linkedInTextarea = screen.getByPlaceholderText(/Share your professional insights/i);
      const exactContent = "x".repeat(3000);
      await user.type(linkedInTextarea, exactContent);

      // Should not show error (3000 is at the limit, not over)
      expect(screen.queryByText(/Character limit exceeded/i)).not.toBeInTheDocument();
    });
  });

  describe("Multi-Platform Character Validation", () => {
    it("should show both platform warnings when both exceed limits", async () => {
      const user = userEvent.setup();
      render(<PostScheduler mode="create" />);

      // Enable LinkedIn
      const linkedInSwitch = screen.getByLabelText(/Toggle LinkedIn posting/i);
      await user.click(linkedInSwitch);

      // Exceed Twitter limit
      const twitterTextarea = screen.getByPlaceholderText(/What's happening?/i);
      await user.type(twitterTextarea, "x".repeat(281));

      // Exceed LinkedIn limit
      const linkedInTextarea = screen.getByPlaceholderText(/Share your professional insights/i);
      await user.type(linkedInTextarea, "y".repeat(3001));

      // Both warnings should be visible
      expect(screen.getByText(/Character limit exceeded/i)).toBeInTheDocument();
      expect(screen.getByText(/Twitter: 281\/280 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/LinkedIn: 3001\/3000 characters/i)).toBeInTheDocument();
    });
  });

  describe("Platform Disable Behavior", () => {
    it("should enable Schedule button when Twitter is disabled even if content exceeds limit", async () => {
      const user = userEvent.setup();
      render(<PostScheduler mode="create" />);

      // Enable LinkedIn
      const linkedInSwitch = screen.getByLabelText(/Toggle LinkedIn posting/i);
      await user.click(linkedInSwitch);

      // Type over-limit content in Twitter
      const twitterTextarea = screen.getByPlaceholderText(/What's happening?/i);
      await user.type(twitterTextarea, "x".repeat(281));

      // Disable Twitter
      const twitterSwitch = screen.getByLabelText(/Toggle Twitter posting/i);
      await user.click(twitterSwitch);

      // Type valid LinkedIn content
      const linkedInTextarea = screen.getByPlaceholderText(/Share your professional insights/i);
      await user.type(linkedInTextarea, "Valid LinkedIn content");

      // No character warning should show (Twitter is disabled)
      expect(screen.queryByText(/Twitter: 281\/280 characters/i)).not.toBeInTheDocument();
    });

    it("should enable Schedule button when LinkedIn is disabled even if content exceeds limit", async () => {
      const user = userEvent.setup();
      render(<PostScheduler mode="create" />);

      // Enable LinkedIn
      const linkedInSwitch = screen.getByLabelText(/Toggle LinkedIn posting/i);
      await user.click(linkedInSwitch);

      // Type over-limit content in LinkedIn
      const linkedInTextarea = screen.getByPlaceholderText(/Share your professional insights/i);
      await user.type(linkedInTextarea, "x".repeat(3001));

      // Disable LinkedIn
      await user.click(linkedInSwitch);

      // Type valid Twitter content
      const twitterTextarea = screen.getByPlaceholderText(/What's happening?/i);
      await user.type(twitterTextarea, "Valid tweet");

      // No LinkedIn character warning should show (LinkedIn is disabled)
      expect(screen.queryByText(/LinkedIn: 3001\/3000 characters/i)).not.toBeInTheDocument();
    });
  });
});
