/**
 * ---
 * file: src/__tests__/us21-ac21.1-prd-restore.test.ts
 * project: earthandhoney
 * purpose: Verify AC-21.1 — scrum-master/PRD.md on `main` is the post-pivot
 *          PRD restored verbatim from commit 9624a07 (branch feature/US-9),
 *          not the retired Gallery-Engine PRD it previously held, and
 *          scrum-master/PRD-archive.md was restored alongside it from the
 *          same commit. This suite checks the evidence named in the AC: the
 *          four post-pivot section headings, the Phase 0-8 pivot plan, and
 *          that the archive file exists and is distinct from the restored
 *          PRD.
 * created-by: dev-team
 * related-story: US-21
 * related-ac: 21.1
 * ---
 */

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const prd = read('scrum-master/PRD.md')
const archive = read('scrum-master/PRD-archive.md')

describe('AC-21.1: scrum-master/PRD.md is restored to the post-pivot version', () => {
  it('contains the Ledger heading (headless Invoice Ninja section)', () => {
    expect(prd).toMatch(/^# 25\. The Ledger: Headless Invoice Ninja$/m)
  })

  it('contains the Product Owner Pivot Plan heading with Phases 0-8', () => {
    expect(prd).toMatch(/^# 34\. Product Owner Pivot Plan$/m)
    expect(prd).toMatch(/^## Phase 0 /m)
    expect(prd).toMatch(/^## Phase 8 /m)
  })

  it('contains the V1 Acceptance Criteria heading', () => {
    expect(prd).toMatch(/^# 35\. V1 Acceptance Criteria$/m)
  })

  it('contains the Explicit V1 Non-Goals heading', () => {
    expect(prd).toMatch(/^# 36\. Explicit V1 Non-Goals$/m)
  })

  it('is not the retired 937-line Gallery-Engine PRD that used to occupy this path', () => {
    const lineCount = prd.split('\n').length
    expect(lineCount).not.toBe(937)
    expect(lineCount).toBeGreaterThan(1800)
  })

  it('does not open with the retired Gallery-Engine positioning statement', () => {
    expect(prd.slice(0, 400)).not.toMatch(/gallery-first photography business website with lightweight client delivery/i)
  })
})

describe('AC-21.1: scrum-master/PRD-archive.md is restored alongside it', () => {
  it('exists and is non-empty', () => {
    expect(archive.length).toBeGreaterThan(0)
  })

  it('holds the retired Gallery-Engine PRD content (the file main\'s PRD.md used to hold)', () => {
    expect(archive).toMatch(/gallery-first photography business website with lightweight client delivery/i)
  })

  it('is distinct from the restored PRD.md', () => {
    expect(archive).not.toBe(prd)
    expect(archive.split('\n').length).toBeLessThan(prd.split('\n').length)
  })
})
