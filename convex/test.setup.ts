/**
 * Test setup for Convex tests using convex-test library
 *
 * Exports modules configuration for convex-test
 */

import schema from "./schema";

export const modules = {
  postingPreferences: async () => import("./postingPreferences"),
  recommendations: async () => import("./recommendations"),
  posts: async () => import("./posts"),
  userPreferences: async () => import("./userPreferences"),
  gemini: async () => import("./gemini"),
  aiAssistant: async () => import("./aiAssistant"),
  aiFeedback: async () => import("./aiFeedback"),
  aiUsageTracking: async () => import("./aiUsageTracking"),
};

export { schema };
