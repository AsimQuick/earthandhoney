/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us36-ac36.4-story-index-route.test.ts
 * project: earthandhoney
 * purpose: Verify AC-36.4 — the public `/stories` index route lists a
 *          published `Stories` (US-36 AC-36.1) document and excludes a
 *          draft one. Boots the real `next dev` entrypoint against the
 *          live "db" Postgres service and round-trips real HTTP requests,
 *          mirroring us31-ac31.4-public-page-route.test.ts's technique
 *          (`payload` is ESM-only and breaks Jest's interop boundary when
 *          imported directly) — the evidence this AC calls for is the
 *          returned markup of a live response, not an in-process render of
 *          the route component. A real `gallery-placements` document is
 *          created first since `Stories.sections[].galleryPlacement` is a
 *          required relationship (US-36 AC-36.1); its content is irrelevant
 *          to this AC, only its id.
 * created-by: dev-team
 * related-story: US-36
 * related-ac: 36.4
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4299

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

describe('AC-36.4: the public story index route lists published stories and excludes drafts', () => {
  it(
    'lists a published story and does not list a draft one',
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

        const placementId = await createPlacement(`ac36-4-gallery-${unique}`)

        const publishedTitle = `AC-36.4 Published Story ${unique}`
        const draftTitle = `AC-36.4 Draft Story ${unique}`

        const sections = [
          {
            sectionHeading: 'Getting ready',
            shortText: 'A short section for the index-route fixture.',
            galleryPlacement: placementId,
          },
        ]

        await createStory({
          title: publishedTitle,
          slug: `ac36-4-published-${unique}`,
          status: 'published',
          sections,
        })

        await createStory({
          title: draftTitle,
          slug: `ac36-4-draft-${unique}`,
          status: 'draft',
          sections,
        })

        const res = await fetch(`${base}/stories`)
        expect(res.status).toBe(200)
        const html = await res.text()
        expect(html).toContain(publishedTitle)
        expect(html).not.toContain(draftTitle)
      } finally {
        for (const id of createdStoryIds) {
          await fetch(`${base}/api/stories/${id}`, { method: 'DELETE', headers: authHeaders }).catch(
            () => undefined,
          )
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
    120000,
  )
})
