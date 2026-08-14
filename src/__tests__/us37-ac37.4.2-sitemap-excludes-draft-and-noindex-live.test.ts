/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us37-ac37.4.2-sitemap-excludes-draft-and-noindex-live.test.ts
 * project: earthandhoney
 * purpose: Verify AC-37.4.2's evidence bar — a LIVE suite that, in one run,
 *          seeds a `pages` row with `status: 'draft'`, a `pages` row with
 *          `status: 'published'` and `indexing: 'noindex'`, a `stories` row
 *          with `status: 'draft'`, and one published+indexable control page,
 *          fetches the real `/sitemap.xml` over HTTP, and proves each of the
 *          three excluded records absent by its own slug while the control
 *          page's slug is present. The control page is what makes absence
 *          proof of filtering rather than proof of a broken or empty
 *          sitemap. This suite does not re-assert AC-37.4.1's closed-set
 *          equality (us37-ac37.4.1-sitemap-closed-set-live.test.ts already
 *          owns that); it targets only the exclusion behaviour. Mirrors that
 *          suite's boot technique (spawn real `next dev` against the live
 *          `db` Postgres service). The filtering itself already happens
 *          inside `getSitemapEntries`'s own Payload `where` clauses
 *          (src/lib/getSitemapEntries.ts — `pages` queried on
 *          `status: 'published'` AND `indexing: 'index'`, `stories` queried
 *          on `status: 'published'` only) rather than by post-filtering an
 *          already-complete list — this suite proves that query-level
 *          filtering behaves correctly against a real database, it does not
 *          change it. `Stories` carries no `indexing` field
 *          (src/collections/Stories.ts) and none is added here — story-level
 *          index/noindex is AC-37.6's admin surface.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.4.2
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4303

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

describe('AC-37.4.2: /sitemap.xml excludes draft pages, noindex pages, and draft stories', () => {
  it(
    'omits a draft page, a published+noindex page, and a draft story by slug, while a control page is present',
    async () => {
      try {
        await dns.lookup('db')
      } catch {
        // Not running inside the project's Docker network — skip the live round trip.
        return
      }

      const child = spawn(path.join(root, 'node_modules/.bin/next'), ['dev', '-p', String(LIVE_TEST_PORT)], {
        cwd: root,
        env: process.env,
      })

      const base = `http://localhost:${LIVE_TEST_PORT}`
      const createdPageIds: string[] = []
      const createdStoryIds: string[] = []
      const createdPlacementIds: string[] = []
      let authHeaders: { Authorization: string; 'Content-Type': string } | undefined

      try {
        await waitForServer(`${base}/api/users`, 60000)

        const token = await getLiveApiAuthToken(base)
        authHeaders = { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' }

        const unique = Date.now()

        async function createPlacement(gallerySlug: string): Promise<string> {
          const res = await fetch(`${base}/api/gallery-placements`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ gallerySlug, layout: 'masonry' }),
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

        async function createStory(fields: Record<string, unknown>): Promise<string> {
          const res = await fetch(`${base}/api/stories`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(fields),
          })
          expect(res.status).toBeLessThan(300)
          const body = await res.json()
          const id = (body.doc ?? body).id as string
          createdStoryIds.push(id)
          return id
        }

        // The control: published + indexable — proves the sitemap is alive
        // and that absence of the other three is filtering, not breakage.
        const controlSlug = `ac37-4-2-control-page-${unique}`
        await createPage({
          internalName: `AC-37.4.2 control page ${unique}`,
          heading: `AC-37.4.2 Control Heading ${unique}`,
          slug: controlSlug,
          status: 'published',
          indexing: 'index',
        })

        // Excluded record 1: a `pages` row with status: 'draft'.
        const draftPageSlug = `ac37-4-2-draft-page-${unique}`
        await createPage({
          internalName: `AC-37.4.2 draft page ${unique}`,
          heading: `AC-37.4.2 Draft Heading ${unique}`,
          slug: draftPageSlug,
          status: 'draft',
          indexing: 'index',
        })

        // Excluded record 2: a `pages` row with status: 'published' and
        // indexing: 'noindex'.
        const noindexPageSlug = `ac37-4-2-noindex-page-${unique}`
        await createPage({
          internalName: `AC-37.4.2 noindex page ${unique}`,
          heading: `AC-37.4.2 Noindex Heading ${unique}`,
          slug: noindexPageSlug,
          status: 'published',
          indexing: 'noindex',
        })

        // Excluded record 3: a `stories` row with status: 'draft'.
        const placementId = await createPlacement(`ac37-4-2-gallery-${unique}`)
        const draftStorySlug = `ac37-4-2-draft-story-${unique}`
        await createStory({
          title: `AC-37.4.2 Draft Story ${unique}`,
          slug: draftStorySlug,
          status: 'draft',
          sections: [
            {
              sectionHeading: 'A section',
              shortText: 'Short text for the AC-37.4.2 draft-story fixture.',
              galleryPlacement: placementId,
            },
          ],
        })

        // Fetch the real sitemap and parse its <loc> values.
        const sitemapRes = await fetch(`${base}/sitemap.xml`)
        expect(sitemapRes.status).toBe(200)
        const xml = await sitemapRes.text()

        expect(xml).toContain(`/${controlSlug}`)
        expect(xml).not.toContain(`/${draftPageSlug}`)
        expect(xml).not.toContain(`/${noindexPageSlug}`)
        expect(xml).not.toContain(`/stories/${draftStorySlug}`)
      } finally {
        for (const id of createdPageIds) {
          await fetch(`${base}/api/pages/${id}`, { method: 'DELETE', headers: authHeaders }).catch(() => undefined)
        }
        for (const id of createdStoryIds) {
          await fetch(`${base}/api/stories/${id}`, { method: 'DELETE', headers: authHeaders }).catch(() => undefined)
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
