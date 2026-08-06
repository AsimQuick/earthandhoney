/**
 * ---
 * file: src/__tests__/us22-ac22.1-contract-signing-reopened.test.ts
 * project: earthandhoney
 * purpose: Verify AC-22.1 — scrum-master/po-requests.md item 7 (contract /
 *          e-signature provider for V1) is reopened. Checks that the failed
 *          element (audit page baked into the delivered PDF) is named, that
 *          the entry cites the PIVOT_AUDIT.md AC-17.10 section and the fork
 *          file/line proving the sibling-PDF behaviour, that the item's
 *          status reads "REOPENED — awaiting decision", and that the three
 *          options plus a Product Owner recommendation are present.
 * created-by: dev-team
 * related-story: US-22
 * related-ac: 22.1
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('scrum-master/po-requests.md')
const pivotAudit = read('PIVOT_AUDIT.md')

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
    .filter((cells) => cells[0] !== '#')
}

describe('AC-22.1: po-requests.md item 7 (contract / e-signature provider) reopened', () => {
  const openDecisionsIdx = doc.indexOf('## Open decisions awaiting your confirmation')
  const nextSectionIdx = doc.indexOf('\n## ', openDecisionsIdx + 1)
  const section = doc.slice(openDecisionsIdx, nextSectionIdx === -1 ? undefined : nextSectionIdx)
  const rows = tableRows(section)
  const item7 = rows.find((cells) => cells[0] === '7')

  it('item 7 exists in the open-decisions table', () => {
    expect(item7).toBeDefined()
  })

  const status = (item7 as string[])[3]

  it('status is changed to REOPENED — awaiting decision', () => {
    expect(status).toMatch(/REOPENED\s*—\s*awaiting decision/)
  })

  it('no longer opens with the stale unconditional "Confirmed 2026-07-30" status', () => {
    expect(status.trim().startsWith('**Confirmed 2026-07-30, conditionally.**')).toBe(false)
  })

  it('names the failed element: an audit page baked into the delivered PDF', () => {
    expect(status).toMatch(/audit page baked into the delivered PDF/)
    expect(status).toMatch(/sibling/i)
  })

  it('cites the PIVOT_AUDIT.md AC-17.10 section', () => {
    expect(status).toMatch(/PIVOT_AUDIT\.md/)
    expect(status).toMatch(/AC-17\.10/)
    expect(pivotAudit).toMatch(
      /## AC-17\.10 — PicPeak's native contract-signing capability, verified against the pinned commit/,
    )
    expect(pivotAudit).toMatch(
      /### 7\. Audit page baked into the delivered PDF — does NOT work as assumed/,
    )
  })

  it('cites the fork file/line proving the sibling-PDF audit trail', () => {
    expect(status).toMatch(/pdfStampService\.js:13[–-]22/)
    expect(status).toMatch(/separate sibling document/)
  })

  it('lists all three options: accept sibling PDF, patch fork, external provider', () => {
    expect(status).toMatch(/\(a\)[^]*sibling-PDF audit trail as sufficient/)
    expect(status).toMatch(/\(b\)[^]*patch the fork to merge the audit page/)
    expect(status).toMatch(/\(c\)[^]*external e-sign provider/)
    expect(status).toMatch(/pivot currently forbids/)
  })

  it("carries the Product Owner's recommendation", () => {
    expect(status).toMatch(/My recommendation:\s*\(a\)\s*for V1/)
  })

  it('retains the original 2026-07-30 confirmation for history', () => {
    expect(status).toMatch(/Original confirmation, 2026-07-30, retained for history/)
    expect(status).toMatch(/PicPeak's own native contract-signing capability/)
  })
})
