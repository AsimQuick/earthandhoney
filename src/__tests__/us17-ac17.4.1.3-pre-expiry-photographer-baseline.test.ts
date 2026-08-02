/**
 * ---
 * file: src/__tests__/us17-ac17.4.1.3-pre-expiry-photographer-baseline.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.4.1.3 — PIVOT_AUDIT.md records, while the
 *          AC-17.1.3.1 Gallery is still unexpired, one photographer-facing
 *          screen that currently shows it as live (the Backstage admin
 *          Events List page), the exact GET /api/admin/events request
 *          backing it, its output, and the field carrying the
 *          live-versus-expired state — recorded precisely enough for
 *          AC-17.4.3 to repeat verbatim after expiry. Pins the recorded
 *          evidence and independently re-verifies every file/line claim
 *          it makes against the pinned vendored fork.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.4.1.3
 * ---
 */

// The proof itself was exercised live on 2026-08-01 against the running
// Backstage (`docker compose --profile backstage`, per BACKSTAGE_STARTUP.md):
// `select ... from events where id = 3;` was run directly against
// backstage-db, and `GET /api/admin/events` was called signed in as the
// seeded administrator. That run needs a Docker daemon and a live
// Backstage, so it is not repeatable inside Jest — this suite pins the
// recorded evidence so it cannot silently rot out of the audit, and
// independently re-verifies every file/line claim the audit makes about
// the vendored fork.

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('PIVOT_AUDIT.md')

// The AC-17.4.1.3 section only, bounded at the next top-level heading so a
// match cannot be satisfied by unrelated text elsewhere in this multi-story
// audit document, and so the AC-14.6 recommendation/open-questions block can
// stay the document's final section.
const sectionStart = doc.indexOf('## AC-17.4.1.3')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1
    ? ''
    : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

