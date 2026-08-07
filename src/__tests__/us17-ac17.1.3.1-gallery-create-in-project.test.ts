/**
 * ---
 * file: src/__tests__/us17-ac17.1.3.1-gallery-create-in-project.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.1.3.1 — PIVOT_AUDIT.md records that a Gallery record
 *          was created inside the AC-17.1.2 Project through the interface
 *          upstream actually provides, that reading it back returns the
 *          values it was created with, and that the creation route, the
 *          resulting database row, and the column carrying the Project
 *          association are all written down. Also verifies the audit says
 *          plainly that upstream models the Gallery as an Event rather than
 *          working that difference around silently. Every file/line claim
 *          the audit makes about the pinned vendored fork is independently
 *          re-verified against the actual source.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.1.3.1
 * ---
 */

// The proof itself was exercised live on 2026-07-31 against the running
// Backstage (`docker compose --profile backstage`, per BACKSTAGE_STARTUP.md):
// the Gallery was created through POST /api/admin/events as the seeded
// administrator, the resulting `events` row was read back out of
// `backstage-db` with psql, the `events.project_id` FK constraint was read
// from the live schema, the attach-to-Project admin route was confirmed to
// 403 on the same missing `events.manage` permission recorded under
// AC-17.1.2, and the Gallery was re-read through the admin API. That run
// needs a Docker daemon and a live Backstage, so it is not repeatable
// inside Jest — this suite pins the recorded evidence so it cannot silently
// rot out of the audit, and independently re-verifies every file/line claim
// the audit makes about the vendored fork.

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('PIVOT_AUDIT.md')

// The AC-17.1.3.1 section only, bounded at the next top-level heading so a
// match cannot be satisfied by unrelated text elsewhere in this multi-story
// audit document, and so the AC-14.6 recommendation/open-questions block can
// stay the document's final section.
const sectionStart = doc.indexOf('## AC-17.1.3.1')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1
    ? ''
    : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

