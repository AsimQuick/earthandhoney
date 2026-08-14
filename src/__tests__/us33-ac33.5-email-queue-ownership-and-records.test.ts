/**
 * ---
 * file: src/__tests__/us33-ac33.5-email-queue-ownership-and-records.test.ts
 * project: earthandhoney
 * purpose: Verify the half of AC-33.5 that lives outside src/lib — that the
 *          Backstage email queue really is what sends this email, that the
 *          fork changes making that possible are additive rather than edits
 *          to shipped upstream files, and that every record the AC names is
 *          actually written. Follows the AC-17.6 pattern: pin the recorded
 *          live evidence so it cannot silently rot out of the document, and
 *          independently re-verify every file claim it makes against the
 *          pinned vendored fork rather than trusting the prose. Six groups:
 *          (1) the fork's new v1 route delegates to the existing queueEmail
 *          and sends nothing itself, with the same auth pair v1/events.js
 *          uses; (2) the new template row arrives by a NEW numbered
 *          migration, insert-only, and is not one of finding F9's two email
 *          types; (3) no already-shipped upstream migration was edited, and
 *          the addition is declared rather than silent drift; (4) the
 *          boundary crossing is recorded in PAYLOAD_PICPEAK_API_CONTRACT.md;
 *          (5) the vendor change is recorded in FORK_CHANGELOG.md and
 *          PICPEAK_PORT_LEDGER.md; (6) the live proof document records both
 *          runs, and Resend has not reappeared anywhere.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.5
 * ---
 */
import fs from 'fs'
import path from 'path'

import {
  PICPEAK_MIGRATION_MANIFEST,
  PROJECT_ADDED_MIGRATIONS,
} from '@/lib/picpeakMigrationManifest'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

const ROUTE = 'vendor/picpeak/backend/src/routes/v1/notifications.js'
const MIGRATION = 'vendor/picpeak/backend/migrations/core/120_add_inquiry_notification_email_template.js'
const SERVER = 'vendor/picpeak/backend/server.js'
const PROOF_DOC = 'AC-33.5_EMAIL_QUEUE_LIVE_PROOF.md'
const CONTRACT = 'PAYLOAD_PICPEAK_API_CONTRACT.md'
const CHANGELOG = 'FORK_CHANGELOG.md'
const LEDGER = 'PICPEAK_PORT_LEDGER.md'

