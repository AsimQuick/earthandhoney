/**
 * ---
 * file: src/__tests__/us33-ac33.5.2.3-build-inquiry-submission-summary.test.ts
 * project: earthandhoney
 * purpose: Verify AC-33.5.2.3 — src/lib/buildInquirySubmissionSummary.ts
 *          formats a submission's field values into the plain-text
 *          `submission_summary` data field the route requires, in field
 *          order, using each field's label rather than its raw storage key,
 *          and without throwing on a field the submission left empty.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.5.2.3
 * ---
 */
import { buildInquirySubmissionSummary } from '@/lib/buildInquirySubmissionSummary'
import type { InquiryFormFieldDef } from '@/lib/validateInquirySubmission'

const FIELDS: InquiryFormFieldDef[] = [
  { fieldType: 'shortText', name: 'fullName', label: 'Full name', required: true },
  { fieldType: 'email', name: 'email', label: 'Email', required: true },
  { fieldType: 'longText', name: 'notes', label: 'Anything else?', required: false },
]

describe('AC-33.5.2.3: buildInquirySubmissionSummary', () => {
  it('formats every field as "Label: value", in field order, using labels not storage keys', () => {
    const summary = buildInquirySubmissionSummary(FIELDS, {
      fullName: 'Alex Rivera',
      email: 'alex@example.com',
      notes: 'Looking for a Saturday in June.',
    })

    expect(summary).toBe(
      'Full name: Alex Rivera\nEmail: alex@example.com\nAnything else?: Looking for a Saturday in June.',
    )
  })

  it('renders an omitted optional field as "(not provided)" instead of throwing or dropping the line', () => {
    const summary = buildInquirySubmissionSummary(FIELDS, {
      fullName: 'Alex Rivera',
      email: 'alex@example.com',
    })

    expect(summary).toBe('Full name: Alex Rivera\nEmail: alex@example.com\nAnything else?: (not provided)')
  })

  it('renders an empty-string or null value as "(not provided)"', () => {
    const summary = buildInquirySubmissionSummary(FIELDS, {
      fullName: 'Alex Rivera',
      email: 'alex@example.com',
      notes: '',
    })
    expect(summary).toContain('Anything else?: (not provided)')

    const summaryNull = buildInquirySubmissionSummary(FIELDS, {
      fullName: 'Alex Rivera',
      email: 'alex@example.com',
      notes: null,
    })
    expect(summaryNull).toContain('Anything else?: (not provided)')
  })

  it('stringifies a non-string value (e.g. a checkbox boolean) rather than rendering "[object Object]"', () => {
    const checkboxField: InquiryFormFieldDef[] = [
      { fieldType: 'checkbox', name: 'consent', label: 'I agree to be contacted', required: true },
    ]
    const summary = buildInquirySubmissionSummary(checkboxField, { consent: true })
    expect(summary).toBe('I agree to be contacted: true')
  })

  it('returns an empty string for a form with no fields', () => {
    expect(buildInquirySubmissionSummary([], {})).toBe('')
  })
})
