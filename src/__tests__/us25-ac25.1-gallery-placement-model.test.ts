/**
 * ---
 * file: src/__tests__/us25-ac25.1-gallery-placement-model.test.ts
 * project: earthandhoney
 * purpose: Verify AC-25.1 — the Payload `GalleryPlacements` collection
 *          carries exactly the PRD §14 placement fields (Backstage gallery
 *          `slug` as a plain external-identifier field, layout, optional
 *          heading/description/theme preset, visibility, and order), that
 *          the theme preset options are drawn live from the US-23 token
 *          source of truth, and that the model holds no foreign key or
 *          relation field into backstage-db per
 *          PAYLOAD_PICPEAK_API_CONTRACT.md's "No cross-database access"
 *          rule and Reminder 4.
 * created-by: dev-team
 * related-story: US-25
 * related-ac: 25.1
 * ---
 */
import fs from 'fs'
import path from 'path'

import type { Field } from 'payload'

import { GalleryPlacements, themePresetOptions } from '@/collections/GalleryPlacements'
import { loadTokenSpecimenData } from '@/lib/designTokenSpecimen'

const FILE_PATH = path.join(process.cwd(), 'src/collections/GalleryPlacements.ts')
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

describe('US-25 AC-25.1: GalleryPlacements carries exactly the PRD §14 placement fields', () => {
  it('carries the CLAUDE.md structured metadata header', () => {
    const header = fileSource.match(/^\/\*[\s\S]*?\*\//)?.[0] ?? ''
    expect(header).toMatch(/^\s*\/\*\*?\s*\n\s*\*\s*---/)
    expect(header).toMatch(/\*\s*file:\s*src\/collections\/GalleryPlacements\.ts/)
    expect(header).toMatch(/\*\s*project:\s*earthandhoney/)
    expect(header).toMatch(/\*\s*purpose:/)
    expect(header).toMatch(/\*\s*related-story:\s*US-25/)
    expect(header).toMatch(/\*\s*related-ac:\s*25\.1/)
  })

  it('is a collection with the expected slug', () => {
    expect(GalleryPlacements.slug).toBe('gallery-placements')
  })

  it('exposes exactly the PRD §14 placement fields', () => {
    const expectedFieldNames = [
      'gallerySlug',
      'layout',
      'heading',
      'description',
      'themePreset',
      'visibility',
      'order',
    ]
    const actualFieldNames = GalleryPlacements.fields
      .map((field) => ('name' in field ? (field.name as string) : ''))
      .filter(Boolean)
    expect(actualFieldNames.sort()).toEqual(expectedFieldNames.sort())
  })

  it('stores the Backstage gallery identifier as a plain text field, not a relation', () => {
    const gallerySlug = fieldByName(GalleryPlacements.fields, 'gallerySlug')
    expect(gallerySlug?.type).toBe('text')
    expect(gallerySlug && 'required' in gallerySlug ? gallerySlug.required : undefined).toBe(true)
  })

  it('layout is a required slideshow/masonry select', () => {
    const layout = fieldByName(GalleryPlacements.fields, 'layout')
    expect(layout?.type).toBe('select')
    expect(layout && 'required' in layout ? layout.required : undefined).toBe(true)
    expect(layout && 'options' in layout ? layout.options : undefined).toEqual([
      { label: 'Slideshow', value: 'slideshow' },
      { label: 'Masonry', value: 'masonry' },
    ])
  })

  it('heading and description are optional', () => {
    const heading = fieldByName(GalleryPlacements.fields, 'heading')
    const description = fieldByName(GalleryPlacements.fields, 'description')
    expect(heading && 'required' in heading ? heading.required : undefined).not.toBe(true)
    expect(description && 'required' in description ? description.required : undefined).not.toBe(true)
  })

  it('themePreset is optional and its options are drawn live from the US-23 token source of truth', () => {
    const themePreset = fieldByName(GalleryPlacements.fields, 'themePreset')
    expect(themePreset?.type).toBe('select')
    expect(themePreset && 'required' in themePreset ? themePreset.required : undefined).not.toBe(true)

    const tokenNames = loadTokenSpecimenData().overlaysAndVignettes.map(([name]) => name)
    expect(tokenNames.length).toBeGreaterThan(0)
    const optionValues = themePresetOptions().map((option) => option.value)
    expect(optionValues).toEqual(tokenNames)
    expect(themePreset && 'options' in themePreset ? themePreset.options : undefined).toEqual(
      themePresetOptions(),
    )
  })

  it('visibility is a required select with public/unlisted/draft rules, defaulting to draft', () => {
    const visibility = fieldByName(GalleryPlacements.fields, 'visibility')
    expect(visibility?.type).toBe('select')
    expect(visibility && 'required' in visibility ? visibility.required : undefined).toBe(true)
    expect(visibility && 'options' in visibility ? visibility.options : undefined).toEqual([
      { label: 'Public', value: 'public' },
      { label: 'Unlisted', value: 'unlisted' },
      { label: 'Draft', value: 'draft' },
    ])
    expect(visibility && 'defaultValue' in visibility ? visibility.defaultValue : undefined).toBe('draft')
  })

  it('order is a required number field for ordering within the page/story', () => {
    const order = fieldByName(GalleryPlacements.fields, 'order')
    expect(order?.type).toBe('number')
    expect(order && 'required' in order ? order.required : undefined).toBe(true)
  })

  it('is registered as a collection on the Payload config', () => {
    const configSource = fs.readFileSync(path.join(process.cwd(), 'src/payload.config.ts'), 'utf8')
    expect(configSource).toMatch(
      /import\s*\{\s*GalleryPlacements\s*\}\s*from\s*['"]\.\/collections\/GalleryPlacements['"]/,
    )
    expect(configSource).toMatch(/collections:\s*\[[^\]]*GalleryPlacements[^\]]*\]/)
  })
})

describe('US-25 AC-25.1: the model holds no foreign key or relation into backstage-db', () => {
  it('no field on the collection is a `relationship` or `join` type', () => {
    const types = collectFieldTypes(GalleryPlacements.fields)
    expect(types).not.toContain('relationship')
    expect(types).not.toContain('join')
  })

  it('the collection source never references backstage-db or a relationTo option', () => {
    expect(fileSource).not.toMatch(/backstage-db/)
    expect(fileSource).not.toMatch(/relationTo/)
  })

  it('the Backstage gallery identifier field carries no `relationTo`', () => {
    const gallerySlug = fieldByName(GalleryPlacements.fields, 'gallerySlug')
    expect(gallerySlug && 'relationTo' in gallerySlug ? (gallerySlug as unknown) : undefined).toBeUndefined()
  })
})
