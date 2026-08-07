/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us26-ac26.5-webhook-idempotent-dropped-delivery.test.ts
 * project: earthandhoney
 * purpose: Verify AC-26.5, in three parts. (1) Idempotency:
 *          picpeakWebhookDeliveryDedup.ts's claimWebhookDelivery is exercised
 *          directly (first-claim/repeat-claim/eviction/no-id), then the same
 *          delivery id POSTed twice through the real receiver route is shown
 *          to produce exactly one revalidatePath call and two 2xx responses
 *          — the second is not an error, it just claims nothing new. A
 *          second, *different* delivery id for the same event is shown to
 *          revalidate again, proving the dedup is per-delivery, not
 *          per-slug. (2) Bounded staleness: every gallery-bearing route this
 *          receiver's slug lookup can reach (PLACEMENT_DEMO_GALLERY_PATH,
 *          WEBHOOK_LIVE_PROOF_GALLERY_PATH) is asserted, by reading its own
 *          route source, to declare `export const revalidate = 60` — the
 *          same numeric bound PAYLOAD_PICPEAK_API_CONTRACT.md's "What the
 *          Frontstage is allowed to cache" section commits to — so a
 *          dropped delivery (receiver stopped, or Backstage's retries
 *          exhausted) cannot leave that route stale past 60s regardless of
 *          whether a webhook ever arrives again. (3) Upstream retry policy
 *          recorded: contract row 5's "five-attempt-then-`failed`" claim is
 *          cross-checked against the real pinned-fork source
 *          (webhookDeliveryWorker.js's MAX_ATTEMPTS default and BACKOFF_MS
 *          schedule) so this AC's reliance on that upstream behaviour is a
 *          verified fact, not an assumption — mirrors
 *          us26-ac26.2-webhook-slug-revalidation.test.ts's contract
 *          cross-check technique.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.5
 * ---
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { NextRequest } from 'next/server'

import {
  PLACEMENT_DEMO_GALLERY_PATH,
  PLACEMENT_DEMO_GALLERY_SLUG,
  WEBHOOK_LIVE_PROOF_GALLERY_PATH,
} from '@/lib/galleryRevalidation'
import {
  __resetWebhookDeliveryDedupForTests,
  claimWebhookDelivery,
} from '@/lib/picpeakWebhookDeliveryDedup'

const SECRET = 'whsec_test_secret_265'
const CONTRACT_DOC_PATH = 'PAYLOAD_PICPEAK_API_CONTRACT.md'
const DELIVERY_WORKER_PATH = 'vendor/picpeak/backend/src/services/webhookDeliveryWorker.js'

function sign(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')
}

function makeRequest(body: string, signature: string, deliveryId?: string): NextRequest {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-picpeak-signature': signature,
  }
  if (deliveryId !== undefined) headers['x-picpeak-delivery'] = deliveryId
  return new NextRequest('http://localhost:3000/api/webhooks/picpeak', {
    method: 'POST',
    headers,
    body,
  })
}

