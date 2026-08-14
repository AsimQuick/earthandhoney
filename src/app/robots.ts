/**
 * ---
 * file: src/app/robots.ts
 * project: earthandhoney
 * purpose: AC-37.5 — Next.js's `robots.(ts|js)` file convention, served at
 *          `/robots.txt`. Deliberately at the true `src/app/` root rather
 *          than nested inside the `(frontend)` route group the way
 *          `sitemap.ts` is: verified empirically against this project's
 *          Turbopack dev server (Next 16) that a `(frontend)/robots.ts`
 *          silently never compiles into a route (no chunk under
 *          `.next/dev/server/app/`, a live 404 with no build error) while
 *          the identical file one level up at `src/app/robots.ts` serves
 *          correctly — an asymmetry from `sitemap.ts`, which does resolve
 *          from inside the route group, so this is not a pattern to copy
 *          onto other metadata-route files without re-verifying each one.
 *          Points crawlers at the real sitemap through
 *          `src/lib/absoluteSiteUrl.ts` — the same single-owner origin
 *          resolver `sitemap.ts` and the root layout's `metadataBase`
 *          already use, never a re-copied
 *          site-url-env-with-local-dev-fallback literal — and disallows the
 *          `/dev/` demo/specimen tree as a second, crawler-facing layer on
 *          top of the per-route `robots: { index: false, follow: false }`
 *          metadata every route under `src/app/(frontend)/dev/` already
 *          carries (AC-23.5 and its successors). `/admin` is disallowed for
 *          the same reason: it is Backstage's own surface, never a
 *          client-facing one (CLAUDE.md: "There is no fourth surface").
 *          Neither exclusion changes what is already true — the `/dev/`
 *          routes were already unreachable from the sitemap because
 *          `src/lib/getSitemapEntries.ts` only ever reads the `pages` and
 *          `stories` collections plus two fixed, explicitly-listed routes —
 *          this file makes the crawl-time contract explicit and testable in
 *          its own right, per this AC's "robots.txt is correct" bar.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.5
 * ---
 */
import type { MetadataRoute } from 'next'

import { absoluteSiteUrl } from '@/lib/absoluteSiteUrl'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dev/', '/admin'],
    },
    sitemap: absoluteSiteUrl('/sitemap.xml'),
  }
}
