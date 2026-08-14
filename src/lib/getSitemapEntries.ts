/**
 * ---
 * file: src/lib/getSitemapEntries.ts
 * project: earthandhoney
 * purpose: AC-37.4.1 — the ONE reader `src/app/(frontend)/sitemap.ts`
 *          consumes to build `/sitemap.xml`. The set this function returns is
 *          closed and enumerable: every `pages` row with `status: 'published'`
 *          AND `indexing: 'index'`, every `stories` row with
 *          `status: 'published'` (Stories has no `indexing` field —
 *          src/collections/Stories.ts), plus the two fixed public routes that
 *          are not database rows at all — `/` (the StudioProfile-driven
 *          homepage) and `/stories` (the US-36 AC-36.4 index) — listed
 *          explicitly below rather than inferred from any collection. No
 *          other module in this project queries `pages`/`stories` for
 *          sitemap purposes, so the sitemap's route set has exactly one
 *          place it can drift from the database. Returns site-relative paths
 *          only; the caller (`sitemap.ts`) is responsible for making each one
 *          absolute through `src/lib/absoluteSiteUrl.ts` (AC-37.3), never a
 *          re-copied `NEXT_PUBLIC_SITE_URL` literal. Draft/noindex exclusion
 *          is AC-37.4.2's evidence and image-sitemap references are
 *          AC-37.4.3's — this reader's `where` clauses already produce the
 *          right set for both, but neither is asserted here. `payload` is an
 *          ESM-only package that breaks Jest's interop boundary when imported
 *          directly (see us3-ac3.5-galleries-api-read.test.ts), so this
 *          module is exercised only via the route that imports it, never
 *          imported directly by a Jest test — the same convention
 *          src/lib/getPageBySlug.ts and src/lib/getPublishedStories.ts follow.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.4.1
 * ---
 */
import { getPayload } from 'payload'

import config from '@payload-config'

export interface SitemapEntry {
  /** Site-relative path, e.g. `/weddings` or `/stories/a-real-wedding`. */
  path: string
  /** The record's last-updated timestamp, when one exists. */
  lastModified?: Date
}

// The two fixed public routes that are not database rows (PRD's closed
// sitemap set, AC-37.4.1): the StudioProfile-driven homepage
// (src/app/(frontend)/page.tsx) and the US-36 AC-36.4 story index
// (src/app/(frontend)/stories/page.tsx). Listed explicitly so the set stays
// enumerable at a glance rather than inferred from route discovery.
const FIXED_ENTRIES: SitemapEntry[] = [{ path: '/' }, { path: '/stories' }]

export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  const payload = await getPayload({ config })

  const [pagesResult, storiesResult] = await Promise.all([
    payload.find({
      collection: 'pages',
      where: { status: { equals: 'published' }, indexing: { equals: 'index' } },
      limit: 1000,
      depth: 0,
    }),
    payload.find({
      collection: 'stories',
      where: { status: { equals: 'published' } },
      limit: 1000,
      depth: 0,
    }),
  ])

  const pageEntries: SitemapEntry[] = (pagesResult.docs as Array<{ slug?: string; updatedAt?: string }>)
    .filter((doc): doc is { slug: string; updatedAt?: string } => Boolean(doc.slug))
    .map((doc) => ({
      path: `/${doc.slug}`,
      lastModified: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
    }))

  const storyEntries: SitemapEntry[] = (storiesResult.docs as Array<{ slug?: string; updatedAt?: string }>)
    .filter((doc): doc is { slug: string; updatedAt?: string } => Boolean(doc.slug))
    .map((doc) => ({
      path: `/stories/${doc.slug}`,
      lastModified: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
    }))

  return [...FIXED_ENTRIES, ...pageEntries, ...storyEntries]
}
