import { AuthConfig } from "convex/server";

// Runtime validation for required environment variables
const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL;

if (!CONVEX_SITE_URL) {
  throw new Error(
    "Missing required environment variable: CONVEX_SITE_URL. " +
    "Please set CONVEX_SITE_URL in your Convex dashboard environment variables. " +
    "This should be your Convex deployment URL (e.g., https://your-deployment.convex.cloud)."
  );
}

const config = {
  providers: [
    {
      domain: CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;

export default config;
