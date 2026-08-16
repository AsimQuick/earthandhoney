/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us37-ac37.6-seo-assistant-admin-live.test.ts
 * project: earthandhoney
 * purpose: AC-37.6's evidence bar — each of the fourteen PRD §21.2 SEO
 *          Assistant controls shown present AND functional against a REAL
 *          page (and a real story) in the actual Payload admin, not against
 *          a component fixture. Boots a real `next dev` the same way every
 *          other AC-37 live suite does, seeds a real published Backstage
 *          gallery holding a processed photo
 *          (src/test-support/liveBackstageGallery.ts, shared with
 *          us37-ac37.4.3), uploads a real `media` document, creates a real
 *          `pages` row and a real `stories` row carrying every SEO field,
 *          then fetches each document's admin edit view over HTTP with a
 *          real session cookie and asserts the panel
 *          (src/components/admin/SeoAssistant/SeoAssistantField.tsx, mounted
 *          through the `seoAssistant` UI field on both collections) rendered
 *          all fourteen controls with THIS document's real values —
 *          including a missing-alt-text audit listing the gallery's actual
 *          photos and internal-link suggestions drawn from the real
 *          published content in the database. "Functional" here means the
 *          value shown is the document's own, so a hardcoded or empty panel
 *          would fail. The unit lane owns the computation
 *          (us37-ac37.6-seo-assistant-snapshot.test.ts) and the rendering
 *          (us37-ac37.6-seo-assistant-panel.test.tsx); the meta-keywords
 *          prohibition is a standing repo-wide guard
 *          (us37-ac37.6-no-meta-keywords-guard.test.ts) and is re-checked
 *          here against the real rendered admin markup.
 *          The `media`/`pages`/`stories`/`gallery-placements` documents this
 *          run creates are deleted in the `finally` block; the Backstage
 *          gallery/photo are deliberately kept, per that helper's
 *          find-or-create idempotence.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.6
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import fs from 'fs'
import path from 'path'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'
import { seedLiveBackstageGalleryWithPhoto } from '@/test-support/liveBackstageGallery'

const root = process.cwd()
const LIVE_TEST_PORT = 4306
const GALLERY_NAME = 'US-37 AC-37.6 SEO assistant live verification gallery'
const FIXTURE_IMAGE_PATH = path.join(root, 'vendor/picpeak/test-assets/img1.png')

/** The fourteen PRD §21.2 controls, by the `data-testid` the panel renders each section under. */
const CONTROL_TESTIDS = [
  'seo-assistant-search-preview',
  'seo-assistant-seo-title',
  'seo-assistant-slug',
  'seo-assistant-meta-description',
  'seo-assistant-canonical-url',
  'seo-assistant-h1-preview',
  'seo-assistant-photography-type',
  'seo-assistant-city-region',
  'seo-assistant-venue',
  'seo-assistant-og-image',
  'seo-assistant-indexing',
  'seo-assistant-schema-preview',
  'seo-assistant-missing-alt-audit',
  'seo-assistant-internal-link-suggestions',
]

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

