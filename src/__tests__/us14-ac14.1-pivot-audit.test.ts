/**
 * ---
 * file: src/__tests__/us14-ac14.1-pivot-audit.test.ts
 * project: earthandhoney
 * purpose: Verify AC-14.1 — PIVOT_AUDIT.md exists at the repo root and
 *          inventories every feature delivered in sprint-1 (US-1..US-6) and
 *          sprint-2 (US-7..US-9), each classified as Kept / Replaced by
 *          PicPeak / Repurposed as a Frontstage layer / Retired, with a
 *          one-line reason, and each item appearing exactly once
 * created-by: dev-team
 * related-story: US-14
 * related-ac: 14.1
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const VALID_CLASSIFICATIONS = [
  'Kept',
  'Replaced by PicPeak',
  'Repurposed as a Frontstage layer',
  'Retired',
]

function sprintAcIds(sprintFile: string, storyIds: string[]): string[] {
  const data = JSON.parse(read(sprintFile)) as {
    stories: Array<{ id: string; acceptance_criteria: Array<{ id: string }> }>
  }
  return data.stories
    .filter((s) => storyIds.includes(s.id))
    .flatMap((s) => s.acceptance_criteria.map((ac) => `${s.id} AC-${ac.id}`))
}

describe('AC-14.1: PIVOT_AUDIT.md inventories every sprint-1/sprint-2 item exactly once', () => {
  it('PIVOT_AUDIT.md exists at the repo root', () => {
    expect(fs.existsSync(path.join(root, 'PIVOT_AUDIT.md'))).toBe(true)
  })

  const audit = read('PIVOT_AUDIT.md')

  const sprint1Items = sprintAcIds('scrum-master/sprint1.json', [
    'US-1',
    'US-2',
    'US-3',
    'US-4',
    'US-5',
    'US-6',
  ])
  const sprint2Items = sprintAcIds('scrum-master/sprint2.json', ['US-7', 'US-8', 'US-9'])
  const allItems = [...sprint1Items, ...sprint2Items]

  it('sprint-1 (US-1..US-6) and sprint-2 (US-7..US-9) each contribute at least one AC to check against', () => {
    expect(sprint1Items.length).toBeGreaterThan(0)
    expect(sprint2Items.length).toBeGreaterThan(0)
  })

  it.each(allItems)('%s appears in the audit', (item) => {
    expect(audit).toContain(item)
  })

  it.each(allItems)('%s appears exactly once in the audit', (item) => {
    const escaped = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const occurrences = audit.match(new RegExp(escaped, 'g')) ?? []
    expect(occurrences.length).toBe(1)
  })

  it('every item is followed on its row by one of the four allowed classifications', () => {
    const missingClassification: string[] = []
    for (const item of allItems) {
      const lineStart = audit.indexOf(item)
      const lineEnd = audit.indexOf('\n', lineStart)
      const line = audit.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
      const hasClassification = VALID_CLASSIFICATIONS.some((c) => line.includes(c))
      if (!hasClassification) missingClassification.push(item)
    }
    expect(missingClassification).toEqual([])
  })

  it('every table row with a classification also carries a one-line reason (non-empty trailing cell)', () => {
    const rows = audit
      .split('\n')
      .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    expect(rows.length).toBe(allItems.length)
    for (const row of rows) {
      const cells = row
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
      // # | AC | Feature | Classification | Reason
      expect(cells.length).toBe(5)
      const [, , , classification, reason] = cells
      expect(VALID_CLASSIFICATIONS).toContain(classification)
      expect(reason.length).toBeGreaterThan(0)
    }
  })

  it('does not classify any item outside the four allowed labels', () => {
    const rows = audit.split('\n').filter((line) => /^\|\s*\d+\s*\|/.test(line))
    for (const row of rows) {
      const cells = row
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
      const classification = cells[3]
      expect(VALID_CLASSIFICATIONS).toContain(classification)
    }
  })
})
