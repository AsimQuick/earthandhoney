/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us37-ac37.6.3.3.1-seo-assistant-admin-derived-controls-live.test.ts
 * project: earthandhoney
 * purpose: Verify AC-37.6.3.3.1 — four of AC-37.6.2's six DERIVED SEO
 *          Assistant controls (search-result preview, canonical URL, H1
 *          preview, schema preview — the four that are a function of the
 *          document alone) are present and functional in the REAL admin
 *          against a real `pages` document AND a real `stories` document,
 *          each read with the exact recipe SEO_ASSISTANT_ADMIN_OBSERVABILITY.md
 *          recorded for it (§(b) rows 9-12) — this suite introduces no
 *          second way of observing a control. Reuses that document's own
 *          `extractSection`/`paragraphText`/`plainParagraphText`/
 *          `escapeHtmlText`/`applyTitlePattern` helpers verbatim, the same
 *          way AC-37.6.3.2 reused AC-37.6.3.1's AUTHORED-control helpers.
 *          The remaining two DERIVED controls (missing-alt-text audit,
 *          internal-link suggestions) are AC-37.6.3.3.2's/.3's evidence, not
 *          this suite's.
 *          "Functional" means each section renders THAT document's own
 *          value, never the other document's, a hardcoded value, or an empty
 *          one — proven by seeding a page and a story whose every asserted
 *          value differs, closing with a negative pass that neither fetched
 *          edit view contains the other document's unique values.
 *          TWO TRAPS this suite actively proves, not merely avoids:
 *          (i) the two collections resolve their title/description
 *          ASYMMETRICALLY — SeoAssistantField.tsx's `buildInputForPage`
 *          composes `seoTitle || heading` / `metaDescription ||
 *          defaultMetaDescription`, but `buildInputForStory` composes
 *          `title` ALONE (no `seoTitle` fallback on that route yet) and
 *          `subtitleIntroduction || defaultMetaDescription` (never
 *          `metaDescription`) — mirroring src/app/(frontend)/[slug]/page.tsx's
 *          and src/app/(frontend)/stories/[slug]/page.tsx's own
 *          `generateMetadata`. The story fixture below deliberately sets
 *          `seoTitle`/`metaDescription` to DECOY values distinct from
 *          `title`/`subtitleIntroduction` and asserts the decoys never reach
 *          the search-result preview — a suite assuming symmetry would pass
 *          with the decoys unset and never catch a regression here.
 *          (ii) the fetched HTML is HTML-entity-escaped — the studio
 *          business name's `&` renders as `&amp;` (confirmed live in
 *          SEO_ASSISTANT_ADMIN_OBSERVABILITY.md row 9's transcript) — so
 *          plain-text expectations are escaped with `escapeHtmlText` before
 *          comparison (AC-37.6.3.1's own technique), and the schema-preview
 *          JSON blob is decoded with the inverse `decodeHtmlText` before
 *          `JSON.parse`, rather than string-matched as an escaped fragment.
 *          The schema preview's exact expected value is computed by calling
 *          the real `buildPageStructuredData`/`buildStoryStructuredData`
 *          (src/lib/studioStructuredData.ts, AC-37.3) — different shapes for
 *          the page and the story, not one assertion applied twice — against
 *          a `ResolvedStudioProfile` built from the studio profile fetched
 *          LIVE over `/api/globals/studio-profile`, normalized with the same
 *          fallback logic src/lib/getStudioProfile.ts uses (copied rather
 *          than imported: that module's `getPayload` import breaks Jest's
 *          ESM interop, see its own header, so this suite reads the
 *          identical fields over HTTP and normalizes them the same way,
 *          reusing the `fieldDefaultValue` helper by reading
 *          `StudioProfile.fields` directly — a type-only `payload` import,
 *          safe in Jest, the same way src/__tests__/us24-ac24.2-studio-profile-branding-bounds.test.ts
 *          already imports `@/globals/StudioProfile` directly). The
 *          search-result preview's title is likewise composed through the
 *          studio's real `defaultTitlePattern` read LIVE, never hardcoded.
 *          Canonical URL is computed the same way
 *          us37-ac37.4.3-sitemap-image-references-live.test.ts already does
 *          — `new URL(path, base).toString()`, exact because the spawned
 *          server is given `NEXT_PUBLIC_SITE_URL=http://localhost:4311`
 *          pointing at itself — rather than importing `absoluteSiteUrl` and
 *          mutating this process's own env.
 *          Both fixtures are created `status: 'draft'`, for the identical
 *          hermetic reason AC-37.6.3.2 recorded: draft keeps both out of the
 *          OTHER document's internal-link-suggestions candidate query
 *          (`resolveCandidates` matches published documents only), so the
 *          closing negative pass tests exactly the four DERIVED controls in
 *          this AC's scope. No `media` upload — none of these four controls
 *          depends on Open Graph image or placed imagery — and no
 *          `hasLiveR2Config()` gate, unlike AC-37.6.3.2: that suite uploads
 *          `media` and this one does not, so inheriting the gate would
 *          silently skip this whole suite in any environment without a real
 *          R2 bucket. The `stories` fixture's `sections[].galleryPlacement`
 *          is a required relationship (src/collections/Stories.ts), so this
 *          suite creates exactly one `gallery-placements` row addressed by
 *          an arbitrary `gallerySlug` string — never a real Backstage
 *          gallery, the same workaround AC-37.6.3.2 recorded.
 *          Runs on port 4311 (4278-4310 already claimed by earlier live
 *          suites) and fetches the page admin view then the story admin
 *          view SEQUENTIALLY, not via Promise.all — first-ever hits to two
 *          distinct not-yet-compiled admin routes on a cold `next dev`
 *          server, the exact race commit f22c4c2 fixed for AC-37.2 and
 *          AC-37.6.3.2 already avoids by construction.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.3.3.1
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import type { Field } from 'payload'

import { StudioProfile } from '@/globals/StudioProfile'
import type { ResolvedStudioProfile } from '@/lib/getStudioProfile'
import { buildPageStructuredData, buildStoryStructuredData } from '@/lib/studioStructuredData'
import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4311

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

// --- SEO_ASSISTANT_ADMIN_OBSERVABILITY.md's AC-37.6.3.1 recipes, reused verbatim (§(b), rows 9-12) ---

/** React's own text-content escaping, so an assertion on a real value compares against what the admin actually emitted. Trap (ii). */
function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** The inverse of escapeHtmlText, for the one control (schema preview) whose value is parsed as JSON rather than string-compared. Trap (ii). */
function decodeHtmlText(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/** The `<section data-testid="X">...</section>` block for one DERIVED control, so an assertion is scoped to that control rather than the whole document. */
function extractSection(html: string, testid: string): string {
  const match = html.match(new RegExp(`data-testid="${testid}"[\\s\\S]*?<\\/section>`))
  if (!match) {
    throw new Error(`Section with data-testid="${testid}" not found in the admin edit view`)
  }
  return match[0]
}

/** The rendered text of one addressable `<p data-testid="X">` inside a DERIVED control's section. */
function paragraphText(section: string, testid: string): string {
  const match = section.match(new RegExp(`<p data-testid="${testid}">([\\s\\S]*?)</p>`))
  if (!match) {
    throw new Error(`No <p data-testid="${testid}"> in the SEO Assistant section`)
  }
  return match[1]
}

/** The rendered text of a section's single unlabelled `<p>` — how SeoAssistantPanel renders the canonical-URL and H1-preview controls. */
function plainParagraphText(section: string): string {
  const match = section.match(/<p>([\s\S]*?)<\/p>/)
  if (!match) {
    throw new Error('No plain <p> in the SEO Assistant section')
  }
  return match[1]
}

/** The decoded, parsed JSON-LD object rendered inside `<pre data-testid="seo-assistant-schema-preview-json">`. */
function schemaPreviewJson(section: string): Record<string, unknown> {
  const match = section.match(/<pre data-testid="seo-assistant-schema-preview-json">([\s\S]*?)<\/pre>/)
  if (!match) {
    throw new Error('No <pre data-testid="seo-assistant-schema-preview-json"> in the SEO Assistant section')
  }
  return JSON.parse(decodeHtmlText(match[1])) as Record<string, unknown>
}

/** Mirrors src/lib/seoAssistant.ts's own `applyTitlePattern`, so the expected search-preview title is composed the way the panel composes it. */
function applyTitlePattern(titleSegment: string, pattern: string): string {
  return pattern.includes('%s') ? pattern.replace('%s', titleSegment) : titleSegment || pattern
}

// --- src/lib/getStudioProfile.ts's own normalization, copied rather than imported (see file header) ---

function fieldDefaultValue(name: string): string {
  const field = StudioProfile.fields.find(
    (candidate): candidate is Field & { name: string } => 'name' in candidate && candidate.name === name,
  )
  const defaultValue = field && 'defaultValue' in field ? field.defaultValue : undefined
  return typeof defaultValue === 'string' ? defaultValue : ''
}

interface RawStudioProfileApiDoc {
  businessName?: string
  description?: string
  defaultTitlePattern?: string
  defaultMetaDescription?: string
  publicPhone?: string
  publicEmail?: string
  address?: { street?: string; city?: string; region?: string; postalCode?: string; country?: string }
  serviceAreas?: Array<{ area?: string }>
  socialProfiles?: Array<{ platform?: string; url?: string }>
  defaultSocialImage?: { url?: string } | number | null
}

/** Mirrors src/lib/getStudioProfile.ts's return construction exactly, applied to the live `/api/globals/studio-profile` response instead of `payload.findGlobal`. */
function resolveStudioProfileFromApi(doc: RawStudioProfileApiDoc): ResolvedStudioProfile {
  const defaultSocialImage =
    doc.defaultSocialImage && typeof doc.defaultSocialImage === 'object' && doc.defaultSocialImage.url
      ? { url: doc.defaultSocialImage.url }
      : null

  return {
    businessName: doc.businessName || fieldDefaultValue('businessName'),
    description: doc.description || '',
    defaultTitlePattern: doc.defaultTitlePattern || fieldDefaultValue('defaultTitlePattern'),
    defaultMetaDescription: doc.defaultMetaDescription || fieldDefaultValue('defaultMetaDescription'),
    publicPhone: doc.publicPhone || '',
    publicEmail: doc.publicEmail || '',
    address: {
      street: doc.address?.street || '',
      city: doc.address?.city || '',
      region: doc.address?.region || '',
      postalCode: doc.address?.postalCode || '',
      country: doc.address?.country || '',
    },
    serviceAreas: (doc.serviceAreas ?? []).map((row) => row.area || '').filter(Boolean),
    socialProfiles: (doc.socialProfiles ?? []).filter(
      (row): row is { platform: string; url: string } => Boolean(row.platform && row.url),
    ),
    defaultSocialImage,
    homeHeroGallerySlug: null,
    homeSelectedGalleriesOrStories: [],
  }
}

describe('AC-37.6.3.3.1: the four document-only DERIVED SEO Assistant controls, live against a real pages document and a real stories document', () => {
  it(
    "search-result preview, canonical URL, H1 preview and schema preview each show that document's own value on both a real page and a real story, and never the other document's value",
    async () => {
      try {
        await dns.lookup('db')
      } catch {
        // Not running inside the project's Docker network — skip the live round trip.
        return
      }

      const base = `http://localhost:${LIVE_TEST_PORT}`
      const child = spawn(path.join(root, 'node_modules/.bin/next'), ['dev', '-p', String(LIVE_TEST_PORT)], {
        cwd: root,
        env: { ...process.env, NEXT_PUBLIC_SITE_URL: base },
      })

      let jsonHeaders: { Authorization: string; 'Content-Type': string } | undefined
      let sessionCookie: string | undefined
      const createdPageIds: Array<string | number> = []
      const createdStoryIds: Array<string | number> = []
      const createdPlacementIds: Array<string | number> = []

      try {
        await waitForServer(`${base}/api/users`, 60000)

        const token = await getLiveApiAuthToken(base)
        jsonHeaders = { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' }
        sessionCookie = `payload-token=${token}`

        const profileRes = await fetch(`${base}/api/globals/studio-profile?depth=1`, { headers: jsonHeaders })
        expect(profileRes.status).toBe(200)
        const rawProfile = (await profileRes.json()) as RawStudioProfileApiDoc
        const studioProfile = resolveStudioProfileFromApi(rawProfile)
        expect(studioProfile.defaultTitlePattern).toContain('%s')

        const unique = Date.now()

        // Page fixture — every AC-37.3/37.6.1 field the four DERIVED
        // controls under test actually consume.
        const pageSlug = `ac-37-6-3-3-1-page-${unique}`
        const pageHeading = `AC-37.6.3.3.1 Page Heading ${unique}`
        const pageSeoTitle = `AC-37.6.3.3.1 Page SEO Title ${unique}`
        const pageMetaDescription = `AC-37.6.3.3.1 Page Meta Description ${unique}`
        const pageCityRegion = `AC-37.6.3.3.1 Page City ${unique}`
        const pageVenue = `AC-37.6.3.3.1 Page Venue ${unique}`
        const pagePhotographyType = 'wedding'

        // Story fixture — `seoTitle`/`metaDescription` are DECOY values,
        // deliberately different from `title`/`subtitleIntroduction`, to
        // actively prove trap (i): the story route never falls back to
        // them, so the search-result preview must ignore the decoys.
        const storySlug = `ac-37-6-3-3-1-story-${unique}`
        const storyTitle = `AC-37.6.3.3.1 Story Title ${unique}`
        const storySubtitleIntroduction = `AC-37.6.3.3.1 Story Subtitle Introduction ${unique}`
        const storyDecoySeoTitle = `AC-37.6.3.3.1 Story DECOY SEO Title ${unique}`
        const storyDecoyMetaDescription = `AC-37.6.3.3.1 Story DECOY Meta Description ${unique}`
        const storyCityRegion = `AC-37.6.3.3.1 Story City ${unique}`
        const storyVenue = `AC-37.6.3.3.1 Story Venue ${unique}`
        const storyPhotographyType = 'engagement'

        const pageRes = await fetch(`${base}/api/pages`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            internalName: `AC-37.6.3.3.1 Page ${unique}`,
            heading: pageHeading,
            slug: pageSlug,
            seoTitle: pageSeoTitle,
            metaDescription: pageMetaDescription,
            photographyType: pagePhotographyType,
            cityRegion: pageCityRegion,
            venue: pageVenue,
            // Draft, deliberately — keeps this fixture out of the OTHER
            // document's internal-link-suggestions candidate query, the
            // same hermetic choice AC-37.6.3.2 recorded.
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
        // seeding a real Backstage gallery.
        const placementRes = await fetch(`${base}/api/gallery-placements`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ gallerySlug: `ac-37-6-3-3-1-story-gallery-${unique}`, layout: 'masonry' }),
        })
        expect(placementRes.status).toBeLessThan(300)
        const placementBody = await placementRes.json()
        const placementId = (placementBody.doc ?? placementBody).id as string | number
        createdPlacementIds.push(placementId)

        const storyRes = await fetch(`${base}/api/stories`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            title: storyTitle,
            subtitleIntroduction: storySubtitleIntroduction,
            slug: storySlug,
            seoTitle: storyDecoySeoTitle,
            metaDescription: storyDecoyMetaDescription,
            photographyType: storyPhotographyType,
            cityRegion: storyCityRegion,
            venue: storyVenue,
            status: 'draft',
            sections: [
              {
                sectionHeading: `AC-37.6.3.3.1 Story Section ${unique}`,
                shortText: `Short text for the AC-37.6.3.3.1 story fixture ${unique}.`,
                galleryPlacement: placementId,
              },
            ],
          }),
        })
        expect(storyRes.status).toBeLessThan(300)
        const storyBody = await storyRes.json()
        const storyId = (storyBody.doc ?? storyBody).id as string | number
        createdStoryIds.push(storyId)

        // --- fetch each document's real admin edit view, SEQUENTIALLY (see file header) ---
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

        // --- expected values, computed the exact way the panel computes them ---
        const pagePath = `/${pageSlug}`
        const storyPath = `/stories/${storySlug}`
        // Exact because the spawned server's NEXT_PUBLIC_SITE_URL is this
        // same `base` — the identical technique
        // us37-ac37.4.3-sitemap-image-references-live.test.ts already uses.
        const pageCanonicalUrl = new URL(pagePath, base).toString()
        const storyCanonicalUrl = new URL(storyPath, base).toString()

        // Trap (i): the page's resolved title segment falls back
        // seoTitle||heading; the story's is `title` ALONE.
        const pageResolvedTitleSegment = pageSeoTitle
        const storyResolvedTitleSegment = storyTitle
        const pageResolvedDescription = pageMetaDescription
        const storyResolvedDescription = storySubtitleIntroduction

        // --- Page: the four DERIVED controls, against the page's own value ---
        const pageSearchPreview = extractSection(pageHtml, 'seo-assistant-search-preview')
        expect(paragraphText(pageSearchPreview, 'seo-assistant-search-preview-title')).toBe(
          escapeHtmlText(applyTitlePattern(pageResolvedTitleSegment, studioProfile.defaultTitlePattern)),
        )
        expect(paragraphText(pageSearchPreview, 'seo-assistant-search-preview-url')).toBe(
          escapeHtmlText(pageCanonicalUrl),
        )
        expect(paragraphText(pageSearchPreview, 'seo-assistant-search-preview-description')).toBe(
          escapeHtmlText(pageResolvedDescription),
        )

        const pageCanonicalSection = extractSection(pageHtml, 'seo-assistant-canonical-url')
        expect(plainParagraphText(pageCanonicalSection)).toBe(escapeHtmlText(pageCanonicalUrl))

        const pageH1Section = extractSection(pageHtml, 'seo-assistant-h1-preview')
        expect(plainParagraphText(pageH1Section)).toBe(escapeHtmlText(pageHeading))

        const pageSchemaSection = extractSection(pageHtml, 'seo-assistant-schema-preview')
        const pageSchema = schemaPreviewJson(pageSchemaSection)
        const expectedPageSchema = buildPageStructuredData(studioProfile, {
          url: pageCanonicalUrl,
          photographyType: pagePhotographyType,
          cityRegion: pageCityRegion,
          venue: pageVenue,
        })
        expect(pageSchema.url).toBe(pageCanonicalUrl)
        expect(pageSchema['@type']).toEqual(['LocalBusiness', 'ProfessionalService'])
        expect(pageSchema).toEqual(expectedPageSchema)

        // --- Story: the identical four recipes, reproduced on /admin/collections/stories/:id ---
        const storySearchPreview = extractSection(storyHtml, 'seo-assistant-search-preview')
        const storyPreviewTitle = paragraphText(storySearchPreview, 'seo-assistant-search-preview-title')
        expect(storyPreviewTitle).toBe(
          escapeHtmlText(applyTitlePattern(storyResolvedTitleSegment, studioProfile.defaultTitlePattern)),
        )
        // Trap (i), proven rather than assumed: the decoy seoTitle never reaches the preview.
        expect(storyPreviewTitle).not.toContain(storyDecoySeoTitle)

        expect(paragraphText(storySearchPreview, 'seo-assistant-search-preview-url')).toBe(
          escapeHtmlText(storyCanonicalUrl),
        )
        const storyPreviewDescription = paragraphText(storySearchPreview, 'seo-assistant-search-preview-description')
        expect(storyPreviewDescription).toBe(escapeHtmlText(storyResolvedDescription))
        // Trap (i), proven rather than assumed: the decoy metaDescription never reaches the preview.
        expect(storyPreviewDescription).not.toContain(storyDecoyMetaDescription)

        const storyCanonicalSection = extractSection(storyHtml, 'seo-assistant-canonical-url')
        expect(plainParagraphText(storyCanonicalSection)).toBe(escapeHtmlText(storyCanonicalUrl))

        const storyH1Section = extractSection(storyHtml, 'seo-assistant-h1-preview')
        expect(plainParagraphText(storyH1Section)).toBe(escapeHtmlText(storyTitle))

        const storySchemaSection = extractSection(storyHtml, 'seo-assistant-schema-preview')
        const storySchema = schemaPreviewJson(storySchemaSection)
        const expectedStorySchema = buildStoryStructuredData(studioProfile, {
          url: storyCanonicalUrl,
          title: storyTitle,
          description: storySubtitleIntroduction || undefined,
          image: studioProfile.defaultSocialImage?.url || undefined,
        })
        expect(storySchema.url).toBe(storyCanonicalUrl)
        // Different shape from the page's — a CreativeWork, not a
        // LocalBusiness/ProfessionalService array — not one assertion
        // applied twice.
        expect(storySchema['@type']).toBe('CreativeWork')
        expect(storySchema).toEqual(expectedStorySchema)

        // --- negative pass: neither edit view contains the other document's DERIVED-control values ---
        for (const value of [
          storyTitle,
          storySubtitleIntroduction,
          storyCanonicalUrl,
          storyCityRegion,
          storyVenue,
          storyDecoySeoTitle,
          storyDecoyMetaDescription,
        ]) {
          expect(pageHtml).not.toContain(value)
        }
        for (const value of [pageHeading, pageSeoTitle, pageMetaDescription, pageCanonicalUrl, pageCityRegion, pageVenue]) {
          expect(storyHtml).not.toContain(value)
        }
      } finally {
        for (const id of createdPageIds) {
          await fetch(`${base}/api/pages/${id}`, { method: 'DELETE', headers: jsonHeaders }).catch(() => undefined)
        }
        for (const id of createdStoryIds) {
          await fetch(`${base}/api/stories/${id}`, { method: 'DELETE', headers: jsonHeaders }).catch(() => undefined)
        }
        for (const id of createdPlacementIds) {
          await fetch(`${base}/api/gallery-placements/${id}`, { method: 'DELETE', headers: jsonHeaders }).catch(
            () => undefined,
          )
        }
        await killServer(child)
      }
    },
    180000,
  )
})
