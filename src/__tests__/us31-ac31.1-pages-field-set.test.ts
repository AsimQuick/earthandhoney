/**
 * ---
 * file: src/__tests__/us31-ac31.1-pages-field-set.test.ts
 * project: earthandhoney
 * purpose: Verify AC-31.1 — the Payload `Pages` collection implements
 *          exactly the PRD §13.1 New Page field set and nothing beyond it.
 *          Maps every PRD §13.1 table row one-to-one against the collection
 *          field list in both directions: no PRD row is unmapped, and no
 *          collection field exists outside the PRD row set — plus the one
 *          explicitly sanctioned exception, `template` (AC-35.3), tracked
 *          separately below rather than silently loosening this guard.
 * created-by: dev-team
 * related-story: US-31
 * related-ac: 31.1
 * updated-by: dev-team
 * related-story: US-35
 * related-ac: 35.3
 * updated-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.2.3
 * ---
 */
import fs from 'fs'
import path from 'path'

import type { Field } from 'payload'

import { Pages, PHOTOGRAPHY_TYPE_OPTIONS } from '@/collections/Pages'

const FILE_PATH = path.join(process.cwd(), 'src/collections/Pages.ts')
const fileSource = fs.readFileSync(FILE_PATH, 'utf8')

function fieldByName(fields: Field[], name: string): Field | undefined {
  return fields.find((field) => 'name' in field && field.name === name)
}

function collectFieldTypes(fields: Field[]): string[] {
  const types: string[] = []
  for (const field of fields) {
    types.push(field.type)
    if ('fields' in field && Array.isArray(field.fields)) {
      types.push(...collectFieldTypes(field.fields as Field[]))
    }
  }
  return types
}

// PRD §13.1 "Add New Page" table, row for row, mapped to the collection
// field name that implements it. Kept as the single source both directions
// of the mapping test read from, so an unmapped row or an extra field fails
// immediately rather than silently drifting.
const PRD_13_1_FIELD_MAP: Array<{ prdField: string; collectionField: string }> = [
  { prdField: 'Internal page name', collectionField: 'internalName' },
  { prdField: 'Navigation label', collectionField: 'navigationLabel' },
  { prdField: 'Page heading', collectionField: 'heading' },
  { prdField: 'Short introduction', collectionField: 'shortIntroduction' },
  { prdField: 'Photography type', collectionField: 'photographyType' },
  { prdField: 'City/region', collectionField: 'cityRegion' },
  { prdField: 'Venue, optional', collectionField: 'venue' },
  { prdField: 'URL slug', collectionField: 'slug' },
  { prdField: 'SEO title', collectionField: 'seoTitle' },
  { prdField: 'Meta description', collectionField: 'metaDescription' },
  { prdField: 'Social image', collectionField: 'socialImage' },
  { prdField: 'Gallery placements', collectionField: 'galleryPlacements' },
  { prdField: 'Tags', collectionField: 'tags' },
  { prdField: 'Include in menu', collectionField: 'includeInMenu' },
  { prdField: 'Index/noindex', collectionField: 'indexing' },
  { prdField: 'Draft/published', collectionField: 'status' },
]

// AC-35.3 (sprint5.json) requires the Details template (PRD §13.4) to be
// "a selection on a Pages record, not a bespoke hard-coded route" — a
// requirement PRD §13.1's table predates and doesn't itself enumerate as a
// row. Tracked explicitly here, rather than folded into PRD_13_1_FIELD_MAP
// above, so this guard keeps meaning exactly what its own name says: no
// *undocumented* field exists beyond the PRD §13.1 set.
const FIELDS_BEYOND_PRD_13_1: Array<{ collectionField: string; sanctionedBy: string }> = [
  { collectionField: 'template', sanctionedBy: 'AC-35.3' },
  { collectionField: 'seoAssistant', sanctionedBy: 'AC-37.6.2.3' },
]

