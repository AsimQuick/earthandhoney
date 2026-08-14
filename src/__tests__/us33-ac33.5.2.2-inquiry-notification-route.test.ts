/**
 * ---
 * file: src/__tests__/us33-ac33.5.2.2-inquiry-notification-route.test.ts
 * project: earthandhoney
 * purpose: Verify AC-33.5.2.2 — Backstage now has the one capability
 *          AC-33.5.1's go/no-go said it lacked: an HTTP way for a service to
 *          queue an email. Pins the new fork route
 *          (vendor/picpeak/backend/src/routes/v1/notifications.js), its
 *          minimal server.js mount beside the single existing v1 mount, the
 *          auth pair it sits behind, the fact that it queues rather than
 *          sends, and that the deviation is recorded in FORK_CHANGELOG.md,
 *          PICPEAK_PORT_LEDGER.md and PAYLOAD_PICPEAK_API_CONTRACT.md's call
 *          catalog. Every claim about the forked upstream is checked against
 *          the pinned code itself, never against the prose that cites it.
 *          The route's request/response behaviour is covered separately by
 *          the fork-side Jest suite
 *          vendor/picpeak/backend/src/routes/v1/__tests__/notifications.inquiry.test.js,
 *          and live, against a real minted pp_live_ token, by
 *          scripts/ac33.5.2.2-inquiry-notification-proof.sh.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.5.2.2
 * ---
 */
import fs from 'fs'
import path from 'path'
import { validateChangelogEntry, type ChangelogEntry } from '@/lib/forkChangelog'
import { verifyVendoredMigrations } from '@/lib/picpeakMigrationIntegrity'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const ROUTE = 'vendor/picpeak/backend/src/routes/v1/notifications.js'
const SERVER = 'vendor/picpeak/backend/server.js'
const FORK_TEST = 'vendor/picpeak/backend/src/routes/v1/__tests__/notifications.inquiry.test.js'
const PROOF_SCRIPT = 'scripts/ac33.5.2.2-inquiry-notification-proof.sh'
const MIGRATION_120 =
  'vendor/picpeak/backend/migrations/core/120_add_inquiry_notification_email_template.js'

/**
 * The files touched by the US-33 AC-33.5.2.2 deviation, as recorded in the
 * 2026-08-14 FORK_CHANGELOG.md entry and PICPEAK_PORT_LEDGER.md §7. One list,
 * checked against both documents, so the test and the records cannot drift —
 * same shape AC-27.5's guard suite already uses for the publicSite deviation.
 */
const FILES_TOUCHED = [
  ROUTE,
  SERVER,
  FORK_TEST,
  'PAYLOAD_PICPEAK_API_CONTRACT.md',
  PROOF_SCRIPT,
]

const DEVIATION_ENTRY: ChangelogEntry = {
  date: '2026-08-14',
  type: 'deviation',
  summary:
    "Backstage gains an HTTP way for a service to queue an email: POST /api/v1/notifications/inquiry.",
  filesTouched: FILES_TOUCHED,
}

/** Route source with block/line comments removed, so a claim in a comment can never satisfy an assertion about the code. */
const routeCode = read(ROUTE)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

