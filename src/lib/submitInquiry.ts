/**
 * ---
 * file: src/lib/submitInquiry.ts
 * project: earthandhoney
 * purpose: AC-33.2's create-before-notify ordering, isolated as a pure
 *          function so it is unit-testable without importing the `payload`
 *          package directly (which breaks Jest's ESM interop boundary — see
 *          src/lib/getPageBySlug.ts's header for the same constraint). The
 *          Inquiry record is created and awaited FIRST; the notification
 *          attempt happens only after that create has already resolved, and
 *          any notification failure is caught here rather than propagated,
 *          so a failed or slow notification can never undo, roll back, or
 *          appear to fail the already-durable record. The route handler
 *          (src/app/(frontend)/api/inquiries/route.ts) supplies the real
 *          `createInquiry`/`notify` implementations; tests supply mocks.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.2
 * ---
 */

export interface SubmitInquiryInput {
  formId: string | number
  values: Record<string, unknown>
  sourcePage: string
  utm: {
    source?: string
    medium?: string
    campaign?: string
    term?: string
    content?: string
  }
}

export interface CreatedInquiry {
  id: string | number
}

export interface SubmitInquiryDeps {
  createInquiry: (input: SubmitInquiryInput) => Promise<CreatedInquiry>
  notify: (inquiry: CreatedInquiry & { formId: string | number; sourcePage: string }) => Promise<void>
}

export interface SubmitInquiryResult {
  id: string | number
  notified: boolean
}

export async function submitInquiry(
  deps: SubmitInquiryDeps,
  input: SubmitInquiryInput,
): Promise<SubmitInquiryResult> {
  // Committed BEFORE any notification is attempted (AC-33.2) — this line is
  // awaited to completion before `notify` is even referenced below.
  const created = await deps.createInquiry(input)

  let notified = true
  try {
    await deps.notify({ id: created.id, formId: input.formId, sourcePage: input.sourcePage })
  } catch (error) {
    notified = false
    console.error('submitInquiry: notification failed, inquiry record is unaffected', error)
  }

  return { id: created.id, notified }
}
