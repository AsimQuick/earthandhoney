/**
 * ---
 * file: src/lib/resolveHomeHeroGalleryPlacement.tsx
 * project: earthandhoney
 * purpose: AC-34.3 — resolves StudioProfile.homeHeroGallerySlug (Payload
 *          global, a plain external-identifier text field — see
 *          src/globals/StudioProfile.ts) into the homepage's hero
 *          slideshow placement node, through the same Flow A boundary every
 *          other placement uses (src/lib/backstageGalleryPlacement.ts, which
 *          itself calls src/lib/backstageClient.ts /
 *          src/components/gallery/backstageGalleryMapper.ts) — mirroring
 *          src/lib/resolvePageGalleryPlacements.tsx's own approach for
 *          `Pages.galleryPlacements`. No slug configured, an unreachable
 *          Backstage, a timeout, or a 404 slug all render
 *          GalleryUnavailablePlaceholder instead of a blank hero or a thrown
 *          error — resolveGalleryPlacementImages never throws, so neither
 *          does this.
 * created-by: dev-team
 * related-story: US-34
 * related-ac: 34.3
 * ---
 */
import type { ReactNode } from 'react'

import { GalleryUnavailablePlaceholder } from '@/components/gallery/GalleryUnavailablePlaceholder'
import { HeroSlideshow } from '@/components/hero/HeroSlideshow'
import { resolveGalleryPlacementImages } from '@/lib/backstageGalleryPlacement'

const HERO_UNAVAILABLE_HEADING = 'Homepage hero gallery'

/**
 * Resolves the homepage hero placement for a given
 * `StudioProfile.homeHeroGallerySlug` value. Never throws.
 */
export async function resolveHomeHeroGalleryPlacement(
  gallerySlug: string | null | undefined,
): Promise<ReactNode> {
  if (!gallerySlug) {
    return <GalleryUnavailablePlaceholder heading={HERO_UNAVAILABLE_HEADING} />
  }

  const result = await resolveGalleryPlacementImages(gallerySlug)

  if (result.status !== 'ok') {
    return <GalleryUnavailablePlaceholder heading={HERO_UNAVAILABLE_HEADING} />
  }

  return <HeroSlideshow images={result.images} />
}
