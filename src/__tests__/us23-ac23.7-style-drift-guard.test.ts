/**
 * ---
 * file: src/__tests__/us23-ac23.7-style-drift-guard.test.ts
 * project: earthandhoney
 * purpose: AC-23.7 — a guard that fails when a raw hex colour, a raw px
 *          font-size, or an arbitrary-value Tailwind class is introduced
 *          anywhere under src/components/ or src/app/, outside the token
 *          source file (src/styles/tokens.css, which lives outside both
 *          scan roots). Two layers: (1) unit tests prove the detector
 *          itself catches each category on synthetic samples, so the guard
 *          isn't a no-op; (2) a repo-wide scan compared against a frozen
 *          baseline (src/__tests__/__fixtures__/us23-ac23.7-style-drift-baseline.ts)
 *          acts as a ratchet — pre-existing debt from earlier stories stays
 *          grandfathered, but any new file with a violation, or any
 *          baselined file whose violation count grows, fails the suite.
 *          (The baseline fixture lives beside the detector, not under
 *          __tests__/, so Jest's own test-file matching doesn't pick it up
 *          as an empty suite.)
 * created-by: dev-team
 * related-story: US-23
 * related-ac: 23.7
 * ---
 */
import fs from 'fs'
import path from 'path'

import { countByCategory, detectStyleDrift } from '@/lib/style-guard/detectStyleDrift'
import {
  STYLE_DRIFT_BASELINE,
  type StyleDriftViolationCounts,
} from '@/lib/style-guard/__fixtures__/us23-ac23.7-style-drift-baseline'

describe('US-23 AC-23.7: style-drift detector catches each category', () => {
  it('flags a raw hex colour', () => {
    const counts = countByCategory(detectStyleDrift('const bg = "#1a1a1a"'))
    expect(counts.hex).toBe(1)
  })

  it('flags a raw px font-size in a CSS declaration', () => {
    const counts = countByCategory(detectStyleDrift('.title { font-size: 18px; }'))
    expect(counts.rawPxFontSize).toBe(1)
  })

  it('flags a raw px font-size in an inline style object', () => {
    const counts = countByCategory(detectStyleDrift('const style = { fontSize: "18px" }'))
    expect(counts.rawPxFontSize).toBe(1)
  })

  it('flags a raw px font-size expressed as a Tailwind arbitrary text size', () => {
    const counts = countByCategory(detectStyleDrift('<h1 className="text-[18px]">'))
    expect(counts.rawPxFontSize).toBeGreaterThanOrEqual(1)
  })

  it('flags an arbitrary-value Tailwind class', () => {
    const counts = countByCategory(detectStyleDrift('<div className="tracking-[2px]">'))
    expect(counts.arbitraryTailwindBracket).toBe(1)
  })

  it('does not flag a token reference by name', () => {
    const counts = countByCategory(
      detectStyleDrift('<div className="text-ink bg-surface p-lg" style={{ color: "var(--color-ink)" }}>'),
    )
    expect(counts.hex).toBe(0)
    expect(counts.rawPxFontSize).toBe(0)
    expect(counts.arbitraryTailwindBracket).toBe(0)
  })

  it('ignores a raw value that only appears inside a block comment', () => {
    const counts = countByCategory(
      detectStyleDrift('/* legacy value was #333333, replaced by --color-ink */\nconst x = 1'),
    )
    expect(counts.hex).toBe(0)
  })
})

const ROOT = process.cwd()
const SCAN_ROOTS = ['src/components', 'src/app']
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css'])
const ZERO_COUNTS: StyleDriftViolationCounts = { hex: 0, rawPxFontSize: 0, arbitraryTailwindBracket: 0 }

function walk(dir: string, out: string[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, out)
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full)
    }
  }
}

function scanRepo(): Record<string, StyleDriftViolationCounts> {
  const files: string[] = []
  for (const scanRoot of SCAN_ROOTS) {
    walk(path.join(ROOT, scanRoot), files)
  }

  const result: Record<string, StyleDriftViolationCounts> = {}
  for (const file of files) {
    const relPath = path.relative(ROOT, file).split(path.sep).join('/')
    const counts = countByCategory(detectStyleDrift(fs.readFileSync(file, 'utf8')))
    if (counts.hex || counts.rawPxFontSize || counts.arbitraryTailwindBracket) {
      result[relPath] = counts
    }
  }
  return result
}

describe('US-23 AC-23.7: repo-wide guard for src/components/ and src/app/', () => {
  const current = scanRepo()
  const currentFiles = Object.keys(current)
  const baselineFiles = Object.keys(STYLE_DRIFT_BASELINE)

  it('introduces no violation in a file the baseline does not already record', () => {
    const unrecordedFiles = currentFiles.filter((file) => !(file in STYLE_DRIFT_BASELINE))
    expect(unrecordedFiles).toEqual([])
  })

  describe.each(baselineFiles)('%s stays within its baselined counts', (file) => {
    it('hex / rawPxFontSize / arbitraryTailwindBracket do not exceed the baseline', () => {
      const baselineForFile = STYLE_DRIFT_BASELINE[file]
      const currentForFile = current[file] ?? ZERO_COUNTS
      expect(currentForFile.hex).toBeLessThanOrEqual(baselineForFile.hex)
      expect(currentForFile.rawPxFontSize).toBeLessThanOrEqual(baselineForFile.rawPxFontSize)
      expect(currentForFile.arbitraryTailwindBracket).toBeLessThanOrEqual(
        baselineForFile.arbitraryTailwindBracket,
      )
    })
  })

  it('never scans the token source file itself (it lives outside both scan roots)', () => {
    expect(currentFiles).not.toContain('src/styles/tokens.css')
  })
})
