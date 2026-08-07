/**
 * ---
 * file: src/app/(frontend)/dev/gallery-placement-demo/page.tsx
 * project: earthandhoney
 * purpose: Internal demo/test-harness route for AC-25.5 — proves PRD §14's
 *          core claim that layout is a placement concern by fetching one
 *          Backstage gallery exactly once (Flow A: fetchPublishedGallery,
 *          the same src/lib/backstageClient.ts AC-25.2 built) and rendering
 *          the resulting photo list through two different Payload
 *          GalleryPlacement layouts side by side: GalleryMasonryLayout
 *          (PRD §15.1) and GallerySlideshowLayout (PRD §15.2). Both sections
 *          are handed the exact same `images` array — the underlying
 *          gallery never changes between placements, only its layout does.
 *          Not linked from public navigation, not a public marketing page;
 *          excluded from search indexing like every other route under
 *          src/app/(frontend)/dev/.
 *          AC-26.5 — `export const revalidate` is set to the same
 *          60-second safety-net cap PAYLOAD_PICPEAK_API_CONTRACT.md commits
 *          to (and gallery-webhook-proof/page.tsx already carries): this
 *          route is one of the two gallery-bearing routes
 *          `getGalleryBearingPathsForSlug` can resolve a webhook delivery
 *          to, so a dropped/failed delivery for *this* slug must still
 *          self-heal within the same bound, not stay stale indefinitely
 *          just because this route predates that convention.
 * created-by: dev-team
 * related-story: US-25
 * related-ac: 25.5
 * updated-by: dev-team
 * related-story: US-25
 * related-ac: 25.6
 * updated-by: dev-team
 * related-story: US-26
 * related-ac: 26.2
 * updated-by: dev-team
 * related-story: US-26
 * related-ac: 26.5
 * ---
 */
import type { Metadata } from 'next'

import { GalleryMasonryLayout } from '@/components/gallery/GalleryMasonryLayout'
import { GallerySlideshowLayout } from '@/components/gallery/GallerySlideshowLayout'
import { GalleryUnavailablePlaceholder } from '@/components/gallery/GalleryUnavailablePlaceholder'
import { resolveGalleryPlacementImages } from '@/lib/backstageGalleryPlacement'
import { PLACEMENT_DEMO_GALLERY_SLUG } from '@/lib/galleryRevalidation'

// Re-exported (not just imported) so existing callers/tests that import this
// constant from this route module — its home before AC-26.2 re-keyed
// src/lib/galleryRevalidation.ts to be the single source of truth — keep
// working unchanged.
export { PLACEMENT_DEMO_GALLERY_SLUG }

// The contract's own safety-net cap (row 5) — see the file header. Bounds
// this route's staleness even when a webhook delivery for it is dropped.
export const revalidate = 60

// Internal-only: excluded from search indexing since this route is not part
// of the public site.
export const metadata: Metadata = {
  title: 'Gallery placement demo (internal)',
  robots: { index: false, follow: false },
}

export default async function GalleryPlacementDemoPage() {
  // AC-25.6: on an unreachable Backstage, a timeout, or a 404 slug, this
  // resolves to `{ status: 'unavailable' }` — logged once inside
  // resolveGalleryPlacementImages — rather than throwing or handing back an
  // empty image list indistinguishable from a real zero-photo gallery.
  const result = await resolveGalleryPlacementImages(PLACEMENT_DEMO_GALLERY_SLUG)
  const images = result.status === 'ok' ? result.images : null

  return (
    <main className="flex flex-col gap-16 py-8">
      <p role="note" className="px-8">
        Internal demo/test-harness route for AC-25.5 — the same Backstage
        gallery (slug &quot;{PLACEMENT_DEMO_GALLERY_SLUG}&quot;), fetched
        once, rendered through two distinct Payload GalleryPlacement layouts
        below to prove PRD §14&apos;s claim that layout is a placement
        concern, not a gallery concern. Not linked from public navigation.
      </p>

      <section
        aria-labelledby="masonry-placement-heading"
        data-testid="masonry-placement-demo"
        className="w-full px-8"
      >
        <h2 id="masonry-placement-heading" className="pb-4 text-2xl font-normal tracking-[3px] uppercase">
          Masonry placement
        </h2>
        {images ? <GalleryMasonryLayout images={images} /> : <GalleryUnavailablePlaceholder />}
      </section>

      <section
        aria-labelledby="slideshow-placement-heading"
        data-testid="slideshow-placement-demo"
        className="w-full"
      >
        <h2 id="slideshow-placement-heading" className="px-8 pb-4 text-2xl font-normal tracking-[3px] uppercase">
          Slideshow placement
        </h2>
        {images ? <GallerySlideshowLayout images={images} /> : <GalleryUnavailablePlaceholder />}
      </section>
    </main>
  )
}
