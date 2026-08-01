/**
 * ---
 * file: src/__tests__/us17-ac17.4.1.1.1.1.2-ruled-out-non-gallery-occurrences.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.4.1.1.1.1.2 — working from the AC-17.4.1.1.1.1.1.3
 *          merged inventory of 35 names, PIVOT_AUDIT.md gathers every
 *          occurrence that does not express a Gallery's own
 *          `events.expires_at` lifetime into named, ruled-out groups, each
 *          with a one-line reason for what the value actually governs and
 *          at least one file:line citation against the pinned commit. The
 *          fork's expiry wording for admin sessions, guest tokens, and
 *          share links must each be named as an explicit ruled-out group.
 *          This suite confirms: the section exists in the right place,
 *          every one of the 35 merged-inventory entries is accounted for
 *          exactly once (staying aside as Gallery-own or ruled out), the
 *          three required groups are present by name, and every cited
 *          file:line genuinely exists in the vendored fork and contains
 *          the name it is cited for.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.4.1.1.1.1.2
 * ---
 */

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('PIVOT_AUDIT.md')

const PINNED_COMMIT = 'eb263137b98935754155824de2a03848121304b6'

const sectionStart = doc.indexOf('## AC-17.4.1.1.1.1.2 ')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1 ? '' : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

// Whitespace-collapsed, for asserting on prose the document hard-wraps.
const flat = section.replace(/\s+/g, ' ')

const REQUIRED_GROUP_HEADINGS = [
  '### Ruled-out group: Admin sessions',
  '### Ruled-out group: Gallery-access and customer-portal session tokens',
  '### Ruled-out group: Guest tokens',
  '### Ruled-out group: Share links',
  '### Ruled-out group: Internal cache and housekeeping constants',
  '### Ruled-out group: Session-token revocation bookkeeping',
  '### Ruled-out group: Business-document validity and status (quotes & contracts)',
  '### Ruled-out group: HTTP cache-control header',
]

// The 35 merged-inventory entry keys AC-17.4.1.1.1.1.1.3 recorded.
const ALL_ENTRIES = Array.from({ length: 35 }, (_, i) => `E${i + 1}`)

// The 14 entries this AC stays aside from (they express the Gallery's own
// events.expires_at lifecycle) — the rest must be ruled out.
const KEPT_ASIDE = ['E1', 'E4', 'E5', 'E6', 'E7', 'E10', 'E11', 'E12', 'E13', 'E16', 'E30', 'E31', 'E32', 'E33']
const RULED_OUT = ALL_ENTRIES.filter((e) => !KEPT_ASIDE.includes(e))

// Every entry key named in the leading cell of a ruled-out group's table
// rows. A single occurrence can be shared by several entry keys, in which
// case the cell lists them comma-separated (e.g. `| E15, E17 |`), so the
// cell is read as a list rather than as one key.
function ruledOutRowEntries(): string[] {
  const ruledOutGroupsText = section.slice(section.indexOf('### Ruled-out group: Admin sessions'))
  const entries = new Set<string>()
  for (const row of ruledOutGroupsText.matchAll(/^\|([^|]*)\|/gm)) {
    for (const key of row[1].matchAll(/\bE\d+\b/g)) entries.add(key[0])
  }
  return [...entries]
}