describe('US-31 AC-31.1: Pages carries the CLAUDE.md structured metadata header', () => {
  it('carries the CLAUDE.md structured metadata header', () => {
    const header = fileSource.match(/^\/\*[\s\S]*?\*\//)?.[0] ?? ''
    expect(header).toMatch(/^\s*\/\*\*?\s*\n\s*\*\s*---/)
    expect(header).toMatch(/\*\s*file:\s*src\/collections\/Pages\.ts/)
    expect(header).toMatch(/\*\s*project:\s*earthandhoney/)
    expect(header).toMatch(/\*\s*purpose:/)
    expect(header).toMatch(/\*\s*related-story:\s*US-31/)
    expect(header).toMatch(/\*\s*related-ac:\s*31\.1/)
  })
})

describe('US-31 AC-31.1: Pages is a collection with the expected slug', () => {
  it('is a collection with the expected slug', () => {
    expect(Pages.slug).toBe('pages')
  })

  it('is registered as a collection on the Payload config', () => {
    const configSource = fs.readFileSync(path.join(process.cwd(), 'src/payload.config.ts'), 'utf8')
    expect(configSource).toMatch(/import\s*\{\s*Pages\s*\}\s*from\s*['"]\.\/collections\/Pages['"]/)
    expect(configSource).toMatch(/collections:\s*\[[^\]]*Pages[^\]]*\]/)
  })
})

describe('US-31 AC-31.1: the field list maps one-to-one onto PRD §13.1', () => {
  const actualFieldNames = Pages.fields
    .map((field) => ('name' in field ? (field.name as string) : ''))
    .filter(Boolean)

  it('every PRD §13.1 row has exactly one corresponding collection field (no unmapped PRD row)', () => {
    for (const { prdField, collectionField } of PRD_13_1_FIELD_MAP) {
      expect(actualFieldNames).toContain(collectionField)
      // Documents which PRD row this assertion is protecting.
      expect(prdField).toBeTruthy()
    }
  })

  it('every collection field maps back to a PRD §13.1 row or a sanctioned, explicitly tracked exception', () => {
    const mappedFieldNames = PRD_13_1_FIELD_MAP.map((entry) => entry.collectionField)
    const sanctionedFieldNames = FIELDS_BEYOND_PRD_13_1.map((entry) => entry.collectionField)
    expect(actualFieldNames.sort()).toEqual([...mappedFieldNames, ...sanctionedFieldNames].sort())
  })

  it('carries exactly 18 fields — the 16 PRD §13.1 rows plus AC-35.3\'s sanctioned template selection and AC-37.6.2.3\'s read-only seoAssistant preview', () => {
    expect(PRD_13_1_FIELD_MAP.length).toBe(16)
    expect(FIELDS_BEYOND_PRD_13_1.length).toBe(2)
    expect(actualFieldNames.length).toBe(18)
  })
})

describe('US-31 AC-31.1: individual field shapes', () => {
  it('internalName is required and is the admin title field', () => {
    const field = fieldByName(Pages.fields, 'internalName')
    expect(field?.type).toBe('text')
    expect(field && 'required' in field ? field.required : undefined).toBe(true)
    expect(Pages.admin?.useAsTitle).toBe('internalName')
  })

  it('heading is required', () => {
    const field = fieldByName(Pages.fields, 'heading')
    expect(field?.type).toBe('text')
    expect(field && 'required' in field ? field.required : undefined).toBe(true)
  })

  it('photographyType is a select with options', () => {
    const field = fieldByName(Pages.fields, 'photographyType')
    expect(field?.type).toBe('select')
    expect(field && 'options' in field ? field.options : undefined).toEqual(PHOTOGRAPHY_TYPE_OPTIONS)
  })

  it('venue is optional, per the PRD table explicitly marking it optional', () => {
    const field = fieldByName(Pages.fields, 'venue')
    expect(field?.type).toBe('text')
    expect(field && 'required' in field ? field.required : undefined).not.toBe(true)
  })

  it('slug is required and unique', () => {
    const field = fieldByName(Pages.fields, 'slug')
    expect(field?.type).toBe('text')
    expect(field && 'required' in field ? field.required : undefined).toBe(true)
    expect(field && 'unique' in field ? field.unique : undefined).toBe(true)
  })

  it('socialImage is an upload relating to media', () => {
    const field = fieldByName(Pages.fields, 'socialImage')
    expect(field?.type).toBe('upload')
    expect(field && 'relationTo' in field ? field.relationTo : undefined).toBe('media')
  })

  it('galleryPlacements is a hasMany relationship into the Payload gallery-placements collection', () => {
    const field = fieldByName(Pages.fields, 'galleryPlacements')
    expect(field?.type).toBe('relationship')
    expect(field && 'relationTo' in field ? field.relationTo : undefined).toBe('gallery-placements')
    expect(field && 'hasMany' in field ? field.hasMany : undefined).toBe(true)
  })

  it('tags is an array of text tags', () => {
    const field = fieldByName(Pages.fields, 'tags')
    expect(field?.type).toBe('array')
    const subFields = ('fields' in field! ? (field.fields as Field[]) : []) ?? []
    expect(subFields.map((subField) => ('name' in subField ? subField.name : ''))).toEqual(['tag'])
  })

  it('includeInMenu is a checkbox defaulting to true', () => {
    const field = fieldByName(Pages.fields, 'includeInMenu')
    expect(field?.type).toBe('checkbox')
    expect(field && 'defaultValue' in field ? field.defaultValue : undefined).toBe(true)
  })

  it('indexing is a required select defaulting to index', () => {
    const field = fieldByName(Pages.fields, 'indexing')
    expect(field?.type).toBe('select')
    expect(field && 'required' in field ? field.required : undefined).toBe(true)
    expect(field && 'defaultValue' in field ? field.defaultValue : undefined).toBe('index')
    expect(field && 'options' in field ? field.options : undefined).toEqual([
      { label: 'Index', value: 'index' },
      { label: 'Noindex', value: 'noindex' },
    ])
  })

  it('status is a required select defaulting to draft', () => {
    const field = fieldByName(Pages.fields, 'status')
    expect(field?.type).toBe('select')
    expect(field && 'required' in field ? field.required : undefined).toBe(true)
    expect(field && 'defaultValue' in field ? field.defaultValue : undefined).toBe('draft')
    expect(field && 'options' in field ? field.options : undefined).toEqual([
      { label: 'Draft', value: 'draft' },
      { label: 'Published', value: 'published' },
    ])
  })
})

describe('US-31 AC-31.1: the gallery placement reference never crosses into the Backstage database', () => {
  it('the collection source never references backstage-db', () => {
    expect(fileSource).not.toMatch(/backstage-db/)
  })

  it('the only relationTo values are Payload-owned collections (media, gallery-placements)', () => {
    const relationToMatches = [...fileSource.matchAll(/relationTo:\s*'([^']+)'/g)].map((match) => match[1])
    expect(relationToMatches.sort()).toEqual(['gallery-placements', 'media'])
  })

  it('no field on the collection is a `join` type into another database', () => {
    const types = collectFieldTypes(Pages.fields)
    expect(types).not.toContain('join')
  })
})
