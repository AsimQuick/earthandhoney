/**
 * ---
 * file: src/__tests__/us17-ac17.4.1.1.3-expiry-model-vs-prd.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.4.1.1.3 — PIVOT_AUDIT.md states plainly how the
 *          pinned fork's expiry model, as established by
 *          AC-17.4.1.1.1.1.1.1 through AC-17.4.1.1.1.3 and AC-17.4.1.1.2,
 *          compares with what `scrum-master/PRD.md` section 13 assumes
 *          about gallery expiry. This suite confirms: the section exists
 *          in the right place and cites the right pinned-commit evidence
 *          already established by the two preceding criteria; the PRD
 *          quotes and line numbers genuinely appear in PRD.md where
 *          claimed; both the agreement (Gallery-level control culminating
 *          in an automatic archive) and each of the three recorded
 *          differences (uneven enforcement vs. password protection, a
 *          separate deactivation flag, a time- not download-driven
 *          trigger) are stated with real file:line citations; and no
 *          vendored fork file was modified to close any of them.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.4.1.1.3
 * ---
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const lines = (rel: string) => read(rel).split('\n')
/** 1-indexed line lookup, matching how the audit cites code. */
const lineAt = (rel: string, n: number) => lines(rel)[n - 1] ?? ''

const doc = read('PIVOT_AUDIT.md')
const prd = read('scrum-master/PRD.md')

const sectionStart = doc.indexOf('## AC-17.4.1.1.3 ')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1 ? '' : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

// Whitespace-collapsed, for asserting on prose the document hard-wraps.
const flat = section.replace(/\s+/g, ' ')

const EXPIRATION_CHECKER = 'vendor/picpeak/backend/src/services/expirationChecker.js'
const DB_JS = 'vendor/picpeak/backend/src/database/db.js'
const CUSTOMER_JS = 'vendor/picpeak/backend/src/routes/customer.js'
const AUTH_JS = 'vendor/picpeak/backend/src/routes/auth.js'
const MIDDLEWARE_GALLERY = 'vendor/picpeak/backend/src/middleware/gallery.js'
const GALLERY_PAGE = 'vendor/picpeak/frontend/src/pages/GalleryPage.tsx'

