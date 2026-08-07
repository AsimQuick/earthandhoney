/**
 * ---
 * file: src/app/(frontend)/api/webhooks/picpeak/route.ts
 * project: earthandhoney
 * purpose: AC-26.1 — the Frontstage receiver route for Backstage's webhook
 *          delivery (PAYLOAD_PICPEAK_API_CONTRACT.md Flow C / row 5). Reads
 *          the exact raw request body and recomputes the
 *          `X-PicPeak-Signature` HMAC-SHA256 header via
 *          verifyPicPeakWebhookSignature() *before* trusting anything in
 *          the payload. An absent, malformed, or mismatched signature is
 *          rejected with 401 and nothing downstream runs — no field of the
 *          body is read, parsed, or acted on.
 *          AC-26.2 — once verified, the body is parsed
 *          (picpeakWebhookEvent.ts) into its event `type` and the changed
 *          gallery's `slug`. An event type outside the fixed
 *          three-type set this receiver handles is accepted (2xx) and
 *          ignored — it is a real, documented event this AC does not act
 *          on, not an error. A handled event's slug is checked against
 *          Payload's `gallery-placements` collection
 *          (galleryPlacementLookup.ts) — a slug nothing on Frontstage
 *          references has nothing to revalidate — and, when at least one
 *          placement references it, the slug is resolved to its
 *          gallery-bearing route(s) via galleryRevalidation.ts's re-keyed
 *          `getGalleryBearingPathsForSlug` and each is revalidated via
 *          `revalidatePath`. Both `payload` and `next/cache` are
 *          dynamically imported (mirrors src/collections/Galleries.ts).
 *          AC-26.3 — the placement lookup and revalidation
 *          (`queueRevalidationForSlug`) are deliberately *not* awaited
 *          before responding: contract row 5 requires the receiver return
 *          2xx promptly, not after Backstage's own downstream work
 *          finishes, since a slow/hanging lookup must never delay
 *          Backstage's delivery confirmation. The work still runs — it is
 *          queued, not skipped — a rejection from it is caught and logged
 *          rather than surfaced, since the response has already been sent
 *          and nothing can retry off the back of it.
 *          Coexists with the Payload catch-all at
 *          src/app/(payload)/api/[...slug]/route.ts: Next.js resolves a
 *          static segment (`/api/webhooks/picpeak`) ahead of a sibling
 *          catch-all (`/api/[...slug]`) in a different route group, since
 *          route groups don't affect the resolved URL.
 *          AC-26.5 — a duplicate or replayed delivery (Backstage's own
 *          5-attempt retry, or a manual replay from the admin deliveries
 *          page) must produce one revalidation and no error, not one per
 *          attempt. The `X-PicPeak-Delivery` id header
 *          (`webhookDeliveryWorker.js`'s `DELIVERY_HEADER`) is claimed via
 *          `picpeakWebhookDeliveryDedup.ts`'s `claimWebhookDelivery` before
 *          the revalidation work is queued; a second delivery of the same
 *          id still gets a 2xx response, it just claims `false` and skips
 *          queuing the work again. A dropped delivery (Backstage gives up
 *          after its 5th attempt, or the receiver was down for all of them)
 *          is bounded, not unbounded staleness: every gallery-bearing route
 *          this receiver's slug lookup can reach declares the same
 *          60-second `revalidate` ISR cap PAYLOAD_PICPEAK_API_CONTRACT.md's
 *          "What the Frontstage is allowed to cache" section commits to, so
 *          Next.js re-renders it from Backstage on the next request past
 *          that cap regardless of whether a webhook ever arrived.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.1
 * updated-by: dev-team
 * related-story: US-26
 * related-ac: 26.2
 * updated-by: dev-team
 * related-story: US-26
 * related-ac: 26.3
 * updated-by: dev-team
 * related-story: US-26
 * related-ac: 26.5
 * ---
 */

import { NextRequest, NextResponse } from 'next/server'
import { hasGalleryPlacementForSlug } from '@/lib/galleryPlacementLookup'
import { getGalleryBearingPathsForSlug } from '@/lib/galleryRevalidation'
import { verifyPicPeakWebhookSignature } from '@/lib/picpeakWebhookAuth'
import { claimWebhookDelivery } from '@/lib/picpeakWebhookDeliveryDedup'
import { isHandledPicPeakWebhookEvent, parsePicPeakWebhookEvent } from '@/lib/picpeakWebhookEvent'

const SIGNATURE_HEADER = 'x-picpeak-signature'
const DELIVERY_HEADER = 'x-picpeak-delivery'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text()
  const signature = request.headers.get(SIGNATURE_HEADER)
  const secret = process.env.PICPEAK_WEBHOOK_SECRET

  if (!verifyPicPeakWebhookSignature(secret, rawBody, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const event = parsePicPeakWebhookEvent(rawBody)
  const deliveryId = request.headers.get(DELIVERY_HEADER)

  // A fixed, documented event type this receiver deliberately doesn't act
  // on (e.g. `event.archived`) — or a body this receiver can't make sense
  // of — is accepted and ignored, never treated as an error.
  if (event && isHandledPicPeakWebhookEvent(event.type) && event.gallerySlug) {
    // AC-26.5: a delivery id already claimed (a retry or replay of the same
    // delivery) skips queuing a second revalidation — the response below is
    // still 200, just with nothing new queued.
    if (claimWebhookDelivery(deliveryId)) {
      // AC-26.3: queued, not awaited — see the file header. The response
      // below is returned regardless of how long this takes.
      void queueRevalidationForSlug(event.gallerySlug)
    }
  }

  return NextResponse.json({ received: true }, { status: 200 })
}

async function queueRevalidationForSlug(slug: string): Promise<void> {
  try {
    if (await hasGalleryPlacementForSlug(slug)) {
      const paths = getGalleryBearingPathsForSlug(slug)
      if (paths.length > 0) {
        const { revalidatePath } = await import('next/cache')
        for (const routePath of paths) {
          revalidatePath(routePath)
        }
      }
    }
  } catch (error) {
    console.error('picpeak webhook: queued revalidation failed', error)
  }
}