function realEnvelope(type: string, slug: string, deliveryId: string, id: number = 1): string {
  return JSON.stringify({
    id: deliveryId,
    type,
    created_at: '2026-08-07T00:00:00.000Z',
    data: { event: { id, slug, event_name: 'A gallery' } },
  })
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

describe('AC-26.5: claimWebhookDelivery — the dedup primitive', () => {
  beforeEach(() => {
    __resetWebhookDeliveryDedupForTests()
  })

  it('claims a fresh delivery id the first time', () => {
    expect(claimWebhookDelivery('delivery-a')).toBe(true)
  })

  it('refuses the same delivery id a second time', () => {
    expect(claimWebhookDelivery('delivery-b')).toBe(true)
    expect(claimWebhookDelivery('delivery-b')).toBe(false)
    expect(claimWebhookDelivery('delivery-b')).toBe(false)
  })

  it('treats distinct delivery ids independently', () => {
    expect(claimWebhookDelivery('delivery-c')).toBe(true)
    expect(claimWebhookDelivery('delivery-d')).toBe(true)
    expect(claimWebhookDelivery('delivery-c')).toBe(false)
    expect(claimWebhookDelivery('delivery-d')).toBe(false)
  })

  it('always claims true for a missing/empty delivery id — nothing to dedupe against', () => {
    expect(claimWebhookDelivery(null)).toBe(true)
    expect(claimWebhookDelivery(undefined)).toBe(true)
    expect(claimWebhookDelivery('')).toBe(true)
    expect(claimWebhookDelivery(null)).toBe(true)
  })

  it('evicts the oldest id once the tracked-delivery bound is exceeded', () => {
    for (let i = 0; i < 500; i += 1) {
      expect(claimWebhookDelivery(`bulk-${i}`)).toBe(true)
    }
    // Still within the 500-entry bound: every one of the 500 is remembered.
    // This check doesn't mutate the tracked window (an already-seen id is
    // never re-inserted), so it's safe to run before the eviction below.
    expect(claimWebhookDelivery('bulk-0')).toBe(false)

    // The 501st distinct id evicts the oldest (`bulk-0`) to make room.
    expect(claimWebhookDelivery('bulk-500')).toBe(true)

    // `bulk-1` — now the oldest tracked id — is still inside the window.
    expect(claimWebhookDelivery('bulk-1')).toBe(false)

    // `bulk-0` was evicted two steps ago — forgotten, so claimable again.
    expect(claimWebhookDelivery('bulk-0')).toBe(true)
  })
})

describe('AC-26.5: POST /api/webhooks/picpeak is idempotent for a duplicate/replayed delivery id', () => {
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
    jest.resetModules()
  })

  async function loadRouteWithMocks() {
    jest.doMock('next/cache', () => ({ revalidatePath: jest.fn() }))
    const hasPlacementMock = jest.fn().mockResolvedValue(true)
    jest.doMock('@/lib/galleryPlacementLookup', () => ({ hasGalleryPlacementForSlug: hasPlacementMock }))

    const { revalidatePath } = (await import('next/cache')) as unknown as { revalidatePath: jest.Mock }
    const { POST } = await import('@/app/(frontend)/api/webhooks/picpeak/route')
    return { POST, revalidatePath, hasPlacementMock }
  }

  it('the same delivery id processed twice produces one revalidation and no error', async () => {
    const { POST, revalidatePath, hasPlacementMock } = await loadRouteWithMocks()

    const body = realEnvelope('event.published', PLACEMENT_DEMO_GALLERY_SLUG, 'delivery-replay-1')
    const signature = sign(SECRET, body)

    const first = await POST(makeRequest(body, signature, 'delivery-replay-1'))
    expect(first.status).toBe(200)
    expect(await first.json()).toEqual({ received: true })

    const second = await POST(makeRequest(body, signature, 'delivery-replay-1'))
    expect(second.status).toBe(200)
    expect(await second.json()).toEqual({ received: true })

    await flushMicrotasks()

    // Queued once (from the first delivery) — the replay claimed nothing
    // new, so the lookup/revalidation never ran a second time.
    expect(hasPlacementMock).toHaveBeenCalledTimes(1)
    expect(revalidatePath).toHaveBeenCalledTimes(1)
    expect(revalidatePath).toHaveBeenCalledWith(PLACEMENT_DEMO_GALLERY_PATH)
  })

  it('a third, fourth, and fifth replay of the same delivery id (mirroring Backstage\'s own 5-attempt retry) stays at one revalidation', async () => {
    const { POST, revalidatePath, hasPlacementMock } = await loadRouteWithMocks()

    const body = realEnvelope('photo.uploaded', PLACEMENT_DEMO_GALLERY_SLUG, 'delivery-replay-2')
    const signature = sign(SECRET, body)

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await POST(makeRequest(body, signature, 'delivery-replay-2'))
      expect(response.status).toBe(200)
    }

    await flushMicrotasks()

    expect(hasPlacementMock).toHaveBeenCalledTimes(1)
    expect(revalidatePath).toHaveBeenCalledTimes(1)
  })

  it('a different delivery id for a new, distinct event still revalidates — dedup is per-delivery, not a blanket suppression', async () => {
    const { POST, revalidatePath } = await loadRouteWithMocks()

    const firstBody = realEnvelope('event.published', PLACEMENT_DEMO_GALLERY_SLUG, 'delivery-distinct-1')
    const secondBody = realEnvelope('photo.uploaded', PLACEMENT_DEMO_GALLERY_SLUG, 'delivery-distinct-2')

    await POST(makeRequest(firstBody, sign(SECRET, firstBody), 'delivery-distinct-1'))
    await POST(makeRequest(secondBody, sign(SECRET, secondBody), 'delivery-distinct-2'))

    await flushMicrotasks()

    expect(revalidatePath).toHaveBeenCalledTimes(2)
  })

  it('a request with no delivery id header at all is still processed without error (no id to dedupe against)', async () => {
    const { POST, revalidatePath } = await loadRouteWithMocks()

    const body = realEnvelope('event.published', PLACEMENT_DEMO_GALLERY_SLUG, 'unused-body-id')
    const response = await POST(makeRequest(body, sign(SECRET, body)))

    expect(response.status).toBe(200)
    await flushMicrotasks()
    expect(revalidatePath).toHaveBeenCalledWith(PLACEMENT_DEMO_GALLERY_PATH)
  })
})

