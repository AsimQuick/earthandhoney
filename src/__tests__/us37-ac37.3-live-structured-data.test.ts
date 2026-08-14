/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us37-ac37.3-live-structured-data.test.ts
 * project: earthandhoney
 * purpose: Verify AC-37.3's evidence rule — "the emitted JSON-LD extracted
 *          from the rendered HTML of a page and a story, with its shape
 *          validated" — against real response HTML fetched from a running
 *          stack, mirroring us37-ac37.2-live-seo-metadata.test.ts's
 *          technique. Boots the real `next dev` entrypoint against the live
 *          "db" Postgres service, creates a published `Pages` document with
 *          its `photographyType`/`cityRegion`/`venue` set and a published
 *          `Stories` document with its own `subtitleIntroduction`, fetches
 *          each one's actual response HTML, extracts the
 *          `<script type="application/ld+json">` blocks, JSON-parses them and
 *          validates their shape: the page's block is the
 *          LocalBusiness/ProfessionalService shape
 *          src/lib/studioStructuredData.ts already builds (AC-24.5) extended
 *          with the page's own service/area/venue context, and the story's is
 *          a `CreativeWork` whose `publisher` is byte-for-byte the same
 *          studio block the root layout emits site-wide — the proof that both
 *          reuse the one builder rather than a second implementation, which
 *          a unit test on the builder functions alone cannot show.
 *          The companion unit suite
 *          (us37-ac37.3-structured-data-per-page-type.test.tsx) covers the
 *          builders' branch-by-branch behaviour; this one covers only what
 *          requires a real server.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.3
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4301

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

/**
 * Pulls one JSON-LD `<script>` out of real response HTML by its `data-testid`,
 * without assuming the order the server renders the two attributes in.
 */
function extractJsonLd(html: string, testId: string): Record<string, unknown> | null {
  const scripts = /<script([^>]*)>([\s\S]*?)<\/script>/g
  let match: RegExpExecArray | null
  while ((match = scripts.exec(html)) !== null) {
    const [, attributes, body] = match
    if (!/type="application\/ld\+json"/.test(attributes)) continue
    if (!new RegExp(`data-testid="${testId}"`).test(attributes)) continue
    return JSON.parse(body) as Record<string, unknown>
  }
  return null
}

describe('AC-37.3: structured data is emitted per page type in the rendered HTML of a page and a story', () => {
  it(
    'emits a page JSON-LD block extending the studio LocalBusiness/ProfessionalService builder, and a story CreativeWork published by that same block',
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

        const profileRes = await fetch(`${base}/api/globals/studio-profile`, { headers: authHeaders })
        expect(profileRes.status).toBe(200)
        const profile = (await profileRes.json()) as { businessName?: string }
        const businessName = profile.businessName || 'Earth & Honey Studios'

        const unique = Date.now()

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

        // A page carrying all three of PRD §13.1's schema-relevant fields.
        const pageSlug = `ac37-3-page-${unique}`
        const pageCityRegion = `Alphaville ${unique}`
        const pageVenue = `The Old Barn ${unique}`
        await createPage({
          internalName: `AC-37.3 page ${unique}`,
          heading: `AC-37.3 Heading ${unique}`,
          slug: pageSlug,
          status: 'published',
          indexing: 'index',
          photographyType: 'wedding',
          cityRegion: pageCityRegion,
          venue: pageVenue,
        })

        const placementId = await createPlacement(`ac37-3-gallery-${unique}`)
        const storySlug = `ac37-3-story-${unique}`
        const storyTitle = `AC-37.3 Story Title ${unique}`
        const storyIntro = `AC-37.3 story introduction ${unique}`
        await createStory({
          title: storyTitle,
          subtitleIntroduction: storyIntro,
          slug: storySlug,
          status: 'published',
          sections: [
            {
              sectionHeading: 'A section',
              shortText: 'Short text for the AC-37.3 fixture.',
              galleryPlacement: placementId,
            },
          ],
        })

        const [pageRes, storyRes] = await Promise.all([
          fetch(`${base}/${pageSlug}`),
          fetch(`${base}/stories/${storySlug}`),
        ])
        expect(pageRes.status).toBe(200)
        expect(storyRes.status).toBe(200)

        const [pageHtml, storyHtml] = await Promise.all([pageRes.text(), storyRes.text()])

        // --- The page's own JSON-LD, extracted from the real response HTML. ---
        const pageData = extractJsonLd(pageHtml, 'page-structured-data')
        expect(pageData).not.toBeNull()
        expect(pageData!['@context']).toBe('https://schema.org')
        expect(pageData!['@type']).toEqual(['LocalBusiness', 'ProfessionalService'])
        expect(pageData!.name).toBe(businessName)
        expect(pageData!.url).toBe(`${siteUrl}/${pageSlug}`)
        expect(pageData!.makesOffer).toEqual({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', serviceType: 'Wedding', areaServed: pageCityRegion },
        })
        expect(pageData!.location).toEqual({ '@type': 'Place', name: pageVenue })
        expect(pageData!.areaServed).toContain(pageCityRegion)

        // --- The story's own JSON-LD, extracted from the real response HTML. ---
        const storyData = extractJsonLd(storyHtml, 'story-structured-data')
        expect(storyData).not.toBeNull()
        expect(storyData!['@context']).toBe('https://schema.org')
        expect(storyData!['@type']).toBe('CreativeWork')
        expect(storyData!.headline).toBe(storyTitle)
        expect(storyData!.description).toBe(storyIntro)
        expect(storyData!.url).toBe(`${siteUrl}/stories/${storySlug}`)
        expect(storyData!.publisher).toMatchObject({
          '@context': 'https://schema.org',
          '@type': ['LocalBusiness', 'ProfessionalService'],
          name: businessName,
        })

        // --- One builder, not two implementations: the story's publisher block and
        //     the page's studio fields are the same block the root layout emits. ---
        const layoutStudioData = extractJsonLd(storyHtml, 'studio-structured-data')
        expect(layoutStudioData).not.toBeNull()
        expect(storyData!.publisher).toEqual(layoutStudioData)

        const pageLayoutStudioData = extractJsonLd(pageHtml, 'studio-structured-data')
        expect(pageLayoutStudioData).not.toBeNull()
        for (const field of ['name', 'description', 'telephone', 'email', 'address', 'sameAs'] as const) {
          expect(pageData![field]).toEqual(pageLayoutStudioData![field])
        }

        // PRD §21.2 forbids a meta-keywords surface — it must not reappear as JSON-LD.
        expect(pageData!).not.toHaveProperty('keywords')
        expect(storyData!).not.toHaveProperty('keywords')
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
