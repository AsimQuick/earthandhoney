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
 *          body is read, parsed, or acted on. Extracting the changed
 *          gallery's id/slug and calling the on-demand revalidation
 *          mechanism (Flow C steps 3-4) is AC-26.2's scope, not this
 *          route's; the fast, non-blocking 2xx response is AC-26.3's.
 *          Coexists with the Payload catch-all at
 *          src/app/(payload)/api/[...slug]/route.ts: Next.js resolves a
 *          static segment (`/api/webhooks/picpeak`) ahead of a sibling
 *          catch-all (`/api/[...slug]`) in a different route group, since
 *          route groups don't affect the resolved URL.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.1
 * ---
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyPicPeakWebhookSignature } from '@/lib/picpeakWebhookAuth'

const SIGNATURE_HEADER = 'x-picpeak-signature'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text()
  const signature = request.headers.get(SIGNATURE_HEADER)
  const secret = process.env.PICPEAK_WEBHOOK_SECRET

  if (!verifyPicPeakWebhookSignature(secret, rawBody, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  // Signature verified. Payload extraction + revalidation dispatch is
  // AC-26.2/26.3's scope.
  return NextResponse.json({ received: true }, { status: 200 })
}
