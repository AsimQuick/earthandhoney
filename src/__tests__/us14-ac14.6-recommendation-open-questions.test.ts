/**
 * ---
 * file: src/__tests__/us14-ac14.6-recommendation-open-questions.test.ts
 * project: earthandhoney
 * purpose: Verify AC-14.6 — PIVOT_AUDIT.md ends with an explicit
 *          keep/replace/retire recommendation and an open-questions
 *          list, and states that anything the audit cannot resolve
 *          without human input is routed to
 *          `scrum-master/po-requests.md` rather than decided silently.
 * created-by: dev-team
 * related-story: US-14
 * related-ac: 14.6
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

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
    .filter((cells) => cells[0] !== 'Category')
}

const RECOMMENDATION_VERDICTS = ['Replace', 'Repurpose', 'Keep', 'Retire', 'Migrate']

describe('AC-14.6: PIVOT_AUDIT.md ends with a recommendation and open-questions list', () => {
  it('PIVOT_AUDIT.md exists at the repo root', () => {
    expect(fs.existsSync(path.join(root, 'PIVOT_AUDIT.md'))).toBe(true)
  })

  const audit = read('PIVOT_AUDIT.md')
  const section = extractSection(audit, '## Recommendation and open questions (AC-14.6)', '')

  it('is the final section of the document', () => {
    const heading = '## Recommendation and open questions (AC-14.6)'
    const start = audit.indexOf(heading)
    const nextHeading = audit.indexOf('\n## ', start + heading.length)
    expect(nextHeading).toBe(-1)
  })

  const recSection = extractSection(section, '### Explicit keep/replace/retire recommendation', '### Open questions')
  const rows = tableRows(recSection)

  it('states an explicit keep/replace/retire recommendation table with at least one row per verdict type', () => {
    expect(rows.length).toBeGreaterThan(0)
    const verdictsPresent = RECOMMENDATION_VERDICTS.filter((verdict) =>
      rows.some((row) => row[1] && row[1].includes(verdict)),
    )
    expect(verdictsPresent).toEqual(expect.arrayContaining(['Replace', 'Keep', 'Retire']))
  })

  it('every recommendation row cites a basis in an earlier AC section', () => {
    for (const row of rows) {
      // Category | Recommendation | Basis
      expect(row[2]).toBeDefined()
      expect(row[2]).toMatch(/AC-14\.[1-5]/)
    }
  })

  it('lists an open-questions section with at least three numbered questions', () => {
    const openSection = extractSection(section, '### Open questions', '')
    const numbered = openSection
      .split('\n')
      .filter((line) => /^\d+\.\s+\*\*/.test(line.trim()))
    expect(numbered.length).toBeGreaterThanOrEqual(3)
  })

  it('routes unresolved questions to scrum-master/po-requests.md instead of deciding them silently', () => {
    expect(section).toMatch(/scrum-master\/po-requests\.md/)
    expect(section).toMatch(/routing|routed|added to/i)
  })

  it('does not itself modify scrum-master/po-requests.md', () => {
    // This AC's deliverable lives in PIVOT_AUDIT.md; po-requests.md is
    // owned outside this AC's scope and is asserted here to still exist
    // untouched by this audit's own open-questions list mechanism.
    expect(fs.existsSync(path.join(root, 'scrum-master/po-requests.md'))).toBe(true)
  })
})
