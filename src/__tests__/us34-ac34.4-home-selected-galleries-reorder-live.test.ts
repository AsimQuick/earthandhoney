/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us34-ac34.4-home-selected-galleries-reorder-live.test.ts
 * project: earthandhoney
 * purpose: Verify AC-34.4's live-reorder evidence — the homepage's
 *          "selected galleries or stories" region renders in exactly the
 *          order the photographer set on
 *          StudioProfile.homeSelectedGalleriesOrStories, and reordering
 *          that field alone changes the rendered order with no code change.
 *          Boots the real `next dev` entrypoint against the live "db"
 *          Postgres service (the same live-round-trip technique as
 *          us32-ac32.3-navigation-gate-live-toggle.test.ts), creates two
 *          real published `Pages` documents over the REST API, wires both
 *          into StudioProfile's polymorphic `homeSelectedGalleriesOrStories`
 *          array as `{ relationTo: 'pages', value: id }` entries in order
 *          [A, B], fetches the homepage and asserts the rendered story-card
 *          heading order is [A, B], then PATCHes the same field to [B, A] —
 *          the identical two ids, only the array order changed — and
 *          re-fetches the same route, asserting the rendered order flipped
 *          to [B, A]. No server restart, no redeploy, no code change occurs
 *          between the two fetches. StudioProfile is a shared singleton, so
 *          the test snapshots and restores its original
 *          `homeSelectedGalleriesOrStories` in a `finally` block, mirroring
 *          us34-ac34.3-hero-gallery-live.test.ts's own restore pattern.
 * created-by: dev-team
 * related-story: US-34
 * related-ac: 34.4
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4297

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

function selectedStoryHeadings(html: string): string[] {
  const sectionMatch = html.match(/data-testid="home-selected-galleries"[\s\S]*?<\/section>/)
  expect(sectionMatch).not.toBeNull()
  return [...sectionMatch![0].matchAll(/<h3>([^<]+)<\/h3>/g)].map((m) => m[1])
}

describe('AC-34.4: the homepage selected-galleries-or-stories order follows the curated field, and a reorder changes it live with no code change', () => {
  it(
    'renders the photographer-set order, then renders the flipped order after a live PATCH reorders the same two entries',
    async () => {
      try {
        await dns.lookup('db')
      } catch {
        // Not running inside the project's Docker network — skip the live
        // round trip (mirrors us32-ac32.3-navigation-gate-live-toggle.test.ts).
        return
      }

      const child = spawn(
        path.join(root, 'node_modules/.bin/next'),
        ['dev', '-p', String(LIVE_TEST_PORT)],
        { cwd: root, env: process.env },
      )

      const base = `http://localhost:${LIVE_TEST_PORT}`
      const createdIds: string[] = []
      let authHeaders: { Authorization: string; 'Content-Type': string } | undefined
      let originalSelection: unknown = null

      try {
        await waitForServer(`${base}/api/users`, 60000)

        const token = await getLiveApiAuthToken(base)
        authHeaders = { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' }

        // Snapshot the real StudioProfile global as it stood before this
        // test, so the shared singleton can be restored afterwards.
        const originalProfileRes = await fetch(`${base}/api/globals/studio-profile`, { headers: authHeaders })
        expect(originalProfileRes.status).toBeLessThan(300)
        originalSelection =
          ((await originalProfileRes.json()) as { homeSelectedGalleriesOrStories?: unknown })
            .homeSelectedGalleriesOrStories ?? []

        const unique = Date.now()
        const headingA = `AC34.4 Reorder Story A ${unique}`
        const headingB = `AC34.4 Reorder Story B ${unique}`

        const pageARes = await fetch(`${base}/api/pages`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            internalName: `AC-34.4 reorder fixture A ${unique}`,
            heading: headingA,
            slug: `ac34-4-reorder-a-${unique}`,
            status: 'published',
            indexing: 'noindex',
          }),
        })
        expect(pageARes.status).toBeLessThan(300)
        const pageABody = await pageARes.json()
        const pageAId = (pageABody.doc ?? pageABody).id as string
        createdIds.push(pageAId)

        const pageBRes = await fetch(`${base}/api/pages`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            internalName: `AC-34.4 reorder fixture B ${unique}`,
            heading: headingB,
            slug: `ac34-4-reorder-b-${unique}`,
            status: 'published',
            indexing: 'noindex',
          }),
        })
        expect(pageBRes.status).toBeLessThan(300)
        const pageBBody = await pageBRes.json()
        const pageBId = (pageBBody.doc ?? pageBBody).id as string
        createdIds.push(pageBId)

        // BEFORE: the curated order is [A, B].
        const forwardUpdateRes = await fetch(`${base}/api/globals/studio-profile`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            homeSelectedGalleriesOrStories: [
              { relationTo: 'pages', value: pageAId },
              { relationTo: 'pages', value: pageBId },
            ],
          }),
        })
        expect(forwardUpdateRes.status).toBeLessThan(300)

        const forwardRes = await fetch(`${base}/`)
        expect(forwardRes.status).toBe(200)
        const forwardHeadings = selectedStoryHeadings(await forwardRes.text())
        expect(forwardHeadings).toEqual([headingA, headingB])

        // AFTER: the identical two entries, reordered to [B, A] — a field
        // PATCH only, no server restart, no code change.
        const reorderRes = await fetch(`${base}/api/globals/studio-profile`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            homeSelectedGalleriesOrStories: [
              { relationTo: 'pages', value: pageBId },
              { relationTo: 'pages', value: pageAId },
            ],
          }),
        })
        expect(reorderRes.status).toBeLessThan(300)

        const reorderedRes = await fetch(`${base}/`)
        expect(reorderedRes.status).toBe(200)
        const reorderedHeadings = selectedStoryHeadings(await reorderedRes.text())
        expect(reorderedHeadings).toEqual([headingB, headingA])
      } finally {
        if (authHeaders) {
          await fetch(`${base}/api/globals/studio-profile`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ homeSelectedGalleriesOrStories: originalSelection ?? [] }),
          }).catch(() => undefined)
        }
        for (const id of createdIds) {
          await fetch(`${base}/api/pages/${id}`, { method: 'DELETE', headers: authHeaders }).catch(() => undefined)
        }
        await killServer(child)
      }
    },
    120000,
  )
})
