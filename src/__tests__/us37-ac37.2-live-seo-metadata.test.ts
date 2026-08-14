/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us37-ac37.2-live-seo-metadata.test.ts
 * project: earthandhoney
 * purpose: Verify AC-37.2 against real rendered HTML fetched from a running
 *          stack, not against a metadata object in code (PRD §35.2, and this
 *          AC's own evidence rule) — mirroring
 *          us31-ac31.6-live-seo-metadata.test.ts's technique but covering the
 *          two things that suite deliberately left out of scope: the Twitter
 *          card tags, and the `stories/[slug]` route (new in this AC; the
 *          index route AC-36.4 shipped had nowhere to link to before this
 *          change). Boots the real `next dev` entrypoint against the live
 *          "db" Postgres service, creates: (1) a published `Pages` document
 *          with its own `seoTitle`/`metaDescription` set, and a second with
 *          both left unset so its rendered HTML must carry the live
 *          `StudioProfile` global's `defaultMetaDescription`/
 *          `defaultTitlePattern` instead; (2) a published `Stories` document
 *          with its own `subtitleIntroduction` set, and a second with it
 *          unset for the same StudioProfile-fallback proof. Fetches each
 *          one's actual response HTML and asserts a real `<title>` element, a
 *          `<meta name="description">` tag, a `<link rel="canonical">` tag,
 *          `<meta property="og:*">` tags, and `<meta name="twitter:*">` tags
 *          are all present with the expected page/story-vs-fallback values.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.2
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4300

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

/** Next.js HTML-escapes text content it renders into `<title>`/attribute values (e.g. `&` → `&amp;`). */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function metaContent(html: string, matcher: RegExp): string | null {
  const match = matcher.exec(html)
  if (!match) return null
  const contentMatch = /content="([^"]*)"/.exec(match[0])
  return contentMatch ? decodeHtmlEntities(contentMatch[1]) : null
}

function linkHref(html: string, rel: string): string | null {
  const match = new RegExp(`<link[^>]*rel="${rel}"[^>]*>`).exec(html)
  if (!match) return null
  const hrefMatch = /href="([^"]*)"/.exec(match[0])
  return hrefMatch ? decodeHtmlEntities(hrefMatch[1]) : null
}

function titleTagText(html: string): string | null {
  const match = /<title>([^<]*)<\/title>/.exec(html)
  return match ? decodeHtmlEntities(match[1]) : null
}

