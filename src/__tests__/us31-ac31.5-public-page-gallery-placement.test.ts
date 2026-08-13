/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us31-ac31.5-public-page-gallery-placement.test.ts
 * project: earthandhoney
 * purpose: Verify AC-31.5's live-render evidence — the public `[slug]` route
 *          resolves a page's gallery placements through the real Flow A
 *          boundary against a running Backstage, not a mock. Self-seeds a
 *          real published gallery on the live Backstage stack (the same
 *          admin-login/find-or-create/publish technique
 *          us25-ac25.2-backstage-client-flow-a.test.ts's live block already
 *          established), then two live requests against a real `next dev`
 *          server: (1) a page whose placement points at that real, reachable
 *          gallery renders the resolved gallery layout in the returned
 *          markup; (2) a page whose placement points at a gallery slug that
 *          does not exist renders GalleryUnavailablePlaceholder's markup
 *          instead of failing (still 200, never a 500). Gated on both `db`
 *          and `backstage-backend` resolving — this suite needs a live
 *          Payload/Postgres server *and* a live Backstage to reach, unlike
 *          us31-ac31.4-public-page-route.test.ts's `db`-only gate, since
 *          that suite never touches a gallery.
 * created-by: dev-team
 * related-story: US-31
 * related-ac: 31.5
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4283
const GALLERY_NAME = 'US-31 AC-31.5 gallery placement live verification gallery'

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
 * Self-seeds (finds-or-creates and publishes) a real Backstage gallery and
 * returns its slug — the same admin API round trip
 * us25-ac25.2-backstage-client-flow-a.test.ts's live block uses, so this
 * suite never depends on a one-off manual setup step.
 */
async function seedLiveBackstageGallery(): Promise<string> {
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

  if (searchBody.events.length > 0) {
    const { slug, id, is_draft } = searchBody.events[0]
    if (is_draft) {
      await fetch(`${base}/api/admin/events/${id}/publish`, { method: 'POST', headers: authHeaders })
    }
    return slug
  }

  const createRes = await fetch(`${base}/api/admin/events`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      event_name: GALLERY_NAME,
      event_type: 'other',
      event_date: '2026-09-01',
      customer_name: 'AC-31.5 Verification',
      customer_email: 'verify-us31-ac31.5@example.com',
      admin_email: adminUsername.includes('@') ? adminUsername : 'admin@example.com',
      password: '',
      expires_at: '2026-12-01',
      require_password: false,
    }),
  })
  expect(createRes.status).toBeLessThan(300)
  const created = (await createRes.json()) as { id: number; slug: string }
  const publishRes = await fetch(`${base}/api/admin/events/${created.id}/publish`, {
    method: 'POST',
    headers: authHeaders,
  })
  expect(publishRes.status).toBe(200)
  return created.slug
}

describe('AC-31.5: gallery placements on a public page resolve through the live Flow A boundary', () => {
  it(
    'renders the resolved gallery for a reachable Backstage gallery, and GalleryUnavailablePlaceholder markup for an unreachable one',
    async () => {
      try {
        await dns.lookup('db')
        await dns.lookup('backstage-backend')
      } catch {
        // Not running inside the project's Docker network — skip the live
        // round trip (mirrors us31-ac31.4-public-page-route.test.ts).
        return
      }

      const liveGallerySlug = await seedLiveBackstageGallery()

      const child = spawn(
        path.join(root, 'node_modules/.bin/next'),
        ['dev', '-p', String(LIVE_TEST_PORT)],
        { cwd: root, env: process.env },
      )

      const base = `http://localhost:${LIVE_TEST_PORT}`
      const createdPlacementIds: string[] = []
      const createdPageIds: string[] = []
      let authHeaders: { Authorization: string; 'Content-Type': string } | undefined

      try {
        await waitForServer(`${base}/api/users`, 60000)

        const token = await getLiveApiAuthToken(base)
        authHeaders = { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' }

        async function createPlacement(fields: Record<string, unknown>): Promise<string> {
          const res = await fetch(`${base}/api/gallery-placements`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(fields),
          })
          expect(res.status).toBeLessThan(300)
          const body = await res.json()
          const id = (body.doc ?? body).id as string
          createdPlacementIds.push(id)
          return id
        }

        async function createPage(fields: Record<string, unknown>): Promise<string> {
          const res = await fetch(`${base}/api/pages`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(fields),
          })
          expect(res.status).toBeLessThan(300)
          const body = await res.json()
          const id = (body.doc ?? body).id as string
          createdPageIds.push(id)
          return id
        }

        const unique = Date.now()

        const reachablePlacementId = await createPlacement({
          gallerySlug: liveGallerySlug,
          layout: 'masonry',
          visibility: 'public',
          order: 0,
        })
        const reachableSlug = `ac31-5-reachable-${unique}`
        await createPage({
          internalName: `AC-31.5 reachable-gallery fixture ${unique}`,
          heading: `AC-31.5 Reachable Heading ${unique}`,
          slug: reachableSlug,
          status: 'published',
          indexing: 'index',
          galleryPlacements: [reachablePlacementId],
        })

        const unreachableSlug = `ac31-5-unreachable-${unique}`
        const unreachablePlacementId = await createPlacement({
          gallerySlug: `ac-31-5-does-not-exist-${unique}`,
          layout: 'masonry',
          visibility: 'public',
          order: 0,
        })
        await createPage({
          internalName: `AC-31.5 unreachable-gallery fixture ${unique}`,
          heading: `AC-31.5 Unreachable Heading ${unique}`,
          slug: unreachableSlug,
          status: 'published',
          indexing: 'index',
          galleryPlacements: [unreachablePlacementId],
        })

        // Live render 1: a real, reachable Backstage gallery — the resolved
        // masonry layout appears in the response markup.
        const reachableRes = await fetch(`${base}/${reachableSlug}`)
        expect(reachableRes.status).toBe(200)
        const reachableHtml = await reachableRes.text()
        expect(reachableHtml).toContain(`AC-31.5 Reachable Heading ${unique}`)
        expect(reachableHtml).toContain('data-testid="gallery-masonry"')
        expect(reachableHtml).not.toContain('data-testid="gallery-placement-unavailable"')

        // Live render 2: the gallery is unreachable (slug does not exist on
        // the live Backstage) — the page still renders (200, never a 500)
        // using GalleryUnavailablePlaceholder rather than failing.
        const unreachableRes = await fetch(`${base}/${unreachableSlug}`)
        expect(unreachableRes.status).toBe(200)
        const unreachableHtml = await unreachableRes.text()
        expect(unreachableHtml).toContain(`AC-31.5 Unreachable Heading ${unique}`)
        expect(unreachableHtml).toContain('data-testid="gallery-placement-unavailable"')
        expect(unreachableHtml).not.toContain('data-testid="gallery-masonry"')
      } finally {
        for (const id of createdPageIds) {
          await fetch(`${base}/api/pages/${id}`, { method: 'DELETE', headers: authHeaders }).catch(() => undefined)
        }
        for (const id of createdPlacementIds) {
          await fetch(`${base}/api/gallery-placements/${id}`, { method: 'DELETE', headers: authHeaders }).catch(
            () => undefined,
          )
        }
        await killServer(child)
      }
    },
    120000,
  )
})
