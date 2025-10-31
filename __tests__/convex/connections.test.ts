/**
 * Integration tests for Convex connections functions
 *
 * Note: These tests use mocked Convex context.
 * For full integration testing, use Convex's test harness in a real deployment.
 */
import { saveConnection, getConnectionStatus } from "@/convex/connections";

// Mock Convex database context
const createMockContext = () => {
  const mockDb: any = {
    query: jest.fn().mockReturnThis(),
    withIndex: jest.fn().mockReturnThis(),
    first: jest.fn(),
    insert: jest.fn(),
    patch: jest.fn(),
  };

  return {
    db: mockDb,
    auth: {
      getUserIdentity: jest.fn(),
    },
  };
};

describe("Convex Connections Functions", () => {
  describe("saveConnection", () => {
    it("should create a new connection when none exists", async () => {
      const ctx = createMockContext();
      const mockIdentity = { subject: "user_123" };
      ctx.auth.getUserIdentity = jest.fn().mockResolvedValue(mockIdentity);
      ctx.db.first = jest.fn().mockResolvedValue(null);
      ctx.db.insert = jest.fn().mockResolvedValue("conn_456");

      const args = {
        platform: "twitter",
        accessToken: "access_token_123",
        refreshToken: "refresh_token_456",
        expiresAt: Date.now() + 7200000,
      };

      const result = await saveConnection.handler(ctx as any, args);

      expect(ctx.auth.getUserIdentity).toHaveBeenCalled();
      expect(ctx.db.query).toHaveBeenCalledWith("user_connections");
      expect(ctx.db.insert).toHaveBeenCalledWith("user_connections", {
        clerkUserId: "user_123",
        platform: "twitter",
        accessToken: "access_token_123",
        refreshToken: "refresh_token_456",
        expiresAt: args.expiresAt,
      });
      expect(result).toBe("conn_456");
    });

    it("should update existing connection", async () => {
      const ctx = createMockContext();
      const mockIdentity = { subject: "user_123" };
      const existingConnection = {
        _id: "conn_existing",
        clerkUserId: "user_123",
        platform: "twitter",
        accessToken: "old_token",
        refreshToken: "old_refresh",
        expiresAt: Date.now() + 3600000,
      };

      ctx.auth.getUserIdentity = jest.fn().mockResolvedValue(mockIdentity);
      ctx.db.first = jest.fn().mockResolvedValue(existingConnection);
      ctx.db.patch = jest.fn().mockResolvedValue(undefined);

      const args = {
        platform: "twitter",
        accessToken: "new_access_token",
        refreshToken: "new_refresh_token",
        expiresAt: Date.now() + 7200000,
      };

      const result = await saveConnection.handler(ctx as any, args);

      expect(ctx.db.patch).toHaveBeenCalledWith("conn_existing", {
        accessToken: "new_access_token",
        refreshToken: "new_refresh_token",
        expiresAt: args.expiresAt,
      });
      expect(result).toBe("conn_existing");
    });

    it("should throw error when user is not authenticated", async () => {
      const ctx = createMockContext();
      ctx.auth.getUserIdentity = jest.fn().mockResolvedValue(null);

      const args = {
        platform: "twitter",
        accessToken: "token",
        refreshToken: "refresh",
        expiresAt: Date.now() + 7200000,
      };

      await expect(
        saveConnection.handler(ctx as any, args)
      ).rejects.toThrow("Not authenticated");
    });
  });

  describe("getConnectionStatus", () => {
    it("should return not connected when no connection exists", async () => {
      const ctx = createMockContext();
      const mockIdentity = { subject: "user_123" };
      ctx.auth.getUserIdentity = jest.fn().mockResolvedValue(mockIdentity);
      ctx.db.first = jest.fn().mockResolvedValue(null);

      const args = { platform: "twitter" };

      const result = await getConnectionStatus.handler(ctx as any, args);

      expect(result).toEqual({
        connected: false,
        needsReauth: false,
      });
    });

    it("should return connected with valid token", async () => {
      const ctx = createMockContext();
      const mockIdentity = { subject: "user_123" };
      const futureExpiry = Date.now() + 7200000; // 2 hours from now
      const connection = {
        _id: "conn_123",
        clerkUserId: "user_123",
        platform: "twitter",
        accessToken: "token",
        refreshToken: "refresh",
        expiresAt: futureExpiry,
      };

      ctx.auth.getUserIdentity = jest.fn().mockResolvedValue(mockIdentity);
      ctx.db.first = jest.fn().mockResolvedValue(connection);

      const args = { platform: "twitter" };

      const result = await getConnectionStatus.handler(ctx as any, args);

      expect(result).toEqual({
        connected: true,
        expiresAt: futureExpiry,
        needsReauth: false,
      });
    });

    it("should return needsReauth when token is expired", async () => {
      const ctx = createMockContext();
      const mockIdentity = { subject: "user_123" };
      const pastExpiry = Date.now() - 1000; // Expired 1 second ago
      const connection = {
        _id: "conn_123",
        clerkUserId: "user_123",
        platform: "twitter",
        accessToken: "token",
        refreshToken: "refresh",
        expiresAt: pastExpiry,
      };

      ctx.auth.getUserIdentity = jest.fn().mockResolvedValue(mockIdentity);
      ctx.db.first = jest.fn().mockResolvedValue(connection);

      const args = { platform: "twitter" };

      const result = await getConnectionStatus.handler(ctx as any, args);

      expect(result).toEqual({
        connected: true,
        expiresAt: pastExpiry,
        needsReauth: true,
      });
    });

    it("should throw error when user is not authenticated", async () => {
      const ctx = createMockContext();
      ctx.auth.getUserIdentity = jest.fn().mockResolvedValue(null);

      const args = { platform: "twitter" };

      await expect(
        getConnectionStatus.handler(ctx as any, args)
      ).rejects.toThrow("Not authenticated");
    });
  });
});
