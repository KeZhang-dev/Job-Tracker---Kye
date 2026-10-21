import type { NextConfig } from "next";

// This app is fully client-side (data lives in the browser's IndexedDB), so
// Cache Components / Partial Prefetching are intentionally not enabled.
const nextConfig: NextConfig = {
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
