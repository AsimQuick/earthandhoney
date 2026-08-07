/**
 * ---
 * file: src/lib/backstageGalleryCache.ts
 * project: earthandhoney
 * purpose: AC-25.4 — the one place Backstage-sourced gallery data may be
 *          cached Frontstage-side, per PAYLOAD_PICPEAK_API_CONTRACT.md's
 *          "What the Frontstage is allowed to cache, and for how long"
 *          section. Two rules are enforced in the type system, not just by
 *          convention: (1) `CachedGalleryDisplay` names exactly the
 *          contract's permitted fields — rendered image URLs, thumbnails,
 *          gallery title/cover, item count — with no index signature, so it
 *          can never widen back out to "whatever Backstage returned" the
 *          way `GalleryInfo`/`GalleryPhotosResponse` (backstageClient.ts)
 *          deliberately do for their own different purpose; (2) every read
 *          path enforces the bounded 60-second safety-net cap itself — a
 *          miss or an expired entry returns `null`, never stale data, so a
 *          caller cannot accidentally treat this cache as authoritative by
 *          skipping a fresh Backstage call. `setCached` only ever receives
 *          data already narrowed by `toCachedGalleryDisplay`, so a raw
 *          Backstage database row can never reach the store. Deliberately
 *          payload-import-free (mirrors backstageClient.ts /
 *          galleryRevalidation.ts) so it's directly unit-testable.
 * created-by: dev-team
 * related-story: US-25
 * related-ac: 25.4
 * ---
 */

import type { FlowAOutcome } from './backstageClient'

/**
 * The same numeric bound this codebase already committed to for
 * gallery-bearing ISR routes (`src/app/(frontend)/dev/gallery-isr-demo/
 * page.tsx`'s `export const revalidate = 60`, US-6 AC-6.2) — the contract
 * requires this cache never outlive that convention even absent a webhook.
 */
export const CACHE_TTL_MS = 60_000

/**
 * The complete set of fields PAYLOAD_PICPEAK_API_CONTRACT.md's cache-
 * allowance section permits: rendered image URLs, thumbnails, gallery
 * title/cover, item counts — display data only. No `[key: string]: unknown`
 * escape hatch, unlike the richer response types in backstageClient.ts: this
 * type's whole job is to be narrower than what Backstage returns.
 */
export interface CachedGalleryDisplay {
  title: string
  cover: string | null
  imageUrls: string[]
  thumbnailUrls: string[]
  itemCount: number
}

interface CacheEntry {
  data: CachedGalleryDisplay
  cachedAtMs: number
}

const store = new Map<string, CacheEntry>()

/**
 * Narrows a successful Flow A outcome (`backstageClient.ts`'s
 * `fetchPublishedGallery`) down to the cacheable shape. Everything else the
 * Backstage responses carry — `event_type`, `expires_at`, `is_active`,
 * `is_expired`, `requires_password`, `color_theme`, `allow_downloads`,
 * `allow_user_uploads`, photo `id`/`filename`, the raw `event` object, and
 * any other field the fork's API happens to add later — is dropped here,
 * not merely left unread, because this function's return type has no room
 * for it.
 */
export function toCachedGalleryDisplay(outcome: Extract<FlowAOutcome, { ok: true }>): CachedGalleryDisplay {
  const imageUrls = outcome.photos.photos.map((photo) => photo.url)
  const thumbnailUrls = outcome.photos.photos
    .map((photo) => photo.thumbnail_url)
    .filter((url): url is string => url !== null)

  return {
    title: outcome.info.event_name,
    cover: imageUrls[0] ?? null,
    imageUrls,
    thumbnailUrls,
    itemCount: outcome.photos.photos.length,
  }
}

/**
 * Returns the cached display data for `slug`, or `null` on a miss *or* an
 * expired entry — the two are indistinguishable to every caller on purpose.
 * A caller that gets `null` must go fetch Backstage again; this function
 * offers no "return it anyway, it's probably fine" path, which is what
 * "never treated as authoritative" means in code. `nowMs` is injectable so
 * tests can exercise TTL expiry without depending on real wall-clock time.
 */
export function getCached(slug: string, nowMs: number = Date.now()): CachedGalleryDisplay | null {
  const entry = store.get(slug)
  if (!entry) return null

  if (nowMs - entry.cachedAtMs >= CACHE_TTL_MS) {
    store.delete(slug)
    return null
  }

  // Defensive copy: the stored entry is never handed out by reference, so a
  // caller mutating its result can't corrupt what a later, still-valid read
  // returns.
  return {
    ...entry.data,
    imageUrls: [...entry.data.imageUrls],
    thumbnailUrls: [...entry.data.thumbnailUrls],
  }
}

/** Stores already-narrowed display data. Never accepts a raw API response. */
export function setCached(slug: string, data: CachedGalleryDisplay, nowMs: number = Date.now()): void {
  store.set(slug, { data, cachedAtMs: nowMs })
}

/**
 * Immediate invalidation on a verified, signature-checked webhook delivery
 * for the affected gallery (contract row 5) — the safety-net cap above
 * bounds the worst case when this is never called (a lost/failed delivery),
 * it does not replace it. Wiring an actual webhook receiver to call this is
 * later stories' scope, not this AC's.
 */
export function invalidateCached(slug: string): void {
  store.delete(slug)
}

/** Test-only: clears module-level state between test cases. */
export function __resetCacheForTests(): void {
  store.clear()
}
