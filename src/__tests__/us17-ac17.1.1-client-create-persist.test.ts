/**
 * ---
 * file: src/__tests__/us17-ac17.1.1-client-create-persist.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.1.1 — PIVOT_AUDIT.md records that a Client record was
 *          created in the running Backstage through the route upstream
 *          provides, names that exact route, shows the resulting
 *          `customer_accounts` database row, and shows the same row still
 *          retrievable with the same values after a container restart. The
 *          route and mount point the audit cites are checked against the
 *          actual pinned vendored source, not against the prose alone.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.1.1
 * ---
 */

// The proof itself was exercised live on 2026-07-31 against the running
// Backstage (`docker compose --profile backstage`, per BACKSTAGE_STARTUP.md):
// an admin session was obtained through the real front door
// (POST /api/auth/admin/login), a Client was created via
// POST /api/admin/customers, the resulting `customer_accounts` row was read
// with psql, `backstage-backend` was restarted and waited to `healthy`, and
// the row was re-read through both the admin API and psql. That run needs a
// Docker daemon and several minutes, so it is not repeatable inside Jest —
// this suite pins the recorded evidence so it cannot silently rot out of the
// audit, and independently re-verifies every file/line claim the audit makes
// about the vendored fork.

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('PIVOT_AUDIT.md')

// The AC-17.1.1 section only — so a match cannot be satisfied by unrelated
// text elsewhere in this multi-story audit document.
// AC-14.6 requires the recommendation/open-questions block to remain the final
// section of this document, so the AC-17.1.1 section sits ahead of it and must
// be bounded at the next top-level heading rather than run to end-of-file.
const sectionStart = doc.indexOf('## AC-17.1.1')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1
    ? ''
    : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

