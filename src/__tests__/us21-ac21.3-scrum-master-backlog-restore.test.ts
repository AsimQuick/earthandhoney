/**
 * ---
 * file: src/__tests__/us21-ac21.3-scrum-master-backlog-restore.test.ts
 * project: earthandhoney
 * purpose: Verify AC-21.3 — scrum-master/scrum-master.md carries the
 *          post-pivot Product Backlog (items 1-42), the sixteen
 *          cross-sprint Reminders, and the Required Product Owner
 *          deliverables table, restored from commit 9624a07 and merged
 *          with (not replacing) the sprint-3 review section already
 *          present in the working-tree file. Checks the evidence named
 *          in the AC: both section headings are present, item 1 and
 *          item 42 of the backlog are present, all sixteen reminders are
 *          present, and the front-matter current-sprint reads sprint-4.
 * created-by: dev-team
 * related-story: US-21
 * related-ac: 21.3
 * ---
 */

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const scrumMasterMd = fs.readFileSync(
  path.join(root, 'scrum-master', 'scrum-master.md'),
  'utf8'
)

describe('AC-21.3: scrum-master.md carries the restored post-pivot backlog merged with the sprint-3 review', () => {
  it('contains the Product Backlog (post-pivot) heading', () => {
    expect(scrumMasterMd).toMatch(/^## Product Backlog \(post-pivot\)$/m)
  })

  it('contains backlog item 1 (design-token lock-down)', () => {
    expect(scrumMasterMd).toMatch(/^1\. \*\*Design-token lock-down\*\*/m)
  })

  it('contains backlog item 42 (the last numbered item)', () => {
    expect(scrumMasterMd).toMatch(/^42\. Performance, accessibility, and mobile QA/m)
  })

  it('numbers items 1 through 42 with no gaps', () => {
    for (let i = 1; i <= 42; i++) {
      expect(scrumMasterMd).toMatch(new RegExp(`^${i}\\. `, 'm'))
    }
  })

  it('contains the Reminders (cross-sprint constraints) heading', () => {
    expect(scrumMasterMd).toMatch(/^## Reminders \(cross-sprint constraints\)$/m)
  })

  it('contains all sixteen reminders with no gaps', () => {
    for (let i = 1; i <= 16; i++) {
      expect(scrumMasterMd).toMatch(new RegExp(`^${i}\\. \\*\\*`, 'm'))
    }
  })

  it('contains the Required Product Owner deliverables heading', () => {
    expect(scrumMasterMd).toMatch(/^## Required Product Owner deliverables \(PRD §38\)$/m)
  })

  it('still contains the sprint-3 review section already present in the working tree', () => {
    expect(scrumMasterMd).toMatch(/^## Sprint-3 Review Summary/m)
  })

  it('still contains the sprint-4 planning section already present in the working tree', () => {
    expect(scrumMasterMd).toMatch(/^## Sprint-4 \(Planning/m)
  })

  it("has front-matter current-sprint: sprint-4", () => {
    const frontMatterMatch = scrumMasterMd.match(/^---\n([\s\S]*?)\n---/)
    expect(frontMatterMatch).not.toBeNull()
    const frontMatter = frontMatterMatch ? frontMatterMatch[1] : ''
    expect(frontMatter).toMatch(/^current-sprint: sprint-4$/m)
  })
})
