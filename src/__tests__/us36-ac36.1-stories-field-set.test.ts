/**
 * ---
 * file: src/__tests__/us36-ac36.1-stories-field-set.test.ts
 * project: earthandhoney
 * purpose: Verify AC-36.1 — the Payload `Stories` collection implements
 *          exactly the PRD §13.5 field set (title, subtitle/introduction,
 *          a repeating section group of section heading + short text +
 *          gallery placement, plus the `slug`/`status` base identity fields
 *          STORY_TEMPLATE_ADR.md commits this collection to), is registered
 *          on the Payload config, and never relates directly into the
 *          separate Backstage database. Mirrors
 *          us31-ac31.1-pages-field-set.test.ts's structure — including its
 *          "sanctioned fields beyond the PRD row set" tracking pattern,
 *          reused here for AC-37.6.1's seven added fields
 *          (`seoTitle`/`metaDescription`/`photographyType`/`cityRegion`/
 *          `venue`/`socialImage`/`indexing`), which PRD §13.5's table
 *          predates.
 * created-by: dev-team
 * related-story: US-36
 * related-ac: 36.1
 * updated-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.1
 * ---
 */
import fs from 'fs'
import path from 'path'

import type { Field } from 'payload'

import { PHOTOGRAPHY_TYPE_OPTIONS } from '@/collections/Pages'
import { Stories } from '@/collections/Stories'

// AC-37.6.1 (sprint5.json) requires `Stories` to gain the same seven PRD
// §21.2 AUTHORED SEO fields `Pages` already carries — fields PRD §13.5's
// table predates and doesn't itself enumerate as a row. Tracked explicitly
// here, the same way us31-ac31.1-pages-field-set.test.ts tracks AC-35.3's
// `template` field, so this guard keeps meaning exactly what its own name
// says: no *undocumented* field exists beyond the PRD §13.5 set.
const FIELDS_BEYOND_PRD_13_5: Array<{ collectionField: string; sanctionedBy: string }> = [
  { collectionField: 'seoTitle', sanctionedBy: 'AC-37.6.1' },
  { collectionField: 'metaDescription', sanctionedBy: 'AC-37.6.1' },
  { collectionField: 'photographyType', sanctionedBy: 'AC-37.6.1' },
  { collectionField: 'cityRegion', sanctionedBy: 'AC-37.6.1' },
  { collectionField: 'venue', sanctionedBy: 'AC-37.6.1' },
  { collectionField: 'socialImage', sanctionedBy: 'AC-37.6.1' },
  { collectionField: 'indexing', sanctionedBy: 'AC-37.6.1' },
]

const FILE_PATH = path.join(process.cwd(), 'src/collections/Stories.ts')
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

