/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us26-ac26.2-webhook-slug-revalidation.test.ts
 * project: earthandhoney
 * purpose: Verify AC-26.2 — the verified webhook receiver extracts the
 *          changed gallery's `id`/`slug` from the payload, maps it to the
 *          `GalleryPlacement` records referencing that slug, and calls the
 *          re-keyed on-demand revalidation mechanism
 *          (getGalleryBearingPathsForSlug). Covers, layer by layer: (1)
 *          picpeakWebhookEvent.ts's payload-import-free body parser and its
 *          fixed handled-event-type set, cross-checked against contract row
 *          5's real event-type catalog so the "handled" subset is provably
 *          drawn from it, not invented; (2) galleryRevalidation.ts's re-keyed
 *          slug-to-path(s) lookup, alongside the pre-existing title lookup it
 *          leaves untouched; (3) the receiver route end-to-end, with
 *          `payload` and `next/cache` mocked (mirrors
 *          us6-ac6.3-on-demand-revalidation.test.ts's dynamic-import-under-
 *          mock technique, since `payload` is an ESM-only package that
 *          cannot be imported directly from Jest) — a handled event whose
 *          slug has a matching placement revalidates exactly that
 *          placement's path; a handled event with no matching placement, and
 *          an unrecognised event type, both revalidate nothing and still
 *          respond 2xx.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.2
 * ---
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { NextRequest } from 'next/server'

import {
  getGalleryBearingPathsForSlug,
  ISR_DEMO_GALLERY_PATH,
  ISR_DEMO_GALLERY_TITLE,
  PLACEMENT_DEMO_GALLERY_PATH,
  PLACEMENT_DEMO_GALLERY_SLUG,
  getGalleryBearingPaths,
} from '@/lib/galleryRevalidation'
import {
  PICPEAK_WEBHOOK_HANDLED_EVENT_TYPES,
  isHandledPicPeakWebhookEvent,
  parsePicPeakWebhookEvent,
} from '@/lib/picpeakWebhookEvent'

const SECRET = 'whsec_test_secret_456'
const CONTRACT_DOC_PATH = 'PAYLOAD_PICPEAK_API_CONTRACT.md'

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
    id: 'delivery-uuid-1',
    type,
    created_at: '2026-08-07T00:00:00.000Z',
    data: { event: { id, slug, event_name: 'A gallery' } },
  })
}

describe('AC-26.2: picpeakWebhookEvent.ts parses the verified body', () => {
  it('extracts type and gallery id/slug from the real Backstage envelope shape (data.event.{id,slug})', () => {
    const parsed = parsePicPeakWebhookEvent(realEnvelope('event.published', 'a-gallery', 42))
    expect(parsed).toEqual({ type: 'event.published', gallerySlug: 'a-gallery', galleryId: 42 })
  })

  it('also accepts a flat data.{id,slug} shape', () => {
    const body = JSON.stringify({ type: 'photo.uploaded', data: { id: 7, slug: 'flat-gallery' } })
    expect(parsePicPeakWebhookEvent(body)).toEqual({
      type: 'photo.uploaded',
      gallerySlug: 'flat-gallery',
      galleryId: 7,
    })
  })

  it('returns null for malformed JSON', () => {
    expect(parsePicPeakWebhookEvent('not json')).toBeNull()
  })

  it('returns null for a JSON body missing a string type', () => {
    expect(parsePicPeakWebhookEvent(JSON.stringify({ data: {} }))).toBeNull()
    expect(parsePicPeakWebhookEvent(JSON.stringify([1, 2, 3]))).toBeNull()
  })

  it('returns null id/slug (not absent) when the body carries no gallery subject', () => {
    expect(parsePicPeakWebhookEvent(JSON.stringify({ type: 'event.published' }))).toEqual({
      type: 'event.published',
      gallerySlug: null,
      galleryId: null,
    })
  })
})

