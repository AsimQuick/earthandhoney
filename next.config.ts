/**
 * ---
 * file: next.config.ts
 * project: earthandhoney
 * purpose: Next.js configuration, wrapped with withPayload to wire Payload CMS into the App Router build
 * created-by: dev-team
 * related-story: US-1
 * related-ac: 1.1
 * ---
 */
import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPayload(nextConfig);
