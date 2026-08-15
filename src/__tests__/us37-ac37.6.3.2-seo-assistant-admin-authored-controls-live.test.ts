/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us37-ac37.6.3.2-seo-assistant-admin-authored-controls-live.test.ts
 * project: earthandhoney
 * purpose: Verify AC-37.6.3.2 — the eight AC-37.6.1 AUTHORED SEO Assistant
 *          controls (SEO title, slug, meta description, photography type,
 *          city/region, venue, Open Graph image, index/noindex) are present
 *          and functional in the REAL admin against a real `pages` document
 *          AND a real `stories` document, each read with the exact recipe
 *          SEO_ASSISTANT_ADMIN_OBSERVABILITY.md's AC-37.6.3.1 recorded for
 *          it — this suite introduces no second way of observing a control.
 *          Reuses that document's own `authoredInputValue`/
 *          `authoredTextareaValue`/`formStateValue` helpers verbatim rather
 *          than re-deriving them.
 *          Where AC-37.6.3.1 deliberately scoped itself to one `pages` row
 *          and left `socialImage` at its unset `null` (no media upload, no
 *          `stories` document, no cross-document check — see that suite's
 *          own header and SEO_ASSISTANT_ADMIN_OBSERVABILITY.md's §NOT
 *          COVERED), this suite closes exactly those three gaps: it
 *          uploads one real `media` document per fixture document (so
 *          `socialImage` is proven against a real, non-null, PER-DOCUMENT
 *          value rather than a shared or absent one), it seeds a `stories`
 *          row alongside the `pages` row (proving the identical recipes
 *          reproduce on `/admin/collections/stories/:id`, not only
 *          `/admin/collections/pages/:id`), and it gives every one of the
 *          eight fields a genuinely different value on each document —
 *          including `indexing`, one `noindex` and one `index` — so a
 *          control rendering the OTHER document's value, not just a
 *          hardcoded or empty one, is a real failure mode this suite can
 *          actually catch. The suite closes with a negative pass: neither
 *          fetched edit view contains the other document's unique authored
 *          values.
 *          The `stories` fixture's `sections[].galleryPlacement` is a
 *          required relationship (src/collections/Stories.ts), so this
 *          suite creates exactly one `gallery-placements` row to satisfy
 *          that schema constraint — a plain Payload-only row addressed by
 *          an arbitrary `gallerySlug` string (src/collections/
 *          GalleryPlacements.ts never joins the separate Backstage
 *          database), not a Backstage gallery. No Backstage gallery is
 *          seeded and no placed image exists: none of the eight AUTHORED
 *          controls depends on placed imagery, and proving the
 *          missing-alt-text audit's non-empty state is AC-37.6.3.3's
 *          evidence, not this suite's (SEO_ASSISTANT_ADMIN_OBSERVABILITY.md
 *          §NOT COVERED).
 *          Both fixtures are created with `status: 'draft'` rather than
 *          'published'. This is a deliberate hermetic choice, not an
 *          oversight: SeoAssistantField's internal-link-suggestions
 *          candidate query (src/components/admin/SeoAssistant/
 *          SeoAssistantField.tsx's `resolveCandidates`) matches every OTHER
 *          published `pages`/`stories` document, so two real *published*
 *          fixtures would legitimately surface each other's slug inside
 *          each other's DERIVED "internal link suggestions" section — a
 *          correct render, not a bug, but one that would make this suite's
 *          own negative-pass assertion (neither edit view contains the
 *          other's values) fail for a reason that has nothing to do with
 *          the eight AUTHORED controls this AC actually covers. Draft
 *          status keeps both fixtures out of that candidate query entirely,
 *          so the negative pass tests exactly what it claims to.
 *          Uploading real media additionally requires a live (non-
 *          placeholder) R2 endpoint, the same gate
 *          us2-ac2.4-alt-text-required.test.ts already established — absent
 *          that, this suite returns early rather than fabricate evidence
 *          for a control it cannot actually round-trip.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.3.2
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import sharp from 'sharp'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4310

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

/** Only a real (non-placeholder) endpoint makes the media upload meaningful — same gate as us2-ac2.4-alt-text-required.test.ts. */
function hasLiveR2Config(): boolean {
  const endpoint = process.env.R2_ENDPOINT || ''
  return endpoint.length > 0 && !endpoint.includes('change-me-in-production')
}

// --- SEO_ASSISTANT_ADMIN_OBSERVABILITY.md's AC-37.6.3.1 recipes, reused verbatim (§(b), rows 1-8) ---

/** The value Payload's own `<input id="field-<name>">` control rendered — the AUTHORED field's real, current value. */
function authoredInputValue(html: string, fieldName: string): string {
  const match = html.match(new RegExp(`<input[^>]*id="field-${fieldName}"[^>]*\\svalue="([^"]*)"`))
  if (!match) {
    throw new Error(`No <input id="field-${fieldName}"> with a value attribute in the admin edit view`)
  }
  return match[1]
}

/** The value Payload's own `<textarea id="field-<name>">` control rendered — the AUTHORED field's real, current value. */
function authoredTextareaValue(html: string, fieldName: string): string {
  const match = html.match(new RegExp(`<textarea[^>]*id="field-${fieldName}"[^>]*>([\\s\\S]*?)</textarea>`))
  if (!match) {
    throw new Error(`No <textarea id="field-${fieldName}"> in the admin edit view`)
  }
  return match[1]
}

/**
 * The value Payload sent down for a hydration-deferred control (`select`,
 * `upload`) in its form-state payload — rows 6-8 of the recipe table. Those
 * widgets render only a `shimmer-effect` placeholder in the initial SSR
 * HTML, so this payload, embedded verbatim as a JSON string inside Next's
 * flight script (hence the single-backslash-escaped quotes), is where each
 * control's real value actually is. Matched only in the `initialState`
 * shape (`{"value":...`), never the flat `initialData` copy.
 */
function formStateValue(html: string, fieldName: string): unknown {
  const q = '\\\\"'
  const match = html.match(new RegExp(`${q}${fieldName}${q}:\\{${q}value${q}:(.*?),${q}initialValue${q}`))
  if (!match) {
    throw new Error(`No form-state entry for "${fieldName}" in the admin edit view`)
  }
  return JSON.parse(match[1].replace(/\\"/g, '"'))
}

describe('AC-37.6.3.2: the eight AUTHORED SEO Assistant controls, live against a real pages document and a real stories document', () => {
  it(
    "each of the eight AUTHORED controls shows that document's own value on both a real page and a real story, and never the other document's value",
    async () => {
      try {
        await dns.lookup('db')
      } catch {
        // Not running inside the project's Docker network — skip the live round trip.
        return
      }
      if (!hasLiveR2Config()) {
        // Only the .env.example placeholder R2 endpoint is configured in
        // this environment — there is no real bucket to upload the
        // per-document Open Graph media into.
        return
      }

      const base = `http://localhost:${LIVE_TEST_PORT}`
      const child = spawn(path.join(root, 'node_modules/.bin/next'), ['dev', '-p', String(LIVE_TEST_PORT)], {
        cwd: root,
        env: { ...process.env, NEXT_PUBLIC_SITE_URL: base },
      })

      let jsonHeaders: { Authorization: string; 'Content-Type': string } | undefined
      let uploadHeaders: { Authorization: string } | undefined
      let sessionCookie: string | undefined
      const createdPageIds: Array<string | number> = []
      const createdStoryIds: Array<string | number> = []
      const createdPlacementIds: Array<string | number> = []
      const createdMediaIds: Array<string | number> = []

      try {
        await waitForServer(`${base}/api/users`, 60000)

        const token = await getLiveApiAuthToken(base)
        jsonHeaders = { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' }
        uploadHeaders = { Authorization: `JWT ${token}` }
        sessionCookie = `payload-token=${token}`

        const unique = Date.now()

        async function uploadMedia(alt: string, fill: { r: number; g: number; b: number }): Promise<string | number> {
          const buffer = await sharp({
            create: { width: 400, height: 300, channels: 3, background: fill },
          })
            .jpeg()
            .toBuffer()
          const form = new FormData()
          form.append('file', new Blob([new Uint8Array(buffer)], { type: 'image/jpeg' }), `${alt.replace(/\s+/g, '-')}.jpg`)
          form.append('_payload', JSON.stringify({ alt }))
          const res = await fetch(`${base}/api/media`, { method: 'POST', headers: uploadHeaders, body: form })
          expect(res.status).toBeLessThan(300)
          const body = await res.json()
          const id = (body.doc ?? body).id as string | number
          createdMediaIds.push(id)
          return id
        }

        // One real media document PER document, so Open Graph image is
        // per-document evidence, not a value both happen to share.
        const pageMediaId = await uploadMedia(`AC-37.6.3.2 Page Social Image ${unique}`, { r: 90, g: 120, b: 200 })
        const storyMediaId = await uploadMedia(`AC-37.6.3.2 Story Social Image ${unique}`, { r: 200, g: 90, b: 120 })

        // Every one of the eight authored fields carries a DIFFERENT value
        // on the page than on the story, including indexing (noindex vs
        // index) — this is what makes "renders the other document's value"
        // a real, catchable failure mode below.
        const pageSeoTitle = `AC-37.6.3.2 Page SEO Title ${unique}`
        const pageSlug = `ac-37-6-3-2-page-${unique}`
        const pageMetaDescription = `AC-37.6.3.2 Page Meta Description ${unique}`
        const pageCityRegion = `AC-37.6.3.2 Page City ${unique}`
        const pageVenue = `AC-37.6.3.2 Page Venue ${unique}`
        const pagePhotographyType = 'wedding'
        const pageIndexing = 'noindex'

        const storySeoTitle = `AC-37.6.3.2 Story SEO Title ${unique}`
        const storySlug = `ac-37-6-3-2-story-${unique}`
        const storyMetaDescription = `AC-37.6.3.2 Story Meta Description ${unique}`
        const storyCityRegion = `AC-37.6.3.2 Story City ${unique}`
        const storyVenue = `AC-37.6.3.2 Story Venue ${unique}`
        const storyPhotographyType = 'engagement'
        const storyIndexing = 'index'

        const pageRes = await fetch(`${base}/api/pages`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            internalName: `AC-37.6.3.2 Page ${unique}`,
            heading: `AC-37.6.3.2 Page Heading ${unique}`,
            slug: pageSlug,
            seoTitle: pageSeoTitle,
            metaDescription: pageMetaDescription,
            photographyType: pagePhotographyType,
            cityRegion: pageCityRegion,
            venue: pageVenue,
            socialImage: pageMediaId,
            indexing: pageIndexing,
            // Draft, deliberately — see file header on why: it keeps this
            // fixture out of the OTHER document's internal-link-suggestions
            // candidate query, so the negative pass below tests only the
            // eight AUTHORED controls, not an unrelated DERIVED control.
            status: 'draft',
          }),
        })
        expect(pageRes.status).toBeLessThan(300)
        const pageBody = await pageRes.json()
        const pageId = (pageBody.doc ?? pageBody).id as string | number
        createdPageIds.push(pageId)

        // Stories.sections[].galleryPlacement is a required relationship —
        // one plain gallery-placements row, addressed by an arbitrary
        // gallerySlug string, satisfies that schema constraint without
        // seeding a real Backstage gallery (see file header).
        const placementRes = await fetch(`${base}/api/gallery-placements`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ gallerySlug: `ac-37-6-3-2-story-gallery-${unique}`, layout: 'masonry' }),
        })
        expect(placementRes.status).toBeLessThan(300)
        const placementBody = await placementRes.json()
        const placementId = (placementBody.doc ?? placementBody).id as string | number
        createdPlacementIds.push(placementId)

        const storyRes = await fetch(`${base}/api/stories`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            title: `AC-37.6.3.2 Story ${unique}`,
            slug: storySlug,
            seoTitle: storySeoTitle,
            metaDescription: storyMetaDescription,
            photographyType: storyPhotographyType,
            cityRegion: storyCityRegion,
            venue: storyVenue,
            socialImage: storyMediaId,
            indexing: storyIndexing,
            status: 'draft',
            sections: [
              {
                sectionHeading: `AC-37.6.3.2 Story Section ${unique}`,
                shortText: `Short text for the AC-37.6.3.2 story fixture ${unique}.`,
                galleryPlacement: placementId,
              },
            ],
          }),
        })
        expect(storyRes.status).toBeLessThan(300)
        const storyBody = await storyRes.json()
        const storyId = (storyBody.doc ?? storyBody).id as string | number
        createdStoryIds.push(storyId)

        // --- fetch each document's real admin edit view with a real session cookie ---
        const pageAdminRes = await fetch(`${base}/admin/collections/pages/${pageId}`, {
          headers: { Cookie: sessionCookie },
        })
        expect(pageAdminRes.status).toBe(200)
        const pageHtml = await pageAdminRes.text()
        expect(pageHtml).toContain('data-testid="seo-assistant-panel"')

        const storyAdminRes = await fetch(`${base}/admin/collections/stories/${storyId}`, {
          headers: { Cookie: sessionCookie },
        })
        expect(storyAdminRes.status).toBe(200)
        const storyHtml = await storyAdminRes.text()
        expect(storyHtml).toContain('data-testid="seo-assistant-panel"')

        // --- the eight AUTHORED controls, each against THIS document's own value ---

        // Page.
        expect(authoredInputValue(pageHtml, 'seoTitle')).toBe(pageSeoTitle)
        expect(authoredInputValue(pageHtml, 'slug')).toBe(pageSlug)
        expect(authoredTextareaValue(pageHtml, 'metaDescription')).toBe(pageMetaDescription)
        expect(authoredInputValue(pageHtml, 'cityRegion')).toBe(pageCityRegion)
        expect(authoredInputValue(pageHtml, 'venue')).toBe(pageVenue)
        expect(formStateValue(pageHtml, 'photographyType')).toBe(pagePhotographyType)
        expect(formStateValue(pageHtml, 'indexing')).toBe(pageIndexing)
        expect(formStateValue(pageHtml, 'socialImage')).toBe(pageMediaId)

        // Story — identical recipes, reproduced on /admin/collections/stories/:id.
        expect(authoredInputValue(storyHtml, 'seoTitle')).toBe(storySeoTitle)
        expect(authoredInputValue(storyHtml, 'slug')).toBe(storySlug)
        expect(authoredTextareaValue(storyHtml, 'metaDescription')).toBe(storyMetaDescription)
        expect(authoredInputValue(storyHtml, 'cityRegion')).toBe(storyCityRegion)
        expect(authoredInputValue(storyHtml, 'venue')).toBe(storyVenue)
        expect(formStateValue(storyHtml, 'photographyType')).toBe(storyPhotographyType)
        expect(formStateValue(storyHtml, 'indexing')).toBe(storyIndexing)
        expect(formStateValue(storyHtml, 'socialImage')).toBe(storyMediaId)

        // --- negative pass: neither edit view contains the other document's values ---

        // The five plain input/textarea fields carry a unique, timestamped
        // string per document, so a substring check is meaningful evidence
        // rather than a coincidence.
        for (const value of [storySeoTitle, storySlug, storyMetaDescription, storyCityRegion, storyVenue]) {
          expect(pageHtml).not.toContain(value)
        }
        for (const value of [pageSeoTitle, pageSlug, pageMetaDescription, pageCityRegion, pageVenue]) {
          expect(storyHtml).not.toContain(value)
        }

        // The three hydration-deferred fields share a small vocabulary
        // (enum labels, small numeric IDs) where a blind substring search
        // would be meaningless — the parsed recipe value is what "carries
        // the other document's value" actually means for these.
        expect(formStateValue(pageHtml, 'photographyType')).not.toBe(storyPhotographyType)
        expect(formStateValue(pageHtml, 'indexing')).not.toBe(storyIndexing)
        expect(formStateValue(pageHtml, 'socialImage')).not.toBe(storyMediaId)
        expect(formStateValue(storyHtml, 'photographyType')).not.toBe(pagePhotographyType)
        expect(formStateValue(storyHtml, 'indexing')).not.toBe(pageIndexing)
        expect(formStateValue(storyHtml, 'socialImage')).not.toBe(pageMediaId)
      } finally {
        for (const id of createdPageIds) {
          await fetch(`${base}/api/pages/${id}`, { method: 'DELETE', headers: jsonHeaders }).catch(() => undefined)
        }
        for (const id of createdStoryIds) {
          await fetch(`${base}/api/stories/${id}`, { method: 'DELETE', headers: jsonHeaders }).catch(() => undefined)
        }
        for (const id of createdPlacementIds) {
          await fetch(`${base}/api/gallery-placements/${id}`, { method: 'DELETE', headers: jsonHeaders }).catch(() => undefined)
        }
        for (const id of createdMediaIds) {
          await fetch(`${base}/api/media/${id}`, { method: 'DELETE', headers: jsonHeaders }).catch(() => undefined)
        }
        await killServer(child)
      }
    },
    180000,
  )
})
