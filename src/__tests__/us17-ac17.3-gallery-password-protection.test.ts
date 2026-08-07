/**
 * ---
 * file: src/__tests__/us17-ac17.3-gallery-password-protection.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.3 — PIVOT_AUDIT.md records proof that gallery
 *          password protection works as delivered by upstream: the
 *          AC-17.1.3.1 Gallery refuses access without the password (or
 *          with the wrong one) and grants it once the correct password is
 *          supplied. Pins the exact requests/responses recorded in the
 *          audit, and independently re-verifies every file/line claim it
 *          makes against the pinned vendored fork.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.3
 * ---
 */

// The proof itself was exercised live on 2026-07-31 against the running
// Backstage (`docker compose --profile backstage`, per BACKSTAGE_STARTUP.md):
// the AC-17.1.3.1 Gallery (draft) was published through
// POST /api/admin/events/3/publish, then GET /api/gallery/:slug/photos was
// called with no token (401), POST /api/auth/gallery/verify was called
// with the wrong password (401, logged as a failure in access_logs), and
// then with the correct password (200, JWT issued and cookies set) — that
// token was then used to call the previously-refused photos route (200).
// That run needs a Docker daemon and a live Backstage, so it is not
// repeatable inside Jest — this suite pins the recorded evidence so it
// cannot silently rot out of the audit, and independently re-verifies
// every file/line claim the audit makes about the vendored fork.

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('PIVOT_AUDIT.md')

// The AC-17.3 section only, bounded at the next top-level heading so a
// match cannot be satisfied by unrelated text elsewhere in this multi-story
// audit document, and so the AC-14.6 recommendation/open-questions block can
// stay the document's final section.
const sectionStart = doc.indexOf('## AC-17.3')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1
    ? ''
    : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

