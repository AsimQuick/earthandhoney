/**
 * ---
 * file: src/lib/galleryPlacementLookup.ts
 * project: earthandhoney
 * purpose: AC-26.2 — the one place the webhook receiver
 *          (src/app/(frontend)/api/webhooks/picpeak/route.ts) checks whether
 *          a changed Backstage gallery `slug` is actually referenced by any
 *          Payload `gallery-placements` document (src/collections/
 *          GalleryPlacements.ts) before triggering a revalidation for it —
 *          a gallery with no Frontstage placement has nothing to
 *          revalidate. Uses the Payload Local API, so unlike
 *          galleryRevalidation.ts/picpeakWebhookEvent.ts this module is not
 *          payload-import-free; `payload` and `@payload-config` are
 *          dynamically imported inside the function body (mirrors
 *          src/collections/Galleries.ts's `next/cache` dynamic import) so
 *          merely importing this module never drags the ESM-only `payload`
 *          package into a Jest test that only wants to mock it.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.2
 * ---
 */

/**
 * True if at least one `gallery-placements` document references `slug`.
 * `overrideAccess: true` mirrors the existing ISR demo page's Local API read
 * (gallery-isr-demo/page.tsx) — this is a server-side webhook receiver, not
 * a request made on behalf of a visitor, so there is no Payload user/session
 * to scope access to.
 */
export async function hasGalleryPlacementForSlug(slug: string): Promise<boolean> {
  const { getPayload } = await import('payload')
  const { default: config } = await import('@payload-config')
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'gallery-placements',
    where: { gallerySlug: { equals: slug } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })

  return result.docs.length > 0
}
