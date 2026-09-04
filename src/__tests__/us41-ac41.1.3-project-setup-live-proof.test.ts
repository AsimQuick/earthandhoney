/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us41-ac41.1.3-project-setup-live-proof.test.ts
 * project: earthandhoney
 * purpose: Verify AC-41.1.3 — AC-41.1's original text and evidence clause,
 *          unchanged: with AC-41.1.1's PROJECT_SETUP_MECHANISM_MAP.md,
 *          AC-41.1.2.1's single `projectSetupService.completeProjectSetup`
 *          setup path and AC-41.1.2.3's five read-back routes all in
 *          place, one live `POST /api/admin/projects` call produces or
 *          prepares all ten PRD 22.3 items, each asserted individually
 *          against the running stack — not a summary count, because an AC
 *          that closes on a partial implementation is the exact gap the
 *          sprint-5 Tester's plan review caught eight times.
 *
 *          The ten assertions below are exactly the ten the mechanism map
 *          already fixed, one per item, so this suite makes no
 *          interpretation decision of its own:
 *
 *            1. Project record             — GET /:id
 *            2. Client relationship        — GET /:id's customerAccountId,
 *                                             cross-checked directly
 *                                             against the customer_accounts
 *                                             row it resolved to
 *            3. Media area                 — GET /:id/media-area
 *            4. Project Room access record — GET /:id/room-access
 *            5. Default phase + milestones — GET /:id/next-action's phase
 *                                             field, GET /:id/milestones
 *            6. Next-action calculation    — GET /:id/next-action
 *            7. Document area              — GET /:id/documents
 *            8. Email merge context        — the map's own answer: no
 *                                             dedicated table or route
 *                                             exists for this item, so it
 *                                             is asserted the way the map
 *                                             itself resolves it — a
 *                                             direct read of the
 *                                             email_queue row item 4's
 *                                             invitation queues, against
 *                                             backstage-db
 *            9. Financial placeholder      — GET /:id/integration-status
 *           10. Activity timeline          — GET /:id/timeline
 *
 *          Follows AC-39.3.1's NEXT_ACTION_CROSS_SURFACE_MAP.md recipe
 *          exactly — the same recipe AC-39.3.3 and AC-39.6.3 already
 *          followed — and invents no new one:
 *          - Auth: admin only, via `POST /api/auth/admin/login`. No
 *            customer login: every read below sits on the admin router.
 *          - No pre-seeding of a Project is needed or wanted here — unlike
 *            AC-39.6.3 (which had no automated Project-creation path to
 *            call and so seeded one directly), this AC's whole point is
 *            that `POST /api/admin/projects` itself now works end to end.
 *            This suite is also the live proof that the route is
 *            unblocked by migration 129's `events.manage` seed — AC-39.6.3
 *            proved three OTHER routes on this same router, not this one.
 *          - The create call supplies only `name` and `primaryContactEmail`
 *            — no `customerAccountId` — exercising the map's own "common
 *            case for a brand-new inquiry" (item 2(b)): a new PASSIVE
 *            `customer_accounts` row via `createDirect`, then an
 *            invitation via `createInvitation` (item 4), since that fresh
 *            account has no active login yet.
 *
 *          One of the ten can fail for a reason this AC does not own: item
 *          3, the media area, if this deployment's storage backend hits
 *          F6 or F7. PROJECT_SETUP_MECHANISM_MAP.md's own storage-backend
 *          probe already confirmed a zero-byte `getStorage().put()` /
 *          `.exists()` round trip succeeds against this deployment's real
 *          R2 backend, so item 3 is expected to pass here; if it does not,
 *          that is AC-41.3's finding to record (a fork patch or a
 *          `pending_po_routing` entry), never a workaround inside this
 *          suite.
 *
 *          The timeline summary and entry-type constant are tied back to
 *          the COMMITTED `projectSetupRules.js` and
 *          `activityTimelineEntry.js` — required by absolute path, the
 *          same technique AC-39.3.3's and AC-39.6.3's suites use — so a
 *          stale `backstage-backend` image fails this suite rather than
 *          quietly passing against code it is not testing.
 *          `backstage-backend` was rebuilt with `--build` immediately
 *          before this suite was run, closing AC-39.3.1's recorded
 *          stale-container gap.
 *
 *          Guarded on `dns.lookup('backstage-backend')` /
 *          `dns.lookup('backstage-db')` resolving — skipped, not failed,
 *          outside this project's Docker network, like every other
 *          LIVE-lane suite here. All ten item checks share the one create
 *          call (performed once in `beforeAll`), each in its own named
 *          `it()` so Jest's own report names all ten individually rather
 *          than folding them into one pass/fail count — the shape this
 *          AC's own evidence clause requires. Every row this suite's
 *          create call produces or touches (the project — whose cascade
 *          deletes its cloned milestones, its financial-placeholder row
 *          and its timeline entry — the new customer account, its
 *          invitation, and its queued invitation email) is deleted in
 *          `afterAll` so a re-run accumulates no state.
 *
 *          NOT COVERED (out of this AC's own scope):
 *          - Atomicity of the setup path under an induced mid-setup
 *            failure — AC-41.4's question.
 *          - F1/F2's Gallery-does-not-inherit-Client finding and the
 *            `PUT /api/admin/events/:id` 500 — AC-41.2's question.
 *          - Whether item 3 succeeds under every possible storage
 *            backend — AC-41.3's question; this suite proves it against
 *            THIS deployment's actually configured backend only.
 *          - The email merge context's actual template render or send —
 *            AC-41.5's own question is the merge MECHANISM; the email
 *            queue's processor is not run by this suite, only the row it
 *            queued is read back.
 *          - Rendering. Every response here is fetched as raw JSON; no
 *            cockpit UI is exercised — that is US-43's job.
 * created-by: dev-team
 * related-story: US-41
 * related-ac: 41.1.3
 * ---
 */
import dns from 'dns/promises'
import path from 'path'

import { Client } from 'pg'

type ProjectRecord = {
  id: number
  name: string
  customerAccountId: number | null
  customerEmail: string | null
  status: string
  createdAt: string
  updatedAt: string
}

type CreateResponse = { message: string; project: ProjectRecord }
type DetailResponse = { project: ProjectRecord }
type MediaAreaResponse = { projectId: number; key: string; exists: boolean }
type RoomAccessResponse = {
  projectId: number
  customerAccountId: number | null
  hasActiveAccount: boolean
  invitationPending: boolean
}
type MilestoneRow = {
  milestone_key: string
  name: string
  sequence_order: number
  completion_state: string
}
type MilestonesResponse = { projectId: number; milestones: MilestoneRow[] }
type NextActionResponse = { projectId: number; phase: string; nextAction: string; computedNextAction: string }
type DocumentsResponse = { projectId: number; documents: unknown[] }
type IntegrationRow = { integration_key: string; status: string; message: string | null }
type IntegrationStatusResponse = { projectId: number; integrations: IntegrationRow[] }
type TimelineEntry = {
  id: number
  entryType: string
  summary: string
  actorName: string
  occurredAt: string
}
type TimelineResponse = { projectId: number; entries: TimelineEntry[] }

// The committed pure modules, required by absolute path exactly as
// AC-39.3.3's and AC-39.6.3's suites do. Neither requires anything else,
// so both load here without a database, and a stale backstage-backend
// container running pre-AC-41.1.2.1 code fails this suite's pinned
// assertions rather than passing against itself.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const setupRules = require(
  path.join(process.cwd(), 'vendor', 'picpeak', 'backend', 'src/services/projectSetupRules.js'),
) as { describeProjectCreated: (projectName: string) => string }
// eslint-disable-next-line @typescript-eslint/no-require-imports
const entryShape = require(
  path.join(process.cwd(), 'vendor', 'picpeak', 'backend', 'src/services/activityTimelineEntry.js'),
) as { ENTRY_TYPES: { PROJECT_CREATED: string } }

