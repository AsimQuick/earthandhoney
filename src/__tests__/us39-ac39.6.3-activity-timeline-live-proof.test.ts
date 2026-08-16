/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us39-ac39.6.3-activity-timeline-live-proof.test.ts
 * project: earthandhoney
 * purpose: Verify AC-39.6.3 — AC-39.6's original evidence clause: with
 *          migration 128's schema (AC-39.6.1.1), migration 129's
 *          events.manage grant (AC-39.6.1.2) and the shared timeline
 *          service's wiring into adminProjects.js (AC-39.6.2) all in place,
 *          one live test drives three real writes against the running
 *          backstage-backend for the SAME Project — a phase change, then a
 *          milestone completion, then a manual override, in that order —
 *          via `PUT /:id/phase`, `PUT /:id/milestones/:key/complete` and
 *          `PUT /:id/next-action/override` (adminProjects.js), and reads
 *          `GET /:id/timeline` back, asserting exactly three entries in
 *          that order, each carrying a non-empty actor name, a parseable
 *          timestamp, and a summary naming what changed.
 *
 *          It is also the live proof that AC-39.6.1.2's `events.manage`
 *          seed genuinely unblocked these three routes: before migration
 *          129, all three writes 403'd unconditionally (per
 *          NEXT_ACTION_CROSS_SURFACE_MAP.md's AC-39.3.1 finding) — this
 *          suite asserts 200 on every one of them, not just the read.
 *
 *          Follows AC-39.3.1's NEXT_ACTION_CROSS_SURFACE_MAP.md recipe
 *          exactly, inventing no new one (the same recipe
 *          AC-39.3.3 already followed for the cross-surface next-action
 *          proof):
 *          - Auth: admin only, via `POST /api/auth/admin/login`
 *            (username/password → `admin_token` cookie, question 3). No
 *            customer login is needed — all four routes this AC exercises
 *            sit on the admin router.
 *          - Seeding: the map's question 6 recipe — a direct write against
 *            `backstage-db`, the same Postgres instance the admin API
 *            itself reads from, never a mock or a second store — because
 *            `POST /api/admin/projects` 403s unconditionally (question 1)
 *            and no automated Project seeding path exists yet (US-41 is
 *            not built this sprint). One `customer_accounts` row and one
 *            `projects` row owned by it (current_phase 'lead', the
 *            untouched default), plus one project-scoped
 *            `project_milestones` row (`completion_state: 'pending'`) so
 *            the milestone-completion write below is a real, non-no-op
 *            change rather than a re-completion.
 *
 *          Both the phase-change and milestone-completion summaries are
 *          additionally tied back to the COMMITTED
 *          `vendor/picpeak/backend/src/services/projectChangeRules.js` and
 *          the entry-type constants to the COMMITTED
 *          `vendor/picpeak/backend/src/services/activityTimelineEntry.js`
 *          — required by absolute path, the same technique AC-39.3.3's
 *          suite uses — rather than only pinned to a literal string here.
 *          AC-39.6.3's own text names the exact hazard this defeats: "an
 *          unrebuilt image can make this suite pass against code it is not
 *          testing" — a stale `backstage-backend` container running
 *          pre-AC-39.6.2 code would either 404/403 outright or return
 *          entries whose shape no longer matches the committed pure
 *          modules, so this suite fails instead of quietly passing against
 *          the wrong code. `backstage-backend` was rebuilt with `--build`
 *          immediately before this suite was run, closing AC-39.3.1's
 *          recorded stale-container gap (the same rebuild AC-39.6.1.3's
 *          live migration proof already performed for this same story).
 *
 *          Guarded on `dns.lookup('backstage-backend')` /
 *          `dns.lookup('backstage-db')` resolving (this project's Docker
 *          network), the same technique every other LIVE-lane suite in
 *          this repository uses — skipped, not failed, outside that
 *          network. Seeded rows are deleted in a `finally` block so a
 *          re-run accumulates no state (deleting the `projects` row
 *          cascades to `project_milestones`, `project_activity_timeline`
 *          and `project_next_action_overrides` — migrations 124, 127 and
 *          128 all declare `onDelete('CASCADE')` on `project_id`).
 *
 *          NOT COVERED (out of this AC's scope):
 *          - The no-op cases (setting a phase to its current value;
 *            re-completing an already-complete milestone) — AC-39.6.2's
 *            own UNIT suite (us39-ac39.6.2-shared-activity-timeline.test.ts)
 *            already proves those append no entry, against the pure
 *            projectChangeRules module directly; this AC's job is the live
 *            three-real-writes proof, not renewed no-op coverage.
 *          - The `metadata` column's exact JSON shape per entry type —
 *            AC-39.6.2's UNIT suite covers that against
 *            activityTimelineEntry.js directly; this suite only asserts
 *            the three fields AC-39.6.3's own evidence clause names
 *            (actor name, timestamp, summary), plus ordering and count.
 *          - Rendering. `GET /:id/timeline` is fetched as raw JSON; no
 *            cockpit UI is exercised here — that is US-43's job.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.6.3
 * ---
 */
import dns from 'dns/promises'
import path from 'path'

import { Client } from 'pg'

type TimelineEntry = {
  id: number
  entryType: string
  summary: string
  actorAdminId: number | null
  actorName: string
  metadata: unknown
  occurredAt: string
}

type TimelineResponse = { projectId: number; entries: TimelineEntry[] }

// The committed pure modules, required by absolute path out of the
// vendored tree exactly as AC-39.3.3's suite does. Neither requires
// anything itself (no `../database/db`), so both load here without a
// database, and both were confirmed above to still describe the response
// shapes this suite reads live — a stale container running pre-AC-39.6.2
// code fails this suite rather than passing against itself.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const changeRules = require(
  path.join(process.cwd(), 'vendor', 'picpeak', 'backend', 'src/services/projectChangeRules.js'),
) as {
  describePhaseChange: (fromPhase: string, toPhase: string) => string
  describeMilestoneCompletion: (milestoneName: string) => string
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const entryShape = require(
  path.join(process.cwd(), 'vendor', 'picpeak', 'backend', 'src/services/activityTimelineEntry.js'),
) as {
  ENTRY_TYPES: { PHASE_CHANGE: string; MILESTONE_COMPLETED: string; NEXT_ACTION_OVERRIDE_SET: string }
}

describe('AC-39.6.3: three real writes (phase change, milestone completion, manual override) produce three ordered timeline entries, live', () => {
  it(
    'drives the three writes in order against the same Project and reads exactly three ordered entries back',
    async () => {
      try {
        await dns.lookup('backstage-backend')
        await dns.lookup('backstage-db')
      } catch {
        // Not running inside the project's Docker network — nothing to
        // prove live from here. No mocked-fetch fallback exists for this
        // AC because the thing being proven — that the events.manage gate
        // genuinely opened and three real writes really append, in order,
        // against a running server — is meaningless to fake.
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

      const MARKER = `ac39-6-3-proof-${Date.now()}`
      const email = `${MARKER}@example.test`
      // bcrypt('AC-39.6.3-Live-Proof-Pw!23', 10), computed once via
      // vendor/picpeak/backend's own bcrypt package, the same out-of-band
      // technique AC-39.3.3's suite header documents — never recomputed at
      // test-run time, and never exercised by a login in this suite (only
      // admin routes are exercised below).
      const PASSWORD_HASH = '$2b$10$iaR57I96TUjxWjesTKPfJODmYh6Ly97yW37IIfr3aN6EPCbLJ/tve'

      const MILESTONE_KEY = 'quote_approved'
      const MILESTONE_NAME = 'quote approved'
      const OVERRIDE_TEXT = `${MARKER} manual override text`

      let customerId: number | null = null
      let projectId: number | null = null

      try {
        // ---- seed (direct write against backstage-db, map question 6) --
        const customerInsert = await db.query<{ id: number }>(
          `insert into customer_accounts (email, password_hash, is_active) values ($1, $2, true) returning id`,
          [email, PASSWORD_HASH],
        )
        customerId = customerInsert.rows[0].id

        // The untouched default a Project starts in — the phase-change
        // write below moves it to 'booking', a real change.
        const projectInsert = await db.query<{ id: number }>(
          `insert into projects (name, customer_account_id, current_phase) values ($1, $2, 'lead') returning id`,
          [`${MARKER} project`, customerId],
        )
        projectId = projectInsert.rows[0].id

        // One project-scoped milestone row, left 'pending' — no automated
        // per-Project milestone cloning exists yet (US-41), so this suite
        // writes the one row its own milestone-completion write needs,
        // matching AC-39.3.3's precedent of seeding project_milestones
        // rows directly.
        await db.query(
          `insert into project_milestones
             (project_id, milestone_key, name, sequence_order, completion_state)
           values ($1, $2, $3, 4, 'pending')`,
          [projectId, MILESTONE_KEY, MILESTONE_NAME],
        )

        // ---- auth: a real login, exactly the map's recorded recipe -----
        const adminLoginRes = await fetch(`${base}/api/auth/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: adminUsername, password: adminPassword }),
        })
        expect(adminLoginRes.status).toBe(200)
        const adminCookie = (adminLoginRes.headers.get('set-cookie') || '').split(';')[0]
        expect(adminCookie).toMatch(/^admin_token=/)
        const authHeaders = { 'Content-Type': 'application/json', Cookie: adminCookie }

        // ---- write 1: phase change ("lead" -> "booking") ---------------
        const phaseRes = await fetch(`${base}/api/admin/projects/${projectId}/phase`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({ phase: 'booking' }),
        })
        expect(phaseRes.status).toBe(200)
        const phaseBody = (await phaseRes.json()) as { changed: boolean; project: { phase: string } }
        expect(phaseBody.changed).toBe(true)
        expect(phaseBody.project.phase).toBe('booking')

        // ---- write 2: milestone completion ------------------------------
        const milestoneRes = await fetch(
          `${base}/api/admin/projects/${projectId}/milestones/${MILESTONE_KEY}/complete`,
          { method: 'PUT', headers: authHeaders },
        )
        expect(milestoneRes.status).toBe(200)
        const milestoneBody = (await milestoneRes.json()) as { changed: boolean; milestone: { completionState: string } }
        expect(milestoneBody.changed).toBe(true)
        expect(milestoneBody.milestone.completionState).toBe('complete')

        // ---- write 3: manual next-action override -----------------------
        const overrideRes = await fetch(`${base}/api/admin/projects/${projectId}/next-action/override`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({ overrideText: OVERRIDE_TEXT }),
        })
        expect(overrideRes.status).toBe(200)

        // ---- read: exactly three entries, in order -----------------------
        const timelineRes = await fetch(`${base}/api/admin/projects/${projectId}/timeline`, {
          headers: authHeaders,
        })
        expect(timelineRes.status).toBe(200)
        const timeline = (await timelineRes.json()) as TimelineResponse
        expect(timeline.projectId).toBe(projectId)

        expect(timeline.entries).toHaveLength(3)
        const [entry1, entry2, entry3] = timeline.entries

        // Order: phase change, then milestone completion, then override —
        // the exact sequence this AC's text requires, asserted by
        // entry_type (migration 128's own `id` ordering column, never
        // trusted to occurred_at alone since two writes in one run can
        // share a millisecond timestamp).
        expect(entry1.entryType).toBe(entryShape.ENTRY_TYPES.PHASE_CHANGE)
        expect(entry2.entryType).toBe(entryShape.ENTRY_TYPES.MILESTONE_COMPLETED)
        expect(entry3.entryType).toBe(entryShape.ENTRY_TYPES.NEXT_ACTION_OVERRIDE_SET)
        expect(entry1.id).toBeLessThan(entry2.id)
        expect(entry2.id).toBeLessThan(entry3.id)

        // Each entry: non-empty actor name, a parseable timestamp, and a
        // summary naming what changed — AC-39.6.3's own evidence clause.
        for (const entry of timeline.entries) {
          expect(typeof entry.actorName).toBe('string')
          expect(entry.actorName.length).toBeGreaterThan(0)
          expect(entry.actorName).toBe(adminUsername)

          expect(entry.occurredAt).toBeTruthy()
          const parsed = new Date(entry.occurredAt).getTime()
          expect(Number.isNaN(parsed)).toBe(false)

          expect(typeof entry.summary).toBe('string')
          expect(entry.summary.length).toBeGreaterThan(0)
        }

        // Each summary pinned to what the COMMITTED projectChangeRules
        // module returns for exactly this write, so a stale
        // `backstage-backend` image fails here rather than passing against
        // itself — AC-39.3.1's recorded operational hazard, the same
        // defence AC-39.3.3's suite applies to nextActionRules.js.
        expect(entry1.summary).toBe(changeRules.describePhaseChange('lead', 'booking'))
        expect(entry2.summary).toBe(changeRules.describeMilestoneCompletion(MILESTONE_NAME))
        expect(entry3.summary).toBe(`Next action manually overridden: "${OVERRIDE_TEXT}"`)
        expect(entry3.summary).toContain(OVERRIDE_TEXT)

        // The AC's evidence clause: "the passing run with the three
        // ordered entries shown."
        console.log(
          'AC-39.6.3 live proof — project %d timeline (oldest first): %j',
          projectId,
          timeline.entries.map((e) => ({ entryType: e.entryType, actorName: e.actorName, summary: e.summary, occurredAt: e.occurredAt })),
        )
      } finally {
        // No accumulated state on repeated runs. project_milestones,
        // project_activity_timeline and project_next_action_overrides rows
        // all cascade-delete with their project (migrations 124, 127, 128's
        // `onDelete('CASCADE')` on project_id), so deleting the project is
        // enough on that side.
        if (projectId) await db.query('delete from projects where id = $1', [projectId])
        if (customerId) await db.query('delete from customer_accounts where id = $1', [customerId])
        await db.end()
      }
    },
    30000,
  )
})
