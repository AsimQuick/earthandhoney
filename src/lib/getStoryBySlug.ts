/**
 * ---
 * file: src/lib/getStoryBySlug.ts
 * project: earthandhoney
 * purpose: AC-37.2 — server-only reader for a single `Stories` (US-36
 *          AC-36.1) document by its public URL slug, the query the new
 *          `stories/[slug]` route uses to decide what to render and what
 *          metadata to emit. Mirrors src/lib/getPageBySlug.ts exactly: the
 *          raw document is returned — including a draft `status` — so the
 *          route, not this reader, owns the public-reachability decision;
 *          `payload` is ESM-only and breaks Jest's interop boundary when
 *          imported directly (see us3-ac3.5-galleries-api-read.test.ts), so
 *          this module is exercised only via the route that imports it,
 *          never imported directly by a Jest test. `depth: 1` resolves each
 *          section's `galleryPlacement` relationship to the related
 *          `gallery-placements` document's own fields — exactly enough to
 *          read `gallerySlug`/`layout`/`heading`, the same depth
 *          getPageBySlug uses for `Pages.galleryPlacements` — never a level
 *          deeper into anything Backstage-owned (Reminder 4).
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.2
 * ---
 */
import { getPayload } from 'payload'

import type { StoryGalleryPlacementSectionConfig } from '@/lib/resolveStoryGalleryPlacements'

import config from '@payload-config'

export interface ResolvedStory {
  title: string
  subtitleIntroduction: string
  status: 'draft' | 'published'
  sections: StoryGalleryPlacementSectionConfig[]
}

export async function getStoryBySlug(slug: string): Promise<ResolvedStory | null> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'stories',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })

  const doc = result.docs[0] as
    | {
        title?: string
        subtitleIntroduction?: string
        status?: string
        sections?: Array<{
          sectionHeading?: string
          shortText?: string
          galleryPlacement?: { gallerySlug?: string; layout?: string; heading?: string } | number | null
        } | null>
      }
    | undefined

  if (!doc) {
    return null
  }

  const sections: StoryGalleryPlacementSectionConfig[] = (doc.sections ?? [])
    .filter((section): section is NonNullable<typeof section> => Boolean(section))
    .map((section) => {
      const placement =
        section.galleryPlacement && typeof section.galleryPlacement === 'object' ? section.galleryPlacement : null
      return {
        sectionHeading: section.sectionHeading || '',
        shortText: section.shortText || '',
        gallerySlug: placement?.gallerySlug || '',
        layout: placement?.layout === 'slideshow' ? ('slideshow' as const) : ('masonry' as const),
        heading: placement?.heading || undefined,
      }
    })
    .filter((section) => Boolean(section.gallerySlug))

  return {
    title: doc.title || '',
    subtitleIntroduction: doc.subtitleIntroduction || '',
    status: doc.status === 'published' ? 'published' : 'draft',
    sections,
  }
}
