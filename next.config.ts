/**
 * ---
 * file: next.config.ts
 * project: earthandhoney
 * purpose: Next.js configuration, wrapped with withPayload to wire Payload CMS into the App Router build
 * created-by: dev-team
 * related-story: US-1
 * related-ac: 1.1
 * updated-by: dev-team
 * related-story: US-5
 * related-ac: 5.1
 * ---
 */
import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  // photoswipe ships ESM-only (no CJS build) — transpilePackages makes both
  // the Next.js build and next/jest's test transform (which derives its
  // transformIgnorePatterns from this list) process it correctly instead of
  // failing on `export`/`import` syntax in node_modules (AC-5.1).
  transpilePackages: ["photoswipe"],
};

export default withPayload(nextConfig);
