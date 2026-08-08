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
 * updated-by: dev-team
 * related-story: US-29
 * related-ac: 29.2.2.1
 * ---
 */
import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const BACKSTAGE_BACKEND_URL = process.env.BACKSTAGE_BACKEND_URL || "http://backstage-backend:3000";

const nextConfig: NextConfig = {
  // photoswipe ships ESM-only (no CJS build) — transpilePackages makes both
  // the Next.js build and next/jest's test transform (which derives its
  // transformIgnorePatterns from this list) process it correctly instead of
  // failing on `export`/`import` syntax in node_modules (AC-5.1).
  transpilePackages: ["photoswipe"],
  // AC-29.2.2.1: gallery.js returns relative `/api/gallery/...` image URLs
  // that only exist on the Backstage backend, not the Next.js origin — proxy
  // the four binary image routes there over the Docker network hostname,
  // per CLAUDE.md's Docker Rules (never localhost).
  async rewrites() {
    return [
      {
        source: "/api/gallery/:slug/:kind(thumbnail|hero|photo|preview)/:photoId",
        destination: `${BACKSTAGE_BACKEND_URL}/api/gallery/:slug/:kind(thumbnail|hero|photo|preview)/:photoId`,
      },
    ];
  },
};

export default withPayload(nextConfig);
