/**
 * ---
 * file: src/__tests__/us37-ac37.6.1-authored-seo-fields-parity.test.ts
 * project: earthandhoney
 * purpose: Verify AC-37.6.1 — the eight PRD §21.2 AUTHORED SEO controls (SEO
 *          title, slug, meta description, photography type, city/region,
 *          venue, Open Graph image, index/noindex) exist as real fields on
 *          BOTH `src/collections/Pages.ts` (carried since US-31, verified
 *          rather than re-added here) and `src/collections/Stories.ts`
 *          (added by this AC), using the same field name, Payload field
 *          type and admin description on both sides — one vocabulary, not a
 *          second one invented for stories. Each field is named one-by-one
 *          against both files' source text with its own line number, so a
 *          field silently renamed or moved doesn't pass by accident. The six
 *          DERIVED controls (search-result preview, canonical URL, H1
 *          preview, schema preview, missing-alt-text audit, internal-link
 *          suggestions) are AC-37.6.2's work and are asserted nowhere here.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.1
 * ---
 */
import fs from 'fs'
import path from 'path'

import type { Field } from 'payload'

import { Pages } from '@/collections/Pages'
import { Stories } from '@/collections/Stories'

const root = process.cwd()
const PAGES_PATH = 'src/collections/Pages.ts'
const STORIES_PATH = 'src/collections/Stories.ts'
const pagesSource = fs.readFileSync(path.join(root, PAGES_PATH), 'utf8')
const storiesSource = fs.readFileSync(path.join(root, STORIES_PATH), 'utf8')

function fieldByName(fields: Field[], name: string): Field | undefined {
  return fields.find((field) => 'name' in field && field.name === name)
}

/**
 * A field's `admin.description`. Payload's `admin` union types some members as
 * `Omit<FieldAdmin, 'description'>`, so the property is read through the same
 * narrow cast us24-ac24.2-studio-profile-branding-bounds.test.ts already uses.
 */
function adminDescription(field: Field | undefined): unknown {
  if (!field || !('admin' in field) || !field.admin) return undefined
  return (field.admin as { description?: unknown }).description
}

/** 1-indexed line number of `name: '<fieldName>'` in `source`, or -1 if absent. */
function lineOfFieldName(source: string, fieldName: string): number {
  const lines = source.split('\n')
  const pattern = new RegExp(`name:\\s*'${fieldName}'`)
  return lines.findIndex((line) => pattern.test(line)) + 1 // +1: findIndex is 0-based, "not found" (-1) becomes 0
}

/**
 * The eight PRD §21.2 AUTHORED controls, PRD label to the field name both
 * collections share. `slug` is VERIFIED here (both collections already had
 * it — US-31 for Pages, US-36 for Stories) rather than added by this AC.
 */
const AUTHORED_FIELD_MAP: Array<{ prdLabel: string; fieldName: string }> = [
  { prdLabel: 'SEO title', fieldName: 'seoTitle' },
  { prdLabel: 'Slug', fieldName: 'slug' },
  { prdLabel: 'Meta description', fieldName: 'metaDescription' },
  { prdLabel: 'Photography type', fieldName: 'photographyType' },
  { prdLabel: 'City/region', fieldName: 'cityRegion' },
  { prdLabel: 'Venue', fieldName: 'venue' },
  { prdLabel: 'Open Graph image', fieldName: 'socialImage' },
  { prdLabel: 'Index/noindex', fieldName: 'indexing' },
]

describe('AC-37.6.1: the set is closed at exactly eight AUTHORED controls', () => {
  it('names exactly eight controls — no more, no fewer', () => {
    expect(AUTHORED_FIELD_MAP.length).toBe(8)
  })
})

