/**
 * ---
 * file: src/app/(frontend)/api/inquiries/route.ts
 * project: earthandhoney
 * purpose: The Frontstage form-submission receiver (AC-33.2). Parses the
 *          submitted body and hands it to src/lib/submitInquiry.ts, whose
 *          `createInquiry` is wired here to Payload's local API
 *          (`payload.create`, awaited to completion) and whose `notify` is
 *          wired to src/lib/inquiryNotification.ts. The Inquiry record is
 *          therefore committed to the database before the response is ever
 *          built around a notification outcome, and a notification failure
 *          (currently: every attempt, since AC-33.5 hasn't wired the real
 *          Backstage email queue yet) never changes the 201 response or the
 *          persisted record. Coexists with the Payload catch-all at
 *          src/app/(payload)/api/[...slug]/route.ts the same way
 *          src/app/(frontend)/api/webhooks/picpeak/route.ts does: Next.js
 *          resolves a static segment (`/api/inquiries`) ahead of the
 *          sibling catch-all (`/api/[...slug]`) in a different route group.
 *          Server-side field validation runs here (AC-33.3): the
 *          referenced Forms document is looked up and every submitted value
 *          is checked with src/lib/validateInquirySubmission.ts BEFORE
 *          submitInquiry() — and therefore createInquiry() — is ever
 *          called, so a submission that fails validation (a missing
 *          required field, a malformed email, an over-long field) is
 *          rejected with a 400 and no Inquiry record is written. Spam
 *          protection (AC-33.4, src/lib/spamProtection.ts) runs earlier
 *          still, ahead of the Forms lookup: a per-source rate limit is
 *          checked first (429, no record written, no third-party service —
 *          SPAM_PROTECTION_ADR.md) and, if that passes, a filled honeypot or
 *          a too-fast submission is each accepted with the same 201 shape a
 *          real success gets but with no Inquiry ever created — a bot
 *          scripted against this endpoint's responses cannot distinguish a
 *          silently-dropped submission from a real one. The already-fetched
 *          `form` document supplies the data fields AC-33.5.2.3's real
 *          `sendInquiryNotification` hands to Backstage: `recipients[].email`,
 *          `publicTitle`, and the submitted values formatted by
 *          src/lib/buildInquirySubmissionSummary.ts — no second lookup.
 *          After `submitInquiry()` returns, AC-33.6's optional branded
 *          acknowledgement to the submitter is attempted via
 *          src/lib/inquiryAcknowledgement.ts, using the same already-fetched
 *          `formFields`/`formTitle` to find a submitter email
 *          (`findSubmitterEmail`) — independent of the studio notification's
 *          own outcome, wrapped in its own try/catch here so a failure can
 *          never affect the durable record or the 201 response.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.6
 * ---
 */
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { buildInquirySubmissionSummary } from '@/lib/buildInquirySubmissionSummary'
import { findSubmitterEmail, sendInquiryAcknowledgement } from '@/lib/inquiryAcknowledgement'
import { sendInquiryNotification } from '@/lib/inquiryNotification'
import {
  createSourceRateLimiter,
  isHoneypotFilled,
  isSubmissionTooFast,
} from '@/lib/spamProtection'
import { submitInquiry, type SubmitInquiryInput } from '@/lib/submitInquiry'
import { validateInquirySubmission, type InquiryFormFieldDef } from '@/lib/validateInquirySubmission'

import config from '@payload-config'

interface InquiryRequestBody {
  formId?: unknown
  values?: unknown
  sourcePage?: unknown
  honeypot?: unknown
  renderedAt?: unknown
  utm?: {
    source?: unknown
    medium?: unknown
    campaign?: unknown
    term?: unknown
    content?: unknown
  }
}

// One limiter per process, shared across every request this Next.js server
// handles — deliberate (see src/lib/spamProtection.ts's header). A rate
// limiter that resets per-request would never limit anything.
const inquiryRateLimiter = createSourceRateLimiter()

function getRequestSource(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }
  return request.headers.get('x-real-ip') ?? 'unknown'
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: InquiryRequestBody
  try {
    body = (await request.json()) as InquiryRequestBody
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  if (typeof body.formId !== 'string' && typeof body.formId !== 'number') {
    return NextResponse.json({ error: 'formId is required' }, { status: 400 })
  }

  if (!inquiryRateLimiter.consume(getRequestSource(request), Date.now())) {
    return NextResponse.json({ error: 'too many submissions' }, { status: 429 })
  }

  // A filled honeypot or a too-fast submission is spam, but the response
  // deliberately mirrors a real 201 success — no distinguishing status code
  // or body a scripted bot could use to learn it was caught silently.
  if (isHoneypotFilled(body.honeypot) || isSubmissionTooFast(body.renderedAt, Date.now())) {
    return NextResponse.json({ id: null }, { status: 201 })
  }

  const input: SubmitInquiryInput = {
    formId: body.formId,
    values: typeof body.values === 'object' && body.values !== null ? (body.values as Record<string, unknown>) : {},
    sourcePage: toOptionalString(body.sourcePage) ?? '',
    utm: {
      source: toOptionalString(body.utm?.source),
      medium: toOptionalString(body.utm?.medium),
      campaign: toOptionalString(body.utm?.campaign),
      term: toOptionalString(body.utm?.term),
      content: toOptionalString(body.utm?.content),
    },
  }

  const payload = await getPayload({ config })

  let formFields: InquiryFormFieldDef[]
  let formTitle: string
  let recipientEmails: string[]
  try {
    const form = await payload.findByID({ collection: 'forms', id: input.formId })
    formFields = (form.fields ?? []) as InquiryFormFieldDef[]
    formTitle = (form.publicTitle as string | undefined) ?? String(input.formId)
    const recipients = (form.recipients ?? []) as Array<{ email?: string | null }>
    recipientEmails = recipients
      .map((recipient) => recipient.email)
      .filter((email): email is string => typeof email === 'string' && email.length > 0)
  } catch {
    return NextResponse.json({ error: 'form not found' }, { status: 404 })
  }

  const fieldErrors = validateInquirySubmission(formFields, input.values)
  if (fieldErrors.length > 0) {
    return NextResponse.json({ error: 'validation failed', fieldErrors }, { status: 400 })
  }

  const submissionSummary = buildInquirySubmissionSummary(formFields, input.values)

  const result = await submitInquiry(
    {
      createInquiry: async (data) => {
        const doc = await payload.create({
          collection: 'inquiries',
          data: {
            form: data.formId,
            values: data.values,
            sourcePage: data.sourcePage,
            utm: data.utm,
          },
        })
        return { id: doc.id }
      },
      notify: (created) =>
        sendInquiryNotification({
          ...created,
          recipientEmails,
          formTitle,
          submissionSummary,
        }),
    },
    input,
  )

  // AC-33.6: the optional branded acknowledgement to the submitter — off by
  // default, attempted independently of the studio notification's outcome,
  // and never allowed to affect the already-committed Inquiry record or the
  // 201 response below.
  try {
    await sendInquiryAcknowledgement({
      id: result.id,
      formTitle,
      submitterEmail: findSubmitterEmail(formFields, input.values),
    })
  } catch (error) {
    console.error('route: acknowledgement failed, inquiry record and studio notification are unaffected', error)
  }

  return NextResponse.json({ id: result.id }, { status: 201 })
}
