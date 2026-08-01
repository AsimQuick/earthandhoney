/**
 * ---
 * file: src/__tests__/us17-ac17.1.3.3-gallery-project-client-direction.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.1.3.3 — PIVOT_AUDIT.md records proof that opening or
 *          querying the AC-17.1.3.1 Gallery identifies both its AC-17.1.2
 *          Project and the owning AC-17.1.1 Client, records the exact query
 *          and its output, and records the actual upstream shape honestly
 *          (the Client link is not inherited from the Project and must be
 *          assigned explicitly; the upstream edit route 500s when
 *          customer_account_ids is the only field sent) rather than working
 *          around it. Independently re-verifies every route/schema file/line
 *          claim the audit makes against the pinned vendored fork.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.1.3.3
 * ---
 */

// The proof itself was exercised live on 2026-07-31 against the running
// Backstage (`docker compose --profile backstage`, per BACKSTAGE_STARTUP.md):
// GET /api/admin/events/3, PUT /api/admin/events/3, and
// GET /api/admin/projects/1/overview were called as the seeded administrator
// against the AC-17.1.3.1 Gallery, the AC-17.1.2 Project, and the AC-17.1.1
// Client already created on that run, alongside a direct read of
// `event_customer_assignments` from the running Backstage's own Postgres.
// That run needs a Docker daemon and a live Backstage, so it is not
// repeatable inside Jest — this suite pins the recorded evidence so it cannot
// silently rot out of the audit, and independently re-verifies the file/line
// claims the audit makes about the vendored fork.

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('PIVOT_AUDIT.md')
const adminEvents = read('vendor/picpeak/backend/src/routes/adminEvents.js').split('\n')

// The AC-17.1.3.3 section only, bounded at the next top-level heading so a
// match cannot be satisfied by unrelated text elsewhere in this multi-story
// audit document, and so the AC-14.6 recommendation/open-questions block can
// stay the document's final section.
const sectionStart = doc.indexOf('## AC-17.1.3.3')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1
    ? ''
    : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

