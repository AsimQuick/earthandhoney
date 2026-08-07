/**
 * ---
 * file: src/__tests__/us23-ac23.6-token-export.test.ts
 * project: earthandhoney
 * purpose: Verify AC-23.6 — the design tokens are exported as a generated,
 *          checked-in plain CSS custom-property file with no Tailwind or
 *          Next.js dependency, documented with a section showing how one
 *          gallery-style-templates-baseline variant would reference it, and
 *          reproducible from the source tokens (regenerating from the live
 *          src/styles/tokens.css and diffing against the checked-in export
 *          must be an empty diff).
 * created-by: dev-team
 * related-story: US-23
 * related-ac: 23.6
 * ---
 */
import fs from 'fs'
import path from 'path'

import { EXPORT_OUTPUT_PATH, GALLERY_TEMPLATE_EXAMPLE_PATH, generateTokenExportCss } from '@/lib/tokenExport'
import { readTokensSource } from '@/lib/designTokenSpecimen'

const EXPORT_PATH = path.join(process.cwd(), EXPORT_OUTPUT_PATH)
const checkedInExport = fs.readFileSync(EXPORT_PATH, 'utf8')

describe('US-23 AC-23.6: token export for Backstage / Project Room templates', () => {
  it('carries the CLAUDE.md structured metadata header', () => {
    const header = checkedInExport.match(/^\/\*[\s\S]*?---[\s\S]*?---[\s\S]*?\*\//)?.[0] ?? ''
    expect(header).toMatch(/file:\s*exports\/design-tokens\/tokens\.css/)
    expect(header).toMatch(/project:\s*earthandhoney/)
    expect(header).toMatch(/purpose:/)
    expect(header).toMatch(/related-story:\s*US-23/)
    expect(header).toMatch(/related-ac:\s*23\.6/)
  })

  it('is a generated, checked-in file (exists at the declared export path)', () => {
    expect(fs.existsSync(EXPORT_PATH)).toBe(true)
  })

  it('is plain CSS with no Tailwind or Next.js dependency', () => {
    expect(checkedInExport).not.toMatch(/@theme/)
    expect(checkedInExport).not.toMatch(/@tailwind/)
    expect(checkedInExport).not.toMatch(/@import\s+["']tailwindcss["']/)
    expect(checkedInExport).not.toMatch(/next\/font/)
    // Declares tokens on a plain :root selector any browser or CSS
    // preprocessor understands with no build step.
    expect(checkedInExport).toMatch(/:root\s*\{/)
  })

  it("documents how one gallery-style-templates-baseline variant would reference it", () => {
    expect(checkedInExport).toContain(GALLERY_TEMPLATE_EXAMPLE_PATH)
    expect(fs.existsSync(path.join(process.cwd(), GALLERY_TEMPLATE_EXAMPLE_PATH))).toBe(true)
    // The documented example must reference tokens this export actually
    // declares, not illustrative names that don't exist.
    const referenced = [...checkedInExport.matchAll(/--gallery-\w[\w-]*:\s*var\((--[\w-]+)\)/g)].map(
      (match) => match[1],
    )
    expect(referenced.length).toBeGreaterThan(0)
    for (const tokenRef of referenced) {
      expect(checkedInExport).toMatch(new RegExp(`\\n\\s*${tokenRef}:`))
    }
  })

  it('the fork templates are not modified by this export (baseline stays byte-identical)', () => {
    // PICPEAK_PORT_LEDGER.md requires these baseline copies to stay
    // byte-identical to what upstream shipped; this AC only documents an
    // illustrative reference, it does not rewire the fork's templates.
    const baseline = fs.readFileSync(path.join(process.cwd(), GALLERY_TEMPLATE_EXAMPLE_PATH), 'utf8')
    expect(baseline).not.toContain('var(--color-')
    expect(baseline).not.toContain('AC-23.6')
  })

  it('declares every token category the source of truth defines (excluding contrast metadata)', () => {
    for (const prefix of [
      '--font-display',
      '--font-sans',
      '--font-combo-',
      '--color-',
      '--text-',
      '--leading-',
      '--measure-',
      '--spacing-',
      '--gallery-gap-',
      '--radius-',
      '--overlay-',
      '--vignette-',
      '--breakpoint-',
      '--motion-',
    ]) {
      expect(checkedInExport).toContain(prefix)
    }
    // usable-pair-* is AC-23.3 contrast metadata (values like "body"/
    // "large"), not a design value a template could consume with var().
    expect(checkedInExport).not.toContain('--usable-pair-')
  })

  it('regenerating from the live source tokens reproduces the checked-in file exactly (empty diff)', () => {
    const liveTokensSource = readTokensSource()
    const regenerated = generateTokenExportCss(liveTokensSource)
    expect(regenerated).toBe(checkedInExport)
  })

  it('is deterministic across repeated regenerations of the same source', () => {
    const liveTokensSource = readTokensSource()
    const first = generateTokenExportCss(liveTokensSource)
    const second = generateTokenExportCss(liveTokensSource)
    expect(first).toBe(second)
  })
})
