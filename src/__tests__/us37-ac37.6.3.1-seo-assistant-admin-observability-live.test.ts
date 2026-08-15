/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us37-ac37.6.3.1-seo-assistant-admin-observability-live.test.ts
 * project: earthandhoney
 * purpose: Verify AC-37.6.3.1 — the connective tissue for proving the SEO
 *          Assistant in the REAL Payload admin, stood up once and recorded in
 *          SEO_ASSISTANT_ADMIN_OBSERVABILITY.md so AC-37.6.3.2 and
 *          AC-37.6.3.3 reuse it instead of rediscovering it, the same
 *          harness-first shape US-26 used for WEBHOOK_LIVE_PROOF.md
 *          (AC-26.4.1.1). Every prior live suite in this project talks to
 *          `/api/*` or a public frontend route with an `Authorization: JWT`
 *          header; none has ever fetched a Payload ADMIN page over HTTP, so
 *          this suite is the first to map how `/admin/collections/pages/:id`
 *          authenticates and what of a document's values its response
 *          actually carries.
 *          Deliberately scoped to ONE document: creates exactly one real
 *          `pages` row carrying all eight AC-37.6.1 authored fields (minus
 *          `socialImage`, which needs a `media` upload this AC's scope
 *          forbids — see below) and deletes it. Uploads NO `media`, creates
 *          NO `stories` row, seeds NO Backstage gallery and creates NO
 *          `gallery-placements` row — that seeding is AC-37.6.3.2's and
 *          AC-37.6.3.3's, and pulling it in here would reintroduce the cost
 *          this split exists to remove (see SEO_ASSISTANT_ADMIN_OBSERVABILITY.md
 *          §NOT COVERED). Gated on `dns.lookup('db')` only — no
 *          `backstage-backend` gate, since this suite never talks to
 *          Backstage.
 *          Proves two things against the running admin: (a) THE AUTHENTICATED
 *          FETCH — a real Payload session cookie (`payload-token=<jwt>`, the
 *          exact cookie `POST /api/users/login` sets, keyed off the default
 *          `cookiePrefix: 'payload'` this project's payload.config.ts never
 *          overrides — confirmed live below, not assumed) makes
 *          `/admin/collections/pages/:id` return the real edit view, and the
 *          SAME URL fetched with no cookie does NOT return it; (b) each of
 *          the fourteen PRD §21.2 controls' documented read recipe,
 *          applied to that one page's fetched HTML, reproduces either the
 *          page's own real value (the five plain-input/textarea AUTHORED
 *          fields and the six DERIVED sections addressable by
 *          `data-testid`) or the documented hydration-deferred form-state
 *          value (photographyType, indexing — both AUTHORED `select`
 *          widgets that emit only a `shimmer-effect` placeholder in the
 *          initial SSR HTML, per this suite's own live confirmation) or, for
 *          `socialImage` and the two content-dependent DERIVED sections
 *          (missing-alt-text audit, internal-link suggestions), the
 *          documented "not populated by this AC's scope" finding — a
 *          recorded, passing outcome per AC-37.6.3.1's own pass condition,
 *          which asks that every recipe reproduce, not that every control
 *          turn out non-empty.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.3.1
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4309

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

/** React's own text-content escaping, so an assertion on a real value compares against what the admin actually emitted. */
function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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

/** Mirrors src/lib/seoAssistant.ts's own `applyTitlePattern`, so the expected search-preview title is composed the way the panel composes it. */
function applyTitlePattern(titleSegment: string, pattern: string): string {
  return pattern.includes('%s') ? pattern.replace('%s', titleSegment) : titleSegment || pattern
}

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
 * `upload`) in its form-state payload. Those widgets render only a
 * `shimmer-effect` placeholder in the initial SSR HTML (confirmed live by
 * this suite's own "hydration-deferred fields render only a placeholder"
 * assertion below), so this payload — embedded verbatim as a JSON string
 * inside Next's flight script, hence the single-backslash-escaped quotes —
 * is where that control's real value actually is. Matched only in the
 * `initialState` shape (`{"value":...`), never the flat `initialData` copy,
 * so it is genuinely the control's state.
 */
