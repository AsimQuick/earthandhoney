/**
 * ---
 * file: src/__tests__/us35-ac35.4-details-no-long-form-body-field-lock-in.test.ts
 * project: earthandhoney
 * purpose: Verify AC-35.4 — a standing lock-in test, in the same pattern
 *          US-31 AC-31.2 used to protect Pillar 3
 *          (us31-ac31.2-pages-no-layout-builder-lock-in.test.ts), that fails
 *          the moment a rich-text field or a long-form-body-named field is
 *          added anywhere on the Payload `Pages` collection — the only CMS
 *          field surface a Details page (a `Pages` record with
 *          `template: 'details'`, per AC-35.3) can be authored through — or
 *          to `DetailsPageTemplate`'s own prop list. This makes PRD §13.4's
 *          "Do not over-explain in copy" structural rather than advisory:
 *          there is no field a photographer could fill with a long-form body
 *          even if they wanted to. A self-test section proves the guard
 *          actually detects each forbidden construct, so the standing
 *          assertions are not vacuously green.
 * created-by: dev-team
 * related-story: US-35
 * related-ac: 35.4
 * ---
 */
import fs from 'fs'
import path from 'path'

import type { Field } from 'payload'

import { Pages } from '@/collections/Pages'

const TEMPLATE_FILE_PATH = path.join(process.cwd(), 'src/components/page-template/DetailsPageTemplate.tsx')
const PRD_FILE_PATH = path.join(process.cwd(), 'scrum-master/PRD.md')
const templateSource = fs.readFileSync(TEMPLATE_FILE_PATH, 'utf8')
const prdSource = fs.readFileSync(PRD_FILE_PATH, 'utf8')

interface CollectedField {
  name?: string
  type: string
}

/**
 * Walks a Payload field tree — including nested `fields` (group/array),
 * `tabs[].fields` and `blocks[].fields` — so a forbidden construct hidden
 * inside a nested structure is caught, not just a top-level field. Mirrors
 * us31-ac31.2-pages-no-layout-builder-lock-in.test.ts's own walker.
 */
function collectAllFields(fields: Field[]): CollectedField[] {
  const result: CollectedField[] = []
  for (const field of fields) {
    const name = 'name' in field ? (field.name as string) : undefined
    result.push({ name, type: field.type })

    if ('fields' in field && Array.isArray((field as { fields?: unknown }).fields)) {
      result.push(...collectAllFields((field as unknown as { fields: Field[] }).fields))
    }
    if ('tabs' in field && Array.isArray((field as { tabs?: unknown }).tabs)) {
      for (const tab of (field as unknown as { tabs: Array<{ fields?: Field[] }> }).tabs) {
        if (Array.isArray(tab.fields)) result.push(...collectAllFields(tab.fields))
      }
    }
    if ('blocks' in field && Array.isArray((field as { blocks?: unknown }).blocks)) {
      for (const block of (field as unknown as { blocks: Array<{ fields?: Field[] }> }).blocks) {
        if (Array.isArray(block.fields)) result.push(...collectAllFields(block.fields))
      }
    }
  }
  return result
}

/**
 * Splits a camelCase/snake_case field name into lowercase words — e.g.
 * "bodyCopy" -> ["body", "copy"], "antibody" -> ["antibody"] (no internal
 * case boundary, so it stays one word and is never confused with the whole
 * word "body"). Every field name in this collection is authored in
 * camelCase (see src/collections/Pages.ts), so this is the same convention
 * a body-content field would be named under.
 */
