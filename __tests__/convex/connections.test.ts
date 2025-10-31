/**
 * Integration tests for Convex connections functions
 *
 * Note: These tests use mocked Convex context.
 * The saveConnection function is now an action that encrypts tokens before storage.
 */
import {
  saveConnection,
  getConnectionStatus,
  getDecryptedConnection,
} from "@/convex/connections";

// Mock Convex database context for queries
const createMockQueryContext = () => {
  const mockDb: any = {
    query: jest.fn().mockReturnThis(),
    withIndex: jest.fn().mockReturnThis(),
    first: jest.fn(),
  };

  return {
    db: mockDb,
    auth: {
      getUserIdentity: jest.fn(),
    },
  };
};

// Mock Convex action context
const createMockActionContext = () => {
  return {
    auth: {
      getUserIdentity: jest.fn(),
    },
    runAction: jest.fn(),
    runMutation: jest.fn(),
    runQuery: jest.fn(),
  };
};

describe("Convex Connections Functions", () => {
  describe("saveConnection (action with encryption)", () => {
    it("should encrypt tokens and save connection", async () => {
      const ctx = createMockActionContext();
      const mockIdentity = { subject: "user_123" };

      ctx.auth.getUserIdentity = jest.fn().mockResolvedValue(mockIdentity);

      // Mock encryption actions
      ctx.runAction = jest
        .fn()
        .mockResolvedValueOnce("encrypted_access_token") // encrypt accessToken
        .mockResolvedValueOnce("encrypted_refresh_token"); // encrypt refreshToken

      // Mock saveConnectionInternal mutation
      ctx.runMutation = jest.fn().mockResolvedValue("conn_456");

      const args = {
        platform: "twitter",
        accessToken: "plain_access_token",
        refreshToken: "plain_refresh_token",
        expiresAt: Date.now() + 7200000,
      };

      const result = await saveConnection.handler(ctx as any, args);

      expect(ctx.auth.getUserIdentity).toHaveBeenCalled();
      expect(ctx.runAction).toHaveBeenCalledTimes(2);
      expect(ctx.runMutation).toHaveBeenCalled();
      expect(result).toBe("conn_456");
    });

    it("should throw error when user is not authenticated", async () => {
      const ctx = createMockActionContext();
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

    it("should handle encryption errors gracefully", async () => {
      const ctx = createMockActionContext();
      const mockIdentity = { subject: "user_123" };
      ctx.auth.getUserIdentity = jest.fn().mockResolvedValue(mockIdentity);

      // Mock encryption failure
      ctx.runAction = jest
        .fn()
        .mockRejectedValue(new Error("Encryption failed"));

      const args = {
        platform: "twitter",
        accessToken: "token",
        refreshToken: "refresh",
        expiresAt: Date.now() + 7200000,
      };

      await expect(
        saveConnection.handler(ctx as any, args)
      ).rejects.toThrow("Failed to save connection");
    });
  });

  describe("getDecryptedConnection (internal action)", () => {
    it("should retrieve and decrypt connection tokens", async () => {
      const ctx = createMockActionContext();

      // Mock getConnectionInternal query
      ctx.runQuery = jest.fn().mockResolvedValue({
        accessToken: "encrypted_access",
        refreshToken: "encrypted_refresh",
        expiresAt: Date.now() + 7200000,
      });

      // Mock decryption actions
      ctx.runAction = jest
        .fn()
        .mockResolvedValueOnce("decrypted_access_token")
        .mockResolvedValueOnce("decrypted_refresh_token");

      const args = {
        clerkUserId: "user_123",
        platform: "twitter",
      };

      const result = await getDecryptedConnection.handler(ctx as any, args);

      expect(result).toEqual({
        accessToken: "decrypted_access_token",
        refreshToken: "decrypted_refresh_token",
        expiresAt: expect.any(Number),
      });
      expect(ctx.runQuery).toHaveBeenCalled();
      expect(ctx.runAction).toHaveBeenCalledTimes(2);
    });

    it("should return null when connection does not exist", async () => {
      const ctx = createMockActionContext();

      ctx.runQuery = jest.fn().mockResolvedValue(null);

      const args = {
        clerkUserId: "user_123",
        platform: "twitter",
      };

      const result = await getDecryptedConnection.handler(ctx as any, args);

      expect(result).toBeNull();
      expect(ctx.runAction).not.toHaveBeenCalled();
    });

    it("should handle decryption errors gracefully", async () => {
      const ctx = createMockActionContext();

      ctx.runQuery = jest.fn().mockResolvedValue({
        accessToken: "encrypted_access",
        refreshToken: "encrypted_refresh",
        expiresAt: Date.now() + 7200000,
      });

      ctx.runAction = jest
        .fn()
        .mockRejectedValue(new Error("Decryption failed"));

      const args = {
        clerkUserId: "user_123",
        platform: "twitter",
      };

      await expect(
        getDecryptedConnection.handler(ctx as any, args)
      ).rejects.toThrow("Failed to retrieve or decrypt connection");
    });
  });

  describe("getConnectionStatus (query)", () => {
    it("should return not connected when no connection exists", async () => {
      const ctx = createMockQueryContext();
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
      const ctx = createMockQueryContext();
      const mockIdentity = { subject: "user_123" };
      const futureExpiry = Date.now() + 7200000; // 2 hours from now
      const connection = {
        _id: "conn_123",
        clerkUserId: "user_123",
        platform: "twitter",
        accessToken: "encrypted_token",
        refreshToken: "encrypted_refresh",
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
      const ctx = createMockQueryContext();
      const mockIdentity = { subject: "user_123" };
      const pastExpiry = Date.now() - 1000; // Expired 1 second ago
      const connection = {
        _id: "conn_123",
        clerkUserId: "user_123",
        platform: "twitter",
        accessToken: "encrypted_token",
        refreshToken: "encrypted_refresh",
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
      const ctx = createMockQueryContext();
      ctx.auth.getUserIdentity = jest.fn().mockResolvedValue(null);

      const args = { platform: "twitter" };

      await expect(
        getConnectionStatus.handler(ctx as any, args)
      ).rejects.toThrow("Not authenticated");
    });
  });
});