describe('AC-17.4.1.3: pre-expiry photographer-facing baseline is recorded', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.4.1.3 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.4\.1\.3\b/)
    })

    it('has a dedicated AC-17.4.1.3 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('sits after the AC-17.4.1.2 section it builds on', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.4.1.2'))
    })

    it('states it reuses the AC-17.1.3.1 Gallery rather than creating a new one', () => {
      expect(section).toMatch(/No new Gallery was created\s*\nfor this AC/)
      expect(section).toMatch(/events\.id =\s*\n?3/)
    })
  })

  describe('the Gallery is confirmed unexpired before the baseline is taken', () => {
    it('records the live row with expires_at in the future', () => {
      expect(section).toMatch(/expires_at {2}\| 2026-10-01 00:00:00\+00/)
      expect(section).toMatch(/is_active {3}\| t/)
      expect(section).toMatch(/is_draft {4}\| f/)
    })

    it('states the run predates the recorded expires_at value', () => {
      expect(section).toMatch(/Run on 2026-08-01, 61 days ahead of `expires_at`/)
    })
  })

  describe('the photographer-facing screen and its backing request', () => {
    it('names the Events List page and the GET /api/admin/events route it calls', () => {
      expect(section).toMatch(/Backstage admin \*\*Events List\*\* page/)
      expect(section).toMatch(
        /vendor\/picpeak\/frontend\/src\/pages\/admin\/EventsListPage\.tsx/
      )
      expect(section).toMatch(/GET\s*\n?\/api\/admin\/events/)
    })

    it('cites the permission gate on the list route', () => {
      expect(section).toMatch(/requirePermission\('events\.view'\)/)
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/routes\/adminEvents\.js:867/
      )
    })

    it('that cited line really is the events.view-gated list route', () => {
      const routes = read('vendor/picpeak/backend/src/routes/adminEvents.js').split('\n')
      expect(routes[866]).toContain("router.get('/', adminAuth, requirePermission('events.view')")
    })

    it('records the exact request issued, with the same default filter the page loads with', () => {
      expect(section).toMatch(
        /curl -s -i -b <seeded-admin-cookie-jar> \\\s*\n\s*"http:\/\/localhost:3100\/api\/admin\/events\?page=1&limit=20&status=all&sortBy=created_at&sortOrder=desc"/
      )
      expect(section).toMatch(/HTTP\/1\.1 200 OK/)
    })
  })

  describe('the output, for the AC-17.1.3.1 Gallery specifically', () => {
    it('records the id, slug, and expiry-adjacent fields exactly as returned', () => {
      expect(section).toMatch(/"id": 3/)
      expect(section).toMatch(
        /"slug": "wedding-ac-17-1-3-1-verification-gallery-2026-09-01"/
      )
      expect(section).toMatch(/"expires_at": "2026-10-01T00:00:00\.000Z"/)
      expect(section).toMatch(/"is_active": true/)
      expect(section).toMatch(/"is_archived": false/)
      expect(section).toMatch(/"is_draft": false/)
    })
  })

  describe('the field carrying the live-versus-expired state', () => {
    it('states no status/state/is_expired field is returned', () => {
      expect(section).toMatch(
        /carries no field named `status`, `state`, `is_expired`/
      )
    })

    it('cites mapEventForApi as the pass-through with no computed field added', () => {
      expect(section).toMatch(/`mapEventForApi`/)
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/routes\/adminEvents\.js:215-236/
      )
    })

    it('that cited range really is mapEventForApi, start to end, with no added field', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminEvents.js').split('\n')
      expect(lines[214]).toContain('const mapEventForApi = (event) => {')
      expect(lines[235]).toContain('};')
      const body = lines.slice(214, 236).join('\n')
      expect(body).not.toMatch(/status|is_expired/i)
    })

    it('cites getEventStatus as the client-side computation producing the label', () => {
      expect(section).toMatch(/`getEventStatus\(\)`/)
      expect(section).toMatch(
        /EventsListPage\.tsx:263-275/
      )
    })

    it('that cited range really is getEventStatus, falling through to the green Active label', () => {
      const lines = read(
        'vendor/picpeak/frontend/src/pages/admin/EventsListPage.tsx'
      ).split('\n')
      expect(lines[262]).toContain('const getEventStatus = (event: Event) => {')
      expect(lines[273]).toContain("return { label: t('events.active')")
      expect(lines[273]).toContain('text-green-600')
      expect(lines[274]).toContain('};')
    })

    it('records the fall-through reasoning for this Gallery today (61 days out, every guard false)', () => {
      expect(section).toMatch(/every guard clause falls\s*\n?through/)
      expect(section).toMatch(/EventsListPage\.tsx:274/)
      expect(section).toMatch(/rendering the green `t\('events\.active'\)`\s*\n?\("Active"\) label/)
    })

    it('records the label as a UI-layer interpretation, not an upstream-persisted field', () => {
      expect(section).toMatch(
        /a UI-layer interpretation of four raw fields, not an explicit state\s*\nthe upstream API itself returns or persists/
      )
    })
  })

  describe('the corroborating Event Details page confirms the same absence, and the raw-date fallback', () => {
    it('names the Event Details page and its backing single-event route', () => {
      expect(section).toMatch(
        /vendor\/picpeak\/frontend\/src\/pages\/admin\/EventDetailsPage\.tsx/
      )
      expect(section).toMatch(/GET \/api\/admin\/events\/3/)
    })

    it('cites the isExpired/isExpiring computation and the gated warning card', () => {
      expect(section).toMatch(/EventDetailsPage\.tsx:571-574/)
      expect(section).toMatch(/EventDetailsPage\.tsx:1057/)
      expect(section).toMatch(/EventDetailsPage\.tsx:1820-1830/)
    })

    it('those cited lines really compute isExpired/isExpiring, gate the warning card, and render the raw date', () => {
      const lines = read(
        'vendor/picpeak/frontend/src/pages/admin/EventDetailsPage.tsx'
      ).split('\n')
      expect(lines[572]).toContain('const isExpired =')
      expect(lines[573]).toContain('const isExpiring =')
      expect(lines[1056]).toContain('(isExpired || isExpiring)')
      expect(lines.slice(1819, 1830).join('\n')).toMatch(/t\('events\.expires'\)/)
      expect(lines.slice(1819, 1830).join('\n')).toMatch(/daysLeft/)
    })

    it('records this second screen as the "raw expiry date the photographer must interpret themselves" case', () => {
      expect(section).toMatch(
        /the "only a raw\s*\nexpiry date the photographer must interpret themselves" case this AC\s*\ncalls out/
      )
    })
  })

  it('closes the AC with an explicit verdict naming the screen, request, and field', () => {
    expect(section).toMatch(/AC-17\.4\.1\.3 is satisfied/)
    expect(section).toMatch(/Backstage admin Events List page/)
    expect(section).toMatch(
      /GET\s*\n?\/api\/admin\/events\?page=1&limit=20&status=all&sortBy=created_at&sortOrder=desc/
    )
    expect(section).toMatch(/currently shows it with a green "Active" label/)
    expect(section).toMatch(
      /no stored or returned API field\s*\nnamed `status`\/`state`\/`is_expired`/
    )
    expect(section).toMatch(/AC-17\.4\.3 re-checks after\s*\nexpiry/)
  })
})
