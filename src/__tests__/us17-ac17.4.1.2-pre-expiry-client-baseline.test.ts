/**
 * ---
 * file: src/__tests__/us17-ac17.4.1.2-pre-expiry-client-baseline.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.4.1.2 — PIVOT_AUDIT.md records, while the
 *          AC-17.1.3.1 Gallery is still unexpired, its stored expiry
 *          value read directly from PostgreSQL with the AC-17.4.1.1.1.3
 *          column, and one exact client-facing request that currently
 *          succeeds, recorded precisely enough for AC-17.4.2 to repeat
 *          verbatim after expiry. Pins the recorded evidence and
 *          independently re-verifies every file/line claim it makes
 *          against the pinned vendored fork.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.4.1.2
 * ---
 */

// The proof itself was exercised live on 2026-08-01 against the running
// Backstage (`docker compose --profile backstage`, per BACKSTAGE_STARTUP.md):
// `SELECT expires_at FROM events WHERE id = 3;` was run directly against
// backstage-db, and `GET /api/gallery/:slug/photos` was called with a
// gallery token obtained from `POST /api/auth/gallery/verify`. That run
// needs a Docker daemon and a live Backstage, so it is not repeatable
// inside Jest — this suite pins the recorded evidence so it cannot
// silently rot out of the audit, and independently re-verifies every
// file/line claim the audit makes about the vendored fork.

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('PIVOT_AUDIT.md')

// The AC-17.4.1.2 section only, bounded at the next top-level heading so a
// match cannot be satisfied by unrelated text elsewhere in this multi-story
// audit document, and so the AC-14.6 recommendation/open-questions block can
// stay the document's final section.
const sectionStart = doc.indexOf('## AC-17.4.1.2')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1
    ? ''
    : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

describe('AC-17.4.1.2: pre-expiry client-facing baseline is recorded', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.4.1.2 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.4\.1\.2\b/)
    })

    it('has a dedicated AC-17.4.1.2 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('sits after the AC-17.4.1.1.3 section it builds on', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.4.1.1.3'))
    })

    it('states it reuses the AC-17.1.3.1 Gallery rather than creating a new one', () => {
      expect(section).toMatch(/No new Gallery was created for this AC/)
      expect(section).toMatch(/events\.id =\s*3/)
    })
  })

  describe('the Gallery is confirmed unexpired before the baseline is taken', () => {
    it('records the live row with expires_at in the future', () => {
      expect(section).toMatch(/expires_at \| 2026-10-01 00:00:00\+00/)
      expect(section).toMatch(/is_active {2}\| t/)
      expect(section).toMatch(/is_draft {3}\| f/)
    })

    it('states the run predates the recorded expires_at value', () => {
      expect(section).toMatch(/Run on 2026-08-01/)
      expect(section).toMatch(/ahead of the `2026-10-01`/)
    })
  })

  describe('(a) stored expiry value read directly from PostgreSQL', () => {
    it('runs the exact AC-17.4.1.1.1.3(c) query, id substituted for the placeholder', () => {
      expect(section).toMatch(/AC-17\.4\.1\.1\.1\.3\(c\) gave the exact query/)
      expect(section).toMatch(/SELECT expires_at FROM events WHERE id = 3;/)
    })

    it('records the query result matching the live row', () => {
      expect(section).toMatch(/2026-10-01 00:00:00\+00\s*\n\(1 row\)/)
      expect(section).toMatch(
        /events\.expires_at = 2026-10-01 00:00:00\+00/
      )
    })
  })

  describe('(b) the client-facing request, and why it is the one AC-17.4.2 will re-run', () => {
    it('names the route, its mount, and the middleware gating it', () => {
      expect(section).toMatch(/`GET \/api\/gallery\/:slug\/photos`/)
      expect(section).toMatch(/vendor\/picpeak\/backend\/src\/routes\/gallery\.js:216/)
      expect(section).toMatch(/vendor\/picpeak\/backend\/server\.js:635/)
      expect(section).toMatch(/vendor\/picpeak\/backend\/src\/middleware\/gallery\.js:20/)
    })

    it('those cited lines really are the photos route, its mount, and verifyGalleryAccess', () => {
      const gallery = read('vendor/picpeak/backend/src/routes/gallery.js').split('\n')
      expect(gallery[217]).toContain("router.get('/:slug/photos'")
      expect(gallery[217]).toContain('verifyGalleryAccess')

      const server = read('vendor/picpeak/backend/server.js').split('\n')
      expect(server[634]).toContain("app.use('/api/gallery', galleryRoutes)")

      const middleware = read('vendor/picpeak/backend/src/middleware/gallery.js').split('\n')
      expect(middleware[19]).toContain('async function verifyGalleryAccess')
    })

    it('cites the is_active filter the expiry sweep flips, tying this request to expiry', () => {
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/middleware\/gallery\.js:36/
      )
      expect(section).toMatch(/is_active: formatBoolean\(true\)/)
      expect(section).toMatch(/expirationChecker\.js:97/)
    })

    it('that cited line really does filter on is_active: true', () => {
      const middleware = read('vendor/picpeak/backend/src/middleware/gallery.js').split('\n')
      expect(middleware[35]).toContain('is_active: formatBoolean(true)')
    })

    it('that cited expirationChecker.js line really does flip is_active to false', () => {
      const checker = read('vendor/picpeak/backend/src/services/expirationChecker.js').split(
        '\n'
      )
      expect(checker[96]).toContain('is_active: formatBoolean(false)')
    })

    it('records how the gallery token used for the request was obtained', () => {
      expect(section).toMatch(/POST http:\/\/localhost:3100\/api\/auth\/gallery\/verify/)
      expect(section).toMatch(/"password":"Verify-Pass-123"/)
      expect(section).toMatch(/Set-Cookie: gallery_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/)
    })

    it('records the request as issued, exactly as AC-17.4.2 will repeat it', () => {
      expect(section).toMatch(
        /curl -s -i -b <gallery-cookie-jar> http:\/\/localhost:3100\/api\/gallery\/wedding-ac-17-1-3-1-verification-gallery-2026-09-01\/photos/
      )
    })

    it('records the 200 status and enough of the body to show the gallery is being served', () => {
      expect(section).toMatch(/HTTP\/1\.1 200 OK/)
      expect(section).toMatch(/"event":\{"id":3,"event_name":"AC-17\.1\.3\.1 Verification Gallery"/)
      expect(section).toMatch(/"expires_at":"2026-10-01T00:00:00\.000Z"/)
      expect(section).toMatch(/"categories":\[\],"photos":\[\{"id":3/)
    })

    it('names all three returned photo ids from the AC-17.2 batch', () => {
      expect(section).toMatch(/\(`id` 3, 2, 1\)/)
    })
  })

  it('closes the AC with an explicit verdict naming both the DB value and the request', () => {
    expect(section).toMatch(/AC-17\.4\.1\.2 is satisfied/)
    expect(section).toMatch(/expires_at = 2026-10-01 00:00:00\+00/)
    expect(section).toMatch(
      /SELECT expires_at FROM events WHERE id = 3;/
    )
    expect(section).toMatch(
      /GET \/api\/gallery\/wedding-ac-17-1-3-1-verification-gallery-2026-09-01\/photos/
    )
    expect(section).toMatch(/returning `200` with the\s*\n?Gallery's real event data and photo list/)
    expect(section).toMatch(/AC-17\.4\.2 to repeat verbatim after expiry/)
  })
})
