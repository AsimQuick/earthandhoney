/**
 * ---
 * file: src/__tests__/us17-ac17.6-operational-gallery-email-sent.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.6 — PIVOT_AUDIT.md records proof that at least one
 *          operational gallery email (`gallery_created`, queued by
 *          upstream's own create/resend paths) is sent through Backstage's
 *          own email system to a capture inbox (MailHog), and that its
 *          queued/sent state is visible through upstream's admin-facing
 *          email-queue feed. Pins the exact evidence recorded in the audit,
 *          and independently re-verifies every file/line claim it makes
 *          against the pinned vendored fork and this project's own
 *          docker-compose.yml.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.6
 * ---
 */

// The proof itself was exercised live on 2026-08-02 against the running
// Backstage (`docker compose --profile backstage`, per BACKSTAGE_STARTUP.md)
// plus a newly-added `mailhog` service: the pre-existing broken email config
// (smtp_host=mailhog, smtp_port=465 — leaked from the Next.js app's own
// SMTP_PORT env var through the shared .env) was corrected through
// POST /api/admin/email/config, the queue was drained through
// POST /api/admin/email/flush-queue, and the resulting sent state was read
// back through GET /api/admin/email/queue, direct Postgres reads, and
// MailHog's own message API. That run needs a Docker daemon and a live
// Backstage plus MailHog container, so it is not repeatable inside Jest —
// this suite pins the recorded evidence so it cannot silently rot out of the
// audit, and independently re-verifies every file/line claim the audit makes
// about the vendored fork and this project's own compose file.

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('PIVOT_AUDIT.md')

// The AC-17.6 section only, bounded at the next top-level heading so a match
// cannot be satisfied by unrelated text elsewhere in this multi-story audit
// document, and so the AC-14.6 recommendation/open-questions block can stay
// the document's final section.
const sectionStart = doc.indexOf('## AC-17.6')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1
    ? ''
    : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

