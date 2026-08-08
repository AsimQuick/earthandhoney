/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us29-ac29.5-security-invariants-preserved.test.ts
 * project: earthandhoney
 * purpose: Verify AC-29.5 — PRD §19.3 (access control, logging, watermarks,
 *          revocation) is preserved by the two mechanisms AC-29.2/29.3
 *          actually measured (candidate 1 `backstage-proxy` and candidate 2
 *          `presigned-r2`). AC-29.4 rejected both candidates on performance
 *          grounds and left the delivery-path decision open, so there is no
 *          single "chosen path" to certify; this suite instead proves the
 *          invariant that would matter whichever candidate is ever revived:
 *          both share one access-control gate (`verifyGalleryAccess`), and
 *          an unauthenticated request against a password-protected or
 *          still-draft (unreleased) gallery is refused under both routes.
 *          It proves that live, self-seeding its own galleries against the
 *          running Backstage stack (skipped, not failed, outside the
 *          project's Docker network — mirrors us25-ac25.2's `dns.lookup`
 *          guard). It then independently re-verifies, against the pinned
 *          fork's actual current lines, the static evidence for what a live
 *          run cannot practically exercise in this suite: candidate 1 logs
 *          every delivery (`view` on listing, `download` only once a byte
 *          send is confirmed) and watermarks every byte it serves;
 *          candidate 2 logs the presigned-URL grant but, once redirected,
 *          bypasses the backend (and therefore watermarking) entirely and
 *          has no per-request revocation check on the R2 side — only its
 *          300-second TTL bounds exposure. Neither candidate leaks a
 *          private gallery to a request that never authenticates at all.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.5
 * ---
 */

import dns from 'dns/promises'
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const lines = (rel: string) => read(rel).split('\n')

