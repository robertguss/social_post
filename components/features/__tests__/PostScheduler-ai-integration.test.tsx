/**
 * Integration Tests for AI Assistant in PostScheduler
 *
 * Tests the complete AI workflow:
 * - Button click → feature selection → loading → suggestion → accept
 * - Error handling: AI action fails → error message displayed
 * - Reject workflow: suggestion discarded without affecting content
 * - Edit workflow: suggestion edited → accepted → content updated
 * - Mock Convex actions using testing utilities
 * - Verify state transitions (idle → loading → success/error)
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PostScheduler } from "../PostScheduler";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { vi } from "vitest";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock Convex client
const mockConvexClient = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://test.convex.cloud");

// Mock AI actions
const mockAdjustTone = vi.fn();
const mockExpandForLinkedIn = vi.fn();
const mockGenerateHashtags = vi.fn();

// Mock useMutation hook
vi.mock("convex/react", async () => {
  const actual = await vi.importActual("convex/react");
  return {
    ...actual,
    useMutation: (action: any) => {
      if (action.toString().includes("adjustTone")) return mockAdjustTone;
      if (action.toString().includes("expandForLinkedIn")) return mockExpandForLinkedIn;
      if (action.toString().includes("generateHashtags")) return mockGenerateHashtags;
      return vi.fn();
    },
    useQuery: () => undefined,
  };
});

const renderPostScheduler = () => {
  return render(
    <ConvexProvider client={mockConvexClient}>
      <PostScheduler mode="create" />
    </ConvexProvider>
  );
};

describe("PostScheduler AI Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Full AI Workflow - Adjust Tone", () => {
    it("should complete full workflow: select feature → loading → suggestion → accept", async () => {
      const user = userEvent.setup();

      mockAdjustTone.mockResolvedValue({
        content: "I am pleased to share: Hello world!",
        warning: undefined,
      });

      renderPostScheduler();

      // Step 1: Enter content in Twitter field
      const twitterTab = screen.getByRole("tab", { name: /Twitter/i });
      await user.click(twitterTab);

      const twitterTextarea = screen.getByPlaceholderText("What's happening?");
      await user.type(twitterTextarea, "Hello world!");

      // Step 2: Click AI Assistant button
      const aiButton = screen.getByRole("button", { name: /AI Assistant/i });
      expect(aiButton).not.toBeDisabled(); // Should be enabled now that content exists
      await user.click(aiButton);

      // Step 3: Select "Adjust Tone" feature
      const toneOption = await screen.findByRole("menuitem", { name: /Adjust Tone/i });
      await user.click(toneOption);

      // Step 4: Verify loading state appears
      await waitFor(() => {
        expect(screen.getByText("AI is analyzing your content...")).toBeInTheDocument();
      });

      // Step 5: Wait for suggestion to load
      await waitFor(() => {
        expect(screen.getByText("I am pleased to share: Hello world!")).toBeInTheDocument();
      });

      // Step 6: Accept suggestion
      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      await user.click(acceptButton);

      // Step 7: Verify content was updated
      expect(twitterTextarea).toHaveValue("I am pleased to share: Hello world!");

      // Verify success toast appears
      await waitFor(() => {
        expect(screen.getByText(/AI suggestion applied/i)).toBeInTheDocument();
      });
    });
  });

  describe("Full AI Workflow - Expand for LinkedIn", () => {
    it("should expand Twitter content for LinkedIn", async () => {
      const user = userEvent.setup();

      const expandedContent = `Hello world!

Here's a more detailed perspective on this topic:

This development represents a significant milestone in our journey. By focusing on delivering value to our users, we've been able to create something truly impactful. Looking forward to sharing more insights with the LinkedIn community about how this will benefit our users and drive innovation in the space.`;

      // Mock new response format with content and optional warning
      mockExpandForLinkedIn.mockResolvedValue({
        content: expandedContent,
        warning: undefined,
      });

      renderPostScheduler();

      // Enter Twitter content
      const twitterTab = screen.getByRole("tab", { name: /Twitter/i });
      await user.click(twitterTab);

      const twitterTextarea = screen.getByPlaceholderText("What's happening?");
      await user.type(twitterTextarea, "Hello world!");

      // Click AI Assistant
      const aiButton = screen.getByRole("button", { name: /AI Assistant/i });
      await user.click(aiButton);

      // Select "Expand for LinkedIn"
      const expandOption = await screen.findByRole("menuitem", { name: /Expand for LinkedIn/i });
      await user.click(expandOption);

      // Wait for suggestion
      await waitFor(() => {
        expect(screen.getByText(/This development represents a significant milestone/i)).toBeInTheDocument();
      });

      // Accept suggestion
      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      await user.click(acceptButton);

      // Verify content was updated in Twitter field (should replace original)
      expect(twitterTextarea).toHaveValue(expandedContent);
    });

    it("should display warning when expansion is too short", async () => {
      const user = userEvent.setup();

      const shortExpansion = "Hello world! This is slightly longer but under 500 chars.";

      // Mock response with warning
      mockExpandForLinkedIn.mockResolvedValue({
        content: shortExpansion,
        warning: "Expansion is shorter than expected (target: 500-1000 chars). Consider adding more detail or accepting as-is.",
      });

      renderPostScheduler();

      // Enter Twitter content
      const twitterTab = screen.getByRole("tab", { name: /Twitter/i });
      await user.click(twitterTab);

      const twitterTextarea = screen.getByPlaceholderText("What's happening?");
      await user.type(twitterTextarea, "Hello world!");

      // Click AI Assistant
      const aiButton = screen.getByRole("button", { name: /AI Assistant/i });
      await user.click(aiButton);

      // Select "Expand for LinkedIn"
      const expandOption = await screen.findByRole("menuitem", { name: /Expand for LinkedIn/i });
      await user.click(expandOption);

      // Wait for suggestion to appear
      await waitFor(() => {
        expect(screen.getByText(shortExpansion)).toBeInTheDocument();
      });

      // Verify warning badge is displayed
      expect(screen.getByText(/shorter than expected/i)).toBeInTheDocument();
    });

    it("should prevent expansion when LinkedIn content is already longer", async () => {
      const user = userEvent.setup();

      renderPostScheduler();

      // Enter short Twitter content
      const twitterTab = screen.getByRole("tab", { name: /Twitter/i });
      await user.click(twitterTab);

      const twitterTextarea = screen.getByPlaceholderText("What's happening?");
      await user.type(twitterTextarea, "Hello!");

      // Enter longer LinkedIn content
      const linkedInTab = screen.getByRole("tab", { name: /LinkedIn/i });
      await user.click(linkedInTab);

      const linkedInTextarea = screen.getByPlaceholderText("Share your professional insights...");
      await user.type(linkedInTextarea, "This is already a much longer LinkedIn post with more detail.");

      // Switch back to Twitter field
      await user.click(twitterTab);

      // Click AI Assistant
      const aiButton = screen.getByRole("button", { name: /AI Assistant/i });
      await user.click(aiButton);

      // Try to select "Expand for LinkedIn"
      const expandOption = await screen.findByRole("menuitem", { name: /Expand for LinkedIn/i });
      await user.click(expandOption);

      // Should show error toast
      await waitFor(() => {
        expect(screen.getByText(/LinkedIn content is already longer than Twitter content/i)).toBeInTheDocument();
      });

      // Should not call the expand action
      expect(mockExpandForLinkedIn).not.toHaveBeenCalled();
    });

    it("should show error when trying to expand from LinkedIn field", async () => {
      const user = userEvent.setup();

      renderPostScheduler();

      // Enter LinkedIn content
      const linkedInTab = screen.getByRole("tab", { name: /LinkedIn/i });
      await user.click(linkedInTab);

      const linkedInTextarea = screen.getByPlaceholderText("Share your professional insights...");
      await user.type(linkedInTextarea, "LinkedIn post content");

      // Click AI Assistant
      const aiButton = screen.getByRole("button", { name: /AI Assistant/i });
      await user.click(aiButton);

      // Try to select "Expand for LinkedIn" while on LinkedIn field
      const expandOption = await screen.findByRole("menuitem", { name: /Expand for LinkedIn/i });
      await user.click(expandOption);

      // Should show error toast
      await waitFor(() => {
        expect(screen.getByText(/Expand for LinkedIn only works with Twitter content/i)).toBeInTheDocument();
      });

      // Should not call the expand action
      expect(mockExpandForLinkedIn).not.toHaveBeenCalled();
    });
  });

  describe("Full AI Workflow - Generate Hashtags", () => {
    it("should generate hashtags and append to content", async () => {
      const user = userEvent.setup();

      mockGenerateHashtags.mockResolvedValue(["Tech", "Innovation", "AI", "Productivity", "Growth"]);

      renderPostScheduler();

      // Enter Twitter content
      const twitterTab = screen.getByRole("tab", { name: /Twitter/i });
      await user.click(twitterTab);

      const twitterTextarea = screen.getByPlaceholderText("What's happening?");
      const originalContent = "Check out our new feature!";
      await user.type(twitterTextarea, originalContent);

      // Click AI Assistant
      const aiButton = screen.getByRole("button", { name: /AI Assistant/i });
      await user.click(aiButton);

      // Select "Generate Hashtags"
      const hashtagsOption = await screen.findByRole("menuitem", { name: /Generate Hashtags/i });
      await user.click(hashtagsOption);

      // Wait for suggestion (should show original content + hashtags)
      await waitFor(() => {
        expect(screen.getByText(/#Tech #Innovation #AI #Productivity #Growth/)).toBeInTheDocument();
      });

      // Accept suggestion
      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      await user.click(acceptButton);

      // Verify hashtags were appended
      expect(twitterTextarea).toHaveValue(expect.stringContaining(originalContent));
      expect(twitterTextarea).toHaveValue(expect.stringContaining("#Tech"));
      expect(twitterTextarea).toHaveValue(expect.stringContaining("#Innovation"));
    });
  });

  describe("Error Handling", () => {
    it("should display error message when AI action fails", async () => {
      const user = userEvent.setup();

      mockAdjustTone.mockRejectedValue(new Error("AI service temporarily unavailable"));

      renderPostScheduler();

      // Enter content
      const twitterTab = screen.getByRole("tab", { name: /Twitter/i });
      await user.click(twitterTab);

      const twitterTextarea = screen.getByPlaceholderText("What's happening?");
      await user.type(twitterTextarea, "Hello world!");

      // Trigger AI feature
      const aiButton = screen.getByRole("button", { name: /AI Assistant/i });
      await user.click(aiButton);

      const toneOption = await screen.findByRole("menuitem", { name: /Adjust Tone/i });
      await user.click(toneOption);

      // Wait for error toast
      await waitFor(() => {
        expect(screen.getByText(/AI service temporarily unavailable/i)).toBeInTheDocument();
      });

      // Suggestion panel should close on error
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Original content should remain unchanged
      expect(twitterTextarea).toHaveValue("Hello world!");
    });
  });

  describe("Reject Workflow", () => {
    it("should discard suggestion when Reject button is clicked", async () => {
      const user = userEvent.setup();

      mockAdjustTone.mockResolvedValue({
        content: "Formal version of content",
        warning: undefined,
      });

      renderPostScheduler();

      // Enter content
      const twitterTab = screen.getByRole("tab", { name: /Twitter/i });
      await user.click(twitterTab);

      const twitterTextarea = screen.getByPlaceholderText("What's happening?");
      const originalContent = "Hello world!";
      await user.type(twitterTextarea, originalContent);

      // Trigger AI feature
      const aiButton = screen.getByRole("button", { name: /AI Assistant/i });
      await user.click(aiButton);

      const toneOption = await screen.findByRole("menuitem", { name: /Adjust Tone/i });
      await user.click(toneOption);

      // Wait for suggestion
      await waitFor(() => {
        expect(screen.getByText("Formal version of content")).toBeInTheDocument();
      });

      // Reject suggestion
      const rejectButton = screen.getByRole("button", { name: /Reject/i });
      await user.click(rejectButton);

      // Verify content unchanged
      expect(twitterTextarea).toHaveValue(originalContent);

      // Verify toast message
      await waitFor(() => {
        expect(screen.getByText(/Suggestion discarded/i)).toBeInTheDocument();
      });
    });
  });

  describe("Edit Workflow", () => {
    it("should allow editing suggestion before accepting", async () => {
      const user = userEvent.setup();

      mockAdjustTone.mockResolvedValue({
        content: "AI generated suggestion",
        warning: undefined,
      });

      renderPostScheduler();

      // Enter content
      const twitterTab = screen.getByRole("tab", { name: /Twitter/i });
      await user.click(twitterTab);

      const twitterTextarea = screen.getByPlaceholderText("What's happening?");
      await user.type(twitterTextarea, "Original content");

      // Trigger AI feature
      const aiButton = screen.getByRole("button", { name: /AI Assistant/i });
      await user.click(aiButton);

      const toneOption = await screen.findByRole("menuitem", { name: /Adjust Tone/i });
      await user.click(toneOption);

      // Wait for suggestion
      await waitFor(() => {
        expect(screen.getByText("AI generated suggestion")).toBeInTheDocument();
      });

      // Click Edit
      const editButton = screen.getByRole("button", { name: /Edit/i });
      await user.click(editButton);

      // Edit the suggestion
      const editTextarea = screen.getByLabelText("Edit AI suggestion");
      await user.clear(editTextarea);
      await user.type(editTextarea, "Manually edited suggestion");

      // Accept edited version
      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      await user.click(acceptButton);

      // Verify edited content was applied
      expect(twitterTextarea).toHaveValue("Manually edited suggestion");
    });
  });

  describe("State Management", () => {
    it("should track active field correctly", async () => {
      const user = userEvent.setup();

      renderPostScheduler();

      // Focus Twitter field
      const twitterTab = screen.getByRole("tab", { name: /Twitter/i });
      await user.click(twitterTab);

      const twitterTextarea = screen.getByPlaceholderText("What's happening?");
      await user.click(twitterTextarea);

      // AI button should be disabled (no content)
      const aiButton = screen.getByRole("button", { name: /AI Assistant/i });
      expect(aiButton).toBeDisabled();

      // Add content
      await user.type(twitterTextarea, "Twitter content");

      // AI button should now be enabled
      expect(aiButton).not.toBeDisabled();

      // Switch to LinkedIn
      const linkedInTab = screen.getByRole("tab", { name: /LinkedIn/i });
      await user.click(linkedInTab);

      const linkedInTextarea = screen.getByPlaceholderText("Share your professional insights...");
      await user.click(linkedInTextarea);

      // LinkedIn AI button should be disabled (no content)
      const linkedInAiButton = screen.getAllByRole("button", { name: /AI Assistant/i })[0];
      expect(linkedInAiButton).toBeDisabled();
    });
  });
});
