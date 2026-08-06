/**
 * ---
 * file: src/__tests__/us21-ac21.5-system-ownership-correction.test.ts
 * project: earthandhoney
 * purpose: Verify AC-21.5 — SYSTEM_OWNERSHIP.md's ownership table is
 *          corrected against the restored CLAUDE.md. Checks that the four
 *          stale rows (Auth, Email — outbound sending, CMS, Payments) no
 *          longer name retired systems or retired-scope content, that each
 *          corrected row cites the CLAUDE.md line it now matches, and that
 *          a dated restatement note sits at the top of the Ownership table
 *          section naming the stale-source root cause.
 * created-by: dev-team
 * related-story: US-21
 * related-ac: 21.5
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('SYSTEM_OWNERSHIP.md')
const claudeMd = read('CLAUDE.md')

function tableRows(section: string): string[][] {
  return section
    .split('\n')
    .filter((line) => /^\|/.test(line) && !/^\|\s*---/.test(line))
    .map((line) =>
      line
        .split('|')
        .map((c) => c.trim())
        .filter((_, i, arr) => i > 0 && i < arr.length - 1),
    )
    .filter((cells) => cells[0] !== 'Domain')
}

describe('AC-21.5: SYSTEM_OWNERSHIP.md corrected against the restored CLAUDE.md', () => {
  const tableHeadingIdx = doc.indexOf('## Ownership table')
  const notesHeadingIdx = doc.indexOf('\n## Notes and citations per domain')
  const tableSection = doc.slice(tableHeadingIdx, notesHeadingIdx)
  const rows = tableRows(tableSection)

  const findRow = (domainSubstring: string) => {
    const row = rows.find((cells) => cells[0].includes(domainSubstring))
    expect(row).toBeDefined()
    return row as string[]
  }

  describe('dated restatement note at the top of the Ownership table section', () => {
    it('states a date, that these are restatements not new decisions, and cites the approval date 2026-07-30', () => {
      const noteSection = doc.slice(tableHeadingIdx, doc.indexOf('| Domain |'))
      expect(noteSection).toMatch(/Restatement note \(\d{4}-\d{2}-\d{2}\)/)
      expect(noteSection).toMatch(/not new decisions/i)
      expect(noteSection).toMatch(/2026-07-30/)
    })

    it('names the stale-source root cause: written in sprint-3 against a stale pre-pivot CLAUDE.md', () => {
      const noteSection = doc.slice(tableHeadingIdx, doc.indexOf('| Domain |'))
      expect(noteSection).toMatch(/sprint-3/)
      expect(noteSection).toMatch(/stale pre-pivot `?CLAUDE\.md`?/)
    })
  })

  describe('Auth row', () => {
    const row = findRow('Auth')

    it('names PicPeak, not Better Auth, as the authoritative system', () => {
      expect(row[1]).toMatch(/PicPeak/)
      expect(row[1]).not.toMatch(/^Better Auth/)
    })

    it('cites the restored CLAUDE.md line it matches', () => {
      expect(row[1]).toMatch(/CLAUDE\.md:122/)
      expect(claudeMd.split('\n')[121]).toMatch(/Auth:.*PicPeak authentication and authorization/)
    })
  })

  describe('Email — outbound sending row', () => {
    const row = findRow('Email')

    it('names the PicPeak/Backstage email queue, not Resend, as the authoritative system', () => {
      expect(row[1]).toMatch(/PicPeak.*email queue/)
      expect(row[1]).not.toMatch(/^Resend/)
    })

    it('cites the restored CLAUDE.md line it matches', () => {
      expect(row[1]).toMatch(/CLAUDE\.md:123/)
      expect(claudeMd.split('\n')[122]).toMatch(/Email:.*SMTP via the PicPeak email queue/)
    })
  })

  describe('CMS row', () => {
    const row = findRow('CMS')

    it('no longer lists the retired Testimonials/Packages/FAQ scope', () => {
      expect(row[0]).not.toMatch(/Testimonials/)
      expect(row[0]).not.toMatch(/Packages/)
      expect(row[0]).not.toMatch(/FAQ/)
    })

    it('states Testimonials/Packages/FAQ are retired from product scope, not merely non-owned, and cites CLAUDE.md', () => {
      expect(row[3]).toMatch(/retired from product scope/)
      expect(row[3]).toMatch(/CLAUDE\.md:199/)
      expect(claudeMd.split('\n')[198]).toMatch(/Testimonials, Packages, FAQ collections/)
    })

    it('cites the restored CLAUDE.md line for the still-owned CMS content', () => {
      expect(row[1]).toMatch(/CLAUDE\.md:118/)
      expect(claudeMd.split('\n')[117]).toMatch(/CMS:.*Payload CMS/)
    })
  })

  describe('Payments row', () => {
    const row = findRow('Payments')

    it('reflects The Ledger Rule: Invoice Ninja headless/records-only, Stripe alone moves money', () => {
      expect(row[1]).toMatch(/Invoice Ninja/)
      expect(row[1]).toMatch(/headless/)
      expect(row[1]).toMatch(/Stripe/)
    })

    it('states our balances/statuses are display-only caches', () => {
      expect(row[2]).toMatch(/display-only/)
    })

    it('cites the restored CLAUDE.md lines it matches (Technology Stack and The Ledger Rule)', () => {
      expect(row[1]).toMatch(/CLAUDE\.md:125/)
      expect(row[1]).toMatch(/CLAUDE\.md:44-81/)
      expect(claudeMd.split('\n')[124]).toMatch(/Payments:.*Stripe, ported from/)
      expect(claudeMd.split('\n')[43]).toMatch(/## The Ledger Rule/)
    })
  })

  it('every row still has all four required non-empty columns after correction', () => {
    for (const row of rows) {
      expect(row.length).toBe(4)
      for (const cell of row) {
        expect(cell.length).toBeGreaterThan(0)
      }
    }
  })
})
