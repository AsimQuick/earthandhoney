/**
 * ---
 * file: src/__tests__/us24-ac24.1-studio-profile-global.test.ts
 * project: earthandhoney
 * purpose: Assert the Payload `StudioProfile` global carries exactly the central studio fields PRD §21.1 names, that every field is a plain admin-editable control (no hidden/readOnly/dev-only field types), that the global is registered on the Payload config, and that the collection file carries the CLAUDE.md structured metadata header
 * created-by: dev-team
 * related-story: US-24
 * related-ac: 24.1
 * ---
 */
import fs from 'fs'
import path from 'path'

import type { Field } from 'payload'

import { StudioProfile } from '@/globals/StudioProfile'

const FILE_PATH = path.join(process.cwd(), 'src/globals/StudioProfile.ts')
const fileSource = fs.readFileSync(FILE_PATH, 'utf8')

function topLevelFieldNames(fields: Field[]): string[] {
  return fields.map((field) => ('name' in field ? (field.name as string) : '')).filter(Boolean)
}

describe('US-24 AC-24.1: StudioProfile global carries exactly the central studio fields', () => {
  it('carries the CLAUDE.md structured metadata header', () => {
    const header = fileSource.match(/^\/\*[\s\S]*?\*\//)?.[0] ?? ''
    expect(header).toMatch(/^\s*\/\*\*?\s*\n\s*\*\s*---/)
    expect(header).toMatch(/\*\s*file:\s*src\/globals\/StudioProfile\.ts/)
    expect(header).toMatch(/\*\s*project:\s*earthandhoney/)
    expect(header).toMatch(/\*\s*purpose:/)
    expect(header).toMatch(/\*\s*related-story:\s*US-24/)
    expect(header).toMatch(/\*\s*related-ac:\s*24\.1/)
  })

  it('is a global (not a collection)', () => {
    expect(StudioProfile.slug).toBe('studio-profile')
    expect('slug' in StudioProfile).toBe(true)
  })

  it('exposes exactly the twelve PRD §21.1 studio fields, no more, no fewer', () => {
    const expectedFieldNames = [
      'businessName',
      'ownerName',
      'description',
      'establishedYear',
      'address',
      'publicPhone',
      'publicEmail',
      'serviceAreas',
      'socialProfiles',
      'defaultSocialImage',
      'defaultTitlePattern',
      'defaultMetaDescription',
    ]
    const actualFieldNames = topLevelFieldNames(StudioProfile.fields)
    expect(actualFieldNames.sort()).toEqual([...expectedFieldNames].sort())
    expect(actualFieldNames).toHaveLength(12)
  })

  it('names the business "Earth & Honey Studios" established in 2006 by default', () => {
    const businessName = StudioProfile.fields.find(
      (field) => 'name' in field && field.name === 'businessName',
    )
    const establishedYear = StudioProfile.fields.find(
      (field) => 'name' in field && field.name === 'establishedYear',
    )
    expect(businessName && 'defaultValue' in businessName ? businessName.defaultValue : undefined).toBe(
      'Earth & Honey Studios',
    )
    expect(
      establishedYear && 'defaultValue' in establishedYear ? establishedYear.defaultValue : undefined,
    ).toBe(2006)
  })

  it('gives publicEmail an email-type field so it is validated in the admin UI', () => {
    const publicEmail = StudioProfile.fields.find(
      (field) => 'name' in field && field.name === 'publicEmail',
    )
    expect(publicEmail?.type).toBe('email')
  })

  it('every field is a photographer-editable admin control: none are hidden, readOnly, or a dev-only field type', () => {
    const devOnlyFieldTypes = ['json', 'code', 'point']
    const walk = (fields: Field[]) => {
      for (const field of fields) {
        expect(devOnlyFieldTypes).not.toContain(field.type)
        if ('admin' in field && field.admin) {
          const admin = field.admin as { hidden?: boolean; readOnly?: boolean }
          expect(admin.hidden).not.toBe(true)
          expect(admin.readOnly).not.toBe(true)
        }
        if ('fields' in field && Array.isArray(field.fields)) {
          walk(field.fields as Field[])
        }
      }
    }
    walk(StudioProfile.fields)
  })

  it('is registered as a global on the Payload config', () => {
    const configSource = fs.readFileSync(path.join(process.cwd(), 'src/payload.config.ts'), 'utf8')
    expect(configSource).toMatch(/import\s*\{\s*StudioProfile\s*\}\s*from\s*['"]\.\/globals\/StudioProfile['"]/)
    expect(configSource).toMatch(/globals:\s*\[\s*StudioProfile\s*\]/)
  })
})