describe('AC-33.5.2.2: the new fork route queues, and only queues', () => {
  it('is a new file under the fork\'s existing v1 route directory, beside events.js', () => {
    expect(fs.existsSync(path.join(root, ROUTE))).toBe(true)
    expect(fs.existsSync(path.join(root, 'vendor/picpeak/backend/src/routes/v1/events.js'))).toBe(true)
  })

  it('exposes POST /notifications/inquiry behind apiTokenAuth + requireApiScope(\'write\')', () => {
    expect(routeCode).toMatch(
      /const \{ apiTokenAuth, requireApiScope \} = require\('\.\.\/\.\.\/middleware\/apiTokenAuth'\)/,
    )
    expect(routeCode).toMatch(
      /router\.post\(\s*'\/notifications\/inquiry',\s*apiTokenAuth,\s*requireApiScope\('write'\),/,
    )
  })

  it('is the exact auth pair v1/events.js already uses (row 3 of the call catalog)', () => {
    const events = read('vendor/picpeak/backend/src/routes/v1/events.js')
    expect(events).toMatch(/require\('\.\.\/\.\.\/middleware\/apiTokenAuth'\)/)
    expect(events).toMatch(/apiTokenAuth,\s*requireApiScope\(/)
  })

  it('calls the existing queueEmail() with a null event_id and the fixed template key', () => {
    expect(routeCode).toMatch(
      /const \{ queueEmail \} = require\('\.\.\/\.\.\/services\/emailProcessor'\)/,
    )
    expect(routeCode).toMatch(/const TEMPLATE_KEY = 'inquiry_received'/)
    expect(routeCode).toMatch(
      /await queueEmail\(\s*null,\s*recipient_email,\s*TEMPLATE_KEY,\s*\{/,
    )
  })

  it('fixes the template key rather than accepting one from the caller', () => {
    expect(routeCode).not.toMatch(/req\.body\.(template_key|email_type)/)
    expect(routeCode).not.toMatch(/body\('(template_key|email_type)'\)/)
  })

  it('uses the template_key AC-33.5.2.1\'s migration actually inserts', () => {
    const migration = read(MIGRATION_120)
    expect(migration).toMatch(/const TEMPLATE_KEY = 'inquiry_received'/)
    expect(migration).toMatch(/knex\('email_templates'\)\.insert\(/)
  })

  it('accepts data fields only — it renders no subject and no body', () => {
    expect(routeCode).not.toMatch(/subject/i)
    expect(routeCode).not.toMatch(/body_(html|text)/)
    for (const field of ['form_title', 'source_page', 'submission_summary', 'submitted_at']) {
      expect(routeCode).toContain(field)
    }
  })

  it('sends nothing: no transport, no flush, no direct call into the sender', () => {
    for (const forbidden of [
      'nodemailer',
      'createTransport',
      'sendMail',
      'sendEmail',
      'processEmailQueue',
    ]) {
      expect(routeCode).not.toContain(forbidden)
    }
  })
})

describe('AC-33.5.2.2: the pinned fork really supports what the route assumes', () => {
  it('queueEmail takes (eventId, recipientEmail, emailType, emailData) and inserts a pending row', () => {
    const processor = read('vendor/picpeak/backend/src/services/emailProcessor.js')
    expect(processor).toMatch(
      /async function queueEmail\(eventId, recipientEmail, emailType, emailData/,
    )
    expect(processor).toMatch(/status: 'pending'/)
    expect(processor).toMatch(/await db\('email_queue'\)\.insert\(row\)/)
  })

  it('email_queue.event_id is nullable — the column is declared without .notNullable()', () => {
    const db = read('vendor/picpeak/backend/src/database/db.js')
    const eventIdColumn = db
      .split('\n')
      .find((line) => line.includes("table.integer('event_id').references('id').inTable('events')"))
    expect(eventIdColumn).toBeDefined()
    expect(eventIdColumn).not.toContain('notNullable')
  })

  it('the admin queue view leftJoins events, so a null-event_id row still lists', () => {
    const adminEmail = read('vendor/picpeak/backend/src/routes/adminEmail.js')
    expect(adminEmail).toMatch(/leftJoin\('events', 'events\.id', 'email_queue\.event_id'\)/)
  })

  it('requireApiScope really 403s an insufficient scope, and admin really implies write', () => {
    const middleware = read('vendor/picpeak/backend/src/middleware/apiTokenAuth.js')
    expect(middleware).toMatch(/function requireApiScope\(scope\)/)
    expect(middleware).toMatch(/code: 'INSUFFICIENT_SCOPE'/)
    expect(middleware).toMatch(/res\.status\(403\)/)
    expect(middleware).toMatch(/if \(have\.includes\('admin'\)\)/)
    expect(middleware).toMatch(/code: 'NO_TOKEN'/)
  })

  it('the token the proof script mints is returned in plaintext exactly once', () => {
    const adminApiTokens = read('vendor/picpeak/backend/src/routes/adminApiTokens.js')
    expect(adminApiTokens).toMatch(/res\.status\(201\)\.json\(\{[\s\S]{0,200}token: plaintext/)
    expect(adminApiTokens).toMatch(/router\.delete\('\/:id', adminAuth/)
  })
})

describe('AC-33.5.2.2: the server.js mount is minimal and additive', () => {
  const serverLines = read(SERVER).split('\n')
  const eventsMount = serverLines.findIndex((l) =>
    l.includes("app.use('/api/v1', require('./src/routes/v1/events'))"),
  )
  const notificationsMount = serverLines.findIndex((l) =>
    l.includes("app.use('/api/v1', require('./src/routes/v1/notifications'))"),
  )

  it('mounts the new router at /api/v1, immediately beside the existing v1 mount', () => {
    expect(eventsMount).toBeGreaterThan(-1)
    expect(notificationsMount).toBeGreaterThan(eventsMount)
    // Only the deviation's own comment block sits between the two mounts.
    expect(notificationsMount - eventsMount).toBeLessThanOrEqual(4)
  })

  it('leaves the existing v1 events mount exactly as upstream shipped it', () => {
    expect(serverLines[eventsMount].trim()).toBe(
      "app.use('/api/v1', require('./src/routes/v1/events'));",
    )
  })

  it('mounts ahead of the 404/error handlers, so the route is reachable', () => {
    const notFound = serverLines.findIndex((l) => l.includes("app.use('/api', notFoundHandler)"))
    expect(notFound).toBeGreaterThan(notificationsMount)
  })

  it('adds no second /api/v1 auth surface — the mount is the only server.js change', () => {
    const v1Mounts = serverLines.filter((l) => l.includes("app.use('/api/v1'"))
    expect(v1Mounts).toHaveLength(2)
  })

  it('touches no already-shipped migration, and the manifest integrity check stays green', () => {
    for (const file of FILES_TOUCHED) {
      expect(file).not.toMatch(/\/migrations\//)
    }
    const result = verifyVendoredMigrations()
    expect(result.ok).toBe(true)
    expect(result.violations).toEqual([])
  })
})

describe('AC-33.5.2.2: the deviation is recorded where fork discipline requires', () => {
  const changelog = read('FORK_CHANGELOG.md')
  const ledger = read('PICPEAK_PORT_LEDGER.md')
  const contract = read('PAYLOAD_PICPEAK_API_CONTRACT.md')

  it('the deviation entry shape is valid per validateChangelogEntry', () => {
    expect(validateChangelogEntry(DEVIATION_ENTRY)).toEqual({ valid: true, reason: null })
  })

  it('FORK_CHANGELOG.md carries a 2026-08-14 deviation entry naming this AC', () => {
    expect(changelog).toMatch(/## 2026-08-14 — `deviation`/)
    expect(changelog).toContain('AC-33.5.2.2')
  })

  it('FORK_CHANGELOG.md names every file the deviation touched', () => {
    for (const file of FILES_TOUCHED) {
      expect(changelog).toContain(file)
    }
  })

  it('PICPEAK_PORT_LEDGER.md records the same file list and cross-references the changelog', () => {
    expect(ledger).toContain('US-33 AC-33.5.2.2')
    for (const file of FILES_TOUCHED) {
      expect(ledger).toContain(file)
    }
    expect(ledger).toContain('FORK_CHANGELOG.md')
    expect(ledger).toContain('2026-08-14')
  })

  it('PAYLOAD_PICPEAK_API_CONTRACT.md adds the boundary crossing alongside row 3', () => {
    const rows = contract.split('\n').filter((l) => l.trim().startsWith('| '))
    const eventsRow = rows.findIndex((l) => l.includes('`/api/v1/events` family'))
    const inquiryRow = rows.findIndex((l) => l.includes('POST /api/v1/notifications/inquiry'))
    expect(eventsRow).toBeGreaterThan(-1)
    expect(inquiryRow).toBe(eventsRow + 1)

    const row = rows[inquiryRow]
    expect(row).toContain('Frontstage → Backstage')
    expect(row).toContain('pp_live_')
    expect(row).toContain("requireApiScope('write')")
  })
})

describe('AC-33.5.2.2: the live proof is a committed, re-runnable script', () => {
  const script = read(PROOF_SCRIPT)

  it('is executable and carries the project metadata header', () => {
    expect(script.startsWith('#!/usr/bin/env bash')).toBe(true)
    expect(script).toContain('related-ac: 33.5.2.2')
    // eslint-disable-next-line no-bitwise
    expect(fs.statSync(path.join(root, PROOF_SCRIPT)).mode & 0o111).not.toBe(0)
  })

  it('mints its own scoped API tokens through the documented admin route', () => {
    expect(script).toContain('/api/auth/admin/login')
    expect(script).toMatch(/\/api\/admin\/api-tokens[\s\S]{0,400}"scopes":\["read"\]/)
    expect(script).toMatch(/\/api\/admin\/api-tokens[\s\S]{0,400}"scopes":\["write"\]/)
  })

  it('proves the auth is present: 401 with no token, 403 with a read-only token, 201 with write', () => {
    expect(script).toMatch(/expect_status "no token" 401/)
    expect(script).toMatch(/expect_status "read-only token" 403/)
    expect(script).toMatch(/expect_status "write token" 201/)
  })

  it('reads the queued row out of Backstage\'s own Postgres, not back out of the API', () => {
    expect(script).toMatch(/docker compose --profile backstage exec -T backstage-db[\s\S]{0,80}psql/)
    expect(script).toContain('FROM email_queue')
    expect(script).toContain("PASS: event_id IS NULL")
    expect(script).toContain("PASS: status = 'pending'")
  })

  it('revokes every token it mints, so re-running leaves no live credential behind', () => {
    expect(script).toMatch(/trap cleanup EXIT/)
    expect(script).toMatch(/DELETE "\$\{BACKSTAGE\}\/api\/admin\/api-tokens\/\$\{WRITE_TOKEN_ID\}"/)
    expect(script).toMatch(/DELETE "\$\{BACKSTAGE\}\/api\/admin\/api-tokens\/\$\{READ_TOKEN_ID\}"/)
  })

  it('commits no secret value — no token literal, no password other than the .env.example default', () => {
    expect(script).not.toMatch(/pp_live_[A-Za-z0-9]/)
    expect(script).toContain('${BACKSTAGE_ADMIN_PASSWORD:-change-me-in-production}')
  })
})

describe('AC-33.5.2.2: the fork-side unit suite covers the route\'s behaviour', () => {
  const forkTest = read(FORK_TEST)

  it('asserts the queueEmail call shape, including the null event_id', () => {
    expect(forkTest).toMatch(/toHaveBeenCalledWith\(\s*null,/)
    expect(forkTest).toContain("'inquiry_received'")
  })

  it('exercises the real requireApiScope rather than stubbing the scope gate', () => {
    expect(forkTest).toContain('jest.requireActual')
    expect(forkTest).toContain('INSUFFICIENT_SCOPE')
  })
})
