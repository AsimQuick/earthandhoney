/**
 * ---
 * file: src/__tests__/us17-ac17.4.1.1.1.1.3-candidate-shortlist-reconciled.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.4.1.1.1.1.3 — every name in the
 *          AC-17.4.1.1.1.1.1.3 merged inventory that AC-17.4.1.1.1.1.2 did
 *          not rule out is recorded in PIVOT_AUDIT.md as a candidate for
 *          the Gallery's own expiry, each with a one-line reason and at
 *          least one file:line against the pinned commit; the audit then
 *          reconciles the candidate list against the ruled-out groups so
 *          every one of the 35 merged-inventory entries appears exactly
 *          once, either as a candidate or inside a ruled-out group, with
 *          nothing left unresolved. This suite confirms: the section
 *          exists in the right place, the 14-entry candidate shortlist is
 *          stated with reasons and evidence, the reconciliation accounts
 *          for all 35 entries exactly once, and every cited file:line
 *          genuinely exists in the vendored fork and contains the name it
 *          is cited for.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.4.1.1.1.1.3
 * ---
 */

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('PIVOT_AUDIT.md')

const PINNED_COMMIT = 'eb263137b98935754155824de2a03848121304b6'

const sectionStart = doc.indexOf('## AC-17.4.1.1.1.1.3 ')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1 ? '' : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

// Whitespace-collapsed, for asserting on prose the document hard-wraps.
const flat = section.replace(/\s+/g, ' ')

// The 35 merged-inventory entry keys AC-17.4.1.1.1.1.1.3 recorded.
const ALL_ENTRIES = Array.from({ length: 35 }, (_, i) => `E${i + 1}`)

// The 14 entries this AC records as candidates for the Gallery's own
// expiry — identical to AC-17.4.1.1.1.1.2's "stays aside" set.
const CANDIDATES = ['E1', 'E4', 'E5', 'E6', 'E7', 'E10', 'E11', 'E12', 'E13', 'E16', 'E30', 'E31', 'E32', 'E33']
const RULED_OUT = ALL_ENTRIES.filter((e) => !CANDIDATES.includes(e))

