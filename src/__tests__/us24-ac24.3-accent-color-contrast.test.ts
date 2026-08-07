/**
 * ---
 * file: src/__tests__/us24-ac24.3-accent-color-contrast.test.ts
 * project: earthandhoney
 * purpose: Verify AC-24.3 — the StudioProfile accent-colour input validates contrast
 *          before it can be saved. The submitted value is checked against the live
 *          token ink and surface values (src/styles/tokens.css), and a value failing
 *          WCAG AA is rejected with a clear admin-facing error naming the measured
 *          ratio and the required one. Exercises both the standalone contrast-checking
 *          module and the wired-up StudioProfile.branding.accentColor field validator,
 *          so a safe-looking hex-format-only input can never reach the database without
 *          the contrast gate actually running.
 * created-by: dev-team
 * related-story: US-24
 * related-ac: 24.3
 * ---
 */
import fs from 'fs'
import path from 'path'

import {
  checkAccentColorContrast,
  validateAccentColorContrast,
} from '@/lib/accentColorContrast'
import { StudioProfile } from '@/globals/StudioProfile'

const FILE_PATH = path.join(process.cwd(), 'src/lib/accentColorContrast.ts')
const fileSource = fs.readFileSync(FILE_PATH, 'utf8')

function accentColorField() {
  const branding = StudioProfile.fields.find((field) => 'name' in field && field.name === 'branding')
  if (!branding || !('fields' in branding) || !Array.isArray(branding.fields)) {
    throw new Error('StudioProfile has no branding group with sub-fields')
  }
  const accentColor = branding.fields.find((field) => 'name' in field && field.name === 'accentColor')
  if (!accentColor) {
    throw new Error('branding group has no accentColor field')
  }
  return accentColor
}

function callFieldValidate(value: unknown) {
  const field = accentColorField()
  const validate = 'validate' in field ? field.validate : undefined
  if (typeof validate !== 'function') {
    throw new Error('accentColor.validate is not a function')
  }
  return validate(value as never, {} as never)
}

describe('US-24 AC-24.3: accent-colour input validates WCAG AA contrast before it can be saved', () => {
  it('carries the CLAUDE.md structured metadata header naming AC-24.3', () => {
    const header = fileSource.match(/^\/\*[\s\S]*?\*\//)?.[0] ?? ''
    expect(header).toMatch(/^\s*\/\*\*?\s*\n\s*\*\s*---/)
    expect(header).toMatch(/\*\s*related-story:\s*US-24/)
    expect(header).toMatch(/\*\s*related-ac:[^\n]*24\.3/)
  })

  it('checks the submitted value against both the token ink and surface values', () => {
    const checks = checkAccentColorContrast('#2B6CB0')
    expect(checks.map((c) => c.against).sort()).toEqual(['ink', 'surface'])
    expect(checks.every((c) => /^#[0-9a-f]{6}$/i.test(c.tokenHex))).toBe(true)
  })

  it('accepts a colour that clears WCAG AA against both the ink and surface tokens', () => {
    // The same example the field's own admin description and the AC-24.2 test use.
    expect(validateAccentColorContrast('#2B6CB0')).toBe(true)
    const checks = checkAccentColorContrast('#2B6CB0')
    for (const check of checks) {
      expect(check.passes).toBe(true)
      expect(check.ratio).toBeGreaterThanOrEqual(check.required)
    }
  })

  it('rejects a near-white accent that fails contrast against the surface token, naming the measured and required ratio', () => {
    const result = validateAccentColorContrast('#f0f0f0')
    expect(result).not.toBe(true)
    expect(typeof result).toBe('string')
    const message = result as string
    expect(message).toMatch(/WCAG AA/)
    expect(message).toMatch(/surface/)

    const surfaceCheck = checkAccentColorContrast('#f0f0f0').find((c) => c.against === 'surface')!
    expect(surfaceCheck.passes).toBe(false)
    expect(message).toContain(`measured ratio ${surfaceCheck.ratio.toFixed(2)}:1`)
    expect(message).toContain(`required at least ${surfaceCheck.required}:1`)
  })

  it('rejects a near-ink accent that fails contrast against the ink token, naming the measured and required ratio', () => {
    const result = validateAccentColorContrast('#202020')
    expect(result).not.toBe(true)
    expect(typeof result).toBe('string')
    const message = result as string
    expect(message).toMatch(/WCAG AA/)
    expect(message).toMatch(/ink/)

    const inkCheck = checkAccentColorContrast('#202020').find((c) => c.against === 'ink')!
    expect(inkCheck.passes).toBe(false)
    expect(message).toContain(`measured ratio ${inkCheck.ratio.toFixed(2)}:1`)
    expect(message).toContain(`required at least ${inkCheck.required}:1`)
  })

  it('the required ratio is the WCAG AA large-text/non-text minimum (3:1), not the stricter body minimum', () => {
    for (const check of checkAccentColorContrast('#2B6CB0')) {
      expect(check.required).toBe(3)
    }
  })

  it('empty/absent values are allowed through (optional field) without invoking the contrast gate', () => {
    expect(callFieldValidate(undefined)).toBe(true)
    expect(callFieldValidate('')).toBe(true)
  })

  it('malformed hex values are still rejected by the format check, before contrast is evaluated', () => {
    expect(callFieldValidate('not-a-colour')).toBe('Accent colour must be a 6-digit hex value, e.g. "#2B6CB0".')
  })

  it('the wired-up StudioProfile field rejects a hex-format-valid but low-contrast accent colour', () => {
    const result = callFieldValidate('#f0f0f0')
    expect(result).not.toBe(true)
    expect(typeof result).toBe('string')
    expect(result as string).toMatch(/WCAG AA/)
  })

  it('the wired-up StudioProfile field accepts a hex-format-valid, high-contrast accent colour', () => {
    expect(callFieldValidate('#2B6CB0')).toBe(true)
  })
})
