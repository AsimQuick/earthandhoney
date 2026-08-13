/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us32-ac32.2-first-public-navigation.test.ts
 * project: earthandhoney
 * purpose: Verify AC-32.2 — the first public navigation is exactly PRD §12.1's
 *          Weddings, Engagements, Details, in that controlled order, and each
 *          entry is backed by a real published `Pages` record rather than a
 *          placeholder link. Boots the real `next dev` entrypoint against the
 *          live "db" Postgres service (the same live-round-trip technique as
 *          us31-ac31.4/us31-ac31.6), creates three real published `Pages`
 *          documents over the REST API, wires them into the `Navigation`
 *          global's ordered `items` array via the same API, then proves both
 *          halves of the AC's evidence: the three pages read back from the
 *          database via a filtered list query, and the three labels asserted
 *          in the rendered nav markup of a live HTTP response, in order. The
 *          Navigation global is a shared singleton, so the test reads and
 *          restores its original `items` in a `finally` block rather than
 *          leaving the fixture wired in.
 * created-by: dev-team
 * related-story: US-32
 * related-ac: 32.2
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4286

// PRD §12.1 — the exact labels, in the exact controlled order.
const PRD_12_1_NAV_LABELS = ['Weddings', 'Engagements', 'Details']

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

describe('AC-32.2: the first public navigation is exactly PRD 12.1 — Weddings, Engagements, Details', () => {
  it(
    'is backed by three real published Pages records, readable from the database and rendered in the nav in order',
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
      let originalNavItems: unknown = null

      try {
        await waitForServer(`${base}/api/users`, 60000)

        const token = await getLiveApiAuthToken(base)
        authHeaders = { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' }

        // Snapshot the real Navigation global as it stood before this test,
        // so the shared singleton can be restored afterwards.
        const originalNavRes = await fetch(`${base}/api/globals/navigation`, { headers: authHeaders })
        expect(originalNavRes.status).toBeLessThan(300)
        originalNavItems = ((await originalNavRes.json()) as { items?: unknown }).items ?? []

        const unique = Date.now()
        const fixtures = [
          { label: 'Weddings', photographyType: 'wedding', slug: `ac32-2-weddings-${unique}` },
          { label: 'Engagements', photographyType: 'engagement', slug: `ac32-2-engagements-${unique}` },
          { label: 'Details', photographyType: 'details', slug: `ac32-2-details-${unique}` },
        ]

        const pageIds: string[] = []
        for (const fixture of fixtures) {
          const res = await fetch(`${base}/api/pages`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              internalName: `AC-32.2 ${fixture.label} fixture ${unique}`,
              navigationLabel: fixture.label,
              heading: `AC-32.2 ${fixture.label} Heading ${unique}`,
              photographyType: fixture.photographyType,
              slug: fixture.slug,
              status: 'published',
              indexing: 'index',
              includeInMenu: true,
            }),
          })
          expect(res.status).toBeLessThan(300)
          const body = await res.json()
          const id = (body.doc ?? body).id as string
          createdIds.push(id)
          pageIds.push(id)
        }

        // Wire the three fixture pages into the Navigation global's ordered
        // `items` array, in the PRD §12.1 controlled order — replacing
        // whatever the global held before, for the duration of this test.
        const navUpdateRes = await fetch(`${base}/api/globals/navigation`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ items: pageIds.map((id) => ({ page: id })) }),
        })
        expect(navUpdateRes.status).toBeLessThan(300)

        // Evidence 1: the three pages listed from the database — a filtered
        // list query against the live Postgres `db` container, independent
        // of the earlier create responses.
        const listRes = await fetch(
          `${base}/api/pages?where[slug][in]=${fixtures.map((f) => f.slug).join(',')}&sort=slug`,
          { headers: authHeaders },
        )
        expect(listRes.status).toBeLessThan(300)
        const listBody = (await listRes.json()) as { docs: Array<Record<string, unknown>> }
        expect(listBody.docs).toHaveLength(3)
        const labelsFromDb = fixtures.map(
          (fixture) => listBody.docs.find((doc) => doc.slug === fixture.slug)?.navigationLabel,
        )
        expect(labelsFromDb).toEqual(PRD_12_1_NAV_LABELS)
        for (const doc of listBody.docs) {
          expect(doc.status).toBe('published')
        }

        // Evidence 2: the three labels asserted in the rendered nav, in
        // order, fetched as real HTML from a live HTTP response — not an
        // in-process component render.
        const renderedRes = await fetch(`${base}/${fixtures[0].slug}`)
        expect(renderedRes.status).toBe(200)
        const html = await renderedRes.text()

        const navMatch = html.match(/data-testid="primary-nav"[\s\S]*?<\/nav>/)
        expect(navMatch).not.toBeNull()
        const navHtml = navMatch![0]

        const renderedLabels = [...navHtml.matchAll(/class="line">([^<]+)</g)].map((m) => m[1])
        expect(renderedLabels).toEqual(PRD_12_1_NAV_LABELS)

        const renderedHrefs = [...navHtml.matchAll(/href="([^"]+)"/g)].map((m) => m[1])
        expect(renderedHrefs).toEqual(fixtures.map((f) => `/${f.slug}`))
      } finally {
        if (authHeaders) {
          await fetch(`${base}/api/globals/navigation`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ items: originalNavItems ?? [] }),
          }).catch(() => undefined)
        }
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