describe('AC-29.5 static evidence: both measured candidates share one access gate', () => {
  const galleryJs = lines('vendor/picpeak/backend/src/routes/gallery.js')
  const middlewareJs = lines('vendor/picpeak/backend/src/middleware/gallery.js')

  it('candidate 1\'s photo-listing route (`GET /:slug/photos`) is gated by verifyGalleryAccess', () => {
    expect(galleryJs[217]).toContain("router.get('/:slug/photos'")
    expect(galleryJs[217]).toContain('verifyGalleryAccess')
  })

  it('candidate 2\'s only real call site (`GET /:slug/download-all`) is gated by the same verifyGalleryAccess', () => {
    expect(galleryJs[885]).toContain("router.get('/:slug/download-all'")
    expect(galleryJs[885]).toContain('verifyGalleryAccess')
  })

  it('an unauthenticated request with no token refuses before any password/gallery data is touched', () => {
    expect(middlewareJs[25]).toContain('if (!token)')
    expect(middlewareJs[61]).toContain("res.status(401).json({ error: 'No token provided' })")
  })

  it('a request for a still-draft (unreleased) gallery is excluded by the same query, before the password branch runs', () => {
    // is_draft is filtered on the *lookup* query (line 40), which runs and is
    // awaited before the requiresPassword check (line 49) is ever reached —
    // so a draft gallery 404s regardless of whether it also requires a
    // password, rather than falling through to a weaker check.
    expect(middlewareJs[39]).toContain('is_draft: formatBoolean(false)')
    expect(middlewareJs[44]).toContain('if (!event)')
    expect(middlewareJs[45]).toContain('404')
  })

  it('revocation is re-checked on every request, not decoded once from the JWT', () => {
    // is_active/is_archived/is_draft are WHERE-filtered on a fresh query per
    // request (both the no-token and the JWT-bearing branches), so an admin
    // flipping is_active off takes effect on the very next request even for
    // a holder of an unexpired 24h gallery JWT.
    expect(middlewareJs[84]).toContain('event = await withRetry')
    expect(middlewareJs[88]).toContain('is_active: formatBoolean(true)')
    expect(middlewareJs[92]).toContain('is_draft: formatBoolean(false)')
    // Customer-portal-minted tokens get an additional live revocation check
    // against event_customer_assignments — removing that row 403s the very
    // next request even though the JWT itself is still valid.
    expect(middlewareJs[147]).toContain('CUSTOMER_ASSIGNMENT_REVOKED')
  })

  it('candidate 1 logs a delivery on every authorized listing call, awaited before the response', () => {
    expect(galleryJs[419]).toContain('await db(\'access_logs\').insert(')
    expect(galleryJs[423]).toContain("action: 'view'")
  })

  it('candidate 1 logs a confirmed single-photo download exactly once, only after the bytes are actually sent', () => {
    const block = galleryJs.slice(665, 691).join('\n')
    expect(block).toContain('if (downloadRecorded) return')
    expect(block).toContain("action: 'download'")
    expect(block).toContain('photo_id: photoId')
  })

  it('candidate 1 applies a watermark on every route that serves photo bytes', () => {
    // Bounded at the next top-level route registration rather than a fixed
    // character window, since this handler (unlike the single-line ones
    // above) spans hundreds of lines.
    const src = read('vendor/picpeak/backend/src/routes/gallery.js')
    const start = src.indexOf("router.get('/:slug/photo/:photoId'")
    expect(start).toBeGreaterThan(-1)
    const nextRoute = src.indexOf("\nrouter.", start + 1)
    expect(nextRoute).toBeGreaterThan(start)
    const handlerBody = src.slice(start, nextRoute)
    expect(handlerBody).toMatch(/watermarkService/)
  })

  it('candidate 2\'s presigned branch logs the URL grant, but the insert is fire-and-forget, not awaited', () => {
    const block = galleryJs.slice(897, 916).join('\n')
    expect(block).toContain("action: 'download_all_presigned'")
    expect(block).toContain("db('access_logs').insert({")
    // Deliberately NOT `await db(...)` — contrast with candidate 1's view
    // log above, which is awaited. A failed insert here would silently not
    // delay or block the redirect.
    expect(block).not.toContain("await db('access_logs')")
    expect(block).toContain('res.redirect(302, url)')
  })

  it('candidate 2\'s presigned branch never calls the watermark service, and is explicitly gated off event watermarking', () => {
    const block = galleryJs.slice(897, 923).join('\n')
    expect(block).toContain('watermarkOnEvent')
    expect(block).toContain('!watermarkOnEvent')
    expect(block).not.toMatch(/watermarkService/)
    // The streaming fallback immediately below it, by contrast, does watermark.
    const streamingBlock = galleryJs.slice(940, 981).join('\n')
    expect(streamingBlock).toContain('watermarkService.getWatermarkSettings()')
  })

  it('presigned URLs have exactly one call site in the whole backend, with a fixed 5-minute TTL and no revocation hook', () => {
    const backendSrc = path.join(root, 'vendor/picpeak/backend/src')
    const grep = (dir: string): string[] => {
      const out: string[] = []
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) out.push(...grep(full))
        else if (entry.isFile() && entry.name.endsWith('.js') && read(path.relative(root, full)).includes('.signedUrl(')) {
          out.push(path.relative(root, full))
        }
      }
      return out
    }
    const callers = grep(backendSrc).filter((f) => !f.endsWith('S3StorageBackend.js') && !f.endsWith('LocalFsStorage.js'))
    expect(callers).toEqual(['vendor/picpeak/backend/src/routes/gallery.js'])
    expect(galleryJs[907]).toContain('storage.signedUrl(zipInfo.key, 300)')
    // Once issued, the URL is a bare S3-compatible capability: R2 itself has
    // no way to re-check is_active/is_archived/event_customer_assignments,
    // so the 300s TTL is the only bound on exposure if the URL is captured.
  })
})

/**
 * Live proof against the real running Backstage stack. Guarded exactly like
 * us25-ac25.2: when this suite runs outside the project's Docker network (no
 * "backstage-backend" hostname to resolve), the static-evidence suite above
 * already pins the access-control/logging/watermark/revocation behavior
 * against the pinned fork's real source; this block adds the live
 * unauthenticated-refusal + authorized-delivery-is-logged round trip when a
 * real Backstage is actually reachable. Self-seeds its own galleries (never
 * reuses another AC's fixtures) so it has no dependency on prior test runs.
 */
