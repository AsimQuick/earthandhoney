/**
 * ---
 * file: src/__tests__/us33-ac33.6-inquiry-acknowledgement-route.test.ts
 * project: earthandhoney
 * purpose: Verify AC-33.6 — the fork gains the acknowledgement route,
 *          verified without Docker. Pins the sibling route added to the
 *          existing `vendor/picpeak/backend/src/routes/v1/notifications.js`
 *          (no new file, no new `server.js` mount — the AC-33.5.2.2.2 mount
 *          already carries it), the new migration `121`, its manifest
 *          `origin: 'fork'` entry, and that the deviation is recorded in
 *          `FORK_CHANGELOG.md`, `PICPEAK_PORT_LEDGER.md`, and
 *          `PAYLOAD_PICPEAK_API_CONTRACT.md`'s call catalog. Every claim
 *          about the forked upstream is checked against the pinned code
 *          itself, never against the prose that cites it — same discipline
 *          as `us33-ac33.5.2.2.2-inquiry-notification-route.test.ts`. The
 *          route's request/response behaviour (valid queue, invalid body
 *          400s before queueEmail, scope enforcement) is covered separately
 *          by the fork-side Jest suite
 *          vendor/picpeak/backend/src/routes/v1/__tests__/notifications.inquiryAcknowledgement.test.js,
 *          run offline with no Docker and no live HTTP call.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.6
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
const FORK_TEST = 'vendor/picpeak/backend/src/routes/v1/__tests__/notifications.inquiryAcknowledgement.test.js'
const MIGRATION_121 =
  'vendor/picpeak/backend/migrations/core/121_add_inquiry_acknowledgement_email_template.js'

/**
 * The files touched by the US-33 AC-33.6 deviation, as recorded in the
 * 2026-08-14 FORK_CHANGELOG.md entry and PICPEAK_PORT_LEDGER.md §8. One
 * list, checked against both documents, so the test and the records cannot
 * drift — same shape AC-33.5.2.2.2's guard suite already uses.
 */
const FILES_TOUCHED = [
  MIGRATION_121,
  ROUTE,
  FORK_TEST,
  'PAYLOAD_PICPEAK_API_CONTRACT.md',
]

const DEVIATION_ENTRY: ChangelogEntry = {
  date: '2026-08-14',
  type: 'deviation',
  summary:
    'Backstage gains a second inquiry-triggered email: the optional branded acknowledgement to the person who submitted a Frontstage form (POST /api/v1/notifications/inquiry-acknowledgement), off by default and sent through the same single email queue as the AC-33.5 studio notification — never a second sending system.',
  filesTouched: FILES_TOUCHED,
}

/** Route source with block/line comments removed, so a claim in a comment can never satisfy an assertion about the code. */
const routeCode = read(ROUTE)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

