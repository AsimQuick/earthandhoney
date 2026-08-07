/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us26-ac26.3-webhook-non-blocking-response.test.ts
 * project: earthandhoney
 * purpose: Verify AC-26.3 — the webhook receiver returns its 2xx response
 *          after queuing the placement lookup/revalidation, not after that
 *          work finishes (PAYLOAD_PICPEAK_API_CONTRACT.md row 5: "the
 *          receiver must return 2xx quickly"). Proven deterministically,
 *          not by racing microtask timing: `hasGalleryPlacementForSlug` is
 *          mocked with a promise under this test's own manual control (it
 *          never settles until the test resolves it). `await POST(...)`
 *          still settles with 200 while that promise is pending — that is
 *          only possible if the route never awaits the lookup before
 *          responding; if it did, the test would hang until Jest's
 *          per-test timeout. The deferred promise is then resolved and the
 *          queued work is shown to complete afterwards (still calling
 *          `revalidatePath`), so "not waited on" is proven distinct from
 *          "never happens." A third case proves a failure in the queued
 *          work is logged, not surfaced — the response was already sent by
 *          the time it would occur.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.3
 * ---
 */

import crypto from 'crypto'
import { NextRequest } from 'next/server'

import { PLACEMENT_DEMO_GALLERY_PATH, PLACEMENT_DEMO_GALLERY_SLUG } from '@/lib/galleryRevalidation'

const SECRET = 'whsec_test_secret_789'

function sign(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')
}

function makeRequest(body: string, signature: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/webhooks/picpeak', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-picpeak-signature': signature },
    body,
  })
}

function realEnvelope(type: string, slug: string, id: number = 1): string {
  return JSON.stringify({
    id: 'delivery-uuid-3',
    type,
    created_at: '2026-08-07T00:00:00.000Z',
    data: { event: { id, slug, event_name: 'A gallery' } },
  })
}

/** Resolves once the microtask queue has fully drained. */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

describe('AC-26.3: POST /api/webhooks/picpeak does not wait on the queued revalidation', () => {
  const originalSecret = process.env.PICPEAK_WEBHOOK_SECRET

  beforeEach(() => {
    process.env.PICPEAK_WEBHOOK_SECRET = SECRET
    jest.resetModules()
  })

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.PICPEAK_WEBHOOK_SECRET
    else process.env.PICPEAK_WEBHOOK_SECRET = originalSecret
    jest.dontMock('next/cache')
    jest.dontMock('@/lib/galleryPlacementLookup')
    jest.restoreAllMocks()
    jest.resetModules()
  })

  it('responds 2xx while the placement lookup is still pending, then completes the queued revalidation once it settles', async () => {
    let resolveLookup!: (found: boolean) => void
    const pendingLookup = new Promise<boolean>((resolve) => {
      resolveLookup = resolve
    })
    const hasPlacementMock = jest.fn().mockReturnValue(pendingLookup)

    jest.doMock('next/cache', () => ({ revalidatePath: jest.fn() }))
    jest.doMock('@/lib/galleryPlacementLookup', () => ({ hasGalleryPlacementForSlug: hasPlacementMock }))

    const { revalidatePath } = (await import('next/cache')) as unknown as { revalidatePath: jest.Mock }
    const { POST } = await import('@/app/(frontend)/api/webhooks/picpeak/route')

    const body = realEnvelope('event.published', PLACEMENT_DEMO_GALLERY_SLUG)

    // If the route awaited the lookup before responding, this would hang
    // until Jest's test timeout, since `pendingLookup` is never resolved
    // above. Settling here proves the response does not wait on it.
    const response = await POST(makeRequest(body, sign(SECRET, body)))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true })
    expect(hasPlacementMock).toHaveBeenCalledWith(PLACEMENT_DEMO_GALLERY_SLUG)
    // Queued, not skipped: it just hasn't finished yet.
    expect(revalidatePath).not.toHaveBeenCalled()

    resolveLookup(true)
    await flushMicrotasks()

    expect(revalidatePath).toHaveBeenCalledWith(PLACEMENT_DEMO_GALLERY_PATH)
  })

  it('an unhandled event type responds immediately with no lookup queued at all', async () => {
    jest.doMock('next/cache', () => ({ revalidatePath: jest.fn() }))
    const hasPlacementMock = jest.fn().mockResolvedValue(true)
    jest.doMock('@/lib/galleryPlacementLookup', () => ({ hasGalleryPlacementForSlug: hasPlacementMock }))

    const { revalidatePath } = (await import('next/cache')) as unknown as { revalidatePath: jest.Mock }
    const { POST } = await import('@/app/(frontend)/api/webhooks/picpeak/route')

    const body = realEnvelope('event.archived', PLACEMENT_DEMO_GALLERY_SLUG)
    const response = await POST(makeRequest(body, sign(SECRET, body)))

    expect(response.status).toBe(200)
    await flushMicrotasks()
    expect(hasPlacementMock).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('a failure in the queued revalidation is logged, not surfaced — the 2xx response was already sent', async () => {
    jest.doMock('next/cache', () => ({ revalidatePath: jest.fn() }))
    const hasPlacementMock = jest.fn().mockRejectedValue(new Error('db unavailable'))
    jest.doMock('@/lib/galleryPlacementLookup', () => ({ hasGalleryPlacementForSlug: hasPlacementMock }))

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const { POST } = await import('@/app/(frontend)/api/webhooks/picpeak/route')

    const body = realEnvelope('event.published', PLACEMENT_DEMO_GALLERY_SLUG)
    const response = await POST(makeRequest(body, sign(SECRET, body)))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true })

    await flushMicrotasks()
    expect(errorSpy).toHaveBeenCalledWith('picpeak webhook: queued revalidation failed', expect.any(Error))
  })
})
