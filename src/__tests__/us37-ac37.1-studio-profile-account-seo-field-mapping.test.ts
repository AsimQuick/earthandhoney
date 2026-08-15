/**
 * ---
 * file: src/__tests__/us37-ac37.1-studio-profile-account-seo-field-mapping.test.ts
 * project: earthandhoney
 * purpose: AC-37.1 evidence — maps every PRD §21.1 "Account (SEO)" bullet,
 *          item-by-item, to the `StudioProfile` global field that carries it
 *          (or, for `businessHours`, the new field AC-37.1 added to close
 *          the one genuine gap), and asserts that field actually exists on
 *          the global. Also guards the Pillar 5 "one owner" requirement this
 *          AC exists to enforce: no second SEO-settings global/collection
 *          may be registered on the Payload config, and no other global may
 *          carry a field with the same name as an Account-SEO field.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.1
 * ---
 */
import fs from 'fs'
import path from 'path'

import type { Field } from 'payload'

import { Navigation } from '@/globals/Navigation'
import { StudioProfile } from '@/globals/StudioProfile'

/** Recursively collects every field name in a Payload field tree, including names nested inside `group`/`array` fields (e.g. `address.city`). */
function allFieldNames(fields: Field[], prefix = ''): string[] {
  const names: string[] = []
  for (const field of fields) {
    if (!('name' in field) || !field.name) continue
    const qualifiedName = prefix ? `${prefix}.${field.name}` : (field.name as string)
    names.push(qualifiedName)
    if ('fields' in field && Array.isArray(field.fields)) {
      names.push(...allFieldNames(field.fields as Field[], qualifiedName))
    }
  }
  return names
}

const studioProfileFieldNames = allFieldNames(StudioProfile.fields)

// PRD §21.1's "Central studio fields" list, mapped item-by-item to the
// `StudioProfile` field(s) that carry it. `publicPhone`/`publicEmail` are
// two fields for the one "public phone/email" bullet; `address.*` are the
// fields nested inside the one "address" bullet's `group`.
const PRD_21_1_FIELD_MAPPING: Array<{ prdItem: string; fieldNames: string[] }> = [
  { prdItem: 'business name', fieldNames: ['businessName'] },
  { prdItem: 'owner name', fieldNames: ['ownerName'] },
  { prdItem: 'description', fieldNames: ['description'] },
  { prdItem: '"Since 2006" or established year', fieldNames: ['establishedYear'] },
  {
    prdItem: 'address',
    fieldNames: ['address.street', 'address.city', 'address.region', 'address.postalCode', 'address.country'],
  },
  { prdItem: 'public phone/email', fieldNames: ['publicPhone', 'publicEmail'] },
  { prdItem: 'service areas', fieldNames: ['serviceAreas', 'serviceAreas.area'] },
  { prdItem: 'social profiles', fieldNames: ['socialProfiles', 'socialProfiles.platform', 'socialProfiles.url'] },
  { prdItem: 'default social image', fieldNames: ['defaultSocialImage'] },
  { prdItem: 'default title pattern', fieldNames: ['defaultTitlePattern'] },
  { prdItem: 'default meta description', fieldNames: ['defaultMetaDescription'] },
  {
    prdItem: 'business hours/contact details where appropriate',
    // "contact details" is already covered by publicPhone/publicEmail/address
    // above; `businessHours` is the one field AC-37.1 added to close the
    // remaining gap — this bullet had no field until this AC.
    fieldNames: ['businessHours'],
  },
]

describe('US-37 AC-37.1: Account-level SEO data comes from StudioProfile and nowhere else', () => {
  it('carries the CLAUDE.md structured metadata header', () => {
    const fileSource = fs.readFileSync(
      path.join(process.cwd(), 'src/__tests__/us37-ac37.1-studio-profile-account-seo-field-mapping.test.ts'),
      'utf8',
    )
    expect(fileSource).toMatch(/^\s*\/\*\*?\s*\n\s*\*\s*---/)
    expect(fileSource).toMatch(/\*\s*related-story:\s*US-37/)
    expect(fileSource).toMatch(/\*\s*related-ac:\s*37\.1/)
  })

  it.each(PRD_21_1_FIELD_MAPPING)('PRD §21.1 "$prdItem" maps to an existing StudioProfile field', ({ fieldNames }) => {
    for (const fieldName of fieldNames) {
      expect(studioProfileFieldNames).toContain(fieldName)
    }
  })

  it('maps every PRD §21.1 bullet to at least one field, with no bullet left unmapped', () => {
    expect(PRD_21_1_FIELD_MAPPING).toHaveLength(12)
    for (const { fieldNames } of PRD_21_1_FIELD_MAPPING) {
      expect(fieldNames.length).toBeGreaterThan(0)
    }
  })

  it('adds businessHours as free text, not a second structured settings shape', () => {
    const businessHours = StudioProfile.fields.find(
      (field): field is Field & { name: string } => 'name' in field && field.name === 'businessHours',
    )
    expect(businessHours?.type).toBe('textarea')
  })

  it('registers no second SEO-settings global on the Payload config — StudioProfile is the only account-level source', () => {
    const configSource = fs.readFileSync(path.join(process.cwd(), 'src/payload.config.ts'), 'utf8')
    const globalsMatch = configSource.match(/globals:\s*\[([^\]]*)\]/)
    const registeredGlobals = (globalsMatch?.[1] ?? '').split(',').map((entry) => entry.trim()).filter(Boolean)
    expect(registeredGlobals).toEqual(['StudioProfile', 'Navigation'])
  })

  it('does not duplicate any Account-SEO field name onto another global', () => {
    const accountSeoFieldNames = new Set(PRD_21_1_FIELD_MAPPING.flatMap((entry) => entry.fieldNames))
    const navigationFieldNames = new Set(allFieldNames(Navigation.fields))
    for (const fieldName of accountSeoFieldNames) {
      expect(navigationFieldNames.has(fieldName)).toBe(false)
    }
  })
})