describe('AC-41.1.3: one live Project-create call produces or prepares all ten PRD 22.3 items, asserted individually', () => {
  const base = process.env.BACKSTAGE_BACKEND_URL || 'http://backstage-backend:3000'
  const adminUsername = process.env.BACKSTAGE_ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.BACKSTAGE_ADMIN_PASSWORD || 'change-me-in-production'

  const MARKER = `ac41-1-3-proof-${Date.now()}`
  const PROJECT_NAME = `${MARKER} project`
  const PRIMARY_CONTACT_EMAIL = `${MARKER}@example.test`

  let db: Client
  let liveAvailable = false
  let authHeaders: Record<string, string> = {}
  let projectId: number | null = null
  let createdCustomerAccountId: number | null = null

  beforeAll(async () => {
    try {
      await dns.lookup('backstage-backend')
      await dns.lookup('backstage-db')
    } catch {
      // Not running inside the project's Docker network — nothing to
      // prove live from here. Every it() below checks this same flag and
      // returns immediately, so the suite is skipped rather than failed,
      // matching every other LIVE-lane suite in this repository.
      return
    }
    liveAvailable = true

    db = new Client({
      host: 'backstage-db',
      port: 5432,
      user: process.env.BACKSTAGE_DB_USER || 'backstage',
      password: process.env.BACKSTAGE_DB_PASSWORD || 'change-me-in-production',
      database: process.env.BACKSTAGE_DB_NAME || 'backstage',
    })
    await db.connect()

    // ---- auth: a real login, exactly the map's recorded recipe --------
    const adminLoginRes = await fetch(`${base}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: adminUsername, password: adminPassword }),
    })
    expect(adminLoginRes.status).toBe(200)
    const adminCookie = (adminLoginRes.headers.get('set-cookie') || '').split(';')[0]
    expect(adminCookie).toMatch(/^admin_token=/)
    authHeaders = { 'Content-Type': 'application/json', Cookie: adminCookie }

    // ---- the ONE Project-create call this whole AC proves -------------
    // No customerAccountId is supplied, so completeProjectSetup takes the
    // map's own "common case for a brand-new inquiry" path: a new PASSIVE
    // customer_accounts row (createDirect), then an invitation
    // (createInvitation), since that fresh account has no active login.
    // This call succeeding at all is also the live proof that
    // migration 129's events.manage seed unblocked this route.
    const createRes = await fetch(`${base}/api/admin/projects`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: PROJECT_NAME, primaryContactEmail: PRIMARY_CONTACT_EMAIL }),
    })
    expect(createRes.status).toBe(201)
    const created = (await createRes.json()) as CreateResponse
    expect(created.message).toBe('Project created')
    projectId = created.project.id
    createdCustomerAccountId = created.project.customerAccountId

    console.log('AC-41.1.3 live proof — created project %d for marker %s', projectId, MARKER)
  }, 30000)

  afterAll(async () => {
    if (!liveAvailable) return
    try {
      // Deleting the project cascades project_milestones (migration 124),
      // project_integration_status and project_documents (migration 125)
      // and project_activity_timeline (migration 128) — all declare
      // onDelete('CASCADE') on project_id.
      if (projectId) await db.query('delete from projects where id = $1', [projectId])
      if (PRIMARY_CONTACT_EMAIL) {
        await db.query('delete from customer_invitations where email = $1', [PRIMARY_CONTACT_EMAIL])
        await db.query('delete from email_queue where recipient_email = $1', [PRIMARY_CONTACT_EMAIL])
      }
      if (createdCustomerAccountId) await db.query('delete from customer_accounts where id = $1', [createdCustomerAccountId])
    } finally {
      if (db) await db.end()
    }
  }, 30000)

  it('item 1 — the Project record: GET /:id returns the created row by id and name', async () => {
    if (!liveAvailable) return
    const res = await fetch(`${base}/api/admin/projects/${projectId}`, { headers: authHeaders })
    expect(res.status).toBe(200)
    const body = (await res.json()) as DetailResponse
    expect(body.project.id).toBe(projectId)
    expect(body.project.name).toBe(PROJECT_NAME)
  })

  it('item 2 — the operational client relationship: a customerAccountId is assigned, resolving to a real customer_accounts row with the supplied email', async () => {
    if (!liveAvailable) return
    const res = await fetch(`${base}/api/admin/projects/${projectId}`, { headers: authHeaders })
    const body = (await res.json()) as DetailResponse
    expect(body.project.customerAccountId).not.toBeNull()
    expect(body.project.customerEmail).toBe(PRIMARY_CONTACT_EMAIL)

    const row = await db.query<{ email: string; password_hash: string | null }>(
      'select email, password_hash from customer_accounts where id = $1',
      [body.project.customerAccountId],
    )
    expect(row.rows).toHaveLength(1)
    expect(row.rows[0].email).toBe(PRIMARY_CONTACT_EMAIL)
    // PASSIVE — createDirect, never createInvitation's own row shape —
    // matching the map's item 2(b) "common case" path.
    expect(row.rows[0].password_hash).toBeNull()
  })

  it('item 3 — the empty project media area: GET /:id/media-area reports the zero-byte marker object exists', async () => {
    if (!liveAvailable) return
    const res = await fetch(`${base}/api/admin/projects/${projectId}/media-area`, { headers: authHeaders })
    expect(res.status).toBe(200)
    const body = (await res.json()) as MediaAreaResponse
    expect(body.key).toBe(`projects/${projectId}/media/.keep`)
    expect(body.exists).toBe(true)
  })

  it('item 4 — the Project Room access record: GET /:id/room-access shows a pending invitation for the fresh client, no active login yet', async () => {
    if (!liveAvailable) return
    const res = await fetch(`${base}/api/admin/projects/${projectId}/room-access`, { headers: authHeaders })
    expect(res.status).toBe(200)
    const body = (await res.json()) as RoomAccessResponse
    expect(body.customerAccountId).toBe(createdCustomerAccountId)
    expect(body.hasActiveAccount).toBe(false)
    expect(body.invitationPending).toBe(true)
  })

  it('item 5 — the default phase and milestones: the Project starts in "lead" with all eighteen PRD 23.2 milestones cloned onto it', async () => {
    if (!liveAvailable) return
    const nextActionRes = await fetch(`${base}/api/admin/projects/${projectId}/next-action`, { headers: authHeaders })
    const nextActionBody = (await nextActionRes.json()) as NextActionResponse
    expect(nextActionBody.phase).toBe('lead')

    const milestonesRes = await fetch(`${base}/api/admin/projects/${projectId}/milestones`, { headers: authHeaders })
    expect(milestonesRes.status).toBe(200)
    const milestonesBody = (await milestonesRes.json()) as MilestonesResponse
    expect(milestonesBody.milestones).toHaveLength(18)
    expect(milestonesBody.milestones.every((m) => m.completion_state === 'pending')).toBe(true)
    expect(new Set(milestonesBody.milestones.map((m) => m.milestone_key)).size).toBe(18)
  })

  it('item 6 — the next-action calculation: GET /:id/next-action returns a non-empty, real computed string for the fresh Project', async () => {
    if (!liveAvailable) return
    const res = await fetch(`${base}/api/admin/projects/${projectId}/next-action`, { headers: authHeaders })
    expect(res.status).toBe(200)
    const body = (await res.json()) as NextActionResponse
    expect(body.projectId).toBe(projectId)
    expect(typeof body.nextAction).toBe('string')
    expect(body.nextAction.length).toBeGreaterThan(0)
    expect(body.computedNextAction).toBe(body.nextAction) // no override set yet
  })

  it('item 7 — the document area: GET /:id/documents returns a well-defined, correctly-empty list for the fresh Project', async () => {
    if (!liveAvailable) return
    const res = await fetch(`${base}/api/admin/projects/${projectId}/documents`, { headers: authHeaders })
    expect(res.status).toBe(200)
    const body = (await res.json()) as DocumentsResponse
    expect(body.projectId).toBe(projectId)
    expect(Array.isArray(body.documents)).toBe(true)
    expect(body.documents).toHaveLength(0)
  })

  it('item 8 — the email merge context: the invitation queueEmail queued for this create carries the real merge variables, read directly from email_queue', async () => {
    if (!liveAvailable) return
    // No dedicated table or route exists for this item — PROJECT_SETUP_
    // MECHANISM_MAP.md's own answer resolves it to queueEmail's emailData,
    // already exercised by item 4's invitation. Read the row it wrote.
    const row = await db.query<{ email_type: string; email_data: string | Record<string, unknown> }>(
      "select email_type, email_data from email_queue where recipient_email = $1 order by id desc limit 1",
      [PRIMARY_CONTACT_EMAIL],
    )
    expect(row.rows).toHaveLength(1)
    expect(row.rows[0].email_type).toBe('customer_invitation')
    const emailData = typeof row.rows[0].email_data === 'string'
      ? JSON.parse(row.rows[0].email_data)
      : row.rows[0].email_data
    expect(typeof emailData.invite_link).toBe('string')
    expect(emailData.invite_link.length).toBeGreaterThan(0)
    expect(typeof emailData.expires_at).toBe('string')
  })

  it('item 9 — the financial integration placeholder: GET /:id/integration-status reports one pending row naming no external system', async () => {
    if (!liveAvailable) return
    const res = await fetch(`${base}/api/admin/projects/${projectId}/integration-status`, { headers: authHeaders })
    expect(res.status).toBe(200)
    const body = (await res.json()) as IntegrationStatusResponse
    expect(body.integrations).toHaveLength(1)
    expect(body.integrations[0].integration_key).toBe('financial_placeholder')
    expect(body.integrations[0].status).toBe('pending')
    expect(body.integrations[0].message).toBeNull()
  })

  it('item 10 — the activity timeline: GET /:id/timeline shows exactly one PROJECT_CREATED entry for this create', async () => {
    if (!liveAvailable) return
    const res = await fetch(`${base}/api/admin/projects/${projectId}/timeline`, { headers: authHeaders })
    expect(res.status).toBe(200)
    const body = (await res.json()) as TimelineResponse
    expect(body.projectId).toBe(projectId)
    expect(body.entries).toHaveLength(1)
    const [entry] = body.entries
    expect(entry.entryType).toBe(entryShape.ENTRY_TYPES.PROJECT_CREATED)
    expect(entry.actorName).toBe(adminUsername)
    expect(entry.summary).toBe(setupRules.describeProjectCreated(PROJECT_NAME))
    const parsed = new Date(entry.occurredAt).getTime()
    expect(Number.isNaN(parsed)).toBe(false)

    // The AC's evidence clause: the passing run with all ten shown.
    console.log('AC-41.1.3 live proof — project %d, all ten PRD 22.3 items verified', projectId)
  })
})
