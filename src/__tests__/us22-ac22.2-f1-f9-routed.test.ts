/**
 * ---
 * file: src/__tests__/us22-ac22.2-f1-f9-routed.test.ts
 * project: earthandhoney
 * purpose: Verify AC-22.2 — the nine upstream findings F1–F9 recorded in
 *          PIVOT_AUDIT.md (AC-17.9's consolidated finding register) are
 *          finalized as routable Product Owner findings: each carries its
 *          finding id, a one-line statement, the PRD section it
 *          contradicts, and a proposed disposition (accept as-is / schedule
 *          fork work / raise upstream). scrum-master/po-requests.md is
 *          outside this AC's write scope (per AC-14.6/AC-17.9's own
 *          precedent), so the routable content lives in PIVOT_AUDIT.md and
 *          this test checks it there, not in po-requests.md.
 * created-by: dev-team
 * related-story: US-22
 * related-ac: 22.2
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const pivotAudit = fs.readFileSync(path.join(root, 'PIVOT_AUDIT.md'), 'utf8')

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
    .filter((cells) => cells[0] !== 'Finding')
}

describe('AC-22.2: F1–F9 finalized and routed for the Product Owner', () => {
  const sectionIdx = pivotAudit.indexOf(
    '## AC-22.2 — F1–F9 finalized for routing to the Product Owner',
  )
  const nextSectionIdx = pivotAudit.indexOf('\n## ', sectionIdx + 1)
  const section = pivotAudit.slice(
    sectionIdx,
    nextSectionIdx === -1 ? undefined : nextSectionIdx,
  )

  it('the AC-22.2 routing section exists in PIVOT_AUDIT.md', () => {
    expect(sectionIdx).toBeGreaterThan(-1)
  })

  it('explains why po-requests.md is not edited directly, citing the AC-14.6/AC-17.9 precedent', () => {
    expect(section).toMatch(/outside an implementing AC's write\s+scope/)
    expect(section).toMatch(/AC-14\.6/)
    expect(section).toMatch(/AC-17\.9/)
  })

  const registerIdx = section.indexOf('### F1–F9, routed with PRD section and proposed disposition')
  const register = section.slice(registerIdx)
  const rows = tableRows(register)

  it('has a routable row for every finding F1 through F9', () => {
    const ids = rows.map((cells) => cells[0])
    for (let n = 1; n <= 9; n++) {
      expect(ids).toContain(`**F${n}**`)
    }
    expect(rows).toHaveLength(9)
  })

  it('every row has a non-empty one-line statement, PRD section, and disposition', () => {
    for (const cells of rows) {
      const [, statement, prdSection, disposition] = cells
      expect(statement.length).toBeGreaterThan(10)
      expect(prdSection.length).toBeGreaterThan(0)
      expect(disposition.length).toBeGreaterThan(0)
    }
  })

  it('every disposition is one of the three allowed categories', () => {
    const allowed = /Accept as-is|Schedule fork work|Raise upstream/
    for (const cells of rows) {
      expect(cells[3]).toMatch(allowed)
    }
  })

  it('every row cites a PRD section number (§ notation)', () => {
    for (const cells of rows) {
      expect(cells[2]).toMatch(/§\d+(\.\d+)?/)
    }
  })

  const dispositionById = Object.fromEntries(
    rows.map((cells) => [cells[0].replace(/\*\*/g, ''), cells[3]]),
  )

  it('F1–F5 are dispositioned accept as-is (real assumption gaps, not fork defects)', () => {
    for (const id of ['F1', 'F2', 'F3', 'F4', 'F5']) {
      expect(dispositionById[id]).toMatch(/Accept as-is/)
    }
  })

  it('F6, F7 and F9 are dispositioned as fork work to schedule', () => {
    for (const id of ['F6', 'F7', 'F9']) {
      expect(dispositionById[id]).toMatch(/Schedule fork work/)
    }
  })

  it('F8 is dispositioned raise upstream, pointing at the existing UD-1 tracking', () => {
    expect(dispositionById['F8']).toMatch(/Raise upstream/)
    expect(dispositionById['F8']).toMatch(/UD-1/)
    expect(dispositionById['F8']).toMatch(/po-requests\.md.*item 16/)
  })

  it('F1 cites the Project→Client→Gallery PRD chain and prefill sections', () => {
    const f1 = rows.find((cells) => cells[0] === '**F1**') as string[]
    expect(f1[2]).toMatch(/§6\.2/)
    expect(f1[2]).toMatch(/§17\.3/)
  })

  it('F4 and F9 cite the specific PRD lines they contradict', () => {
    const f4 = rows.find((cells) => cells[0] === '**F4**') as string[]
    expect(f4[2]).toMatch(/aspect ratio/i)
    const f9 = rows.find((cells) => cells[0] === '**F9**') as string[]
    expect(f9[2]).toMatch(/§28\.1/)
  })
})
