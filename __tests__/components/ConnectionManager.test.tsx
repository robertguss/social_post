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

  describe("Connection Status Display", () => {
    it("should display 'Loading...' when status is undefined", () => {
      (useQuery as jest.Mock).mockReturnValue(undefined);

      render(<ConnectionManager />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should display 'Not Connected' when no connection exists", () => {
      (useQuery as jest.Mock).mockReturnValue({
        connected: false,
        needsReauth: false,
      });

      render(<ConnectionManager />);

      expect(screen.getByText("Not Connected")).toBeInTheDocument();
      expect(screen.getByText("Connect X/Twitter")).toBeInTheDocument();
    });

    it("should display 'Connected' when connection is active", () => {
      const expiresAt = Date.now() + 7200000; // 2 hours from now
      (useQuery as jest.Mock).mockReturnValue({
        connected: true,
        expiresAt,
        needsReauth: false,
      });

      render(<ConnectionManager />);

      expect(screen.getByText("Connected")).toBeInTheDocument();
      expect(
        screen.getByText(/Expires:/, { exact: false })
      ).toBeInTheDocument();
    });

    it("should display 'Needs Re-authentication' when token is expired", () => {
      const expiresAt = Date.now() - 1000; // Expired 1 second ago
      (useQuery as jest.Mock).mockReturnValue({
        connected: true,
        expiresAt,
        needsReauth: true,
      });

      render(<ConnectionManager />);

      expect(
        screen.getByText("Needs Re-authentication")
      ).toBeInTheDocument();
      expect(screen.getByText("Re-connect")).toBeInTheDocument();
    });
  });

  describe("Button Visibility", () => {
    it("should show 'Connect X/Twitter' button when not connected", () => {
      (useQuery as jest.Mock).mockReturnValue({
        connected: false,
        needsReauth: false,
      });

      render(<ConnectionManager />);

      const connectButton = screen.getByText("Connect X/Twitter");
      expect(connectButton).toBeInTheDocument();
    });

    it("should show 'Re-connect' button when reauth is needed", () => {
      (useQuery as jest.Mock).mockReturnValue({
        connected: true,
        expiresAt: Date.now() - 1000,
        needsReauth: true,
      });

      render(<ConnectionManager />);

      const reconnectButton = screen.getByText("Re-connect");
      expect(reconnectButton).toBeInTheDocument();
    });

    it("should NOT show connect button when connection is active", () => {
      (useQuery as jest.Mock).mockReturnValue({
        connected: true,
        expiresAt: Date.now() + 7200000,
        needsReauth: false,
      });

      render(<ConnectionManager />);

      expect(
        screen.queryByText("Connect X/Twitter")
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Re-connect")).not.toBeInTheDocument();
    });
  });

  describe("Platform Display", () => {
    it("should render X/Twitter branding", () => {
      (useQuery as jest.Mock).mockReturnValue({
        connected: false,
        needsReauth: false,
      });

      render(<ConnectionManager />);

      expect(screen.getByText("X / Twitter")).toBeInTheDocument();
      expect(
        screen.getByText("Connect your Twitter account to schedule posts")
      ).toBeInTheDocument();
    });
  });
});
