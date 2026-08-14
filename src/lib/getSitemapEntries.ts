/**
 * ---
 * file: src/lib/getSitemapEntries.ts
 * project: earthandhoney
 * purpose: AC-37.4.1 — the ONE reader `src/app/(frontend)/sitemap.ts`
 *          consumes to build `/sitemap.xml`. The set this function returns is
 *          closed and enumerable: every `pages` row with `status: 'published'`
 *          AND `indexing: 'index'`, every `stories` row with
 *          `status: 'published'` AND `indexing: 'index'` (AC-37.6.1 added the
 *          `indexing` field to `src/collections/Stories.ts`, the same select
 *          field `pages` already carried — the story query now applies the
 *          identical condition inside the `where` clause, not as a
 *          post-filter), plus the two fixed public routes that
 *          are not database rows at all — `/` (the StudioProfile-driven
 *          homepage) and `/stories` (the US-36 AC-36.4 index) — listed
 *          explicitly below rather than inferred from any collection. No
 *          other module in this project queries `pages`/`stories` for
 *          sitemap purposes, so the sitemap's route set has exactly one
 *          place it can drift from the database. Returns site-relative paths
 *          only; the caller (`sitemap.ts`) is responsible for making each one
 *          absolute through `src/lib/absoluteSiteUrl.ts` (AC-37.3), never a
 *          re-copied `NEXT_PUBLIC_SITE_URL` literal. Draft/noindex exclusion
 *          is AC-37.4.2's evidence, proven separately.
 *          `payload` is an ESM-only package that breaks Jest's interop
 *          boundary when imported directly (see
 *          us3-ac3.5-galleries-api-read.test.ts), so this module is
 *          exercised only via the route that imports it, never imported
 *          directly by a Jest test — the same convention
 *          src/lib/getPageBySlug.ts and src/lib/getPublishedStories.ts follow.
 *          AC-37.4.3 — each `pages`/`stories` query now runs at `depth: 1` (up
 *          from `depth: 0`), the same depth src/lib/getPageBySlug.ts and
 *          src/lib/getStoryBySlug.ts already use, so `galleryPlacements`
 *          (pages) and `sections[].galleryPlacement` (stories) resolve to
 *          their related `gallery-placements` document and its `gallerySlug`
 *          text field — never a level deeper into anything Backstage-owned,
 *          since that collection holds no relation into the separate
 *          Backstage database in the first place (Reminder 4;
 *          src/collections/GalleryPlacements.ts). Each distinct `gallerySlug`
 *          a page/story carries is resolved through the SAME Flow A boundary
 *          the page templates already use —
 *          `resolveGalleryPlacementImages` (src/lib/backstageGalleryPlacement.ts)
 *          over src/lib/backstageClient.ts — never a second Backstage client.
 *          `resolveGalleryPlacementImages` never throws, so a placement whose
 *          gallery is unreachable simply contributes no images to that
 *          entry, matching its "no partial gallery" contract rather than
 *          failing or 500-ing the sitemap. Which of a resolved photo's tiers
 *          becomes its `<image:loc>` is `src/lib/sitemapImagePath.ts`'s single
 *          rule: the Backstage-relative
 *          `/api/gallery/:slug/(thumbnail|hero|photo|preview)/:photoId` path
 *          src/components/gallery/backstageGalleryMapper.ts maps and the
 *          AC-29.2.2.1 `next.config.ts` rewrite already serves publicly on
 *          this origin — never gallery.js's `/api/secure-images/…/{{token}}`
 *          template form, which is a delivery path the rewrite does not proxy.
 *          Returned here site-relative, same as `path`, and made absolute by
 *          `sitemap.ts` through the same `absoluteSiteUrl` call.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.4.1
 * updated-by: dev-team
 * related-story: US-37
 * related-ac: 37.4.3
 * updated-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.1
 * ---
 */
import { getPayload } from 'payload'

