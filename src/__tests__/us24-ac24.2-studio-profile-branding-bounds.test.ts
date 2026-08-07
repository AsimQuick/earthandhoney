/**
 * ---
 * file: src/__tests__/us24-ac24.2-studio-profile-branding-bounds.test.ts
 * project: earthandhoney
 * purpose: Assert `StudioProfile`'s branding controls are bounded to exactly PRD §12.3's
 *          list — logo, accent colour from a validated safe input, one approved font
 *          pairing drawn from the token set's approved combinations, and site
 *          identity/contact details — and that no field anywhere in `StudioProfile`
 *          permits arbitrary CSS, layout, margin, padding, or component positioning.
 * created-by: dev-team
 * related-story: US-24
 * related-ac: 24.2
 * ---
 */
import fs from 'fs'
import path from 'path'

import type { Field } from 'payload'

import { getApprovedFontPairingNames } from '@/lib/approvedFontPairings'
import { StudioProfile } from '@/globals/StudioProfile'

const FILE_PATH = path.join(process.cwd(), 'src/globals/StudioProfile.ts')
const fileSource = fs.readFileSync(FILE_PATH, 'utf8')

// Field types that could smuggle in arbitrary/free-form CSS, layout, or positioning
// control (a raw code/JSON escape hatch, or a point/coordinate field).
const FORBIDDEN_FIELD_TYPES = ['code', 'json', 'point', 'richText']

// Words a branding field name, label, or admin description must never contain — each
// names a Pillar-3-forbidden capability (arbitrary CSS, layout, margin, padding, or
// component positioning) rather than a bounded PRD §12.3 control.
const FORBIDDEN_KEYWORDS = [
  'css',
  'stylesheet',
  'inline style',
  'layout',
  'margin',
  'padding',
  'position',
  'z-index',
  'zindex',
  'component position',
]

interface CollectedField {
  path: string
  field: Field
}

function collectFields(fields: Field[], prefix = ''): CollectedField[] {
  const collected: CollectedField[] = []
  for (const field of fields) {
    const name = 'name' in field ? (field.name as string) : ''
    const currentPath = name ? `${prefix}${name}` : prefix
    collected.push({ path: currentPath, field })
    if ('fields' in field && Array.isArray(field.fields)) {
      collected.push(...collectFields(field.fields as Field[], `${currentPath}.`))
    }
  }
  return collected
}

function findBrandingGroup(): Field {
  const branding = StudioProfile.fields.find((field) => 'name' in field && field.name === 'branding')
  if (!branding) {
    throw new Error('StudioProfile has no `branding` group field')
  }
  return branding
}

function brandingSubFields(): Field[] {
  const branding = findBrandingGroup()
  if (!('fields' in branding) || !Array.isArray(branding.fields)) {
    throw new Error('StudioProfile.branding is not a group with sub-fields')
  }
  return branding.fields as Field[]
}

