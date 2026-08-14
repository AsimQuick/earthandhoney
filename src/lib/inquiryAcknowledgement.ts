/**
 * ---
 * file: src/lib/inquiryAcknowledgement.ts
 * project: earthandhoney
 * purpose: AC-33.6's optional branded acknowledgement to the person who
 *          submitted a Frontstage form — off by default, and owned by the
 *          same single system as AC-33.5's studio notification (Backstage's
 *          email queue), never a second sending system (CLAUDE.md's email
 *          pragmatic-default note: exactly one system sends any given email
 *          type). Mirrors src/lib/inquiryNotification.ts's shape exactly:
 *          this module opens no SMTP connection, holds no SMTP credential,
 *          and renders no subject or body — it hands data fields to
 *          Backstage's `POST /api/v1/notifications/inquiry-acknowledgement`
 *          route (vendor/picpeak/backend/src/routes/v1/notifications.js)
 *          and lets Backstage's own template (`inquiry_acknowledgement`,
 *          migration 121_add_inquiry_acknowledgement_email_template.js) do
 *          the rendering.
 *
 *          "Off by default" is enforced entirely here, before any network
 *          call is made: `sendInquiryAcknowledgement` reads
 *          `INQUIRY_ACKNOWLEDGEMENT_ENABLED` and returns immediately,
 *          issuing no `fetch` at all, unless it is exactly the string
 *          `'true'` — an unset, empty, or misspelled value all resolve to
 *          disabled. This is deliberately distinct from
 *          `sendInquiryNotification`, which always attempts to notify the
 *          studio; the acknowledgement is optional per AC-33.6, the studio
 *          notification is not.
 *
 *          A submission may not have a submitter email at all — the seven
 *          V1 field types (src/collections/Forms.ts) include `email` as one
 *          option among many, not a guaranteed field on every form. When no
 *          field of type `email` was submitted with a non-empty value, this
 *          module has no address to acknowledge and returns without
 *          attempting a send — silently, the same way a form with no
 *          submitter email address simply cannot be acknowledged.
 *
 *          Exactly one request is issued per call (never a loop, unlike
 *          `sendInquiryNotification`'s per-studio-recipient loop) — there is
 *          exactly one submitter to acknowledge. Called from
 *          src/app/(frontend)/api/inquiries/route.ts AFTER the Inquiry
 *          record has already committed and independently of the studio
 *          notification's own outcome, wrapped in its own try/catch there
 *          so a failure here can never affect the durable record, the
 *          201 response, or the studio notification.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.6
 * ---
 */

import type { InquiryFormFieldDef } from '@/lib/validateInquirySubmission'

export class InquiryAcknowledgementError extends Error {}

/**
 * The submitted value of the form's FIRST `email`-type field, in field
 * order — a form may declare more than one `email` field (PRD §20.2 places
 * no cap), but there is only ever one acknowledgement to send, so the
 * first one wins deterministically rather than picking arbitrarily.
 * Returns undefined when no `email`-type field exists on the form, or when
 * it exists but was left empty/non-string.
 */
export function findSubmitterEmail(
  formFields: InquiryFormFieldDef[],
  values: Record<string, unknown>,
): string | undefined {
  const emailField = formFields.find((field) => field.fieldType === 'email')
  if (!emailField) return undefined

  const raw = values[emailField.name]
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined
}

export interface InquiryAcknowledgementInput {
  id: string | number
  /** The Forms document's `publicTitle` — becomes the route's `form_title`. */
  formTitle: string
  /** The submitted value of the form's first `email`-type field, if any. */
  submitterEmail: string | undefined
  /** ISO-8601. Defaults to "now" server-side (the route itself does the same) when omitted. */
  submittedAt?: string
}

// Mirrors src/lib/inquiryNotification.ts's DEFAULT_INQUIRY_NOTIFICATION_TIMEOUT_MS.
export const DEFAULT_INQUIRY_ACKNOWLEDGEMENT_TIMEOUT_MS = 5000

/** Docker network hostname per CLAUDE.md's Docker Rules — never `localhost`. Same var/fallback as inquiryNotification.ts. */
function backstageBaseUrl(): string {
  return process.env.BACKSTAGE_BACKEND_URL || 'http://backstage-backend:3000'
}

function isAbortError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError'
}

/** Off by default (AC-33.6): only the literal string 'true' enables the acknowledgement. */
export function isInquiryAcknowledgementEnabled(): boolean {
  return process.env.INQUIRY_ACKNOWLEDGEMENT_ENABLED === 'true'
}

export async function sendInquiryAcknowledgement(
  inquiry: InquiryAcknowledgementInput,
  timeoutMs: number = DEFAULT_INQUIRY_ACKNOWLEDGEMENT_TIMEOUT_MS,
): Promise<void> {
  if (!isInquiryAcknowledgementEnabled()) {
    return
  }

  if (!inquiry.submitterEmail) {
    return
  }

  const token = process.env.BACKSTAGE_API_TOKEN
  if (!token) {
    throw new InquiryAcknowledgementError(
      `BACKSTAGE_API_TOKEN is not configured — cannot queue the acknowledgement for inquiry ${inquiry.id}`,
    )
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(`${backstageBaseUrl()}/api/v1/notifications/inquiry-acknowledgement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient_email: inquiry.submitterEmail,
        form_title: inquiry.formTitle,
        submitted_at: inquiry.submittedAt,
      }),
      signal: controller.signal,
    })
  } catch (error) {
    const reason = isAbortError(error) ? `timed out after ${timeoutMs}ms` : String(error)
    throw new InquiryAcknowledgementError(
      `Failed to reach the Backstage acknowledgement route for inquiry ${inquiry.id}: ${reason}`,
    )
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new InquiryAcknowledgementError(
      `Backstage acknowledgement route rejected inquiry ${inquiry.id} with HTTP ${response.status}${detail ? `: ${detail}` : ''}`,
    )
  }
}
