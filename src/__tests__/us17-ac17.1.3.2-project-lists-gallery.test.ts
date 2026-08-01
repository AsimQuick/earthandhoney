/**
 * ---
 * file: src/__tests__/us17-ac17.1.3.2-project-lists-gallery.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.1.3.2 — PIVOT_AUDIT.md records proof that the
 *          Project-to-Gallery direction resolves: opening or querying the
 *          AC-17.1.2 Project lists the AC-17.1.3.1 Gallery. Pins the exact
 *          query and output recorded in the audit, and independently
 *          re-verifies the cited route file/line against the pinned
 *          vendored fork.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.1.3.2
 * ---
 */

// The proof itself was exercised live on 2026-07-31 against the running
// Backstage (`docker compose --profile backstage`, per BACKSTAGE_STARTUP.md):
// GET /api/admin/projects/1/overview was called as the seeded administrator
// against the AC-17.1.2 Project and the AC-17.1.3.1 Gallery already created
// on that run. That run needs a Docker daemon and a live Backstage, so it is
// not repeatable inside Jest — this suite pins the recorded evidence so it
// cannot silently rot out of the audit, and independently re-verifies the
// file/line claim the audit makes about the vendored fork.

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('PIVOT_AUDIT.md')

// The AC-17.1.3.2 section only, bounded at the next top-level heading so a
// match cannot be satisfied by unrelated text elsewhere in this multi-story
// audit document, and so the AC-14.6 recommendation/open-questions block can
// stay the document's final section.
const sectionStart = doc.indexOf('## AC-17.1.3.2')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1
    ? ''
    : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

describe('AC-17.1.3.2: the Project-to-Gallery direction resolves', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.1.3.2 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.1\.3\.2\b/)
    })

    it('has a dedicated AC-17.1.3.2 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('sits after the AC-17.1.3.1 section it builds on', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.1.3.1'))
    })
  })

  describe('the exact query used is recorded and really exists', () => {
    it('names GET /api/admin/projects/1/overview as the query', () => {
      expect(section).toMatch(
        /The query used: `GET \/api\/admin\/projects\/1\/overview`/
      )
    })

    it('cites the handler line and its permission gate', () => {
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/routes\/adminProjects\.js:83/
      )
      expect(section).toMatch(/seeded `events\.view` permission/)
    })

    it('that cited line really is the overview handler gated on events.view', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminProjects.js').split('\n')
      expect(lines[83]).toContain("router.get('/:id/overview'")
      expect(lines[83]).toContain("requirePermission('events.view')")
    })

    it('states the query reused the existing AC-17.1.2 Project and AC-17.1.3.1 Gallery rather than creating new records', () => {
      expect(section).toMatch(/no new record was created for this AC/)
    })
  })

  describe('the output is recorded', () => {
    it('shows the 200 OK response', () => {
      expect(section).toMatch(/HTTP\/1\.1 200 OK/)
    })

    it('shows the response project is the AC-17.1.2 Project', () => {
      expect(section).toMatch(/"id":1,"name":"AC-17\.1\.2 Verification Project"/)
    })

    it('shows the events array listing the AC-17.1.3.1 Gallery by id and name', () => {
      expect(section).toMatch(/"id":3,"event_name":"AC-17\.1\.3\.1 Verification Gallery"/)
    })

    it('explains events is the field upstream uses in place of "galleries"', () => {
      expect(section).toMatch(
        /field upstream uses in place of a "galleries" field/
      )
    })

    it('notes the Gallery is listed by its own id and name, not merely a bare foreign key', () => {
      expect(section).toMatch(/not merely by a bare foreign key\s*\n?value/)
    })
  })

  it('closes the AC with an explicit verdict naming both directions', () => {
    expect(section).toMatch(/AC-17\.1\.3\.2 is satisfied/)
    expect(section).toMatch(/Gallery-to-Project \(recorded\s*\n?under AC-17\.1\.3\.1\)/)
    expect(section).toMatch(/Project-to-Gallery \(recorded here\)/)
  })
})
