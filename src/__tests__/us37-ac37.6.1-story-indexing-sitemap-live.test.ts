/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us37-ac37.6.1-story-indexing-sitemap-live.test.ts
 * project: earthandhoney
 * purpose: Verify AC-37.6.1's second evidence requirement — adding
 *          `indexing` to `src/collections/Stories.ts` actually discharges
 *          the condition AC-37.4.2 left standing in writing: a LIVE suite,
 *          reusing us37-ac37.4.2-sitemap-excludes-draft-and-noindex-live.test.ts's
 *          own technique (spawn a real `next dev` against the live `db`
 *          Postgres service), that in one run seeds a published `stories`
 *          row with `indexing: 'noindex'` plus a published+`indexing:
 *          'index'` control story, fetches the real `/sitemap.xml` over
 *          HTTP, and proves the noindex story absent from it by its own
 *          slug while the control story's slug is present. The control is
 *          what makes absence proof of filtering rather than proof of a
 *          broken or empty sitemap — the same reasoning AC-37.4.2's suite
 *          documents. The filtering itself happens inside
 *          `getSitemapEntries`'s own Payload `where` clause
 *          (src/lib/getSitemapEntries.ts — `stories` now queried on
 *          `status: 'published'` AND `indexing: 'index'`, the identical
 *          condition the `pages` query already used), never a post-filter;
 *          this suite proves that query-level filtering behaves correctly
 *          against a real database, it does not change it.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.1
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4307

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

describe('AC-37.6.1: /sitemap.xml excludes a published+noindex story, while a published+index control story is present', () => {
  it(
    'omits the noindex story by slug while the control story slug is present',
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

        // The control: published + indexing: 'index' — proves the sitemap
        // is alive and that the noindex story's absence is filtering, not
        // breakage.
        const controlPlacementId = await createPlacement(`ac37-6-1-control-gallery-${unique}`)
        const controlSlug = `ac37-6-1-control-story-${unique}`
        await createStory({
          title: `AC-37.6.1 Control Story ${unique}`,
          slug: controlSlug,
          status: 'published',
          indexing: 'index',
          sections: [
            {
              sectionHeading: 'A section',
              shortText: 'Short text for the AC-37.6.1 control-story fixture.',
              galleryPlacement: controlPlacementId,
            },
          ],
        })

        // Excluded: a `stories` row with status: 'published' and
        // indexing: 'noindex'.
        const noindexPlacementId = await createPlacement(`ac37-6-1-noindex-gallery-${unique}`)
        const noindexStorySlug = `ac37-6-1-noindex-story-${unique}`
        await createStory({
          title: `AC-37.6.1 Noindex Story ${unique}`,
          slug: noindexStorySlug,
          status: 'published',
          indexing: 'noindex',
          sections: [
            {
              sectionHeading: 'A section',
              shortText: 'Short text for the AC-37.6.1 noindex-story fixture.',
              galleryPlacement: noindexPlacementId,
            },
          ],
        })

        // Fetch the real sitemap and check its <loc> values.
        const sitemapRes = await fetch(`${base}/sitemap.xml`)
        expect(sitemapRes.status).toBe(200)
        const xml = await sitemapRes.text()

        expect(xml).toContain(`/stories/${controlSlug}`)
        expect(xml).not.toContain(`/stories/${noindexStorySlug}`)
      } finally {
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
