/**
 * ---
 * file: src/app/(frontend)/dev/benchmark-story-gallery/page.tsx
 * project: earthandhoney
 * purpose: AC-29.1/29.1.1 — the second of the two representative pages
 *          R2_STORAGE_AND_DELIVERY_ADR.md's benchmark section names: "a
 *          blog gallery page", built on the US-25 GalleryPlacement model.
 *          Deliberately shaped differently from
 *          dev/benchmark-portfolio-gallery/page.tsx's image-only page: a
 *          real amount of narrative copy (the wedding-story article shape
 *          this route stands in for) surrounds a single US-25
 *          GalleryPlacement rendered as GallerySlideshowLayout — PRD
 *          §15.2's story-embedded placement, which only ever keeps the
 *          current + next image mounted (see
 *          us25-ac25.5-gallery-placement-layouts.test.tsx). That is a
 *          genuinely different image-loading shape than the portfolio
 *          page's all-at-once masonry grid, which is the point of
 *          benchmarking two representative pages instead of one — a
 *          single page could not surface a candidate delivery path that
 *          only misbehaves under one loading pattern. Same Flow A pipeline,
 *          same internal noindex convention as every other dev/ route.
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

import { GallerySlideshowLayout } from '@/components/gallery/GallerySlideshowLayout'
import { GalleryUnavailablePlaceholder } from '@/components/gallery/GalleryUnavailablePlaceholder'
import { resolveGalleryPlacementImages } from '@/lib/backstageGalleryPlacement'
import { PLACEMENT_DEMO_GALLERY_SLUG } from '@/lib/galleryRevalidation'

// Matches every other gallery-bearing route's safety-net cap
// (PAYLOAD_PICPEAK_API_CONTRACT.md row 5).
export const revalidate = 60

export const metadata: Metadata = {
  title: 'Benchmark: story gallery (internal)',
  robots: { index: false, follow: false },
}

export default async function BenchmarkStoryGalleryPage() {
  const result = await resolveGalleryPlacementImages(PLACEMENT_DEMO_GALLERY_SLUG)
  const images = result.status === 'ok' ? result.images : null

  return (
    <main data-testid="benchmark-story-page" className="mx-auto max-w-3xl px-8 py-16">
      <article data-testid="benchmark-story-copy" className="flex flex-col gap-6">
        <h1 className="text-3xl font-normal tracking-widest uppercase">A Late-Summer Wedding Story</h1>
        <p>
          The morning started slow and golden, the kind of light that makes every ordinary corner
          of a house feel like it was built for a photograph. There was coffee, there was the
          particular hush of a house about to become the site of a wedding, and there was a lot of
          quiet laughing in doorways while dresses were steamed and boutonnieres were pinned.
        </p>
        <p>
          By early afternoon the garden had filled in the way gardens do right before a ceremony —
          chairs in rows nobody remembers arranging, a runner unrolled down the aisle, and that
          particular tension of everyone pretending not to watch the clock. When the processional
          music actually started, none of that mattered anymore.
        </p>
        <p>
          What follows is the gallery from that afternoon and evening — the ceremony under the old
          oak, the toasts that ran long in the best way, and the dancing that didn&apos;t really
          stop until someone turned the porch lights off.
        </p>
      </article>

      <section
        aria-labelledby="benchmark-story-gallery-heading"
        data-testid="benchmark-story-gallery"
        className="w-full pt-12"
      >
        <h2 id="benchmark-story-gallery-heading" className="pb-4 text-2xl font-normal tracking-widest uppercase">
          The Gallery
        </h2>
        {images ? <GallerySlideshowLayout images={images} /> : <GalleryUnavailablePlaceholder />}
      </section>

      <article data-testid="benchmark-story-copy-closing" className="flex flex-col gap-6 pt-12">
        <p>
          Thank you for following along — the full delivery gallery is available to the couple
          through their own Project Room, with downloads unlocked once final payment clears.
        </p>
      </article>
    </main>
  )
}
