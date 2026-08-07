/**
 * ---
 * file: src/__tests__/us26-ac26.4.1.2-webhook-live-proof-fixtures.test.ts
 * project: earthandhoney
 * purpose: Verify AC-26.4.1.2 — the publish proof's fixtures. The proof
 *          itself is a live run against the running stack, recorded as
 *          section (d) of `WEBHOOK_LIVE_PROOF.md`, reusing rather than
 *          rebuilding the harness AC-26.4.1.1 stood up; what this suite
 *          pins is everything that has to stay true for that recorded
 *          section to keep meaning what it says:
 *          (1) section (d) exists, follows the AC-26.4.1.1 sections and the
 *              closing signature check, and names both proof galleries by
 *              the same slugs the code (WEBHOOK_LIVE_PROOF_GALLERY_SLUGS)
 *              maps to the Frontstage route;
 *          (2) both galleries are recorded as created with `is_draft: true`
 *              and section (d) never calls the publish route — this
 *              criterion sets up fixtures, it does not publish;
 *          (3) a matching Payload `gallery-placements` document is recorded
 *              for each slug; and
 *          (4) the named Frontstage page is shown live, rendering its
 *              pre-publish "unavailable" state for both galleries.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.4.1.2
 * ---
 */
import fs from 'fs'
import path from 'path'

import { WEBHOOK_LIVE_PROOF_GALLERY_PATH, WEBHOOK_LIVE_PROOF_GALLERY_SLUGS } from '@/lib/galleryRevalidation'

const REPO_ROOT = path.join(__dirname, '..', '..')
const DOC_PATH = path.join(REPO_ROOT, 'WEBHOOK_LIVE_PROOF.md')

function readDoc(): string {
  return fs.readFileSync(DOC_PATH, 'utf8')
}

/**
 * The `## (d)` section of WEBHOOK_LIVE_PROOF.md, up to the next top-level
 * section (`## (e)`, added by AC-26.4.1.3.1) or end of file if none follows.
 */
function sectionD(): string {
  const doc = readDoc()
  const start = doc.indexOf('## (d)')
  expect(start).toBeGreaterThan(-1)
  const nextSectionIndex = doc.indexOf('## (e)', start)
  return nextSectionIndex === -1 ? doc.slice(start) : doc.slice(start, nextSectionIndex)
}

describe('AC-26.4.1.2: WEBHOOK_LIVE_PROOF.md records the publish proof fixtures as section (d)', () => {
  it('section (d) follows sections (a)-(c) and the AC-26.4.1.1 closing signature check', () => {
    const doc = readDoc()
    const aIndex = doc.indexOf('## (a)')
    const bIndex = doc.indexOf('## (b)')
    const cIndex = doc.indexOf('## (c)')
    const closingIndex = doc.indexOf('## Closing live check')
    const dIndex = doc.indexOf('## (d)')
    expect(aIndex).toBeGreaterThan(-1)
    expect(bIndex).toBeGreaterThan(aIndex)
    expect(cIndex).toBeGreaterThan(bIndex)
    expect(closingIndex).toBeGreaterThan(cIndex)
    expect(dIndex).toBeGreaterThan(closingIndex)
  })

  it('names both proof galleries by the exact slugs the code maps to the Frontstage route', () => {
    const section = sectionD()
    expect(WEBHOOK_LIVE_PROOF_GALLERY_SLUGS).toHaveLength(2)
    for (const slug of WEBHOOK_LIVE_PROOF_GALLERY_SLUGS) {
      expect(section).toContain(slug)
    }
  })

  it('records both galleries created as drafts, and never calls the publish route', () => {
    const section = sectionD()
    expect(section).toMatch(/"is_draft":true/)
    expect(section).not.toMatch(/events\/\d+\/publish/)
    expect(section).not.toContain('event.published')
  })

  it('records a matching Payload gallery-placements document for each slug', () => {
    const section = sectionD()
    expect(section).toContain('gallery-placements')
    expect(section.match(/placement id/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('shows the named Frontstage page live, rendering its pre-publish unavailable state for both galleries', () => {
    const section = sectionD()
    expect(section).toContain(WEBHOOK_LIVE_PROOF_GALLERY_PATH)
    const unavailableMatches = section.match(/data-testid="webhook-proof-unavailable"/g)
    expect(unavailableMatches?.length).toBeGreaterThanOrEqual(2)
    for (const slug of WEBHOOK_LIVE_PROOF_GALLERY_SLUGS) {
      expect(section).toMatch(new RegExp(`data-gallery-slug="${slug}"`))
    }
    expect(section).not.toContain('data-testid="webhook-proof-gallery"')
  })

  it('records the out-of-order-consumption finding and its fix through the supported delete route, not a database edit', () => {
    const section = sectionD()
    expect(section).toMatch(/already[- ]published/)
    expect(section).toContain('DELETE')
    expect(section).toContain('/api/admin/events/')
  })
})
