/**
 * ---
 * file: src/test-support/liveBackstageGallery.ts
 * project: earthandhoney
 * purpose: Shared fixture bootstrap for the live suites that need a REAL
 *          published Backstage gallery holding at least one fully processed
 *          photo. Lifted verbatim (behaviour unchanged, gallery identity
 *          parameterised) out of
 *          us37-ac37.4.3-sitemap-image-references-live.test.ts when AC-37.6's
 *          SEO-Assistant live suite needed the same fixture: its
 *          missing-alt-text audit is only *functional* against placed images
 *          that actually exist. One implementation of "find-or-create a
 *          published gallery, find-or-upload a photo, then poll the same
 *          Flow A boundary the product itself reads through", not a copy per
 *          suite.
 *          Idempotent across runs by design: a gallery that already holds a
 *          processed photo is returned as-is, so repeated runs never
 *          accumulate photos in a shared verification gallery. The seeded
 *          Backstage gallery/photo are deliberately never deleted — they are
 *          a reusable verification fixture, the same find-or-create
 *          idempotence us25-ac25.2 and us34-ac34.3's live blocks rely on.
 *          Deliberately placed outside src/__tests__ for the same reason
 *          src/test-support/liveApiAuth.ts is: Jest's default testMatch
 *          would otherwise treat this helper as a suite with no tests.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.6
 * ---
 */
import fs from 'fs'
import path from 'path'

import { resolveGalleryPlacementImages } from '@/lib/backstageGalleryPlacement'

const root = process.cwd()

/** The image uploaded when a verification gallery holds no processed photo yet — the vendored fork's own test asset. */
const FIXTURE_IMAGE_PATH = path.join(root, 'vendor/picpeak/test-assets/img1.png')

/** How long to wait for Backstage's asynchronous upload pipeline (EXIF/thumbnails) to clear a freshly uploaded photo. */
const UPLOAD_DEADLINE_MS = 25000

export interface LiveBackstageGalleryOptions {
  /** The Backstage event name this fixture is found-or-created by — unique per suite, so suites never contend for one gallery. */
  galleryName: string
  /** Customer name recorded on a freshly created gallery. */
  customerName: string
  /** Customer email recorded on a freshly created gallery. */
  customerEmail: string
}

/**
 * Finds-or-creates and publishes a real Backstage gallery, then
 * finds-or-uploads a photo into it and polls the SAME Flow A boundary the
 * product uses (`resolveGalleryPlacementImages`) until the async upload
 * pipeline has processed it — poll rather than assume a fixed delay, the
 * same reasoning scripts/ac26.4.2-live-proof.sh records.
 *
 * Returns the gallery's Backstage slug, ready to be referenced by a Payload
 * `gallery-placements` document.
 */
export async function seedLiveBackstageGalleryWithPhoto(options: LiveBackstageGalleryOptions): Promise<string> {
  const { customerEmail, customerName, galleryName } = options

  const base = process.env.BACKSTAGE_BACKEND_URL || 'http://backstage-backend:3000'
  const adminUsername = process.env.BACKSTAGE_ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.BACKSTAGE_ADMIN_PASSWORD || 'change-me-in-production'

  const loginRes = await fetch(`${base}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: adminUsername, password: adminPassword }),
  })
  expect(loginRes.status).toBe(200)
  const setCookie = loginRes.headers.get('set-cookie') || ''
  const adminCookie = setCookie.split(';')[0]
  const authHeaders = { 'Content-Type': 'application/json', Cookie: adminCookie }

  const searchRes = await fetch(`${base}/api/admin/events?search=${encodeURIComponent(galleryName)}`, {
    headers: authHeaders,
  })
  expect(searchRes.status).toBe(200)
  const searchBody = (await searchRes.json()) as { events: Array<{ id: number; slug: string; is_draft: boolean }> }

  let slug: string
  let eventId: number
  if (searchBody.events.length > 0) {
    slug = searchBody.events[0].slug
    eventId = searchBody.events[0].id
    if (searchBody.events[0].is_draft) {
      await fetch(`${base}/api/admin/events/${eventId}/publish`, { method: 'POST', headers: authHeaders })
    }
  } else {
    const createRes = await fetch(`${base}/api/admin/events`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        event_name: galleryName,
        event_type: 'other',
        event_date: '2026-09-01',
        customer_name: customerName,
        customer_email: customerEmail,
        admin_email: adminUsername.includes('@') ? adminUsername : 'admin@example.com',
        password: '',
        expires_at: '2026-12-01',
        require_password: false,
      }),
    })
    expect(createRes.status).toBeLessThan(300)
    const created = (await createRes.json()) as { id: number; slug: string }
    slug = created.slug
    eventId = created.id
    const publishRes = await fetch(`${base}/api/admin/events/${eventId}/publish`, {
      method: 'POST',
      headers: authHeaders,
    })
    expect(publishRes.status).toBe(200)
  }

  // Find-or-upload: skip re-uploading when the gallery already holds a
  // fully processed photo, so repeated runs stay idempotent rather than
  // accumulating photos in the shared verification gallery.
  const existing = await resolveGalleryPlacementImages(slug)
  if (existing.status === 'ok' && existing.images.length > 0) {
    return slug
  }

  const fileBytes = fs.readFileSync(FIXTURE_IMAGE_PATH)
  const form = new FormData()
  form.append('photos', new Blob([new Uint8Array(fileBytes)], { type: 'image/png' }), 'live-fixture.png')

  const uploadRes = await fetch(`${base}/api/admin/photos/${eventId}/upload`, {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: form,
  })
  expect(uploadRes.status).toBeLessThan(300)

  // The admin upload route inserts a `processing_status: 'pending'` row and
  // returns immediately — EXIF/thumbnails/webhook all happen asynchronously
  // in services/backgroundProcessor.js's poll loop. Poll the exact boundary
  // the product itself resolves through, rather than assuming a fixed delay.
  const deadline = Date.now() + UPLOAD_DEADLINE_MS
  while (Date.now() < deadline) {
    const result = await resolveGalleryPlacementImages(slug)
    if (result.status === 'ok' && result.images.length > 0) {
      return slug
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error(`Gallery ${slug} did not show a processed photo within ${UPLOAD_DEADLINE_MS}ms`)
}