describe('AC-29.5 live: unauthenticated requests are refused, authorized delivery is logged', () => {
  const PROTECTED_NAME = 'US-29 AC-29.5 protected-gallery access-control verification'
  const DRAFT_NAME = 'US-29 AC-29.5 draft-gallery access-control verification'
  const PASSWORD = 'AC295-Verify-Pass!'

  it(
    'refuses candidate 1 and candidate 2 unauthenticated on a password-protected and on a still-draft gallery, then logs an authorized delivery',
    async () => {
      try {
        await dns.lookup('backstage-backend')
      } catch {
        // Not running inside the project's Docker network — the static
        // evidence suite above already proves the mechanism from source.
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
      const authHeaders = { 'Content-Type': 'application/json', Cookie: adminCookie }

      const findOrCreate = async (name: string, requirePassword: boolean, publish: boolean) => {
        const searchRes = await fetch(`${base}/api/admin/events?search=${encodeURIComponent(name)}`, {
          headers: authHeaders,
        })
        const searchBody = (await searchRes.json()) as {
          events: Array<{ id: number; slug: string; is_draft: boolean; event_name: string }>
        }
        let match = searchBody.events.find((e) => e.event_name === name)

        if (!match) {
          const createRes = await fetch(`${base}/api/admin/events`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              event_name: name,
              event_type: 'other',
              event_date: '2026-09-01',
              customer_name: 'AC-29.5 Verification',
              customer_email: `verify-${requirePassword ? 'protected' : 'draft'}-us29-ac29.5@example.com`,
              admin_email: adminUsername.includes('@') ? adminUsername : 'admin@example.com',
              password: requirePassword ? PASSWORD : '',
              expires_at: '2026-12-01',
              require_password: requirePassword,
            }),
          })
          expect(createRes.status).toBeLessThan(300)
          match = (await createRes.json()) as { id: number; slug: string; is_draft: boolean; event_name: string }
        }

        if (publish && match.is_draft) {
          const publishRes = await fetch(`${base}/api/admin/events/${match.id}/publish`, {
            method: 'POST',
            headers: authHeaders,
          })
          expect(publishRes.status).toBe(200)
        }

        return match
      }

      const protectedGallery = await findOrCreate(PROTECTED_NAME, true, true)
      const draftGallery = await findOrCreate(DRAFT_NAME, false, false)

      // --- Unauthenticated refusal: password-protected, published gallery ---
      const unauthPhotosProtected = await fetch(`${base}/api/gallery/${protectedGallery.slug}/photos`)
      expect(unauthPhotosProtected.status).toBe(401)
      expect(await unauthPhotosProtected.json()).toEqual({ error: 'No token provided' })

      const unauthDownloadAllProtected = await fetch(`${base}/api/gallery/${protectedGallery.slug}/download-all`)
      expect(unauthDownloadAllProtected.status).toBe(401)
      expect(await unauthDownloadAllProtected.json()).toEqual({ error: 'No token provided' })

      // --- Unauthenticated refusal: still-draft (unreleased) gallery ---
      const unauthPhotosDraft = await fetch(`${base}/api/gallery/${draftGallery.slug}/photos`)
      expect(unauthPhotosDraft.status).toBe(404)
      expect(await unauthPhotosDraft.json()).toEqual({ error: 'Gallery not found or expired' })

      const unauthDownloadAllDraft = await fetch(`${base}/api/gallery/${draftGallery.slug}/download-all`)
      expect(unauthDownloadAllDraft.status).toBe(404)
      expect(await unauthDownloadAllDraft.json()).toEqual({ error: 'Gallery not found or expired' })

      // --- Wrong password on our own self-seeded gallery is refused too ---
      const wrongPasswordRes = await fetch(`${base}/api/auth/gallery/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: protectedGallery.slug, password: 'totally-wrong' }),
      })
      expect(wrongPasswordRes.status).toBe(401)

      // --- Correct password grants a token; the same route now succeeds ---
      const verifyRes = await fetch(`${base}/api/auth/gallery/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: protectedGallery.slug, password: PASSWORD }),
      })
      expect(verifyRes.status).toBe(200)
      const { token } = (await verifyRes.json()) as { token: string }
      expect(typeof token).toBe('string')
      const authHeader = { Authorization: `Bearer ${token}` }

      // --- Authorized delivery is logged: total_views increments on the
      // previously-refused listing route once the token is presented ---
      const eventDetailBefore = await fetch(`${base}/api/admin/events/${protectedGallery.id}`, { headers: authHeaders })
      const beforeStats = (await eventDetailBefore.json()) as { total_views?: number }

      const authedPhotos = await fetch(`${base}/api/gallery/${protectedGallery.slug}/photos`, { headers: authHeader })
      expect(authedPhotos.status).toBe(200)

      const eventDetailAfter = await fetch(`${base}/api/admin/events/${protectedGallery.id}`, { headers: authHeaders })
      const afterStats = (await eventDetailAfter.json()) as { total_views?: number }
      expect(afterStats.total_views ?? 0).toBeGreaterThan(beforeStats.total_views ?? -1)

      // --- The same auth gate that refused unauthenticated candidate-2
      // access releases it once authorized — proving the boundary really is
      // the token, not some other incidental block on that route. ---
      const authedDownloadAll = await fetch(`${base}/api/gallery/${protectedGallery.slug}/download-all`, {
        headers: authHeader,
      })
      expect(authedDownloadAll.status).not.toBe(401)
      const authedDownloadAllBody = (await authedDownloadAll.json().catch(() => ({}))) as { error?: string }
      expect(authedDownloadAllBody.error).not.toBe('No token provided')
    },
    30000,
  )
})