describe('AC-17.4.1.1.1.1.3: candidate shortlist, reconciled against the full inventory', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.4.1.1.1.1.3 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.4\.1\.1\.1\.1\.3\b/)
    })

    it('has a dedicated AC-17.4.1.1.1.1.3 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits after the AC-17.4.1.1.1.1.2 section whose ruled-out groups it reconciles against', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.4.1.1.1.1.2'))
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('states this is code-level only, no live gallery created or changed', () => {
      expect(flat).toMatch(/no live gallery was created or changed/)
    })

    it('states the same pinned commit as the rest of this AC-17.4 chain', () => {
      expect(section).toMatch(new RegExp(PINNED_COMMIT))
    })

    it('states it works from the AC-17.4.1.1.1.1.1.3 merged inventory and AC-17.4.1.1.1.1.2 ruled-out groups', () => {
      expect(flat).toMatch(/AC-17\.4\.1\.1\.1\.1\.1\.3 merged inventory/)
      expect(flat).toMatch(/AC-17\.4\.1\.1\.1\.1\.2/)
    })

    it('states this shortlist is what AC-17.4.1.1.1.2 confirms from code', () => {
      expect(flat).toMatch(/AC-17\.4\.1\.1\.1\.2 confirms from code/)
    })
  })

  describe('the candidate shortlist: 14 entries, each with a reason and evidence', () => {
    it('has a dedicated candidate-shortlist table', () => {
      expect(section).toContain('### The candidate shortlist: 14 entries AC-17.4.1.1.1.1.2 did not rule out')
    })

    it.each(CANDIDATES)('candidate entry %s is mentioned in this section', (entry) => {
      expect(new RegExp(`\\b${entry}\\b`).test(section)).toBe(true)
    })

    it('states the shortlist size of 14 entries', () => {
      expect(flat).toMatch(/14 entries/)
    })

    it('notes E1 is a candidate only for its events occurrence, not its other nine occurrences', () => {
      expect(flat).toMatch(/only for its `events` occurrence|only for its events occurrence/)
      expect(flat).toMatch(/nine other occurrences/)
    })
  })

  describe('reconciliation: every one of the 35 merged-inventory entries is placed exactly once', () => {
    it('has a dedicated reconciliation table', () => {
      expect(section).toContain('### Reconciling the candidate list against the ruled-out groups')
    })

    it.each(ALL_ENTRIES)('%s appears in the reconciliation table', (entry) => {
      const tableStart = section.indexOf('### Reconciling the candidate list against the ruled-out groups')
      const tableEnd = section.indexOf('### Unresolved entries', tableStart)
      expect(tableStart).toBeGreaterThan(-1)
      const table = section.slice(tableStart, tableEnd)
      expect(new RegExp(`^\\| ${entry} \\|`, 'm').test(table)).toBe(true)
    })

    it.each(CANDIDATES.filter((e) => e !== 'E1'))('candidate entry %s is marked Candidate in the reconciliation table', (entry) => {
      const tableStart = section.indexOf('### Reconciling the candidate list against the ruled-out groups')
      const tableEnd = section.indexOf('### Unresolved entries', tableStart)
      const table = section.slice(tableStart, tableEnd)
      const row = table.split('\n').find((l) => new RegExp(`^\\| ${entry} \\|`).test(l))
      expect(row).toBeDefined()
      expect(row).toMatch(/\*\*Candidate\.\*\*/)
    })

    it('E1 is marked as a Split row naming both its candidate and ruled-out occurrences', () => {
      const tableStart = section.indexOf('### Reconciling the candidate list against the ruled-out groups')
      const tableEnd = section.indexOf('### Unresolved entries', tableStart)
      const table = section.slice(tableStart, tableEnd)
      const row = table.split('\n').find((l) => /^\| E1 \|/.test(l))
      expect(row).toBeDefined()
      expect(row).toMatch(/\*\*Split\*\*/)
      expect(row).toMatch(/candidate/)
      expect(row).toMatch(/ruled out/)
    })

    it.each(RULED_OUT)('ruled-out entry %s is marked Ruled out in the reconciliation table', (entry) => {
      const tableStart = section.indexOf('### Reconciling the candidate list against the ruled-out groups')
      const tableEnd = section.indexOf('### Unresolved entries', tableStart)
      const table = section.slice(tableStart, tableEnd)
      const row = table.split('\n').find((l) => new RegExp(`^\\| ${entry} \\|`).test(l))
      expect(row).toBeDefined()
      expect(row).toMatch(/Ruled out/)
    })

    it('states the 14 + 21 = 35 accounting', () => {
      expect(flat).toMatch(/14 \+ 21 = 35/)
    })

    it('has an "Unresolved entries: none" section', () => {
      expect(section).toContain('### Unresolved entries: none')
    })

    it('states nothing is left unresolved', () => {
      expect(flat).toMatch(/nothing to list as unresolved/)
    })
  })

  describe('every file:line citation in the candidate table is genuine', () => {
    function extractCitations(): Array<{ file: string; lines: number[]; context: string }> {
      const citations: Array<{ file: string; lines: number[]; context: string }> = []
      const tableStart = section.indexOf('### The candidate shortlist')
      const tableEnd = section.indexOf('### Reconciling', tableStart)
      const table = section.slice(tableStart, tableEnd)
      for (const line of table.split('\n')) {
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

    it('cites at least one file:line per candidate entry (at least 14 distinct citations)', () => {
      expect(citations.length).toBeGreaterThanOrEqual(14)
    })

    it('every cited file exists in the vendored fork', () => {
      for (const { file } of citations) {
        expect(fs.existsSync(path.join(root, file))).toBe(true)
      }
    })

    it("every cited line number is within the cited file's bounds", () => {
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
      expect(checked).toBeGreaterThanOrEqual(14)
    })
  })

  it('closes the AC with an explicit verdict naming the pin and the 14-entry shortlist', () => {
    expect(section).toMatch(/AC-17\.4\.1\.1\.1\.1\.3 is satisfied/)
    expect(section).toMatch(new RegExp(PINNED_COMMIT))
    expect(flat).toMatch(/no entry is left unresolved/)
  })

  describe("the section does not corrupt other criteria's document-wide scans", () => {
    it('no table row in this section leads with a bare number', () => {
      // AC-14.1 asserts every `| <n> | ...` row in PIVOT_AUDIT.md is an
      // inventory row carrying one of its four classifications.
      expect(section.match(/^\|\s*\d+\s*\|/gm)).toBeNull()
    })
  })
})
