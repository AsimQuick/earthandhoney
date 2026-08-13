/**
 * ---
 * file: src/lib/resolvePageGalleryPlacements.tsx
 * project: earthandhoney
 * purpose: AC-31.5 — resolves a `Pages` document's `galleryPlacements`
 *          (Payload relationships into the `gallery-placements` collection,
 *          each holding only a Backstage gallery `slug` as plain text — see
 *          src/collections/GalleryPlacements.ts) into renderable nodes for
 *          StandardPageTemplate, through the same Flow A boundary every
 *          other placement uses (src/lib/backstageGalleryPlacement.ts,
 *          which itself calls src/lib/backstageClient.ts /
 *          src/components/gallery/backstageGalleryMapper.ts). A placement
 *          whose gallery cannot be reached renders
 *          GalleryUnavailablePlaceholder instead of failing the page —
 *          resolveGalleryPlacementImages never throws, so neither does this.
 *          Deliberately takes only `gallerySlug`/`layout`/`heading` — the
 *          external identifier and display config — never a Backstage
 *          database row, matching Reminder 4's no-cross-database-join rule.
 * created-by: dev-team
 * related-story: US-31
 * related-ac: 31.5
 * ---
 */
import type { ReactNode } from 'react'

import { GalleryMasonryLayout } from '@/components/gallery/GalleryMasonryLayout'
import { GallerySlideshowLayout } from '@/components/gallery/GallerySlideshowLayout'
import { GalleryUnavailablePlaceholder } from '@/components/gallery/GalleryUnavailablePlaceholder'
import { resolveGalleryPlacementImages } from '@/lib/backstageGalleryPlacement'

export interface PageGalleryPlacementConfig {
  /** The Backstage gallery's external identifier — never a database row. */
  gallerySlug: string
  layout: 'masonry' | 'slideshow'
  heading?: string
}

/**
 * Resolves each placement independently and in order — one placement's
 * Backstage outage never affects another's. Order in the returned array
 * matches `placements`, which StandardPageTemplate renders as given.
 */
export async function resolvePageGalleryPlacements(
  placements: PageGalleryPlacementConfig[],
): Promise<ReactNode[]> {
  return Promise.all(
    placements.map(async (placement, index) => {
      const key = `${placement.gallerySlug}-${index}`
      const result = await resolveGalleryPlacementImages(placement.gallerySlug)

      if (result.status !== 'ok') {
        return <GalleryUnavailablePlaceholder key={key} heading={placement.heading} />
      }

      return placement.layout === 'slideshow' ? (
        <GallerySlideshowLayout key={key} images={result.images} />
      ) : (
        <GalleryMasonryLayout key={key} images={result.images} />
      )
    }),
  )
}