describe('AC-17.1.1: a Client can be created in the running Backstage and survives a restart', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.1.1 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.1\.1\b/)
    })

    it('has a dedicated AC-17.1.1 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })
  })

  describe('it identifies which record plays the "Client" role', () => {
    it('names `customer_accounts` as the Client record', () => {
      expect(section).toMatch(/customer_accounts/)
    })

    it('distinguishes it from `admin_users` (photographer/staff login) rather than conflating the two', () => {
      expect(section).toMatch(/admin_users/)
    })

    it('cites the upstream migration that introduces the table', () => {
      expect(section).toMatch(/090_add_customer_accounts\.js/)
    })

    it('that cited migration exists in the pinned fork and creates the table', () => {
      const migration = read('vendor/picpeak/backend/migrations/core/090_add_customer_accounts.js')
      expect(migration).toMatch(/hasTable\('customer_accounts'\)/)
    })
  })

  describe('it records the exact creation route used', () => {
    it('names the route as POST /api/admin/customers', () => {
      expect(section).toMatch(/POST\s+\/api\/admin\/customers/)
    })

    it('cites the handler at vendor/picpeak/backend/src/routes/adminCustomers.js:232', () => {
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/routes\/adminCustomers\.js:232/
      )
    })

    it('the cited line really is the POST handler in the pinned source', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminCustomers.js').split('\n')
      // 1-indexed line 232 → array index 231
      expect(lines[231]).toContain("router.post('/'")
    })

    it('cites the mount point at vendor/picpeak/backend/server.js:498', () => {
      expect(section).toMatch(/vendor\/picpeak\/backend\/server\.js:498/)
    })

    it('the cited line really does mount that router at /api/admin/customers', () => {
      const lines = read('vendor/picpeak/backend/server.js').split('\n')
      expect(lines[497]).toContain("app.use('/api/admin/customers'")
      expect(lines[497]).toContain('./src/routes/adminCustomers')
    })

    it('records that the route is admin-authenticated and permission-gated, not open', () => {
      expect(section).toMatch(/adminAuth/)
      expect(section).toMatch(/customers\.create/)
    })

    it('those guards are actually present on the pinned handler', () => {
      const routeSrc = read('vendor/picpeak/backend/src/routes/adminCustomers.js')
      const postIdx = routeSrc.indexOf("router.post('/', [")
      expect(postIdx).toBeGreaterThan(-1)
      const handler = routeSrc.slice(postIdx, postIdx + 400)
      expect(handler).toMatch(/adminAuth/)
      expect(handler).toMatch(/requirePermission\('customers\.create'\)/)
    })

    it('states the route creates the row directly rather than via the invite-acceptance flow', () => {
      expect(section).toMatch(/createDirect/)
    })

    it('`createDirect` exists in the pinned service and is called by the route', () => {
      expect(read('vendor/picpeak/backend/src/services/customerAccountsService.js')).toMatch(
        /async function createDirect\(/
      )
      expect(read('vendor/picpeak/backend/src/routes/adminCustomers.js')).toMatch(
        /customerAccountsService\.createDirect\(/
      )
    })

    it('records that the admin session was obtained through the real login endpoint', () => {
      expect(section).toMatch(/\/api\/auth\/admin\/login/)
    })

    it('shows the actual creation call and its 201 response', () => {
      expect(section).toMatch(/curl .*-X POST .*\/api\/admin\/customers/)
      expect(section).toMatch(/HTTP\/1\.1 201 Created/)
    })

    it('commits no secret — the admin session value is redacted in the recorded command', () => {
      expect(section).toMatch(/admin_token=<seeded-admin-session>/)
      expect(section).not.toMatch(/admin_token=eyJ/)
    })
  })

  describe('it records the resulting database row', () => {
    it('shows the row being read straight from Postgres, not just echoed from the API', () => {
      expect(section).toMatch(/psql -U backstage -d backstage/)
      expect(section).toMatch(/from customer_accounts/)
    })

    it('shows the identifying column values the Client was created with', () => {
      expect(section).toMatch(/ac17-1-1-client@example\.com/)
      expect(section).toMatch(/Ada/)
      expect(section).toMatch(/Testclient/)
      expect(section).toMatch(/AC-17\.1\.1 Verification/)
    })

    it('shows a concrete primary key and timestamps rather than a placeholder', () => {
      expect(section).toMatch(/2026-07-31 19:24:44\.844\+00/)
      expect(section).toMatch(/\(1 row\)/)
    })
  })

  describe('it proves persistence across a container restart', () => {
    it('records restarting the application container', () => {
      expect(section).toMatch(/docker compose --profile backstage restart backstage-backend/)
    })

    it('records waiting for the container to report healthy before re-reading', () => {
      expect(section).toMatch(/State\.Health\.Status/)
      expect(section).toMatch(/^healthy$/m)
    })

    it('re-reads the same Client through the admin API after the restart', () => {
      expect(section).toMatch(/GET|200 OK/)
      expect(section).toMatch(/\/api\/admin\/customers\/3/)
    })

    it('re-reads the same Client straight from the database after the restart', () => {
      // The psql read and the row output both appear twice: once before the
      // restart and once after.
      const psqlReads = section.match(/from customer_accounts where id = 3/g) ?? []
      expect(psqlReads.length).toBeGreaterThanOrEqual(2)

      const rowOutputs = section.match(/ac17-1-1-client@example\.com/g) ?? []
      expect(rowOutputs.length).toBeGreaterThanOrEqual(3) // create response + before + after
    })

    it('states explicitly that the values are unchanged across the restart', () => {
      expect(section).toMatch(/[Ss]ame `?id`?, same field values/)
    })

    it('is honest that the database runs in a separate container with its own volume', () => {
      expect(section).toMatch(/backstage_pgdata/)
      expect(section).toMatch(/separate|independently-running/)
    })

    it('the compose file really does define that separate service and named volume', () => {
      const compose = read('docker-compose.yml')
      expect(compose).toMatch(/^\s{2}backstage-db:/m)
      expect(compose).toMatch(/^\s{2}backstage-backend:/m)
      expect(compose).toMatch(/backstage_pgdata:/)
    })
  })

  it('closes the AC with an explicit verdict', () => {
    expect(section).toMatch(/AC-17\.1\.1 is satisfied/)
  })
})
