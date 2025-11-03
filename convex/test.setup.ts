/**
 * Test setup for Convex tests using convex-test library
 *
 * Exports modules configuration for convex-test
 */

import * as postingPreferences from "./postingPreferences";
import * as recommendations from "./recommendations";
import * as posts from "./posts";
import * as userPreferences from "./userPreferences";

export const modules = {
  postingPreferences,
  recommendations,
  posts,
  userPreferences,
};
