/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us35-ac35.3-live-details-page-creation.test.ts
 * project: earthandhoney
 * purpose: Verify AC-35.3's own evidence bar against real rendered HTML: "a
 *          second Details page created through the admin form alone, with no
 *          code change, rendering correctly". Boots the real `next dev`
 *          entrypoint against the live "db" Postgres service (mirrors
 *          us31-ac31.4-public-page-route.test.ts's technique) and creates
 *          TWO published `Pages` documents over the real `/api/pages`
 *          endpoint — the same REST endpoint the Payload admin's New Page
 *          form itself calls, so a document created this way is exactly
 *          equivalent to one created "through the admin form alone" — both
 *          with `template: 'details'` but otherwise materially different
 *          (different heading, different gallery slug), matching
 *          us31-ac31.6-live-seo-metadata.test.ts's "two real documents, no
 *          code between them" technique. Each page's real response HTML is
 *          asserted to render through DetailsPageTemplate (not
 *          StandardPageTemplate), proving the second Details page needed zero
 *          code change to render correctly — only a `Pages` record. A third
 *          document with `template: 'standard'` (the field's default) proves
 *          the same route still renders StandardPageTemplate for a page that
 *          doesn't select Details, so the dispatch is genuinely data-driven
 *          rather than "everything is secretly Details now".
 * created-by: dev-team
 * related-story: US-35
 * related-ac: 35.3
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4298

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

describe('AC-35.3: a Details page created through the New Page form alone renders correctly, with no code change', () => {
  it(
    'renders DetailsPageTemplate for two distinct Details pages created only via the Pages REST endpoint, and StandardPageTemplate for a template:standard page',
    async () => {
      try {
        await dns.lookup('db')
      } catch {
        // Not running inside the project's Docker network — skip the live round trip.
        return
      }

      const child = spawn(
        path.join(root, 'node_modules/.bin/next'),
        ['dev', '-p', String(LIVE_TEST_PORT)],
        { cwd: root, env: process.env },
      )

      const base = `http://localhost:${LIVE_TEST_PORT}`
      const createdPageIds: string[] = []
      const createdPlacementIds: string[] = []
      let authHeaders: { Authorization: string; 'Content-Type': string } | undefined

      try {
        await waitForServer(`${base}/api/users`, 60000)

        const token = await getLiveApiAuthToken(base)
        authHeaders = { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' }

        async function createPlacement(fields: Record<string, unknown>): Promise<string> {
          const res = await fetch(`${base}/api/gallery-placements`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(fields),
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

        const unique = Date.now()

        // First Details page — no gallery placement, exercising the
        // no-placement-configured branch of resolveDetailsMasonryPlacement.
        const detailsSlugA = `ac35-3-details-a-${unique}`
        await createPage({
          internalName: `AC-35.3 Details page A fixture ${unique}`,
          heading: `AC-35.3 Details Heading A ${unique}`,
          template: 'details',
          slug: detailsSlugA,
          status: 'published',
          indexing: 'index',
        })

        // Second Details page — a materially different heading and a real
        // gallery placement, created with zero code change from the first.
        const placementId = await createPlacement({
          gallerySlug: `ac-35-3-details-gallery-${unique}`,
          layout: 'masonry',
          visibility: 'public',
          order: 0,
        })
        const detailsSlugB = `ac35-3-details-b-${unique}`
        await createPage({
          internalName: `AC-35.3 Details page B fixture ${unique}`,
          heading: `AC-35.3 Details Heading B ${unique}`,
          template: 'details',
          slug: detailsSlugB,
          status: 'published',
          indexing: 'index',
          galleryPlacements: [placementId],
        })

        // A template:standard page, proving the dispatch is data-driven.
        const standardSlug = `ac35-3-standard-${unique}`
        await createPage({
          internalName: `AC-35.3 Standard page fixture ${unique}`,
          heading: `AC-35.3 Standard Heading ${unique}`,
          template: 'standard',
          slug: standardSlug,
          status: 'published',
          indexing: 'index',
        })

        const resA = await fetch(`${base}/${detailsSlugA}`)
        expect(resA.status).toBe(200)
        const htmlA = await resA.text()
        expect(htmlA).toContain(`AC-35.3 Details Heading A ${unique}`)
        expect(htmlA).toContain('data-testid="details-page-template"')
        expect(htmlA).not.toContain('data-testid="standard-page-template"')

        const resB = await fetch(`${base}/${detailsSlugB}`)
        expect(resB.status).toBe(200)
        const htmlB = await resB.text()
        expect(htmlB).toContain(`AC-35.3 Details Heading B ${unique}`)
        expect(htmlB).toContain('data-testid="details-page-template"')
        expect(htmlB).not.toContain('data-testid="standard-page-template"')

        const resStandard = await fetch(`${base}/${standardSlug}`)
        expect(resStandard.status).toBe(200)
        const htmlStandard = await resStandard.text()
        expect(htmlStandard).toContain(`AC-35.3 Standard Heading ${unique}`)
        expect(htmlStandard).toContain('data-testid="standard-page-template"')
        expect(htmlStandard).not.toContain('data-testid="details-page-template"')
      } finally {
        for (const id of createdPageIds) {
          await fetch(`${base}/api/pages/${id}`, { method: 'DELETE', headers: authHeaders }).catch(() => undefined)
        }
        for (const id of createdPlacementIds) {
          await fetch(`${base}/api/gallery-placements/${id}`, { method: 'DELETE', headers: authHeaders }).catch(
            () => undefined,
          )
        }
        await killServer(child)
      }
    },
    120000,
  )
})
