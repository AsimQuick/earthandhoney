/**
 * ---
 * file: src/__tests__/us22-ac22.3-reopened-status-propagated.test.ts
 * project: earthandhoney
 * purpose: Verify AC-22.3 — the reopened contract-signing status (AC-22.1) is
 *          propagated to every artifact an agent may be handed: CLAUDE.md's
 *          Contracts entry and PRD §29 both carry a dated REOPENED marker
 *          naming the failed AC-17.10 element and pointing at
 *          scrum-master/po-requests.md item 7, and SYSTEM_OWNERSHIP.md's
 *          Contracts row is annotated the same way. F1 and F5 receive the
 *          same dated-marker treatment where the PRD's Project/Gallery
 *          (§6.2, §17.3) and expiry (§28.1, §30) language assumes otherwise.
 * created-by: dev-team
 * related-story: US-22
 * related-ac: 22.3
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const claudeMd = read('CLAUDE.md')
const prd = read('scrum-master/PRD.md')
const systemOwnership = read('SYSTEM_OWNERSHIP.md')

function section(doc: string, startMarker: string, endMarker = '\n## '): string {
  const start = doc.indexOf(startMarker)
  expect(start).toBeGreaterThan(-1)
  const end = doc.indexOf(endMarker, start + startMarker.length)
  return doc.slice(start, end === -1 ? undefined : end)
}

describe('AC-22.3: reopened contract-signing status propagated to every artifact', () => {
  describe("CLAUDE.md's Contracts entry", () => {
    const line = claudeMd
      .split('\n')
      .find((l) => l.trim().startsWith('- **Contracts:**')) as string

    it('exists', () => {
      expect(line).toBeDefined()
    })

    it('carries a dated REOPENED marker', () => {
      expect(line).toMatch(/REOPENED \(2026-08-07\)/)
    })

    it('names the failed element: an audit page baked into the delivered PDF', () => {
      expect(line).toMatch(/audit page baked into the delivered PDF/)
    })

    it('points at scrum-master/po-requests.md item 7', () => {
      expect(line).toMatch(/po-requests\.md.*item 7/)
    })
  })

  describe('PRD §29 (Contracts and PDFs)', () => {
    const sect = section(prd, '# 29. Contracts and PDFs', '\n# 30.')

    it('carries a dated REOPENED marker', () => {
      expect(sect).toMatch(/REOPENED \(2026-08-07\)/)
    })

    it('names the failed element: an audit page baked into the delivered PDF', () => {
      expect(sect).toMatch(/audit page baked into\s+the delivered PDF/)
    })

    it('points at scrum-master/po-requests.md item 7', () => {
      expect(sect).toMatch(/po-requests\.md.*item 7/)
    })
  })

  describe("SYSTEM_OWNERSHIP.md's Contracts row", () => {
    const rowLine = systemOwnership
      .split('\n')
      .find((l) => l.startsWith('| Contracts — signing')) as string

    it('exists', () => {
      expect(rowLine).toBeDefined()
    })

    it('carries a dated REOPENED marker', () => {
      expect(rowLine).toMatch(/REOPENED \(2026-08-07\)/)
    })

    it('points at scrum-master/po-requests.md item 7', () => {
      expect(rowLine).toMatch(/po-requests\.md.*item 7/)
    })
  })

  describe('finding F1 — PRD §6.2 and §17.3 (Project/Gallery/Client)', () => {
    const s62 = section(prd, '## 6.2 Project First for Business Workflow', '\n## 6.3')
    const s173 = section(prd, '## 17.3 Client Delivery Fields', '\n## 17.4')

    it('§6.2 carries a dated REOPENED marker naming finding F1', () => {
      expect(s62).toMatch(/REOPENED \(2026-08-07\)[^]*finding F1/)
    })

    it('§6.2 states the Gallery→Client link is not inherited', () => {
      expect(s62).toMatch(/does not inherit the Project's Client/)
    })

    it('§17.3 carries a dated REOPENED marker naming finding F1', () => {
      expect(s173).toMatch(/REOPENED \(2026-08-07\)[^]*finding F1/)
    })

    it('both cite PIVOT_AUDIT.md finding F1', () => {
      expect(s62).toMatch(/PIVOT_AUDIT\.md/)
      expect(s62).toMatch(/finding F1/)
      expect(s173).toMatch(/PIVOT_AUDIT\.md/)
      expect(s173).toMatch(/finding F1/)
    })
  })

  describe('finding F5 — PRD §28.1 and §30 (Gallery expiry)', () => {
    const s281 = section(prd, '## 28.1 Ownership', '\n## 28.2')
    const s30 = section(prd, '# 30. Private Gallery Delivery and Retention', '\n# 31.')

    it('§28.1 carries a dated REOPENED marker naming finding F5', () => {
      expect(s281).toMatch(/REOPENED \(2026-08-07\)[^]*finding F5/)
    })

    it('§28.1 states enforcement lag against the "Automatic" expiry row', () => {
      expect(s281).toMatch(/expirationChecker/)
      expect(s281).toMatch(/roughly an hour of lag/)
    })

    it('§30 carries a dated REOPENED marker naming finding F5', () => {
      expect(s30).toMatch(/REOPENED \(2026-08-07\)[^]*finding F5/)
    })

    it('both cite PIVOT_AUDIT.md finding F5', () => {
      expect(s281).toMatch(/PIVOT_AUDIT\.md/)
      expect(s281).toMatch(/finding F5/)
      expect(s30).toMatch(/PIVOT_AUDIT\.md/)
      expect(s30).toMatch(/finding F5/)
    })
  })
})
