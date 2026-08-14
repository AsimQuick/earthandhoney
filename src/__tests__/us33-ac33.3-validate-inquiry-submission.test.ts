/**
 * ---
 * file: src/__tests__/us33-ac33.3-validate-inquiry-submission.test.ts
 * project: earthandhoney
 * purpose: Verify AC-33.3's pure server-side validation logic in
 *          src/lib/validateInquirySubmission.ts against in-memory field
 *          definitions and submitted values — no payload import, no I/O.
 *          Exercises exactly the three failure modes the AC names (missing
 *          required field, malformed email, over-long field), plus that a
 *          fully valid submission produces no errors and that optional
 *          empty fields are not flagged. The companion LIVE suite,
 *          us33-ac33.3-server-validation-live.test.ts, proves the same
 *          three rejections against the real /api/inquiries route with no
 *          Inquiry record written.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.3
 * ---
 */
import {
  INQUIRY_FIELD_MAX_LENGTH,
  validateInquirySubmission,
  type InquiryFormFieldDef,
} from '@/lib/validateInquirySubmission'

const FIELDS: InquiryFormFieldDef[] = [
  { fieldType: 'shortText', name: 'fullName', label: 'Full name', required: true },
  { fieldType: 'email', name: 'email', label: 'Email', required: true },
  { fieldType: 'longText', name: 'message', label: 'Message', required: false },
]

describe('AC-33.3: validateInquirySubmission is the server-authoritative check', () => {
  it('passes a fully valid submission with no errors', () => {
    const errors = validateInquirySubmission(FIELDS, {
      fullName: 'Jordan Casey',
      email: 'jordan.casey@example.com',
      message: 'Looking forward to our wedding shoot!',
    })
    expect(errors).toEqual([])
  })

  it('rejects a missing required field', () => {
    const errors = validateInquirySubmission(FIELDS, {
      email: 'jordan.casey@example.com',
    })
    expect(errors).toEqual([{ field: 'fullName', message: 'Full name is required' }])
  })

  it('rejects an empty-string required field the same as an absent one', () => {
    const errors = validateInquirySubmission(FIELDS, {
      fullName: '',
      email: 'jordan.casey@example.com',
    })
    expect(errors).toContainEqual({ field: 'fullName', message: 'Full name is required' })
  })

  it('rejects a malformed email on an email-type field', () => {
    const errors = validateInquirySubmission(FIELDS, {
      fullName: 'Jordan Casey',
      email: 'not-an-email',
    })
    expect(errors).toEqual([{ field: 'email', message: 'Email must be a valid email address' }])
  })

  it('rejects a field longer than its type\'s maximum length', () => {
    const tooLong = 'a'.repeat(INQUIRY_FIELD_MAX_LENGTH.shortText + 1)
    const errors = validateInquirySubmission(FIELDS, {
      fullName: tooLong,
      email: 'jordan.casey@example.com',
    })
    expect(errors).toEqual([
      { field: 'fullName', message: `Full name must be ${INQUIRY_FIELD_MAX_LENGTH.shortText} characters or fewer` },
    ])
  })

  it('does not flag an optional field left empty', () => {
    const errors = validateInquirySubmission(FIELDS, {
      fullName: 'Jordan Casey',
      email: 'jordan.casey@example.com',
    })
    expect(errors).toEqual([])
  })

  it('collects multiple errors when several fields fail at once', () => {
    const errors = validateInquirySubmission(FIELDS, { email: 'not-an-email' })
    expect(errors).toEqual(
      expect.arrayContaining([
        { field: 'fullName', message: 'Full name is required' },
        { field: 'email', message: 'Email must be a valid email address' },
      ]),
    )
    expect(errors).toHaveLength(2)
  })

  it('rejects a non-boolean value on a checkbox field', () => {
    const checkboxFields: InquiryFormFieldDef[] = [
      { fieldType: 'checkbox', name: 'consent', label: 'Consent', required: true },
    ]
    const errors = validateInquirySubmission(checkboxFields, { consent: 'yes' })
    expect(errors).toEqual([{ field: 'consent', message: 'Consent must be true or false' }])
  })

  it('accepts a boolean checkbox value', () => {
    const checkboxFields: InquiryFormFieldDef[] = [
      { fieldType: 'checkbox', name: 'consent', label: 'Consent', required: true },
    ]
    const errors = validateInquirySubmission(checkboxFields, { consent: true })
    expect(errors).toEqual([])
  })
})
