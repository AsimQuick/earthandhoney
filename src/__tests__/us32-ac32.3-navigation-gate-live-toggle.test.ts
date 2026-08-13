/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us32-ac32.3-navigation-gate-live-toggle.test.ts
 * project: earthandhoney
 * purpose: Verify AC-32.3 — a page that is draft, or has include-in-menu off,
 *          never appears in the navigation, and changing either field changes
 *          the rendered menu without a code change. Boots the real `next dev`
 *          entrypoint against the live "db" Postgres service (the same
 *          live-round-trip technique as us32-ac32.2/us31-ac31.4), creates two
 *          real `Pages` documents over the REST API — one draft (with
 *          includeInMenu on), one published with includeInMenu off — wires
 *          both into the `Navigation` global's ordered `items` array, proves
 *          neither's label renders in the primary nav of a live HTTP
 *          response (the "before"), then flips each page's single gating
 *          field via a live PATCH (draft -> published; includeInMenu false ->
 *          true) and re-fetches the same route to prove both labels now
 *          render in the nav (the "after") — with no redeploy or code change
 *          between the two fetches. The Navigation global is a shared
 *          singleton, so the test reads and restores its original `items` in
 *          a `finally` block rather than leaving the fixture wired in.
 * created-by: dev-team
 * related-story: US-32
 * related-ac: 32.3
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4288

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

function navLabels(html: string): string[] {
  const navMatch = html.match(/data-testid="primary-nav"[\s\S]*?<\/nav>/)
  expect(navMatch).not.toBeNull()
  return [...navMatch![0].matchAll(/class="line">([^<]+)</g)].map((m) => m[1])
}

describe('AC-32.3: draft / include-in-menu-off pages never appear in the nav, and flipping either field changes the menu live', () => {
  it(
    'a draft page and an excluded page are both absent from the rendered nav, then both appear after their gating field is changed — no code change, no redeploy',
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
        const draftLabel = `AC32.3 Draft Toggle ${unique}`
        const hiddenLabel = `AC32.3 Hidden Toggle ${unique}`
        const draftSlug = `ac32-3-draft-toggle-${unique}`
        const hiddenSlug = `ac32-3-hidden-toggle-${unique}`

        // Case 1: draft, but opted into the menu — the status gate alone
        // must keep it out.
        const draftRes = await fetch(`${base}/api/pages`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            internalName: `AC-32.3 draft-toggle fixture ${unique}`,
            navigationLabel: draftLabel,
            heading: `AC-32.3 Draft Toggle Heading ${unique}`,
            slug: draftSlug,
            status: 'draft',
            indexing: 'index',
            includeInMenu: true,
          }),
        })
        expect(draftRes.status).toBeLessThan(300)
        const draftBody = await draftRes.json()
        const draftId = (draftBody.doc ?? draftBody).id as string
        createdIds.push(draftId)

        // Case 2: published, but excluded from the menu — the
        // includeInMenu gate alone must keep it out.
        const hiddenRes = await fetch(`${base}/api/pages`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            internalName: `AC-32.3 hidden-toggle fixture ${unique}`,
            navigationLabel: hiddenLabel,
            heading: `AC-32.3 Hidden Toggle Heading ${unique}`,
            slug: hiddenSlug,
            status: 'published',
            indexing: 'index',
            includeInMenu: false,
          }),
        })
        expect(hiddenRes.status).toBeLessThan(300)
        const hiddenBody = await hiddenRes.json()
        const hiddenId = (hiddenBody.doc ?? hiddenBody).id as string
        createdIds.push(hiddenId)

        // Wire both fixture pages into the Navigation global's ordered
        // `items` array, replacing whatever the global held before, for the
        // duration of this test.
        const navUpdateRes = await fetch(`${base}/api/globals/navigation`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ items: [{ page: draftId }, { page: hiddenId }] }),
        })
        expect(navUpdateRes.status).toBeLessThan(300)

        // BEFORE: the hidden page is published, so its own route renders
        // (200) and carries the live nav markup — but neither fixture's
        // label appears in it, since one is draft and the other is
        // explicitly excluded.
        const beforeRes = await fetch(`${base}/${hiddenSlug}`)
        expect(beforeRes.status).toBe(200)
        const beforeLabels = navLabels(await beforeRes.text())
        expect(beforeLabels).not.toContain(draftLabel)
        expect(beforeLabels).not.toContain(hiddenLabel)

        // Flip each page's single gating field via a live PATCH — no code
        // change, no redeploy.
        const publishRes = await fetch(`${base}/api/pages/${draftId}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ status: 'published' }),
        })
        expect(publishRes.status).toBeLessThan(300)

        const includeRes = await fetch(`${base}/api/pages/${hiddenId}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ includeInMenu: true }),
        })
        expect(includeRes.status).toBeLessThan(300)

        // AFTER: the same route, re-fetched — both labels now render in the
        // nav, in the order wired into the Navigation global.
        const afterRes = await fetch(`${base}/${hiddenSlug}`)
        expect(afterRes.status).toBe(200)
        const afterLabels = navLabels(await afterRes.text())
        expect(afterLabels).toEqual([draftLabel, hiddenLabel])
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
