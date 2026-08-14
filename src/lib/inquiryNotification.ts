/**
 * ---
 * file: src/lib/inquiryNotification.ts
 * project: earthandhoney
 * purpose: The studio-notification step of a Frontstage form submission.
 *          CLAUDE.md's System Ownership table names the PicPeak/Backstage
 *          email queue as the single owner of all client and photographer
 *          email — wiring that queue is AC-33.5's job, not this AC's. Until
 *          AC-33.5 lands, every attempt here fails deterministically, which
 *          is exactly the "notification path forced to fail" AC-33.2's
 *          evidence exercises: src/lib/submitInquiry.ts calls this only
 *          AFTER the Inquiry record already committed, so this function
 *          failing can never cost a lead its durable record.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.2
 * ---
 */

export class InquiryNotificationError extends Error {}

export interface InquiryNotificationInput {
  id: string | number
  formId: string | number
  sourcePage: string
}

export async function sendInquiryNotification(_inquiry: InquiryNotificationInput): Promise<void> {
  throw new InquiryNotificationError(
    'Inquiry notification is not yet wired to the Backstage email queue — see AC-33.5.',
  )
}
