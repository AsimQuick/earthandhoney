/**
 * ---
 * file: src/lib/resolveDetailsMasonryPlacement.tsx
 * project: earthandhoney
 * purpose: AC-35.3 — resolves a `Pages` document's first `galleryPlacements`
 *          entry into the Details template's single full-width masonry
 *          placement slot (PRD §13.4 names one masonry placement, not a list
 *          — DetailsPageTemplate's own header already documents this), through
 *          the same Flow A boundary every other placement uses
 *          (src/lib/backstageGalleryPlacement.ts, mirroring
 *          src/lib/resolvePageGalleryPlacements.tsx and
 *          src/lib/resolveHomeHeroGalleryPlacement.tsx). Always renders
 *          GalleryMasonryLayout (AC-35.2) regardless of the placement's own
 *          `layout` field — the Details template's masonry placement is not a
 *          photographer choice the way a standard page's placement list is.
 *          No configured placement, an unreachable Backstage, or a missing
 *          gallery all render GalleryUnavailablePlaceholder instead of a
 *          blank slot or a thrown error — resolveGalleryPlacementImages never
 *          throws, so neither does this.
 * created-by: dev-team
 * related-story: US-35
 * related-ac: 35.3
 * ---
 */
import type { ReactNode } from 'react'

import { GalleryMasonryLayout } from '@/components/gallery/GalleryMasonryLayout'
import { GalleryUnavailablePlaceholder } from '@/components/gallery/GalleryUnavailablePlaceholder'
import { resolveGalleryPlacementImages } from '@/lib/backstageGalleryPlacement'
import type { PageGalleryPlacementConfig } from '@/lib/resolvePageGalleryPlacements'

const MASONRY_UNAVAILABLE_HEADING = 'Details gallery'

/**
 * Resolves the Details template's single masonry placement from a page's
 * `galleryPlacements` — only the first entry is used. Never throws.
 */
export async function resolveDetailsMasonryPlacement(
  placements: PageGalleryPlacementConfig[],
): Promise<ReactNode> {
  const [placement] = placements

  if (!placement) {
    return <GalleryUnavailablePlaceholder heading={MASONRY_UNAVAILABLE_HEADING} />
  }

  const result = await resolveGalleryPlacementImages(placement.gallerySlug)

  if (result.status !== 'ok') {
    return <GalleryUnavailablePlaceholder heading={placement.heading || MASONRY_UNAVAILABLE_HEADING} />
  }

  return <GalleryMasonryLayout images={result.images} />
}