describe('AC-37.6: the per-page and per-story SEO Assistant renders all fourteen PRD §21.2 controls in the real admin', () => {
  it(
    'shows every control, populated from a real page\'s and a real story\'s own values, and no meta-keywords surface',
    async () => {
      try {
        await dns.lookup('db')
        await dns.lookup('backstage-backend')
      } catch {
        // Not running inside the project's Docker network — skip the live round trip.
        return
      }

      const liveGallerySlug = await seedLiveBackstageGalleryWithPhoto({
        galleryName: GALLERY_NAME,
        customerName: 'AC-37.6 Verification',
        customerEmail: 'verify-us37-ac37.6@example.com',
      })

      const base = `http://localhost:${LIVE_TEST_PORT}`
      const child = spawn(path.join(root, 'node_modules/.bin/next'), ['dev', '-p', String(LIVE_TEST_PORT)], {
        cwd: root,
        env: { ...process.env, NEXT_PUBLIC_SITE_URL: base },
      })

      const createdPageIds: string[] = []
      const createdStoryIds: string[] = []
      const createdPlacementIds: string[] = []
      const createdMediaIds: string[] = []
      let authHeaders: { Authorization: string; 'Content-Type': string } | undefined

      try {
        await waitForServer(`${base}/api/users`, 60000)

        const token = await getLiveApiAuthToken(base)
        authHeaders = { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' }
        // Payload's admin authenticates by cookie, not by the Authorization
        // header the REST API accepts — the same JWT, presented the way a
        // real browser session presents it.
        const adminHeaders = { Cookie: `payload-token=${token}` }

        const unique = Date.now()

        // --- a real Open Graph image: a genuine `media` upload, not a stub ---
        const mediaForm = new FormData()
        const fileBytes = fs.readFileSync(FIXTURE_IMAGE_PATH)
        mediaForm.append('file', new Blob([new Uint8Array(fileBytes)], { type: 'image/png' }), `ac37-6-og-${unique}.png`)
        mediaForm.append('_payload', JSON.stringify({ alt: `AC-37.6 Open Graph image ${unique}` }))
        const mediaRes = await fetch(`${base}/api/media`, {
          method: 'POST',
          headers: { Authorization: `JWT ${token}` },
          body: mediaForm,
        })
        expect(mediaRes.status).toBeLessThan(300)
        const mediaBody = await mediaRes.json()
        const mediaDoc = (mediaBody.doc ?? mediaBody) as { id: string; url: string }
        createdMediaIds.push(mediaDoc.id)

        // --- the placed gallery whose photos the alt-text audit reports on ---
        const placementRes = await fetch(`${base}/api/gallery-placements`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ gallerySlug: liveGallerySlug, layout: 'masonry' }),
        })
        expect(placementRes.status).toBeLessThan(300)
        const placementBody = await placementRes.json()
        const placementId = (placementBody.doc ?? placementBody).id as string
        createdPlacementIds.push(placementId)

        // --- a sibling published page, so internal-link suggestions have real content to draw on ---
        const siblingSlug = `ac37-6-sibling-page-${unique}`
        const siblingRes = await fetch(`${base}/api/pages`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            internalName: `AC-37.6 sibling page ${unique}`,
            heading: `AC-37.6 Sibling Heading ${unique}`,
            navigationLabel: `AC-37.6 Sibling ${unique}`,
            slug: siblingSlug,
            photographyType: 'wedding',
            cityRegion: 'Dubai',
            status: 'published',
            indexing: 'index',
          }),
        })
        expect(siblingRes.status).toBeLessThan(300)
        createdPageIds.push(((await siblingRes.json()).doc ?? {}).id as string)

        // --- the real page under test, carrying every SEO field ---
        const pageSlug = `ac37-6-seo-assistant-page-${unique}`
        const pageSeoTitle = `AC-37.6 Page SEO Title ${unique}`
        const pageMetaDescription = `AC-37.6 page meta description ${unique}.`
        const pageHeading = `AC-37.6 Page Heading ${unique}`
        const pageVenue = `AC-37.6 Page Venue ${unique}`
        const pageRes = await fetch(`${base}/api/pages`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            internalName: `AC-37.6 page ${unique}`,
            heading: pageHeading,
            slug: pageSlug,
            seoTitle: pageSeoTitle,
            metaDescription: pageMetaDescription,
            socialImage: mediaDoc.id,
            photographyType: 'wedding',
            cityRegion: 'Dubai',
            venue: pageVenue,
            status: 'published',
            indexing: 'noindex',
            galleryPlacements: [placementId],
          }),
        })
        expect(pageRes.status).toBeLessThan(300)
        const pageId = ((await pageRes.json()).doc ?? {}).id as string
        createdPageIds.push(pageId)

        // --- the real story under test, carrying the same SEO field set ---
        const storySlug = `ac37-6-seo-assistant-story-${unique}`
        const storyTitle = `AC-37.6 Story Title ${unique}`
        const storySeoTitle = `AC-37.6 Story SEO Title ${unique}`
        const storyMetaDescription = `AC-37.6 story meta description ${unique}.`
        const storyVenue = `AC-37.6 Story Venue ${unique}`
        const storyRes = await fetch(`${base}/api/stories`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            title: storyTitle,
            subtitleIntroduction: 'A story used to verify the AC-37.6 SEO Assistant.',
            slug: storySlug,
            seoTitle: storySeoTitle,
            metaDescription: storyMetaDescription,
            socialImage: mediaDoc.id,
            photographyType: 'wedding',
            cityRegion: 'Dubai',
            venue: storyVenue,
            status: 'published',
            indexing: 'index',
            sections: [
              {
                sectionHeading: 'A section',
                shortText: 'Short text for the AC-37.6 story fixture.',
                galleryPlacement: placementId,
              },
            ],
          }),
        })
        expect(storyRes.status).toBeLessThan(300)
        const storyId = ((await storyRes.json()).doc ?? {}).id as string
        createdStoryIds.push(storyId)

        // ================= the real page's admin edit view =================
        const pageAdminRes = await fetch(`${base}/admin/collections/pages/${pageId}`, { headers: adminHeaders })
        expect(pageAdminRes.status).toBe(200)
        const pageHtml = await pageAdminRes.text()

        // The panel mounted at all — not a Payload "component not found" gap.
        expect(pageHtml).toContain('seo-assistant-panel')

        // 1-14: every control is present…
        for (const testId of CONTROL_TESTIDS) {
          expect(pageHtml).toContain(testId)
        }

        // …and functional: each shows THIS page's own value.
        expect(pageHtml).toContain(pageSeoTitle) // 1 search-result preview + 2 SEO title
        expect(pageHtml).toContain(pageSlug) // 3 slug
        expect(pageHtml).toContain(pageMetaDescription) // 4 meta description
        expect(pageHtml).toContain(`${base}/${pageSlug}`) // 5 canonical URL, absolute
        expect(pageHtml).toContain(pageHeading) // 6 H1 preview
        expect(pageHtml).toContain('Dubai') // 8 city/region
        expect(pageHtml).toContain(pageVenue) // 9 venue
        expect(pageHtml).toContain(mediaDoc.url) // 10 Open Graph image
        expect(pageHtml).toContain('seo-assistant-og-image-preview')
        expect(pageHtml).toContain('noindex') // 11 index/noindex — this page's own selection
        expect(pageHtml).toContain('https://schema.org') // 12 schema preview, real JSON-LD
        // 13 missing-alt-text audit: the placed gallery's real photos, not the empty state.
        expect(pageHtml).toContain('seo-assistant-missing-alt-audit-item')
        expect(pageHtml).not.toContain('seo-assistant-missing-alt-audit-empty')
        // 14 internal-link suggestions: real published content, never this page itself.
        expect(pageHtml).toContain('seo-assistant-internal-link-suggestion-item')
        expect(pageHtml).not.toContain('seo-assistant-internal-link-suggestions-empty')

        // 7 photography type: the saved `wedding` value, shown inside the
        // panel's own photography-type section rather than merely somewhere
        // on a page that also renders the field's own select options.
        const photographyTypeSection = pageHtml.slice(pageHtml.indexOf('seo-assistant-photography-type'))
        expect(photographyTypeSection.slice(0, 400)).toContain('wedding')

        // The prohibition holds in real admin markup too: PRD §21.2 forbids
        // a meta-keywords field, and the page's own internal `tags` field
        // must never surface as one.
        const panelStart = pageHtml.indexOf('seo-assistant-panel')
        const panelMarkup = pageHtml.slice(panelStart, pageHtml.indexOf('seo-assistant-internal-link-suggestions'))
        expect(panelMarkup.toLowerCase()).not.toContain('keyword')

        // ================= the real story's admin edit view =================
        const storyAdminRes = await fetch(`${base}/admin/collections/stories/${storyId}`, { headers: adminHeaders })
        expect(storyAdminRes.status).toBe(200)
        const storyHtml = await storyAdminRes.text()

        expect(storyHtml).toContain('seo-assistant-panel')
        for (const testId of CONTROL_TESTIDS) {
          expect(storyHtml).toContain(testId)
        }

        expect(storyHtml).toContain(storySeoTitle)
        expect(storyHtml).toContain(storySlug)
        expect(storyHtml).toContain(storyMetaDescription)
        // The story's canonical URL carries the /stories prefix its public route renders at.
        expect(storyHtml).toContain(`${base}/stories/${storySlug}`)
        expect(storyHtml).toContain(storyTitle) // the story's H1
        expect(storyHtml).toContain(storyVenue)
        expect(storyHtml).toContain(mediaDoc.url)
        expect(storyHtml).toContain('https://schema.org')
        expect(storyHtml).toContain('seo-assistant-missing-alt-audit-item')
        expect(storyHtml).toContain('seo-assistant-internal-link-suggestion-item')

        const storyPanelStart = storyHtml.indexOf('seo-assistant-panel')
        const storyPanelMarkup = storyHtml.slice(
          storyPanelStart,
          storyHtml.indexOf('seo-assistant-internal-link-suggestions'),
        )
        expect(storyPanelMarkup.toLowerCase()).not.toContain('keyword')
      } finally {
        for (const id of createdStoryIds) {
          await fetch(`${base}/api/stories/${id}`, { method: 'DELETE', headers: authHeaders }).catch(() => undefined)
        }
        for (const id of createdPageIds) {
          await fetch(`${base}/api/pages/${id}`, { method: 'DELETE', headers: authHeaders }).catch(() => undefined)
        }
        for (const id of createdPlacementIds) {
          await fetch(`${base}/api/gallery-placements/${id}`, {
            method: 'DELETE',
            headers: authHeaders,
          }).catch(() => undefined)
        }
        for (const id of createdMediaIds) {
          await fetch(`${base}/api/media/${id}`, { method: 'DELETE', headers: authHeaders }).catch(() => undefined)
        }
        await killServer(child)
      }
    },
    300000,
  )
})