function splitFieldNameWords(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

// `richText` is Payload's own long-form/formatted-body field type. A field
// whose name is, or contains, the whole word "body" (so `pageBody`/`bodyCopy`
// are caught but `antibody` is not), or whose words spell "long" + "form"
// consecutively, is the plain-English name a long-form copy field would
// carry even as a plain textarea/text type.
function isLongFormBodyName(name: string): boolean {
  const words = splitFieldNameWords(name)
  if (words.includes('body')) return true
  return words.join('').includes('longform')
}

interface CopyRestraintViolations {
  richTextFields: CollectedField[]
  longFormBodyNamedFields: CollectedField[]
}

function findCopyRestraintViolations(fields: Field[]): CopyRestraintViolations {
  const all = collectAllFields(fields)
  return {
    richTextFields: all.filter((f) => f.type === 'richText'),
    longFormBodyNamedFields: all.filter((f) => f.name && isLongFormBodyName(f.name)),
  }
}

describe('US-35 AC-35.4: Pages (the only field surface a Details page is authored through) has no long-form body field', () => {
  const violations = findCopyRestraintViolations(Pages.fields)

  it('has no `richText` field anywhere, including nested', () => {
    expect(violations.richTextFields).toEqual([])
  })

  it('has no field named "body" or "long-form"/"longform" anywhere, including nested', () => {
    expect(violations.longFormBodyNamedFields).toEqual([])
  })

  it('the existing introduction field is a short textarea, not a rich-text/body field', () => {
    const shortIntroduction = Pages.fields.find(
      (f) => 'name' in f && (f as { name?: string }).name === 'shortIntroduction',
    )
    expect(shortIntroduction).toBeDefined()
    expect((shortIntroduction as { type: string }).type).toBe('textarea')
  })
})

describe('US-35 AC-35.4: DetailsPageTemplate offers no rich-text/long-form body prop', () => {
  it('declares no prop named "body" or matching "long-form"/"longform"', () => {
    const propsBlockMatch = templateSource.match(
      /export interface DetailsPageTemplateProps \{([\s\S]*?)\n\}/,
    )
    expect(propsBlockMatch).not.toBeNull()
    const propNames = Array.from((propsBlockMatch![1] as string).matchAll(/^\s*(\w+)\??:/gm)).map(
      (m) => m[1],
    )
    expect(propNames.length).toBeGreaterThan(0)
    expect(propNames.some((name) => isLongFormBodyName(name))).toBe(false)
  })

  it('the introduction prop is a single-line string, not a rendered rich-text node', () => {
    expect(templateSource).toMatch(/oneLineIntroduction\?:\s*string/)
  })

  it("names the PRD §13.4 instruction it protects, in its own file header", () => {
    const normalizedSource = templateSource
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, ''))
      .join(' ')
      .replace(/\s+/g, ' ')
    expect(normalizedSource).toMatch(/do not over-explain in copy/i)
  })

  it('PRD §13.4 still states the instruction this test locks in', () => {
    expect(prdSource).toContain('Do not over-explain in copy')
  })
})

describe('US-35 AC-35.4: the guard actually detects each forbidden construct (self-test)', () => {
  it('flags a top-level `richText` field', () => {
    const mutated: Field[] = [...Pages.fields, { name: 'body', type: 'richText' } as unknown as Field]
    const violations = findCopyRestraintViolations(mutated)
    expect(violations.richTextFields).toEqual([{ name: 'body', type: 'richText' }])
    expect(violations.longFormBodyNamedFields).toEqual([{ name: 'body', type: 'richText' }])
  })

  it('flags a body-named field even if its type is a plain textarea', () => {
    const mutated: Field[] = [...Pages.fields, { name: 'bodyCopy', type: 'textarea' } as unknown as Field]
    const violations = findCopyRestraintViolations(mutated)
    expect(violations.longFormBodyNamedFields).toEqual([{ name: 'bodyCopy', type: 'textarea' }])
  })

  it('flags a "long-form"-named field', () => {
    const mutated: Field[] = [...Pages.fields, { name: 'longFormText', type: 'textarea' } as unknown as Field]
    const violations = findCopyRestraintViolations(mutated)
    expect(violations.longFormBodyNamedFields).toEqual([{ name: 'longFormText', type: 'textarea' }])
  })

  it('does not false-positive on unrelated field names containing "body" as a substring only within a larger word', () => {
    const mutated: Field[] = [
      ...Pages.fields,
      { name: 'antibody', type: 'text' } as unknown as Field,
    ]
    const violations = findCopyRestraintViolations(mutated)
    expect(violations.longFormBodyNamedFields).toEqual([])
  })

  it('flags a forbidden field nested inside a group, not just at the top level', () => {
    const mutated: Field[] = [
      ...Pages.fields,
      {
        name: 'extra',
        type: 'group',
        fields: [{ name: 'body', type: 'richText' }],
      } as unknown as Field,
    ]
    const violations = findCopyRestraintViolations(mutated)
    expect(violations.richTextFields).toEqual([{ name: 'body', type: 'richText' }])
  })
})
