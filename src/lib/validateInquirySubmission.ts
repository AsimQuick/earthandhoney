/**
 * ---
 * file: src/lib/validateInquirySubmission.ts
 * project: earthandhoney
 * purpose: AC-33.3's authoritative server-side validation of a form
 *          submission against the Forms document it claims to be submitted
 *          through (src/collections/Forms.ts). Pure and payload-import-free
 *          (same constraint as src/lib/submitInquiry.ts) so it is directly
 *          unit-testable. Checks exactly the three failure modes the AC
 *          names: a required field left empty, a malformed value on an
 *          `email` field, and a value longer than its field type's maximum
 *          (INQUIRY_FIELD_MAX_LENGTH) — nothing beyond that (no dropdown
 *          option matching, no date-format check) is in scope. The route
 *          handler (src/app/(frontend)/api/inquiries/route.ts) calls this
 *          BEFORE submitInquiry(), so a submission that fails validation
 *          never reaches createInquiry and no Inquiry record is written.
 *          Browser-side mirroring of these same rules (native HTML
 *          validation attributes on the rendered form) is AC-33.7's
 *          concern — the server here is authoritative regardless of what
 *          the browser did or didn't check.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.3
 * ---
 */

export type InquiryFormFieldType =
  | 'shortText'
  | 'email'
  | 'phone'
  | 'date'
  | 'dropdown'
  | 'checkbox'
  | 'longText'

export interface InquiryFormFieldDef {
  fieldType: InquiryFormFieldType
  name: string
  label: string
  required?: boolean | null
}

export interface InquiryValidationError {
  field: string
  message: string
}

// Maximum stored length per V1 field type (src/collections/Forms.ts's
// FORM_FIELD_TYPE_OPTIONS). No field on the Forms collection carries its own
// per-field maxLength, so these are the single, fixed, sensible caps every
// field of a given type is checked against.
export const INQUIRY_FIELD_MAX_LENGTH: Record<InquiryFormFieldType, number> = {
  shortText: 200,
  email: 254, // RFC 5321 §4.5.3.1.3 maximum mailbox length
  phone: 30,
  date: 10, // YYYY-MM-DD
  dropdown: 200,
  checkbox: 5, // stringified 'true'/'false', if ever sent as a string
  longText: 5000,
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || value === ''
}

export function validateInquirySubmission(
  formFields: InquiryFormFieldDef[],
  values: Record<string, unknown>,
): InquiryValidationError[] {
  const errors: InquiryValidationError[] = []

  for (const field of formFields) {
    const raw = values[field.name]

    if (field.required && isEmptyValue(raw)) {
      errors.push({ field: field.name, message: `${field.label} is required` })
      continue
    }

    if (isEmptyValue(raw)) {
      continue
    }

    if (field.fieldType === 'checkbox') {
      if (typeof raw !== 'boolean') {
        errors.push({ field: field.name, message: `${field.label} must be true or false` })
      }
      continue
    }

    if (typeof raw !== 'string') {
      errors.push({ field: field.name, message: `${field.label} must be a text value` })
      continue
    }

    if (field.fieldType === 'email' && !EMAIL_PATTERN.test(raw)) {
      errors.push({ field: field.name, message: `${field.label} must be a valid email address` })
    }

    const maxLength = INQUIRY_FIELD_MAX_LENGTH[field.fieldType]
    if (raw.length > maxLength) {
      errors.push({
        field: field.name,
        message: `${field.label} must be ${maxLength} characters or fewer`,
      })
    }
  }

  return errors
}