describe('AC-26.2: the fixed handled-event-type set is a real subset of contract row 5\'s catalog', () => {
  const contractDoc = fs.readFileSync(path.join(process.cwd(), CONTRACT_DOC_PATH), 'utf8')
  const row5 = contractDoc.split('\n').find((line) => line.includes('Backstage → Frontstage'))!

  it('row 5 exists and states the fixed event-type catalog', () => {
    expect(row5).toBeDefined()
    expect(row5).toMatch(/event-type catalog is fixed/i)
  })

  it('every handled event type is drawn from contract row 5\'s real catalog', () => {
    for (const type of PICPEAK_WEBHOOK_HANDLED_EVENT_TYPES) {
      expect(row5).toContain(`\`${type}\``)
    }
  })

  it('is a proper subset: row 5 documents other real event types this receiver does not handle', () => {
    for (const undocumentedType of ['event.created', 'event.archived', 'event.expired']) {
      expect(row5).toContain(`\`${undocumentedType}\``)
      expect(PICPEAK_WEBHOOK_HANDLED_EVENT_TYPES as readonly string[]).not.toContain(undocumentedType)
    }
  })

  it('isHandledPicPeakWebhookEvent accepts exactly the three handled types', () => {
    expect(isHandledPicPeakWebhookEvent('event.published')).toBe(true)
    expect(isHandledPicPeakWebhookEvent('photo.uploaded')).toBe(true)
    expect(isHandledPicPeakWebhookEvent('photo.deleted')).toBe(true)
  })

  it('isHandledPicPeakWebhookEvent rejects an unrecognised/undocumented-to-this-receiver type', () => {
    expect(isHandledPicPeakWebhookEvent('event.created')).toBe(false)
    expect(isHandledPicPeakWebhookEvent('event.archived')).toBe(false)
    expect(isHandledPicPeakWebhookEvent('event.expired')).toBe(false)
    expect(isHandledPicPeakWebhookEvent('something.unknown')).toBe(false)
    expect(isHandledPicPeakWebhookEvent(null)).toBe(false)
    expect(isHandledPicPeakWebhookEvent(undefined)).toBe(false)
  })
})

describe('AC-26.2: getGalleryBearingPathsForSlug — the re-keyed lookup', () => {
  it('maps the placement demo gallery slug to the placement demo route', () => {
    expect(getGalleryBearingPathsForSlug(PLACEMENT_DEMO_GALLERY_SLUG)).toEqual([PLACEMENT_DEMO_GALLERY_PATH])
  })

  it('returns no paths for a slug that backs no in-scope route', () => {
    expect(getGalleryBearingPathsForSlug('some-other-slug')).toEqual([])
  })

  it('returns no paths for a null or undefined slug', () => {
    expect(getGalleryBearingPathsForSlug(null)).toEqual([])
    expect(getGalleryBearingPathsForSlug(undefined)).toEqual([])
  })

  it('leaves the pre-existing title-keyed lookup untouched', () => {
    expect(getGalleryBearingPaths(ISR_DEMO_GALLERY_TITLE)).toEqual([ISR_DEMO_GALLERY_PATH])
  })
})

