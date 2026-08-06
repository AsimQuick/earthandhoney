/**
 * ---
 * file: src/__tests__/us14-ac14.3-duplicate-ownership.test.ts
 * project: earthandhoney
 * purpose: Verify AC-14.3 — PIVOT_AUDIT.md lists every duplicate-feature
 *          risk between the current codebase and PicPeak (two upload
 *          paths, two media stores, two galleries, two auth systems, two
 *          email senders) and names the single authoritative owner for
 *          each, consistent with the ownership fixed by CLAUDE.md's
 *          Technology Stack section
 * created-by: dev-team
 * related-story: US-14
 * related-ac: 14.3
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const DUPLICATE_RISKS = [
  'Two upload paths',
  'Two media stores',
  'Two galleries',
  'Two auth systems',
  'Two email senders',
]

const VALID_OWNERS = ['PicPeak']

function extractSection(audit: string, heading: string, nextHeading: string): string {
  const start = audit.indexOf(heading)
  expect(start).toBeGreaterThanOrEqual(0)
  const end = nextHeading ? audit.indexOf(nextHeading, start + heading.length) : -1
  return audit.slice(start, end === -1 ? undefined : end)
}

function tableRows(section: string): string[][] {
  return section
    .split('\n')
    .filter((line) => /^\|/.test(line) && !/^\|\s*---/.test(line))
    .map((line) =>
      line
        .split('|')
        .map((c) => c.trim().replace(/\*\*/g, '').replace(/^`|`$/g, ''))
        .filter((c) => c.length > 0),
    )
    .filter((cells) => cells[0] !== '#')
}

describe('AC-14.3: PIVOT_AUDIT.md maps duplicate-feature risks to a single owner', () => {
  it('PIVOT_AUDIT.md exists at the repo root', () => {
    expect(fs.existsSync(path.join(root, 'PIVOT_AUDIT.md'))).toBe(true)
  })

  const audit = read('PIVOT_AUDIT.md')
  const section = extractSection(audit, '## Duplicate-feature risk map (AC-14.3)', '')
  const rows = tableRows(section).filter((cells) => cells.length === 7)

  it.each(DUPLICATE_RISKS)('names the risk: %s', (risk) => {
    expect(section).toContain(risk)
  })

  it('names each of the five duplicate-feature risks exactly once', () => {
    for (const risk of DUPLICATE_RISKS) {
      const occurrences = section.split(risk).length - 1
      expect(occurrences).toBe(1)
    }
  })

  it('has one authoritative-owner table row per duplicate-feature risk', () => {
    const riskRows = rows.filter((cells) => DUPLICATE_RISKS.includes(cells[1]))
    expect(riskRows.length).toBe(DUPLICATE_RISKS.length)
  })

  it('every risk row names a single authoritative owner from the allowed set', () => {
    for (const risk of DUPLICATE_RISKS) {
      const row = rows.find((cells) => cells[1] === risk)
      expect(row).toBeDefined()
      const owner = row![5]
      const matchesOwner = VALID_OWNERS.some((o) => owner.includes(o))
      expect(matchesOwner).toBe(true)
    }
  })

  it('gallery/media/upload risks are owned by PicPeak, consistent with AC-14.1/14.2 classification', () => {
    const galleryRisks = ['Two upload paths', 'Two media stores', 'Two galleries']
    for (const risk of galleryRisks) {
      const row = rows.find((cells) => cells[1] === risk)
      expect(row![5]).toContain('PicPeak')
    }
  })

  it('auth and email risks are owned by the current CLAUDE.md Technology Stack owner', () => {
    const authRow = rows.find((cells) => cells[1] === 'Two auth systems')
    const emailRow = rows.find((cells) => cells[1] === 'Two email senders')
    expect(authRow![5]).toContain('PicPeak')
    expect(emailRow![5]).toContain('PicPeak')
  })

  it('the named owners match the technologies declared in CLAUDE.md Technology Stack', () => {
    const claudeMd = read('CLAUDE.md')
    expect(claudeMd).toMatch(/Auth:\*\*\s*PicPeak authentication and authorization/)
    expect(claudeMd).toMatch(/Email:\*\*\s*SMTP via the PicPeak email queue/)
  })
})
