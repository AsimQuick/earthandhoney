/**
 * ---
 * file: src/__tests__/us17-ac17.4.3-photographer-visible-expired-state.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.4.3 — PIVOT_AUDIT.md re-checks the exact
 *          photographer-facing screen and request AC-17.4.1.3 recorded
 *          (the Backstage admin Events List page, `GET
 *          /api/admin/events`) against the AC-17.1.3.1 Gallery now past
 *          its expiry, records the field carrying the state, records that
 *          visibility required the scheduled `expirationChecker` sweep
 *          (not immediate) along with that sweep's own output and side
 *          effects (deactivation, archiving, a webhook fire, queued
 *          notification emails), and records honestly that the label the
 *          photographer actually sees is "Archived," not "Expired." Pins
 *          the recorded evidence and independently re-verifies every
 *          file/line claim it makes against the pinned vendored fork.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.4.3
 * ---
 */

// The proof itself was exercised live on 2026-08-01 against the running
// Backstage (`docker compose --profile backstage`, per BACKSTAGE_STARTUP.md):
// the same `select ... from events where id = 3;` and `email_queue` queries
// were re-run directly against backstage-db, and the exact AC-17.4.1.3
// `GET /api/admin/events` request was re-issued signed in as the seeded
// administrator. That run needs a Docker daemon and a live Backstage, so
// it is not repeatable inside Jest — this suite pins the recorded evidence
// so it cannot silently rot out of the audit, and independently
// re-verifies every file/line claim the audit makes about the vendored
// fork.

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('PIVOT_AUDIT.md')

// The AC-17.4.3 section only, bounded at the next top-level heading so a
// match cannot be satisfied by unrelated text elsewhere in this multi-story
// audit document, and so the AC-14.6 recommendation/open-questions block
// can stay the document's final section.
const sectionStart = doc.indexOf('## AC-17.4.3')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1
    ? ''
    : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