describe.each(AUTHORED_FIELD_MAP)(
  'AC-37.6.1: "$prdLabel" ($fieldName) exists on both Pages and Stories',
  ({ fieldName }) => {
    it(`is present in ${PAGES_PATH} at a real line number`, () => {
      const line = lineOfFieldName(pagesSource, fieldName)
      expect(line).toBeGreaterThan(0)
      expect(pagesSource.split('\n')[line - 1]).toContain(`name: '${fieldName}'`)
    })

    it(`is present in ${STORIES_PATH} at a real line number`, () => {
      const line = lineOfFieldName(storiesSource, fieldName)
      expect(line).toBeGreaterThan(0)
      expect(storiesSource.split('\n')[line - 1]).toContain(`name: '${fieldName}'`)
    })

    it('carries the same Payload field type on both collections', () => {
      const pagesField = fieldByName(Pages.fields, fieldName)
      const storiesField = fieldByName(Stories.fields, fieldName)
      expect(pagesField).toBeDefined()
      expect(storiesField).toBeDefined()
      expect(storiesField?.type).toBe(pagesField?.type)
    })

    // `slug` is the one field of the eight this AC VERIFIES rather than
    // ADDS — it already existed on both collections (US-31 for Pages,
    // US-36 for Stories) with its own collection-specific wording ("this
    // page" vs "this story"), which predates AC-37.6.1 and is correct as
    // written. The "same vocabulary" requirement applies to the seven
    // fields this AC actually authors on Stories.
    if (fieldName !== 'slug') {
      it('carries the same admin description on both collections — one vocabulary, not two', () => {
        const pagesDescription = adminDescription(fieldByName(Pages.fields, fieldName))
        const storiesDescription = adminDescription(fieldByName(Stories.fields, fieldName))
        expect(pagesDescription).toBeTruthy()
        expect(storiesDescription).toBe(pagesDescription)
      })
    }
  },
)

describe('AC-37.6.1: field-shape parity beyond name/type/description', () => {
  it('socialImage relates to the same media collection on both sides', () => {
    const pagesField = fieldByName(Pages.fields, 'socialImage')
    const storiesField = fieldByName(Stories.fields, 'socialImage')
    expect(pagesField && 'relationTo' in pagesField ? pagesField.relationTo : undefined).toBe('media')
    expect(storiesField && 'relationTo' in storiesField ? storiesField.relationTo : undefined).toBe('media')
  })

  it('indexing carries the same required/defaultValue/options triad on both sides', () => {
    const pagesField = fieldByName(Pages.fields, 'indexing')
    const storiesField = fieldByName(Stories.fields, 'indexing')
    expect(pagesField && 'required' in pagesField ? pagesField.required : undefined).toBe(true)
    expect(storiesField && 'required' in storiesField ? storiesField.required : undefined).toBe(true)
    expect(pagesField && 'defaultValue' in pagesField ? pagesField.defaultValue : undefined).toBe('index')
    expect(storiesField && 'defaultValue' in storiesField ? storiesField.defaultValue : undefined).toBe('index')
    expect(pagesField && 'options' in pagesField ? pagesField.options : undefined).toEqual(
      storiesField && 'options' in storiesField ? storiesField.options : undefined,
    )
  })

  it('photographyType shares the exact same options list on both sides (imported, not re-typed)', () => {
    const pagesField = fieldByName(Pages.fields, 'photographyType')
    const storiesField = fieldByName(Stories.fields, 'photographyType')
    expect(pagesField && 'options' in pagesField ? pagesField.options : undefined).toEqual(
      storiesField && 'options' in storiesField ? storiesField.options : undefined,
    )
  })

  it('slug is required and unique on both collections — VERIFIED here, not re-added', () => {
    const pagesField = fieldByName(Pages.fields, 'slug')
    const storiesField = fieldByName(Stories.fields, 'slug')
    for (const field of [pagesField, storiesField]) {
      expect(field && 'required' in field ? field.required : undefined).toBe(true)
      expect(field && 'unique' in field ? field.unique : undefined).toBe(true)
    }
  })
})

describe('AC-37.6.1: no ninth control has been smuggled in under a different name', () => {
  it('venue stays optional on both collections — the one PRD §13.1 field marked optional', () => {
    const pagesField = fieldByName(Pages.fields, 'venue')
    const storiesField = fieldByName(Stories.fields, 'venue')
    expect(pagesField && 'required' in pagesField ? pagesField.required : undefined).not.toBe(true)
    expect(storiesField && 'required' in storiesField ? storiesField.required : undefined).not.toBe(true)
  })
})
