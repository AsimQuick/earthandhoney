/**
 * ---
 * file: src/lib/galleryRevalidation.ts
 * project: earthandhoney
 * purpose: Maps a gallery identifier to the internal gallery-bearing
 *          route(s) that render it, so a change can be revalidated
 *          on-demand. `getGalleryBearingPaths` is the original
 *          Payload-gallery-**title** lookup (AC-6.3), still wired to the
 *          retired-but-not-yet-removed Payload Galleries collection
 *          (src/collections/Galleries.ts; removal is US-28 scope, not this
 *          file's). `getGalleryBearingPathsForSlug` is AC-26.2's re-keyed
 *          lookup for the pivot: the source of truth for "which gallery
 *          changed" is now a Backstage **slug**, delivered over the
 *          verified webhook (src/app/(frontend)/api/webhooks/picpeak/
 *          route.ts), not a Payload document title. Both functions play the
 *          same role — identifier in, route path(s) out — only the identity
 *          space changed with the pivot. Deliberately payload-import-free
 *          (mirrors payloadGalleryMapper.ts, AC-6.2) so it's directly
 *          unit-testable without pulling in the ESM-only `payload` package.
 * created-by: dev-team
 * related-story: US-6
 * related-ac: 6.3
 * updated-by: dev-team
 * related-story: US-26
 * related-ac: 26.2
 * updated-by: dev-team
 * related-story: US-26
 * related-ac: 26.4.1
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

// Keep in sync with the fixed slug src/app/(frontend)/dev/
// gallery-placement-demo/page.tsx queries for (AC-25.5/25.6) — that route
// imports this same constant so the two can never drift, mirroring the ISR
// demo's ISR_DEMO_GALLERY_TITLE convention above.
export const PLACEMENT_DEMO_GALLERY_SLUG = 'us-25-ac-25.5-placement-demo'
export const PLACEMENT_DEMO_GALLERY_PATH = '/dev/gallery-placement-demo'

/**
 * AC-26.2's re-keyed lookup: returns the internal route path(s) that render
 * a given **Backstage gallery slug**, so a verified webhook delivery for
 * that slug can trigger on-demand revalidation of them. Same role as
 * `getGalleryBearingPaths` above, re-keyed from a Payload document title to
 * the Backstage identifier the pivot made authoritative
 * (SYSTEM_OWNERSHIP.md: Backstage owns galleries, Payload only owns
 * placement). Returns an empty array for any slug not backing an in-scope
 * route.
 */
// AC-26.4.1's live-proof harness galleries, kept in sync by hand with SLUG_A
// / SLUG_B in scripts/webhook-live-proof-setup.sh and
// scripts/ac26.4.1-live-proof.sh — a drift between them is caught by
// src/__tests__/us26-ac26.4.1.1-webhook-live-proof-harness.test.ts. Two
// galleries, not one, because the pinned fork's publish route is a one-way
// draft->live transition with no un-publish route, so reproducing the proof
// through the supported interface needs a second, independent gallery.
export const WEBHOOK_LIVE_PROOF_GALLERY_SLUGS = [
  'wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20',
  'wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21',
] as const
export const WEBHOOK_LIVE_PROOF_GALLERY_PATH = '/dev/gallery-webhook-proof'

export function getGalleryBearingPathsForSlug(slug: string | null | undefined): string[] {
  if (slug === PLACEMENT_DEMO_GALLERY_SLUG) return [PLACEMENT_DEMO_GALLERY_PATH]
  if ((WEBHOOK_LIVE_PROOF_GALLERY_SLUGS as readonly string[]).includes(slug ?? '')) {
    return [WEBHOOK_LIVE_PROOF_GALLERY_PATH]
  }
  return []
}
