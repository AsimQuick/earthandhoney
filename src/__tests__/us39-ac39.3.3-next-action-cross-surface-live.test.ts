/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us39-ac39.3.3-next-action-cross-surface-live.test.ts
 * project: earthandhoney
 * purpose: Verify AC-39.3.3 — PRD Phase 3's exit criterion (photographer and
 *          client seeing the same authoritative workflow state) proven live
 *          at the service boundary: the cockpit's next-action route
 *          (`GET /api/admin/projects/:id/next-action`, adminProjects.js) and
 *          the Project Room's next-action route
 *          (`GET /api/customer/projects/:id/next-action`, customer.js) are
 *          fetched for the SAME Project, in the SAME run, and asserted to
 *          return identical `nextAction` strings — for two different
 *          Project states (a bare "lead" phase and a partially-satisfied
 *          "booking" phase), so the equality is a property of the shared
 *          AC-39.3.2 computation rather than of one untouched default.
 *
 *          Follows AC-39.3.1's NEXT_ACTION_CROSS_SURFACE_MAP.md recipe
 *          exactly, inventing no new one:
 *          - Auth: admin via `POST /api/auth/admin/login`
 *            (username/password → `admin_token` cookie, question 3), customer
 *            via `POST /api/customer/auth/login` (email/password →
 *            `customer_token` cookie, question 3). Both are real logins —
 *            only row *creation* below bypasses the API, never
 *            authentication itself, exactly as question 6 specifies.
 *          - Seeding: the map's question 6 recipe — a direct write against
 *            `backstage-db`, the same Postgres instance the admin and
 *            customer APIs themselves read from, never a mock or a second
 *            store — because `POST /api/admin/projects` 403s unconditionally
 *            (question 1's `events.manage` finding) and no automated Project
 *            seeding path exists yet (US-41 is not built this sprint). One
 *            `customer_accounts` row (email + bcrypt `password_hash`, per
 *            question 6) and two `projects` rows owned by it, one of which
 *            also gets one `project_milestones` completion row. This suite
 *            uses the `pg` driver already present in this repo's own
 *            dependency tree (pulled in transitively by
 *            `@payloadcms/db-postgres`) to open that connection —
 *            AC-18.3's no-cross-database-access guard explicitly scopes its
 *            "no raw `pg` import" rule to application code under `src/`
 *            outside `__tests__/`, carving out exactly this kind of
 *            direct-verification test (see that suite's own final `it`).
 *            The `password_hash` below is a bcrypt hash of the plaintext
 *            password computed once, out of band, with the vendored
 *            backend's own `bcrypt` package (`vendor/picpeak/backend`) —
 *            never recomputed at test-run time — so this suite carries no
 *            bcrypt dependency of its own; `bcrypt.compare()` still runs
 *            inside `backstage-backend` on every login, identically to a
 *            real customer's.
 *
 *          Both live strings are additionally tied back to the COMMITTED
 *          `vendor/picpeak/backend/src/services/nextActionRules.js` —
 *          required by absolute path, the same technique AC-39.3.2's unit
 *          suite uses — rather than only to each other. AC-39.3.1's map
 *          closes on an operational hazard (its "a currently running
 *          container does not reflect this source" section): a live round
 *          trip against a `backstage-backend` image built from stale code
 *          passes silently, proving nothing about the committed source. A
 *          bare cockpit === projectRoom assertion is exactly the shape that
 *          hazard defeats — two stale routes agree with each other
 *          perfectly. Comparing against the committed rules module makes a
 *          stale container fail this suite instead.
 *
 *          Guarded on `dns.lookup('backstage-backend')` /
 *          `dns.lookup('backstage-db')` resolving (this project's Docker
 *          network), the same technique every other LIVE-lane suite in this
 *          repository uses — skipped, not failed, outside that network.
 *          Seeded rows are deleted in a `finally` block so a re-run
 *          accumulates no state.
 *
 *          NOT COVERED (left to US-43 AC-43.2 and US-44 AC-44.7, which make
 *          this same cross-surface assertion from the finished cockpit and
 *          Project Room UIs rather than the raw service boundary):
 *          - Anything AC-39.3.1 itself recorded as blocked: the
 *            `events.manage` permission gap on the admin
 *            create/update/attach-event routes (question 1), and the
 *            customer-side Project ownership check's exact shape beyond the
 *            plain equality this suite exercises (question 4) — the 404
 *            given to a customer requesting another customer's Project is
 *            AC-39.3.2's own source-level guard, not re-proven live here.
 *          - The absence of any automated Project-seeding path (question 6):
 *            because `POST /api/admin/projects` 403s, this suite writes its
 *            two Projects straight into `backstage-db` using the map's own
 *            recorded recipe. It therefore proves nothing about how a
 *            Project is really created — that is US-41's atomic setup, and
 *            the cross-surface assertion is made again over a
 *            properly-created Project by US-43 AC-43.2 / US-44 AC-44.7.
 *          - Rendering. Both routes are fetched as raw JSON; no cockpit or
 *            Project Room UI is exercised by this suite.
 *          - The remaining five of PRD 23.1's seven phases (preparation,
 *            shoot, post_production, delivery, closed) and the
 *            booking-phase "not configured" / "complete" edge cases —
 *            AC-39.3.2's table-driven UNIT suite already covers all seven
 *            against the rules module directly; this AC's job is the live
 *            cross-surface proof, not renewed phase coverage.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.3.3
 * ---
 */
import dns from 'dns/promises'
import path from 'path'

import { Client } from 'pg'

type NextActionResponse = { projectId: number; phase: string; nextAction: string }

type MilestoneMeta = { name: string; sequenceOrder: number }

// The committed rules module, required by absolute path out of the vendored
// tree exactly as AC-39.3.2's unit suite does. It requires nothing itself
// (no `../database/db`), so it loads here without a database.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rules = require(
  path.join(process.cwd(), 'vendor', 'picpeak', 'backend', 'src/services/nextActionRules.js'),
) as {
  resolveNextAction: (state: {
    phase: string
    requiredMilestoneKeys?: string[]
    completedMilestoneKeys?: string[]
    milestoneMetaByKey?: Map<string, MilestoneMeta>
  }) => string
  PHASE_NEXT_ACTIONS: Record<string, string>
}

// PRD 23.2's normal-case booking requirements and their list positions,
// written out here rather than read back from `backstage-db`, so the
// expectation below is the PRD's own ordering and not whatever the live
// rows happen to say.
const PRD_BOOKING_META = new Map<string, MilestoneMeta>([
  ['quote_approved', { name: 'quote approved', sequenceOrder: 4 }],
  ['contract_signed', { name: 'contract signed', sequenceOrder: 6 }],
  ['deposit_paid', { name: 'deposit paid', sequenceOrder: 8 }],
])

describe('AC-39.3.3: the cockpit and the Project Room return identical next-action strings, live, for two Project states', () => {
  it(
    'fetches both surfaces for the same Project in one run, for a lead-phase Project and a partially-booked Project, and asserts equal strings',
    async () => {
      try {
        await dns.lookup('backstage-backend')
        await dns.lookup('backstage-db')
      } catch {
        // Not running inside the project's Docker network — nothing to
        // prove live from here. No mocked-fetch fallback exists for this
        // AC because the thing being proven — that two independently
        // deployed routes agree over the wire — is meaningless to fake.
        return
      }

      const base = process.env.BACKSTAGE_BACKEND_URL || 'http://backstage-backend:3000'
      const adminUsername = process.env.BACKSTAGE_ADMIN_USERNAME || 'admin'
      const adminPassword = process.env.BACKSTAGE_ADMIN_PASSWORD || 'change-me-in-production'

      const db = new Client({
        host: 'backstage-db',
        port: 5432,
        user: process.env.BACKSTAGE_DB_USER || 'backstage',
        password: process.env.BACKSTAGE_DB_PASSWORD || 'change-me-in-production',
        database: process.env.BACKSTAGE_DB_NAME || 'backstage',
      })
      await db.connect()

      const MARKER = `ac39-3-3-proof-${Date.now()}`
      const email = `${MARKER}@example.test`
      // bcrypt('AC-39.3.3-Live-Proof-Pw!23', 10), computed once via
      // vendor/picpeak/backend's own bcrypt package — see the file header.
      const PASSWORD_HASH = '$2b$10$iaR57I96TUjxWjesTKPfJODmYh6Ly97yW37IIfr3aN6EPCbLJ/tve'
      const PLAINTEXT_PASSWORD = 'AC-39.3.3-Live-Proof-Pw!23'

      let customerId: number | null = null
      let leadProjectId: number | null = null
      let bookingProjectId: number | null = null

      try {
        // ---- seed (direct write against backstage-db, map question 6) --
        const customerInsert = await db.query<{ id: number }>(
          `insert into customer_accounts (email, password_hash, is_active) values ($1, $2, true) returning id`,
          [email, PASSWORD_HASH],
        )
        customerId = customerInsert.rows[0].id

        // State 1: phase "lead", no milestone state — the untouched
        // default a project starts in.
        const leadInsert = await db.query<{ id: number }>(
          `insert into projects (name, customer_account_id, current_phase) values ($1, $2, 'lead') returning id`,
          [`${MARKER} lead project`, customerId],
        )
        leadProjectId = leadInsert.rows[0].id

        // State 2: phase "booking", one of the three default requirements
        // (quote_approved) complete, the other two left outstanding by
        // simply not writing rows for them — getCompletedMilestoneKeys only
        // selects rows that exist AND are complete.
        const bookingInsert = await db.query<{ id: number }>(
          `insert into projects (name, customer_account_id, current_phase) values ($1, $2, 'booking') returning id`,
          [`${MARKER} booking project`, customerId],
        )
        bookingProjectId = bookingInsert.rows[0].id
        await db.query(
          `insert into project_milestones
             (project_id, milestone_key, name, sequence_order, completion_state, completed_at, completed_by)
           values ($1, 'quote_approved', 'quote approved', 4, 'complete', now(), $2)`,
          [bookingProjectId, MARKER],
        )

        // ---- auth: real logins, exactly the map's recorded recipe -------
        const adminLoginRes = await fetch(`${base}/api/auth/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: adminUsername, password: adminPassword }),
        })
        expect(adminLoginRes.status).toBe(200)
        const adminCookie = (adminLoginRes.headers.get('set-cookie') || '').split(';')[0]
        expect(adminCookie).toMatch(/^admin_token=/)

        const customerLoginRes = await fetch(`${base}/api/customer/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: PLAINTEXT_PASSWORD }),
        })
        expect(customerLoginRes.status).toBe(200)
        const customerCookie = (customerLoginRes.headers.get('set-cookie') || '').split(';')[0]
        expect(customerCookie).toMatch(/^customer_token=/)

        // ---- fetch both surfaces for both states, in this one run ------
        async function fetchBothSurfaces(projectId: number) {
          const [adminRes, customerRes] = await Promise.all([
            fetch(`${base}/api/admin/projects/${projectId}/next-action`, {
              headers: { Cookie: adminCookie },
            }),
            fetch(`${base}/api/customer/projects/${projectId}/next-action`, {
              headers: { Cookie: customerCookie },
            }),
          ])
          expect(adminRes.status).toBe(200)
          expect(customerRes.status).toBe(200)
          const cockpit = (await adminRes.json()) as NextActionResponse
          const projectRoom = (await customerRes.json()) as NextActionResponse

          // "for the same Project" is the load-bearing half of this AC, so
          // it is asserted rather than assumed from the URL: both responses
          // must name the Project that was actually asked for, and report
          // the same phase — two surfaces agreeing on a string while
          // describing two different Projects would prove nothing.
          expect(cockpit.projectId).toBe(projectId)
          expect(projectRoom.projectId).toBe(projectId)
          expect(cockpit.phase).toBe(projectRoom.phase)

          return { cockpit, projectRoom }
        }

        const lead = await fetchBothSurfaces(leadProjectId)
        const booking = await fetchBothSurfaces(bookingProjectId)

        // ---- the assertion PRD Phase 3's exit criterion rests on -------
        expect(typeof lead.cockpit.nextAction).toBe('string')
        expect(lead.cockpit.nextAction.length).toBeGreaterThan(0)
        expect(lead.cockpit.nextAction).toBe(lead.projectRoom.nextAction)

        expect(typeof booking.cockpit.nextAction).toBe('string')
        expect(booking.cockpit.nextAction.length).toBeGreaterThan(0)
        expect(booking.cockpit.nextAction).toBe(booking.projectRoom.nextAction)

        // Pinned to the literal strings a reader of this AC's evidence
        // sees, not just to each other — two surfaces silently agreeing on
        // the same wrong (or both-empty) string would satisfy a bare
        // equality check.
        expect(lead.cockpit.nextAction).toBe('Review the inquiry and send a quote.')
        expect(booking.cockpit.nextAction).toBe('Awaiting: contract signed, deposit paid.')

        // And pinned to what the COMMITTED rules module returns for the two
        // states seeded above, so a `backstage-backend` image built from
        // stale source fails here rather than passing against itself —
        // AC-39.3.1's recorded operational hazard.
        expect(lead.cockpit.nextAction).toBe(rules.PHASE_NEXT_ACTIONS.lead)
        expect(booking.cockpit.nextAction).toBe(
          rules.resolveNextAction({
            phase: 'booking',
            requiredMilestoneKeys: ['quote_approved', 'contract_signed', 'deposit_paid'],
            completedMilestoneKeys: ['quote_approved'],
            milestoneMetaByKey: PRD_BOOKING_META,
          }),
        )

        // The equality is a property of the shared computation, not of one
        // untouched default: the two Projects really are in two different
        // states, and really do resolve to two different strings.
        expect(lead.cockpit.phase).toBe('lead')
        expect(booking.cockpit.phase).toBe('booking')
        expect(lead.cockpit.nextAction).not.toBe(booking.cockpit.nextAction)

        // The AC's evidence clause: "the passing run with both strings
        // shown". Printed per surface per state, so the run output names
        // which Project each pair came from.
        console.log(
          'AC-39.3.3 live proof — lead phase (project %d): cockpit=%j projectRoom=%j',
          leadProjectId,
          lead.cockpit.nextAction,
          lead.projectRoom.nextAction,
        )
        console.log(
          'AC-39.3.3 live proof — booking phase (project %d): cockpit=%j projectRoom=%j',
          bookingProjectId,
          booking.cockpit.nextAction,
          booking.projectRoom.nextAction,
        )
      } finally {
        // No accumulated state on repeated runs. project_milestones rows
        // cascade-delete with their project (migration 124's FK), so
        // deleting the two projects is enough on that side.
        if (leadProjectId) await db.query('delete from projects where id = $1', [leadProjectId])
        if (bookingProjectId) await db.query('delete from projects where id = $1', [bookingProjectId])
        if (customerId) await db.query('delete from customer_accounts where id = $1', [customerId])
        await db.end()
      }
    },
    30000,
  )
})
