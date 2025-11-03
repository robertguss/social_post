import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueueList } from "../QueueList";
import { useQuery } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";

// Mock Convex API
jest.mock("@/convex/_generated/api", () => ({
  api: {
    queues: {
      getQueues: "queues.getQueues",
    },
  },
}));

// Mock Convex useQuery hook
jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
}));

// Mock QueueCard component
jest.mock("../QueueCard", () => ({
  QueueCard: ({ queue }: { queue: { _id: string; status: string } }) => (
    <div data-testid={`queue-${queue._id}`}>{queue.status}</div>
  ),
}));

const mockQueues = [
  {
    _id: "queue1" as Id<"recurring_queues">,
    _creationTime: Date.now(),
    clerkUserId: "user1",
    originalPostId: "post1" as Id<"posts">,
    status: "active",
    interval: 7,
    nextScheduledTime: Date.now() + 86400000, // tomorrow
    executionCount: 3,
    originalPost: {
      _id: "post1" as Id<"posts">,
      twitterContent: "Test tweet content",
      status: "published",
    },
  },
  {
    _id: "queue2" as Id<"recurring_queues">,
    _creationTime: Date.now(),
    clerkUserId: "user1",
    originalPostId: "post2" as Id<"posts">,
    status: "paused",
    interval: 3,
    nextScheduledTime: Date.now() + 172800000, // 2 days
    executionCount: 1,
    originalPost: {
      _id: "post2" as Id<"posts">,
      linkedInContent: "Test LinkedIn content",
      status: "published",
    },
  },
  {
    _id: "queue3" as Id<"recurring_queues">,
    _creationTime: Date.now(),
    clerkUserId: "user1",
    originalPostId: "post3" as Id<"posts">,
    status: "completed",
    interval: 1,
    nextScheduledTime: Date.now(),
    executionCount: 10,
    maxExecutions: 10,
    originalPost: {
      _id: "post3" as Id<"posts">,
      twitterContent: "Completed queue content",
      status: "published",
    },
  },
];

describe("QueueList Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render loading state when queues are undefined", () => {
    (useQuery as jest.Mock).mockReturnValue(undefined);

    render(<QueueList />);

    expect(screen.getByText("Recurring Post Queues")).toBeInTheDocument();
    expect(screen.getByText("Manage automated recurring posts")).toBeInTheDocument();
    // Loading spinner should be present
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("should render empty state when no queues exist", () => {
    (useQuery as jest.Mock).mockReturnValue([]);

    render(<QueueList />);

    expect(screen.getByText("Recurring Post Queues")).toBeInTheDocument();
    expect(screen.getByText("No recurring queues yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Create a recurring queue to automatically repost/i)
    ).toBeInTheDocument();
  });

  it("should render queue cards when queues exist", () => {
    (useQuery as jest.Mock).mockReturnValue(mockQueues);

    render(<QueueList />);

    expect(screen.getByText("Recurring Post Queues")).toBeInTheDocument();
    expect(screen.getByTestId("queue-queue1")).toBeInTheDocument();
    expect(screen.getByTestId("queue-queue2")).toBeInTheDocument();
    expect(screen.getByTestId("queue-queue3")).toBeInTheDocument();
  });

  it("should render status filter tabs", () => {
    (useQuery as jest.Mock).mockReturnValue(mockQueues);

    render(<QueueList />);

    expect(screen.getByRole("tab", { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /active/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /paused/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /completed/i })).toBeInTheDocument();
  });

  it("should filter queues by status when clicking filter tabs", async () => {
    const user = userEvent.setup();
    let queryArgs: { status?: string } = {};

    (useQuery as jest.Mock).mockImplementation((_, args) => {
      queryArgs = args;
      if (args?.status === "active") {
        return [mockQueues[0]]; // Only active queue
      }
      if (args?.status === "paused") {
        return [mockQueues[1]]; // Only paused queue
      }
      if (args?.status === "completed") {
        return [mockQueues[2]]; // Only completed queue
      }
      return mockQueues; // All queues
    });

    const { rerender } = render(<QueueList />);

    // Initially shows all queues
    expect(screen.getByTestId("queue-queue1")).toBeInTheDocument();
    expect(screen.getByTestId("queue-queue2")).toBeInTheDocument();
    expect(screen.getByTestId("queue-queue3")).toBeInTheDocument();

    // Click "Active" tab
    await user.click(screen.getByRole("tab", { name: /active/i }));

    await waitFor(() => {
      rerender(<QueueList />);
      expect(queryArgs).toEqual({ status: "active" });
    });
  });

  // Note: Convex queries don't throw errors in the component - they return undefined on errors
  // Error handling is done by Convex internally
});