describe('US-36 AC-36.1: Stories carries the CLAUDE.md structured metadata header', () => {
  it('carries the CLAUDE.md structured metadata header', () => {
    const header = fileSource.match(/^\/\*[\s\S]*?\*\//)?.[0] ?? ''
    expect(header).toMatch(/^\s*\/\*\*?\s*\n\s*\*\s*---/)
    expect(header).toMatch(/\*\s*file:\s*src\/collections\/Stories\.ts/)
    expect(header).toMatch(/\*\s*project:\s*earthandhoney/)
    expect(header).toMatch(/\*\s*purpose:/)
    expect(header).toMatch(/\*\s*related-story:\s*US-36/)
    expect(header).toMatch(/\*\s*related-ac:\s*36\.1/)
  })
})

describe('US-36 AC-36.1: Stories is a collection with the expected slug', () => {
  it('is a collection with the expected slug', () => {
    expect(Stories.slug).toBe('stories')
  })

  it('is registered as a collection on the Payload config', () => {
    const configSource = fs.readFileSync(path.join(process.cwd(), 'src/payload.config.ts'), 'utf8')
    expect(configSource).toMatch(/import\s*\{\s*Stories\s*\}\s*from\s*['"]\.\/collections\/Stories['"]/)
    expect(configSource).toMatch(/collections:\s*\[[^\]]*Stories[^\]]*\]/)
  })
})

describe('US-36 AC-36.1: the top-level field list maps one-to-one onto PRD §13.5 plus the base identity fields', () => {
  const actualFieldNames = Stories.fields
    .map((field) => ('name' in field ? (field.name as string) : ''))
    .filter(Boolean)

  it('carries exactly the expected field set', () => {
    expect(actualFieldNames.sort()).toEqual(
      [
        'sections',
        'slug',
        'status',
        'subtitleIntroduction',
        'title',
        ...FIELDS_BEYOND_PRD_13_5.map((f) => f.collectionField),
      ].sort(),
    )
  })

  it('title is required — PRD §13.5\'s "Title"', () => {
    const field = fieldByName(Stories.fields, 'title')
    expect(field?.type).toBe('text')
    expect(field && 'required' in field ? field.required : undefined).toBe(true)
  })

  it('subtitleIntroduction is optional — PRD §13.5\'s "Subtitle / introduction"', () => {
    const field = fieldByName(Stories.fields, 'subtitleIntroduction')
    expect(field?.type).toBe('textarea')
    expect(field && 'required' in field ? field.required : undefined).not.toBe(true)
  })

  it('slug is required and unique', () => {
    const field = fieldByName(Stories.fields, 'slug')
    expect(field?.type).toBe('text')
    expect(field && 'required' in field ? field.required : undefined).toBe(true)
    expect(field && 'unique' in field ? field.unique : undefined).toBe(true)
  })

  it('status is a required select defaulting to draft', () => {
    const field = fieldByName(Stories.fields, 'status')
    expect(field?.type).toBe('select')
    expect(field && 'required' in field ? field.required : undefined).toBe(true)
    expect(field && 'defaultValue' in field ? field.defaultValue : undefined).toBe('draft')
    expect(field && 'options' in field ? field.options : undefined).toEqual([
      { label: 'Draft', value: 'draft' },
      { label: 'Published', value: 'published' },
    ])
  })
})

describe('US-36 AC-36.1: sections is the PRD §13.5 repeating (section heading + short text + gallery placement) group', () => {
  it('sections is a required array requiring at least one row', () => {
    const field = fieldByName(Stories.fields, 'sections')
    expect(field?.type).toBe('array')
    expect(field && 'required' in field ? field.required : undefined).toBe(true)
    expect(field && 'minRows' in field ? field.minRows : undefined).toBe(1)
  })

  it('each section row has exactly sectionHeading, shortText, and galleryPlacement', () => {
    const field = fieldByName(Stories.fields, 'sections')
    const subFields = (field && 'fields' in field ? (field.fields as Field[]) : []) ?? []
    const subFieldNames = subFields.map((subField) => ('name' in subField ? subField.name : ''))
    expect(subFieldNames.sort()).toEqual(['galleryPlacement', 'sectionHeading', 'shortText'].sort())
  })

  it('sectionHeading and shortText are required', () => {
    const field = fieldByName(Stories.fields, 'sections')
    const subFields = (field && 'fields' in field ? (field.fields as Field[]) : []) ?? []
    const sectionHeading = fieldByName(subFields, 'sectionHeading')
    const shortText = fieldByName(subFields, 'shortText')
    expect(sectionHeading?.type).toBe('text')
    expect(sectionHeading && 'required' in sectionHeading ? sectionHeading.required : undefined).toBe(true)
    expect(shortText?.type).toBe('textarea')
    expect(shortText && 'required' in shortText ? shortText.required : undefined).toBe(true)
  })

  it('galleryPlacement is a required relationship into the Payload gallery-placements collection', () => {
    const field = fieldByName(Stories.fields, 'sections')
    const subFields = (field && 'fields' in field ? (field.fields as Field[]) : []) ?? []
    const galleryPlacement = fieldByName(subFields, 'galleryPlacement')
    expect(galleryPlacement?.type).toBe('relationship')
    expect(galleryPlacement && 'relationTo' in galleryPlacement ? galleryPlacement.relationTo : undefined).toBe(
      'gallery-placements',
    )
    expect(galleryPlacement && 'required' in galleryPlacement ? galleryPlacement.required : undefined).toBe(true)
  })
})

describe('US-37 AC-37.6.1: the seven added AUTHORED SEO fields match Pages\' shapes exactly', () => {
  it('seoTitle is an optional text field, same as Pages', () => {
    const field = fieldByName(Stories.fields, 'seoTitle')
    expect(field?.type).toBe('text')
    expect(field && 'required' in field ? field.required : undefined).not.toBe(true)
  })

  it('metaDescription is an optional textarea, same as Pages', () => {
    const field = fieldByName(Stories.fields, 'metaDescription')
    expect(field?.type).toBe('textarea')
    expect(field && 'required' in field ? field.required : undefined).not.toBe(true)
  })

  it('photographyType is an optional select sharing Pages\' PHOTOGRAPHY_TYPE_OPTIONS', () => {
    const field = fieldByName(Stories.fields, 'photographyType')
    expect(field?.type).toBe('select')
    expect(field && 'required' in field ? field.required : undefined).not.toBe(true)
    expect(field && 'options' in field ? field.options : undefined).toEqual(PHOTOGRAPHY_TYPE_OPTIONS)
  })

  it('cityRegion is an optional text field, same as Pages', () => {
    const field = fieldByName(Stories.fields, 'cityRegion')
    expect(field?.type).toBe('text')
    expect(field && 'required' in field ? field.required : undefined).not.toBe(true)
  })

  it('venue is an optional text field, same as Pages', () => {
    const field = fieldByName(Stories.fields, 'venue')
    expect(field?.type).toBe('text')
    expect(field && 'required' in field ? field.required : undefined).not.toBe(true)
  })

  it('socialImage is an optional upload relating to media, same as Pages', () => {
    const field = fieldByName(Stories.fields, 'socialImage')
    expect(field?.type).toBe('upload')
    expect(field && 'relationTo' in field ? field.relationTo : undefined).toBe('media')
    expect(field && 'required' in field ? field.required : undefined).not.toBe(true)
  })

  it('indexing is a required select defaulting to index, same as Pages', () => {
    const field = fieldByName(Stories.fields, 'indexing')
    expect(field?.type).toBe('select')
    expect(field && 'required' in field ? field.required : undefined).toBe(true)
    expect(field && 'defaultValue' in field ? field.defaultValue : undefined).toBe('index')
    expect(field && 'options' in field ? field.options : undefined).toEqual([
      { label: 'Index', value: 'index' },
      { label: 'Noindex', value: 'noindex' },
    ])
  })
})

describe('US-36 AC-36.1: the gallery placement reference never crosses into the Backstage database', () => {
  it('the collection source never references backstage-db', () => {
    expect(fileSource).not.toMatch(/backstage-db/)
  })

  it('the only relationTo values are the Payload-owned gallery-placements and media collections', () => {
    const relationToMatches = [...fileSource.matchAll(/relationTo:\s*'([^']+)'/g)].map((match) => match[1])
    expect(relationToMatches).toEqual(['gallery-placements', 'media'])
  })

  it('no field on the collection is a `join` type into another database', () => {
    const types = collectFieldTypes(Stories.fields)
    expect(types).not.toContain('join')
  })
})
