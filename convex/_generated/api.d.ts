/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as analyticsQueries from "../analyticsQueries.js";
import type * as connections from "../connections.js";
import type * as dashboard from "../dashboard.js";
import type * as drafts from "../drafts.js";
import type * as encryption from "../encryption.js";
import type * as encryptionHelpers from "../encryptionHelpers.js";
import type * as notifications from "../notifications.js";
import type * as postingPreferences from "../postingPreferences.js";
import type * as posts from "../posts.js";
import type * as publishing from "../publishing.js";
import type * as queues from "../queues.js";
import type * as recommendations from "../recommendations.js";
import type * as seedRecommendations from "../seedRecommendations.js";
import type * as templates from "../templates.js";
import type * as tokenRefresh from "../tokenRefresh.js";
import type * as userPreferences from "../userPreferences.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  analyticsQueries: typeof analyticsQueries;
  connections: typeof connections;
  dashboard: typeof dashboard;
  drafts: typeof drafts;
  encryption: typeof encryption;
  encryptionHelpers: typeof encryptionHelpers;
  notifications: typeof notifications;
  postingPreferences: typeof postingPreferences;
  posts: typeof posts;
  publishing: typeof publishing;
  queues: typeof queues;
  recommendations: typeof recommendations;
  seedRecommendations: typeof seedRecommendations;
  templates: typeof templates;
  tokenRefresh: typeof tokenRefresh;
  userPreferences: typeof userPreferences;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
