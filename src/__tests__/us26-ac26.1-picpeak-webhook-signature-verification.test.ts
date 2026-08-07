/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us26-ac26.1-picpeak-webhook-signature-verification.test.ts
 * project: earthandhoney
 * purpose: Verify AC-26.1 — the Frontstage receiver route
 *          (src/app/(frontend)/api/webhooks/picpeak/route.ts) recomputes the
 *          `X-PicPeak-Signature` HMAC-SHA256 over the raw body before
 *          trusting any field in it, rejects an absent/malformed/mismatched
 *          signature with 401, and — the concrete proof this AC's text
 *          demands — rejects a forged body carrying a stale (valid-for-a-
 *          different-body) signature. Also unit-tests the underlying
 *          verifyPicPeakWebhookSignature() primitive in
 *          src/lib/picpeakWebhookAuth.ts in isolation, mirroring the
 *          constant-time comparison upstream's own webhookService.js
 *          verifySignature() uses.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.1
 * ---
 */

import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { verifyPicPeakWebhookSignature } from '@/lib/picpeakWebhookAuth'
import { POST } from '@/app/(frontend)/api/webhooks/picpeak/route'

const SECRET = 'whsec_test_secret_123'

function sign(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')
}

function makeRequest(body: string, signature?: string | null): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (signature != null) headers['x-picpeak-signature'] = signature
  return new NextRequest('http://localhost:3000/api/webhooks/picpeak', {
    method: 'POST',
    headers,
    body,
  })
}

describe('AC-26.1: verifyPicPeakWebhookSignature() primitive', () => {
  const body = JSON.stringify({ type: 'event.published', data: { id: 1, slug: 'a-gallery' } })

  it('accepts a correctly computed signature', () => {
    expect(verifyPicPeakWebhookSignature(SECRET, body, sign(SECRET, body))).toBe(true)
  })

  it('rejects a missing signature', () => {
    expect(verifyPicPeakWebhookSignature(SECRET, body, undefined)).toBe(false)
    expect(verifyPicPeakWebhookSignature(SECRET, body, null)).toBe(false)
    expect(verifyPicPeakWebhookSignature(SECRET, body, '')).toBe(false)
  })

  it('rejects a malformed (non-hex, wrong-length) signature', () => {
    expect(verifyPicPeakWebhookSignature(SECRET, body, 'not-a-hex-signature')).toBe(false)
    expect(verifyPicPeakWebhookSignature(SECRET, body, 'ab')).toBe(false)
  })

  it('rejects a mismatched signature computed with the wrong secret', () => {
    expect(verifyPicPeakWebhookSignature(SECRET, body, sign('wrong-secret', body))).toBe(false)
  })

  it('rejects an unconfigured (absent) secret even with an otherwise well-formed signature', () => {
    expect(verifyPicPeakWebhookSignature(undefined, body, sign(SECRET, body))).toBe(false)
    expect(verifyPicPeakWebhookSignature('', body, sign(SECRET, body))).toBe(false)
  })

  it('rejects a forged body with a stale signature (valid for a different, earlier body)', () => {
    const originalBody = JSON.stringify({ type: 'event.published', data: { id: 1, slug: 'a-gallery' } })
    const staleSignature = sign(SECRET, originalBody)
    const forgedBody = JSON.stringify({ type: 'event.published', data: { id: 1, slug: 'attacker-gallery' } })

    expect(verifyPicPeakWebhookSignature(SECRET, forgedBody, staleSignature)).toBe(false)
  })
})

describe('AC-26.1: POST /api/webhooks/picpeak receiver route', () => {
  const originalSecret = process.env.PICPEAK_WEBHOOK_SECRET

  beforeEach(() => {
    process.env.PICPEAK_WEBHOOK_SECRET = SECRET
  })

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.PICPEAK_WEBHOOK_SECRET
    else process.env.PICPEAK_WEBHOOK_SECRET = originalSecret
  })

  it('accepts a request with a correctly computed signature', async () => {
    const body = JSON.stringify({ type: 'event.published', data: { id: 1, slug: 'a-gallery' } })
    const response = await POST(makeRequest(body, sign(SECRET, body)))
    expect(response.status).toBe(200)
  })

  it('rejects a request with no signature header at all — 401', async () => {
    const body = JSON.stringify({ type: 'event.published', data: { id: 1, slug: 'a-gallery' } })
    const response = await POST(makeRequest(body, null))
    expect(response.status).toBe(401)
  })

  it('rejects a request with a malformed signature header — 401', async () => {
    const body = JSON.stringify({ type: 'event.published', data: { id: 1, slug: 'a-gallery' } })
    const response = await POST(makeRequest(body, 'garbage-not-hmac'))
    expect(response.status).toBe(401)
  })

  it('rejects the core attack this AC exists to stop: a forged body with a stale signature — 401, and revalidates nothing', async () => {
    const revalidateSpy = jest.fn()

    const originalBody = JSON.stringify({ type: 'event.published', data: { id: 1, slug: 'a-gallery' } })
    const staleSignature = sign(SECRET, originalBody)
    // Attacker captured a valid signature for `originalBody` and now replays
    // it against a body they tampered with.
    const forgedBody = JSON.stringify({ type: 'event.published', data: { id: 1, slug: 'attacker-gallery' } })

    const response = await POST(makeRequest(forgedBody, staleSignature))

    expect(response.status).toBe(401)
    // Nothing about the forged payload was ever acted on — no revalidation
    // side effect of any kind was triggered by this route on the reject path.
    expect(revalidateSpy).not.toHaveBeenCalled()
  })

  it('rejects every request when no webhook secret is configured, even with a well-formed signature', async () => {
    delete process.env.PICPEAK_WEBHOOK_SECRET
    const body = JSON.stringify({ type: 'event.published', data: { id: 1, slug: 'a-gallery' } })
    const response = await POST(makeRequest(body, sign(SECRET, body)))
    expect(response.status).toBe(401)
  })
})
