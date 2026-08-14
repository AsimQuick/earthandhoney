/**
 * ---
 * file: src/__tests__/us33-ac33.2-inquiries-collection-fields.test.ts
 * project: earthandhoney
 * purpose: Verify AC-33.2's Inquiries collection shape — it declares a
 *          `form` relationship, a `values` field to hold the submitted
 *          field values, a required `sourcePage` field, and a `utm` group
 *          with one sub-field per campaign parameter the AC names
 *          (utm_source/medium/campaign/term/content). Complements the
 *          behavioural proof in us33-ac33.2-submit-inquiry-ordering.test.ts
 *          (ordering) and us33-ac33.2-inquiry-durable-persist-live.test.ts
 *          (real persistence) by pinning the schema itself.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.2
 * ---
 */
import type { Field } from 'payload'

import { Inquiries } from '@/collections/Inquiries'

function fieldByName(fields: Field[], name: string): Field | undefined {
  return fields.find((field) => 'name' in field && field.name === name)
}

function subFieldsOf(field: Field | undefined): Field[] {
  return field && 'fields' in field && Array.isArray(field.fields) ? (field.fields as Field[]) : []
}

describe('AC-33.2: the Inquiries collection captures submitted values, source page, and utm_* parameters', () => {
  it('is slugged "inquiries"', () => {
    expect(Inquiries.slug).toBe('inquiries')
  })

  it('declares a required relationship to forms', () => {
    const form = fieldByName(Inquiries.fields, 'form')
    expect(form).toBeDefined()
    expect(form && 'type' in form ? form.type : undefined).toBe('relationship')
    expect(form && 'relationTo' in form ? form.relationTo : undefined).toBe('forms')
    expect(form && 'required' in form ? form.required : undefined).toBe(true)
  })

  it('declares a required values field to hold the submitted field values', () => {
    const values = fieldByName(Inquiries.fields, 'values')
    expect(values).toBeDefined()
    expect(values && 'type' in values ? values.type : undefined).toBe('json')
    expect(values && 'required' in values ? values.required : undefined).toBe(true)
  })

  it('declares a required sourcePage field', () => {
    const sourcePage = fieldByName(Inquiries.fields, 'sourcePage')
    expect(sourcePage).toBeDefined()
    expect(sourcePage && 'type' in sourcePage ? sourcePage.type : undefined).toBe('text')
    expect(sourcePage && 'required' in sourcePage ? sourcePage.required : undefined).toBe(true)
  })

  it('declares a utm group with exactly the five standard campaign parameters', () => {
    const utm = fieldByName(Inquiries.fields, 'utm')
    expect(utm).toBeDefined()
    expect(utm && 'type' in utm ? utm.type : undefined).toBe('group')

    const utmSubFieldNames = subFieldsOf(utm)
      .filter((field): field is Field & { name: string } => 'name' in field)
      .map((field) => field.name)
      .sort()

    expect(utmSubFieldNames).toEqual(['campaign', 'content', 'medium', 'source', 'term'].sort())
  })
})
