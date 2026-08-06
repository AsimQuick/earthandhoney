/**
 * ---
 * file: src/__tests__/us21-ac21.6-pivot-direction-guard.test.ts
 * project: earthandhoney
 * purpose: Verify AC-21.6 — a Jest guard test that fails if any of the
 *          documents restored under US-21 (PRD.md, CLAUDE.md,
 *          scrum-master.md, SYSTEM_OWNERSHIP.md) silently loses its
 *          pivot direction again. This is the enforcement Reminder 16
 *          asks for after the direction change was lost twice: once to
 *          a branch switch on 2026-07-30, and again by never reaching
 *          `main`. Unlike the per-AC restore tests (AC-21.1..21.5),
 *          this suite is a standing regression guard, not a one-time
 *          restore check.
 * created-by: dev-team
 * related-story: US-21
 * related-ac: 21.6
 * ---
 */

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const prd = read('scrum-master/PRD.md')
const claudeMd = read('CLAUDE.md')
const scrumMaster = read('scrum-master/scrum-master.md')
const systemOwnership = read('SYSTEM_OWNERSHIP.md')

/**
 * A retired string is tolerated only on a "Retired"/"retired" line: either
 * the line itself says so inline (e.g. "(Better Auth is retired)"), or the
 * line falls under a Markdown heading whose text contains "Retired"/
 * "retired" (e.g. a bullet under "## Retired From the Old Direction").
 * Any other occurrence means the retired system has crept back in as if it
 * were still authoritative.
 */
function retiredStringOnlyOnRetiredLines(content: string, needle: string): boolean {
  const lines = content.split('\n')
  let underRetiredHeading = false
  const offendingLines: string[] = []

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s/)
    if (headingMatch) {
      underRetiredHeading = /retired/i.test(line)
    }

    if (line.includes(needle) && !/retired/i.test(line) && !underRetiredHeading) {
      offendingLines.push(line)
    }
  }

  return offendingLines.length === 0
}

describe('AC-21.6: pivot-direction guard — scrum-master/PRD.md', () => {
  it('contains "Headless Invoice Ninja"', () => {
    expect(prd).toContain('Headless Invoice Ninja')
  })

  it('contains "Product Owner Pivot Plan"', () => {
    expect(prd).toContain('Product Owner Pivot Plan')
  })
})

describe('AC-21.6: pivot-direction guard — CLAUDE.md', () => {
  it('contains "The Three Surfaces"', () => {
    expect(claudeMd).toContain('The Three Surfaces')
  })

  it('contains "The Ledger Rule"', () => {
    expect(claudeMd).toContain('The Ledger Rule')
  })

  it("contains \"Fork, don't rebuild\"", () => {
    expect(claudeMd).toContain("Fork, don't rebuild")
  })

  it('does not contain "Better Auth" outside a Retired/retired line', () => {
    expect(retiredStringOnlyOnRetiredLines(claudeMd, 'Better Auth')).toBe(true)
  })

  it('does not contain "Resend" outside a Retired/retired line', () => {
    expect(retiredStringOnlyOnRetiredLines(claudeMd, 'Resend')).toBe(true)
  })

  it('does not contain "Adobe Acrobat Sign" outside a Retired/retired line', () => {
    expect(retiredStringOnlyOnRetiredLines(claudeMd, 'Adobe Acrobat Sign')).toBe(true)
  })
})

describe('AC-21.6: pivot-direction guard — scrum-master/scrum-master.md', () => {
  it('contains "Product Backlog (post-pivot)"', () => {
    expect(scrumMaster).toContain('Product Backlog (post-pivot)')
  })
})

describe('AC-21.6: pivot-direction guard — SYSTEM_OWNERSHIP.md', () => {
  function ownershipRowFor(label: string): string {
    const line = systemOwnership
      .split('\n')
      .find((l) => l.trim().startsWith('|') && l.includes(label))
    if (!line) {
      throw new Error(`No SYSTEM_OWNERSHIP.md row found for "${label}"`)
    }
    return line
  }

  it('the Auth row does not name Better Auth as the authoritative system', () => {
    const row = ownershipRowFor('Auth —')
    const authoritativeCell = row.split('|')[2] ?? ''
    expect(authoritativeCell).not.toMatch(/^Better Auth/)
    expect(authoritativeCell).toContain('PicPeak')
  })

  it('the Email row does not name Resend as the authoritative system', () => {
    const row = ownershipRowFor('Email —')
    const authoritativeCell = row.split('|')[2] ?? ''
    expect(authoritativeCell).not.toMatch(/^Resend/)
    expect(authoritativeCell).toContain('PicPeak')
  })
})