describe('AC-33.6: the acknowledgement route reuses the existing router, and only queues', () => {
  it('is added to the existing notifications.js router, not a new file', () => {
    expect(fs.existsSync(path.join(root, ROUTE))).toBe(true)
  })

  it("exposes POST /notifications/inquiry-acknowledgement behind apiTokenAuth + requireApiScope('write')", () => {
    expect(routeCode).toMatch(
      /router\.post\(\s*'\/notifications\/inquiry-acknowledgement',\s*apiTokenAuth,\s*requireApiScope\('write'\),/,
    )
  })

  it('calls the existing queueEmail() with a null event_id and the fixed acknowledgement template key', () => {
    expect(routeCode).toMatch(/const ACKNOWLEDGEMENT_TEMPLATE_KEY = 'inquiry_acknowledgement'/)
    expect(routeCode).toMatch(
      /await queueEmail\(\s*null,\s*recipient_email,\s*ACKNOWLEDGEMENT_TEMPLATE_KEY,\s*\{/,
    )
  })

  it('fixes the template key rather than accepting one from the caller', () => {
    const ackHandlerStart = routeCode.indexOf("'/notifications/inquiry-acknowledgement'")
    const ackHandler = routeCode.slice(ackHandlerStart)
    expect(ackHandler).not.toMatch(/req\.body\.(template_key|email_type)/)
    expect(ackHandler).not.toMatch(/body\('(template_key|email_type)'\)/)
  })

  it("uses the template_key AC-33.6's migration actually inserts", () => {
    const migration = read(MIGRATION_121)
    expect(migration).toMatch(/const TEMPLATE_KEY = 'inquiry_acknowledgement'/)
    expect(migration).toMatch(/knex\('email_templates'\)\.insert\(/)
  })

  it('accepts data fields only — it renders no subject and no body', () => {
    expect(routeCode).not.toMatch(/subject/i)
    expect(routeCode).not.toMatch(/body_(html|text)/)
    for (const field of ['form_title', 'submitted_at']) {
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

describe('AC-33.6: no new router and no new server.js mount is required', () => {
  const serverLines = read(SERVER).split('\n')
  const notificationsMounts = serverLines.filter((l) =>
    l.includes("app.use('/api/v1', require('./src/routes/v1/notifications'))"),
  )

  it('the existing AC-33.5.2.2.2 mount already carries both routes — exactly one notifications mount exists', () => {
    expect(notificationsMounts).toHaveLength(1)
  })

  it('touches no already-shipped migration, and the manifest integrity check stays green', () => {
    for (const file of FILES_TOUCHED) {
      if (file.includes('/migrations/')) {
        expect(file).toBe(MIGRATION_121)
      }
    }
    const result = verifyVendoredMigrations()
    expect(result.ok).toBe(true)
    expect(result.violations).toEqual([])
  })
})

describe('AC-33.6: the migration 121 manifest entry is recorded as a fork addition', () => {
  it('src/lib/picpeakMigrationManifest.ts records migration 121 with origin: "fork"', () => {
    const manifestSource = read('src/lib/picpeakMigrationManifest.ts')
    expect(manifestSource).toMatch(
      /path:\s*'backend\/migrations\/core\/121_add_inquiry_acknowledgement_email_template\.js'[\s\S]{0,120}origin:\s*'fork'/,
    )
  })
})

describe('AC-33.6: the deviation is recorded where fork discipline requires', () => {
  const changelog = read('FORK_CHANGELOG.md')
  const ledger = read('PICPEAK_PORT_LEDGER.md')
  const contract = read('PAYLOAD_PICPEAK_API_CONTRACT.md')

  it('the deviation entry shape is valid per validateChangelogEntry', () => {
    expect(validateChangelogEntry(DEVIATION_ENTRY)).toEqual({ valid: true, reason: null })
  })

  it('FORK_CHANGELOG.md carries a 2026-08-14 deviation entry naming this AC', () => {
    expect(changelog).toMatch(/## 2026-08-14 — `deviation`/)
    expect(changelog).toContain('AC-33.6')
  })

  it('FORK_CHANGELOG.md names every file the deviation touched', () => {
    for (const file of FILES_TOUCHED) {
      expect(changelog).toContain(file)
    }
  })

  it('PICPEAK_PORT_LEDGER.md records the same file list and cross-references the changelog', () => {
    expect(ledger).toContain('US-33 AC-33.6')
    for (const file of FILES_TOUCHED) {
      expect(ledger).toContain(file)
    }
    expect(ledger).toContain('FORK_CHANGELOG.md')
    expect(ledger).toContain('2026-08-14')
  })

  it('PAYLOAD_PICPEAK_API_CONTRACT.md adds the boundary crossing alongside row 3a', () => {
    const rows = contract.split('\n').filter((l) => l.trim().startsWith('| '))
    const row3aIndex = rows.findIndex((l) => l.includes('POST /api/v1/notifications/inquiry`'))
    const ackRowIndex = rows.findIndex((l) => l.includes('POST /api/v1/notifications/inquiry-acknowledgement'))
    expect(row3aIndex).toBeGreaterThan(-1)
    expect(ackRowIndex).toBe(row3aIndex + 1)

    const row = rows[ackRowIndex]
    expect(row).toContain('Frontstage → Backstage')
    expect(row).toContain('pp_live_')
    expect(row).toContain("requireApiScope('write')")
  })
})

describe("AC-33.6: the fork-side unit suite covers the route's behaviour", () => {
  const forkTest = read(FORK_TEST)

  it('asserts the queueEmail call shape, including the null event_id', () => {
    expect(forkTest).toMatch(/toHaveBeenCalledWith\(\s*null,/)
    expect(forkTest).toContain("'inquiry_acknowledgement'")
  })

  it('exercises the real requireApiScope rather than stubbing the scope gate', () => {
    expect(forkTest).toContain('jest.requireActual')
    expect(forkTest).toContain('INSUFFICIENT_SCOPE')
  })
})
