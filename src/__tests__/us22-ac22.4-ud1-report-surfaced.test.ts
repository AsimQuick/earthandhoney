/**
 * ---
 * file: src/__tests__/us22-ac22.4-ud1-report-surfaced.test.ts
 * project: earthandhoney
 * purpose: Verify AC-22.4 — the prepared-but-unsubmitted UD-1 (F8) upstream
 *          defect report is surfaced as an explicit human action item: the
 *          on-disk path of the drafted report is named, publishing it is
 *          stated to require a human GitHub identity, the consequence of not
 *          filing it (the fork patch can never actually be dropped) is
 *          recorded, and the item cross-references retrospective.md action
 *          item 9. scrum-master/po-requests.md is outside this AC's write
 *          scope (per AC-14.6/AC-17.9/AC-22.2's own precedent), so the
 *          merge-ready content lives in PIVOT_AUDIT.md and this test checks
 *          it there, plus the source-of-truth files it must stay
 *          consistent with.
 * created-by: dev-team
 * related-story: US-22
 * related-ac: 22.4
 *
 * note: retrospective.md now carries more than one sprint's "Process
 *       improvements / action items" table, each numbered from 1, so more
 *       than one "| 9 |" row exists. The row this AC cross-references is
 *       identified by its content (the F8/UD-1 submission decision), not by
 *       being the first "| 9 |" match in the file.
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const pivotAudit = fs.readFileSync(path.join(root, 'PIVOT_AUDIT.md'), 'utf8')
const forkChangelog = fs.readFileSync(path.join(root, 'FORK_CHANGELOG.md'), 'utf8')
const upstreamDefects = fs.readFileSync(
  path.join(root, 'PICPEAK_UPSTREAM_DEFECTS.md'),
  'utf8',
)
const retrospective = fs.readFileSync(
  path.join(root, 'scrum-master', 'retrospective.md'),
  'utf8',
)
const poRequests = fs.readFileSync(
  path.join(root, 'scrum-master', 'po-requests.md'),
  'utf8',
)

const REPORT_PATH = '.github/upstream-issues/UD-1-gallery-single-download.md'

describe('AC-22.4: the drafted UD-1 upstream report is surfaced as a human action item', () => {
  const sectionIdx = pivotAudit.indexOf(
    "## AC-22.4 — the prepared-but-unsubmitted UD-1 upstream report, surfaced as a human action item",
  )
  const nextSectionIdx = pivotAudit.indexOf('\n## ', sectionIdx + 1)
  const section = pivotAudit.slice(
    sectionIdx,
    nextSectionIdx === -1 ? undefined : nextSectionIdx,
  )

  it('the AC-22.4 section exists in PIVOT_AUDIT.md', () => {
    expect(sectionIdx).toBeGreaterThan(-1)
  })

  it('explains why po-requests.md is not edited directly, citing the AC-14.6/AC-17.9/AC-22.2 precedent', () => {
    expect(section).toMatch(/outside this AC's write scope/)
    expect(section).toMatch(/AC-14\.6/)
    expect(section).toMatch(/AC-17\.9/)
    expect(section).toMatch(/AC-22\.2/)
  })

  it('names the exact on-disk path of the drafted report', () => {
    expect(section).toContain(REPORT_PATH)
  })

  it('the named path is the same one PICPEAK_UPSTREAM_DEFECTS.md points --body-file at', () => {
    expect(upstreamDefects).toContain(REPORT_PATH)
    expect(fs.existsSync(path.join(root, REPORT_PATH))).toBe(true)
  })

  it('states that publishing requires a human GitHub identity', () => {
    expect(section).toMatch(/human GitHub identity/)
  })

  it('records the consequence of not filing it: the fork patch can never actually be dropped', () => {
    expect(section).toMatch(/droppable/)
    expect(section).toMatch(/can never (actually )?be dropped/)
    expect(section).toMatch(/carried forever|carry it forever/)
  })

  it('the drop condition it references is the one actually registered in FORK_CHANGELOG.md / PICPEAK_UPSTREAM_DEFECTS.md', () => {
    expect(forkChangelog).toMatch(/UD-1/)
    expect(upstreamDefects).toMatch(/drop rather than merge/)
    expect(upstreamDefects).toMatch(/Drop the patch when/)
  })

  it('cross-references retrospective.md as action item 9', () => {
    expect(section).toMatch(/action item 9/)
  })

  it('retrospective.md action item 9 is in fact the UD-1 submission decision', () => {
    const rowPattern = /\|\s*9\s*\|([^|]*)\|([^|]*)\|([^|]*)\|/g
    const rows = [...retrospective.matchAll(rowPattern)]
    expect(rows.length).toBeGreaterThan(0)
    const ud1Row = rows.find(([, action]) => /F8\/UD-1/.test(action))
    expect(ud1Row).not.toBeUndefined()
    const [, action] = ud1Row as RegExpMatchArray
    expect(action).toMatch(/prepared upstream defect report/)
    expect(action).toMatch(/F8\/UD-1/)
  })

  it('po-requests.md item 16 (the existing UD-1 ask this AC finishes) is still present, unedited by this AC', () => {
    expect(poRequests).toMatch(/\|\s*16\s*\|/)
    expect(poRequests).toMatch(/human GitHub identity/)
    expect(poRequests).toMatch(/F8 \/ UD-1/)
  })
})
