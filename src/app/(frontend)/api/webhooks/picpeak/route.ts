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
 *          dynamically imported (mirrors src/collections/Galleries.ts) so
 *          the fast, non-blocking 2xx response itself is AC-26.3's scope,
 *          not this AC's — this route still awaits the lookup/revalidation
 *          work before responding.
 *          Coexists with the Payload catch-all at
 *          src/app/(payload)/api/[...slug]/route.ts: Next.js resolves a
 *          static segment (`/api/webhooks/picpeak`) ahead of a sibling
 *          catch-all (`/api/[...slug]`) in a different route group, since
 *          route groups don't affect the resolved URL.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.1
 * updated-by: dev-team
 * related-story: US-26
 * related-ac: 26.2
 * ---
 */

import { NextRequest, NextResponse } from 'next/server'
import { hasGalleryPlacementForSlug } from '@/lib/galleryPlacementLookup'
import { getGalleryBearingPathsForSlug } from '@/lib/galleryRevalidation'
import { verifyPicPeakWebhookSignature } from '@/lib/picpeakWebhookAuth'
import { isHandledPicPeakWebhookEvent, parsePicPeakWebhookEvent } from '@/lib/picpeakWebhookEvent'

const SIGNATURE_HEADER = 'x-picpeak-signature'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text()
  const signature = request.headers.get(SIGNATURE_HEADER)
  const secret = process.env.PICPEAK_WEBHOOK_SECRET

  if (!verifyPicPeakWebhookSignature(secret, rawBody, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const event = parsePicPeakWebhookEvent(rawBody)

  // A fixed, documented event type this receiver deliberately doesn't act
  // on (e.g. `event.archived`) — or a body this receiver can't make sense
  // of — is accepted and ignored, never treated as an error.
  if (event && isHandledPicPeakWebhookEvent(event.type) && event.gallerySlug) {
    const slug = event.gallerySlug
    if (await hasGalleryPlacementForSlug(slug)) {
      const paths = getGalleryBearingPathsForSlug(slug)
      if (paths.length > 0) {
        const { revalidatePath } = await import('next/cache')
        for (const routePath of paths) {
          revalidatePath(routePath)
        }
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