describe('AC-33.5: the Backstage email queue is what sends the studio notification', () => {
  it('the new v1 route exists and is mounted beside the existing v1 family in server.js', () => {
    expect(exists(ROUTE)).toBe(true)
    expect(read(SERVER)).toMatch(/app\.use\('\/api\/v1', require\('\.\/src\/routes\/v1\/notifications'\)\)/)
  })

  it('authenticates with the same apiTokenAuth + write-scope pair the fork\'s own v1/events family uses', () => {
    const route = read(ROUTE)
    expect(route).toMatch(/require\('\.\.\/\.\.\/middleware\/apiTokenAuth'\)/)
    expect(route).toMatch(/apiTokenAuth,\s*\n?\s*requireApiScope\('write'\)/)
    // Not the admin-cookie path — that is a human's session, not a service's.
    expect(route).not.toMatch(/adminAuth/)

    // The pattern it claims to mirror really is what v1/events.js does.
    const events = read('vendor/picpeak/backend/src/routes/v1/events.js')
    expect(events).toMatch(/apiTokenAuth/)
    expect(events).toMatch(/requireApiScope/)
  })

  it('delegates to the fork\'s existing queueEmail() and writes no sending logic of its own', () => {
    const route = read(ROUTE)
    expect(route).toMatch(/const \{ queueEmail \} = require\('\.\.\/\.\.\/services\/emailProcessor'\)/)
    expect(route).toMatch(/await queueEmail\(/)
    // Nothing in this route may open a transport, hold a credential, or send.
    expect(route).not.toMatch(/nodemailer|createTransport|sendMail|SMTP_|smtp_pass/i)
  })

  it('queues with event_id null — an inquiry is not a gallery event — and the column really is nullable', () => {
    expect(read(ROUTE)).toMatch(/queueEmail\(null, recipient_email, 'inquiry_received'/)
    // Upstream's own schema is what makes that legal: email_queue.event_id
    // is a plain integer column, never declared notNullable.
    const db = read('vendor/picpeak/backend/src/database/db.js')
    const queueBlock = db.slice(db.indexOf("createTable('email_queue'"), db.indexOf("createTable('email_queue'") + 800)
    expect(queueBlock).toMatch(/event_id/)
    expect(queueBlock).not.toMatch(/event_id[^\n]*notNullable/)
  })

  it('the queueEmail() it calls is the same function the fork\'s own gallery_created path uses', () => {
    const processor = read('vendor/picpeak/backend/src/services/emailProcessor.js')
    expect(processor).toMatch(/queueEmail/)
    expect(processor).toMatch(/startEmailQueueProcessor/)
    expect(read('vendor/picpeak/backend/src/routes/adminEvents.js')).toMatch(/queueEmail\(/)
  })
})

describe('AC-33.5: the template row arrives by a NEW numbered migration (Reminder 2)', () => {
  it('migration 120 exists and inserts the inquiry_received template row', () => {
    expect(exists(MIGRATION)).toBe(true)
    const m = read(MIGRATION)
    expect(m).toMatch(/const TEMPLATE_KEY = 'inquiry_received'/)
    expect(m).toMatch(/knex\('email_templates'\)\.insert\(/)
  })

  it('is insert-only: it alters no column or row an already-shipped migration created', () => {
    const m = read(MIGRATION)
    expect(m).not.toMatch(/\.alterTable\(|\.dropColumn\(|\.renameColumn\(|\.alter\(\)/)
    // The only write to an existing table is the insert itself, plus the
    // down() cleanup of the row this migration added.
    expect(m).toMatch(/exports\.down/)
    expect(m).toMatch(/where\('template_key', TEMPLATE_KEY\)\.delete\(\)/)
  })

  it('is idempotent, guarded on the key already existing', () => {
    const m = read(MIGRATION)
    expect(m).toMatch(/where\('template_key', TEMPLATE_KEY\)\.first\(\)/)
    expect(m).toMatch(/if \(existing\) return/)
  })

  it('populates both locales so a German-locale install never renders an empty template', () => {
    const m = read(MIGRATION)
    for (const col of ['subject_en', 'subject_de', 'body_html_en', 'body_text_en', 'body_html_de', 'body_text_de']) {
      expect(m).toMatch(new RegExp(`${col}:`))
    }
  })

  it('is NOT one of finding F9\'s two email types — F9 was checked first, not fixed here', () => {
    // F9 (scrum-master/po-requests.md) names gallery_expired and
    // archive_complete. This migration must touch neither: those two belong
    // to a different backlog item, and silently fixing them here would put
    // work in this AC that its story does not own. The check is against the
    // migration's *executable body* — its header comment names both keys on
    // purpose, to record that the check was made.
    const body = read(MIGRATION).replace(/\/\*[\s\S]*?\*\//g, '')
    expect(body).not.toMatch(/gallery_expired|archive_complete/)
    // Exactly one template key is written, and it is ours.
    expect(body.match(/TEMPLATE_KEY = '([^']+)'/)?.[1]).toBe('inquiry_received')

    const f9 = read('scrum-master/po-requests.md')
    expect(f9).toMatch(/\*\*F9\*\*/)
    expect(f9).toMatch(/`gallery_expired` and `archive_complete` email templates do not exist/)
    // ...and inquiry_received is genuinely a third, distinct key.
    expect(read(ROUTE)).toMatch(/'inquiry_received'/)
  })
})

describe('AC-33.5: no already-shipped upstream migration was edited', () => {
  it('the new migration is declared as a project addition, not silent drift', () => {
    const declared = PROJECT_ADDED_MIGRATIONS.map((e) => e.path)
    expect(declared).toContain('backend/migrations/core/120_add_inquiry_notification_email_template.js')
  })

  it('the upstream manifest gained no row for it — it stays a fingerprint of the pinned commit', () => {
    const manifestPaths = PICPEAK_MIGRATION_MANIFEST.map((e) => e.path)
    for (const added of PROJECT_ADDED_MIGRATIONS) {
      expect(manifestPaths).not.toContain(added.path)
    }
  })

  it('120 is a genuinely new number — it collides with no existing migration', () => {
    const dir = path.join(root, 'vendor/picpeak/backend/migrations/core')
    const numbered = fs.readdirSync(dir).filter((f) => /^120_/.test(f))
    expect(numbered).toEqual(['120_add_inquiry_notification_email_template.js'])
  })

  it('the only change to server.js is an added mount line — no upstream route was rewritten', () => {
    const server = read(SERVER)
    // The pre-existing v1/events mount is still there, untouched, beside ours.
    expect(server).toMatch(/app\.use\('\/api\/v1', require\('\.\/src\/routes\/v1\/events'\)\)/)
  })
})

describe('AC-33.5: the boundary crossing is recorded in PAYLOAD_PICPEAK_API_CONTRACT.md', () => {
  const doc = read(CONTRACT)
  const flat = doc.replace(/\s+/g, ' ')

  it('names AC-33.5 in its own front matter', () => {
    expect(doc).toMatch(/related-ac:[^\n]*33\.5/)
    expect(doc).toMatch(/related-story:[^\n]*US-33/)
  })

  it('carries a call-catalog row for the new route, in the Frontstage → Backstage direction', () => {
    const start = doc.indexOf('## Call catalog')
    const end = doc.indexOf('\n## ', start + 3)
    const table = doc.slice(start, end === -1 ? undefined : end)
    const row = table.split('\n').find((l) => l.includes('/api/v1/notifications/inquiry'))
    expect(row).toBeDefined()
    expect(row).toMatch(/Frontstage → Backstage/)
    // Eight columns, same shape AC-18.2's own test enforces for every row.
    expect(row!.split('|').slice(1, -1)).toHaveLength(8)
  })

  it('the row states the auth, that no identifier crosses, and that nothing is cached', () => {
    expect(flat).toMatch(/Bearer API token/)
    expect(flat).toMatch(/BACKSTAGE_API_TOKEN/)
    expect(flat).toMatch(/no Frontstage Inquiry id/)
  })

  it('walks the crossing end to end in a dedicated Flow D section', () => {
    expect(doc).toMatch(/## Flow D — a Frontstage inquiry notifies the studio through the Backstage email queue \(AC-33\.5\)/)
    const start = doc.indexOf('## Flow D')
    const flow = doc.slice(start).replace(/\s+/g, ' ')
    // The ordering guarantee AC-33.2 established must survive into this flow.
    expect(flow).toMatch(/\*\*commits the Inquiry record first\*\*/)
    expect(flow).toMatch(/single authoritative/)
    expect(flow).toMatch(/queueEmail\(\)/)
    expect(flow).toMatch(/event_id: null/)
    expect(flow).toMatch(/No mail is sent in this request|no mail is sent in this request/i)
  })

  it('states the flow introduces no cross-database access', () => {
    const flow = read(CONTRACT).slice(read(CONTRACT).indexOf('## Flow D')).replace(/\s+/g, ' ')
    expect(flow).toMatch(/No cross-database access is introduced/)
  })
})

describe('AC-33.5: the vendor change is recorded in FORK_CHANGELOG.md and PICPEAK_PORT_LEDGER.md', () => {
  const changelog = read(CHANGELOG)
  const ledger = read(LEDGER)

  it('FORK_CHANGELOG.md carries a dated deviation entry naming every touched vendor file', () => {
    const start = changelog.indexOf('## 2026-08-14 — `deviation`')
    expect(start).toBeGreaterThan(-1)
    const end = changelog.indexOf('\n## ', start + 3)
    const entry = changelog.slice(start, end === -1 ? undefined : end)
    // validateChangelogEntry rejects a deviation naming no files; the
    // document must satisfy the same rule its own validator encodes.
    for (const f of [ROUTE, SERVER, MIGRATION]) {
      expect(entry).toContain(f)
    }
    expect(entry).toMatch(/US-33 AC-33\.5/)
  })

  it('the changelog entry states it is a permanent deviation, not an upstream-defect workaround', () => {
    const start = changelog.indexOf('## 2026-08-14 — `deviation`')
    const entry = changelog.slice(start, changelog.indexOf('\n## ', start + 3))
    expect(entry).toMatch(/permanent deviation/)
    expect(entry).toMatch(/UPSTREAM_SYNC\.md/)
  })

  it('the changelog entry records the F9 check and the new-migration discipline', () => {
    const start = changelog.indexOf('## 2026-08-14 — `deviation`')
    const entry = changelog.slice(start, changelog.indexOf('\n## ', start + 3)).replace(/\s+/g, ' ')
    expect(entry).toMatch(/F9/)
    expect(entry).toMatch(/gallery_expired.*archive_complete/)
    expect(entry).toMatch(/new numbered\s*\*\*|new numbered migration|\*\*A new numbered/i)
  })

  it('the changelog entry sits at the top of the log, most recent first', () => {
    const headings = changelog.split('\n').filter((l) => /^## \d{4}-\d{2}-\d{2} — /.test(l))
    expect(headings[0]).toBe('## 2026-08-14 — `deviation`')
  })

  it('PICPEAK_PORT_LEDGER.md carries a section listing the same three vendor files', () => {
    expect(ledger).toMatch(/## 6\. US-33 AC-33\.5/)
    const section = ledger.slice(ledger.indexOf('## 6. US-33 AC-33.5'))
    for (const f of [ROUTE, SERVER, MIGRATION]) {
      expect(section).toContain(f)
    }
    expect(section).toMatch(/Nothing already shipped by upstream was edited/)
  })

  it('the ledger section explains the first-project-added-migration consequence for the AC-15.6 guard', () => {
    const section = ledger.slice(ledger.indexOf('## 6. US-33 AC-33.5')).replace(/\s+/g, ' ')
    expect(section).toMatch(/PROJECT_ADDED_MIGRATIONS/)
    expect(section).toMatch(/undeclared/)
  })
})

describe('AC-33.5: the live proof is recorded, reproducible, and Resend has not reappeared', () => {
  const proof = read(PROOF_DOC)

  it('the live proof document exists with the required metadata header', () => {
    expect(exists(PROOF_DOC)).toBe(true)
    expect(proof).toMatch(/file:\s*AC-33\.5_EMAIL_QUEUE_LIVE_PROOF\.md/)
    expect(proof).toMatch(/related-story:\s*US-33/)
    expect(proof).toMatch(/related-ac:\s*33\.5/)
  })

  it('records the notification observed QUEUED and then SENT, not a bare success code', () => {
    expect(proof).toMatch(/\bpending\b/)
    expect(proof).toMatch(/\bsent\b/)
    expect(proof).toMatch(/inquiry_received/)
    // Both queue states must appear as actual read-back rows.
    expect(proof).toMatch(/sent_at/)
    expect(proof).toMatch(/"processed":1,"sent":1,"failed":0/)
  })

  it('confirms the message independently in the mail catcher, the way AC-17.6 did', () => {
    expect(proof).toMatch(/MailHog/)
    expect(proof).toMatch(/MailHog message id:/)
    expect(proof).toMatch(/New inquiry: Wedding enquiry/)
    expect(proof).toMatch(/not inferred from a return code/)
  })

  it('records the client-bundle/network check with real inspected byte counts', () => {
    expect(proof).toMatch(/\.next\/static/)
    expect(proof).toMatch(/files inspected: \d+/)
    expect(proof).toMatch(/bytes inspected: \d+/)
    expect(proof).toMatch(/script\(s\) requested by/)
    expect(proof).toMatch(/PRD 20\.3/)
  })

  it('both proof scripts it names are committed and executable', () => {
    for (const s of [
      'scripts/ac33.5-email-queue-live-proof.sh',
      'scripts/ac33.5-email-queue-live-proof.ts',
      'scripts/ac33.5-no-smtp-secret-in-browser-proof.sh',
    ]) {
      expect(exists(s)).toBe(true)
      expect(proof).toContain(s)
    }
    for (const s of [
      'scripts/ac33.5-email-queue-live-proof.sh',
      'scripts/ac33.5-no-smtp-secret-in-browser-proof.sh',
    ]) {
      expect(fs.statSync(path.join(root, s)).mode & 0o111).toBeGreaterThan(0)
    }
  })

  it('the live-proof driver calls the real module rather than curling the route', () => {
    const driver = read('scripts/ac33.5-email-queue-live-proof.ts')
    expect(driver).toMatch(/from '\.\.\/src\/lib\/inquiryNotification'/)
    expect(driver).toMatch(/sendInquiryNotification\(/)
  })

  it('the proof run fails rather than passes when its marker is absent from the mail catcher', () => {
    const script = read('scripts/ac33.5-email-queue-live-proof.sh')
    expect(script).toMatch(/set -euo pipefail/)
    expect(script).toMatch(/no MailHog message carrying marker/)
    expect(script).toMatch(/sys\.exit\(1\)/)
    // The inbox is emptied first, so a stale message cannot satisfy the run.
    expect(script).toMatch(/DELETE "\$MAILHOG\/api\/v1\/messages"/)
  })

  it('the bundle proof builds for production rather than reading a dev server', () => {
    const script = read('scripts/ac33.5-no-smtp-secret-in-browser-proof.sh')
    expect(script).toMatch(/npm run build/)
    expect(script).toMatch(/next dev/) // named only in the comment explaining why it is not used
    expect(script).toMatch(/BACKSTAGE_API_TOKEN/)
    expect(script).toMatch(/SMTP_PASSWORD/)
  })

  it('Resend is retired and has not reappeared in any code this AC adds', () => {
    for (const f of [
      ROUTE,
      MIGRATION,
      'src/lib/inquiryNotification.ts',
      'src/app/(frontend)/api/inquiries/route.ts',
      'scripts/ac33.5-email-queue-live-proof.ts',
      'scripts/ac33.5-email-queue-live-proof.sh',
    ]) {
      expect(read(f)).not.toMatch(/resend/i)
    }
    expect(read('.env.example')).not.toMatch(/RESEND_API_KEY/)
    expect(JSON.stringify(JSON.parse(read('package.json')))).not.toMatch(/resend/i)
  })

  it('where the prose does name Resend, it names it only as retired — the US-21 AC-21.6 rule', () => {
    // Documents may mention Resend; what they may not do is present it as a
    // live option. Every line naming it must also say it is retired/excluded.
    for (const doc of [PROOF_DOC, CONTRACT]) {
      const offending = read(doc)
        .split('\n')
        .filter((line) => /resend/i.test(line))
        .filter((line) => !/retired|excluded/i.test(line))
      expect(offending).toEqual([])
    }
  })

  it('SYSTEM_OWNERSHIP.md still names the Backstage/PicPeak queue as the email owner this AC defers to', () => {
    const ownership = read('SYSTEM_OWNERSHIP.md')
    expect(ownership).toMatch(/PicPeak|Backstage/)
    expect(ownership).not.toMatch(/^\|\s*.*email.*\|\s*Resend/im)
  })
})
