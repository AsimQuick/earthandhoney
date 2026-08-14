/**
 * ---
 * file: src/app/(frontend)/sitemap.ts
 * project: earthandhoney
 * purpose: AC-37.4.1 — Next.js's `sitemap.(ts|js)` file convention, served at
 *          `/sitemap.xml`. Placed inside the `(frontend)` route group like
 *          every other public route (route groups are stripped from the URL,
 *          the same way `page.tsx`/`layout.tsx` already resolve to `/` from
 *          inside this group). Reads the entry list from the one source of
 *          truth, src/lib/getSitemapEntries.ts, and performs no Payload query
 *          of its own — a second query here is exactly the drift AC-37.4.1
 *          forbids. Every `<loc>` is made absolute through
 *          src/lib/absoluteSiteUrl.ts (AC-37.3) rather than a re-copied
 *          site-url-env-with-local-dev-fallback literal.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.4.1
 * ---
 */
import type { MetadataRoute } from 'next'

import { absoluteSiteUrl } from '@/lib/absoluteSiteUrl'
import { getSitemapEntries } from '@/lib/getSitemapEntries'

// The same 60-second safety-net cap every other content-reading route in
// this project carries (src/lib/backstageGalleryCache.ts's `CACHE_TTL_MS`).
export const revalidate = 60

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getSitemapEntries()

  return entries.map((entry) => ({
    url: absoluteSiteUrl(entry.path),
    ...(entry.lastModified ? { lastModified: entry.lastModified } : {}),
  }))
}
