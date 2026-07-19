/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us6-ac6.3-on-demand-revalidation.test.ts
 * project: earthandhoney
 * purpose: Verify AC-6.3 — updating a gallery in Payload triggers on-demand
 *          revalidation/regeneration of the affected gallery-bearing
 *          route(s), demonstrated against the internal ISR demo route from
 *          AC-6.2 (src/app/(frontend)/dev/gallery-isr-demo). Four concerns
 *          are covered: (1) the payload-import-free title-to-path map
 *          (src/lib/galleryRevalidation.ts) that decides which route(s) an
 *          updated gallery affects; (2) the Galleries collection's source
 *          wires an `afterChange` hook using `revalidatePath` from
 *          `next/cache`; (3) invoking that hook (with `next/cache` mocked,
 *          so it runs outside any Next.js request scope) calls
 *          `revalidatePath` with exactly the ISR demo route's path for the
 *          ISR demo gallery, and not at all for an unrelated gallery — this
 *          is what pins down the precise on-demand/targeted-revalidation
 *          contract, deterministically and fast; and (4) a live round trip
 *          against the real REST API and the real Payload collection
 *          lifecycle proves updating the demo gallery succeeds (i.e. the
 *          hook's `revalidatePath` call does not throw Next's "static
 *          generation store missing" invariant when actually invoked inside
 *          a genuine Route Handler request) and that the rendered route
 *          reflects the update. Note: `next dev` (used by every live test in
 *          this suite, see us1-ac1.2/us2-ac2.4/us3-ac3.5) always re-renders
 *          per request and never actually caches — proving a stale cache is
 *          genuinely bypassed on-demand (vs. waiting out the `revalidate`
 *          window) requires a production `next build`/`next start` round
 *          trip, which AC-6.2's own test explicitly avoided for the same
 *          reason. Concern (3) above is what isolates the hook's specific
 *          behavior instead.
 * created-by: dev-team
 * related-story: US-6
 * related-ac: 6.3
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import fs from 'fs'
import path from 'path'

import { getGalleryBearingPaths, ISR_DEMO_GALLERY_PATH, ISR_DEMO_GALLERY_TITLE } from '@/lib/galleryRevalidation'
import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const GALLERIES_COLLECTION_PATH = 'src/collections/Galleries.ts'
const LIVE_TEST_PORT = 4283

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

describe('AC-6.3: getGalleryBearingPaths maps a gallery title to the route(s) it renders', () => {
  it('maps the ISR demo gallery title to the ISR demo route', () => {
    expect(getGalleryBearingPaths(ISR_DEMO_GALLERY_TITLE)).toEqual([ISR_DEMO_GALLERY_PATH])
  })

  it('returns no paths for a gallery that backs no in-scope route', () => {
    expect(getGalleryBearingPaths('Some other gallery')).toEqual([])
  })

  it('returns no paths for a null or undefined title', () => {
    expect(getGalleryBearingPaths(null)).toEqual([])
    expect(getGalleryBearingPaths(undefined)).toEqual([])
  })
})

