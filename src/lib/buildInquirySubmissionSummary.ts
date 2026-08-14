/**
 * ---
 * file: src/lib/buildInquirySubmissionSummary.ts
 * project: earthandhoney
 * purpose: Formats a validated inquiry submission's field values into the
 *          plain-text `submission_summary` data field the AC-33.5.2.2.2
 *          route requires (vendor/picpeak/backend/src/routes/v1/notifications.js).
 *          This is a data field the route stores on `email_queue.email_data`
 *          for Backstage's own template to render into the actual email body
 *          — not the email body itself, so building it in Frontstage does
 *          not cross the "renders no subject or body" line CLAUDE.md's
 *          System Ownership table draws. Pure and payload-import-free (same
 *          constraint as src/lib/validateInquirySubmission.ts, which
 *          `InquiryFormFieldDef` is reused from) so it is directly
 *          unit-testable without a database.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.5.2.3
 * ---
 */
import type { InquiryFormFieldDef } from '@/lib/validateInquirySubmission'

export function buildInquirySubmissionSummary(
  formFields: InquiryFormFieldDef[],
  values: Record<string, unknown>,
): string {
  return formFields
    .map((field) => {
      const raw = values[field.name]
      const display = raw === undefined || raw === null || raw === '' ? '(not provided)' : String(raw)
      return `${field.label}: ${display}`
    })
    .join('\n')
}