describe('AC-17.4.1.1.1.1.2: ruling out occurrences that are not about a Gallery\'s own expiry', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.4.1.1.1.1.2 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.4\.1\.1\.1\.1\.2\b/)
    })

    it('has a dedicated AC-17.4.1.1.1.1.2 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits after the AC-17.4.1.1.1.1.1.3 section whose merged inventory it works from', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.4.1.1.1.1.1.3'))
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('states this is code-level only, no live Backstage instance used', () => {
      expect(flat).toMatch(/no live Backstage instance was started or used/)
    })

    it('states the same pinned commit as the rest of this AC-17.4 chain', () => {
      expect(section).toMatch(new RegExp(PINNED_COMMIT))
    })

    it('states a name is ruled out only on the evidence cited, never because it looked unpromising', () => {
      expect(flat).toMatch(/ruled out only on the evidence cited/)
      expect(flat).toMatch(/never because it looked unpromising/)
    })

    it('states it works from the AC-17.4.1.1.1.1.1.3 merged inventory', () => {
      expect(flat).toMatch(/AC-17\.4\.1\.1\.1\.1\.1\.3 merged inventory/)
    })
  })

  describe('the three explicitly required groups are named', () => {
    it('names "admin sessions" as a ruled-out group', () => {
      expect(section).toContain('### Ruled-out group: Admin sessions')
    })

    it('names "guest tokens" as a ruled-out group', () => {
      expect(section).toContain('### Ruled-out group: Guest tokens')
    })

    it('names "share links" as a ruled-out group', () => {
      expect(section).toContain('### Ruled-out group: Share links')
    })

    it.each(REQUIRED_GROUP_HEADINGS)('has the group heading %s', (heading) => {
      expect(section).toContain(heading)
    })

    it('every ruled-out group states what the value actually governs', () => {
      const governsCount = (section.match(/\*\*Governs:\*\*/g) ?? []).length
      // One "Governs:" statement per ruled-out group heading.
      expect(governsCount).toBe(REQUIRED_GROUP_HEADINGS.length)
    })
  })

  describe('coverage: every one of the 35 merged-inventory entries is accounted for', () => {
    it.each(ALL_ENTRIES)('%s is mentioned somewhere in this AC\'s section', (entry) => {
      const re = new RegExp(`\\b${entry}\\b`)
      expect(re.test(section)).toBe(true)
    })

    it('the 14 Gallery-own entries are recorded as staying aside, not ruled out', () => {
      const keptTableStart = section.indexOf('### Occurrences that stay aside')
      const keptTableEnd = section.indexOf('### Ruled-out group', keptTableStart)
      expect(keptTableStart).toBeGreaterThan(-1)
      const keptSection = section.slice(keptTableStart, keptTableEnd)
      for (const entry of KEPT_ASIDE) {
        expect(new RegExp(`\\b${entry}\\b`).test(keptSection)).toBe(true)
      }
    })

    it('none of the kept-aside entries is also listed as its own row in a ruled-out group table with no distinguishing occurrence note', () => {
      // E1 legitimately reappears in ruled-out tables (it has both a kept
      // events occurrence and several ruled-out occurrences), so this only
      // checks the entries that have no split occurrences.
      const singleOccurrenceKept = KEPT_ASIDE.filter((e) => e !== 'E1')
      const ruledOut = ruledOutRowEntries()
      for (const entry of singleOccurrenceKept) {
        expect(ruledOut).not.toContain(entry)
      }
    })

    it.each(RULED_OUT)('ruled-out entry %s appears in at least one ruled-out group table', (entry) => {
      // A row's leading cell may list several entries that share one
      // occurrence (e.g. `| E15, E17 |`), so read the cell as a list rather
      // than requiring the entry to come first.
      expect(ruledOutRowEntries()).toContain(entry)
    })

    it('states the coverage split of 14 kept-aside vs. 21 ruled-out entries', () => {
      expect(flat).toMatch(/14 entries/)
      expect(flat).toMatch(/21 entries/)
    })
  })

  describe('every file:line citation in this section is genuine', () => {
    // Every `vendor/...:line[,line...]` citation anywhere in the section,
    // paired with the nearest preceding backtick-quoted name(s) on the same
    // line or table cell, so each citation can be checked against real file
    // content rather than merely checked for existence.
    function extractCitations(): Array<{ file: string; lines: number[]; context: string }> {
      const citations: Array<{ file: string; lines: number[]; context: string }> = []
      for (const line of section.split('\n')) {
        const matches = [...line.matchAll(/`(vendor\/[^`:]+):([\d,\-]+)`/g)]
        for (const m of matches) {
          const file = m[1]
          const lineNos: number[] = []
          for (const part of m[2].split(',')) {
            if (part.includes('-')) {
              const [a, b] = part.split('-').map(Number)
              for (let n = a; n <= b; n++) lineNos.push(n)
            } else {
              lineNos.push(Number(part))
            }
          }
          citations.push({ file, lines: lineNos, context: line })
        }
      }
      return citations
    }

    const citations = extractCitations()

    it('cites at least one file:line per ruled-out group (at least 8 distinct citations)', () => {
      expect(citations.length).toBeGreaterThanOrEqual(8)
    })

    it('every cited file exists in the vendored fork', () => {
      for (const { file } of citations) {
        expect(fs.existsSync(path.join(root, file))).toBe(true)
      }
    })

    it('every cited line number is within the cited file\'s bounds', () => {
      for (const { file, lines } of citations) {
        const total = read(file).split('\n').length
        for (const n of lines) {
          expect(n).toBeGreaterThan(0)
          expect(n).toBeLessThanOrEqual(total)
        }
      }
    })

    it('every cited file:line pair, read back from the vendored fork, contains a backtick-quoted name from the same table row', () => {
      let checked = 0
      for (const { file, lines, context } of citations) {
        const names = [...context.matchAll(/`([A-Za-z0-9_.\/]+)`/g)]
          .map((m) => m[1])
          .filter((n) => !n.startsWith('vendor/'))
        if (names.length === 0) continue

        const fileLines = read(file).split('\n')
        for (const n of lines) {
          checked++
          const content = fileLines[n - 1] ?? ''
          const matched = names.some((nm) => content.includes(nm))
          expect([`${file}:${n} expecting one of [${names.join(', ')}]`, matched]).toEqual([
            `${file}:${n} expecting one of [${names.join(', ')}]`,
            true,
          ])
        }
      }
      expect(checked).toBeGreaterThanOrEqual(20)
    })
  })

  describe('specific factual claims this section makes are independently verifiable', () => {
    it('the events table itself carries no share_token-specific expiry column', () => {
      const dbJs = read('vendor/picpeak/backend/src/database/db.js')
      // share_token is added/backfilled with no accompanying expires_at-like
      // column declared alongside it anywhere in the same file.
      expect(dbJs).toMatch(/share_token/)
      expect(dbJs).not.toMatch(/share_token_expires_at/)
    })

    it('the share-link mismatch branch in auth.js is a string comparison, not a time comparison', () => {
      const authJs = read('vendor/picpeak/backend/src/routes/auth.js')
      const idx = authJs.indexOf('Invalid or expired share link')
      expect(idx).toBeGreaterThan(-1)
      const before = authJs.slice(Math.max(0, idx - 200), idx)
      expect(before).toMatch(/token !== expectedToken/)
      expect(before).not.toMatch(/new Date\(/)
    })

    it('publicTokenGuards.js is the shared guard for quote_action_tokens and contract_action_tokens links only', () => {
      const guards = read('vendor/picpeak/backend/src/utils/publicTokenGuards.js')
      expect(guards).toMatch(/'contract_action_tokens' \| 'quote_action_tokens'/)
      expect(guards).toMatch(/This link has expired/)
    })

    it('quoteService.js sets the "expired" quote status off valid_until, tying E3 and E34 to the same business-document concern', () => {
      const quoteService = read('vendor/picpeak/backend/src/services/quoteService.js')
      expect(quoteService).toMatch(/expired\s+valid_until passed without a response/)
    })

    it('GALLERY_TOKEN_TTL_SECONDS is a session-token constant, not a column read from or written to events', () => {
      const customerRoute = read('vendor/picpeak/backend/src/routes/customer.js')
      expect(customerRoute).toMatch(/const GALLERY_TOKEN_TTL_SECONDS = 24 \* 60 \* 60;/)
      expect(customerRoute).toMatch(/expiresIn: GALLERY_TOKEN_TTL_SECONDS/)
    })
  })

  it('closes the AC with an explicit verdict naming the pin and all eight ruled-out groups', () => {
    expect(section).toMatch(/AC-17\.4\.1\.1\.1\.1\.2 is satisfied/)
    expect(section).toMatch(new RegExp(PINNED_COMMIT))
    for (const heading of [
      'Admin sessions',
      'Gallery-access and customer-portal session tokens',
      'Guest tokens',
      'Share links',
      'Internal cache and housekeeping constants',
      'Session-token revocation bookkeeping',
      'Business-document validity and status',
      'HTTP cache-control header',
    ]) {
      expect(flat).toContain(heading)
    }
  })

  describe('the section does not corrupt other criteria\'s document-wide scans', () => {
    it('no table row in this section leads with a bare number', () => {
      // AC-14.1 asserts every `| <n> | ...` row in PIVOT_AUDIT.md is an
      // inventory row carrying one of its four classifications.
      expect(section.match(/^\|\s*\d+\s*\|/gm)).toBeNull()
    })
  })
})