describe('AC-6.3: the Galleries collection source wires an on-demand revalidation hook', () => {
  const src = read(GALLERIES_COLLECTION_PATH)

  it('dynamically imports revalidatePath from next/cache (deferred so merely importing this collection never loads it)', () => {
    expect(src).toMatch(/await import\(['"]next\/cache['"]\)/)
    expect(src).toMatch(/const\s*\{\s*revalidatePath\s*\}\s*=\s*await import/)
  })

  it('imports the title-to-path map from the shared, payload-import-free module', () => {
    expect(src).toMatch(/import\s*\{\s*getGalleryBearingPaths\s*\}\s*from\s*['"]@\/lib\/galleryRevalidation['"]/)
  })

  it('declares an afterChange hook', () => {
    expect(src).toMatch(/hooks:\s*\{[^]*afterChange:\s*\[/)
  })

  it('resolves affected paths from the changed doc\'s title and revalidates each one', () => {
    expect(src).toMatch(/getGalleryBearingPaths\(doc\?\.title\)/)
    expect(src).toMatch(/revalidatePath\(routePath\)/)
  })
})

describe('AC-6.3: invoking the afterChange hook triggers targeted, on-demand revalidation', () => {
  afterEach(() => {
    jest.dontMock('next/cache')
    jest.resetModules()
  })

  it('calls revalidatePath with the ISR demo route when the changed gallery is the ISR demo gallery, and not at all for an unrelated gallery', async () => {
    jest.resetModules()
    jest.doMock('next/cache', () => ({ revalidatePath: jest.fn() }))

    const { revalidatePath: revalidatePathMock } = (await import('next/cache')) as unknown as {
      revalidatePath: jest.Mock
    }
    const { Galleries } = await import('@/collections/Galleries')
    const hook = Galleries.hooks?.afterChange?.[0]
    expect(hook).toBeDefined()

    await hook!({ doc: { title: ISR_DEMO_GALLERY_TITLE } } as never)
    expect(revalidatePathMock).toHaveBeenCalledTimes(1)
    expect(revalidatePathMock).toHaveBeenCalledWith(ISR_DEMO_GALLERY_PATH)

    revalidatePathMock.mockClear()
    await hook!({ doc: { title: 'An unrelated gallery' } } as never)
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })
})

/**
 * `payload` is an ESM-only package that assumes it is loaded through Next's
 * own build pipeline (see us1-ac1.2-postgres-migration.test.ts) — importing
 * it directly from Jest breaks on that interop boundary. The only faithful
 * way to prove the hook fires inside Payload's real update lifecycle,
 * without throwing Next's request-scope invariant, is to boot the real
 * `next dev` entrypoint and round-trip real requests against it.
 */
describe('AC-6.3: updating the demo gallery through the real API round-trips through the hook without error, and the ISR route reflects it', () => {
  it(
    'creating/updating the ISR demo gallery succeeds, and the demo route renders the updated settings',
    async () => {
      try {
        await dns.lookup('db')
      } catch {
        // Not running inside the project's Docker network — the static and
        // mocked-hook assertions above already prove the wiring is correct;
        // skip the live network round trip.
        return
      }

      const child = spawn(
        path.join(root, 'node_modules/.bin/next'),
        ['dev', '-p', String(LIVE_TEST_PORT)],
        {
          cwd: root,
          env: process.env,
        },
      )

      const base = `http://localhost:${LIVE_TEST_PORT}`

      try {
        await waitForServer(`${base}/api/users`, 60000)

        const token = await getLiveApiAuthToken(base)
        const authHeaders = {
          'Content-Type': 'application/json',
          Authorization: `JWT ${token}`,
        }

        const findRes = await fetch(
          `${base}/api/galleries?where[title][equals]=${encodeURIComponent(ISR_DEMO_GALLERY_TITLE)}`,
          { headers: authHeaders },
        )
        expect(findRes.status).toBe(200)
        const found = await findRes.json()

        let galleryId: number | string
        if (found.docs.length > 0) {
          galleryId = found.docs[0].id
        } else {
          const createRes = await fetch(`${base}/api/galleries`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              title: ISR_DEMO_GALLERY_TITLE,
              images: [],
              settings: { download: false },
            }),
          })
          expect(createRes.status).toBeLessThan(300)
          const created = await createRes.json()
          galleryId = (created.doc ?? created).id
        }

        const currentSettings = found.docs[0]?.settings ?? {
          slideshow: false,
          hoverPreview: true,
          fullscreen: true,
          download: false,
          requireAuth: false,
        }

        try {
          // The update itself: flip `settings.download`, the toggle the ISR
          // demo route renders as a `data-download` attribute on the Gallery
          // Engine's root element (src/components/gallery/GalleryEngine.tsx),
          // so the update is directly observable in the route's rendered
          // output.
          const updateRes = await fetch(`${base}/api/galleries/${galleryId}`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ settings: { ...currentSettings, download: true } }),
          })
          // A non-2xx here would mean the afterChange hook threw — e.g. Next's
          // "Invariant: static generation store missing in revalidatePath"
          // error, which fires when revalidatePath is called outside a valid
          // request scope. A successful update proves the hook runs cleanly
          // inside the real Route Handler request that processes it.
          expect(updateRes.status).toBeLessThan(300)

          const pageRes = await fetch(`${base}${ISR_DEMO_GALLERY_PATH}`)
          expect(pageRes.status).toBe(200)
          const html = await pageRes.text()
          expect(html).toContain('data-download="true"')
        } finally {
          await fetch(`${base}/api/galleries/${galleryId}`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ settings: currentSettings }),
          }).catch(() => undefined)
        }
      } finally {
        await killServer(child)
      }
    },
    120000,
  )
})