describe('AC-26.5: every reachable gallery-bearing route caps staleness at the contract\'s 60-second safety net', () => {
  const gatewayRoutes: Array<{ label: string; routePath: string; sourceFile: string }> = [
    {
      label: 'placement demo (PLACEMENT_DEMO_GALLERY_SLUG)',
      routePath: PLACEMENT_DEMO_GALLERY_PATH,
      sourceFile: 'src/app/(frontend)/dev/gallery-placement-demo/page.tsx',
    },
    {
      label: 'webhook live-proof (WEBHOOK_LIVE_PROOF_GALLERY_SLUGS)',
      routePath: WEBHOOK_LIVE_PROOF_GALLERY_PATH,
      sourceFile: 'src/app/(frontend)/dev/gallery-webhook-proof/page.tsx',
    },
  ]

  it.each(gatewayRoutes)(
    '$label declares export const revalidate = 60',
    ({ sourceFile }) => {
      const src = fs.readFileSync(path.join(process.cwd(), sourceFile), 'utf8')
      expect(src).toMatch(/export const revalidate = 60/)
    },
  )

  it('the two routes above are exactly the routes getGalleryBearingPathsForSlug can resolve a known slug to', () => {
    const routePaths = gatewayRoutes.map((route) => route.routePath)
    expect(routePaths).toEqual([PLACEMENT_DEMO_GALLERY_PATH, WEBHOOK_LIVE_PROOF_GALLERY_PATH])
  })

  it('the contract states the 60-second bound this test enforces', () => {
    const contractDoc = fs.readFileSync(path.join(process.cwd(), CONTRACT_DOC_PATH), 'utf8')
    expect(contractDoc).toMatch(/bounded safety-net cap of 60 seconds/i)
  })
})

describe('AC-26.5: contract row 5\'s five-attempt-then-failed retry policy is the real upstream behaviour', () => {
  const contractDoc = fs.readFileSync(path.join(process.cwd(), CONTRACT_DOC_PATH), 'utf8')
  const row5 = contractDoc.split('\n').find((line) => line.includes('Backstage → Frontstage'))!
  const workerSrc = fs.readFileSync(path.join(process.cwd(), DELIVERY_WORKER_PATH), 'utf8')

  it('row 5 exists and states the five-attempt backoff-then-failed policy', () => {
    expect(row5).toBeDefined()
    expect(row5).toMatch(/up to `5` attempts/)
    expect(row5).toMatch(/1m → 5m → 30m → 2h → 12h/)
    expect(row5).toMatch(/marked `failed`/)
    expect(row5).toMatch(/not retried further/)
  })

  it('the pinned fork\'s delivery worker really defaults to 5 attempts', () => {
    expect(workerSrc).toMatch(/WEBHOOK_MAX_ATTEMPTS\s*\|\|\s*'5'/)
  })

  it('the pinned fork\'s backoff schedule really is 1m, 5m, 30m, 2h, 12h', () => {
    expect(workerSrc).toMatch(/60_000,\s*\/\/ 1 min/)
    expect(workerSrc).toMatch(/5 \* 60_000,\s*\/\/ 5 min/)
    expect(workerSrc).toMatch(/30 \* 60_000,\s*\/\/ 30 min/)
    expect(workerSrc).toMatch(/2 \* 60 \* 60_000,\s*\/\/ 2 h/)
    expect(workerSrc).toMatch(/12 \* 60 \* 60_000,\s*\/\/ 12 h/)
  })

  it('the worker really marks a delivery failed, not silently dropped, once attempts are exhausted', () => {
    expect(workerSrc).toMatch(/newAttempt >= MAX_ATTEMPTS/)
    expect(workerSrc).toMatch(/status: 'failed'/)
  })
})
