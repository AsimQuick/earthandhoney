/**
 * ---
 * file: src/lib/resolveStoryGalleryPlacements.tsx
 * project: earthandhoney
 * purpose: AC-36.2 — resolves a `Stories` document's `sections` (each
 *          carrying a `galleryPlacement` relationship into Payload's own
 *          `gallery-placements` collection, which itself holds only a
 *          Backstage gallery `slug` as plain text — see
 *          src/collections/GalleryPlacements.ts) into renderable
 *          StoryPageTemplateSection nodes, through the same Flow A boundary
 *          resolvePageGalleryPlacements.tsx (AC-31.5) already established:
 *          src/lib/backstageGalleryPlacement.ts, which itself calls
 *          src/lib/backstageClient.ts / backstageGalleryMapper.ts. Every
 *          section is resolved by `gallerySlug` only — the external
 *          identifier — never a relation/join into the separate Backstage
 *          database (Reminder 4, the same no-cross-database-relation rule
 *          AC-31.5 established). `Promise.all` over the input array is what
 *          preserves author order in the output: each entry's own index
 *          fixes its position regardless of which network call settles
 *          first, so a reorder of the input `sections` array — no code
 *          change — changes the returned order identically. A section whose
 *          gallery is unreachable renders GalleryUnavailablePlaceholder
 *          instead of failing the whole story, matching
 *          resolvePageGalleryPlacements's per-placement isolation.
 * created-by: dev-team
 * related-story: US-36
 * related-ac: 36.2
 * ---
 */
import type { ReactNode } from 'react'

import { GalleryMasonryLayout } from '@/components/gallery/GalleryMasonryLayout'
import { GallerySlideshowLayout } from '@/components/gallery/GallerySlideshowLayout'
import { GalleryUnavailablePlaceholder } from '@/components/gallery/GalleryUnavailablePlaceholder'
import { resolveGalleryPlacementImages } from '@/lib/backstageGalleryPlacement'

import type { StoryPageTemplateSection } from '@/components/page-template/StoryPageTemplate'

export interface StoryGalleryPlacementSectionConfig {
  sectionHeading: string
  shortText: string
  /** The Backstage gallery's external identifier — never a database row. */
  gallerySlug: string
  layout: 'masonry' | 'slideshow'
  heading?: string
}

/**
 * Resolves each section's gallery placement independently and in order —
 * one section's Backstage outage never affects another's. Order in the
 * returned array matches `sections`, which StoryPageTemplate renders as
 * given.
 */
export async function resolveStoryGalleryPlacements(
  sections: StoryGalleryPlacementSectionConfig[],
): Promise<StoryPageTemplateSection[]> {
  return Promise.all(
    sections.map(async (section, index) => {
      const key = `${section.gallerySlug}-${index}`
      const result = await resolveGalleryPlacementImages(section.gallerySlug)

      const galleryPlacement: ReactNode =
        result.status !== 'ok' ? (
          <GalleryUnavailablePlaceholder key={key} heading={section.heading} />
        ) : section.layout === 'slideshow' ? (
          <GallerySlideshowLayout key={key} images={result.images} />
        ) : (
          <GalleryMasonryLayout key={key} images={result.images} />
        )

      return {
        sectionHeading: section.sectionHeading,
        shortText: section.shortText,
        galleryPlacement,
      }
    }),
  )
}
