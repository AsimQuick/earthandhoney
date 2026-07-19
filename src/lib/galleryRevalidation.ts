/**
 * ---
 * file: src/lib/galleryRevalidation.ts
 * project: earthandhoney
 * purpose: Maps a Galleries document to the internal gallery-bearing route(s)
 *          that render it, so the Payload afterChange hook (src/collections/
 *          Galleries.ts) knows which path(s) to revalidate on-demand when a
 *          gallery is updated (AC-6.3). Deliberately payload-import-free
 *          (mirrors payloadGalleryMapper.ts, AC-6.2) so it's directly
 *          unit-testable without pulling in the ESM-only `payload` package.
 *          The only gallery-bearing route in scope this sprint is the
 *          internal ISR demo route from AC-6.2; the same map gains an entry
 *          per real public page in the sprint that builds them, per AC-6.3's
 *          text.
 * created-by: dev-team
 * related-story: US-6
 * related-ac: 6.3
 * ---
 */

// Keep in sync with the fixed title src/app/(frontend)/dev/gallery-isr-demo/
// page.tsx queries for (AC-6.2) — that route imports this same constant so
// the two can never drift.
export const ISR_DEMO_GALLERY_TITLE = 'US-6 AC-6.2 ISR demo gallery'
export const ISR_DEMO_GALLERY_PATH = '/dev/gallery-isr-demo'

/**
 * Returns the internal route path(s) that render the given gallery title, so
 * they can be revalidated on-demand after a change. Returns an empty array
 * for any gallery not backing an in-scope route, so unrelated gallery edits
 * don't trigger pointless revalidation.
 */
export function getGalleryBearingPaths(title: string | null | undefined): string[] {
  return title === ISR_DEMO_GALLERY_TITLE ? [ISR_DEMO_GALLERY_PATH] : []
}
