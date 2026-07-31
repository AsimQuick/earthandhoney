/**
 * ---
 * file: src/__tests__/us17-ac17.1.2-project-client-link.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.1.2 — PIVOT_AUDIT.md records that a Project record
 *          was created in the running Backstage and linked to the
 *          AC-17.1.1 Client through a real Postgres foreign key, that
 *          reading the Project back (through the admin API) shows that
 *          Client, and that the upstream defect blocking the admin
 *          create/relink routes (a permission the seed data never grants
 *          to any role) is honestly written up rather than worked around.
 *          The file/line claims the audit makes about the pinned vendored
 *          fork are independently re-verified against the actual source.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.1.2
 * ---
 */

// The proof itself was exercised live on 2026-07-31 against the running
// Backstage (`docker compose --profile backstage`, per BACKSTAGE_STARTUP.md):
// the schema's FK constraint was read with `\d projects`, the admin create
// route was confirmed to 403 for the seeded (super_admin) administrator, a
// Project row was inserted directly against `backstage-db` linking to the
// AC-17.1.1 Client (`customer_accounts.id = 3`), and the row was read back
// through the admin API's working read routes. That run needs a Docker
// daemon and a live Backstage, so it is not repeatable inside Jest — this
// suite pins the recorded evidence so it cannot silently rot out of the
// audit, and independently re-verifies every file/line claim the audit
// makes about the vendored fork.

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('PIVOT_AUDIT.md')

// The AC-17.1.2 section only, bounded at the next top-level heading so a
// match cannot be satisfied by unrelated text elsewhere in this
// multi-story audit document, and so the AC-14.6 recommendation/
// open-questions block can stay the document's final section.
const sectionStart = doc.indexOf('## AC-17.1.2')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1
    ? ''
    : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

