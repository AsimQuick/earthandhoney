/**
 * ---
 * file: src/lib/backstageGalleryPlacement.ts
 * project: earthandhoney
 * purpose: AC-25.6 — the one place a Frontstage placement turns a Flow A
 *          outcome (src/lib/backstageClient.ts) into either a renderable
 *          image list or a caller-facing "unavailable" result, on an
 *          unreachable Backstage, a timeout, or a 404 slug. Every failure
 *          reason `fetchPublishedGallery` can return is logged here exactly
 *          once, with the slug and the Flow A step that failed, so a
 *          placement outage is observable server-side even though the
 *          visitor only ever sees a placeholder — never a raw error, and
 *          never a 500, since `fetchPublishedGallery` itself never throws
 *          and neither does this function. On failure this deliberately
 *          returns no image data at all, not a partial list: Flow A already
 *          short-circuits on the first failed step (info/verify/photos), so
 *          there is never a "photos fetched but info didn't load" case to
 *          reconstruct here — a half-complete Flow A must never be presented
 *          to a visitor as a complete gallery.
 * created-by: dev-team
 * related-story: US-25
 * related-ac: 25.6
 * ---
 */

import { mapBackstageGalleryToImages } from '@/components/gallery/backstageGalleryMapper'
import type { GalleryImage } from '@/components/gallery/types'

import type { BackstageFailureReason } from './backstageClient'
import { fetchPublishedGallery } from './backstageClient'
import { logError } from './logger'

export type GalleryPlacementResult =
  | { status: 'ok'; images: GalleryImage[] }
  | { status: 'unavailable'; reason: BackstageFailureReason }

/**
 * Resolves one placement's images for a given Backstage gallery `slug`.
 * Never throws: every Flow A failure (network error, timeout, 404 slug,
 * unexpected status) is logged and mapped to `{ status: 'unavailable' }`
 * instead of propagating, so a caller can always render a placeholder
 * rather than let the failure reach Next.js as an uncaught error.
 */
export async function resolveGalleryPlacementImages(
  slug: string,
  opts: { password?: string; timeoutMs?: number } = {},
): Promise<GalleryPlacementResult> {
  const outcome = await fetchPublishedGallery(slug, opts)

  if (!outcome.ok) {
    logError('Gallery placement fetch failed', {
      slug,
      step: outcome.step,
      reason: outcome.reason,
      status: outcome.status,
      error: outcome.error,
    })
    return { status: 'unavailable', reason: outcome.reason }
  }

  return { status: 'ok', images: mapBackstageGalleryToImages(outcome.photos) }
}
