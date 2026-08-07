/**
 * ---
 * file: src/app/(frontend)/dev/gallery-webhook-proof/page.tsx
 * project: earthandhoney
 * purpose: AC-26.4.1's live-proof harness route, stood up once so the two
 *          criteria that follow (photo upload, photo delete) reuse it
 *          rather than rebuilding it. Renders the two real Backstage
 *          galleries named by WEBHOOK_LIVE_PROOF_GALLERY_SLUGS through the
 *          same Flow A path the placement-demo route uses
 *          (resolveGalleryPlacementImages), on-demand-revalidated by the
 *          verified webhook receiver (src/app/(frontend)/api/webhooks/
 *          picpeak/route.ts) via src/lib/galleryRevalidation.ts's
 *          `getGalleryBearingPathsForSlug`. Two galleries, one route: the
 *          pinned fork ships a draft→live publish route but no un-publish
 *          route, so reproducing the publish proof through the supported
 *          interface needs a second, independent gallery rather than a
 *          database edit underneath the first.
 *          `export const revalidate` is set to the same 60-second cap
 *          PAYLOAD_PICPEAK_API_CONTRACT.md row 5 already commits to (and
 *          backstageGalleryCache.ts's CACHE_TTL_MS already enforces), which
 *          is what puts this route in the Full Route Cache: without it a
 *          route whose render performs an uncached fetch is rendered
 *          dynamically on every request, and a dynamically-rendered page
 *          would show fresh Backstage data whether or not the webhook ever
 *          fired — proving nothing about the revalidation wiring this AC
 *          exists to verify. With it, the page a visitor gets is the cached
 *          render until something busts that cache, so a change appearing
 *          here within seconds is attributable to the receiver's
 *          `revalidatePath` call and nothing else.
 *          Photo count and photo ids are surfaced as plain text and as
 *          `data-photo-count`/`data-photo-ids` attributes per gallery so
 *          the live-proof transcript (`WEBHOOK_LIVE_PROOF.md`) can grep the
 *          rendered HTML directly rather than parse a screenshot. Not
 *          linked from public navigation, excluded from search indexing
 *          like every other route under src/app/(frontend)/dev/.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.4.1
 * ---
 */
import type { Metadata } from 'next'

import { GalleryMasonryLayout } from '@/components/gallery/GalleryMasonryLayout'
import { GalleryUnavailablePlaceholder } from '@/components/gallery/GalleryUnavailablePlaceholder'
import { resolveGalleryPlacementImages } from '@/lib/backstageGalleryPlacement'
import { WEBHOOK_LIVE_PROOF_GALLERY_SLUGS } from '@/lib/galleryRevalidation'

// The contract's own safety-net cap (row 5), not a number picked here — see
// the file header for why this route must be cached at all.
export const revalidate = 60

// Internal-only: excluded from search indexing since this route is not part
// of the public site.
export const metadata: Metadata = {
  title: 'Gallery webhook live-proof (internal)',
  robots: { index: false, follow: false },
}

export default async function GalleryWebhookProofPage() {
  const placements = await Promise.all(
    WEBHOOK_LIVE_PROOF_GALLERY_SLUGS.map(async (slug) => {
      const result = await resolveGalleryPlacementImages(slug)
      return { slug, images: result.status === 'ok' ? result.images : null }
    }),
  )

  return (
    <main className="flex flex-col gap-8 py-8">
      <p role="note" className="px-8">
        Internal live-proof harness for AC-26.4.1 — renders the real
        Backstage galleries below via Flow A, on-demand-revalidated by the
        verified PicPeak webhook. Not linked from public navigation.
      </p>

      {placements.map(({ slug, images }) =>
        images ? (
          <section
            key={slug}
            aria-label={`Live-proof gallery ${slug}`}
            data-testid="webhook-proof-gallery"
            data-gallery-slug={slug}
            data-photo-count={images.length}
            data-photo-ids={images.map((image) => image.id).join(',')}
            className="w-full px-8"
          >
            <h2 className="pb-4 text-2xl font-normal tracking-[3px] uppercase">
              {slug} — {images.length} photo{images.length === 1 ? '' : 's'}
            </h2>
            <GalleryMasonryLayout images={images} />
          </section>
        ) : (
          <section
            key={slug}
            aria-label={`Live-proof gallery ${slug}`}
            data-testid="webhook-proof-unavailable"
            data-gallery-slug={slug}
            className="w-full px-8"
          >
            <h2 className="pb-4 text-2xl font-normal tracking-[3px] uppercase">
              {slug} — unavailable
            </h2>
            <GalleryUnavailablePlaceholder />
          </section>
        ),
      )}
    </main>
  )
}
