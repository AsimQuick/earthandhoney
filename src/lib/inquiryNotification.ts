/**
 * ---
 * file: src/lib/inquiryNotification.ts
 * project: earthandhoney
 * purpose: The studio-notification step of a Frontstage form submission
 *          (AC-33.5.2.3) — a real server-only client of the AC-33.5.2.2.2
 *          route `POST /api/v1/notifications/inquiry`
 *          (vendor/picpeak/backend/src/routes/v1/notifications.js), replacing
 *          the AC-33.2 stub that unconditionally rejected. Per CLAUDE.md's
 *          System Ownership table, Backstage's email queue is the single
 *          authoritative owner of all client and photographer email: this
 *          module opens no SMTP connection, holds no SMTP credential, and
 *          renders no subject or body — it only hands data fields to the
 *          route and lets Backstage's own template (`inquiry_received`,
 *          migration 120_add_inquiry_notification_email_template.js) do the
 *          rendering. Authenticates with `BACKSTAGE_API_TOKEN` (a
 *          write-scoped Backstage API token, `.env.example`), presented as a
 *          bearer token exactly the way scripts/ac33.5.2.2-backstage-token-proof.sh
 *          proves the route accepts it — this credential never reaches the
 *          browser, since this module only ever runs server-side (the route
 *          handler at src/app/(frontend)/api/inquiries/route.ts calls it from
 *          a Next.js Route Handler, which executes on the server). Mirrors
 *          src/lib/backstageClient.ts's explicit-timeout-per-call convention
 *          so a slow/unreachable Backstage can never hang the Frontstage
 *          request that triggered it. One recipient email is queued per call
 *          to the route (its schema accepts exactly one `recipient_email`);
 *          `sendInquiryNotification` loops sequentially over every configured
 *          recipient so a failure is always attributable to the specific
 *          recipient that failed. src/lib/submitInquiry.ts calls this only
 *          AFTER the Inquiry record has already committed, so this function
 *          failing (a missing token, an unreachable Backstage, a rejected
 *          request) can never cost a lead its durable record — AC-33.2's
 *          forced-failure evidence keeps working, now from a real cause
 *          (Backstage unreachable / token unset) rather than a test hook.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.5.2.3
 * ---
 */

export class InquiryNotificationError extends Error {}

export interface InquiryNotificationInput {
  id: string | number
  formId: string | number
  sourcePage: string
  /** Every recipient configured on the Forms document this inquiry was submitted through. */
  recipientEmails: string[]
  /** The Forms document's `publicTitle` — becomes the route's `form_title`. */
  formTitle: string
  /** A plain-text rendering of the submitted field values — data, not an email body. */
  submissionSummary: string
  /** ISO-8601. Defaults to "now" server-side (the route itself does the same) when omitted. */
  submittedAt?: string
}

// Mirrors src/lib/backstageClient.ts's DEFAULT_BACKSTAGE_TIMEOUT_MS — a
// healthy Backstage on the same Docker network always beats this easily.
export const DEFAULT_INQUIRY_NOTIFICATION_TIMEOUT_MS = 5000

/** Docker network hostname per CLAUDE.md's Docker Rules — never `localhost`. Same var/fallback as backstageClient.ts. */
function backstageBaseUrl(): string {
  return process.env.BACKSTAGE_BACKEND_URL || 'http://backstage-backend:3000'
}

function isAbortError(err: unknown): boolean {
  // Same check as backstageClient.ts's isAbortError — a timeout abort
  // surfaces as a DOMException, which does not reliably satisfy
  // `instanceof Error` across every JS realm a test runner may construct.
  return typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError'
}

async function queueOneNotification(
  recipientEmail: string,
  inquiry: InquiryNotificationInput,
  token: string,
  timeoutMs: number,
): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(`${backstageBaseUrl()}/api/v1/notifications/inquiry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient_email: recipientEmail,
        form_title: inquiry.formTitle,
        source_page: inquiry.sourcePage,
        submission_summary: inquiry.submissionSummary,
        submitted_at: inquiry.submittedAt,
      }),
      signal: controller.signal,
    })
  } catch (error) {
    const reason = isAbortError(error) ? `timed out after ${timeoutMs}ms` : String(error)
    throw new InquiryNotificationError(
      `Failed to reach the Backstage notification route for inquiry ${inquiry.id} (recipient ${recipientEmail}): ${reason}`,
    )
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new InquiryNotificationError(
      `Backstage notification route rejected inquiry ${inquiry.id} (recipient ${recipientEmail}) with HTTP ${response.status}${detail ? `: ${detail}` : ''}`,
    )
  }
}

export async function sendInquiryNotification(
  inquiry: InquiryNotificationInput,
  timeoutMs: number = DEFAULT_INQUIRY_NOTIFICATION_TIMEOUT_MS,
): Promise<void> {
  const token = process.env.BACKSTAGE_API_TOKEN
  if (!token) {
    throw new InquiryNotificationError(
      `BACKSTAGE_API_TOKEN is not configured — cannot queue the studio notification for inquiry ${inquiry.id}`,
    )
  }

  if (inquiry.recipientEmails.length === 0) {
    throw new InquiryNotificationError(`Inquiry ${inquiry.id} has no configured recipient email`)
  }

  // Sequential, not Promise.all: the route has no batch form, and a partial
  // failure must stay attributable to exactly the recipient that failed.
  for (const recipientEmail of inquiry.recipientEmails) {
    await queueOneNotification(recipientEmail, inquiry, token, timeoutMs)
  }
}