describe('AC-37.2: every public page and story emits a real title, description, canonical URL, Open Graph and Twitter card in rendered HTML', () => {
  it(
    "emits full SEO metadata for a page and a story, with the page/story's own fields taking priority and StudioProfile as fallback",
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
        const profile = (await profileRes.json()) as {
          defaultTitlePattern?: string
          defaultMetaDescription?: string
        }
        const titlePattern = profile.defaultTitlePattern || '%s | Earth & Honey Studios'
        const defaultDescription =
          profile.defaultMetaDescription ||
          'Earth & Honey Studios is a premium, gallery-first photography studio for weddings, portraits, and events — browse our galleries and book your session.'
        const expectedTitle = (own: string) => titlePattern.replace('%s', own)

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

        // Page with its own seoTitle/metaDescription — own fields win.
        const pageOwnSlug = `ac37-2-page-own-${unique}`
        const pageOwnSeoTitle = `AC-37.2 Own SEO Title ${unique}`
        const pageOwnDescription = `AC-37.2 own description ${unique}`
        await createPage({
          internalName: `AC-37.2 page (own fields) ${unique}`,
          heading: `AC-37.2 Heading Own ${unique}`,
          seoTitle: pageOwnSeoTitle,
          metaDescription: pageOwnDescription,
          slug: pageOwnSlug,
          status: 'published',
          indexing: 'index',
        })

        // Page with no seoTitle/metaDescription — falls back to heading and StudioProfile.
        const pageFallbackSlug = `ac37-2-page-fallback-${unique}`
        const pageFallbackHeading = `AC-37.2 Heading Fallback ${unique}`
        await createPage({
          internalName: `AC-37.2 page (fallback) ${unique}`,
          heading: pageFallbackHeading,
          slug: pageFallbackSlug,
          status: 'published',
          indexing: 'index',
        })

        const placementId = await createPlacement(`ac37-2-gallery-${unique}`)
        const storySection = [
          {
            sectionHeading: 'A section',
            shortText: 'Short text for the AC-37.2 fixture.',
            galleryPlacement: placementId,
          },
        ]

        // Story with its own subtitleIntroduction — own field wins.
        const storyOwnSlug = `ac37-2-story-own-${unique}`
        const storyOwnTitle = `AC-37.2 Own Story Title ${unique}`
        const storyOwnIntro = `AC-37.2 own story introduction ${unique}`
        await createStory({
          title: storyOwnTitle,
          subtitleIntroduction: storyOwnIntro,
          slug: storyOwnSlug,
          status: 'published',
          sections: storySection,
        })

        // Story with no subtitleIntroduction — falls back to StudioProfile.defaultMetaDescription.
        const storyFallbackSlug = `ac37-2-story-fallback-${unique}`
        const storyFallbackTitle = `AC-37.2 Fallback Story Title ${unique}`
        await createStory({
          title: storyFallbackTitle,
          slug: storyFallbackSlug,
          status: 'published',
          sections: storySection,
        })

        const [pageOwnRes, pageFallbackRes, storyOwnRes, storyFallbackRes] = await Promise.all([
          fetch(`${base}/${pageOwnSlug}`),
          fetch(`${base}/${pageFallbackSlug}`),
          fetch(`${base}/stories/${storyOwnSlug}`),
          fetch(`${base}/stories/${storyFallbackSlug}`),
        ])

        expect(pageOwnRes.status).toBe(200)
        expect(pageFallbackRes.status).toBe(200)
        expect(storyOwnRes.status).toBe(200)
        expect(storyFallbackRes.status).toBe(200)

        const [pageOwnHtml, pageFallbackHtml, storyOwnHtml, storyFallbackHtml] = await Promise.all([
          pageOwnRes.text(),
          pageFallbackRes.text(),
          storyOwnRes.text(),
          storyFallbackRes.text(),
        ])

        // --- Page with its own fields: a real <title>, description, canonical, OG and Twitter card. ---
        expect(titleTagText(pageOwnHtml)).toBe(expectedTitle(pageOwnSeoTitle))
        expect(metaContent(pageOwnHtml, /<meta[^>]*name="description"[^>]*>/)).toBe(pageOwnDescription)
        expect(linkHref(pageOwnHtml, 'canonical')).toBe(`${siteUrl}/${pageOwnSlug}`)
        expect(metaContent(pageOwnHtml, /<meta[^>]*property="og:title"[^>]*>/)).toBe(pageOwnSeoTitle)
        expect(metaContent(pageOwnHtml, /<meta[^>]*property="og:description"[^>]*>/)).toBe(pageOwnDescription)
        expect(metaContent(pageOwnHtml, /<meta[^>]*property="og:url"[^>]*>/)).toBe(`${siteUrl}/${pageOwnSlug}`)
        expect(metaContent(pageOwnHtml, /<meta[^>]*name="twitter:card"[^>]*>/)).toBe('summary_large_image')
        expect(metaContent(pageOwnHtml, /<meta[^>]*name="twitter:title"[^>]*>/)).toBe(pageOwnSeoTitle)
        expect(metaContent(pageOwnHtml, /<meta[^>]*name="twitter:description"[^>]*>/)).toBe(pageOwnDescription)

        // --- Page with no own SEO fields: falls back to heading (title) and StudioProfile default (description). ---
        expect(titleTagText(pageFallbackHtml)).toBe(expectedTitle(pageFallbackHeading))
        expect(metaContent(pageFallbackHtml, /<meta[^>]*name="description"[^>]*>/)).toBe(defaultDescription)
        expect(linkHref(pageFallbackHtml, 'canonical')).toBe(`${siteUrl}/${pageFallbackSlug}`)
        expect(metaContent(pageFallbackHtml, /<meta[^>]*property="og:description"[^>]*>/)).toBe(defaultDescription)
        expect(metaContent(pageFallbackHtml, /<meta[^>]*name="twitter:description"[^>]*>/)).toBe(defaultDescription)

        // --- Story with its own subtitleIntroduction: a real <title>, description, canonical, OG and Twitter card. ---
        expect(titleTagText(storyOwnHtml)).toBe(expectedTitle(storyOwnTitle))
        expect(metaContent(storyOwnHtml, /<meta[^>]*name="description"[^>]*>/)).toBe(storyOwnIntro)
        expect(linkHref(storyOwnHtml, 'canonical')).toBe(`${siteUrl}/stories/${storyOwnSlug}`)
        expect(metaContent(storyOwnHtml, /<meta[^>]*property="og:title"[^>]*>/)).toBe(storyOwnTitle)
        expect(metaContent(storyOwnHtml, /<meta[^>]*property="og:description"[^>]*>/)).toBe(storyOwnIntro)
        expect(metaContent(storyOwnHtml, /<meta[^>]*property="og:url"[^>]*>/)).toBe(`${siteUrl}/stories/${storyOwnSlug}`)
        expect(metaContent(storyOwnHtml, /<meta[^>]*name="twitter:card"[^>]*>/)).toBe('summary_large_image')
        expect(metaContent(storyOwnHtml, /<meta[^>]*name="twitter:title"[^>]*>/)).toBe(storyOwnTitle)
        expect(metaContent(storyOwnHtml, /<meta[^>]*name="twitter:description"[^>]*>/)).toBe(storyOwnIntro)

        // --- Story with no subtitleIntroduction: falls back to StudioProfile.defaultMetaDescription. ---
        expect(titleTagText(storyFallbackHtml)).toBe(expectedTitle(storyFallbackTitle))
        expect(metaContent(storyFallbackHtml, /<meta[^>]*name="description"[^>]*>/)).toBe(defaultDescription)
        expect(linkHref(storyFallbackHtml, 'canonical')).toBe(`${siteUrl}/stories/${storyFallbackSlug}`)
        expect(metaContent(storyFallbackHtml, /<meta[^>]*property="og:description"[^>]*>/)).toBe(defaultDescription)
        expect(metaContent(storyFallbackHtml, /<meta[^>]*name="twitter:description"[^>]*>/)).toBe(defaultDescription)

        // The two pages and the two stories are all distinct — not one hard-coded value everywhere.
        expect(titleTagText(pageOwnHtml)).not.toBe(titleTagText(pageFallbackHtml))
        expect(titleTagText(storyOwnHtml)).not.toBe(titleTagText(storyFallbackHtml))
      } finally {
        for (const id of createdPageIds) {
          await fetch(`${base}/api/pages/${id}`, { method: 'DELETE', headers: authHeaders }).catch(() => undefined)
        }
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
    180000,
  )
})