import { resolveGalleryPlacementImages } from '@/lib/backstageGalleryPlacement'
import { sitemapImagePath } from '@/lib/sitemapImagePath'

import config from '@payload-config'

export interface SitemapEntry {
  /** Site-relative path, e.g. `/weddings` or `/stories/a-real-wedding`. */
  path: string
  /** The record's last-updated timestamp, when one exists. */
  lastModified?: Date
  /** AC-37.4.3: site-relative Backstage photo paths for this entry's placed gallery imagery, when it carries any. */
  images?: string[]
}

interface GalleryPlacementRef {
  gallerySlug?: string
}

interface PageDoc {
  slug?: string
  updatedAt?: string
  galleryPlacements?: Array<GalleryPlacementRef | number | null>
}

interface StoryDoc {
  slug?: string
  updatedAt?: string
  sections?: Array<{ galleryPlacement?: GalleryPlacementRef | number | null } | null>
}

/**
 * Resolves each distinct gallery slug through Flow A exactly once, then
 * flattens every resolved photo's publicly-served path (sitemapImagePath) into
 * one list. A slug whose gallery is unreachable contributes nothing — never a
 * partial list, never a thrown error (resolveGalleryPlacementImages's own
 * contract) — and so does a photo with no publicly-resolvable tier.
 */
async function resolvePlacementImagePaths(gallerySlugs: string[]): Promise<string[]> {
  const uniqueSlugs = Array.from(new Set(gallerySlugs))
  if (uniqueSlugs.length === 0) {
    return []
  }

  const results = await Promise.all(uniqueSlugs.map((slug) => resolveGalleryPlacementImages(slug)))

  return results.flatMap((result) =>
    result.status === 'ok'
      ? result.images
          .map((image) => sitemapImagePath(image))
          .filter((path): path is string => path !== undefined)
      : [],
  )
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
      // AC-37.4.3: depth 1 resolves each `galleryPlacements` relation to its
      // `gallery-placements` document — exactly enough to read `gallerySlug`.
      depth: 1,
    }),
    payload.find({
      collection: 'stories',
      // AC-37.6.1: same closed-set condition as the `pages` query above, now
      // that `indexing` exists on `stories` too.
      where: { status: { equals: 'published' }, indexing: { equals: 'index' } },
      limit: 1000,
      // AC-37.4.3: depth 1 resolves each section's `galleryPlacement` relation.
      depth: 1,
    }),
  ])

  const pageEntries: SitemapEntry[] = await Promise.all(
    (pagesResult.docs as PageDoc[])
      .filter((doc): doc is PageDoc & { slug: string } => Boolean(doc.slug))
      .map(async (doc) => {
        const gallerySlugs = (doc.galleryPlacements ?? [])
          .map((placement) => (placement && typeof placement === 'object' ? placement.gallerySlug : undefined))
          .filter((slug): slug is string => Boolean(slug))
        const images = await resolvePlacementImagePaths(gallerySlugs)

        return {
          path: `/${doc.slug}`,
          lastModified: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
          ...(images.length > 0 ? { images } : {}),
        }
      }),
  )

  const storyEntries: SitemapEntry[] = await Promise.all(
    (storiesResult.docs as StoryDoc[])
      .filter((doc): doc is StoryDoc & { slug: string } => Boolean(doc.slug))
      .map(async (doc) => {
        const gallerySlugs = (doc.sections ?? [])
          .map((section) =>
            section?.galleryPlacement && typeof section.galleryPlacement === 'object'
              ? section.galleryPlacement.gallerySlug
              : undefined,
          )
          .filter((slug): slug is string => Boolean(slug))
        const images = await resolvePlacementImagePaths(gallerySlugs)

        return {
          path: `/stories/${doc.slug}`,
          lastModified: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
          ...(images.length > 0 ? { images } : {}),
        }
      }),
  )

  return [...FIXED_ENTRIES, ...pageEntries, ...storyEntries]
}
