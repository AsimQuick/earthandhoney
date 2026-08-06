/**
 * ---
 * file: src/__tests__/us21-ac21.2-claude-md-restore.test.ts
 * project: earthandhoney
 * purpose: Verify AC-21.2 — CLAUDE.md on `main` is the post-pivot version
 *          restored verbatim from commit 9624a07, replacing the retired
 *          Gallery-Engine version (61 lines) that previously named Better
 *          Auth, Resend, Adobe Acrobat Sign, Sessions as the central
 *          business object, and Testimonials/Packages/FAQ. This suite
 *          checks the evidence named in the AC: the pivot notice, the
 *          restored section headings, and the absence of the retired
 *          Gallery-Engine positioning.
 * created-by: dev-team
 * related-story: US-21
 * related-ac: 21.2
 * ---
 */

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const claudeMd = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8')

describe('AC-21.2: CLAUDE.md is restored to the post-pivot version', () => {
  it('contains the PIVOT NOTICE (2026-07-30) block', () => {
    expect(claudeMd).toMatch(/PIVOT NOTICE \(2026-07-30\)/)
  })

  it('contains the Three Surfaces heading', () => {
    expect(claudeMd).toMatch(/^## The Three Surfaces$/m)
  })

  it("contains the eight Product Pillars beginning 'Fork, don't rebuild'", () => {
    expect(claudeMd).toMatch(/^1\. \*\*Fork, don't rebuild\*\*/m)
  })

  it('contains the Ledger Rule heading', () => {
    expect(claudeMd).toMatch(/^## The Ledger Rule/m)
  })

  it('contains the Stripe Port Rule heading', () => {
    expect(claudeMd).toMatch(/^## Stripe Port Rule/m)
  })

  it('contains the Fork Discipline (PicPeak) heading', () => {
    expect(claudeMd).toMatch(/^## Fork Discipline \(PicPeak\)$/m)
  })

  it('contains the Decisions No Agent May Make Alone heading', () => {
    expect(claudeMd).toMatch(/^## Decisions No Agent May Make Alone$/m)
  })

  it('contains the Retired From the Old Direction heading', () => {
    expect(claudeMd).toMatch(/^## Retired From the Old Direction \(do not build\)$/m)
  })

  it('is not the retired 61-line Gallery-Engine CLAUDE.md that used to occupy this path', () => {
    const lineCount = claudeMd.split('\n').length
    expect(lineCount).not.toBe(61)
    expect(lineCount).toBeGreaterThan(200)
  })

  it('does not name the retired Better Auth / Resend / Adobe Acrobat Sign stack outside a retired context', () => {
    expect(claudeMd).not.toMatch(/^- Auth: Better Auth$/m)
    expect(claudeMd).not.toMatch(/^- Email: Resend$/m)
    expect(claudeMd).not.toMatch(/^- Contracts: Adobe Acrobat Sign/m)
  })
})
