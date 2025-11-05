/**
 * Test setup for Convex tests using convex-test library
 *
 * Exports modules configuration for convex-test
 */

export const modules = {
  postingPreferences: async () => import("./postingPreferences"),
  recommendations: async () => import("./recommendations"),
  posts: async () => import("./posts"),
  userPreferences: async () => import("./userPreferences"),
};
