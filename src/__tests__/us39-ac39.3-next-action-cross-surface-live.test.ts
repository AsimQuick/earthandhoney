/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us39-ac39.3-next-action-cross-surface-live.test.ts
 * project: earthandhoney
 * purpose: Verify AC-39.3 — the Project's next action is computed once,
 *          server-side (`vendor/picpeak/backend/src/services/nextActionService.js`),
 *          and both the photographer's cockpit
 *          (`GET /api/admin/projects/:id/next-action`) and the client's
 *          Project Room (`GET /api/customer/projects/:id/next-action`) read
 *          that single value. A live round trip against the real running
 *          Backstage stack, gated on `dns.lookup('backstage-backend')` and
 *          `dns.lookup('backstage-db')` resolving (the project's established
 *          live-suite pattern, e.g. `us25-ac25.2-backstage-client-flow-a.test.ts`),
 *          fetches BOTH surfaces for the SAME Project in one run and asserts
 *          the two `nextAction` strings are identical — proven three times
 *          over: at the default `lead` phase; after moving the Project to
 *          `booking` with a non-default single-requirement override and
 *          completing it; and finally with PRD 23.2's default three
 *          requirements all outstanding, so the equality holds as real
 *          milestone state changes rather than only at an untouched
 *          default. The third scenario is the one that would catch row-order
 *          nondeterminism — its string lists three requirements, and each
 *          surface re-reads those rows in its own request.
 *
 *          The suite's UNIT-lane companion,
 *          `us39-ac39.3-next-action-single-computation.test.ts`, carries
 *          the half that must hold without Docker: the rules themselves,
 *          and the proof that both routes delegate to one service.
 *
 *          Fixture setup writes directly against `backstage-db` (a real
 *          `pg` connection) rather than through the admin API's Project
 *          create/relink routes: those routes 403 unconditionally because
 *          no migration ever seeds the `events.manage` permission they are
 *          gated on (recorded in `PIVOT_AUDIT.md`'s AC-17.1.2 write-up and
 *          independently pinned by `us17-ac17.1.2-project-client-link.test.ts`).
 *          This suite never calls those broken routes; it uses the same
 *          direct-database workaround that write-up already establishes as
 *          correct, but — unlike that one-off manual audit run — reproduces
 *          it live inside Jest so it is a repeatable proof, not a pasted
 *          transcript. The seeded customer's password hash is a fixed,
 *          precomputed bcrypt hash (`bcrypt.hashSync` at cost 10, computed
 *          once against the vendored backend's own `bcrypt` install) for a
 *          fixed plaintext password, so this suite needs no bcrypt/JWT
 *          library of its own — it logs the customer in for real over
 *          `POST /api/customer/auth/login` and lets the backend mint the
 *          `customer_token` cookie exactly as it would for any customer.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.3
 * ---
 */
import dns from 'dns/promises'
import { Client } from 'pg'

const PROJECT_NAME = 'US-39 AC-39.3 next-action cross-surface verification project'
const CUSTOMER_EMAIL = 'us39-ac39-3-next-action@example.com'
const CUSTOMER_PASSWORD = 'Us39Ac393NextAction!'
// bcrypt.hashSync('Us39Ac393NextAction!', 10) — computed once via the
// vendored backend's own `bcrypt` install; this suite carries no bcrypt
// dependency of its own, only the fixed plaintext/hash pair.
const CUSTOMER_PASSWORD_HASH = '$2b$10$s61PH.rkvHbWFEzu4j/JS.6VFQK5wj5kXhi/jk.LZ9xkRoTJr9YsG'

interface NextActionResponse {
  projectId: number
  phase: string
  nextAction: string
}

describe('AC-39.3: the cockpit and the Project Room read one server-computed next action', () => {
  it(
    'returns the identical nextAction string from both surfaces for the same Project, at the default phase and again after a real milestone-driven phase change',
    async () => {
      try {
        await dns.lookup('backstage-backend')
        await dns.lookup('backstage-db')
      } catch {
        // Not running inside the project's Docker network — nothing to
        // prove without the real stack this AC's evidence clause requires.
        return
      }

      const base = process.env.BACKSTAGE_BACKEND_URL || 'http://backstage-backend:3000'
      const adminUsername = process.env.BACKSTAGE_ADMIN_USERNAME || 'admin'
      const adminPassword = process.env.BACKSTAGE_ADMIN_PASSWORD || 'change-me-in-production'

      const adminLoginRes = await fetch(`${base}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword }),
      })
      expect(adminLoginRes.status).toBe(200)
      const adminSetCookie = adminLoginRes.headers.get('set-cookie') || ''
      const adminCookie = adminSetCookie.split(';')[0]
      expect(adminCookie).toMatch(/^admin_token=/)
      const adminHeaders = { Cookie: adminCookie }

      const pg = new Client({
        host: 'backstage-db',
        port: 5432,
        user: process.env.BACKSTAGE_DB_USER || 'backstage',
        password: process.env.BACKSTAGE_DB_PASSWORD || 'backstage',
        database: process.env.BACKSTAGE_DB_NAME || 'backstage',
      })
      await pg.connect()

      try {
        // ---- self-seed the customer (find-or-create) ----------------------
        let customerId: number
        const existingCustomer = await pg.query<{ id: number }>(
          'SELECT id FROM customer_accounts WHERE email = $1',
          [CUSTOMER_EMAIL],
        )
        if (existingCustomer.rows.length > 0) {
          customerId = existingCustomer.rows[0].id
          await pg.query('UPDATE customer_accounts SET password_hash = $1, is_active = true WHERE id = $2', [
            CUSTOMER_PASSWORD_HASH,
            customerId,
          ])
        } else {
          const inserted = await pg.query<{ id: number }>(
            `INSERT INTO customer_accounts (email, password_hash, display_name, is_active)
             VALUES ($1, $2, $3, true) RETURNING id`,
            [CUSTOMER_EMAIL, CUSTOMER_PASSWORD_HASH, 'AC-39.3 Verification Customer'],
          )
          customerId = inserted.rows[0].id
        }

        // ---- self-seed the Project (find-or-create), reset to a known state
        let projectId: number
        const existingProject = await pg.query<{ id: number }>('SELECT id FROM projects WHERE name = $1', [
          PROJECT_NAME,
        ])
        if (existingProject.rows.length > 0) {
          projectId = existingProject.rows[0].id
          await pg.query(`UPDATE projects SET customer_account_id = $1, current_phase = 'lead' WHERE id = $2`, [
            customerId,
            projectId,
          ])
          await pg.query('DELETE FROM project_milestones WHERE project_id = $1', [projectId])
          await pg.query('DELETE FROM project_booking_requirements WHERE project_id = $1', [projectId])
        } else {
          const inserted = await pg.query<{ id: number }>(
            `INSERT INTO projects (name, customer_account_id, status, current_phase)
             VALUES ($1, $2, 'active', 'lead') RETURNING id`,
            [PROJECT_NAME, customerId],
          )
          projectId = inserted.rows[0].id
        }

        // ---- log the customer in for real ---------------------------------
        const customerLoginRes = await fetch(`${base}/api/customer/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD }),
        })
        expect(customerLoginRes.status).toBe(200)
        const customerSetCookie = customerLoginRes.headers.get('set-cookie') || ''
        const customerCookie = customerSetCookie.split(';')[0]
        expect(customerCookie).toMatch(/^customer_token=/)
        const customerHeaders = { Cookie: customerCookie }

        // ---- scenario 1: default phase ('lead'), no milestones -----------
        const [adminRes1, customerRes1] = await Promise.all([
          fetch(`${base}/api/admin/projects/${projectId}/next-action`, { headers: adminHeaders }),
          fetch(`${base}/api/customer/projects/${projectId}/next-action`, { headers: customerHeaders }),
        ])
        expect(adminRes1.status).toBe(200)
        expect(customerRes1.status).toBe(200)
        const adminBody1 = (await adminRes1.json()) as NextActionResponse
        const customerBody1 = (await customerRes1.json()) as NextActionResponse

        expect(adminBody1.phase).toBe('lead')
        expect(typeof adminBody1.nextAction).toBe('string')
        expect(adminBody1.nextAction.length).toBeGreaterThan(0)
        // The AC's assertion, stated as itself: two surfaces, one Project,
        // one run, identical strings.
        expect(customerBody1.nextAction).toBe(adminBody1.nextAction)
        expect(customerBody1).toEqual(adminBody1)

        // ---- scenario 2: 'booking' phase, a non-default requirement set,
        // completed — proves the equality holds as real milestone-driven
        // state changes, not only at an untouched default.
        await pg.query(`UPDATE projects SET current_phase = 'booking' WHERE id = $1`, [projectId])
        await pg.query(
          `INSERT INTO project_booking_requirements (project_id, milestone_key) VALUES ($1, 'contract_signed')`,
          [projectId],
        )
        await pg.query(
          `INSERT INTO project_milestones
             (project_id, milestone_key, name, sequence_order, completion_state, completed_at, completed_by)
           VALUES ($1, 'contract_signed', 'contract signed', 6, 'complete', NOW(), 'AC-39.3 live test')`,
          [projectId],
        )

        const [adminRes2, customerRes2] = await Promise.all([
          fetch(`${base}/api/admin/projects/${projectId}/next-action`, { headers: adminHeaders }),
          fetch(`${base}/api/customer/projects/${projectId}/next-action`, { headers: customerHeaders }),
        ])
        expect(adminRes2.status).toBe(200)
        expect(customerRes2.status).toBe(200)
        const adminBody2 = (await adminRes2.json()) as NextActionResponse
        const customerBody2 = (await customerRes2.json()) as NextActionResponse

        expect(adminBody2.phase).toBe('booking')
        expect(typeof adminBody2.nextAction).toBe('string')
        expect(adminBody2.nextAction.length).toBeGreaterThan(0)
        expect(customerBody2.nextAction).toBe(adminBody2.nextAction)
        expect(customerBody2).toEqual(adminBody2)

        // Not just equal to each other — actually different from scenario 1,
        // proving the shared computation reads real state rather than
        // returning a constant both routes happen to share.
        expect(adminBody2.nextAction).not.toBe(adminBody1.nextAction)

        // ---- scenario 3: the default three requirements, all outstanding -
        // The multi-item case is the one that would expose row-order
        // nondeterminism: two independent HTTP requests each re-read
        // project_booking_requirements, and Postgres guarantees no row
        // order without an ORDER BY. Asserting the two surfaces agree HERE
        // is what makes AC-39.3's "identical strings" a property of the
        // computation rather than a coincidence of row arrival order.
        await pg.query('DELETE FROM project_booking_requirements WHERE project_id = $1', [projectId])
        await pg.query('DELETE FROM project_milestones WHERE project_id = $1', [projectId])

        const [adminRes3, customerRes3] = await Promise.all([
          fetch(`${base}/api/admin/projects/${projectId}/next-action`, { headers: adminHeaders }),
          fetch(`${base}/api/customer/projects/${projectId}/next-action`, { headers: customerHeaders }),
        ])
        expect(adminRes3.status).toBe(200)
        expect(customerRes3.status).toBe(200)
        const adminBody3 = (await adminRes3.json()) as NextActionResponse
        const customerBody3 = (await customerRes3.json()) as NextActionResponse

        expect(customerBody3.nextAction).toBe(adminBody3.nextAction)
        expect(customerBody3).toEqual(adminBody3)
        // PRD 23.2's own list order (quote approved 4, contract signed 6,
        // deposit paid 8), not the order the rows happen to come back in.
        expect(adminBody3.nextAction).toBe('Awaiting: quote approved, contract signed, deposit paid.')

        // ---- a customer can never read a Project that isn't theirs -------
        // A second, unrelated Project (no customer assigned) proves the
        // route's ownership check, not just its happy path.
        const otherProject = await pg.query<{ id: number }>(
          `INSERT INTO projects (name, customer_account_id, status, current_phase)
           VALUES ($1, NULL, 'active', 'lead') RETURNING id`,
          ['US-39 AC-39.3 unrelated project (ownership check)'],
        )
        const otherProjectId = otherProject.rows[0].id
        try {
          const denied = await fetch(`${base}/api/customer/projects/${otherProjectId}/next-action`, {
            headers: customerHeaders,
          })
          expect(denied.status).toBe(404)
        } finally {
          await pg.query('DELETE FROM projects WHERE id = $1', [otherProjectId])
        }
      } finally {
        await pg.end()
      }
    },
    30000,
  )
})
