/**
 * ---
 * file: src/lib/getPageBySlug.ts
 * project: earthandhoney
 * purpose: Server-only reader for a single `Pages` (US-31 AC-31.1) document
 *          by its public URL slug, the query the AC-31.4 dynamic route uses
 *          to decide what to render. Deliberately returns the raw document
 *          — including a draft `status` — rather than filtering by
 *          `status: published` in the query itself: the route, not this
 *          reader, owns the public-reachability decision (draft → 404,
 *          published → 200), matching how src/lib/getStudioProfile.ts keeps
 *          the Local API read and its caller's policy separate. `payload` is
 *          an ESM-only package that breaks Jest's interop boundary when
 *          imported directly (see us3-ac3.5-galleries-api-read.test.ts), so
 *          this module is exercised only via the route that imports it,
 *          never imported directly by a Jest test.
 *          `template` (AC-35.3) is read straight through, defaulting to
 *          `'standard'` for any record predating that field, so the
 *          [slug] route can dispatch on it without a migration backfill.
 *          `depth: 1` on the query (AC-31.5) resolves `galleryPlacements`
 *          one level — the related `gallery-placements` document's own
 *          fields — which is exactly enough to read each placement's
 *          Backstage `gallerySlug`/`layout`/`heading`, never a level deeper
 *          into anything Backstage-owned (that collection holds no relation
 *          into the separate Backstage database in the first place; see
 *          src/collections/GalleryPlacements.ts). The same `depth: 1` also
 *          resolves the `socialImage` upload relation (AC-31.6) to its
 *          media document so the caller can read `url` without a second
 *          query.
 *          `photographyType`/`cityRegion`/`venue` (AC-37.3) are read straight
 *          through so the [slug] route can pass them into
 *          buildPageStructuredData — the same PRD §13.1 fields the Pages
 *          collection already carries as "Service context and schema" /
 *          "Local relevance" / "Venue relevance and image context"
 *          (src/collections/Pages.ts), simply unread by this module until now.
 * created-by: dev-team
 * related-story: US-31
 * related-ac: 31.4
 * updated-by: dev-team
 * related-story: US-31
 * related-ac: 31.5
 * updated-by: dev-team
 * related-story: US-31
 * related-ac: 31.6
 * updated-by: dev-team
 * related-story: US-35
 * related-ac: 35.3
 * updated-by: dev-team
 * related-story: US-37
 * related-ac: 37.3
 * ---
 */
import { getPayload } from 'payload'

import type { PageGalleryPlacementConfig } from '@/lib/resolvePageGalleryPlacements'

import config from '@payload-config'

export interface ResolvedPage {
  heading: string
  shortIntroduction: string
  seoTitle: string
  metaDescription: string
  status: 'draft' | 'published'
  indexing: 'index' | 'noindex'
  galleryPlacements: PageGalleryPlacementConfig[]
  /** The Open Graph image URL (AC-31.6), or null when the page defines none. */
  socialImage: string | null
  /** AC-35.3: which template this page renders through — 'standard' or 'details'. */
  template: 'standard' | 'details'
  /** AC-37.3: PRD §13.1 "Service context and schema" — feeds buildPageStructuredData's makesOffer. */
  photographyType: string
  /** AC-37.3: PRD §13.1 "Local relevance" — feeds buildPageStructuredData's areaServed. */
  cityRegion: string
  /** AC-37.3: PRD §13.1 "Venue relevance and image context" — feeds buildPageStructuredData's location. */
  venue: string
}

export async function getPageBySlug(slug: string): Promise<ResolvedPage | null> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })

  const doc = result.docs[0] as
    | {
        heading?: string
        shortIntroduction?: string
        seoTitle?: string
        metaDescription?: string
        status?: string
        indexing?: string
        galleryPlacements?: Array<{
          gallerySlug?: string
          layout?: string
          heading?: string
        } | null>
        socialImage?: { url?: string } | number | null
        template?: string
        photographyType?: string
        cityRegion?: string
        venue?: string
      }
    | undefined

  if (!doc) {
    return null
  }

  const socialImage =
    doc.socialImage && typeof doc.socialImage === 'object' && doc.socialImage.url ? doc.socialImage.url : null

  const galleryPlacements: PageGalleryPlacementConfig[] = (doc.galleryPlacements ?? [])
    .filter((placement): placement is NonNullable<typeof placement> => Boolean(placement?.gallerySlug))
    .map((placement) => ({
      gallerySlug: placement.gallerySlug as string,
      layout: placement.layout === 'slideshow' ? 'slideshow' : 'masonry',
      heading: placement.heading || undefined,
    }))

  return {
    heading: doc.heading || '',
    shortIntroduction: doc.shortIntroduction || '',
    seoTitle: doc.seoTitle || '',
    metaDescription: doc.metaDescription || '',
    status: doc.status === 'published' ? 'published' : 'draft',
    indexing: doc.indexing === 'noindex' ? 'noindex' : 'index',
    galleryPlacements,
    socialImage,
    template: doc.template === 'details' ? 'details' : 'standard',
    photographyType: doc.photographyType || '',
    cityRegion: doc.cityRegion || '',
    venue: doc.venue || '',
  }
}
