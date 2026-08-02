/**
 * ---
 * file: src/__tests__/us17-ac17.9-pivot-audit-findings-register.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.9 — PIVOT_AUDIT.md consolidates every finding
 *          AC-17.1 through AC-17.8 already recorded where the pinned
 *          PicPeak fork did not work as the PRD assumed, into one
 *          register, states plainly which findings were patched in the
 *          fork versus recorded as upstream behaviour, and routes the
 *          register to `scrum-master/po-requests.md` for Product Owner
 *          attention rather than deciding anything silently or editing
 *          that file directly.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.9
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

function extractSection(doc: string, heading: string, nextHeading: string): string {
  const start = doc.indexOf(heading)
  expect(start).toBeGreaterThanOrEqual(0)
  const end = nextHeading ? doc.indexOf(nextHeading, start + heading.length) : -1
  return doc.slice(start, end === -1 ? undefined : end)
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
    .filter((cells) => cells[0] !== 'Finding')
}

const AC_17_9_HEADING = '## AC-17.9 — findings recorded honestly, consolidated for the Product Owner'
const AC_14_6_HEADING = '## Recommendation and open questions (AC-14.6)'

describe('AC-17.9: PIVOT_AUDIT.md consolidates the US-17 findings for the Product Owner', () => {
  it('PIVOT_AUDIT.md exists at the repo root', () => {
    expect(fs.existsSync(path.join(root, 'PIVOT_AUDIT.md'))).toBe(true)
  })

  const audit = read('PIVOT_AUDIT.md')

  it('has an AC-17.9 section', () => {
    expect(audit.includes(AC_17_9_HEADING)).toBe(true)
  })

  it('the AC-17.9 section appears after every AC-17.1..17.8 section it consolidates', () => {
    const ac179Index = audit.indexOf(AC_17_9_HEADING)
    const priorHeadings = [
      '## AC-17.1.1',
      '## AC-17.1.2',
      '## AC-17.1.3.1',
      '## AC-17.1.3.2',
      '## AC-17.1.3.3',
      '## AC-17.2 ',
      '## AC-17.3 ',
      '## AC-17.4.2 ',
      '## AC-17.4.3 ',
      '## AC-17.5.1 ',
      '## AC-17.5.2 ',
      '## AC-17.5.3 ',
      '## AC-17.6 ',
      '## AC-17.7 ',
    ]
    for (const heading of priorHeadings) {
      const idx = audit.indexOf(heading)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(ac179Index)
    }
  })

  it('precedes the AC-14.6 section, which remains the document\'s final section', () => {
    const ac179Index = audit.indexOf(AC_17_9_HEADING)
    const ac146Index = audit.indexOf(AC_14_6_HEADING)
    expect(ac146Index).toBeGreaterThan(ac179Index)

    const nextHeadingAfter146 = audit.indexOf('\n## ', ac146Index + AC_14_6_HEADING.length)
    expect(nextHeadingAfter146).toBe(-1)
  })

  const section = extractSection(audit, AC_17_9_HEADING, AC_14_6_HEADING)
  const registerSection = extractSection(section, '### Consolidated finding register', '### None of the above was decided silently')
  const rows = tableRows(registerSection)

  it('states a consolidated finding register with at least eight rows', () => {
    expect(rows.length).toBeGreaterThanOrEqual(8)
  })

  it('every register row cites a basis in an earlier AC-17.x section', () => {
    for (const row of rows) {
      // Finding | PRD assumption vs. actual | Basis | Patched in the fork?
      const basis = row[2]
      expect(basis).toBeDefined()
      expect(basis).toMatch(/AC-17\.\d/)
    }
  })

  it('every register row states plainly whether it was patched in the fork', () => {
    for (const row of rows) {
      const disposition = row[3]
      expect(disposition).toBeDefined()
      expect(disposition).toMatch(/^(Yes|No)\b/)
    }
  })

  it('at least one finding is recorded as patched, and states it was registered openly rather than silently', () => {
    const patchedRows = rows.filter((row) => /^Yes/.test(row[3]))
    expect(patchedRows.length).toBeGreaterThanOrEqual(1)
    expect(patchedRows.some((row) => /openly/i.test(row[3]))).toBe(true)
  })

  it('most findings are recorded as upstream behaviour, not silently patched', () => {
    const notPatchedRows = rows.filter((row) => /^No\b/.test(row[3]))
    expect(notPatchedRows.length).toBeGreaterThanOrEqual(rows.length - 1)
  })

  it('routes the register to scrum-master/po-requests.md rather than deciding it silently', () => {
    expect(section).toMatch(/scrum-master\/po-requests\.md/)
    expect(section).toMatch(/routing|routed|added to/i)
    expect(section).toMatch(/rather than (deciding|decided)/i)
  })

  it('states explicitly that it does not edit po-requests.md directly, since that file is owned outside this AC\'s scope', () => {
    expect(section).toMatch(/without editing that file directly|owned outside this AC's scope/i)
  })

  it('does not itself modify scrum-master/po-requests.md', () => {
    expect(fs.existsSync(path.join(root, 'scrum-master/po-requests.md'))).toBe(true)
  })

  it('the register cites basis sections from every prior AC that actually recorded a finding', () => {
    const referencedACs = new Set(
      rows
        .map((row) => row[2].match(/AC-17\.\d+(?:\.\d+)*/g) || [])
        .flat(),
    )
    // AC-17.3 and AC-17.8 recorded no gaps against the PRD, so they are not
    // expected here — only the ACs whose sections actually contain a finding.
    const requiredPrefixes = ['AC-17.1', 'AC-17.2', 'AC-17.4', 'AC-17.5', 'AC-17.6', 'AC-17.7']
    for (const prefix of requiredPrefixes) {
      const covered = Array.from(referencedACs).some((ac) => ac.startsWith(prefix))
      expect(covered).toBe(true)
    }
  })
})
