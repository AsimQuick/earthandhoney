/**
 * ---
 * file: src/__tests__/us23-ac23.3-contrast-ratios.test.ts
 * project: earthandhoney
 * purpose: Verify AC-23.3 — the palette is near-black ink (not pure #000),
 *          a neutral grey scale for secondary/tertiary content and
 *          surfaces, and no accent colour beyond that range. Computes the
 *          WCAG contrast ratio directly from the --color-* token values for
 *          every ink-on-surface pair src/styles/tokens.css declares as a
 *          usable combination (--usable-pair-*), and fails any pair below
 *          AA (4.5:1 for "body" text, 3:1 for "large" text / non-text
 *          indicators).
 * created-by: dev-team
 * related-story: US-23
 * related-ac: 23.3
 * ---
 */
import fs from 'fs'
import path from 'path'

const TOKENS_PATH = path.join(process.cwd(), 'src/styles/tokens.css')
const tokensSource = fs.readFileSync(TOKENS_PATH, 'utf8')

const AA_THRESHOLD: Record<string, number> = {
  body: 4.5,
  large: 3,
}

function customProperties(source: string): Array<[string, string]> {
  const matches = [...source.matchAll(/--([a-z0-9-]+):\s*([^;]+);/gi)]
  return matches.map((match) => [match[1], match[2].trim()])
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    throw new Error(`Not a 6-digit hex colour: "${hex}"`)
  }
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

function channelLuminance(channel8bit: number): number {
  const c = channel8bit / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex)
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
}

function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA)
  const lB = relativeLuminance(hexB)
  const lighter = Math.max(lA, lB)
  const darker = Math.min(lA, lB)
  return (lighter + 0.05) / (darker + 0.05)
}

const allProperties = customProperties(tokensSource)

const colorTokens = new Map<string, string>(
  allProperties.filter(([name]) => name.startsWith('color-')).map(([name, value]) => [name.replace(/^color-/, ''), value]),
)

interface UsablePair {
  inkKey: string
  surfaceKey: string
  usage: string
}

const usablePairs: UsablePair[] = allProperties
  .filter(([name]) => name.startsWith('usable-pair-'))
  .map(([name, value]) => {
    const match = name.match(/^usable-pair-(.+)--on--(.+)$/)
    if (!match) {
      throw new Error(`Malformed usable-pair token name: "--${name}"`)
    }
    return { inkKey: match[1], surfaceKey: match[2], usage: value }
  })

describe('US-23 AC-23.3: WCAG AA contrast for every declared ink-on-surface pair', () => {
  it('carries the CLAUDE.md structured metadata header', () => {
    const header = tokensSource.match(/^\/\*[\s\S]*?\*\//)?.[0] ?? ''
    expect(header).toMatch(/\*\s*related-story:\s*US-23/)
  })

  it('declares at least one usable ink-on-surface pair', () => {
    expect(usablePairs.length).toBeGreaterThan(0)
  })

  it('every declared pair tags a recognised usage class ("body" or "large")', () => {
    for (const { inkKey, surfaceKey, usage } of usablePairs) {
      expect(Object.keys(AA_THRESHOLD)).toContain(usage)
      expect(colorTokens.has(inkKey)).toBe(true)
      expect(colorTokens.has(surfaceKey)).toBe(true)
    }
  })

  it.each(usablePairs.map((pair) => [`${pair.inkKey} on ${pair.surfaceKey} (${pair.usage})`, pair] as const))(
    '%s clears its WCAG AA minimum, computed from the token hex values',
    (_label, pair) => {
      const inkHex = colorTokens.get(pair.inkKey)!
      const surfaceHex = colorTokens.get(pair.surfaceKey)!
      const ratio = contrastRatio(inkHex, surfaceHex)
      const minimum = AA_THRESHOLD[pair.usage]
      expect(ratio).toBeGreaterThanOrEqual(minimum)
    },
  )

  it('the ink colour is near-black but deliberately not pure #000', () => {
    const inkTokenNames = [...colorTokens.keys()].filter((name) => name.startsWith('ink'))
    expect(inkTokenNames.length).toBeGreaterThan(0)
    for (const name of inkTokenNames) {
      const hex = colorTokens.get(name)!
      expect(hex.toLowerCase()).not.toBe('#000000')
    }
    const primaryInk = colorTokens.get('ink')!
    expect(relativeLuminance(primaryInk)).toBeLessThan(0.03)
  })

  it('every palette colour is a neutral grey (or white) — no accent colour', () => {
    for (const [name, hex] of colorTokens) {
      const { r, g, b } = parseHex(hex)
      const spread = Math.max(r, g, b) - Math.min(r, g, b)
      expect(spread).toBeLessThanOrEqual(4)
      void name
    }
  })

  it('sanity-checks the contrast algorithm itself against the WCAG reference extremes', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
  })

  it('the contrast algorithm would catch an under-threshold pair (regression guard)', () => {
    // #999999 on #ffffff is a well-known sub-AA pair (~2.85:1, under both
    // the 4.5:1 body and 3:1 large/non-text minimums) — proves the
    // computation/assertion path actually fails low-contrast combinations
    // rather than trivially passing everything.
    const ratio = contrastRatio('#999999', '#ffffff')
    expect(ratio).toBeLessThan(AA_THRESHOLD.large)
    expect(ratio).toBeLessThan(AA_THRESHOLD.body)

    // #767676 on #ffffff (~4.54:1) clears body but a slightly darker step
    // below it would not — confirms the threshold check is a real boundary,
    // not a tautology.
    const nearBoundary = contrastRatio('#767676', '#ffffff')
    expect(nearBoundary).toBeGreaterThanOrEqual(AA_THRESHOLD.body)
  })
})
