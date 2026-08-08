/**
 * ---
 * file: src/__tests__/us29-ac29.2.3-candidate-disposition.test.ts
 * project: earthandhoney
 * purpose: Verify AC-29.2.3 — R2_STORAGE_AND_DELIVERY_ADR.md's "Candidate
 *          disposition — paths 3, 4 and 5 (AC-29.2.3)" subsection names all
 *          five candidates, gives each exactly one disposition drawn from a
 *          closed vocabulary (measured / unmeasured), states a concrete
 *          blocking prerequisite for every unmeasured candidate, and points
 *          each prerequisite at a real, matching `po-requests.md` entry
 *          rather than a new one invented per candidate (duplicates
 *          consolidated, per the AC). Also re-asserts the ADR's own standing
 *          rule — the candidates are listed to be measured, not ranked —
 *          still holds, with no preference-based ranking language
 *          introduced by this AC's own new prose.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.2.3
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const ADR_PATH = 'R2_STORAGE_AND_DELIVERY_ADR.md'
const PO_REQUESTS_PATH = 'scrum-master/po-requests.md'

const adr = read(ADR_PATH)

const SUBSECTION_HEADING = '### Candidate disposition — paths 3, 4 and 5 (AC-29.2.3)'
const NEXT_HEADING = '### Measurements that will decide it'

function extractSection(text: string, startHeading: string, endHeading: string): string {
  const start = text.indexOf(startHeading)
  const end = text.indexOf(endHeading, start + 1)
  if (start === -1) throw new Error(`heading not found: ${startHeading}`)
  if (end === -1) throw new Error(`heading not found: ${endHeading}`)
  return text.slice(start, end)
}

// Markdown source wraps prose at ~100 columns, so a multi-word phrase this
// suite asserts on can straddle a line break in the committed file. Collapse
// runs of whitespace (including the newline) to a single space before
// substring/regex checks so the wrap point never causes a false negative.
const flatten = (text: string) => text.replace(/\s+/g, ' ')

const disposition = extractSection(adr, SUBSECTION_HEADING, NEXT_HEADING)

describe('AC-29.2.3: the ADR carries a dedicated disposition subsection for candidates 3, 4 and 5', () => {
  it('the subsection exists, placed beside the AC-29.2.1 candidate mechanism map', () => {
    expect(adr).toContain(SUBSECTION_HEADING)
    // Beside candidates 1 and 2's own mechanism-map subsection, not detached from it.
    expect(adr.indexOf('#### Path 2 — direct time-limited presigned R2 links')).toBeLessThan(
      adr.indexOf(SUBSECTION_HEADING),
    )
  })
})

describe('AC-29.2.3: the disposition table names all five candidates, each with exactly one closed-vocabulary disposition', () => {
  const rows = [...disposition.matchAll(/^\|\s*(\d)\s*—\s*([^|]+?)\s*\|\s*(measured|unmeasured)[^|]*\|$/gm)]

  it('states exactly five rows, numbered 1 through 5 in order — a closed set, not an open survey', () => {
    expect(rows).toHaveLength(5)
    expect(rows.map((r) => r[1])).toEqual(['1', '2', '3', '4', '5'])
  })

  it('candidates 1 and 2 are dispositioned "measured"; candidates 3, 4 and 5 are dispositioned "unmeasured"', () => {
    expect(rows.map((r) => r[3])).toEqual(['measured', 'measured', 'unmeasured', 'unmeasured', 'unmeasured'])
  })

  it('every disposition in the table is drawn only from the closed vocabulary — no third status word', () => {
    const tableBlock = disposition.slice(disposition.indexOf('| Candidate | Disposition |'), disposition.indexOf('\n\n', disposition.indexOf('| Candidate | Disposition |')))
    const dispositionCells = [...tableBlock.matchAll(/\|\s*(?:measured|unmeasured)[^|]*\|$/gm)]
    expect(dispositionCells).toHaveLength(5)
    for (const cell of dispositionCells) {
      expect(cell[0]).toMatch(/^\|\s*(measured|unmeasured)\b/)
    }
  })
})

describe('AC-29.2.3: candidate 3 — public delivery through a CDN/custom domain', () => {
  const section = flatten(extractSection(disposition, '#### Candidate 3', '#### Candidate 4'))

  it('is dispositioned unmeasured, with a named, concrete blocking prerequisite', () => {
    expect(section).toContain('**Disposition: unmeasured.**')
    expect(section).toContain('**Blocking prerequisite:**')
  })

  it('prerequisite names a Cloudflare custom domain or public bucket binding in front of the AC-19.4 bucket, not a generic ask', () => {
    expect(section).toMatch(/Cloudflare custom domain/)
    expect(section).toMatch(/public bucket binding/)
    expect(section).toContain('`earthandhoney` R2 bucket')
    expect(section).toContain('AC-19.4')
  })

  it('cites the AC-19.4 audit finding that backs the prerequisite, so it is derived evidence, not asserted from nothing', () => {
    expect(section).toMatch(/R2_PUBLIC_URL.*PUBLIC_URL.*r2\.dev.*CDN_URL.*CUSTOM_DOMAIN/)
  })

  it('points at a matching po-requests.md entry', () => {
    expect(section).toContain('Raised as `scrum-master/po-requests.md` item 15.')
  })
})

describe('AC-29.2.3: candidate 4 — an edge authorisation layer (Cloudflare Worker)', () => {
  const section = flatten(extractSection(disposition, '#### Candidate 4', '#### Candidate 5'))

  it('is dispositioned unmeasured, with a named, concrete blocking prerequisite', () => {
    expect(section).toContain('**Disposition: unmeasured.**')
    expect(section).toContain('**Blocking prerequisite:**')
  })

  it('prerequisite names a deployed Worker implementing an authorisation rule, not a generic ask', () => {
    expect(section).toMatch(/deployed Cloudflare Worker/)
    expect(section).toMatch(/authorisation rule/)
    expect(section).toContain('`earthandhoney` R2 bucket')
  })

  it('states the concrete absence backing the prerequisite (no Worker script/config anywhere in the repo)', () => {
    expect(section).toMatch(/wrangler\.toml/)
  })

  it('points at a matching po-requests.md entry', () => {
    expect(section).toContain('Raised as `scrum-master/po-requests.md` item 15.')
  })
})

describe('AC-29.2.3: candidate 5 — a hybrid', () => {
  const section = flatten(extractSection(disposition, '#### Candidate 5', '\nNo preference is expressed'))

  it('is dispositioned unmeasured, with a named, concrete blocking prerequisite', () => {
    expect(section).toContain('**Disposition: unmeasured.**')
    expect(section).toContain('**Blocking prerequisite:**')
  })

  it("prerequisite is candidates 3 and 4's infrastructure plus a routing rule that is itself part of AC-29.4's decision", () => {
    expect(section).toMatch(/both candidate 3's and candidate 4's prerequisites/)
    expect(section).toMatch(/decided rule for which galleries take which path/)
    expect(section).toContain('AC-29.4')
    expect(section).toMatch(/cannot be decided ahead of AC-29\.4/)
  })

  it('duplicates are consolidated — no third/separate po-requests.md item invented for candidate 5', () => {
    expect(section).toContain('consolidated into the same `scrum-master/po-requests.md` item 15')
    expect(section).not.toMatch(/item 1[6-9]|item 2\d/)
  })
})

describe("AC-29.2.3: the ADR's standing rule — listed to be measured, not ranked — still stands", () => {
  it('the original standing-rule sentence is unchanged, word for word', () => {
    expect(adr).toMatch(
      /deferred to a benchmark planned for the next sprint, and no agent may choose\s+a path by preference before that benchmark exists — the candidates below are\s+listed to be measured, not ranked\./,
    )
  })

  it('this AC introduces no preference-based ranking language ahead of AC-29.4 — no candidate is called better, worse, preferred, recommended or a winner', () => {
    const forbidden = [
      /\bbetter than\b/i,
      /\bworse than\b/i,
      /\bwinner\b/i,
      /\bwe recommend\b/i,
      /\bmy recommendation\b/i,
      /\bpreferred candidate\b/i,
      /\bbest candidate\b/i,
      /\bstrongest candidate\b/i,
    ]
    for (const pattern of forbidden) {
      expect(disposition).not.toMatch(pattern)
    }
  })

  it('explicitly disclaims ranking among 3, 4 and 5, and repeats that recording them unmeasured is a pass, not a failure', () => {
    expect(disposition).toMatch(/No preference is expressed among candidates 3, 4 and 5/)
    expect(disposition).toMatch(/is a pass on AC-29\.2\.3, not a failure/)
  })
})

describe('AC-29.2.3: po-requests.md carries a matching, blocking entry for the prerequisites named in the ADR', () => {
  const poRequests = read(PO_REQUESTS_PATH)
  const item15Row = poRequests.split('\n').find((line) => line.trimStart().startsWith('| 15 |'))

  it('item 15 exists as a row in the existing blocking-items table format', () => {
    expect(item15Row).toBeDefined()
  })

  it('item 15 names both candidates the ADR points at it for, and the infrastructure each needs', () => {
    expect(item15Row).toMatch(/candidates 3 and 4/)
    expect(item15Row).toMatch(/Cloudflare custom domain/)
    expect(item15Row).toMatch(/Worker/)
  })

  it('item 15 states the infrastructure does not exist yet, matching the ADR\'s "unmeasured" disposition', () => {
    expect(item15Row).toMatch(/does not exist yet/)
  })
})
