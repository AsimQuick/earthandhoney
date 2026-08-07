/**
 * ---
 * file: src/lib/designTokenSpecimen.ts
 * project: earthandhoney
 * purpose: AC-23.5 — shared parsing/computation the internal token-specimen
 *          route reads from src/styles/tokens.css (the AC-23.1 source of
 *          truth) so the specimen always reflects the live token values
 *          rather than a hand-copied duplicate. Reuses the same WCAG
 *          contrast-ratio algorithm AC-23.3's test suite validates, so the
 *          ratios the specimen shows a human are the same numbers the AA
 *          gate enforces.
 * created-by: dev-team
 * related-story: US-23
 * related-ac: 23.5
 * ---
 */
import fs from 'fs'
import path from 'path'

export const TOKENS_PATH = path.join(process.cwd(), 'src/styles/tokens.css')

export function readTokensSource(): string {
  return fs.readFileSync(TOKENS_PATH, 'utf8')
}

export function parseCustomProperties(source: string): Array<[string, string]> {
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

export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA)
  const lB = relativeLuminance(hexB)
  const lighter = Math.max(lA, lB)
  const darker = Math.min(lA, lB)
  return (lighter + 0.05) / (darker + 0.05)
}

export const AA_THRESHOLD: Record<string, number> = {
  body: 4.5,
  large: 3,
}

export interface UsablePairSpecimen {
  inkKey: string
  surfaceKey: string
  usage: string
  inkHex: string
  surfaceHex: string
  ratio: number
  minimum: number
  passes: boolean
}

export interface TokenSpecimenData {
  typeScale: Array<[string, string]>
  colorPalette: Array<[string, string]>
  usablePairs: UsablePairSpecimen[]
  spacingScale: Array<[string, string]>
  galleryGaps: Array<[string, string]>
  radii: Array<[string, string]>
  overlaysAndVignettes: Array<[string, string]>
}

export function loadTokenSpecimenData(): TokenSpecimenData {
  const source = readTokensSource()
  const all = parseCustomProperties(source)
  const by = (predicate: (name: string) => boolean) => all.filter(([name]) => predicate(name))

  const colorTokens = new Map<string, string>(
    by((name) => name.startsWith('color-')).map(([name, value]) => [name.replace(/^color-/, ''), value]),
  )

  const usablePairs: UsablePairSpecimen[] = by((name) => name.startsWith('usable-pair-')).map(([name, usage]) => {
    const match = name.match(/^usable-pair-(.+)--on--(.+)$/)
    if (!match) {
      throw new Error(`Malformed usable-pair token name: "--${name}"`)
    }
    const [, inkKey, surfaceKey] = match
    const inkHex = colorTokens.get(inkKey)!
    const surfaceHex = colorTokens.get(surfaceKey)!
    const ratio = contrastRatio(inkHex, surfaceHex)
    const minimum = AA_THRESHOLD[usage]
    return { inkKey, surfaceKey, usage, inkHex, surfaceHex, ratio, minimum, passes: ratio >= minimum }
  })

  return {
    typeScale: by((name) => name.startsWith('text-')),
    colorPalette: by((name) => name.startsWith('color-')),
    usablePairs,
    spacingScale: by((name) => name.startsWith('spacing-')),
    galleryGaps: by((name) => name.startsWith('gallery-gap-')),
    radii: by((name) => name.startsWith('radius-')),
    overlaysAndVignettes: by((name) => name.startsWith('overlay-') || name.startsWith('vignette-')),
  }
}
