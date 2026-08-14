/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us37-ac37.4.3-sitemap-image-references-live.test.ts
 * project: earthandhoney
 * purpose: Verify AC-37.4.3's evidence bar — a LIVE suite that seeds a real
 *          published Backstage gallery holding at least one processed photo
 *          (the same admin-login/find-or-create/publish technique
 *          us34-ac34.3-hero-gallery-live.test.ts already establishes,
 *          extended here with a find-or-upload step so the gallery also
 *          carries a photo, polling the SAME Flow A boundary the sitemap
 *          itself uses — resolveGalleryPlacementImages — until the
 *          background processor clears it, mirroring
 *          scripts/ac26.4.2-live-proof.sh's own poll-rather-than-assume
 *          reasoning for the async upload pipeline), places it on a
 *          published page via a real `gallery-placements` document, fetches
 *          the actual `/sitemap.xml`, and asserts that page's `<url>` block
 *          carries one `<image:image><image:loc>` per photo whose values
 *          match the photo URLs the same Flow A call returns for that
 *          gallery — set equality in both directions, not just "some image
 *          present". One of those absolute URLs is then fetched for real and
 *          shown to return HTTP 200 with an `image/*` content type, proving
 *          the URL is genuinely correct rather than merely well-formed.
 *          The spawned `next dev` child is given its own `NEXT_PUBLIC_SITE_URL`
 *          pointed at itself (`http://localhost:${LIVE_TEST_PORT}`) so the
 *          absolute URLs `absoluteSiteUrl` produces are the exact address
 *          this same server is listening on — the ported next.config.ts
 *          rewrite (AC-29.2.2.1.1) makes that server proxy
 *          `/api/gallery/:slug/:kind/:photoId` straight to the real
 *          Backstage backend, no separate origin needed. The Backstage
 *          gallery/photo are deliberately never deleted in the `finally`
 *          block — they are a reusable verification fixture, the same
 *          find-or-create/find-or-upload idempotence us25-ac25.2 and
 *          us34-ac34.3's live blocks already rely on — only the Payload
 *          `pages`/`gallery-placements` documents this run created are
 *          cleaned up.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.4.3
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import fs from 'fs'
import path from 'path'

import { resolveGalleryPlacementImages } from '@/lib/backstageGalleryPlacement'
import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4304
const GALLERY_NAME = 'US-37 AC-37.4.3 sitemap image reference live verification gallery'
const FIXTURE_IMAGE_PATH = path.join(root, 'vendor/picpeak/test-assets/img1.png')
const UPLOAD_DEADLINE_MS = 25000

