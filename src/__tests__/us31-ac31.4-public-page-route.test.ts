/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us31-ac31.4-public-page-route.test.ts
 * project: earthandhoney
 * purpose: Verify AC-31.4 — the public `[slug]` route renders a published
 *          `Pages` document (200, heading present), a draft document is not
 *          publicly reachable (a real 404 response, not a rendered page
 *          behind a flag), and a `noindex`-marked document's response HTML
 *          itself carries a robots noindex directive. Boots the real
 *          `next dev` entrypoint against the live "db" Postgres service
 *          (mirrors us1-ac1.2/us2-ac2.4's live-round-trip technique, since
 *          `payload` is ESM-only and breaks Jest's interop boundary when
 *          imported directly) and round-trips real HTTP requests — the
 *          evidence this AC calls for is the returned markup of live
 *          responses, not an in-process render of route components.
 * created-by: dev-team
 * related-story: US-31
 * related-ac: 31.4
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4282

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

describe('AC-31.4: public dynamic route renders a Pages document at its slug', () => {
  it(
    'serves a published page (200, heading present), 404s a draft page, and emits a robots noindex directive in the markup of a noindex page',
    async () => {
      try {
        await dns.lookup('db')
      } catch {
        // Not running inside the project's Docker network (e.g. a bare
        // `npm test` on the host) — skip the live network round trip.
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

      try {
        await waitForServer(`${base}/api/users`, 60000)

        const token = await getLiveApiAuthToken(base)
        authHeaders = { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' }

        const unique = Date.now()
        const publishedSlug = `ac31-4-published-${unique}`
        const draftSlug = `ac31-4-draft-${unique}`
        const noindexSlug = `ac31-4-noindex-${unique}`

        async function createPage(fields: Record<string, unknown>): Promise<string> {
          const res = await fetch(`${base}/api/pages`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(fields),
          })
          expect(res.status).toBeLessThan(300)
          const body = await res.json()
          const id = (body.doc ?? body).id as string
          createdIds.push(id)
          return id
        }

        await createPage({
          internalName: `AC-31.4 published fixture ${unique}`,
          heading: `AC-31.4 Published Heading ${unique}`,
          slug: publishedSlug,
          status: 'published',
          indexing: 'index',
        })

        await createPage({
          internalName: `AC-31.4 draft fixture ${unique}`,
          heading: `AC-31.4 Draft Heading ${unique}`,
          slug: draftSlug,
          status: 'draft',
          indexing: 'index',
        })

        await createPage({
          internalName: `AC-31.4 noindex fixture ${unique}`,
          heading: `AC-31.4 Noindex Heading ${unique}`,
          slug: noindexSlug,
          status: 'published',
          indexing: 'noindex',
        })

        // Request 1: published page — 200 with the heading present.
        const publishedRes = await fetch(`${base}/${publishedSlug}`)
        expect(publishedRes.status).toBe(200)
        const publishedHtml = await publishedRes.text()
        expect(publishedHtml).toContain(`AC-31.4 Published Heading ${unique}`)
        expect(publishedHtml).not.toMatch(/name="robots"[^>]*content="[^"]*noindex/)

        // Request 2: draft page — a real 404, not a rendered page behind a flag.
        const draftRes = await fetch(`${base}/${draftSlug}`)
        expect(draftRes.status).toBe(404)
        const draftHtml = await draftRes.text()
        expect(draftHtml).not.toContain(`AC-31.4 Draft Heading ${unique}`)

        // Request 3: noindex page — 200, with the robots noindex directive
        // asserted in the returned markup itself.
        const noindexRes = await fetch(`${base}/${noindexSlug}`)
        expect(noindexRes.status).toBe(200)
        const noindexHtml = await noindexRes.text()
        expect(noindexHtml).toContain(`AC-31.4 Noindex Heading ${unique}`)
        expect(noindexHtml).toMatch(/<meta[^>]*name="robots"[^>]*content="[^"]*noindex[^"]*"/)
      } finally {
        for (const id of createdIds) {
          await fetch(`${base}/api/pages/${id}`, { method: 'DELETE', headers: authHeaders }).catch(
            () => undefined,
          )
        }
        await killServer(child)
      }
    },
    120000,
  )
})
