/**
 * ---
 * file: scripts/ac33.5-email-queue-live-proof.ts
 * project: earthandhoney
 * purpose: AC-33.5's live proof driver — the half that must run *inside* the
 *          Next.js container so the real, unmocked
 *          src/lib/inquiryNotification.ts module is what talks to Backstage.
 *          Calling the route with `curl` would only prove the fork's new
 *          route works; importing and invoking `sendInquiryNotification`
 *          proves the Frontstage code path this AC actually delivers hands
 *          the studio notification to the Backstage email queue and sends
 *          nothing itself. Invoked by
 *          scripts/ac33.5-email-queue-live-proof.sh, which owns the
 *          surrounding evidence collection (queue reads, MailHog reads).
 *          Reads BACKSTAGE_API_TOKEN and BACKSTAGE_BACKEND_URL from the
 *          environment exactly as the production route handler does — no
 *          SMTP credential is read here, because no mail is sent here.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.5
 * ---
 */
import { sendInquiryNotification } from '../src/lib/inquiryNotification'

async function main(): Promise<void> {
  const recipient = process.env.PROOF_RECIPIENT
  const marker = process.env.PROOF_MARKER
  if (!recipient || !marker) throw new Error('PROOF_RECIPIENT and PROOF_MARKER are required')

  await sendInquiryNotification({
    id: 33005,
    formId: 1,
    formTitle: 'Wedding enquiry',
    sourcePage: '/weddings',
    formFields: [
      { name: 'fullName', label: 'Full name' },
      { name: 'email', label: 'Email' },
      { name: 'weddingDate', label: 'Wedding date' },
      { name: 'consent', label: 'I agree to be contacted' },
      { name: 'notes', label: 'Anything else' },
    ],
    recipients: [{ email: recipient }],
    values: {
      fullName: `Jordan Casey ${marker}`,
      email: 'jordan@example.com',
      weddingDate: '2027-06-12',
      consent: true,
      notes: '',
    },
  })

  // Deliberately not "sent" — this module only ever queues.
  console.log('sendInquiryNotification resolved: notification handed to the Backstage email queue')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
