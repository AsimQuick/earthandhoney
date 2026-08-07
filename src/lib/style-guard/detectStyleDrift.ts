/**
 * ---
 * file: src/lib/style-guard/detectStyleDrift.ts
 * project: earthandhoney
 * purpose: AC-23.7 style-drift detector — the shared pattern-matching core
 *          used both to unit-test detection in isolation and to scan real
 *          files under src/components/ and src/app/ for a raw hex colour, a
 *          raw px font-size, or an arbitrary-value Tailwind class outside
 *          the token source file. Kept separate from the token source
 *          (src/styles/tokens.css) so this module itself never trips its
 *          own rule.
 * created-by: dev-team
 * related-story: US-23
 * related-ac: 23.7
 * ---
 */

export type StyleDriftCategory = 'hex' | 'rawPxFontSize' | 'arbitraryTailwindBracket'

export type StyleDriftMatch = {
  category: StyleDriftCategory
  text: string
}

const HEX_COLOUR = /#[0-9a-fA-F]{3,8}\b/g
const RAW_PX_FONT_SIZE =
  /(font-size\s*:\s*[\d.]+px)|(fontSize\s*:\s*['"`][\d.]+px['"`])|(\btext-\[[^\]]*px[^\]]*\])/gi
const ARBITRARY_TAILWIND_BRACKET = /\b[a-zA-Z][a-zA-Z0-9-]*-\[[^\]]+\]/g

// Structured-metadata headers and other block comments legitimately contain
// prose that can coincidentally match these patterns (e.g. a comment
// documenting a legacy hex value), so detection only runs against the
// source with block comments stripped.
export function stripBlockComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '')
}

function matchesOf(source: string, category: StyleDriftCategory, pattern: RegExp): StyleDriftMatch[] {
  return [...source.matchAll(pattern)].map((match) => ({ category, text: match[0] }))
}

export function detectStyleDrift(rawSource: string): StyleDriftMatch[] {
  const source = stripBlockComments(rawSource)
  return [
    ...matchesOf(source, 'hex', HEX_COLOUR),
    ...matchesOf(source, 'rawPxFontSize', RAW_PX_FONT_SIZE),
    ...matchesOf(source, 'arbitraryTailwindBracket', ARBITRARY_TAILWIND_BRACKET),
  ]
}

export function countByCategory(matches: StyleDriftMatch[]): Record<StyleDriftCategory, number> {
  return {
    hex: matches.filter((match) => match.category === 'hex').length,
    rawPxFontSize: matches.filter((match) => match.category === 'rawPxFontSize').length,
    arbitraryTailwindBracket: matches.filter((match) => match.category === 'arbitraryTailwindBracket')
      .length,
  }
}
