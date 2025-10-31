/**
 * Unit tests for ConnectionManager component
 */
import { render, screen } from "@testing-library/react";
import { ConnectionManager } from "@/components/features/ConnectionManager";
import { useQuery } from "convex/react";

// Mock the Convex hooks
jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
}));

// Mock the API
jest.mock("@/convex/_generated/api", () => ({
  api: {
    connections: {
      getConnectionStatus: "mockConnectionStatus",
    },
  },
}));

describe("ConnectionManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Twitter Connection Status Display", () => {
    it("should display 'Loading...' when status is undefined", () => {
      (useQuery as jest.Mock)
        .mockReturnValueOnce(undefined) // Twitter
        .mockReturnValueOnce({ connected: false, needsReauth: false }); // LinkedIn

      render(<ConnectionManager />);

      const loadingBadges = screen.getAllByText("Loading...");
      expect(loadingBadges).toHaveLength(1);
    });

    it("should display 'Not Connected' when no connection exists", () => {
      (useQuery as jest.Mock)
        .mockReturnValueOnce({ connected: false, needsReauth: false }) // Twitter
        .mockReturnValueOnce({ connected: false, needsReauth: false }); // LinkedIn

      render(<ConnectionManager />);

      expect(screen.getAllByText("Not Connected")).toHaveLength(2);
      expect(screen.getByText("Connect X/Twitter")).toBeInTheDocument();
    });

    it("should display 'Connected' when connection is active", () => {
      const expiresAt = Date.now() + 7200000; // 2 hours from now
      (useQuery as jest.Mock)
        .mockReturnValueOnce({
          connected: true,
          expiresAt,
          needsReauth: false,
        }) // Twitter
        .mockReturnValueOnce({ connected: false, needsReauth: false }); // LinkedIn

      render(<ConnectionManager />);

      const connectedBadges = screen.getAllByText("Connected");
      expect(connectedBadges.length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(/Expires:/, { exact: false }),
      ).toBeInTheDocument();
    });

    it("should display 'Needs Re-authentication' when token is expired", () => {
      const expiresAt = Date.now() - 1000; // Expired 1 second ago
      (useQuery as jest.Mock)
        .mockReturnValueOnce({
          connected: true,
          expiresAt,
          needsReauth: true,
        }) // Twitter
        .mockReturnValueOnce({ connected: false, needsReauth: false }); // LinkedIn

      render(<ConnectionManager />);

      expect(
        screen.getByText("Needs Re-authentication"),
      ).toBeInTheDocument();
      expect(screen.getByText("Re-connect")).toBeInTheDocument();
    });
  });

  describe("LinkedIn Connection Status Display", () => {
    it("should display 'Loading...' when LinkedIn status is undefined", () => {
      (useQuery as jest.Mock)
        .mockReturnValueOnce({ connected: false, needsReauth: false }) // Twitter
        .mockReturnValueOnce(undefined); // LinkedIn

      render(<ConnectionManager />);

      const loadingBadges = screen.getAllByText("Loading...");
      expect(loadingBadges).toHaveLength(1);
    });

    it("should display 'Not Connected' for LinkedIn when no connection exists", () => {
      (useQuery as jest.Mock)
        .mockReturnValueOnce({ connected: false, needsReauth: false }) // Twitter
        .mockReturnValueOnce({ connected: false, needsReauth: false }); // LinkedIn

      render(<ConnectionManager />);

      expect(screen.getAllByText("Not Connected")).toHaveLength(2);
      expect(screen.getByText("Connect LinkedIn")).toBeInTheDocument();
    });

    it("should display 'Connected' when LinkedIn connection is active", () => {
      const expiresAt = Date.now() + 5184000000; // 60 days from now
      (useQuery as jest.Mock)
        .mockReturnValueOnce({ connected: false, needsReauth: false }) // Twitter
        .mockReturnValueOnce({
          connected: true,
          expiresAt,
          needsReauth: false,
        }); // LinkedIn

      render(<ConnectionManager />);

      const connectedBadges = screen.getAllByText("Connected");
      expect(connectedBadges.length).toBeGreaterThanOrEqual(1);
    });

    it("should display 'Needs Re-authentication' when LinkedIn token is expired", () => {
      const expiresAt = Date.now() - 1000; // Expired 1 second ago
      (useQuery as jest.Mock)
        .mockReturnValueOnce({ connected: false, needsReauth: false }) // Twitter
        .mockReturnValueOnce({
          connected: true,
          expiresAt,
          needsReauth: true,
        }); // LinkedIn

      render(<ConnectionManager />);

      expect(
        screen.getByText("Needs Re-authentication"),
      ).toBeInTheDocument();
    });
  });

  describe("Button Visibility", () => {
    it("should show 'Connect X/Twitter' button when not connected", () => {
      (useQuery as jest.Mock)
        .mockReturnValueOnce({ connected: false, needsReauth: false }) // Twitter
        .mockReturnValueOnce({ connected: false, needsReauth: false }); // LinkedIn

      render(<ConnectionManager />);

      const connectButton = screen.getByText("Connect X/Twitter");
      expect(connectButton).toBeInTheDocument();
    });

    it("should show 'Connect LinkedIn' button when not connected", () => {
      (useQuery as jest.Mock)
        .mockReturnValueOnce({ connected: false, needsReauth: false }) // Twitter
        .mockReturnValueOnce({ connected: false, needsReauth: false }); // LinkedIn

      render(<ConnectionManager />);

      const connectButton = screen.getByText("Connect LinkedIn");
      expect(connectButton).toBeInTheDocument();
    });

    it("should show 'Re-connect' button when Twitter reauth is needed", () => {
      (useQuery as jest.Mock)
        .mockReturnValueOnce({
          connected: true,
          expiresAt: Date.now() - 1000,
          needsReauth: true,
        }) // Twitter
        .mockReturnValueOnce({ connected: false, needsReauth: false }); // LinkedIn

      render(<ConnectionManager />);

      const reconnectButtons = screen.getAllByText("Re-connect");
      expect(reconnectButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("should NOT show Twitter connect button when connection is active", () => {
      (useQuery as jest.Mock)
        .mockReturnValueOnce({
          connected: true,
          expiresAt: Date.now() + 7200000,
          needsReauth: false,
        }) // Twitter
        .mockReturnValueOnce({ connected: false, needsReauth: false }); // LinkedIn

      render(<ConnectionManager />);

      expect(
        screen.queryByText("Connect X/Twitter"),
      ).not.toBeInTheDocument();
    });

    it("should NOT show LinkedIn connect button when connection is active", () => {
      (useQuery as jest.Mock)
        .mockReturnValueOnce({ connected: false, needsReauth: false }) // Twitter
        .mockReturnValueOnce({
          connected: true,
          expiresAt: Date.now() + 5184000000,
          needsReauth: false,
        }); // LinkedIn

      render(<ConnectionManager />);

      expect(screen.queryByText("Connect LinkedIn")).not.toBeInTheDocument();
    });
  });

  describe("Platform Display", () => {
    it("should render X/Twitter branding", () => {
      (useQuery as jest.Mock)
        .mockReturnValueOnce({ connected: false, needsReauth: false }) // Twitter
        .mockReturnValueOnce({ connected: false, needsReauth: false }); // LinkedIn

      render(<ConnectionManager />);

      expect(screen.getByText("X / Twitter")).toBeInTheDocument();
      expect(
        screen.getByText("Connect your Twitter account to schedule posts"),
      ).toBeInTheDocument();
    });

    it("should render LinkedIn branding", () => {
      (useQuery as jest.Mock)
        .mockReturnValueOnce({ connected: false, needsReauth: false }) // Twitter
        .mockReturnValueOnce({ connected: false, needsReauth: false }); // LinkedIn

      render(<ConnectionManager />);

      expect(screen.getByText("LinkedIn")).toBeInTheDocument();
      expect(
        screen.getByText("Connect your LinkedIn account to schedule posts"),
      ).toBeInTheDocument();
    });

    it("should render both platforms simultaneously", () => {
      (useQuery as jest.Mock)
        .mockReturnValueOnce({ connected: false, needsReauth: false }) // Twitter
        .mockReturnValueOnce({ connected: false, needsReauth: false }); // LinkedIn

      render(<ConnectionManager />);

      expect(screen.getByText("X / Twitter")).toBeInTheDocument();
      expect(screen.getByText("LinkedIn")).toBeInTheDocument();
      expect(screen.getAllByText("Not Connected")).toHaveLength(2);
    });
  });
});
