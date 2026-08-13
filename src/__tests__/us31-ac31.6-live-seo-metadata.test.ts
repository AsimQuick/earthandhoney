/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us31-ac31.6-live-seo-metadata.test.ts
 * project: earthandhoney
 * purpose: Verify AC-31.6 against real rendered HTML, not a metadata object
 *          in code (the same evidentiary bar US-37 AC-37.2 states explicitly
 *          and this repo's other route-metadata ACs already follow): boots
 *          the real `next dev` entrypoint against the live "db" Postgres
 *          service (mirrors us31-ac31.4-public-page-route.test.ts's
 *          technique), creates two published `Pages` documents with
 *          different slugs/headings/seoTitle/metaDescription, and fetches
 *          each one's actual response HTML to assert: (1) a
 *          `<link rel="canonical">` tag is present and its `href` differs
 *          between the two pages, matching each page's own slug; (2)
 *          `<meta property="og:title">`, `og:description` and `og:url` tags
 *          are present, differ between the two pages, and match each page's
 *          own fields; (3) each page's markup carries exactly one `<h1>` and
 *          no heading level is skipped anywhere in the document (the PRD
 *          §13.3/§21 "correct heading hierarchy" clause). Structured data,
 *          sitemap entries and image-sitemap references are explicitly OUT
 *          of scope for this AC — see US-37, which owns them.
 * created-by: dev-team
 * related-story: US-31
 * related-ac: 31.6
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4284

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

/** Every `<h1>`-`<h6>` opening-tag level, in document order. */
function headingLevels(html: string): number[] {
  return Array.from(html.matchAll(/<h([1-6])[ >]/g)).map((match) => Number(match[1]))
}

/** True when no heading level jumps more than one deeper than the deepest level seen so far. */
function hasNoSkippedHeadingLevel(levels: number[]): boolean {
  let deepestSeen = 0
  for (const level of levels) {
    if (level > deepestSeen + 1) {
      return false
    }
    deepestSeen = Math.max(deepestSeen, level)
  }
  return true
}

function attr(html: string, tagPattern: RegExp, attrName: string): string | null {
  const match = tagPattern.exec(html)
  if (!match) return null
  const attrMatch = new RegExp(`${attrName}="([^"]*)"`).exec(match[0])
  return attrMatch ? attrMatch[1] : null
}

describe('AC-31.6: canonical URL, Open Graph data and heading hierarchy in real rendered HTML', () => {
  it(
    'emits a distinct canonical link and Open Graph tags per page, plus a correct heading hierarchy, across two different pages',
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
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const createdIds: string[] = []
      let authHeaders: { Authorization: string; 'Content-Type': string } | undefined

      try {
        await waitForServer(`${base}/api/users`, 60000)

        const token = await getLiveApiAuthToken(base)
        authHeaders = { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' }

        const unique = Date.now()
        const slugA = `ac31-6-page-a-${unique}`
        const slugB = `ac31-6-page-b-${unique}`

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
          internalName: `AC-31.6 page A fixture ${unique}`,
          heading: `AC-31.6 Heading A ${unique}`,
          seoTitle: `AC-31.6 SEO Title A ${unique}`,
          metaDescription: `AC-31.6 description A ${unique}`,
          slug: slugA,
          status: 'published',
          indexing: 'index',
        })

        await createPage({
          internalName: `AC-31.6 page B fixture ${unique}`,
          heading: `AC-31.6 Heading B ${unique}`,
          seoTitle: `AC-31.6 SEO Title B ${unique}`,
          metaDescription: `AC-31.6 description B ${unique}`,
          slug: slugB,
          status: 'published',
          indexing: 'index',
        })

        const resA = await fetch(`${base}/${slugA}`)
        const htmlA = await resA.text()
        const resB = await fetch(`${base}/${slugB}`)
        const htmlB = await resB.text()

        expect(resA.status).toBe(200)
        expect(resB.status).toBe(200)

        // Canonical URL — a real <link rel="canonical"> tag, absolute, and
        // differing between the two pages by their own slug.
        const canonicalA = attr(htmlA, /<link[^>]*rel="canonical"[^>]*>/, 'href')
        const canonicalB = attr(htmlB, /<link[^>]*rel="canonical"[^>]*>/, 'href')
        expect(canonicalA).toBe(`${siteUrl}/${slugA}`)
        expect(canonicalB).toBe(`${siteUrl}/${slugB}`)
        expect(canonicalA).not.toBe(canonicalB)

        // Open Graph data — real <meta property="og:*"> tags, differing per page.
        const ogTitleA = attr(htmlA, /<meta[^>]*property="og:title"[^>]*>/, 'content')
        const ogTitleB = attr(htmlB, /<meta[^>]*property="og:title"[^>]*>/, 'content')
        expect(ogTitleA).toBe(`AC-31.6 SEO Title A ${unique}`)
        expect(ogTitleB).toBe(`AC-31.6 SEO Title B ${unique}`)

        const ogDescriptionA = attr(htmlA, /<meta[^>]*property="og:description"[^>]*>/, 'content')
        const ogDescriptionB = attr(htmlB, /<meta[^>]*property="og:description"[^>]*>/, 'content')
        expect(ogDescriptionA).toBe(`AC-31.6 description A ${unique}`)
        expect(ogDescriptionB).toBe(`AC-31.6 description B ${unique}`)

        const ogUrlA = attr(htmlA, /<meta[^>]*property="og:url"[^>]*>/, 'content')
        const ogUrlB = attr(htmlB, /<meta[^>]*property="og:url"[^>]*>/, 'content')
        expect(ogUrlA).toBe(`${siteUrl}/${slugA}`)
        expect(ogUrlB).toBe(`${siteUrl}/${slugB}`)
        expect(ogUrlA).not.toBe(ogUrlB)

        // Heading hierarchy — exactly one H1, and no skipped level, on each page.
        for (const html of [htmlA, htmlB]) {
          const levels = headingLevels(html)
          expect(levels.filter((level) => level === 1)).toHaveLength(1)
          expect(hasNoSkippedHeadingLevel(levels)).toBe(true)
        }
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
