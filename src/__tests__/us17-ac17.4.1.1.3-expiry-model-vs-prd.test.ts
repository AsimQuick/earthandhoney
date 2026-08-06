/**
 * ---
 * file: src/__tests__/us17-ac17.4.1.1.3-expiry-model-vs-prd.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.4.1.1.3 — PIVOT_AUDIT.md states plainly how the
 *          pinned fork's expiry model, as established by
 *          AC-17.4.1.1.1.1.1.1 through AC-17.4.1.1.1.3 and AC-17.4.1.1.2,
 *          compares with what `scrum-master/PRD.md` assumes about gallery
 *          expiry (§6.2's Project workflow diagram, §23.2's milestones
 *          list, and §30 "Private Gallery Delivery and Retention" — the
 *          restored PRD's real content, re-cited after the US-21 restore
 *          replaced the retired document this section originally cited).
 *          This suite confirms: the section exists
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
    it('the top-level Project workflow diagram (§6.2) ends Delivery then Expiry and closure at the cited lines', () => {
      expect(section).toContain('`PRD.md:191-206`')
      expect(section).toContain('`PRD.md:204`')
      expect(lineAt('scrum-master/PRD.md', 204)).toMatch(/→ Delivery/)
      expect(section).toContain('`PRD.md:205`')
      expect(lineAt('scrum-master/PRD.md', 205)).toMatch(/→ Expiry and closure/)
    })

    it('the §23.2 milestones list names gallery released, downloads completed, and gallery expired/archived at the cited lines', () => {
      expect(section).toContain('`PRD.md:1019-1038`')
      expect(section).toContain('`PRD.md:1035`')
      expect(lineAt('scrum-master/PRD.md', 1035)).toMatch(/gallery released/)
      expect(section).toContain('`PRD.md:1036`')
      expect(lineAt('scrum-master/PRD.md', 1036)).toMatch(/downloads completed/)
      expect(section).toContain('`PRD.md:1037`')
      expect(lineAt('scrum-master/PRD.md', 1037)).toMatch(/gallery expired\/archived/)
      expect(section).toContain('`PRD.md:1038`')
      expect(lineAt('scrum-master/PRD.md', 1038)).toMatch(/project closed/)
    })

    it('PRD.md:1459 is the §30 section header cited', () => {
      expect(section).toContain('`PRD.md:1459`')
      expect(lineAt('scrum-master/PRD.md', 1459)).toMatch(/# 30\. Private Gallery Delivery and Retention/)
    })

    it('the §30 states list ends expired, archived, purged according to policy at the cited lines', () => {
      expect(section).toContain('`PRD.md:1467-1476`')
      expect(lineAt('scrum-master/PRD.md', 1474)).toMatch(/expired/)
      expect(lineAt('scrum-master/PRD.md', 1475)).toMatch(/archived/)
      expect(lineAt('scrum-master/PRD.md', 1476)).toMatch(/purged according to policy/)
    })

    it('the §30 Security requirements list at the cited lines names expiring access as a peer of optional password', () => {
      expect(section).toContain('`PRD.md:1478-1489`')
      expect(section).toContain('`PRD.md:1483`')
      expect(lineAt('scrum-master/PRD.md', 1483)).toMatch(/optional password/)
      expect(section).toContain('`PRD.md:1484`')
      expect(lineAt('scrum-master/PRD.md', 1484)).toMatch(/expiring access/)
    })

    // The old, now-archived PRD confined expiry/archiving to two tight
    // line ranges (a premise the restored, much longer PRD does not
    // share — it discusses expiry pervasively across roughly a dozen
    // additional, lighter mentions). Rather than force an artificial
    // "only in N places" narrowness onto a document that doesn't have
    // it, this asserts the specific citations the audit actually relies
    // on are genuine hits within the real document, without claiming
    // exhaustiveness.
    it('every PRD.md line the audit cites as an expiry/archiving reference is a real expir/archiv hit', () => {
      const hits = new Set(
        prd
          .split('\n')
          .map((line, i) => ({ line: i + 1, text: line }))
          .filter((l) => /expir|archiv/i.test(l.text))
          .map((l) => l.line),
      )
      // Only lines whose own text is an expiry/archiving reference — some
      // cited lines (e.g. `gallery released`, `optional password`) are
      // cited for sequential/peer context around an expiry citation, not
      // because the line itself contains the keyword.
      const citedLines = [205, 1037, 1474, 1475, 1484]
      for (const n of citedLines) {
        expect(hits.has(n)).toBe(true)
      }
    })

    it('PRD.md mentions expiry/archiving pervasively, not just at the audit\'s citations', () => {
      const hits = prd
        .split('\n')
        .map((line, i) => ({ line: i + 1, text: line }))
        .filter((l) => /expir|archiv/i.test(l.text))
      expect(hits.length).toBeGreaterThan(10)
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
    it('states a Gallery-level expiry control matches the PRD\'s expiring access', () => {
      expect(flat).toMatch(/expiring access/i)
      expect(flat).toMatch(/events\.expires_at/)
    })

    it('states the automatic archive matches the PRD\'s gallery expired/archived milestone', () => {
      expect(flat).toMatch(/gallery expired\/archived/i)
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

    // Per CLAUDE.md, git is a host-only tool and is never installed inside
    // the `web` container image (node:20-alpine, no git in the Dockerfile).
    // When this suite runs there via `docker compose run --rm web`, the
    // git-clean check below can't run at all — not a PATH issue, the
    // binary genuinely isn't present. Skip gracefully in that case rather
    // than failing the suite; on the host (where git is installed) the
    // check still runs and enforces the no-local-modifications guarantee.
    const hasGit = (() => {
      try {
        execSync('git --version', { stdio: 'ignore' })
        return true
      } catch {
        return false
      }
    })()

    ;(hasGit ? it : it.skip)('the vendored fork has no local modifications (git-clean)', () => {
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
