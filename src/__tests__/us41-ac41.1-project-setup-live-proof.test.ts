/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us41-ac41.1-project-setup-live-proof.test.ts
 * project: earthandhoney
 * purpose: Verify AC-41.1's own evidence clause verbatim: "One
 *          Project-create call against a running stack produces or
 *          prepares all ten items PRD 22.3 names, asserted individually
 *          ... not a summary count." One `POST /api/admin/projects` call
 *          is made; every one of the ten items is then asserted by its
 *          own name, against the live backstage-backend / backstage-db,
 *          never a "10/10" aggregate.
 *
 *          Auth: admin only, via `POST /api/auth/admin/login`
 *          (NEXT_ACTION_CROSS_SURFACE_MAP.md's recorded recipe, the same
 *          one AC-39.3.3's and AC-39.6.3's suites already use). No
 *          customer login is exercised — this AC proves setup PREPARES
 *          the client's access record, not that the client can use it
 *          yet.
 *
 *          `POST /api/admin/projects` itself is exercised here for the
 *          first time in this sprint: NEXT_ACTION_CROSS_SURFACE_MAP.md
 *          (AC-39.3.1) recorded it 403ing unconditionally because no
 *          migration seeded `events.manage`; migration 129
 *          (AC-39.6.1.2) fixed that, and AC-39.6.3's suite already
 *          proved three OTHER `events.manage`-gated routes on this same
 *          router return 200 with this exact admin login — this suite is
 *          the live proof that the create route itself is unblocked too.
 *
 *          Ten items, ten named assertions (PRD 22.3's own order):
 *            1. Project record             — the create response's own project.
 *            2. operational client relationship — project.customerAccountId,
 *               cross-checked against the customer_accounts row it points to.
 *            3. empty project media area/folder — GET /:id/media-folder,
 *               a real existence check against this deployment's configured
 *               storage backend (S3/R2 per docker-compose.yml), not just
 *               the computed key string.
 *            4. Project Room access record — a customer_invitations row,
 *               read directly off backstage-db (no admin route lists
 *               invitations by project; this is the same direct-DB-read
 *               technique AC-39.6.3's suite already uses for its own seed
 *               data).
 *            5. default phase and milestones — projects.current_phase
 *               (direct read) plus GET /:id/milestones (all eighteen,
 *               pending).
 *            6. next-action calculation      — GET /:id/next-action.
 *            7. document area                — GET /:id/documents, empty.
 *            8. email merge context          — the email_queue row
 *               createInvitation queued, read directly off backstage-db,
 *               its email_data carrying the merge variables handed to the
 *               Backstage queue's own mechanism.
 *            9. financial integration placeholder — GET
 *               /:id/integration-status, one 'pending' row, no ledger call.
 *           10. activity timeline            — GET /:id/timeline, one
 *               'project_created' entry.
 *
 *          Guarded on `dns.lookup('backstage-backend')` /
 *          `dns.lookup('backstage-db')`, skipped (not failed) outside
 *          this project's Docker network — the same technique every
 *          other LIVE-lane suite in this repository uses. Seeded/created
 *          rows are deleted in a `finally` block: deleting the `projects`
 *          row cascades to `project_milestones`, `project_documents`,
 *          `project_integration_status`, `project_activity_timeline` and
 *          `project_next_action_overrides` (all `ON DELETE CASCADE` on
 *          `project_id`); `customer_invitations` and `email_queue` rows
 *          are matched by the test's own marker email and deleted
 *          explicitly, since neither cascades from the project.
 *
 *          NOT COVERED (out of this AC's scope):
 *          - Atomicity under an induced mid-setup failure — AC-41.4.
 *          - The real S3/R2 storage edge cases (F6/F7) — AC-41.3.
 *          - Proving createInvitation/queueEmail is THE ONLY merge
 *            mechanism (no parallel one introduced) — AC-41.5's guard.
 *          - Proving the financial placeholder can never grow a real
 *            ledger call anywhere in the codebase (byte-scan) — AC-41.6.
 *          - The Gallery/Event-level client-inheritance gap (F1/F2) —
 *            AC-41.2.
 * created-by: dev-team
 * related-story: US-41
 * related-ac: 41.1
 * ---
 */
import dns from 'dns/promises'

import { Client } from 'pg'

type ProjectResponse = {
  project: { id: number; name: string; status: string; customerAccountId: number | null; customerEmail: string | null }
  setup: {
    clientRelationship: { customerAccountId: number; email: string; isNew: boolean }
    projectRoomAccess: { email: string; expiresAt?: string; alreadyActive?: boolean }
    milestonesSeededCount: number
    mediaFolderKey: string
    financialIntegrationKey: string
  }
}

describe('AC-41.1: one POST /api/admin/projects call prepares all ten PRD 22.3 items, each asserted by name', () => {
  it(
    'produces the Project record, the client relationship, the media folder, the access record, the phase+milestones, the next action, the document area, the email merge context, the financial placeholder and the activity timeline',
    async () => {
      try {
        await dns.lookup('backstage-backend')
        await dns.lookup('backstage-db')
      } catch {
        // Not running inside the project's Docker network — nothing to
        // prove live from here. Preparing ten real artifacts against a
        // running stack is meaningless to fake with a mocked fetch.
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

      const MARKER = `ac41-1-proof-${Date.now()}`
      const primaryContactEmail = `${MARKER}@example.test`
      const projectName = `${MARKER} project`

      let projectId: number | null = null
      let customerAccountId: number | null = null

      try {
        // ---- auth: a real login, the recorded recipe ---------------------
        const adminLoginRes = await fetch(`${base}/api/auth/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: adminUsername, password: adminPassword }),
        })
        expect(adminLoginRes.status).toBe(200)
        const adminCookie = (adminLoginRes.headers.get('set-cookie') || '').split(';')[0]
        expect(adminCookie).toMatch(/^admin_token=/)
        const authHeaders = { 'Content-Type': 'application/json', Cookie: adminCookie }

        // ---- the one create call ------------------------------------------
        const createRes = await fetch(`${base}/api/admin/projects`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            name: projectName,
            primaryContact: { email: primaryContactEmail, firstName: 'Ada', lastName: MARKER },
          }),
        })
        expect(createRes.status).toBe(201)
        const created = (await createRes.json()) as ProjectResponse
        projectId = created.project.id
        customerAccountId = created.setup.clientRelationship.customerAccountId
        expect(typeof projectId).toBe('number')

        // ==== 1. Project record ============================================
        expect(created.project.name).toBe(projectName)
        expect(created.project.status).toBe('active')

        // ==== 2. operational client relationship ===========================
        expect(typeof customerAccountId).toBe('number')
        expect(created.project.customerAccountId).toBe(customerAccountId)
        const customerRow = await db.query<{ id: number; email: string }>(
          'select id, email from customer_accounts where id = $1',
          [customerAccountId],
        )
        expect(customerRow.rows).toHaveLength(1)
        expect(customerRow.rows[0].email).toBe(primaryContactEmail)

        // ==== 3. empty project media area/folder ============================
        const mediaFolderRes = await fetch(`${base}/api/admin/projects/${projectId}/media-folder`, {
          headers: authHeaders,
        })
        expect(mediaFolderRes.status).toBe(200)
        const mediaFolder = (await mediaFolderRes.json()) as { projectId: number; key: string; exists: boolean }
        expect(mediaFolder.key).toBe(`projects/${projectId}/media/.keep`)
        expect(mediaFolder.exists).toBe(true)

        // ==== 4. Project Room access record =================================
        const invitationRow = await db.query<{ id: number; email: string; accepted_at: string | null; expires_at: string }>(
          `select id, email, accepted_at, expires_at from customer_invitations where email = $1 order by id desc limit 1`,
          [primaryContactEmail],
        )
        expect(invitationRow.rows).toHaveLength(1)
        expect(invitationRow.rows[0].accepted_at).toBeNull()
        expect(new Date(invitationRow.rows[0].expires_at).getTime()).toBeGreaterThan(Date.now())

        // ==== 5. default phase and milestones ===============================
        const phaseRow = await db.query<{ current_phase: string }>(
          'select current_phase from projects where id = $1',
          [projectId],
        )
        expect(phaseRow.rows[0].current_phase).toBe('lead')

        const milestonesRes = await fetch(`${base}/api/admin/projects/${projectId}/milestones`, {
          headers: authHeaders,
        })
        expect(milestonesRes.status).toBe(200)
        const milestonesBody = (await milestonesRes.json()) as {
          milestones: Array<{ milestoneKey: string; completionState: string }>
        }
        expect(milestonesBody.milestones).toHaveLength(18)
        expect(milestonesBody.milestones.every((m) => m.completionState === 'pending')).toBe(true)

        // ==== 6. next-action calculation =====================================
        const nextActionRes = await fetch(`${base}/api/admin/projects/${projectId}/next-action`, {
          headers: authHeaders,
        })
        expect(nextActionRes.status).toBe(200)
        const nextActionBody = (await nextActionRes.json()) as { nextAction: string; phase: string }
        expect(typeof nextActionBody.nextAction).toBe('string')
        expect(nextActionBody.nextAction.length).toBeGreaterThan(0)
        expect(nextActionBody.phase).toBe('lead')

        // ==== 7. document area ================================================
        const documentsRes = await fetch(`${base}/api/admin/projects/${projectId}/documents`, {
          headers: authHeaders,
        })
        expect(documentsRes.status).toBe(200)
        const documentsBody = (await documentsRes.json()) as { documents: unknown[] }
        expect(documentsBody.documents).toEqual([])

        // ==== 8. email merge context ==========================================
        const emailRow = await db.query<{ email_type: string; email_data: string | Record<string, unknown> }>(
          `select email_type, email_data from email_queue where recipient_email = $1 and email_type = 'customer_invitation' order by id desc limit 1`,
          [primaryContactEmail],
        )
        expect(emailRow.rows).toHaveLength(1)
        const emailData = typeof emailRow.rows[0].email_data === 'string'
          ? JSON.parse(emailRow.rows[0].email_data)
          : emailRow.rows[0].email_data
        expect(emailData).toHaveProperty('invite_link')
        expect(emailData).toHaveProperty('expires_at')
        expect(String(emailData.invite_link)).toContain('/customer/invite/')

        // ==== 9. financial integration placeholder =============================
        const integrationRes = await fetch(`${base}/api/admin/projects/${projectId}/integration-status`, {
          headers: authHeaders,
        })
        expect(integrationRes.status).toBe(200)
        const integrationBody = (await integrationRes.json()) as {
          statuses: Array<{ integrationKey: string; status: string; message: string | null }>
        }
        const financialStatus = integrationBody.statuses.find((s) => s.integrationKey === 'financial_placeholder')
        expect(financialStatus).toBeDefined()
        expect(financialStatus?.status).toBe('pending')

        // ==== 10. activity timeline =============================================
        const timelineRes = await fetch(`${base}/api/admin/projects/${projectId}/timeline`, {
          headers: authHeaders,
        })
        expect(timelineRes.status).toBe(200)
        const timelineBody = (await timelineRes.json()) as {
          entries: Array<{ entryType: string; summary: string; actorName: string }>
        }
        expect(timelineBody.entries).toHaveLength(1)
        expect(timelineBody.entries[0].entryType).toBe('project_created')
        expect(timelineBody.entries[0].actorName).toBe(adminUsername)

        // The AC's evidence clause: "ten named assertions against the live
        // system after a single create."
        console.log(
          'AC-41.1 live proof — project %d setup: %j',
          projectId,
          {
            project: created.project,
            mediaFolder,
            invitation: invitationRow.rows[0],
            phase: phaseRow.rows[0].current_phase,
            milestonesCount: milestonesBody.milestones.length,
            nextAction: nextActionBody.nextAction,
            documentsCount: documentsBody.documents.length,
            emailQueued: emailData,
            financialStatus,
            timelineEntries: timelineBody.entries.length,
          },
        )
      } finally {
        if (projectId) await db.query('delete from projects where id = $1', [projectId])
        await db.query('delete from customer_invitations where email = $1', [primaryContactEmail])
        await db.query("delete from email_queue where recipient_email = $1", [primaryContactEmail])
        if (customerAccountId) await db.query('delete from customer_accounts where id = $1', [customerAccountId])
        await db.end()
      }
    },
    30000,
  )
})
