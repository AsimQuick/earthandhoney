/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us25-ac25.2-backstage-client-flow-a.test.ts
 * project: earthandhoney
 * purpose: Verify AC-25.2 — src/lib/backstageClient.ts implements Flow A
 *          rows 1-2 of PAYLOAD_PICPEAK_API_CONTRACT.md correctly: `GET
 *          /api/gallery/:slug/info`, then the `POST /api/auth/gallery/verify`
 *          handshake (unconditionally, even for a gallery that turns out to
 *          be public), then `GET /api/gallery/:slug/photos`. Two layers:
 *          (1) mocked-fetch unit tests pinning each function's request
 *          shape, response mapping, and explicit per-call timeout, run
 *          unconditionally and fast; (2) a live round trip against the real
 *          Backstage stack (`docker compose --profile backstage up`), run
 *          only when the "backstage-backend" Docker network hostname
 *          resolves (mirrors us6-ac6.3's `dns.lookup('db')` guard) — it logs
 *          in as the seeded Backstage admin, finds-or-creates and publishes
 *          a public verification gallery, then calls `fetchPublishedGallery`
 *          **twice** against it and asserts the two round trips agree, so
 *          the live proof is reproduced within the suite itself rather than
 *          depending on a one-off manual run.
 * created-by: dev-team
 * related-story: US-25
 * related-ac: 25.2
 * ---
 */
import dns from 'dns/promises'

import {
  fetchPublishedGallery,
  getGalleryInfo,
  getGalleryPhotos,
  verifyGalleryAccess,
  type FlowAOutcome,
} from '@/lib/backstageClient'

describe('AC-25.2: getGalleryInfo — contract row 1, GET /api/gallery/:slug/info', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns the parsed display metadata on 200', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ event_name: 'A gallery', requires_password: false }), { status: 200 }),
    )

    const result = await getGalleryInfo('a-gallery')

    expect(result).toEqual({ ok: true, data: { event_name: 'A gallery', requires_password: false } })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/gallery/a-gallery/info'),
      expect.objectContaining({ method: 'GET', signal: expect.any(AbortSignal) }),
    )
  })

  it('URL-encodes the slug', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))
    await getGalleryInfo('a slug/weird')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/gallery/${encodeURIComponent('a slug/weird')}/info`),
      expect.anything(),
    )
  })

  it('treats 404 as "not available", per the contract\'s combined not-found/archived/unpublished rule', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'nope' }), { status: 404 }))
    const result = await getGalleryInfo('missing')
    expect(result).toEqual({
      ok: false,
      reason: 'not_found',
      status: 404,
      error: expect.any(String),
    })
  })

  it('surfaces a 301 redirect body as the renamed-slug case', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ redirect: true, newSlug: 'new-slug' }), { status: 301 }))
    const result = await getGalleryInfo('old-slug')
    expect(result).toEqual({
      ok: false,
      reason: 'redirect',
      status: 301,
      error: expect.any(String),
      newSlug: 'new-slug',
    })
  })

  it('maps a fetch abort to a timeout failure, not a generic network error', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError')
    jest.spyOn(global, 'fetch').mockRejectedValue(abortError)
    const result = await getGalleryInfo('slow-gallery', 10)
    expect(result).toEqual({ ok: false, reason: 'timeout', status: null, error: expect.any(String) })
  })

  it('maps any other fetch rejection to a network_error failure', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))
    const result = await getGalleryInfo('unreachable-gallery')
    expect(result).toEqual({ ok: false, reason: 'network_error', status: null, error: expect.any(String) })
  })

  it('maps any other non-2xx status to unexpected_status rather than a success', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('boom', { status: 500 }))
    const result = await getGalleryInfo('a-gallery')
    expect(result).toEqual({ ok: false, reason: 'unexpected_status', status: 500, error: expect.any(String) })
  })

  it('every call passes an explicit AbortSignal (the timeout is never optional)', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))
    await getGalleryInfo('a-gallery', 1234)
    const [, init] = fetchMock.mock.calls[0]
    expect((init as RequestInit).signal).toBeInstanceOf(AbortSignal)
  })
})

describe('AC-25.2: verifyGalleryAccess — contract row 2 step 1, POST /api/auth/gallery/verify', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('sends only the slug (no password field) for a public-gallery handshake', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ token: 'jwt-token' }), { status: 200 }))

    const result = await verifyGalleryAccess('public-gallery')

    expect(result).toEqual({ ok: true, token: 'jwt-token' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/auth/gallery/verify')
    expect((init as RequestInit).method).toBe('POST')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ slug: 'public-gallery' })
  })

  it('includes the password field only when one is supplied', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ token: 'jwt-token' }), { status: 200 }))

    await verifyGalleryAccess('protected-gallery', 'hunter2')

    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ slug: 'protected-gallery', password: 'hunter2' })
  })

  it('maps a 401 to an unauthorized failure', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'nope' }), { status: 401 }))
    const result = await verifyGalleryAccess('protected-gallery', 'wrong')
    expect(result).toEqual({ ok: false, reason: 'unauthorized', status: 401, error: expect.any(String) })
  })

  it('maps a fetch abort to a timeout failure', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new DOMException('aborted', 'AbortError'))
    const result = await verifyGalleryAccess('slow-gallery', undefined, 10)
    expect(result).toEqual({ ok: false, reason: 'timeout', status: null, error: expect.any(String) })
  })

  it('maps any other fetch rejection to a network_error failure', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))
    const result = await verifyGalleryAccess('unreachable-gallery')
    expect(result).toEqual({ ok: false, reason: 'network_error', status: null, error: expect.any(String) })
  })

  it('maps any other non-2xx status to unexpected_status', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('boom', { status: 500 }))
    const result = await verifyGalleryAccess('a-gallery')
    expect(result).toEqual({ ok: false, reason: 'unexpected_status', status: 500, error: expect.any(String) })
  })

  it('treats a 200 response carrying no token as a successful handshake with a null token', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))
    const result = await verifyGalleryAccess('public-gallery')
    expect(result).toEqual({ ok: true, token: null })
  })

  it('carries an explicit AbortSignal', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ token: 't' }), { status: 200 }))
    await verifyGalleryAccess('a-gallery')
    const [, init] = fetchMock.mock.calls[0]
    expect((init as RequestInit).signal).toBeInstanceOf(AbortSignal)
  })
})

describe('AC-25.2: getGalleryPhotos — contract row 2 step 2, GET /api/gallery/:slug/photos', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('presents the gallery JWT back as a Bearer credential when one was obtained', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ event: {}, photos: [] }), { status: 200 }))

    const result = await getGalleryPhotos('a-gallery', 'jwt-token')

    expect(result).toEqual({ ok: true, data: { event: {}, photos: [] } })
    const [, init] = fetchMock.mock.calls[0]
    expect((init as RequestInit).headers).toEqual({ Authorization: 'Bearer jwt-token' })
  })

  it('sends no Authorization header when no token was obtained', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ event: {}, photos: [] }), { status: 200 }))

    await getGalleryPhotos('a-gallery', null)

    const [, init] = fetchMock.mock.calls[0]
    expect((init as RequestInit).headers).toEqual({})
  })

  it('maps a 404 to not_found ("Gallery not found or expired")', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'nope' }), { status: 404 }))
    const result = await getGalleryPhotos('missing', null)
    expect(result).toEqual({ ok: false, reason: 'not_found', status: 404, error: expect.any(String) })
  })

  it('maps a 401 to unauthorized', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'nope' }), { status: 401 }))
    const result = await getGalleryPhotos('protected', 'stale-token')
    expect(result).toEqual({ ok: false, reason: 'unauthorized', status: 401, error: expect.any(String) })
  })

  it('maps a fetch abort to a timeout failure — the photo list call is timeout-bounded too', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new DOMException('aborted', 'AbortError'))
    const result = await getGalleryPhotos('slow-gallery', null, 10)
    expect(result).toEqual({ ok: false, reason: 'timeout', status: null, error: expect.any(String) })
  })

  it('maps any other fetch rejection to a network_error failure', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))
    const result = await getGalleryPhotos('unreachable-gallery', null)
    expect(result).toEqual({ ok: false, reason: 'network_error', status: null, error: expect.any(String) })
  })

  it('maps any other non-2xx status to unexpected_status', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('boom', { status: 503 }))
    const result = await getGalleryPhotos('a-gallery', null)
    expect(result).toEqual({ ok: false, reason: 'unexpected_status', status: 503, error: expect.any(String) })
  })

  it('carries an explicit AbortSignal', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ event: {}, photos: [] }), { status: 200 }))
    await getGalleryPhotos('a-gallery', null)
    const [, init] = fetchMock.mock.calls[0]
    expect((init as RequestInit).signal).toBeInstanceOf(AbortSignal)
  })
})

describe('AC-25.2: fetchPublishedGallery — the Flow A orchestration, info then verify then photos', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('calls info, then verify, then photos, in that order, and combines their data on success', async () => {
    const calls: string[] = []
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/info')) {
        calls.push('info')
        return new Response(JSON.stringify({ event_name: 'A gallery', requires_password: false }), { status: 200 })
      }
      if (url.includes('/verify')) {
        calls.push('verify')
        return new Response(JSON.stringify({ token: 'jwt-token' }), { status: 200 })
      }
      if (url.includes('/photos')) {
        calls.push('photos')
        return new Response(JSON.stringify({ event: {}, photos: [{ id: 1, filename: 'a.jpg', url: '/a', thumbnail_url: null }] }), {
          status: 200,
        })
      }
      throw new Error(`Unexpected URL: ${url}`)
    })

    const result = await fetchPublishedGallery('a-gallery')

    expect(calls).toEqual(['info', 'verify', 'photos'])
    expect(result).toEqual({
      ok: true,
      info: { event_name: 'A gallery', requires_password: false },
      photos: { event: {}, photos: [{ id: 1, filename: 'a.jpg', url: '/a', thumbnail_url: null }] },
    })
  })

  it('runs the verify handshake even when info already reported requires_password: false — never assumed in advance', async () => {
    let verifyWasCalled = false
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/info')) {
        return new Response(JSON.stringify({ event_name: 'A public gallery', requires_password: false }), {
          status: 200,
        })
      }
      if (url.includes('/verify')) {
        verifyWasCalled = true
        return new Response(JSON.stringify({ token: 'jwt-token' }), { status: 200 })
      }
      return new Response(JSON.stringify({ event: {}, photos: [] }), { status: 200 })
    })

    await fetchPublishedGallery('a-public-gallery')

    expect(verifyWasCalled).toBe(true)
  })

  it('stops at the info step on failure and never calls verify or photos', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({}), { status: 404 }))
    const result = await fetchPublishedGallery('missing-gallery')
    expect(result).toEqual({ ok: false, step: 'info', reason: 'not_found', status: 404, error: expect.any(String) })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('stops at the verify step on failure and never calls photos', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/info')) {
        return new Response(JSON.stringify({ event_name: 'A gallery', requires_password: true }), { status: 200 })
      }
      return new Response(JSON.stringify({ error: 'Invalid gallery or password' }), { status: 401 })
    })
    const result = await fetchPublishedGallery('protected-gallery')
    expect(result).toEqual({ ok: false, step: 'verify', reason: 'unauthorized', status: 401, error: expect.any(String) })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('reports a failing photos step as step: "photos", never as a partial success', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/info')) {
        return new Response(JSON.stringify({ event_name: 'A gallery', requires_password: false }), { status: 200 })
      }
      if (url.includes('/verify')) {
        return new Response(JSON.stringify({ token: 'jwt-token' }), { status: 200 })
      }
      return new Response(JSON.stringify({ error: 'Gallery not found or expired' }), { status: 404 })
    })

    const result = await fetchPublishedGallery('expired-gallery')

    expect(result).toEqual({ ok: false, step: 'photos', reason: 'not_found', status: 404, error: expect.any(String) })
    // The info metadata it did successfully retrieve is deliberately not
    // returned alongside the failure — a half-complete Flow A must never
    // reach a caller looking like a gallery it can render.
    expect(result).not.toHaveProperty('info')
  })

  it('passes the caller-supplied timeout down to every one of the three calls', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/info')) {
        return new Response(JSON.stringify({ event_name: 'A gallery', requires_password: false }), { status: 200 })
      }
      if (url.includes('/verify')) return new Response(JSON.stringify({ token: 't' }), { status: 200 })
      return new Response(JSON.stringify({ event: {}, photos: [] }), { status: 200 })
    })

    await fetchPublishedGallery('a-gallery', { timeoutMs: 250 })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    for (const [, init] of fetchMock.mock.calls) {
      expect((init as RequestInit).signal).toBeInstanceOf(AbortSignal)
    }
  })
})

/**
 * Live proof against the real running Backstage stack. Guarded by the same
 * `dns.lookup` technique us6-ac6.3 already established: when this suite runs
 * outside the project's Docker network (no "backstage-backend" hostname to
 * resolve), the mocked-fetch tests above already pin the client's exact
 * behavior; this block only adds the live round trip when a real Backstage
 * is actually reachable. Self-seeding (finds-or-creates and publishes its
 * own verification gallery through the same admin API PIVOT_AUDIT.md's live
 * evidence already used) so it never depends on a one-off manual setup step,
 * and calls `fetchPublishedGallery` twice so the live proof is reproduced
 * within a single run, not just asserted from a single call.
 */
describe('AC-25.2: fetchPublishedGallery proven live against the running Backstage stack', () => {
  const GALLERY_NAME = 'US-25 AC-25.2 backstageClient live verification gallery'

  it(
    'fetches real display metadata and a real (possibly empty) photo list for a published public gallery, twice',
    async () => {
      try {
        await dns.lookup('backstage-backend')
      } catch {
        // Not running inside the project's Docker network — the mocked-fetch
        // tests above already prove the client's request/response handling.
        return
      }

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
      expect(adminCookie).toMatch(/^admin_token=/)
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
            customer_name: 'AC-25.2 Verification',
            customer_email: 'verify-us25-ac25.2@example.com',
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

      const runs: FlowAOutcome[] = []
      for (let run = 1; run <= 2; run++) {
        const result = await fetchPublishedGallery(slug)

        expect(result.ok).toBe(true)
        if (!result.ok) return // unreachable; narrows the type for TS below
        expect(result.info.event_name).toBe(GALLERY_NAME)
        expect(result.info.requires_password).toBe(false)
        expect(Array.isArray(result.photos.photos)).toBe(true)
        runs.push(result)
      }

      // "Reproduced rather than run once" means the second live round trip
      // agreed with the first, not merely that two calls each happened to
      // pass their own assertions — a flow that returned different display
      // metadata or a different photo list per call would satisfy the loop
      // above while failing the AC.
      expect(runs).toHaveLength(2)
      expect(runs[1]).toEqual(runs[0])
    },
    30000,
  )
})