describe('AC-17.1.2: a Project can be created and linked to a Client via a real Postgres FK', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.1.2 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.1\.2\b/)
    })

    it('has a dedicated AC-17.1.2 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })
  })

  describe('the Project/Client relationship is a real Postgres foreign key', () => {
    it('cites the migration that creates the projects table', () => {
      expect(section).toMatch(/117_add_projects\.js/)
    })

    it('that migration really does add a customer_account_id FK to customer_accounts', () => {
      const migration = read('vendor/picpeak/backend/migrations/core/117_add_projects.js')
      expect(migration).toMatch(/customer_account_id/)
      expect(migration).toMatch(/references\('id'\)\.inTable\('customer_accounts'\)/)
    })

    it('shows the FK constraint read directly from the running database schema', () => {
      expect(section).toMatch(/\\d projects/)
      expect(section).toMatch(/projects_customer_account_id_foreign.*FOREIGN KEY \(customer_account_id\) REFERENCES customer_accounts\(id\)/)
    })

    it('cites the service methods that join customer_accounts and expose the linked Client', () => {
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/services\/projectService\.js:54-61/
      )
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/services\/projectService\.js:19-31/
      )
    })

    it('the getProjectById range really does join customer_accounts', () => {
      const lines = read('vendor/picpeak/backend/src/services/projectService.js').split('\n')
      // 1-indexed 54-61 → array indices 53-60
      const range = lines.slice(53, 61).join('\n')
      expect(range).toMatch(/leftJoin\('customer_accounts'/)
    })

    it('the transformProject range really does expose customerAccountId/customerEmail', () => {
      const lines = read('vendor/picpeak/backend/src/services/projectService.js').split('\n')
      // 1-indexed 19-31 → array indices 18-30
      const range = lines.slice(18, 31).join('\n')
      expect(range).toMatch(/customerAccountId/)
      expect(range).toMatch(/customerEmail/)
    })
  })

  describe('it records the upstream defect blocking the admin create/relink routes', () => {
    it('names the missing permission as events.manage', () => {
      expect(section).toMatch(/events\.manage/)
    })

    it('cites the three gated routes by file and line', () => {
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/routes\/adminProjects\.js:32,54,74/
      )
    })

    it('those exact lines really do gate on events.manage in the pinned source', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminProjects.js').split('\n')
      for (const lineNo of [32, 54, 74]) {
        expect(lines[lineNo - 1]).toContain("requirePermission('events.manage')")
      }
    })

    it('cites the mount point for the projects router', () => {
      expect(section).toMatch(/vendor\/picpeak\/backend\/server\.js:706/)
    })

    it('that cited line really does mount adminProjects at /api/admin/projects', () => {
      const lines = read('vendor/picpeak/backend/server.js').split('\n')
      expect(lines[705]).toContain("app.use('/api/admin/projects'")
      expect(lines[705]).toContain('./src/routes/adminProjects')
    })

    it('cites the permissions seed migration and the exact events.* permissions it defines', () => {
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/migrations\/core\/055_add_permissions_table\.js:49-53/
      )
    })

    it('that seed migration really defines exactly the five named events.* permissions, no events.manage', () => {
      const lines = read('vendor/picpeak/backend/migrations/core/055_add_permissions_table.js').split('\n')
      const range = lines.slice(48, 53).join('\n') // 1-indexed 49-53
      expect(range).toMatch(/'events\.view'/)
      expect(range).toMatch(/'events\.create'/)
      expect(range).toMatch(/'events\.edit'/)
      expect(range).toMatch(/'events\.delete'/)
      expect(range).toMatch(/'events\.archive'/)
      expect(range).not.toMatch(/'events\.manage'/)
    })

    it('cites the role_permissions seed that grants super_admin every seeded permission', () => {
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/migrations\/core\/056_add_role_permissions_table\.js:46/
      )
    })

    it('that cited line really does grant super_admin permissions.map(p => p.name)', () => {
      const lines = read('vendor/picpeak/backend/migrations/core/056_add_role_permissions_table.js').split('\n')
      expect(lines[45]).toContain('super_admin: permissions.map(p => p.name)')
    })

    it('states plainly that no permissions row named events.manage is ever inserted, by any migration', () => {
      expect(section).toMatch(/never inserts a row[\s\S]{0,40}`events\.manage` into `permissions`/)
    })

    it('shows the seeded administrator holding all 45 seeded permissions yet still 403ing', () => {
      expect(section).toMatch(/count\(\*\) from permissions/)
      expect(section).toMatch(/count\(\*\) from role_permissions where role_id = 1/)
      expect(section).toMatch(/HTTP\/1\.1 403 Forbidden/)
      expect(section).toMatch(/Insufficient permissions/)
    })

    it('states this is unconditional (no role could ever pass), not a scoping choice', () => {
      expect(section).toMatch(/unconditional/)
    })

    it('explicitly declines to patch the vendored fork or hand-seed the missing permission', () => {
      expect(section).toMatch(/no such workaround is applied/)
    })
  })

  describe('it reproduces the requirement without patching the vendored fork', () => {
    it('records inserting the Project directly against the running Backstage database', () => {
      expect(section).toMatch(/insert into projects/)
      expect(section).toMatch(/backstage-db/)
    })

    it('shows the Project linked to the exact AC-17.1.1 Client id (3)', () => {
      expect(section).toMatch(/customer_account_id/)
      expect(section).toMatch(/values \('AC-17\.1\.2 Verification Project', 3,/)
    })

    it('shows the same customer resolved back through the admin API read routes', () => {
      expect(section).toMatch(/\/api\/admin\/projects\/1/)
      expect(section).toMatch(/"customerAccountId":3/)
      expect(section).toMatch(/"customerEmail":\s*"ac17-1-1-client@example\.com"/)
    })

    it('cross-references the AC-17.1.1 Client by name, not just by id', () => {
      expect(section).toMatch(/Ada Testclient/)
    })

    it('names the database-level FK enforcement, not just application code, as what backs the relationship', () => {
      expect(section).toMatch(/enforced by the database/)
    })
  })

  it('closes the AC with an explicit verdict', () => {
    expect(section).toMatch(/AC-17\.1\.2 is satisfied/)
  })
})