describe('AC-17.4.3: expired state re-checked on the photographer-facing screen', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.4.3 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.4\.3\b/)
    })

    it('has a dedicated AC-17.4.3 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('sits after the AC-17.4.2 section it builds on', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.4.2'))
    })

    it('states no new Gallery was created and no vendored file or direct DB write was made', () => {
      expect(section).toMatch(/No new Gallery was created/)
      expect(section).toMatch(/no direct database write was made for\s*\nthis AC/)
    })
  })

  describe('visibility required the scheduled process, not immediate', () => {
    it('states visibility was not immediate', () => {
      expect(section).toMatch(/\*\*not\s*\nimmediate\*\*/)
    })

    it('records the current row: deactivated, archived, with archived_at set', () => {
      expect(section).toMatch(/expires_at {2}\| 2020-01-01 00:00:00\+00/)
      expect(section).toMatch(/is_active {3}\| f/)
      expect(section).toMatch(/is_archived {1}\| t/)
      expect(section).toMatch(/archived_at {1}\| 2026-08-01 15:00:02\.287\+00/)
    })

    it('references the AC-17.4.2 enforcement-lag timing already established (14:19:55 / 15:00:02)', () => {
      expect(section).toMatch(/14:19:55/)
      expect(section).toMatch(/15:00:02/)
    })
  })

  describe("the scheduled process's output and side effects", () => {
    it('cites handleExpiredEvent and its four effects in order', () => {
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/services\/expirationChecker\.js:94-162/
      )
      expect(section).toMatch(/\*\*Deactivation\*\*/)
      expect(section).toMatch(/\*\*A webhook fire\*\*/)
      expect(section).toMatch(/event\.expired/)
      expect(section).toMatch(/\*\*Archiving\*\*/)
      expect(section).toMatch(/\*\*Queued notifications\*\*/)
    })

    it('that cited range really is handleExpiredEvent, start to end', () => {
      const lines = read(
        'vendor/picpeak/backend/src/services/expirationChecker.js'
      ).split('\n')
      expect(lines[93]).toContain('async function handleExpiredEvent(event)')
      expect(lines.slice(93, 162).join('\n')).toMatch(/is_active.*formatBoolean\(false\)/)
      expect(lines.slice(93, 162).join('\n')).toMatch(/webhookService\.fire\('event\.expired'/)
      expect(lines.slice(93, 162).join('\n')).toMatch(/await archiveEvent\(event\)/)
      expect(lines.slice(93, 162).join('\n')).toMatch(/queueEmail\(event\.id, recipientEmail, 'gallery_expired'/)
    })

    it('records the populated archive_path', () => {
      expect(section).toMatch(
        /events\/archived\/wedding-ac-17-1-3-1-verification-gallery-2026-09-01\.zip/
      )
    })

    it('records all three queued notification emails, still pending, in email_queue', () => {
      expect(section).toMatch(/gallery_expired {3}\| pending \| 2026-08-01 15:00:00\.985\+00/)
      expect(section).toMatch(/gallery_expired {3}\| pending \| 2026-08-01 15:00:00\.997\+00/)
      expect(section).toMatch(/archive_complete {2}\| pending \| 2026-08-01 15:00:03\.707\+00/)
    })
  })

  describe('the exact AC-17.4.1.3 request, re-run against the now-expired Gallery', () => {
    it('records the same request re-issued and its 200 response', () => {
      expect(section).toMatch(
        /curl -s -i -b <seeded-admin-cookie-jar> \\\s*\n\s*"http:\/\/localhost:3100\/api\/admin\/events\?page=1&limit=20&status=all&sortBy=created_at&sortOrder=desc"/
      )
      expect(section).toMatch(/HTTP\/1\.1 200 OK/)
    })

    it('records the id:3 entry now showing is_active:false, is_archived:true, and archive fields', () => {
      expect(section).toMatch(/"id": 3/)
      expect(section).toMatch(/"expires_at": "2020-01-01T00:00:00\.000Z"/)
      expect(section).toMatch(/"is_active": false/)
      expect(section).toMatch(/"is_archived": true/)
      expect(section).toMatch(/"archived_at": "2026-08-01T15:00:02\.287Z"/)
    })

    it('records the corroborating single-event Admin Event Details screen was re-checked too', () => {
      expect(section).toMatch(/GET \/api\/admin\/events\/3/)
      expect(section).toMatch(/AC-17\.4\.1\.3's corroborating second screen/)
    })
  })

  describe('the field carrying the state, and the label actually shown', () => {
    it('confirms no status/state/is_expired field is returned, still', () => {
      expect(section).toMatch(
        /carries no field named\s*\n`status`, `state`, `is_expired`/
      )
    })

    it('cites getEventStatus and the is_archived guard checked ahead of the expired branch', () => {
      expect(section).toMatch(/EventsListPage\.tsx:263-275/)
      expect(section).toMatch(/EventsListPage\.tsx:265/)
      expect(section).toMatch(/is_archived. guard \(line 265\) sits \*ahead\* of/)
    })

    it('that cited line really is the is_archived guard, checked before is_active/expires_at', () => {
      const lines = read(
        'vendor/picpeak/frontend/src/pages/admin/EventsListPage.tsx'
      ).split('\n')
      expect(lines[262]).toContain('const getEventStatus = (event: Event) => {')
      expect(lines[264]).toContain("if (event.is_archived) return { label: t('events.archived')")
      expect(lines[265]).toContain("if (!event.is_active) return { label: t('events.inactive')")
      const body = lines.slice(262, 275).join('\n')
      expect(body).toMatch(/if \(days <= 0\) return \{ label: t\('events\.expired'\)/)
    })

    it('records the honest finding: the label shown is "Archived," not "Expired"', () => {
      expect(section).toMatch(/\*\*"Archived"\*\*/)
      expect(section).toMatch(/not the red \*\*"Expired"\*\* label/)
      expect(section).toMatch(
        /the `events\.expired` label is effectively unreachable through the normal\s*\nscheduled-expiry lifecycle/
      )
    })
  })

  describe('the corroborating Event Details page divergence', () => {
    it('cites the Archive badge and the archive-status card, gated on is_archived', () => {
      expect(section).toMatch(/EventDetailsPage\.tsx:924-927/)
      expect(section).toMatch(/EventDetailsPage\.tsx:1057/)
      expect(section).toMatch(/EventDetailsPage\.tsx:2346-2348/)
    })

    it('those cited lines really render the Archived badge and gate the warning card on !is_archived', () => {
      const lines = read(
        'vendor/picpeak/frontend/src/pages/admin/EventDetailsPage.tsx'
      ).split('\n')
      expect(lines[923]).toContain('{event.is_archived ? (')
      expect(lines[926]).toContain("{t('events.archived')}")
      expect(lines[1056]).toContain('!event.is_archived && (isExpired || isExpiring)')
      expect(lines[2345]).toContain('{event.is_archived ? (')
    })

    it('states the Expiration Warning card stays suppressed for a different reason than pre-expiry', () => {
      expect(section).toMatch(/stays suppressed here too, but for a\s*\ndifferent reason now/)
      expect(section).toMatch(/isExpired.*is false.*it is `true`/)
    })
  })

  it('closes the AC with an explicit verdict naming the screen, visibility timing, side effects, and label', () => {
    expect(section).toMatch(/AC-17\.4\.3 is satisfied/)
    expect(section).toMatch(/Backstage admin Events List page/)
    expect(section).toMatch(/not\s*\nimmediate/)
    expect(section).toMatch(/event\.expired.*webhook fire/)
    expect(section).toMatch(/three queued\s*\nnotification emails/)
    expect(section).toMatch(/the label the photographer actually\s*\nsees is \*\*"Archived"\*\*/)
  })
})
