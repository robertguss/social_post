import {
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * INTERNAL QUERY: Get all user connections for migration.
 */
export const getAllConnectionsForMigration = internalQuery({
  args: {},
  handler: async (ctx): Promise<Array<{
    _id: any;
    accessToken: string;
    refreshToken: string;
  }>> => {
    const connections = await ctx.db.query("user_connections").collect();
    return connections.map((c) => ({
      _id: c._id,
      accessToken: c.accessToken,
      refreshToken: c.refreshToken,
    }));
  },
});

/**
 * INTERNAL MUTATION: Update connection tokens during migration.
 */
export const updateConnectionTokens = internalMutation({
  args: {
    connectionId: v.id("user_connections"),
    accessToken: v.string(),
    refreshToken: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    await ctx.db.patch(args.connectionId, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
    });
    return null;
  },
});
