/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as connections from "../connections.js";
import type * as encryption from "../encryption.js";
import type * as encryptionHelpers from "../encryptionHelpers.js";
import type * as notifications from "../notifications.js";
import type * as posts from "../posts.js";
import type * as publishing from "../publishing.js";
import type * as tokenRefresh from "../tokenRefresh.js";

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
  connections: typeof connections;
  encryption: typeof encryption;
  encryptionHelpers: typeof encryptionHelpers;
  notifications: typeof notifications;
  posts: typeof posts;
  publishing: typeof publishing;
  tokenRefresh: typeof tokenRefresh;
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