describe('AC-17.3: gallery password protection refuses without, grants with, the password', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.3 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.3\b/)
    })

    it('has a dedicated AC-17.3 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('sits after the AC-17.2 section it builds on', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.2'))
    })

    it('states it reuses the AC-17.1.3.1 Gallery rather than creating a new one', () => {
      expect(section).toMatch(/no new Gallery was created for this AC/)
      expect(section).toMatch(/events\.id = 3/)
    })
  })

  describe('publishing the draft Gallery so the public route is reachable', () => {
    it('names the publish route used', () => {
      expect(section).toMatch(
        /`POST \/api\/admin\/events\/:id\/publish`/
      )
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/routes\/adminEvents\.js:1049/
      )
    })

    it('that cited line really is the publish route', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminEvents.js').split('\n')
      expect(lines[1048]).toContain("router.post('/:id/publish'")
    })

    it('cites the middleware line excluding drafts from public access', () => {
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/middleware\/gallery\.js:20/
      )
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/middleware\/gallery\.js:40/
      )
    })

    it('those cited lines really do exclude drafts in verifyGalleryAccess', () => {
      const lines = read('vendor/picpeak/backend/src/middleware/gallery.js').split('\n')
      expect(lines[19]).toContain('async function verifyGalleryAccess')
      expect(lines[39]).toContain("is_draft: formatBoolean(false)")
    })

    it('records the publish call succeeding', () => {
      expect(section).toMatch(/HTTP\/1\.1 200 OK/)
      expect(section).toMatch(/"message":"Event published successfully","is_draft":false/)
    })
  })

  describe('the routes exercised are named and really exist', () => {
    it('names the password-verification route and its mount', () => {
      expect(section).toMatch(/`POST \/api\/auth\/gallery\/verify`/)
      expect(section).toMatch(/vendor\/picpeak\/backend\/src\/routes\/auth\.js:184/)
      expect(section).toMatch(/vendor\/picpeak\/backend\/server\.js:442/)
    })

    it('names the gated content route and its mount', () => {
      expect(section).toMatch(
        /`GET \/api\/gallery\/:slug\/photos`/
      )
      expect(section).toMatch(/vendor\/picpeak\/backend\/src\/routes\/gallery\.js:216/)
      expect(section).toMatch(/vendor\/picpeak\/backend\/server\.js:446/)
    })

    it('those cited lines really are the verify route, the photos route, and their mounts', () => {
      const auth = read('vendor/picpeak/backend/src/routes/auth.js').split('\n')
      expect(auth[183]).toContain("router.post('/gallery/verify'")

      const gallery = read('vendor/picpeak/backend/src/routes/gallery.js').split('\n')
      expect(gallery[217]).toContain("router.get('/:slug/photos'")
      expect(gallery[217]).toContain('verifyGalleryAccess')

      const server = read('vendor/picpeak/backend/server.js').split('\n')
      expect(server[441]).toContain("app.use('/api/auth', authRoutes)")
      expect(server[445]).toContain("app.use('/api/gallery', galleryRoutes)")
    })

    it('cites the bcrypt comparison against the stored password hash', () => {
      expect(section).toMatch(/vendor\/picpeak\/backend\/src\/routes\/auth\.js:231/)
      expect(section).toMatch(/bcrypt\.compare/)
    })

    it('that cited line really does compare the password against password_hash', () => {
      const lines = read('vendor/picpeak/backend/src/routes/auth.js').split('\n')
      expect(lines[230]).toContain('bcrypt.compare(password, event.password_hash)')
    })

    it('explains reCAPTCHA does not block the run and cites where that is decided', () => {
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/services\/recaptcha\.js:24/
      )
      expect(section).toMatch(/security_enable_recaptcha/)
    })

    it('that cited line really is the reCAPTCHA-disabled short-circuit', () => {
      const lines = read('vendor/picpeak/backend/src/services/recaptcha.js').split('\n')
      expect(lines[23]).toContain('if (!isEnabled)')
    })

    it('records the no-token refusal happens before any password check', () => {
      expect(section).toMatch(
        /falls through to\s*\n?\s*`vendor\/picpeak\/backend\/src\/middleware\/gallery\.js:62`/
      )
      expect(section).toMatch(/without\s*\n?ever looking at a password/)
    })

    it('that cited line really is the "No token provided" 401 branch', () => {
      const lines = read('vendor/picpeak/backend/src/middleware/gallery.js').split('\n')
      expect(lines[61]).toContain("No token provided")
      expect(lines[61]).toContain('401')
    })
  })

  describe('refused without the password', () => {
    it('records the 401 and its body with no token supplied at all', () => {
      expect(section).toMatch(/HTTP\/1\.1 401 Unauthorized/)
      expect(section).toMatch(/\{"error":"No token provided"\}/)
    })
  })

  describe('refused with the wrong password', () => {
    it('records the 401 and its body for a wrong-password verify call', () => {
      expect(section).toMatch(/"password":"totally-wrong"/)
      expect(section).toMatch(/\{"error":"Invalid gallery or password"\}/)
    })

    it('records the failure being logged in access_logs, not silently dropped', () => {
      expect(section).toMatch(/access_logs where event_id = 3/)
      expect(section).toMatch(/login_fail/)
    })

    it('explains the repeated login_fail rows and that lockout was not tripped', () => {
      expect(section).toMatch(/refuse\/grant sequence was run twice/)
      expect(section).toMatch(/vendor\/picpeak\/backend\/src\/routes\/auth\.js:211/)
      expect(section).toMatch(/not a lockout masquerading\s*\n?as one/)
    })

    it('reads the failures back out of Postgres rather than trusting the HTTP response', () => {
      expect(section).toMatch(/docker compose --profile backstage exec -T backstage-db psql/)
      expect(section).toMatch(/Read straight out of `backstage-db`/)
    })

    it('that cited line really is the account-lockout check', () => {
      const lines = read('vendor/picpeak/backend/src/routes/auth.js').split('\n')
      expect(lines[210]).toContain('checkAccountLockout')
    })
  })

  describe('granted with the correct password', () => {
    it('records the 200, the issued JWT, and both cookies set', () => {
      expect(section).toMatch(/"password":"Verify-Pass-123"/)
      expect(section).toMatch(/HTTP\/1\.1 200 OK/)
      expect(section).toMatch(
        /Set-Cookie: gallery_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/
      )
      expect(section).toMatch(
        /Set-Cookie: gallery_token_wedding-ac-17-1-3-1-verification-gallery-2026-09-01=/
      )
    })

    it('records the response event payload matching the AC-17.1.3.1 Gallery', () => {
      expect(section).toMatch(/"id":3,"event_name":"AC-17\.1\.3\.1 Verification Gallery"/)
      expect(section).toMatch(/"require_password":true/)
    })

    it('cites the JWT issuer and cookie-setting code', () => {
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/routes\/auth\.js:261-270/
      )
      expect(section).toMatch(/issuer: 'picpeak-auth'/)
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/utils\/tokenUtils\.js:130/
      )
    })

    it('those cited lines really do sign the picpeak-auth JWT and set the gallery cookies', () => {
      const auth = read('vendor/picpeak/backend/src/routes/auth.js').split('\n')
      const range = auth.slice(260, 270).join('\n')
      expect(range).toMatch(/jwt\.sign/)
      expect(range).toMatch(/eventId: event\.id/)
      expect(range).toMatch(/issuer: 'picpeak-auth'/)

      const tokenUtils = read('vendor/picpeak/backend/src/utils/tokenUtils.js').split('\n')
      expect(tokenUtils[129]).toContain('function setGalleryAuthCookies')
      expect(tokenUtils[1]).toContain("GALLERY_COOKIE_NAME = 'gallery_token'")
    })

    it('records the previously-refused photos route now returning 200 with the token', () => {
      expect(section).toMatch(
        /grants access to the previously-refused route/
      )
      expect(section).toMatch(/"categories":\[\],"photos":\[\{"id":3/)
    })

    it('cites the token-extraction code the middleware uses to read the cookie back', () => {
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/utils\/tokenUtils\.js:176/
      )
    })

    it('that cited line really is getGalleryTokenFromRequest reading the gallery_token cookie', () => {
      const lines = read('vendor/picpeak/backend/src/utils/tokenUtils.js').split('\n')
      expect(lines[175]).toContain('function getGalleryTokenFromRequest')
      const cookieRead = lines.slice(192, 194).join('\n')
      expect(cookieRead).toContain("req.cookies[GALLERY_COOKIE_NAME]")
    })

    it('states no new photos were uploaded for this AC — the AC-17.2 batch is what is returned', () => {
      expect(section).toMatch(/no new photos were uploaded for this AC/)
    })
  })

  describe('the run is shown to reproduce, not to be a one-off', () => {
    it('records the sequence being re-executed with identical results', () => {
      expect(section).toMatch(/re-executed\s*\n?verbatim/)
      expect(section).toMatch(/byte-identical status codes and bodies/)
      expect(section).toMatch(/same three photo ids \(`3, 2, 1`\)/)
    })

    it('states upstream needed no patch or workaround to pass this AC', () => {
      expect(section).toMatch(
        /Nothing in upstream's password gate had to be modified,\s*\n?patched, or worked around/
      )
    })
  })

  it('closes the AC with an explicit verdict naming both the refusal and the grant', () => {
    expect(section).toMatch(/AC-17\.3 is satisfied/)
    expect(section).toMatch(/refuses[\s\S]{0,400}with no token at all/)
    expect(section).toMatch(/refuses[\s\S]{0,20}`POST \/api\/auth\/gallery\/verify`[\s\S]{0,60}with the wrong\s*\n?password/)
    expect(section).toMatch(/grants access[\s\S]{0,400}once the correct password is\s*\n?supplied/)
    expect(section).toMatch(/exercised live against the running\s*\n?Backstage/)
  })
})
