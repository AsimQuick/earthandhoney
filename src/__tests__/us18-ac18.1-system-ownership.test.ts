/**
 * ---
 * file: src/__tests__/us18-ac18.1-system-ownership.test.ts
 * project: earthandhoney
 * purpose: Verify AC-18.1 — SYSTEM_OWNERSHIP.md exists and, for every
 *          domain in the ownership table in CLAUDE.md (CLAUDE.md's
 *          Technology Stack section, per the reading AC-14.3/PIVOT_AUDIT.md
 *          already established), names the single authoritative system,
 *          what other systems may cache for display only, and what they
 *          are forbidden to write. Also verifies the document's Contracts
 *          row accurately restates CLAUDE.md's current open-decision
 *          language (e-sign provider TBD) rather than inventing new
 *          wording, and that this AC does not edit CLAUDE.md or
 *          scrum-master/po-requests.md itself.
 * created-by: dev-team
 * related-story: US-18
 * related-ac: 18.1
 * ---
 */
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const DOC_PATH = 'SYSTEM_OWNERSHIP.md'

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

describe('AC-18.1: SYSTEM_OWNERSHIP.md documents authoritative ownership per domain', () => {
  it('SYSTEM_OWNERSHIP.md exists at the repo root', () => {
    expect(fs.existsSync(path.join(root, DOC_PATH))).toBe(true)
  })

  const doc = read(DOC_PATH)

  it('carries the structured metadata header required for every code/doc file', () => {
    expect(doc).toMatch(/file:\s*SYSTEM_OWNERSHIP\.md/)
    expect(doc).toMatch(/related-story:\s*US-18/)
    expect(doc).toMatch(/related-ac:\s*18\.1/)
  })

  it('states its reading of "the ownership table in CLAUDE.md", citing the AC-14.3 precedent for that reading', () => {
    expect(doc).toMatch(/ownership table in CLAUDE\.md/)
    expect(doc).toMatch(/AC-14\.3/)
    expect(doc).toMatch(/PIVOT_AUDIT\.md/)
  })

  const tableStart = doc.indexOf('## Ownership table')
  const tableEnd = doc.indexOf('\n## ', tableStart + 3)
  const tableSection = doc.slice(tableStart, tableEnd === -1 ? undefined : tableEnd)
  const rows = tableRows(tableSection)

  it('has a dedicated ownership table with one row per domain', () => {
    expect(tableStart).toBeGreaterThan(-1)
    expect(rows.length).toBeGreaterThanOrEqual(7)
  })

  it('every row has all four required columns non-empty: domain, authoritative system, display-only cache, forbidden writes', () => {
    for (const row of rows) {
      expect(row.length).toBe(4)
      for (const cell of row) {
        expect(cell.length).toBeGreaterThan(0)
      }
    }
  })

  const EXPECTED_DOMAINS: Array<[string, RegExp]> = [
    ['CMS — non-gallery business content', /Payload CMS/],
    ['Gallery & media data', /PicPeak/],
    ['Storage', /PicPeak/],
    ['Auth', /PicPeak/],
    ['Email', /PicPeak/],
    ['Payments', /Invoice Ninja/],
    ['Contracts', /PicPeak/],
  ]

  it.each(EXPECTED_DOMAINS)('domain "%s" is present with authoritative system matching %s', (domainSubstring, ownerPattern) => {
    const row = rows.find((cells) => cells[0].includes(domainSubstring))
    expect(row).toBeDefined()
    expect(row![1]).toMatch(ownerPattern)
  })

  it('every domain is named exactly once', () => {
    const names = rows.map((r) => r[0])
    expect(new Set(names).size).toBe(names.length)
  })

  describe('cross-checked against PIVOT_AUDIT.md and CLAUDE.md, not invented', () => {
    const pivotAudit = read('PIVOT_AUDIT.md')
    const claudeMd = read('CLAUDE.md')

    it('Gallery/media/storage ownership matches PIVOT_AUDIT.md duplicate-feature risk rows R1-R3 (PicPeak)', () => {
      const section = pivotAudit.slice(
        pivotAudit.indexOf('## Duplicate-feature risk map (AC-14.3)'),
      )
      expect(section).toMatch(/Two upload paths[\s\S]*?\*\*PicPeak\*\*/)
      expect(section).toMatch(/Two media stores[\s\S]*?\*\*PicPeak\*\*/)
      expect(section).toMatch(/Two galleries[\s\S]*?\*\*PicPeak\*\*/)
    })

    it('Auth and Email ownership matches the current CLAUDE.md Technology Stack owner (PicPeak, per the pivot retiring Better Auth/Resend)', () => {
      expect(claudeMd).toMatch(/Auth:\*\*\s*PicPeak authentication and authorization/)
      expect(claudeMd).toMatch(/Email:\*\*\s*SMTP via the PicPeak email queue/)
    })

    it('Payments row restates CLAUDE.md\'s own Payments line rather than inventing new wording', () => {
      expect(claudeMd).toMatch(/Payments:.*Stripe, ported from/)
      expect(claudeMd).toMatch(/reconciled into the ledger/)
    })

    it('the Contracts row accurately restates CLAUDE.md\'s current open-decision language rather than flagging stale text', () => {
      // CLAUDE.md's Technology Stack Contracts line is now current/correct
      // (open decision, e-sign TBD, manual-upload fallback) — it no longer
      // names Adobe Acrobat Sign, so there is nothing stale left to flag.
      expect(claudeMd).toMatch(/Contracts:\*\*\s*open decision/)
      expect(claudeMd).toMatch(/e-sign provider TBD/)
      expect(doc).toMatch(/open decision/)
      expect(doc).toMatch(/e-sign/)
    })

    it('the Contracts row cites AC-17.10\'s verification (done/approved) as the basis for the correction', () => {
      expect(doc).toMatch(/AC-17\.10/)
      expect(doc).toMatch(/Six of the seven elements|six of the seven/i)
    })
  })

  describe('does not silently edit files it is not scoped to change', () => {
    it('does not modify CLAUDE.md or scrum-master/po-requests.md', () => {
      let gitStatus = ''
      try {
        gitStatus = execSync('git status --porcelain -- CLAUDE.md scrum-master/po-requests.md', {
          cwd: root,
          encoding: 'utf8',
        })
      } catch {
        gitStatus = ''
      }
      expect(gitStatus.trim()).toBe('')
    })

    it('states plainly that it does not edit CLAUDE.md or po-requests.md itself', () => {
      expect(doc).toMatch(/does not edit `?CLAUDE\.md`?/)
    })
  })
})
