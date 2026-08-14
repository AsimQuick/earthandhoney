/**
 * ---
 * file: src/app/(frontend)/api/inquiries/route.ts
 * project: earthandhoney
 * purpose: AC-33.2 — the Frontstage form-submission receiver. Parses the
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
 *          Server-side field validation (AC-33.3) and spam protection
 *          (AC-33.4) are deliberately out of scope here.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.2
 * ---
 */
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { sendInquiryNotification } from '@/lib/inquiryNotification'
import { submitInquiry, type SubmitInquiryInput } from '@/lib/submitInquiry'

import config from '@payload-config'

interface InquiryRequestBody {
  formId?: unknown
  values?: unknown
  sourcePage?: unknown
  utm?: {
    source?: unknown
    medium?: unknown
    campaign?: unknown
    term?: unknown
    content?: unknown
  }
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
      notify: sendInquiryNotification,
    },
    input,
  )

  return NextResponse.json({ id: result.id }, { status: 201 })
}
