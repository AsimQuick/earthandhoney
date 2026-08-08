/**
 * ---
 * file: src/app/(frontend)/dev/benchmark-portfolio-gallery/page.tsx
 * project: earthandhoney
 * purpose: AC-29.1/29.1.1 — one of the two representative pages
 *          R2_STORAGE_AND_DELIVERY_ADR.md's benchmark section names: "a
 *          portfolio gallery page". Mirrors CLAUDE.md's "Photo-driven
 *          Frontstage" pillar (big full-width imagery, restrained copy) —
 *          a single US-25 GalleryPlacement (masonry layout) filling the
 *          page, fetched through the same Flow A pipeline every other
 *          gallery-bearing route uses
 *          (resolveGalleryPlacementImages -> fetchPublishedGallery ->
 *          backstageGalleryMapper). Deliberately the thinnest possible
 *          wrapper around GalleryMasonryLayout — a real portfolio landing
 *          page is image-first with almost no surrounding copy, which is
 *          exactly the shape the Lighthouse harness
 *          (src/lib/benchmark/runHarness.ts) needs to measure against the
 *          blog/story page's very different, copy-heavy shape. Internal
 *          noindex route, not linked from public navigation, like every
 *          other route under src/app/(frontend)/dev/ — US-25's own
 *          placement-demo route is the pattern this follows.
 *          AC-29.1.1: proven to actually render that gallery — rather than
 *          silently falling back to GalleryUnavailablePlaceholder, which
 *          would make every number measured here meaningless — by
 *          scripts/ac29.1.1-benchmark-render-proof.sh, whose fetched HTML
 *          and seeding summary are retained under
 *          scripts/benchmark/results/ac29.1.1-render-proof/.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.1.1
 * ---
 */
import type { Metadata } from 'next'

import { GalleryMasonryLayout } from '@/components/gallery/GalleryMasonryLayout'
import { GalleryUnavailablePlaceholder } from '@/components/gallery/GalleryUnavailablePlaceholder'
import { resolveGalleryPlacementImages } from '@/lib/backstageGalleryPlacement'
import { PLACEMENT_DEMO_GALLERY_SLUG } from '@/lib/galleryRevalidation'

// Matches every other gallery-bearing route's safety-net cap
// (PAYLOAD_PICPEAK_API_CONTRACT.md row 5) — see gallery-placement-demo's
// docblock for the full reasoning.
export const revalidate = 60

export const metadata: Metadata = {
  title: 'Benchmark: portfolio gallery (internal)',
  robots: { index: false, follow: false },
}

export default async function BenchmarkPortfolioGalleryPage() {
  const result = await resolveGalleryPlacementImages(PLACEMENT_DEMO_GALLERY_SLUG)
  const images = result.status === 'ok' ? result.images : null

  return (
    <main data-testid="benchmark-portfolio-page" className="w-full">
      {images ? <GalleryMasonryLayout images={images} /> : <GalleryUnavailablePlaceholder />}
    </main>
  )
}
