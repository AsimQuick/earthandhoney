/**
 * ---
 * file: src/app/(frontend)/dev/gallery-isr-demo/page.tsx
 * project: earthandhoney
 * purpose: Internal demo/test-harness route — not linked from public
 *          navigation, not backed by the out-of-scope Portfolio/Homepage CMS
 *          collections, and not a public marketing page. Proves AC-6.2:
 *          gallery-bearing routes use static generation with incremental
 *          regeneration (ISR). This route fetches a real gallery from the
 *          in-scope Payload Galleries collection (US-3) via the Local API —
 *          no request-derived input (no cookies/headers/searchParams) — so
 *          Next.js can prerender it as a static route segment, then
 *          regenerate it in the background at most once every
 *          ISR_REVALIDATE_SECONDS (the route-segment `revalidate` config
 *          below), per Next's documented pattern for non-`fetch` data
 *          sources like an ORM/DB call. On-demand revalidation of this route
 *          when its gallery is updated is wired on the Galleries collection
 *          itself (src/collections/Galleries.ts `afterChange` hook, AC-6.3),
 *          via src/lib/galleryRevalidation.ts's title-to-path map, not here.
 *          This route additionally surfaces the gallery's resolved display
 *          settings as `data-*` attributes on its section (AC-6.3) so the
 *          effect of that on-demand regeneration is observable in the rendered
 *          output even for a gallery with no images. The real public pages
 *          will re-verify this identical ISR wiring in the sprint that builds
 *          them.
 * created-by: dev-team
 * related-story: US-6
 * related-ac: 6.2
 * updated-by: dev-team
 * related-story: US-6
 * related-ac: 6.3
 * ---
 */
import type { Metadata } from 'next'
import { getPayload } from 'payload'

import config from '@payload-config'
import { GalleryEngine } from '@/components/gallery/GalleryEngine'
import { mapPayloadGalleryToImages, type PayloadGalleryDoc } from '@/components/gallery/payloadGalleryMapper'
import { ISR_DEMO_GALLERY_TITLE } from '@/lib/galleryRevalidation'

// Internal-only: excluded from search indexing since this route is not part
// of the public site.
export const metadata: Metadata = {
  title: 'Gallery ISR demo (internal)',
  robots: { index: false, follow: false },
}

// Route segment config — the mechanism that turns this into an ISR route:
// Next.js serves the statically-generated page from cache and regenerates it
// in the background at most this often, rather than on every request
// (`dynamic = 'force-dynamic'`) or never (`revalidate = false`). Must be a
// literal here — Next's build-time segment-config validation rejects a
// value that's merely a reference to another local constant.
export const revalidate = 60

async function getDemoGallery(): Promise<PayloadGalleryDoc | undefined> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'galleries',
    where: { title: { equals: ISR_DEMO_GALLERY_TITLE } },
    depth: 1,
    limit: 1,
    overrideAccess: true,
  })
  return result.docs[0] as unknown as PayloadGalleryDoc | undefined
}

export default async function GalleryIsrDemoPage() {
  const gallery = await getDemoGallery()
  const images = gallery ? mapPayloadGalleryToImages(gallery) : []

  return (
    <main className="flex flex-col gap-8 py-8">
      <p role="note" className="px-8">
        Internal demo/test-harness route for AC-6.2 — proves gallery-bearing
        routes use static generation with incremental regeneration (ISR).
        Not linked from public navigation, not backed by the out-of-scope
        Portfolio/Homepage CMS collections.
      </p>

      {gallery ? (
        // Surface the gallery's resolved display settings on the harness route
        // itself (AC-6.3). GalleryEngine only exposes these `data-*` attributes
        // once a gallery has images; the demo gallery may legitimately have
        // none, so mirroring them here makes on-demand revalidation observable
        // end-to-end: updating the gallery in Payload fires the Galleries
        // collection's afterChange revalidation hook, and the regenerated route
        // reflects the new setting value here regardless of image count.
        <section
          aria-labelledby="isr-demo-heading"
          data-testid="isr-demo-gallery"
          className="w-full"
          data-slideshow={gallery.settings?.slideshow ?? false}
          data-hover-preview={gallery.settings?.hoverPreview ?? true}
          data-fullscreen={gallery.settings?.fullscreen ?? true}
          data-download={gallery.settings?.download ?? false}
          data-require-auth={gallery.settings?.requireAuth ?? false}
        >
          <h2 id="isr-demo-heading" className="px-8 pb-4 text-2xl font-normal tracking-[3px] uppercase">
            {gallery.title}
          </h2>
          <GalleryEngine images={images} settings={gallery.settings} />
        </section>
      ) : (
        <p role="status" data-testid="isr-demo-empty-state" className="px-8">
          No gallery titled &quot;{ISR_DEMO_GALLERY_TITLE}&quot; exists yet — create one via
          the Payload admin or API to see it render here under ISR.
        </p>
      )}
    </main>
  )
}
