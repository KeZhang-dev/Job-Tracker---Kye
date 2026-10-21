import type { NextConfig } from "next";

// Pages read straight from the local PostgreSQL database on every request, so
// Cache Components / Partial Prefetching are intentionally not enabled.
const nextConfig: NextConfig = {
  // Hide the floating "N" route indicator in development; build/runtime errors still show.
  devIndicators: false,
  experimental: {
    // CSV imports (which can include long job descriptions) are sent to a server action.
    serverActions: { bodySizeLimit: "25mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
