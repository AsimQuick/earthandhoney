/**
 * ---
 * file: src/lib/resolveHomeSelectedGalleriesOrStories.tsx
 * project: earthandhoney
 * purpose: AC-34.4 — resolves StudioProfile.homeSelectedGalleriesOrStories
 *          (a polymorphic hasMany relationship into this database's own
 *          `gallery-placements`/`pages` collections — see
 *          src/globals/StudioProfile.ts, src/lib/getStudioProfile.ts) into
 *          the homepage's "selected galleries or stories" region, in the
 *          exact order the photographer set it to — never a "latest N"
 *          query. Mirrors src/lib/resolvePageGalleryPlacements.tsx's
 *          approach for the gallery case (the same Flow A boundary via
 *          src/lib/backstageGalleryPlacement.ts, the same
 *          GalleryUnavailablePlaceholder fallback so an unreachable
 *          Backstage gallery never blanks the homepage), and adds a `pages`
 *          case rendering a plain story-card link — no Flow A boundary
 *          crossing needed there since `pages` is this database's own
 *          collection, not a Backstage relation. Each selection resolves
 *          independently; one entry's failure never affects another's.
 * created-by: dev-team
 * related-story: US-34
 * related-ac: 34.4
 * ---
 */
import type { ReactNode } from 'react'

import { GalleryMasonryLayout } from '@/components/gallery/GalleryMasonryLayout'
import { GallerySlideshowLayout } from '@/components/gallery/GallerySlideshowLayout'
import { GalleryUnavailablePlaceholder } from '@/components/gallery/GalleryUnavailablePlaceholder'
import { resolveGalleryPlacementImages } from '@/lib/backstageGalleryPlacement'
import type { HomeSelectedGalleryOrStory } from '@/lib/getStudioProfile'

/**
 * Resolves each selection independently. Order in the returned array
 * matches `selections` exactly, which HomePageTemplate renders as given —
 * the photographer's curated order, unchanged.
 */
export async function resolveHomeSelectedGalleriesOrStories(
  selections: HomeSelectedGalleryOrStory[],
): Promise<ReactNode[]> {
  return Promise.all(
    selections.map(async (selection, index) => {
      if (selection.relationTo === 'pages') {
        const key = `page-${selection.slug}-${index}`
        return (
          <a key={key} href={`/${selection.slug}`} data-testid="home-selected-story-card">
            <h3>{selection.heading}</h3>
            {selection.shortIntroduction ? <p>{selection.shortIntroduction}</p> : null}
          </a>
        )
      }

      const key = `gallery-${selection.gallerySlug}-${index}`
      const result = await resolveGalleryPlacementImages(selection.gallerySlug)

      if (result.status !== 'ok') {
        return <GalleryUnavailablePlaceholder key={key} heading={selection.heading} />
      }

      return selection.layout === 'slideshow' ? (
        <GallerySlideshowLayout key={key} images={result.images} />
      ) : (
        <GalleryMasonryLayout key={key} images={result.images} />
      )
    }),
  )
}
