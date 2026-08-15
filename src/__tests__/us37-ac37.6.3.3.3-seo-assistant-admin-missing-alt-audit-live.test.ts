/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us37-ac37.6.3.3.3-seo-assistant-admin-missing-alt-audit-live.test.ts
 * project: earthandhoney
 * purpose: Verify AC-37.6.3.3.3 — the sixth and last of AC-37.6.2's six
 *          DERIVED SEO Assistant controls, the missing-alt-text audit, is
 *          shown present and functional in the REAL admin in its NON-EMPTY
 *          state, against real placed photos. SEO_ASSISTANT_ADMIN_OBSERVABILITY.md's
 *          §Not covered records that row 13 was only ever observed in its
 *          EMPTY state — AC-37.6.3.1 seeded no gallery, and AC-37.6.3.2/
 *          AC-37.6.3.3.1/AC-37.6.3.3.2 all deliberately scoped themselves away
 *          from placed imagery (their own headers say so) — so this suite is
 *          the one that closes it, read with row 13's exact recipe: section
 *          `data-testid="seo-assistant-missing-alt-audit"`, one
 *          `<li data-testid="seo-assistant-missing-alt-audit-item">` per
 *          audited image, with `<p data-testid="seo-assistant-missing-alt-audit-empty">`
 *          proven ABSENT — proof the non-empty branch actually rendered
 *          rather than assumed.
 *          Seeding reuses `seedLiveBackstageGalleryWithPhoto` lifted verbatim
 *          from `us37-ac37.4.3-sitemap-image-references-live.test.ts`,
 *          `GALLERY_NAME` included unchanged, so both suites share ONE
 *          reusable fixture gallery rather than accumulating a second one;
 *          the helper is idempotent by design, and (matching that suite's own
 *          recorded reasoning) the seeded Backstage gallery and its photo are
 *          deliberately never deleted here either.
 *          Exactly one real `gallery-placements` row is created, pointing at
 *          that one real gallery slug, and is attached to BOTH a real `pages`
 *          document (via `galleryPlacements`) AND a real `stories` document
 *          (via `sections[].galleryPlacement`) — proving the audit on a page
 *          does not prove it on a story, since `SeoAssistantField` extracts
 *          gallery slugs from those two different relationship shapes
 *          (`buildInputForPage`/`buildInputForStory`,
 *          src/components/admin/SeoAssistant/SeoAssistantField.tsx). Reusing
 *          the SAME placement row for both documents (rather than one per
 *          document, the way AC-37.6.3.2/.3.3.1/.3.3.2 do for their
 *          schema-satisfying, image-irrelevant story placements) is
 *          deliberate here: this AC's audit assertions need the page and the
 *          story to resolve the identical real gallery, not two unrelated
 *          ones.
 *          The expected item text is never hardcoded: it is read from the
 *          same Flow A call the admin itself resolves through —
 *          `resolveGalleryPlacementImages` (src/lib/backstageGalleryPlacement.ts)
 *          — at run time, and compared by set equality against the rendered
 *          `<li>` text, mirroring exactly what SeoAssistantPanel.tsx renders
 *          per entry (`entry.fallbackAlt || entry.imageId`) and what
 *          src/lib/seoAssistant.ts's `auditMissingAltText` reports: EVERY
 *          resolved image, never a filtered subset, because PicPeak photo
 *          rows carry no alt column at all (both files' own headers). Never a
 *          second Backstage client, never a cross-database read of the
 *          Backstage schema.
 *          Both fixtures are created `status: 'draft'` — the identical
 *          hermetic reason AC-37.6.3.2/AC-37.6.3.3.1 recorded: draft keeps
 *          both out of the OTHER document's internal-link-suggestions
 *          candidate query (`resolveCandidates` matches published documents
 *          only), which is AC-37.6.3.3.2's subject, not this one's. Draft
 *          status has no bearing on the audit itself — it is not
 *          publish-gated.
 *          No `media` upload: the audited images come from Backstage, not
 *          from Payload's `media` collection, so there is no Open Graph image
 *          to seed here and no `hasLiveR2Config()` gate — inheriting that
 *          gate (AC-37.6.3.2's, which genuinely does upload `media`) would
 *          silently skip this entire suite in any environment without a real
 *          R2 bucket.
 *          Needs both `dns.lookup('db')` and `dns.lookup('backstage-backend')`
 *          to resolve, the same dual gate
 *          `us37-ac37.4.3-sitemap-image-references-live.test.ts` uses, since
 *          this suite (like that one) talks to both the Payload/Postgres
 *          stack and the live Backstage admin API.
 *          Runs on port 4313 — ports 4278-4312 are already claimed by earlier
 *          live suites in this repository. Reuses `extractSection`
 *          (AC-37.6.3.3.1's recipe helper, reused verbatim the same way
 *          AC-37.6.3.3.2 already did) and `getLiveApiAuthToken`
 *          (src/test-support/liveApiAuth.ts) rather than a private login
 *          helper.
 *          The suite deletes the `pages`, `stories` and `gallery-placements`
 *          documents it creates; the Backstage gallery/photo are the shared,
 *          intentionally-persistent fixture described above.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.3.3.3
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import fs from 'fs'
import path from 'path'

import { resolveGalleryPlacementImages } from '@/lib/backstageGalleryPlacement'
import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4313
// Unchanged from us37-ac37.4.3-sitemap-image-references-live.test.ts — both
// suites share this one reusable fixture gallery rather than accumulating a
// second one.
const GALLERY_NAME = 'US-37 AC-37.4.3 sitemap image reference live verification gallery'
const FIXTURE_IMAGE_PATH = path.join(root, 'vendor/picpeak/test-assets/img1.png')
const UPLOAD_DEADLINE_MS = 25000

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
 * Lifted verbatim from us37-ac37.4.3-sitemap-image-references-live.test.ts —
 * see that file's own header. Self-seeds (finds-or-creates and publishes) a
 * real Backstage gallery, then find-or-uploads a photo into it and polls the
 * SAME Flow A boundary the admin itself resolves through
 * (resolveGalleryPlacementImages) until the async upload pipeline has
 * processed it. Idempotent across runs: a gallery that already holds a
 * processed photo is returned as-is, no re-upload.
 */
async function seedLiveBackstageGalleryWithPhoto(): Promise<string> {
  const base = process.env.BACKSTAGE_BACKEND_URL || 'http://backstage-backend:3000'
  const adminUsername = process.env.BACKSTAGE_ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.BACKSTAGE_ADMIN_PASSWORD || 'change-me-in-production'

  const loginRes = await fetch(`${base}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: adminUsername, password: adminPassword }),
  })
  expect(loginRes.status).toBe(200)
  const setCookie = loginRes.headers.get('set-cookie') || ''
  const adminCookie = setCookie.split(';')[0]
  const authHeaders = { 'Content-Type': 'application/json', Cookie: adminCookie }

  const searchRes = await fetch(`${base}/api/admin/events?search=${encodeURIComponent(GALLERY_NAME)}`, {
    headers: authHeaders,
  })
  expect(searchRes.status).toBe(200)
  const searchBody = (await searchRes.json()) as { events: Array<{ id: number; slug: string; is_draft: boolean }> }

  let slug: string
  let eventId: number
  if (searchBody.events.length > 0) {
    slug = searchBody.events[0].slug
    eventId = searchBody.events[0].id
    if (searchBody.events[0].is_draft) {
      await fetch(`${base}/api/admin/events/${eventId}/publish`, { method: 'POST', headers: authHeaders })
    }
  } else {
    const createRes = await fetch(`${base}/api/admin/events`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        event_name: GALLERY_NAME,
        event_type: 'other',
        event_date: '2026-09-01',
        customer_name: 'AC-37.4.3 Verification',
        customer_email: 'verify-us37-ac37.4.3@example.com',
        admin_email: adminUsername.includes('@') ? adminUsername : 'admin@example.com',
        password: '',
        expires_at: '2026-12-01',
        require_password: false,
      }),
    })
    expect(createRes.status).toBeLessThan(300)
    const created = (await createRes.json()) as { id: number; slug: string }
    slug = created.slug
    eventId = created.id
    const publishRes = await fetch(`${base}/api/admin/events/${eventId}/publish`, {
      method: 'POST',
      headers: authHeaders,
    })
    expect(publishRes.status).toBe(200)
  }

  // Find-or-upload: skip re-uploading when the gallery already holds a
  // fully processed photo, so repeated runs stay idempotent rather than
  // accumulating photos in the shared verification gallery.
  const existing = await resolveGalleryPlacementImages(slug)
  if (existing.status === 'ok' && existing.images.length > 0) {
    return slug
  }

  const fileBytes = fs.readFileSync(FIXTURE_IMAGE_PATH)
  const form = new FormData()
  form.append('photos', new Blob([new Uint8Array(fileBytes)], { type: 'image/png' }), 'ac-37.4.3-fixture.png')

  const uploadRes = await fetch(`${base}/api/admin/photos/${eventId}/upload`, {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: form,
  })
  expect(uploadRes.status).toBeLessThan(300)

  // The admin upload route inserts a `processing_status: 'pending'` row and
  // returns immediately — EXIF/thumbnails/webhook all happen asynchronously
  // in services/backgroundProcessor.js's poll loop. Poll the exact boundary
  // the admin itself resolves through, rather than assuming a fixed delay.
  const deadline = Date.now() + UPLOAD_DEADLINE_MS
  while (Date.now() < deadline) {
    const result = await resolveGalleryPlacementImages(slug)
    if (result.status === 'ok' && result.images.length > 0) {
      return slug
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error(`Gallery ${slug} did not show a processed photo within ${UPLOAD_DEADLINE_MS}ms`)
}

// --- AC-37.6.3.3.1's recipe helper, reused verbatim (§(b), rows 9-14 family) ---

/** The `<section data-testid="X">...</section>` block for one DERIVED control, so an assertion is scoped to that control rather than the whole document. */
function extractSection(html: string, testid: string): string {
  const match = html.match(new RegExp(`data-testid="${testid}"[\\s\\S]*?<\\/section>`))
  if (!match) {
    throw new Error(`Section with data-testid="${testid}" not found in the admin edit view`)
  }
  return match[0]
}

/** Every `<li data-testid="seo-assistant-missing-alt-audit-item">` text in a section — the exact shape SeoAssistantPanel.tsx renders, one per audited image. */
function parseAuditItemTexts(section: string): string[] {
  const items = section.match(/<li data-testid="seo-assistant-missing-alt-audit-item">([\s\S]*?)<\/li>/g) ?? []
  return items.map((item) => {
    const match = item.match(/<li data-testid="seo-assistant-missing-alt-audit-item">([\s\S]*?)<\/li>/)
    if (!match) {
      throw new Error(`Unrecognized missing-alt-audit-item markup: ${item}`)
    }
    return match[1]
  })
}

/** React's own text-content escaping, so an assertion on a real value compares against what the admin actually emitted (the same trap AC-37.6.3.3.1's recipe already accounts for). */
function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

describe('AC-37.6.3.3.3: the missing-alt-text audit, live and NON-EMPTY, against a real pages document and a real stories document', () => {
  it(
    "both a real page's and a real story's edit view list every one of the gallery's real photos in the missing-alt-text audit, with the empty state proven absent",
    async () => {
      try {
        await dns.lookup('db')
        await dns.lookup('backstage-backend')
      } catch {
        // Not running inside the project's Docker network — skip the live round trip.
        return
      }

      const liveGallerySlug = await seedLiveBackstageGalleryWithPhoto()

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

        const unique = Date.now()

        // The expected item text, read from the SAME Flow A call the admin
        // itself resolves through — never hardcoded.
        const flowAResult = await resolveGalleryPlacementImages(liveGallerySlug)
        expect(flowAResult.status).toBe('ok')
        if (flowAResult.status !== 'ok') return // unreachable; narrows the type for TS below
        expect(flowAResult.images.length).toBeGreaterThan(0)
        // Mirrors SeoAssistantPanel.tsx's own per-entry render exactly.
        const expectedItemTexts = new Set(
          flowAResult.images.map((image) => escapeHtmlText(image.alt || image.id)),
        )

        // ONE gallery-placements row, pointing at the one real gallery,
        // attached to BOTH the page and the story below — see file header.
        const placementRes = await fetch(`${base}/api/gallery-placements`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ gallerySlug: liveGallerySlug, layout: 'masonry' }),
        })
        expect(placementRes.status).toBeLessThan(300)
        const placementBody = await placementRes.json()
        const placementId = (placementBody.doc ?? placementBody).id as string | number
        createdPlacementIds.push(placementId)

        const pageSlug = `ac-37-6-3-3-3-page-${unique}`
        const pageRes = await fetch(`${base}/api/pages`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            internalName: `AC-37.6.3.3.3 Page ${unique}`,
            heading: `AC-37.6.3.3.3 Page Heading ${unique}`,
            slug: pageSlug,
            galleryPlacements: [placementId],
            // Draft, deliberately — keeps this fixture out of the OTHER
            // document's internal-link-suggestions candidate query, the same
            // hermetic choice AC-37.6.3.2/AC-37.6.3.3.1 recorded. Has no
            // bearing on the audit itself, which is not publish-gated.
            status: 'draft',
          }),
        })
        expect(pageRes.status).toBeLessThan(300)
        const pageBody = await pageRes.json()
        const pageId = (pageBody.doc ?? pageBody).id as string | number
        createdPageIds.push(pageId)

        const storySlug = `ac-37-6-3-3-3-story-${unique}`
        const storyRes = await fetch(`${base}/api/stories`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            title: `AC-37.6.3.3.3 Story ${unique}`,
            slug: storySlug,
            status: 'draft',
            sections: [
              {
                sectionHeading: `AC-37.6.3.3.3 Story Section ${unique}`,
                shortText: `Short text for the AC-37.6.3.3.3 story fixture ${unique}.`,
                // The SAME placement as the page — proving the audit
                // resolves through sections[].galleryPlacement, a different
                // relationship shape than the page's galleryPlacements, not
                // merely repeating the page's own proof.
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

        // --- the missing-alt-text audit, NON-EMPTY, on the page ---
        const pageAuditSection = extractSection(pageHtml, 'seo-assistant-missing-alt-audit')
        // The empty state proven ABSENT — proof the non-empty branch
        // actually rendered rather than assumed.
        expect(pageAuditSection).not.toContain('data-testid="seo-assistant-missing-alt-audit-empty"')
        const pageItemTexts = new Set(parseAuditItemTexts(pageAuditSection))
        expect(pageItemTexts).toEqual(expectedItemTexts)
        expect(pageItemTexts.size).toBe(flowAResult.images.length)

        // --- the identical audit, NON-EMPTY, on the story ---
        const storyAuditSection = extractSection(storyHtml, 'seo-assistant-missing-alt-audit')
        expect(storyAuditSection).not.toContain('data-testid="seo-assistant-missing-alt-audit-empty"')
        const storyItemTexts = new Set(parseAuditItemTexts(storyAuditSection))
        expect(storyItemTexts).toEqual(expectedItemTexts)
        expect(storyItemTexts.size).toBe(flowAResult.images.length)
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
        // The Backstage gallery/photo are the shared, intentionally
        // persistent fixture (see file header and
        // us37-ac37.4.3-sitemap-image-references-live.test.ts's own
        // reasoning) — never deleted here.
        await killServer(child)
      }
    },
    180000,
  )
})