describe('AC-17.6: an operational gallery email is sent through Backstage email to a capture inbox, queued/sent state visible', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.6 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.6\b/)
    })

    it('has a dedicated AC-17.6 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('sits after the AC-17.5.3 section it builds on', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.5.3'))
    })

    it('states no new Gallery was created for this AC — the AC-17.1.3.1 Gallery is reused', () => {
      expect(section).toMatch(/no new Gallery was created for this AC/)
      expect(section).toMatch(/events\.id = 3/)
    })
  })

  describe('the capture inbox the pinned fork already expects', () => {
    it('cites the migration seeding smtp_host to the mailhog default', () => {
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/migrations\/core\/001_init\.js:146-147/
      )
      expect(section).toMatch(/process\.env\.SMTP_HOST \|\| 'mailhog'/)
    })

    it('that cited migration really does seed smtp_host/smtp_port with those exact fallbacks', () => {
      const lines = read('vendor/picpeak/backend/migrations/core/001_init.js').split('\n')
      expect(lines[145]).toContain("smtp_host: process.env.SMTP_HOST || 'mailhog'")
      expect(lines[146]).toContain('smtp_port: process.env.SMTP_PORT || 1025')
    })

    it('records the broken pre-fix config read straight from Postgres (mailhog host, wrong port)', () => {
      expect(section).toMatch(/smtp_host, smtp_port, smtp_secure, from_email, from_name/)
      expect(section).toMatch(/mailhog\s*\|\s*465/)
    })

    it('explains the 465 leak as shared .env collision, not a fork defect', () => {
      expect(section).toMatch(/SMTP_PORT=465/)
      expect(section).toMatch(/SMTP_SERVER.*vs\.\s*\n?`SMTP_HOST`/)
    })
  })

  describe('the fix: a mailhog service, added to this project\'s own compose, not upstream\'s', () => {
    it('names the mailhog service added to docker-compose.yml', () => {
      expect(section).toMatch(/`docker-compose\.yml`,\s*\n?\s*the `mailhog` service/)
      expect(section).toMatch(/mailhog\/mailhog:latest/)
    })

    it('that service really exists in docker-compose.yml, under the backstage profile, mirroring the vendored compose', () => {
      const compose = read('docker-compose.yml')
      expect(compose).toMatch(/\n\s*mailhog:\n\s*image:\s*mailhog\/mailhog:latest/)
      // The mailhog block sits after its own profiles line declaring "backstage".
      const mailhogIdx = compose.indexOf('\n  mailhog:')
      expect(mailhogIdx).toBeGreaterThan(-1)
      const mailhogBlock = compose.slice(mailhogIdx, mailhogIdx + 300)
      expect(mailhogBlock).toMatch(/profiles:\s*\["backstage"\]/)
      expect(mailhogBlock).toMatch(/MAILHOG_SMTP_PORT:-1025/)
      expect(mailhogBlock).toMatch(/MAILHOG_UI_PORT:-8025/)

      const vendorCompose = read('vendor/picpeak/docker-compose.yml')
      expect(vendorCompose).toMatch(/image:\s*mailhog\/mailhog:latest/)
    })

    it('cites the admin-facing config route used to correct the port, and its mount chain', () => {
      expect(section).toMatch(/`adminEmail\.js:40`/)
      expect(section).toMatch(/`adminEmail\.js:104-105`/)
      expect(section).toMatch(/`emailProcessor\.js:22`/)
    })

    it('those cited lines really are the config route, its transporter refresh, and initializeTransporter', () => {
      const adminEmail = read('vendor/picpeak/backend/src/routes/adminEmail.js').split('\n')
      expect(adminEmail[39]).toContain("router.post('/config'")
      const refreshBlock = adminEmail.slice(103, 105).join('\n')
      expect(refreshBlock).toContain('initializeTransporter(true)')

      const processor = read('vendor/picpeak/backend/src/services/emailProcessor.js').split('\n')
      expect(processor[21]).toContain('async function initializeTransporter')
    })

    it('cites the test-connection route used to confirm the fix', () => {
      expect(section).toMatch(/`adminEmail\.js:122`/)
      expect(section).toMatch(/Test email sent successfully/)
    })

    it('that cited line really is the test-connection route', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminEmail.js').split('\n')
      expect(lines[121]).toContain("router.post('/test'")
    })

    it('cites the admin-login route and its mount', () => {
      expect(section).toMatch(/vendor\/picpeak\/backend\/src\/routes\/auth\.js:36/)
      expect(section).toMatch(/vendor\/picpeak\/backend\/server\.js:442/)
    })

    it('those cited lines really are the admin-login route and its mount', () => {
      const auth = read('vendor/picpeak/backend/src/routes/auth.js').split('\n')
      expect(auth[35]).toContain("router.post('/admin/login'")
      const server = read('vendor/picpeak/backend/server.js').split('\n')
      expect(server[441]).toContain("app.use('/api/auth', authRoutes)")
    })

    it('cites the adminEmail mount chain (admin.js -> /email, server.js -> /api/admin)', () => {
      expect(section).toMatch(/admin\.js:20/)
      expect(section).toMatch(/server\.js:449/)
    })

    it('those cited lines really do mount adminEmail at /api/admin/email', () => {
      const admin = read('vendor/picpeak/backend/src/routes/admin.js').split('\n')
      expect(admin[19]).toContain("router.use('/email', emailRoutes)")
      const server = read('vendor/picpeak/backend/server.js').split('\n')
      expect(server[448]).toContain("app.use('/api/admin', adminRoutes)")
    })
  })

  describe('an operational email, not a synthetic one', () => {
    it('names the email type and the create-route trigger that queued it', () => {
      expect(section).toMatch(/`gallery_created`/)
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/routes\/adminEvents\.js:790,\s*\n?812-820/
      )
    })

    it('that cited create-route code really does insert a pending gallery_created row, gated on customerEmail and !isDraft', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminEvents.js').split('\n')
      expect(lines[789]).toContain('if (customerEmail && !isDraft)')
      const insertBlock = lines.slice(811, 820).join('\n')
      expect(insertBlock).toContain("await db('email_queue').insert(")
      expect(insertBlock).toContain("email_type: 'gallery_created'")
    })

    it('records four pre-existing pending rows across this story\'s own verification galleries (events 3, 7, 8, 9)', () => {
      expect(section).toMatch(/events\.id`\s*\n?3, 7, 8, 9/)
    })
  })

  describe('queued state, visible before the fix', () => {
    it('names the admin queue route and cites its line', () => {
      expect(section).toMatch(/`GET \/api\/admin\/email\/queue`/)
      expect(section).toMatch(/adminEmail\.js:286/)
    })

    it('that cited line really is the queue-listing route', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminEmail.js').split('\n')
      expect(lines[285]).toContain("router.get('/queue'")
    })

    it('records all four gallery_created rows pending with sentAt null before the fix', () => {
      expect(section).toMatch(/"status":"pending","sentAt":null,"eventId":9/)
      expect(section).toMatch(/"eventId":8,"eventName":"AC-17\.5 Download Verification Gallery"/)
      expect(section).toMatch(/"eventId":7,"eventName":"AC-17\.4 Expiry Verification Gallery"/)
      expect(section).toMatch(/"eventId":3,"eventName":"AC-17\.1\.3\.1 Verification Gallery"/)
    })
  })

  // The four gallery_created rows were delivered by upstream's ordinary
  // 60-second background processor, NOT by the manual flush: the config fix
  // landed at 00:08:01.351, the rows carry sent_at at 00:08:03.0-00:08:03.2,
  // and the first flush only ran at 00:08:05.135. The flush's "sent":0 is
  // therefore the consequence of the background path having already drained
  // every gallery_created row — not a failure of one. The audit must say so,
  // because the bare number reads the opposite way.
  describe('the delivery path is attributed correctly (background processor, not the flush)', () => {
    it('credits the ordinary background queue processor, with no admin intervention', () => {
      expect(section).toMatch(/ordinary background queue processor/)
      expect(section).toMatch(/no\s*\n?admin intervention at all/)
    })

    it('cites startEmailQueueProcessor, its 60-second period, and its server.js start site', () => {
      expect(section).toMatch(/`emailProcessor\.js:1029`/)
      expect(section).toMatch(/vendor\/picpeak\/backend\/server\.js:653/)
      expect(section).toMatch(/every 60 seconds/)
    })

    it('those cited lines really are the processor and its start site', () => {
      const processor = read('vendor/picpeak/backend/src/services/emailProcessor.js').split('\n')
      expect(processor[1028]).toContain('function startEmailQueueProcessor()')

      const server = read('vendor/picpeak/backend/server.js').split('\n')
      expect(server[652]).toContain('startEmailQueueProcessor()')
    })

    it('the processor really does run on a 60000ms interval', () => {
      const processor = read('vendor/picpeak/backend/src/services/emailProcessor.js')
      expect(processor).toMatch(/emailQueueInterval = setInterval\(\(\) => \{[\s\S]{0,200}\}, 60000\)/)
    })

    it('records the activity-log timeline that pins fix -> send -> flush ordering', () => {
      expect(section).toMatch(/email_config_updated/)
      expect(section).toMatch(/2026-08-02 00:08:01\.35126\+00/)
      expect(section).toMatch(/2026-08-02 00:08:05\.135523\+00/)
      expect(section).toMatch(/email_resent/)
      expect(section).toMatch(/2026-08-02 00:09:19\.561119\+00/)
    })

    it('states the sends landed after the fix but before any manual flush', () => {
      expect(section).toMatch(/00:08:03\.032/)
      expect(section).toMatch(/00:08:03\.264/)
      expect(section).toMatch(/two seconds\s*\n?\*?before\*? any manual flush was run/)
    })

    it('explicitly disclaims the misreading that sent:0 means gallery_created failed', () => {
      expect(section).toMatch(/`"sent":0` is \*\*not\*\* a `gallery_created` failure/)
      expect(section).toMatch(/no pending `gallery_created` rows left for the flush to\s*\n?send/)
    })

    it('says ALL six flushed rows were the template-missing types, not five', () => {
      expect(section).toMatch(/Every one of\s*\n?the six rows the flush did process/)
      expect(section).not.toMatch(/five of those six/)
      expect(section).not.toMatch(/the same five\b/)
    })

    it('the recorded post-flush dump lists all six template-missing rows in id order', () => {
      const dump = section.slice(section.indexOf('retry_count, error_message'))
      const ids = [...dump.matchAll(/^\s*(\d+) \| (gallery_expired|archive_complete)/gm)].map(
        (m) => Number(m[1])
      )
      expect(ids).toEqual([11, 12, 13, 14, 15, 16])
    })

    it('explains the retry cap that makes those six settle instead of retrying forever', () => {
      expect(section).toMatch(/`retry_count < 3` \(`emailProcessor\.js:811`\)/)
      expect(section).toMatch(/`emailProcessor\.js:815-818`/)
      expect(section).toMatch(/ignoreSchedule: true/)
      expect(section).toMatch(/`retry_count = 4`/)
    })

    it('those cited lines really are the retry cap and the manual-flush bypass', () => {
      const lines = read('vendor/picpeak/backend/src/services/emailProcessor.js').split('\n')
      expect(lines[810]).toContain("query.where('retry_count', '<', 3)")
      const bypassComment = lines.slice(814, 818).join('\n')
      expect(bypassComment).toContain('bypasses BOTH the')
      expect(bypassComment).toContain('retry cap')
    })

    it('the flush route really does pass ignoreSchedule, and the config route really does not drain the queue', () => {
      const adminEmail = read('vendor/picpeak/backend/src/routes/adminEmail.js')
      expect(adminEmail).toMatch(/processEmailQueue\(\{ ignoreSchedule: true, limit: 1000 \}\)/)
      // Exactly one drain site in the admin email routes: the flush handler.
      // If POST /config ever started draining too, the audit's ordering
      // argument above would no longer hold.
      expect(adminEmail.match(/processEmailQueue\(/g)).toHaveLength(1)
    })
  })

  describe('sent state, visible after the fix, cross-checked against Postgres and MailHog', () => {
    it('records the flush-queue call and its summary', () => {
      expect(section).toMatch(/`POST \/api\/admin\/email\/flush-queue`|flush-queue/)
      expect(section).toMatch(/"processed":6,"sent":0,"failed":6/)
    })

    it('cites the flush-queue route', () => {
      expect(section).toMatch(/adminEmail\.js:264/)
    })

    it('that cited line really is the flush-queue route', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminEmail.js').split('\n')
      expect(lines[263]).toContain("router.post('/flush-queue'")
    })

    it('records all four gallery_created rows landing on status=sent, direct from Postgres', () => {
      expect(section).toMatch(/\n\s*1 \| gallery_created\s*\| sent\s*\|/)
      expect(section).toMatch(/\n\s*10 \| gallery_created\s*\| sent\s*\|/)
      expect(section).toMatch(/\n\s*17 \| gallery_created\s*\| sent\s*\|/)
      expect(section).toMatch(/\n\s*18 \| gallery_created\s*\| sent\s*\|/)
    })

    it('honestly records the unrelated gallery_expired/archive_complete template gap without expanding this AC\'s scope', () => {
      expect(section).toMatch(/Email template 'gallery_expired' not found/)
      expect(section).toMatch(/Email template 'archive_complete' not found/)
      expect(section).toMatch(/out of\s*\n?this AC's scope/)
    })

    it('records the canonical row (id=1, event 3) as sent via the admin feed, matching the direct Postgres read', () => {
      expect(section).toMatch(/"id":1,"recipientEmail":"ac17-1-1-client@example\.com"/)
      expect(section).toMatch(/"status":"sent","createdAt":"2026-07-31T20:57:28\.059Z"/)
      expect(section).toMatch(/"sentAt":"2026-08-02T00:08:03\.032Z"/)
      expect(section).toMatch(
        /1 \|\s*3 \| ac17-1-1-client@example\.com \| gallery_created \| sent {3}\|\s*2026-07-31 20:57:28\.059\+00 \|\s*2026-08-02 00:08:03\.032\+00/
      )
    })
  })

  describe('independently confirmed captured by MailHog', () => {
    it('cites the MailHog message API and records five captured messages', () => {
      expect(section).toMatch(/http:\/\/localhost:8025\/api\/v2\/messages/)
      expect(section).toMatch(/"total":5/)
    })

    it('records the captured gallery_created message naming the exact Gallery and slug', () => {
      expect(section).toMatch(/Your Photo Gallery is Ready!/)
      expect(section).toMatch(/AC-17\.1\.3\.1 Verification Gallery/)
      expect(section).toMatch(/wedding-ac-17-1-3-1-verification-gallery-2026-/)
    })
  })

  describe('the run is shown to reproduce, not to be a one-off', () => {
    it('records a second, independently-queued email via the resend-email route', () => {
      expect(section).toMatch(/`POST \/:id\/resend-email`/)
      expect(section).toMatch(/adminEvents\.js:1658/)
      expect(section).toMatch(/adminEvents\.js:1702/)
      expect(section).toMatch(/emailProcessor\.js:959/)
      expect(section).toMatch(/Creation email has been queued for sending/)
    })

    it('those cited lines really are the resend-email route, its queueEmail call, and the shared helper', () => {
      const adminEvents = read('vendor/picpeak/backend/src/routes/adminEvents.js').split('\n')
      expect(adminEvents[1657]).toContain("router.post('/:id/resend-email'")
      expect(adminEvents[1701]).toContain("await queueEmail(id, recipientEmail, 'gallery_created'")

      const processor = read('vendor/picpeak/backend/src/services/emailProcessor.js').split('\n')
      expect(processor[958]).toContain('async function queueEmail')
    })

    it('records the new row (id=19) moving pending -> sent and MailHog\'s count rising from five to six', () => {
      expect(section).toMatch(/19 \|\s*3 \| gallery_created \| sent {3}\|\s*2026-08-02 00:09:19\.553\+00/)
      expect(section).toMatch(/"processed":7,"sent":1,"failed":6/)
      expect(section).toMatch(/\n6\n/)
    })

    it('attributes the second flush\'s sent:1 to the flush itself, pinned by the 8ms activity-log gap', () => {
      expect(section).toMatch(/`sent:1` is row `19`/)
      expect(section).toMatch(/8ms before the flush's own activity-log/)
      expect(section).toMatch(/did not wait\s*\n?for a background tick/)
    })

    it('states no gallery_created row ever failed, on either flush or any background run', () => {
      expect(section).toMatch(
        /no `gallery_created` row ever failed, on\s*\n?either flush or on any background run/
      )
    })
  })

  it('closes the AC with an explicit verdict naming the email, the capture inbox, and both visible states', () => {
    expect(section).toMatch(/AC-17\.6 is satisfied/)
    expect(section).toMatch(/gallery_created[\s\S]{0,200}not a synthetic message/)
    expect(section).toMatch(/MailHog[\s\S]{0,200}docker-compose\.yml/)
    expect(section).toMatch(/queued state[\s\S]{0,120}sent state[\s\S]{0,120}visible/)
    expect(section).toMatch(/No vendored file was modified/)
    expect(section).toMatch(/reproduced on an independently-queued second\s*\n?email/)
  })
})