describe('US-24 AC-24.2: StudioProfile branding controls are bounded to exactly PRD §12.3', () => {
  it('carries the CLAUDE.md structured metadata header naming AC-24.2', () => {
    const header = fileSource.match(/^\/\*[\s\S]*?\*\//)?.[0] ?? ''
    expect(header).toMatch(/^\s*\/\*\*?\s*\n\s*\*\s*---/)
    expect(header).toMatch(/\*\s*related-story:\s*US-24/)
    expect(header).toMatch(/\*\s*related-ac:[^\n]*24\.2/)
  })

  it('exposes exactly a `branding` group carrying exactly logo, accentColor, and fontPairing', () => {
    const names = brandingSubFields().map((field) => ('name' in field ? field.name : ''))
    expect(names.sort()).toEqual(['accentColor', 'fontPairing', 'logo'].sort())
    expect(names).toHaveLength(3)
  })

  it('logo is an upload field, not a free-form asset/URL/HTML field', () => {
    const logo = brandingSubFields().find((field) => 'name' in field && field.name === 'logo')
    expect(logo?.type).toBe('upload')
    expect(logo && 'relationTo' in logo ? logo.relationTo : undefined).toBe('media')
  })

  it('accentColor is a plain text field validated as a 6-digit hex value — a safe input, not an open style field', () => {
    const accentColor = brandingSubFields().find((field) => 'name' in field && field.name === 'accentColor')
    expect(accentColor?.type).toBe('text')
    expect(accentColor && 'validate' in accentColor ? typeof accentColor.validate : undefined).toBe('function')

    const validate = accentColor && 'validate' in accentColor ? accentColor.validate : undefined
    if (typeof validate !== 'function') {
      throw new Error('accentColor.validate is not a function')
    }
    // options arg is unused by the validator; a permissive cast keeps this a black-box call
    const call = (value: unknown) => validate(value as never, {} as never)

    expect(call('#2B6CB0')).toBe(true)
    expect(call(undefined)).toBe(true)
    expect(call('')).toBe(true)
    expect(call('not-a-colour')).not.toBe(true)
    expect(call('red')).not.toBe(true)
    expect(call('#FFF')).not.toBe(true)
    expect(call('background:#fff;position:absolute')).not.toBe(true)
  })

  it('fontPairing is a required select whose options are exactly the token set\'s approved combinations', () => {
    const fontPairing = brandingSubFields().find((field) => 'name' in field && field.name === 'fontPairing')
    expect(fontPairing?.type).toBe('select')
    expect(fontPairing && 'required' in fontPairing ? fontPairing.required : undefined).toBe(true)

    const options = fontPairing && 'options' in fontPairing ? fontPairing.options : undefined
    const optionValues = (options as Array<{ value: string }> | undefined)?.map((option) => option.value) ?? []
    const approved = getApprovedFontPairingNames()

    expect(approved.length).toBeGreaterThan(0)
    expect(approved.length).toBeLessThanOrEqual(3)
    expect(optionValues.sort()).toEqual([...approved].sort())
  })

  it('site identity/contact details (PRD §12.3) are already covered by the AC-24.1 fields, not duplicated here', () => {
    const topLevelNames = StudioProfile.fields.map((field) => ('name' in field ? field.name : ''))
    expect(topLevelNames).toEqual(
      expect.arrayContaining(['businessName', 'address', 'publicPhone', 'publicEmail', 'branding']),
    )
  })

  it('exposes no field anywhere in StudioProfile for arbitrary CSS, layout, margin, padding, or component positioning', () => {
    const all = collectFields(StudioProfile.fields)
    for (const { path: fieldPath, field } of all) {
      expect(FORBIDDEN_FIELD_TYPES).not.toContain(field.type)

      const haystacks: string[] = [fieldPath.toLowerCase()]
      if ('label' in field && typeof field.label === 'string') {
        haystacks.push(field.label.toLowerCase())
      }
      if ('admin' in field && field.admin && typeof field.admin === 'object') {
        const admin = field.admin as { description?: unknown }
        if (typeof admin.description === 'string') {
          haystacks.push(admin.description.toLowerCase())
        }
      }

      for (const keyword of FORBIDDEN_KEYWORDS) {
        for (const haystack of haystacks) {
          // "position" would false-positive on unrelated admin copy that never
          // appears here; this repo's StudioProfile has no such field, so an
          // exact substring match is the correct (not over-broad) check.
          expect(haystack.includes(keyword)).toBe(false)
        }
      }
    }
  })

  it('the branding group has its own admin description scoping it to PRD §12.3', () => {
    const branding = findBrandingGroup()
    const description =
      'admin' in branding && branding.admin && typeof branding.admin === 'object'
        ? (branding.admin as { description?: unknown }).description
        : undefined
    expect(typeof description).toBe('string')
    expect(description as string).toMatch(/§12\.3/)
  })
})
