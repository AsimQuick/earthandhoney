/**
 * ---
 * file: src/__tests__/us33-ac33.1-forms-field-set.test.ts
 * project: earthandhoney
 * purpose: Verify AC-33.1 — the Payload `Forms` collection implements the
 *          PRD §20.2 configurable set one-to-one, offers exactly the seven
 *          PRD §20.2 V1 field types, and carries no conditional-logic
 *          engine. Mirrors the AC-31.1 `Pages` field-mapping pattern: every
 *          PRD §20.2 configurable item maps to exactly one collection field
 *          path, in both directions.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.1
 * ---
 */
import fs from 'fs'
import path from 'path'

import type { Field } from 'payload'

import { FORM_FIELD_TYPE_OPTIONS, Forms } from '@/collections/Forms'

const FILE_PATH = path.join(process.cwd(), 'src/collections/Forms.ts')
const fileSource = fs.readFileSync(FILE_PATH, 'utf8')

function fieldByName(fields: Field[], name: string): Field | undefined {
  return fields.find((field) => 'name' in field && field.name === name)
}

function subFieldsOf(field: Field | undefined): Field[] {
  return field && 'fields' in field && Array.isArray(field.fields) ? (field.fields as Field[]) : []
}

// PRD §20.2 "The photographer may configure" list, item for item, mapped to
// the collection field path that implements it. Three items (field order,
// labels/helper text, required/optional status) are properties of the
// `fields` array's items rather than distinct top-level fields — array
// order IS field order, so there is no separate ordering field to map.
const PRD_20_2_CONFIGURABLE_MAP: Array<{ prdItem: string; topLevelField: string }> = [
  { prdItem: 'internal name', topLevelField: 'internalName' },
  { prdItem: 'public title', topLevelField: 'publicTitle' },
  { prdItem: 'description', topLevelField: 'description' },
  { prdItem: 'recipient(s)', topLevelField: 'recipients' },
  { prdItem: 'success message', topLevelField: 'successMessage' },
  { prdItem: 'field order', topLevelField: 'fields' },
  { prdItem: 'labels and helper text', topLevelField: 'fields' },
  { prdItem: 'required/optional status', topLevelField: 'fields' },
  { prdItem: 'Early Booking Benefits footer/link', topLevelField: 'earlyBookingBenefits' },
]

// The PRD §20.2 "V1 fields" list, verbatim and in order.
const PRD_20_2_V1_FIELD_TYPES = [
  'short text',
  'email',
  'phone',
  'date',
  'dropdown',
  'checkbox/consent',
  'long text',
]