describe('AC-17.1.3.1: a Gallery can be created inside the Project and read back', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.1.3.1 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.1\.3\.1\b/)
    })

    it('has a dedicated AC-17.1.3.1 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('sits after the AC-17.1.2 section it builds on', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.1.2'))
    })
  })

  describe('it writes up that upstream models the Gallery differently than the PRD assumes', () => {
    it('states outright that there is no "Gallery" object upstream — it is an Event', () => {
      expect(section).toMatch(/Upstream does not have a "Gallery" object — it has an Event/)
    })

    it('names the upstream table and route family that play the Gallery role', () => {
      expect(section).toMatch(/`events` table/)
      expect(section).toMatch(/\/api\/admin\/events/)
    })

    it('rules out the other shapes this AC asked about (a separate gallery/collection model)', () => {
      expect(section).toMatch(/no separate "gallery" or\s*\n?"collection" model/)
    })

    it('declines to quietly pass a differently-named table off as "the Gallery"', () => {
      expect(section).toMatch(/rather than silently worked around/)
    })
  })

  describe('the exact creation route used is recorded and really exists', () => {
    it('names POST /api/admin/events as the creation route', () => {
      expect(section).toMatch(/Creation route used: `POST \/api\/admin\/events`/)
    })

    it('cites the handler line and its permission gate', () => {
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/routes\/adminEvents\.js:330/
      )
      expect(section).toMatch(/requirePermission\('events\.create'\)/)
    })

    it('that cited line really is the create handler gated on events.create', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminEvents.js').split('\n')
      expect(lines[329]).toContain("router.post('/'")
      expect(lines[329]).toContain("requirePermission('events.create')")
    })

    it('cites the seed migration line that makes events.create reachable', () => {
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/migrations\/core\/055_add_permissions_table\.js:50/
      )
    })

    it('that cited line really does seed events.create', () => {
      const lines = read('vendor/picpeak/backend/migrations/core/055_add_permissions_table.js').split('\n')
      expect(lines[49]).toContain("name: 'events.create'")
    })

    it('distinguishes seeded events.create from the never-seeded events.manage of AC-17.1.2', () => {
      expect(section).toMatch(/never-seeded[\s\S]{0,20}events\.manage/)
    })

    it('cites the full mount chain reaching the route', () => {
      expect(section).toMatch(/vendor\/picpeak\/backend\/server\.js:449/)
      expect(section).toMatch(/vendor\/picpeak\/backend\/src\/routes\/admin\.js:9/)
      expect(section).toMatch(/vendor\/picpeak\/backend\/src\/routes\/admin\.js:22/)
    })

    it('that mount chain really resolves /api/admin/events to adminEvents in the pinned source', () => {
      const server = read('vendor/picpeak/backend/server.js').split('\n')
      expect(server[448]).toContain("app.use('/api/admin', adminRoutes)")

      const admin = read('vendor/picpeak/backend/src/routes/admin.js').split('\n')
      expect(admin[8]).toContain("require('./adminEvents')")
      expect(admin[21]).toContain("router.use('/events', eventsRoutes)")
    })

    it('rules out the adminEventRename router mounted at the same prefix', () => {
      expect(section).toMatch(/adminEventRename\.js/)
      expect(section).toMatch(/vendor\/picpeak\/backend\/server\.js:463/)
    })

    it('that rename router really is mounted at the same prefix one line later', () => {
      const server = read('vendor/picpeak/backend/server.js').split('\n')
      expect(server[462]).toContain("app.use('/api/admin/events'")
      expect(server[462]).toContain('adminEventRename')
    })

    it('records the create call and its response, and explains the 200 (not 201)', () => {
      expect(section).toMatch(/HTTP\/1\.1 200 OK/)
      expect(section).toMatch(/returns `200 OK` \(not `201`\)/)
      expect(section).toMatch(/upstream's own inconsistency/)
    })

    it('the create handler really does end on a plain res.json, as the audit claims', () => {
      const source = read('vendor/picpeak/backend/src/routes/adminEvents.js')
      // The create handler's success payload — a bare res.json, no status
      // code and no successResponse wrapper, hence 200 rather than 201.
      expect(source).toMatch(/res\.json\(\{\s*\n\s*id: eventId,/)
    })
  })

  describe('the resulting database row is recorded', () => {
    it('has a dedicated subsection showing the row read straight from Postgres', () => {
      expect(section).toMatch(/### The resulting database row/)
      expect(section).toMatch(/select id, slug, event_name/)
      expect(section).toMatch(/backstage-db/)
    })

    it('shows the row carrying the values the Gallery was created with', () => {
      expect(section).toMatch(/event_name\s+\| AC-17\.1\.3\.1 Verification Gallery/)
      expect(section).toMatch(/event_type\s+\| wedding/)
      expect(section).toMatch(/customer_email\s+\| ac17-1-1-client@example\.com/)
      expect(section).toMatch(/require_password\s+\| t/)
      expect(section).toMatch(/expires_at\s+\| 2026-10-01 00:00:00\+00/)
    })

    it('ties the row back to the AC-17.1.1 Client by name', () => {
      expect(section).toMatch(/Ada Testclient/)
    })

    it('names the table and primary key of the resulting row explicitly', () => {
      expect(section).toMatch(/The table is `events`/)
      expect(section).toMatch(/`events\.id = 3`/)
    })
  })

  describe('the column carrying the Project association is recorded and FK-backed', () => {
    it('names events.project_id as that column', () => {
      expect(section).toMatch(
        /The Project association is a real Postgres foreign key: `events\.project_id`/
      )
      expect(section).toMatch(/project_id\s+\| 1/)
    })

    it('cites the migration lines that add the column with its FK', () => {
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/migrations\/core\/117_add_projects\.js:41-47/
      )
      expect(section).toMatch(/ON\s*\n?DELETE SET NULL/)
    })

    it('those exact lines really do add events.project_id referencing projects.id', () => {
      const lines = read('vendor/picpeak/backend/migrations/core/117_add_projects.js').split('\n')
      // 1-indexed 41-47 → array indices 40-46
      const range = lines.slice(40, 47).join('\n')
      expect(range).toMatch(/hasColumn\('events', 'project_id'\)/)
      expect(range).toMatch(/references\('id'\)\.inTable\('projects'\)\.onDelete\('SET NULL'\)/)
    })

    it('shows the FK constraint read directly from the running database schema', () => {
      expect(section).toMatch(/\\d events/)
      expect(section).toMatch(
        /"events_project_id_foreign" FOREIGN KEY \(project_id\) REFERENCES projects\(id\) ON DELETE SET NULL/
      )
    })
  })

  describe('it records honestly that the attach-to-Project route hits the AC-17.1.2 defect', () => {
    it('states the create route accepts no project_id at all', () => {
      expect(section).toMatch(/does not accept a `project_id` field in its body/)
    })

    it('adminEvents.js really contains no project_id reference, as claimed', () => {
      const source = read('vendor/picpeak/backend/src/routes/adminEvents.js')
      expect(source).not.toMatch(/project_id/)
    })

    it('cites the one admin route that would assign an event to a project', () => {
      expect(section).toMatch(/POST \/api\/admin\/projects\/:id\/events/)
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/routes\/adminProjects\.js:73-78/
      )
    })

    it('those exact lines really are that route, gated on events.manage', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminProjects.js').split('\n')
      // 1-indexed 73-78 → array indices 72-77
      const range = lines.slice(72, 78).join('\n')
      expect(range).toMatch(/router\.post\('\/:id\/events'/)
      expect(range).toMatch(/requirePermission\('events\.manage'\)/)
      expect(range).toMatch(/projectService\.assignEvent/)
    })

    it('shows that route actually 403ing against the Gallery created above', () => {
      expect(section).toMatch(/HTTP\/1\.1 403 Forbidden/)
      expect(section).toMatch(/Insufficient permissions/)
    })

    it('cross-references AC-17.1.2 rather than re-litigating or re-patching the defect', () => {
      expect(section).toMatch(/not a new defect/)
      expect(section).toMatch(/already recorded under AC-17\.1\.2/)
    })

    it('states plainly that the vendored fork was not patched and no permission hand-seeded', () => {
      expect(section).toMatch(/rather than by patching the\s*\n?vendored fork/)
    })
  })

  describe('reading the Gallery back returns the values it was created with', () => {
    it('records the read-back through the admin API by event id', () => {
      expect(section).toMatch(/\/api\/admin\/events\/3/)
      expect(section).toMatch(/"event_name":"AC-17\.1\.3\.1 Verification Gallery"/)
      expect(section).toMatch(/"project_id":1/)
    })

    it('the read route it used really is gated on the seeded events.view permission', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminEvents.js').split('\n')
      expect(lines[965]).toContain("router.get('/:id'")
      expect(lines[965]).toContain("requirePermission('events.view')")
    })

    it('records the Project overview resolving the association back to the AC-17.1.2 Project', () => {
      expect(section).toMatch(/\/api\/admin\/projects\/1\/overview/)
      expect(section).toMatch(/"name":"AC-17\.1\.2 Verification Project"/)
    })

    it('the overview route really exists and is gated on the seeded events.view permission', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminProjects.js').split('\n')
      expect(lines[83]).toContain("router.get('/:id/overview'")
      expect(lines[83]).toContain("requirePermission('events.view')")
    })

    it('enumerates the created values that survive the round trip', () => {
      expect(section).toMatch(/reads back unchanged/)
      expect(section).toMatch(/share_link/)
    })

    it('names database-level FK enforcement, not application code, as what backs the association', () => {
      expect(section).toMatch(/enforced\s*\n?by the database/)
    })
  })

  it('closes the AC with an explicit verdict', () => {
    expect(section).toMatch(/AC-17\.1\.3\.1 is satisfied/)
  })
})