describe('AC-26.2: POST /api/webhooks/picpeak revalidates on-demand for a handled event with a matching placement', () => {
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

  async function loadRouteWithMocks(findMock: jest.Mock) {
    jest.doMock('next/cache', () => ({ revalidatePath: jest.fn() }))
    // Mocked at the module boundary the route imports
    // (galleryPlacementLookup.ts), not at 'payload'/'@payload-config'
    // themselves: `@payload-config` is a tsconfig-only path alias that Jest's
    // moduleNameMapper resolves straight to the real src/payload.config.ts
    // (which drags in the ESM-only @payloadcms/db-postgres driver) *before*
    // consulting the mock registry, so a jest.doMock of that specifier can't
    // intercept it — mirrors us6-ac6.3-on-demand-revalidation.test.ts's
    // documented reason for never importing `payload` directly from Jest.
    jest.doMock('@/lib/galleryPlacementLookup', () => ({ hasGalleryPlacementForSlug: findMock }))

    const { revalidatePath } = (await import('next/cache')) as unknown as { revalidatePath: jest.Mock }
    const { POST } = await import('@/app/(frontend)/api/webhooks/picpeak/route')
    return { POST, revalidatePath }
  }

  it('event.published for a slug with a matching placement: looks up the slug, revalidates its path(s), responds 2xx', async () => {
    const hasPlacementMock = jest.fn().mockResolvedValue(true)
    const { POST, revalidatePath } = await loadRouteWithMocks(hasPlacementMock)

    const body = realEnvelope('event.published', PLACEMENT_DEMO_GALLERY_SLUG)
    const response = await POST(makeRequest(body, sign(SECRET, body)))

    expect(response.status).toBe(200)
    expect(hasPlacementMock).toHaveBeenCalledWith(PLACEMENT_DEMO_GALLERY_SLUG)
    expect(revalidatePath).toHaveBeenCalledTimes(1)
    expect(revalidatePath).toHaveBeenCalledWith(PLACEMENT_DEMO_GALLERY_PATH)
  })

  it('photo.uploaded and photo.deleted are handled the same way as event.published', async () => {
    for (const type of ['photo.uploaded', 'photo.deleted']) {
      const hasPlacementMock = jest.fn().mockResolvedValue(true)
      const { POST, revalidatePath } = await loadRouteWithMocks(hasPlacementMock)

      const body = realEnvelope(type, PLACEMENT_DEMO_GALLERY_SLUG)
      const response = await POST(makeRequest(body, sign(SECRET, body)))

      expect(response.status).toBe(200)
      expect(revalidatePath).toHaveBeenCalledWith(PLACEMENT_DEMO_GALLERY_PATH)
    }
  })

  it('a handled event for a slug with no matching placement: looks up the slug but revalidates nothing, still responds 2xx', async () => {
    const hasPlacementMock = jest.fn().mockResolvedValue(false)
    const { POST, revalidatePath } = await loadRouteWithMocks(hasPlacementMock)

    const body = realEnvelope('event.published', 'no-placement-slug')
    const response = await POST(makeRequest(body, sign(SECRET, body)))

    expect(response.status).toBe(200)
    expect(hasPlacementMock).toHaveBeenCalledTimes(1)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('a handled event for a slug with a placement but no in-scope gallery-bearing route revalidates nothing', async () => {
    const hasPlacementMock = jest.fn().mockResolvedValue(true)
    const { POST, revalidatePath } = await loadRouteWithMocks(hasPlacementMock)

    // Referenced by a placement, per the mock, but not a slug
    // getGalleryBearingPathsForSlug maps to any route — proves the two
    // lookups are independent, not that one implies the other.
    const body = realEnvelope('event.published', 'placed-but-no-known-route-slug')
    const response = await POST(makeRequest(body, sign(SECRET, body)))

    expect(response.status).toBe(200)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('an unrecognised event type is accepted with 2xx and ignored — not looked up, not revalidated, not an error', async () => {
    const hasPlacementMock = jest.fn().mockResolvedValue(true)
    const { POST, revalidatePath } = await loadRouteWithMocks(hasPlacementMock)

    const body = realEnvelope('event.archived', PLACEMENT_DEMO_GALLERY_SLUG)
    const response = await POST(makeRequest(body, sign(SECRET, body)))

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toEqual({ received: true })
    expect(hasPlacementMock).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('a malformed (non-JSON) but correctly signed body is accepted with 2xx and revalidates nothing', async () => {
    const hasPlacementMock = jest.fn().mockResolvedValue(true)
    const { POST, revalidatePath } = await loadRouteWithMocks(hasPlacementMock)

    const body = 'not-json-but-signed'
    const response = await POST(makeRequest(body, sign(SECRET, body)))

    expect(response.status).toBe(200)
    expect(hasPlacementMock).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('AC-26.2: galleryPlacementLookup.ts queries the GalleryPlacements collection by slug', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/lib/galleryPlacementLookup.ts'), 'utf8')

  it('queries the gallery-placements collection filtered by the gallerySlug field', () => {
    expect(src).toMatch(/collection:\s*['"]gallery-placements['"]/)
    expect(src).toMatch(/gallerySlug:\s*\{\s*equals:\s*slug\s*\}/)
  })

  it('dynamically imports payload/@payload-config (deferred so merely importing this module never loads the ESM-only payload package)', () => {
    expect(src).toMatch(/await import\(['"]payload['"]\)/)
    expect(src).toMatch(/await import\(['"]@payload-config['"]\)/)
  })
})