describe('US-33 AC-33.1: Forms carries the CLAUDE.md structured metadata header', () => {
  it('carries the CLAUDE.md structured metadata header', () => {
    const header = fileSource.match(/^\/\*[\s\S]*?\*\//)?.[0] ?? ''
    expect(header).toMatch(/^\s*\/\*\*?\s*\n\s*\*\s*---/)
    expect(header).toMatch(/\*\s*file:\s*src\/collections\/Forms\.ts/)
    expect(header).toMatch(/\*\s*project:\s*earthandhoney/)
    expect(header).toMatch(/\*\s*purpose:/)
    expect(header).toMatch(/\*\s*related-story:\s*US-33/)
    expect(header).toMatch(/\*\s*related-ac:\s*33\.1/)
  })
})

describe('US-33 AC-33.1: Forms is a collection with the expected slug', () => {
  it('is a collection with the expected slug', () => {
    expect(Forms.slug).toBe('forms')
  })

  it('is registered as a collection on the Payload config', () => {
    const configSource = fs.readFileSync(path.join(process.cwd(), 'src/payload.config.ts'), 'utf8')
    expect(configSource).toMatch(/import\s*\{\s*Forms\s*\}\s*from\s*['"]\.\/collections\/Forms['"]/)
    expect(configSource).toMatch(/collections:\s*\[[^\]]*Forms[^\]]*\]/)
  })
})

describe('US-33 AC-33.1: the PRD §20.2 configurable set maps one-to-one onto the collection', () => {
  const topLevelFieldNames = Forms.fields
    .map((field) => ('name' in field ? (field.name as string) : ''))
    .filter(Boolean)

  it('every PRD §20.2 configurable item has a corresponding top-level collection field', () => {
    for (const { prdItem, topLevelField } of PRD_20_2_CONFIGURABLE_MAP) {
      expect(topLevelFieldNames).toContain(topLevelField)
      expect(prdItem).toBeTruthy()
    }
  })

  it('every top-level collection field maps back to a PRD §20.2 configurable item', () => {
    const mappedTopLevelFields = [...new Set(PRD_20_2_CONFIGURABLE_MAP.map((entry) => entry.topLevelField))]
    expect(topLevelFieldNames.sort()).toEqual(mappedTopLevelFields.sort())
  })

  it('carries exactly 7 top-level fields — one per distinct PRD §20.2 field path, no more, no fewer', () => {
    expect(topLevelFieldNames.length).toBe(7)
  })
})

describe('US-33 AC-33.1: individual field shapes', () => {
  it('internalName is required and is the admin title field', () => {
    const field = fieldByName(Forms.fields, 'internalName')
    expect(field?.type).toBe('text')
    expect(field && 'required' in field ? field.required : undefined).toBe(true)
    expect(Forms.admin?.useAsTitle).toBe('internalName')
  })

  it('publicTitle is required', () => {
    const field = fieldByName(Forms.fields, 'publicTitle')
    expect(field?.type).toBe('text')
    expect(field && 'required' in field ? field.required : undefined).toBe(true)
  })

  it('description is optional freeform text', () => {
    const field = fieldByName(Forms.fields, 'description')
    expect(field?.type).toBe('textarea')
    expect(field && 'required' in field ? field.required : undefined).not.toBe(true)
  })

  it('recipients is a required array of at least one email, supporting more than one recipient', () => {
    const field = fieldByName(Forms.fields, 'recipients')
    expect(field?.type).toBe('array')
    expect(field && 'required' in field ? field.required : undefined).toBe(true)
    expect(field && 'minRows' in field ? field.minRows : undefined).toBe(1)
    const subFields = subFieldsOf(field)
    expect(subFields.map((f) => ('name' in f ? f.name : ''))).toEqual(['email'])
    expect(subFields[0]?.type).toBe('email')
  })

  it('successMessage is required', () => {
    const field = fieldByName(Forms.fields, 'successMessage')
    expect(field?.type).toBe('text')
    expect(field && 'required' in field ? field.required : undefined).toBe(true)
  })

  it('earlyBookingBenefits is a group carrying an enable toggle, footer text, and a link', () => {
    const field = fieldByName(Forms.fields, 'earlyBookingBenefits')
    expect(field?.type).toBe('group')
    const subFields = subFieldsOf(field)
    expect(subFields.map((f) => ('name' in f ? f.name : '')).sort()).toEqual(
      ['enabled', 'footerText', 'linkUrl'].sort(),
    )
  })
})

describe('US-33 AC-33.1: the `fields` array carries field order, labels/helper text, and required status', () => {
  const fieldsArray = fieldByName(Forms.fields, 'fields')
  const fieldItemSubFields = subFieldsOf(fieldsArray)
  const fieldItemNames = fieldItemSubFields.map((f) => ('name' in f ? f.name : ''))

  it('is a required array of at least one field, with no separate ordering field — array order is field order', () => {
    expect(fieldsArray?.type).toBe('array')
    expect(fieldsArray && 'required' in fieldsArray ? fieldsArray.required : undefined).toBe(true)
    expect(fieldsArray && 'minRows' in fieldsArray ? fieldsArray.minRows : undefined).toBe(1)
  })

  it('each field item carries a label and helper text', () => {
    expect(fieldItemNames).toContain('label')
    expect(fieldItemNames).toContain('helpText')
    const labelField = fieldByName(fieldItemSubFields, 'label')
    expect(labelField && 'required' in labelField ? labelField.required : undefined).toBe(true)
  })

  it('each field item carries a required/optional checkbox, defaulting to optional', () => {
    const requiredField = fieldByName(fieldItemSubFields, 'required')
    expect(requiredField?.type).toBe('checkbox')
    expect(requiredField && 'defaultValue' in requiredField ? requiredField.defaultValue : undefined).toBe(false)
  })

  it('dropdown items may carry an options list of label/value pairs', () => {
    const optionsField = fieldByName(fieldItemSubFields, 'options')
    expect(optionsField?.type).toBe('array')
    const optionSubFields = subFieldsOf(optionsField)
    expect(optionSubFields.map((f) => ('name' in f ? f.name : '')).sort()).toEqual(['label', 'value'].sort())
  })
})

describe('US-33 AC-33.1: offers exactly the seven PRD §20.2 V1 field types', () => {
  it('FORM_FIELD_TYPE_OPTIONS has exactly 7 entries', () => {
    expect(FORM_FIELD_TYPE_OPTIONS.length).toBe(7)
    expect(PRD_20_2_V1_FIELD_TYPES.length).toBe(7)
  })

  it('the fieldType select on each form-field item offers exactly FORM_FIELD_TYPE_OPTIONS, no more, no fewer', () => {
    const fieldsArray = fieldByName(Forms.fields, 'fields')
    const fieldTypeField = fieldByName(subFieldsOf(fieldsArray), 'fieldType')
    expect(fieldTypeField?.type).toBe('select')
    expect(fieldTypeField && 'options' in fieldTypeField ? fieldTypeField.options : undefined).toEqual(
      FORM_FIELD_TYPE_OPTIONS,
    )
  })

  it('the seven values are exactly short text, email, phone, date, dropdown, checkbox/consent, long text', () => {
    expect(FORM_FIELD_TYPE_OPTIONS.map((o) => o.value)).toEqual([
      'shortText',
      'email',
      'phone',
      'date',
      'dropdown',
      'checkbox',
      'longText',
    ])
  })

  it('fails if an eighth field type is added to the source', () => {
    // Guards the literal in the source file directly, not just the imported
    // value, so a copy/paste addition anywhere in Forms.ts is caught even if
    // FORM_FIELD_TYPE_OPTIONS itself were left alone.
    const optionEntries = [...fileSource.matchAll(/\{\s*label:\s*'[^']*',\s*value:\s*'[^']*'\s*\}/g)]
    // Two option lists exist in this file: the 7 field types and the
    // Dropdown-choice sub-fields (label/value text inputs, not object
    // literals) — only the field-type literals match this object-literal
    // shape, so this count must stay exactly 7.
    expect(optionEntries.length).toBe(7)
  })
})

describe('US-33 AC-33.1: no conditional-logic engine exists', () => {
  it('no field anywhere on the collection is named for conditional visibility', () => {
    function collectFieldNames(fields: Field[], acc: string[] = []): string[] {
      for (const field of fields) {
        if ('name' in field && typeof field.name === 'string') acc.push(field.name)
        if ('fields' in field && Array.isArray(field.fields)) collectFieldNames(field.fields as Field[], acc)
      }
      return acc
    }
    const allFieldNames = collectFieldNames(Forms.fields)
    const conditionalNamePattern = /condition|dependsOn|showIf|visibleIf|displayIf/i
    for (const name of allFieldNames) {
      expect(name).not.toMatch(conditionalNamePattern)
    }
  })

  it('the source file never references a conditional-logic mechanism', () => {
    expect(fileSource).not.toMatch(/conditionalLogic|dependsOn|showIf|visibleIf|displayIf/)
    // Payload's own per-field `admin.condition` UI hook is also absent —
    // this collection renders every declared field unconditionally, with no
    // engine deciding visibility at all.
    expect(fileSource).not.toMatch(/condition\s*:/)
  })

  it('no field on the collection is a `join` type reaching into another database', () => {
    function collectFieldTypes(fields: Field[], acc: string[] = []): string[] {
      for (const field of fields) {
        acc.push(field.type)
        if ('fields' in field && Array.isArray(field.fields)) collectFieldTypes(field.fields as Field[], acc)
      }
      return acc
    }
    expect(collectFieldTypes(Forms.fields)).not.toContain('join')
  })
})
