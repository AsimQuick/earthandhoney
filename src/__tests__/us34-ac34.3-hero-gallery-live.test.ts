/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us34-ac34.3-hero-gallery-live.test.ts
 * project: earthandhoney
 * purpose: Verify AC-34.3's live-render evidence — the homepage's hero
 *          slideshow placement resolves StudioProfile.homeHeroGallerySlug
 *          through the real Flow A boundary against a running Backstage, not
 *          a mock. Self-seeds a real published gallery on the live Backstage
 *          stack (the same admin-login/find-or-create/publish technique
 *          us25-ac25.2-backstage-client-flow-a.test.ts's live block and
 *          us31-ac31.5-public-page-gallery-placement.test.ts already
 *          established), then two live requests against a real `next dev`
 *          server: (1) with StudioProfile.homeHeroGallerySlug pointed at
 *          that real, reachable gallery, the homepage response renders the
 *          real HeroSlideshow markup; (2) with the same field pointed at a
 *          gallery slug that does not exist, the homepage still renders
 *          (200, never a 500) using GalleryUnavailablePlaceholder's markup
 *          instead of a blank hero. StudioProfile is a shared singleton, so
 *          the test snapshots and restores its original
 *          `homeHeroGallerySlug` in a `finally` block. Gated on both `db`
 *          and `backstage-backend` resolving, mirroring
 *          us31-ac31.5-public-page-gallery-placement.test.ts's own gate.
 * created-by: dev-team
 * related-story: US-34
 * related-ac: 34.3
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4296
const GALLERY_NAME = 'US-34 AC-34.3 hero gallery live verification gallery'

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
 * us31-ac31.5-public-page-gallery-placement.test.ts's own helper uses.
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
      customer_name: 'AC-34.3 Verification',
      customer_email: 'verify-us34-ac34.3@example.com',
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

describe('AC-34.3: the homepage hero placement resolves through the live Flow A boundary', () => {
  it(
    'renders HeroSlideshow for a reachable Backstage gallery, and GalleryUnavailablePlaceholder markup for an unreachable one',
    async () => {
      try {
        await dns.lookup('db')
        await dns.lookup('backstage-backend')
      } catch {
        // Not running inside the project's Docker network — skip the live
        // round trip (mirrors us31-ac31.5-public-page-gallery-placement.test.ts).
        return
      }

      const liveGallerySlug = await seedLiveBackstageGallery()

      const child = spawn(
        path.join(root, 'node_modules/.bin/next'),
        ['dev', '-p', String(LIVE_TEST_PORT)],
        { cwd: root, env: process.env },
      )

      const base = `http://localhost:${LIVE_TEST_PORT}`
      let authHeaders: { Authorization: string; 'Content-Type': string } | undefined
      let originalHeroSlug: string | null = null

      try {
        await waitForServer(`${base}/api/users`, 60000)

        const token = await getLiveApiAuthToken(base)
        authHeaders = { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' }

        // Snapshot the real StudioProfile global as it stood before this
        // test, so the shared singleton can be restored afterwards.
        const originalProfileRes = await fetch(`${base}/api/globals/studio-profile`, { headers: authHeaders })
        expect(originalProfileRes.status).toBeLessThan(300)
        originalHeroSlug =
          ((await originalProfileRes.json()) as { homeHeroGallerySlug?: string | null }).homeHeroGallerySlug ?? null

        // Live render 1: StudioProfile.homeHeroGallerySlug points at a real,
        // reachable Backstage gallery — HeroSlideshow's markup appears in the
        // homepage response.
        const reachableUpdateRes = await fetch(`${base}/api/globals/studio-profile`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ homeHeroGallerySlug: liveGallerySlug }),
        })
        expect(reachableUpdateRes.status).toBeLessThan(300)

        const reachableRes = await fetch(`${base}/`)
        expect(reachableRes.status).toBe(200)
        const reachableHtml = await reachableRes.text()
        expect(reachableHtml).toContain('data-testid="hero-slideshow"')
        expect(reachableHtml).not.toContain('data-testid="gallery-placement-unavailable"')

        // Live render 2: the same field points at a gallery slug that does
        // not exist — the homepage still renders (200, never a 500) using
        // GalleryUnavailablePlaceholder rather than a blank hero.
        const unreachableUpdateRes = await fetch(`${base}/api/globals/studio-profile`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ homeHeroGallerySlug: `ac-34-3-does-not-exist-${Date.now()}` }),
        })
        expect(unreachableUpdateRes.status).toBeLessThan(300)

        const unreachableRes = await fetch(`${base}/`)
        expect(unreachableRes.status).toBe(200)
        const unreachableHtml = await unreachableRes.text()
        expect(unreachableHtml).toContain('data-testid="gallery-placement-unavailable"')
        expect(unreachableHtml).not.toContain('data-testid="hero-slideshow"')
      } finally {
        if (authHeaders) {
          await fetch(`${base}/api/globals/studio-profile`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ homeHeroGallerySlug: originalHeroSlug }),
          }).catch(() => undefined)
        }
        await killServer(child)
      }
    },
    120000,
  )
})
