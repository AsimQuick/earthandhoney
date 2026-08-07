/**
 * ---
 * file: src/lib/tokenExport.ts
 * project: earthandhoney
 * purpose: AC-23.6 — generate a plain, framework-free CSS custom-property
 *          export of the AC-23.1 token source of truth
 *          (src/styles/tokens.css) so Backstage and Project Room templates
 *          can consume the same design tokens as Frontstage with no
 *          Tailwind or Next.js dependency. Pure function, reused by both
 *          scripts/generate-design-tokens-export.ts (the regeneration CLI)
 *          and this AC's test (which regenerates from the live source and
 *          diffs against the checked-in file to prove reproducibility).
 * created-by: dev-team
 * related-story: US-23
 * related-ac: 23.6
 * ---
 */
import { parseCustomProperties } from './designTokenSpecimen'

export const EXPORT_OUTPUT_PATH = 'exports/design-tokens/tokens.css'
export const GALLERY_TEMPLATE_EXAMPLE_PATH = 'gallery-style-templates-baseline/elegant-dark.css'

interface TokenCategory {
  title: string
  test: (name: string) => boolean
}

// Same twelve PRD §12.2 categories AC-23.1's test enumerates, in the same
// order as src/styles/tokens.css. "usable-pair-*" is deliberately excluded:
// it is AC-23.3 contrast metadata (values like "body"/"large"), not a
// design-value category a consuming template could reference with var().
const CATEGORIES: TokenCategory[] = [
  { title: 'Font families', test: (name) => name === 'font-display' || name === 'font-sans' },
  { title: 'Font combinations', test: (name) => name.startsWith('font-combo-') },
  { title: 'Colour palette', test: (name) => name.startsWith('color-') },
  { title: 'Type scale', test: (name) => name.startsWith('text-') },
  { title: 'Line heights', test: (name) => name.startsWith('leading-') },
  { title: 'Text measures', test: (name) => name.startsWith('measure-') },
  { title: 'Spacing scale', test: (name) => name.startsWith('spacing-') },
  { title: 'Gallery gaps', test: (name) => name.startsWith('gallery-gap-') },
  { title: 'Radii', test: (name) => name.startsWith('radius-') },
  {
    title: 'Overlay and vignette presets',
    test: (name) => name.startsWith('overlay-') || name.startsWith('vignette-'),
  },
  { title: 'Breakpoints', test: (name) => name.startsWith('breakpoint-') },
  { title: 'Animation timing', test: (name) => name.startsWith('motion-') },
]

const HEADER = `/*
 * ---
 * file: ${EXPORT_OUTPUT_PATH}
 * project: earthandhoney
 * purpose: AC-23.6 — plain CSS custom-property export of the design-token
 *          source of truth (src/styles/tokens.css), so Backstage and
 *          Project Room templates can consume the tokens as consumers from
 *          day one, with no Tailwind or Next.js dependency.
 * created-by: dev-team
 * related-story: US-23
 * related-ac: 23.6
 * ---
 *
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run tokens:export
 * Source of truth: src/styles/tokens.css
 *
 * Usage
 * -----
 * Plain CSS, no build step required: link or @import this file directly.
 * A consuming template reads a token with var(--token-name), the same way
 * PicPeak's own gallery-style templates already read their own --gallery-*
 * custom properties.
 *
 * Example — how one gallery-style-templates-baseline variant would
 * reference these tokens (illustrative only; the fork's own templates are
 * not rewired in this story). ${GALLERY_TEMPLATE_EXAMPLE_PATH} declares its
 * own custom properties on ".gallery-page"; sourcing them from this export
 * instead of its current hard-coded hex/px values would look like:
 *
 *   .gallery-page {
 *     --gallery-bg: var(--color-surface);
 *     --gallery-text: var(--color-ink);
 *     --gallery-text-muted: var(--color-ink-tertiary);
 *     --gallery-accent: var(--color-ink-secondary);
 *     --gallery-border: var(--color-border);
 *     --gallery-radius: var(--radius-md);
 *     --gallery-spacing: var(--spacing-sm);
 *   }
 */`

export function generateTokenExportCss(tokensSource: string): string {
  const all = parseCustomProperties(tokensSource)

  const body = CATEGORIES.map(({ title, test }) => {
    const properties = all.filter(([name]) => test(name))
    if (properties.length === 0) {
      return ''
    }
    const lines = properties.map(([name, value]) => `  --${name}: ${value};`).join('\n')
    return `  /* ${title} */\n${lines}`
  })
    .filter((section) => section.length > 0)
    .join('\n\n')

  return `${HEADER}\n\n:root {\n${body}\n}\n`
}
