/**
 * ---
 * file: src/lib/style-guard/detectNonTokenTailwindClasses.ts
 * project: earthandhoney
 * purpose: AC-31.3 — an allowlist-based classifier for Tailwind utility
 *          class names, extending src/lib/style-guard/ alongside US-23
 *          AC-23.7's detectStyleDrift.ts. detectStyleDrift catches a raw hex
 *          colour, a raw px font-size, and Tailwind's `[...]`
 *          arbitrary-value syntax — but a *named* Tailwind default (e.g.
 *          `py-8`, `rounded-2xl`, `text-6xl`) is syntactically ordinary
 *          Tailwind, not caught by any of those three patterns, and yet is
 *          exactly the kind of hard-coded spacing/radius/colour/font value
 *          AC-31.3 forbids: every step this project actually defines is a
 *          *named* scale entry in src/styles/tokens.css
 *          (xs/sm/md/lg/xl/2xl/3xl, none/sm/md/lg/full, ink/surface/border,
 *          etc.), verified in this file's own tests to compile to that
 *          token's CSS variable, not a bare digit — so a Tailwind utility
 *          whose suffix isn't one of those exact names, and isn't a
 *          value-free structural keyword, can only be reaching past the
 *          token set for Tailwind's own built-in default.
 * created-by: dev-team
 * related-story: US-31
 * related-ac: 31.3
 * ---
 */

// Named scale steps read directly from src/styles/tokens.css.
const TOKEN_SPACING_SUFFIXES = new Set(['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'])
const TOKEN_RADIUS_SUFFIXES = new Set(['none', 'sm', 'md', 'lg', 'full'])
const TOKEN_TEXT_SIZE_SUFFIXES = new Set(['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'])
const TOKEN_LEADING_SUFFIXES = new Set(['tight', 'snug', 'normal', 'relaxed', 'loose'])
const TOKEN_COLOR_SUFFIXES = new Set(['ink', 'ink-secondary', 'ink-tertiary', 'surface', 'surface-muted', 'border'])
const TOKEN_FONT_FAMILY_SUFFIXES = new Set(['display', 'sans'])

// Tailwind's own responsive/state variant prefixes. These select *which*
// token/structural utility applies, they don't introduce a value of their
// own, so a known variant is stripped before classification.
const RESPONSIVE_VARIANTS = new Set(['sm', 'md', 'lg', 'xl', '2xl'])
const STATE_VARIANTS = new Set(['hover', 'focus', 'focus-visible', 'active', 'disabled'])

// Utilities that carry no scale value at all — layout/display/position
// keywords no token category could ever apply to.
const STRUCTURAL_CLASSNAMES = new Set([
  'flex',
  'flex-col',
  'flex-row',
  'flex-wrap',
  'block',
  'inline-block',
  'inline',
  'grid',
  'items-center',
  'items-start',
  'items-end',
  'justify-center',
  'justify-between',
  'justify-start',
  'w-full',
  'h-full',
  'max-w-full',
  'relative',
  'absolute',
  'text-center',
  'text-left',
  'text-right',
  'sr-only',
])

const SPACING_PREFIXES = [
  'gap-x',
  'gap-y',
  'gap',
  'space-x',
  'space-y',
  'px',
  'py',
  'pt',
  'pr',
  'pb',
  'pl',
  'p',
  'mx',
  'my',
  'mt',
  'mr',
  'mb',
  'ml',
  'm',
]

function stripVariants(className: string): string {
  const segments = className.split(':')
  const base = segments.pop() ?? className
  const allSegmentsKnown = segments.every(
    (segment) => RESPONSIVE_VARIANTS.has(segment) || STATE_VARIANTS.has(segment),
  )
  return allSegmentsKnown ? base : className
}

function matchesSpacingScale(base: string): boolean {
  const prefix = SPACING_PREFIXES.find((candidate) => base.startsWith(`${candidate}-`))
  if (!prefix) return false
  const suffix = base.slice(prefix.length + 1)
  return TOKEN_SPACING_SUFFIXES.has(suffix)
}

function matchesRadiusScale(base: string): boolean {
  if (base !== 'rounded' && !base.startsWith('rounded-')) return false
  const suffix = base === 'rounded' ? '' : base.slice('rounded-'.length)
  return TOKEN_RADIUS_SUFFIXES.has(suffix)
}

function matchesTextScale(base: string): boolean {
  if (!base.startsWith('text-')) return false
  const suffix = base.slice('text-'.length)
  return TOKEN_TEXT_SIZE_SUFFIXES.has(suffix) || TOKEN_COLOR_SUFFIXES.has(suffix)
}

function matchesLeadingScale(base: string): boolean {
  return base.startsWith('leading-') && TOKEN_LEADING_SUFFIXES.has(base.slice('leading-'.length))
}

function matchesColorScale(base: string): boolean {
  for (const prefix of ['bg', 'border']) {
    if (base.startsWith(`${prefix}-`) && TOKEN_COLOR_SUFFIXES.has(base.slice(prefix.length + 1))) {
      return true
    }
  }
  return false
}

function matchesFontFamilyScale(base: string): boolean {
  return base.startsWith('font-') && TOKEN_FONT_FAMILY_SUFFIXES.has(base.slice('font-'.length))
}

export function isTokenBackedOrStructuralClassName(className: string): boolean {
  const base = stripVariants(className)
  if (STRUCTURAL_CLASSNAMES.has(base)) return true
  return (
    matchesSpacingScale(base) ||
    matchesRadiusScale(base) ||
    matchesTextScale(base) ||
    matchesLeadingScale(base) ||
    matchesColorScale(base) ||
    matchesFontFamilyScale(base)
  )
}

function classNamesIn(source: string): string[] {
  const classAttrs = [...source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)]
  return classAttrs.flatMap((match) => (match[1] ?? match[2] ?? '').split(/\s+/).filter(Boolean))
}

export function detectNonTokenTailwindClasses(source: string): string[] {
  return classNamesIn(source).filter((className) => !isTokenBackedOrStructuralClassName(className))
}