describe('AC-17.1.3.3: the Gallery-to-Project-to-Client direction resolves', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.1.3.3 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.1\.3\.3\b/)
    })

    it('has a dedicated AC-17.1.3.3 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('sits after the AC-17.1.3.2 section it builds on', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.1.3.2'))
    })
  })

  describe('the exact query used is recorded and really exists', () => {
    it('names GET /api/admin/events/3 as the query', () => {
      expect(section).toMatch(/The query used: `GET \/api\/admin\/events\/3`/)
    })

    it('cites the handler line and its permission gate', () => {
      expect(section).toMatch(/vendor\/picpeak\/backend\/src\/routes\/adminEvents\.js:966/)
      expect(section).toMatch(/seeded `events\.view` permission/)
    })

    it('that cited line really is the single-event handler gated on events.view', () => {
      expect(adminEvents[965]).toContain("router.get('/:id'")
      expect(adminEvents[965]).toContain("requirePermission('events.view')")
    })

    it('states the query reused the existing Gallery, Project, and Client rather than creating new records', () => {
      expect(section).toMatch(
        /no new Gallery, Project, or Client record was created for this AC/
      )
    })
  })

  describe('the Project resolves directly from the Gallery', () => {
    it('shows project_id: 1 in the recorded query output', () => {
      expect(section).toMatch(/"project_id": 1/)
    })

    it('names events.project_id as the FK carrying the association', () => {
      expect(section).toMatch(/`events\.project_id` foreign key/)
    })
  })

  describe('the Client also resolves directly from the Gallery', () => {
    it('shows the customer_accounts array carrying the AC-17.1.1 Client', () => {
      expect(section).toMatch(/"customer_accounts": \[/)
      expect(section).toMatch(/"id": 3, "email": "ac17-1-1-client@example\.com"/)
      expect(section).toMatch(/`customer_accounts\[0\]\.id: 3` is the AC-17\.1\.1 Client/)
    })

    it('states plainly that no second lookup through the Project is required', () => {
      expect(section).toMatch(
        /it does not require a second lookup through the\s+Project/
      )
    })

    it('names the join table and hydration call, and cites both', () => {
      expect(section).toMatch(/`event_customer_assignments`/)
      expect(section).toMatch(/getAssignmentsForEvent/)
      expect(section).toMatch(/adminEvents\.js:1020-1021/)
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/migrations\/core\/090_add_customer_accounts\.js:105-115/
      )
    })

    it('the cited hydration lines really call getAssignmentsForEvent', () => {
      const block = adminEvents.slice(1019, 1021).join('\n')
      expect(block).toContain('customerAccountsService')
      expect(block).toContain('getAssignmentsForEvent')
    })

    it('the cited migration range really defines the event_customer_assignments join table', () => {
      const lines = read(
        'vendor/picpeak/backend/migrations/core/090_add_customer_accounts.js'
      ).split('\n')
      const block = lines.slice(104, 115).join('\n')
      expect(block).toContain("references('id').inTable('events')")
      expect(block).toContain("references('id').inTable('customer_accounts')")
      expect(block).toContain("table.unique(['event_id', 'customer_account_id'])")
    })

    it('records the backing join row read straight out of Postgres', () => {
      expect(section).toMatch(/select id, event_id, customer_account_id, assigned_by_admin_id/)
      expect(section).toMatch(/\|\s*3\s*\|\s*3\s*\|\s*1/)
    })
  })

  describe('the actual upstream shape is recorded, not worked around', () => {
    it('records that the Client link is NOT inherited when a Gallery is created in a Project', () => {
      expect(section).toMatch(
        /the Gallery→Client link is NOT inherited from the Project — it must be assigned explicitly/
      )
      expect(section).toMatch(/`"customer_accounts": \[\]`/)
      expect(section).toMatch(/does \*\*not\*\* propagate/)
    })

    it('cites the create-handler path that only assigns when customer_account_ids is sent', () => {
      expect(section).toMatch(/adminEvents\.js:419-420/)
      expect(section).toMatch(/adminEvents\.js:720-727/)
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/services\/customerAccountsService\.js:840/
      )
    })

    it('those cited create-handler lines really validate and consume customer_account_ids', () => {
      expect(adminEvents.slice(418, 420).join('\n')).toContain("body('customer_account_ids')")
      expect(adminEvents.slice(719, 727).join('\n')).toContain('setAssignmentsForEvent')
      const svc = read(
        'vendor/picpeak/backend/src/services/customerAccountsService.js'
      ).split('\n')
      expect(svc[839]).toContain('async function setAssignmentsForEvent(')
    })

    it('records that the link was made through the upstream PUT route, not by hand-seeding', () => {
      expect(section).toMatch(/adminEvents\.js:1129/)
      expect(section).toMatch(/adminEvents\.js:1471-1478/)
      expect(section).toMatch(/-X PUT http:\/\/localhost:3100\/api\/admin\/events\/3/)
      expect(section).toMatch(
        /No vendored route was patched and no `event_customer_assignments` row was\s*\nhand-seeded/
      )
    })

    it('the cited PUT route and its assignment block really exist', () => {
      expect(adminEvents[1128]).toContain("router.put('/:id'")
      expect(adminEvents[1128]).toContain("requirePermission('events.edit')")
      const block = adminEvents.slice(1470, 1478).join('\n')
      expect(block).toContain('customer_account_ids')
      expect(block).toContain('setAssignmentsForEvent')
    })

    it('spells out the consequence for Earth & Honey and routes it to the PO under AC-17.9', () => {
      expect(section).toMatch(/has no client\s*\nassociation until someone assigns it/)
      expect(section).toMatch(/raised to the Product Owner under AC-17\.9/)
    })
  })

  describe('the upstream 500 on a customer_account_ids-only edit is recorded', () => {
    it('records the failing request and its 500 response', () => {
      expect(section).toMatch(
        /`PUT \/api\/admin\/events\/:id` 500s when `customer_account_ids` is the only field sent/
      )
      expect(section).toMatch(/HTTP\/1\.1 500 Internal Server Error/)
      expect(section).toMatch(/Empty \.update\(\) call detected!/)
    })

    it('explains the cause with the lines that produce it', () => {
      expect(section).toMatch(/adminEvents\.js:1336/)
      expect(section).toMatch(/adminEvents\.js:1464-1466/)
      expect(section).toMatch(/adminEvents\.js:1471/)
      expect(section).toMatch(/the assignment the caller asked for is silently\s*\nnot made/)
    })

    it('those cited lines really are the delete and the empty update', () => {
      expect(adminEvents[1335]).toContain('delete updates.customer_account_ids;')
      const block = adminEvents.slice(1463, 1466).join('\n')
      expect(block).toContain("db('events')")
      expect(block).toContain('.update(updates)')
    })

    it('records it as an upstream defect left unpatched in the fork', () => {
      expect(section).toMatch(/Recorded here as an upstream defect; not worked around in the vendored\s*\nfork/)
    })
  })

  describe('the second lookup through the Project is recorded as agreeing', () => {
    it('records the project overview query and customerAccountId: 3', () => {
      expect(section).toMatch(/GET \/api\/admin\/projects\/1\/overview/)
      expect(section).toMatch(/"customerAccountId":3/)
      expect(section).toMatch(/Both paths agree on `customer_accounts\.id = 3`/)
    })
  })

  describe('the Gallery-row customer_name/customer_email are recorded as non-references', () => {
    it('explains they are unconstrained free text, and cites mapEventForApi', () => {
      expect(section).toMatch(/These are \*\*not\*\*\s*\nthe Client link/)
      expect(section).toMatch(/no foreign key to\s*\n`customer_accounts`/)
      expect(section).toMatch(/mapEventForApi/)
      expect(section).toMatch(/adminEvents\.js:215-237/)
    })

    it('that cited mapEventForApi range really defines the function', () => {
      expect(adminEvents[214]).toContain('const mapEventForApi = (event) => {')
      expect(adminEvents[236]).toContain('};')
    })
  })

  it('closes the AC with an explicit verdict naming both directions and the upstream shape', () => {
    expect(section).toMatch(/AC-17\.1\.3\.3 is satisfied/)
    expect(section).toMatch(/identifies its AC-17\.1\.2 Project directly/)
    expect(section).toMatch(/the owning AC-17\.1\.1 Client directly/)
    expect(section).toMatch(
      /The\s+actual upstream shape is recorded rather than worked around/
    )
  })
})
