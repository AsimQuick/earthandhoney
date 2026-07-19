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
 *          sources like an ORM/DB call. On-demand revalidation triggered by
 *          a Payload update is AC-6.3's job, not bundled here. The real
 *          public pages will re-verify this identical ISR wiring in the
 *          sprint that builds them.
 * created-by: dev-team
 * related-story: US-6
 * related-ac: 6.2
 * ---
 */
import type { Metadata } from 'next'
import { getPayload } from 'payload'

import config from '@payload-config'
import { GalleryEngine } from '@/components/gallery/GalleryEngine'
import { mapPayloadGalleryToImages, type PayloadGalleryDoc } from '@/components/gallery/payloadGalleryMapper'

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

// Fixed title identifying the demo gallery this route renders — exported so
// tests can create/find the same fixture record without duplicating the
// string.
export const ISR_DEMO_GALLERY_TITLE = 'US-6 AC-6.2 ISR demo gallery'

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
        <section aria-labelledby="isr-demo-heading" data-testid="isr-demo-gallery" className="w-full">
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