function formStateValue(html: string, fieldName: string): unknown {
  const q = '\\\\"'
  const match = html.match(new RegExp(`${q}${fieldName}${q}:\\{${q}value${q}:(.*?),${q}initialValue${q}`))
  if (!match) {
    throw new Error(`No form-state entry for "${fieldName}" in the admin edit view`)
  }
  return JSON.parse(match[1].replace(/\\"/g, '"'))
}

describe('AC-37.6.3.1: authenticated admin fetch and the fourteen-control observation recipe, live against one real page', () => {
  it(
    "the session cookie authenticates the admin edit view, and each recipe reads this page's own real value out of it",
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

      let apiHeaders: { Authorization: string; 'Content-Type': string } | undefined
      const createdPageIds: Array<string | number> = []

      try {
        await waitForServer(`${base}/api/users`, 60000)

        const token = await getLiveApiAuthToken(base)
        apiHeaders = { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' }
        // The exact cookie POST /api/users/login sets for this JWT (Payload's
        // extractJWT `cookie` strategy reads `<cookiePrefix>-token` — see
        // node_modules/payload/dist/auth/extractJWT.js and
        // node_modules/payload/dist/auth/cookies.js's generatePayloadCookie —
        // and this project's payload.config.ts never overrides the default
        // `cookiePrefix: 'payload'`) — used ONLY for the admin-view fetches
        // below, never alongside the Authorization header, so the admin
        // panel's own cookie-auth path is genuinely exercised rather than
        // shadowed by the JWT-header strategy every other live suite uses.
        const sessionCookie = `payload-token=${token}`

        const profileRes = await fetch(`${base}/api/globals/studio-profile`, { headers: apiHeaders })
        expect(profileRes.status).toBe(200)
        const titlePattern = ((await profileRes.json()) as { defaultTitlePattern?: string }).defaultTitlePattern || ''
        expect(titlePattern).toContain('%s')

        const unique = Date.now()
        const pageSlug = `ac-37-6-3-1-page-${unique}`
        const pageHeading = `AC-37.6.3.1 Page Heading ${unique}`
        const pageSeoTitle = `AC-37.6.3.1 Page SEO Title ${unique}`
        const pageMetaDescription = `AC-37.6.3.1 Page Meta Description ${unique}`
        const pageCityRegion = `AC-37.6.3.1 Page City ${unique}`
        const pageVenue = `AC-37.6.3.1 Page Venue ${unique}`
        const pagePhotographyType = 'wedding'
        const pageIndexing = 'noindex'

        // Every AC-37.6.1 AUTHORED field this AC's scope permits — all eight
        // except `socialImage`, which needs a `media` upload this AC
        // deliberately does not perform (see file header and
        // SEO_ASSISTANT_ADMIN_OBSERVABILITY.md §NOT COVERED).
        const pageRes = await fetch(`${base}/api/pages`, {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify({
            internalName: `AC-37.6.3.1 Page ${unique}`,
            heading: pageHeading,
            slug: pageSlug,
            seoTitle: pageSeoTitle,
            metaDescription: pageMetaDescription,
            photographyType: pagePhotographyType,
            cityRegion: pageCityRegion,
            venue: pageVenue,
            indexing: pageIndexing,
            status: 'published',
          }),
        })
        expect(pageRes.status).toBeLessThan(300)
        const pageBody = await pageRes.json()
        const pageId = (pageBody.doc ?? pageBody).id as number
        createdPageIds.push(pageId)

        const adminUrl = `${base}/admin/collections/pages/${pageId}`

        // --- (a) THE AUTHENTICATED FETCH ---
        const authedRes = await fetch(adminUrl, { headers: { Cookie: sessionCookie } })
        expect(authedRes.status).toBe(200)
        const html = await authedRes.text()
        expect(html).toContain('data-testid="seo-assistant-panel"')
        expect(html).toContain(`id="field-seoTitle"`)

        // The cookie is doing real work: the identical URL, no cookie,
        // returns neither the assistant panel nor this document's values.
        const anonymousRes = await fetch(adminUrl)
        const anonymousHtml = await anonymousRes.text()
        expect(anonymousHtml).not.toContain('data-testid="seo-assistant-panel"')
        expect(anonymousHtml).not.toContain(pageSeoTitle)

        // --- (b) the fourteen-control observation recipe, each against this page's own value ---

        // AUTHORED, plain input/textarea (5).
        expect(authoredInputValue(html, 'seoTitle')).toBe(pageSeoTitle)
        expect(authoredInputValue(html, 'slug')).toBe(pageSlug)
        expect(authoredTextareaValue(html, 'metaDescription')).toBe(pageMetaDescription)
        expect(authoredInputValue(html, 'cityRegion')).toBe(pageCityRegion)
        expect(authoredInputValue(html, 'venue')).toBe(pageVenue)

        // AUTHORED, hydration-deferred `select` widgets (2): confirmed live
        // that the initial SSR HTML carries no literal option text for
        // these fields, only a shimmer placeholder — the reason their
        // recipe reads the form-state payload instead.
        expect(html).not.toContain('>Wedding<')
        expect(html).not.toContain('>Noindex<')
        const photographyTypeField = html.slice(html.indexOf('id="field-photographyType"') - 400, html.indexOf('id="field-photographyType"') + 400)
        expect(photographyTypeField).toContain('shimmer-effect')
        expect(formStateValue(html, 'photographyType')).toBe(pagePhotographyType)
        expect(formStateValue(html, 'indexing')).toBe(pageIndexing)

        // AUTHORED, `socialImage` (upload widget, hydration-deferred): this
        // AC's scope uploads no media, so the documented finding is that the
        // control's mechanism (form-state key `socialImage`) is confirmed,
        // and this page's real observed value is `null` — not "not
        // observable", a genuinely-read absence.
        expect(formStateValue(html, 'socialImage')).toBeNull()

        // DERIVED (6), each scoped to its own data-testid section.
        const searchPreview = extractSection(html, 'seo-assistant-search-preview')
        expect(paragraphText(searchPreview, 'seo-assistant-search-preview-title')).toBe(
          escapeHtmlText(applyTitlePattern(pageSeoTitle, titlePattern)),
        )
        const canonicalUrl = `${base}/${pageSlug}`
        expect(paragraphText(searchPreview, 'seo-assistant-search-preview-url')).toBe(escapeHtmlText(canonicalUrl))
        expect(paragraphText(searchPreview, 'seo-assistant-search-preview-description')).toBe(
          escapeHtmlText(pageMetaDescription),
        )

        const canonicalSection = extractSection(html, 'seo-assistant-canonical-url')
        expect(plainParagraphText(canonicalSection)).toBe(escapeHtmlText(canonicalUrl))

        const h1Section = extractSection(html, 'seo-assistant-h1-preview')
        expect(plainParagraphText(h1Section)).toBe(escapeHtmlText(pageHeading))

        const schemaSection = extractSection(html, 'seo-assistant-schema-preview')
        expect(schemaSection).toContain('data-testid="seo-assistant-schema-preview-json"')
        expect(schemaSection).toContain(`&quot;url&quot;: &quot;${canonicalUrl}&quot;`)

        // Missing-alt-text audit: this AC's scope seeds no gallery, so the
        // documented finding is the panel's own real "nothing to audit"
        // state — not a guess, the actual empty-state markup.
        const missingAltSection = extractSection(html, 'seo-assistant-missing-alt-audit')
        expect(missingAltSection).toContain('data-testid="seo-assistant-missing-alt-audit-empty"')

        // Internal-link suggestions: content-dependent on what else is
        // published in the database at run time (this AC creates no other
        // document) — the recipe is proven to read one of the panel's two
        // real render branches, whichever is actually true right now.
        const internalLinksSection = extractSection(html, 'seo-assistant-internal-link-suggestions')
        const hasSuggestions = internalLinksSection.includes('data-testid="seo-assistant-internal-link-suggestion-item"')
        const hasEmptyState = internalLinksSection.includes('data-testid="seo-assistant-internal-link-suggestions-empty"')
        expect(hasSuggestions || hasEmptyState).toBe(true)
      } finally {
        for (const id of createdPageIds) {
          await fetch(`${base}/api/pages/${id}`, { method: 'DELETE', headers: apiHeaders }).catch(() => undefined)
        }
        await killServer(child)
      }
    },
    180000,
  )
})
