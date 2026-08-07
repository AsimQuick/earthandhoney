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
 * created-by: dev-team
 * related-story: US-25
 * related-ac: 25.5
 * ---
 */
import type { Metadata } from 'next'

import { mapBackstageGalleryToImages } from '@/components/gallery/backstageGalleryMapper'
import { GalleryMasonryLayout } from '@/components/gallery/GalleryMasonryLayout'
import { GallerySlideshowLayout } from '@/components/gallery/GallerySlideshowLayout'
import type { GalleryImage } from '@/components/gallery/types'
import { fetchPublishedGallery } from '@/lib/backstageClient'

// Internal-only: excluded from search indexing since this route is not part
// of the public site.
export const metadata: Metadata = {
  title: 'Gallery placement demo (internal)',
  robots: { index: false, follow: false },
}

// The one Backstage gallery both placements below render — kept as a fixed,
// well-known slug (mirroring src/lib/galleryRevalidation.ts's
// ISR_DEMO_GALLERY_TITLE convention) so this route and any Backstage-side
// seed fixture can never drift apart.
export const PLACEMENT_DEMO_GALLERY_SLUG = 'us-25-ac-25.5-placement-demo'

async function getPlacementDemoImages(): Promise<GalleryImage[]> {
  const outcome = await fetchPublishedGallery(PLACEMENT_DEMO_GALLERY_SLUG)
  return outcome.ok ? mapBackstageGalleryToImages(outcome.photos) : []
}

export default async function GalleryPlacementDemoPage() {
  const images = await getPlacementDemoImages()

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
        <GalleryMasonryLayout images={images} />
      </section>

      <section
        aria-labelledby="slideshow-placement-heading"
        data-testid="slideshow-placement-demo"
        className="w-full"
      >
        <h2 id="slideshow-placement-heading" className="px-8 pb-4 text-2xl font-normal tracking-[3px] uppercase">
          Slideshow placement
        </h2>
        <GallerySlideshowLayout images={images} />
      </section>
    </main>
  )
}