async function waitForServer(url: string, timeoutMs: number): Promise<Response> {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown
  while (Date.now() < deadline) {
    try {
      return await fetch(url)
    } catch (err) {
      lastError = err
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms: ${String(lastError)}`)
}

function killServer(child: ChildProcessWithoutNullStreams): Promise<void> {
  return new Promise((resolve) => {
    child.once('exit', () => {
      clearTimeout(forceKillTimer)
      resolve()
    })
    child.kill('SIGTERM')
    const forceKillTimer = setTimeout(() => {
      child.kill('SIGKILL')
      resolve()
    }, 10000)
    forceKillTimer.unref()
  })
}

/**
 * Self-seeds (finds-or-creates and publishes) a real Backstage gallery, the
 * same admin API round trip us34-ac34.3-hero-gallery-live.test.ts's helper
 * uses, then find-or-uploads a photo into it and polls the SAME Flow A
 * boundary the sitemap uses (resolveGalleryPlacementImages) until the async
 * upload pipeline has processed it. Idempotent across runs: a gallery that
 * already holds a processed photo is returned as-is, no re-upload.
 */
async function seedLiveBackstageGalleryWithPhoto(): Promise<string> {
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

  const searchRes = await fetch(`${base}/api/admin/events?search=${encodeURIComponent(GALLERY_NAME)}`, {
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
        event_name: GALLERY_NAME,
        event_type: 'other',
        event_date: '2026-09-01',
        customer_name: 'AC-37.4.3 Verification',
        customer_email: 'verify-us37-ac37.4.3@example.com',
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
  form.append('photos', new Blob([new Uint8Array(fileBytes)], { type: 'image/png' }), 'ac-37.4.3-fixture.png')

  const uploadRes = await fetch(`${base}/api/admin/photos/${eventId}/upload`, {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: form,
  })
  expect(uploadRes.status).toBeLessThan(300)

  // The admin upload route inserts a `processing_status: 'pending'` row and
  // returns immediately — EXIF/thumbnails/webhook all happen asynchronously
  // in services/backgroundProcessor.js's poll loop. Poll the exact boundary
  // the sitemap itself resolves through, rather than assuming a fixed delay.
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

function extractUrlBlocks(xml: string): string[] {
  return Array.from(xml.matchAll(/<url>[\s\S]*?<\/url>/g)).map((m) => m[0])
}

function extractLocs(block: string, tag: 'loc' | 'image:loc'): string[] {
  const re = new RegExp(`<${tag}>([^<]+)</${tag}>`, 'g')
  return Array.from(block.matchAll(re)).map((m) => m[1])
}

describe('AC-37.4.3: a sitemap entry for a page carrying placed gallery imagery includes a correct image-sitemap reference per photo', () => {
  it(
    'the page\'s <url> block carries one <image:loc> per photo, matching the Flow A photo URLs, and one resolves to a real image',
    async () => {
      try {
        await dns.lookup('db')
        await dns.lookup('backstage-backend')
      } catch {
        // Not running inside the project's Docker network — skip the live round trip.
        return
      }

      const liveGallerySlug = await seedLiveBackstageGalleryWithPhoto()

      const base = `http://localhost:${LIVE_TEST_PORT}`
      // The spawned server is given its own site origin so the absolute
      // URLs absoluteSiteUrl() produces point back at this exact server —
      // the same next.config.ts rewrite every other placement route already
      // relies on then proxies the image request straight to Backstage.
      const child = spawn(path.join(root, 'node_modules/.bin/next'), ['dev', '-p', String(LIVE_TEST_PORT)], {
        cwd: root,
        env: { ...process.env, NEXT_PUBLIC_SITE_URL: base },
      })

      const createdPageIds: string[] = []
      const createdPlacementIds: string[] = []
      let authHeaders: { Authorization: string; 'Content-Type': string } | undefined

      try {
        await waitForServer(`${base}/api/users`, 60000)

        const token = await getLiveApiAuthToken(base)
        authHeaders = { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' }

        const unique = Date.now()

        const placementRes = await fetch(`${base}/api/gallery-placements`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ gallerySlug: liveGallerySlug, layout: 'masonry' }),
        })
        expect(placementRes.status).toBeLessThan(300)
        const placementBody = await placementRes.json()
        const placementId = (placementBody.doc ?? placementBody).id as string
        createdPlacementIds.push(placementId)

        const pageSlug = `ac37-4-3-image-sitemap-page-${unique}`
        const pageRes = await fetch(`${base}/api/pages`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            internalName: `AC-37.4.3 page ${unique}`,
            heading: `AC-37.4.3 Heading ${unique}`,
            slug: pageSlug,
            status: 'published',
            indexing: 'index',
            galleryPlacements: [placementId],
          }),
        })
        expect(pageRes.status).toBeLessThan(300)
        const pageBody = await pageRes.json()
        const pageId = (pageBody.doc ?? pageBody).id as string
        createdPageIds.push(pageId)

        // The photo URLs the SAME Flow A call the sitemap itself uses
        // returns for this gallery — the expectation this test's image
        // assertions are built from, not a hard-coded fixture value.
        const flowAResult = await resolveGalleryPlacementImages(liveGallerySlug)
        expect(flowAResult.status).toBe('ok')
        if (flowAResult.status !== 'ok') return // unreachable; narrows the type for TS below
        expect(flowAResult.images.length).toBeGreaterThan(0)
        const expectedImageUrls = new Set(flowAResult.images.map((image) => new URL(image.url, base).toString()))

        const sitemapRes = await fetch(`${base}/sitemap.xml`)
        expect(sitemapRes.status).toBe(200)
        const xml = await sitemapRes.text()

        // Google's image-sitemap namespace is present — proof this is a
        // real image-sitemap entry, not incidental text matching <image:loc>.
        expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')

        const pageAbsoluteUrl = new URL(`/${pageSlug}`, base).toString()
        const urlBlocks = extractUrlBlocks(xml)
        const pageBlock = urlBlocks.find((block) => extractLocs(block, 'loc').includes(pageAbsoluteUrl))
        expect(pageBlock).toBeDefined()

        const actualImageUrls = new Set(extractLocs(pageBlock as string, 'image:loc'))

        // Set equality in both directions, and one entry per photo — not
        // merely "some image present".
        expect(actualImageUrls).toEqual(expectedImageUrls)
        expect(actualImageUrls.size).toBe(flowAResult.images.length)

        // The URL is genuinely correct, not merely well-formed: fetch one
        // for real and confirm it serves actual image bytes.
        const [oneImageUrl] = Array.from(actualImageUrls)
        const imageRes = await fetch(oneImageUrl)
        expect(imageRes.status).toBe(200)
        expect(imageRes.headers.get('content-type')).toMatch(/^image\//)
      } finally {
        for (const id of createdPageIds) {
          await fetch(`${base}/api/pages/${id}`, { method: 'DELETE', headers: authHeaders }).catch(() => undefined)
        }
        for (const id of createdPlacementIds) {
          await fetch(`${base}/api/gallery-placements/${id}`, {
            method: 'DELETE',
            headers: authHeaders,
          }).catch(() => undefined)
        }
        await killServer(child)
      }
    },
    180000,
  )
})
