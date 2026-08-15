/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us37-ac37.4.1-sitemap-closed-set-live.test.ts
 * project: earthandhoney
 * purpose: Verify AC-37.4.1's evidence bar — a LIVE suite that boots the
 *          real stack, seeds at least two published pages and one published
 *          story, fetches the actual `/sitemap.xml` over HTTP, parses its
 *          `<loc>` values, and asserts set equality in BOTH directions
 *          (nothing missing, nothing extra) against that closed set read
 *          back from the database in the same run. Mirrors
 *          us37-ac37.3-live-structured-data.test.ts's boot technique. The
 *          expected set is computed by querying the live Payload REST API
 *          with the same `status`/`indexing` filters the reader uses, not by
 *          hard-coding the fixture slugs — so pre-existing published rows
 *          left by other suites (this project's LIVE lane runs
 *          `--runInBand`, so exactly one suite's server is up at a time, but
 *          Postgres state persists across suites) don't produce a false
 *          mismatch; the sitemap and the database are compared against each
 *          other in this run, not against a fixed expectation. Draft/noindex
 *          exclusion is AC-37.4.2's own evidence and is not asserted here.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.4.1
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4302

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

function extractLocs(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1])
}

describe('AC-37.4.1: the fetched /sitemap.xml <loc> set matches the closed set read back from the database', () => {
  it(
    'contains every published+index page, every published story, and the two fixed routes — nothing missing, nothing extra',
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
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
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

        // At least two published, indexable pages...
        const pageSlugA = `ac37-4-1-page-a-${unique}`
        const pageSlugB = `ac37-4-1-page-b-${unique}`
        await createPage({
          internalName: `AC-37.4.1 page A ${unique}`,
          heading: `AC-37.4.1 Heading A ${unique}`,
          slug: pageSlugA,
          status: 'published',
          indexing: 'index',
        })
        await createPage({
          internalName: `AC-37.4.1 page B ${unique}`,
          heading: `AC-37.4.1 Heading B ${unique}`,
          slug: pageSlugB,
          status: 'published',
          indexing: 'index',
        })

        // ...and at least one published story.
        const placementId = await createPlacement(`ac37-4-1-gallery-${unique}`)
        const storySlug = `ac37-4-1-story-${unique}`
        await createStory({
          title: `AC-37.4.1 Story ${unique}`,
          slug: storySlug,
          status: 'published',
          sections: [
            {
              sectionHeading: 'A section',
              shortText: 'Short text for the AC-37.4.1 fixture.',
              galleryPlacement: placementId,
            },
          ],
        })

        // Fetch the real sitemap and parse its <loc> values.
        const sitemapRes = await fetch(`${base}/sitemap.xml`)
        expect(sitemapRes.status).toBe(200)
        const xml = await sitemapRes.text()
        const actualLocs = new Set(extractLocs(xml))

        // Read the closed set back from the database in this same run,
        // using the reader's own filters — never a hard-coded expectation.
        const pagesRes = await fetch(
          `${base}/api/pages?where[status][equals]=published&where[indexing][equals]=index&limit=1000&depth=0`,
          { headers: authHeaders },
        )
        expect(pagesRes.status).toBe(200)
        const pagesBody = (await pagesRes.json()) as { docs: Array<{ slug?: string }> }

        const storiesRes = await fetch(`${base}/api/stories?where[status][equals]=published&limit=1000&depth=0`, {
          headers: authHeaders,
        })
        expect(storiesRes.status).toBe(200)
        const storiesBody = (await storiesRes.json()) as { docs: Array<{ slug?: string }> }

        const expectedPaths = [
          '/',
          '/stories',
          ...pagesBody.docs.filter((doc) => doc.slug).map((doc) => `/${doc.slug}`),
          ...storiesBody.docs.filter((doc) => doc.slug).map((doc) => `/stories/${doc.slug}`),
        ]
        const expectedLocs = new Set(expectedPaths.map((p) => new URL(p, siteUrl).toString()))

        // Sanity check: this run's own fixtures are actually part of the
        // expected set, so the equality assertion below isn't vacuously true
        // (e.g. both sides accidentally empty).
        expect(expectedLocs.has(`${siteUrl}/${pageSlugA}`)).toBe(true)
        expect(expectedLocs.has(`${siteUrl}/${pageSlugB}`)).toBe(true)
        expect(expectedLocs.has(`${siteUrl}/stories/${storySlug}`)).toBe(true)

        // Set equality in BOTH directions — nothing missing, nothing extra.
        expect(actualLocs).toEqual(expectedLocs)
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
