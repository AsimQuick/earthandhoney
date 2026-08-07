/**
 * ---
 * file: src/lib/accentColorContrast.ts
 * project: earthandhoney
 * purpose: AC-24.3 — validates a submitted accent-colour hex value against the live
 *          design-token ink and surface values (src/styles/tokens.css, AC-23.1) before
 *          StudioProfile can save it. Reuses the same WCAG contrast-ratio algorithm
 *          AC-23.3/AC-23.5 already validate the token palette against, so the ratio
 *          reported to the photographer is the same number the token contrast gate
 *          computes elsewhere. The accent colour is a UI/graphical control (PRD §12.3),
 *          not body copy, so it is held to the WCAG AA "large text / non-text
 *          indicators" minimum (3:1) against both the ink and the surface token — the
 *          only band a single hue can clear against both a near-black ink and a white
 *          surface at once; the stricter 4.5:1 body minimum is mathematically
 *          unsatisfiable against both simultaneously and would make the field unusable.
 * created-by: dev-team
 * related-story: US-24
 * related-ac: 24.3
 * ---
 */
import { AA_THRESHOLD, contrastRatio, parseCustomProperties, readTokensSource } from './designTokenSpecimen'

const REQUIRED_RATIO = AA_THRESHOLD.large

function tokenColor(name: string): string {
  const match = parseCustomProperties(readTokensSource()).find(([tokenName]) => tokenName === `color-${name}`)
  if (!match) {
    throw new Error(`Design token "--color-${name}" is not declared in src/styles/tokens.css`)
  }
  return match[1]
}

export interface AccentContrastCheck {
  against: 'ink' | 'surface'
  tokenHex: string
  ratio: number
  required: number
  passes: boolean
}

export function checkAccentColorContrast(accentHex: string): AccentContrastCheck[] {
  const inkHex = tokenColor('ink')
  const surfaceHex = tokenColor('surface')
  return (
    [
      { against: 'ink', tokenHex: inkHex },
      { against: 'surface', tokenHex: surfaceHex },
    ] as const
  ).map(({ against, tokenHex }) => {
    const ratio = contrastRatio(accentHex, tokenHex)
    return { against, tokenHex, ratio, required: REQUIRED_RATIO, passes: ratio >= REQUIRED_RATIO }
  })
}

/** Returns `true` when safe to save, or an admin-facing error naming the measured and required ratios. */
export function validateAccentColorContrast(accentHex: string): true | string {
  const failures = checkAccentColorContrast(accentHex).filter((check) => !check.passes)
  if (failures.length === 0) {
    return true
  }
  const clauses = failures.map(
    (failure) =>
      `${failure.against} token (${failure.tokenHex}): measured ratio ${failure.ratio.toFixed(2)}:1, required at least ${failure.required}:1`,
  )
  return `Accent colour "${accentHex}" fails WCAG AA contrast against the ${clauses.join('; and the ')}.`
}
