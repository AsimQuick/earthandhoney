/**
 * ---
 * file: src/__tests__/us40-ac40.3-status-colour-token-routing-guard.test.ts
 * project: earthandhoney
 * purpose: Verify AC-40.3 — the status colours must come from the locked
 *          design-token set, never an ad hoc hex value, and PRD 23.3's five
 *          semantic hues (green/amber/blue/red/grey) may not be added to
 *          src/styles/tokens.css or exports/design-tokens/tokens.css by an
 *          implementing session on its own authority (the human signed the
 *          token set off as-is on 2026-08-13, po-requests.md item 14, on a
 *          brief of near-black ink and a neutral grey scale with no accent
 *          colour). This suite pins that conflict as a live, evidence-based
 *          fact rather than an assertion: both token files are read from
 *          disk and asserted to declare exactly the six locked --color-*
 *          tokens and no semantic status colour; statusVocabulary.ts and
 *          StatusBadge.tsx are asserted to resolve `colorName` to nothing —
 *          no hex literal and no reference to a --color-status/success/
 *          warning/danger/error custom property that does not exist yet;
 *          and po-requests.md is asserted to carry item 18, documenting the
 *          conflict, the three options and a recommendation, satisfying this
 *          AC's "po-requests.md carries it" half.
 *
 *          The other half of this AC's evidence clause — an entry in this
 *          sprint file's `pending_po_routing` array with `drained: true` —
 *          is not written by this suite or this session. Per this project's
 *          session harness, an implementing session has no write scope over
 *          scrum-master/*, the same separation AC-22.2 already established
 *          for PIVOT_AUDIT.md/po-requests.md; the pending_po_routing entry
 *          for 40.3 is appended by the orchestrator from this session's
 *          reported summary, not asserted here.
 *
 *          This test is deliberately load-bearing: once the Product Owner
 *          resolves po-requests.md item 18 and tokens are added (or the
 *          alternative option is chosen), the token-shape assertions below
 *          will correctly fail and must be updated as part of that future
 *          work — they are not meant to survive a resolution unchanged.
 * created-by: dev-team
 * related-story: US-40
 * related-ac: 40.3
 * ---
 */
import fs from 'fs'
import path from 'path'

import { STATUS_STATES } from '@/lib/statusVocabulary'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const LOCKED_COLOR_TOKENS = [
  'ink',
  'ink-secondary',
  'ink-tertiary',
  'surface',
  'surface-muted',
  'border',
]

function declaredColorTokenNames(css: string): string[] {
  return Array.from(css.matchAll(/--color-([a-z0-9-]+)\s*:/g)).map((match) => match[1])
}

describe('AC-40.3: status colours must come from the locked token set, not ad hoc hex values', () => {
  describe('precondition, verified live: the locked token files declare no semantic status colour', () => {
    it.each([
      ['src/styles/tokens.css', () => read('src/styles/tokens.css')],
      ['exports/design-tokens/tokens.css', () => read('exports/design-tokens/tokens.css')],
    ])('%s declares exactly the six locked colour tokens and no success/warning/danger/error/status hue', (_label, load) => {
      const names = declaredColorTokenNames(load())
      expect(names.sort()).toEqual([...LOCKED_COLOR_TOKENS].sort())
      for (const forbidden of ['success', 'warning', 'danger', 'error', 'status']) {
        expect(names.some((name) => name.includes(forbidden))).toBe(false)
      }
    })
  })

  describe('statusVocabulary.ts resolves colorName to an identifier only, never a value', () => {
    it('every STATUS_STATES entry carries exactly key, colorName, label and icon — no token or hex field', () => {
      for (const state of STATUS_STATES) {
        expect(Object.keys(state).sort()).toEqual(['colorName', 'icon', 'key', 'label'])
      }
    })

    it('the statusVocabulary.ts source contains no hex colour literal', () => {
      const source = read('src/lib/statusVocabulary.ts')
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    })

    it('the statusVocabulary.ts source references no --color-status/success/warning/danger/error custom property', () => {
      const source = read('src/lib/statusVocabulary.ts')
      expect(source).not.toMatch(/--color-(status|success|warning|danger|error)/)
    })
  })

  describe('StatusBadge.tsx resolves colorName to an identifier only, never a value', () => {
    it('the StatusBadge.tsx source contains no hex colour literal', () => {
      const source = read('src/components/status/StatusBadge.tsx')
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    })

    it('the StatusBadge.tsx source references no --color-status/success/warning/danger/error custom property', () => {
      const source = read('src/components/status/StatusBadge.tsx')
      expect(source).not.toMatch(/--color-(status|success|warning|danger|error)/)
    })
  })

  describe('po-requests.md carries the routed conflict (item 18)', () => {
    const poRequests = read('scrum-master/po-requests.md')
    const itemRowStart = poRequests.indexOf('| 18 |')

    it('item 18 exists', () => {
      expect(itemRowStart).toBeGreaterThan(-1)
    })

    const nextItemStart = poRequests.indexOf('\n| 19 |', itemRowStart)
    const item18 = poRequests.slice(
      itemRowStart,
      nextItemStart === -1 ? itemRowStart + 4000 : nextItemStart,
    )

    it('states the conflict: tokens.css declares no semantic status colour, against the 2026-08-13 sign-off', () => {
      expect(item18).toMatch(/no semantic status colour/i)
      expect(item18).toMatch(/2026-08-13/)
    })

    it('names all three options and a recommendation', () => {
      expect(item18).toMatch(/\(a\)/)
      expect(item18).toMatch(/\(b\)/)
      expect(item18).toMatch(/\(c\)/)
      expect(item18).toMatch(/recommendation/i)
    })

    it('references US-40 as the story it affects', () => {
      expect(item18).toMatch(/US-40/)
    })

    it('is not marked RESOLVED — the routing obligation this AC exists to satisfy is still open', () => {
      expect(item18).not.toMatch(/RESOLVED/)
    })
  })
})
