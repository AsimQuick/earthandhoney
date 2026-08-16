/**
 * ---
 * file: src/__tests__/us40-ac40.4-status-pairing-contrast.test.ts
 * project: earthandhoney
 * purpose: Verify AC-40.4 — every status pairing PRD 23.3's five states
 *          render today (the ink text label and icon, PRD 35.4's guaranteed
 *          non-colour channels, AC-40.2) clears its WCAG AA usage-class
 *          minimum, computed live from src/styles/tokens.css via
 *          src/lib/statusPairingContrast.ts rather than asserted as a fixed
 *          number — the same "compute, don't assert" discipline US-23
 *          AC-23.3 established. Verified on both backgrounds the vocabulary
 *          must read against: the photographer's cockpit
 *          (`--color-surface-muted`) and the client Project Room
 *          (`--color-surface`) — see statusPairingContrast.ts's header for
 *          why those two locked token names stand in for the two named
 *          surfaces. Each computed ratio is printed with its usage-class
 *          minimum as this AC's evidence.
 * created-by: dev-team
 * related-story: US-40
 * related-ac: 40.4
 * ---
 */
import fs from 'fs'
import path from 'path'

import { STATUS_STATES } from '@/lib/statusVocabulary'
import {
  checkStatusPairingContrast,
  COCKPIT_BACKGROUND_TOKEN,
  PROJECT_ROOM_BACKGROUND_TOKEN,
  type StatusPairingCheck,
} from '@/lib/statusPairingContrast'

const FILE_PATH = path.join(process.cwd(), 'src/lib/statusPairingContrast.ts')
const fileSource = fs.readFileSync(FILE_PATH, 'utf8')

const checks = checkStatusPairingContrast()

function describeCheck(check: StatusPairingCheck): string {
  return (
    `${check.stateLabel} ${check.channel} — ink ${check.inkHex} on ${check.surface} ` +
    `(${check.backgroundToken}=${check.surfaceHex}): ratio ${check.ratio.toFixed(2)}:1, ` +
    `minimum ${check.minimum}:1 (${check.usage})`
  )
}

describe('US-40 AC-40.4: every status pairing clears WCAG AA contrast, computed from the token values', () => {
  it('carries the CLAUDE.md structured metadata header naming AC-40.4', () => {
    const header = fileSource.match(/^\/\*[\s\S]*?\*\//)?.[0] ?? ''
    expect(header).toMatch(/\*\s*related-story:\s*US-40/)
    expect(header).toMatch(/\*\s*related-ac:\s*40\.4/)
  })

  it('produces one pairing per (status state x background x channel) — 5 x 2 x 2 = 20', () => {
    expect(STATUS_STATES.length).toBe(5)
    expect(checks.length).toBe(STATUS_STATES.length * 2 * 2)
  })

  it('every computed hex value is read live as a 6-digit hex from tokens.css', () => {
    for (const check of checks) {
      expect(/^#[0-9a-f]{6}$/i.test(check.inkHex)).toBe(true)
      expect(/^#[0-9a-f]{6}$/i.test(check.surfaceHex)).toBe(true)
    }
  })

  it('covers both the cockpit and the Project Room backgrounds, each tied to its declared token', () => {
    const surfaces = new Set(checks.map((c) => c.surface))
    expect(surfaces).toEqual(new Set(['cockpit', 'project-room']))
    expect(new Set(checks.filter((c) => c.surface === 'cockpit').map((c) => c.backgroundToken))).toEqual(
      new Set([COCKPIT_BACKGROUND_TOKEN]),
    )
    expect(new Set(checks.filter((c) => c.surface === 'project-room').map((c) => c.backgroundToken))).toEqual(
      new Set([PROJECT_ROOM_BACKGROUND_TOKEN]),
    )
  })

  it("covers every one of PRD 23.3's five locked states, named individually", () => {
    const stateKeys = new Set(checks.map((c) => c.stateKey))
    expect(stateKeys).toEqual(new Set(STATUS_STATES.map((s) => s.key)))
  })

  it('the text channel is held to the body minimum (4.5:1) and the icon channel to the large/non-text minimum (3:1)', () => {
    for (const check of checks) {
      if (check.channel === 'text') {
        expect(check.minimum).toBe(4.5)
      }
      if (check.channel === 'icon') {
        expect(check.minimum).toBe(3)
      }
    }
  })

  it.each(checks.map((check) => [describeCheck(check), check] as const))('%s', (evidenceLabel, check) => {
    // AC-40.4's evidence clause requires the computed ratio, printed per
    // pairing alongside its usage-class minimum.
    console.log(`AC-40.4 status pairing: ${evidenceLabel} -> ${check.passes ? 'PASS' : 'FAIL'}`)
    expect(check.ratio).toBeGreaterThanOrEqual(check.minimum)
  })

  it("does not anticipate a status hue's own contrast — no hex literal and no --color-status/success/warning/danger/error reference", () => {
    expect(fileSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(fileSource).not.toMatch(/--color-(status|success|warning|danger|error)/)
  })
})