describe('AC-17.4.1.1.3: the pinned fork\'s expiry model against the PRD\'s assumption', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.4.1.1.3 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.4\.1\.1\.3\b/)
    })

    it('has a dedicated AC-17.4.1.1.3 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits after the AC-17.4.1.1.2 section it builds on', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.4.1.1.2 '))
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('names the two preceding criteria it draws its evidence from', () => {
      expect(flat).toMatch(/AC-17\.4\.1\.1\.1\.1\.1\.1/)
      expect(flat).toMatch(/AC-17\.4\.1\.1\.1\.3/)
      expect(flat).toMatch(/AC-17\.4\.1\.1\.2\b/)
    })

    it('states no new search and no live Backstage were used', () => {
      expect(flat).toMatch(/no new code search was run/i)
      expect(flat).toMatch(/no live Backstage was exercised/i)
    })
  })

  describe('the PRD quotes are genuine', () => {
    it('the top-level client-relationship diagram names Gallery Delivery Window and Archive at the cited lines', () => {
      expect(section).toContain('`PRD.md:9-27`')
      expect(section).toContain('`PRD.md:22`')
      expect(lineAt('scrum-master/PRD.md', 22)).toMatch(/Gallery Delivery Window/)
      expect(section).toContain('`PRD.md:24`')
      expect(lineAt('scrum-master/PRD.md', 24)).toMatch(/Download Completed/)
      expect(section).toContain('`PRD.md:26`')
      expect(lineAt('scrum-master/PRD.md', 26)).toMatch(/^Archive$/)
    })

    it('PRD.md:863 is the section header cited', () => {
      expect(section).toContain('`PRD.md:863`')
      expect(lineAt('scrum-master/PRD.md', 863)).toMatch(/# 13\. Client Gallery Delivery/)
    })

    it('the workflow diagram ends in "Gallery archived" at the cited lines', () => {
      expect(section).toContain('`PRD.md:874-890`')
      expect(lineAt('scrum-master/PRD.md', 874)).toMatch(/Photographer uploads gallery/)
      expect(lineAt('scrum-master/PRD.md', 886)).toMatch(/Client downloads photos/)
      expect(lineAt('scrum-master/PRD.md', 890)).toMatch(/Gallery archived/)
    })

    it('the Gallery-controls list at the cited lines names expiration window as a peer of password protection', () => {
      expect(section).toContain('`PRD.md:897-900`')
      expect(lineAt('scrum-master/PRD.md', 897)).toMatch(/private link/)
      expect(lineAt('scrum-master/PRD.md', 898)).toMatch(/password protection/)
      expect(lineAt('scrum-master/PRD.md', 899)).toMatch(/download enabled/)
      expect(lineAt('scrum-master/PRD.md', 900)).toMatch(/expiration window/)
    })

    it('PRD.md mentions expiry/archiving only in these two places', () => {
      const hits = prd
        .split('\n')
        .map((line, i) => ({ line: i + 1, text: line }))
        .filter((l) => /expir|archiv/i.test(l.text))
      const inKnownRange = (n: number) => (n >= 9 && n <= 27) || (n >= 863 && n <= 901)
      for (const h of hits) {
        expect(inKnownRange(h.line)).toBe(true)
      }
      expect(hits.length).toBe(3) // Archive (26), Gallery archived (890), expiration window (900)
    })
  })

  describe('the restated upstream evidence matches the pinned-commit source', () => {
    it('events.expires_at is the sole stored column, per AC-17.4.1.1.1.3', () => {
      expect(section).toContain('`db.js:143`')
      expect(lineAt(DB_JS, 143)).toMatch(/table\.datetime\('expires_at'\)/)
    })

    it('the hourly cron and handleExpiredEvent steps are real, per AC-17.4.1.1.2', () => {
      expect(section).toContain('`expirationChecker.js:11`')
      expect(lineAt(EXPIRATION_CHECKER, 11)).toMatch(/cron\.schedule\('0 \* \* \* \*',\s*async/)
      expect(section).toContain('`expirationChecker.js:97`')
      expect(lineAt(EXPIRATION_CHECKER, 97)).toMatch(/is_active: formatBoolean\(false\)/)
      expect(section).toContain('`:156`')
      expect(lineAt(EXPIRATION_CHECKER, 156)).toMatch(/archiveEvent\(event\)/)
    })

    it('checkExpirations filters only on expires_at vs. now, never on download/view activity', () => {
      expect(section).toContain('`expirationChecker.js:46-50`')
      const body = lines(EXPIRATION_CHECKER).slice(45, 50).join('\n')
      expect(body).toMatch(/expires_at/)
      expect(body).not.toMatch(/download|view_count|last_viewed/i)
    })

    it('the two live access-gating surfaces from AC-17.4.1.1.1.2.3 are cited correctly', () => {
      expect(section).toContain('`customer.js:148`')
      expect(lineAt(CUSTOMER_JS, 148)).toMatch(/event\.expires_at.*new Date\(event\.expires_at\)/)
      expect(section).toContain('`auth.js:576`')
      expect(lineAt(AUTH_JS, 576)).toMatch(/event\.expires_at.*new Date\(event\.expires_at\)/)
    })

    it('the actually-mounted gallery middleware gates on token presence, not expires_at', () => {
      expect(section).toContain('`middleware/gallery.js:62`')
      expect(lineAt(MIDDLEWARE_GALLERY, 62)).toMatch(/No token provided/)
      expect(read(MIDDLEWARE_GALLERY)).not.toMatch(/expires_at/)
    })

    it('GalleryPage.tsx:275 is cited as the only ordinary-viewer expiry gate', () => {
      expect(section).toContain('`GalleryPage.tsx:275`')
      expect(lineAt(GALLERY_PAGE, 275)).toMatch(/is_expired/)
    })
  })

  describe('agreement is stated', () => {
    it('states a Gallery-level expiry control matches the PRD\'s expiration window', () => {
      expect(flat).toMatch(/expiration window/i)
      expect(flat).toMatch(/events\.expires_at/)
    })

    it('states the automatic archive matches the PRD\'s Gallery-archived terminal step', () => {
      expect(flat).toMatch(/Gallery archived/i)
      expect(flat).toMatch(/archiveEvent\(event\)/)
      expect(flat).toMatch(/automatic/i)
    })
  })

  describe('each of the three differences is stated as upstream shape, not patched', () => {
    it('difference 1: uneven enforcement vs. password protection (AC-17.3)', () => {
      expect(flat).toMatch(/AC-17\.3/)
      expect(flat).toMatch(/No token provided/)
      expect(flat).toMatch(/not enforced at the layer the others are|uneven|not enforced the same way/i)
    })

    it('difference 2: a separate is_active deactivation flag the PRD does not name', () => {
      expect(flat).toMatch(/is_active:\s*false/)
      expect(flat).toMatch(/deactivat/i)
    })

    it('difference 3: a purely time-based trigger, not a download-completion trigger', () => {
      expect(flat).toMatch(/time-based/i)
      expect(flat).toMatch(/download/i)
    })

    it('explicitly rules out the AC\'s own named hypotheticals as not what was found', () => {
      expect(flat).toMatch(/dedicated stored expiry column/i)
      expect(flat).toMatch(/does have a scheduled process/i)
    })
  })

  describe('no fork patch is made to close any of these gaps', () => {
    it('states explicitly that nothing under vendor/picpeak/ was edited by this AC', () => {
      expect(flat).toMatch(/no change was made under\s*`?vendor\/picpeak\/`?/i)
    })

    it('the vendored fork has no local modifications (git-clean)', () => {
      const status = execSync('git status --porcelain -- vendor/picpeak', {
        cwd: root,
        encoding: 'utf8',
      })
      expect(status.trim()).toBe('')
    })
  })

  describe('verdict', () => {
    it('has a verdict subsection', () => {
      expect(section).toContain('### Verdict')
    })

    it('the verdict claims the criterion satisfied', () => {
      const verdict = section.slice(section.indexOf('### Verdict')).replace(/\s+/g, ' ')
      expect(verdict).toMatch(/AC-17\.4\.1\.1\.3 is satisfied/)
    })
  })
})
