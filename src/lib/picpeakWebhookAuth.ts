/**
 * ---
 * file: src/lib/picpeakWebhookAuth.ts
 * project: earthandhoney
 * purpose: AC-26.1 — recomputes and verifies the `X-PicPeak-Signature`
 *          HMAC-SHA256 header Backstage's webhook delivery worker sends
 *          (`vendor/picpeak/backend/src/services/webhookService.js:35-37,
 *          124-137`), over the exact raw request body, using constant-time
 *          comparison. This is Flow C step 3 of
 *          PAYLOAD_PICPEAK_API_CONTRACT.md — the whole security basis of
 *          the flow, since Backstage is authenticating *to* Frontstage
 *          here, the reverse of every other row in the contract. Mirrors
 *          upstream's own `verifySignature` primitive exactly (hex digest,
 *          `crypto.timingSafeEqual`) so a signature Backstage considers
 *          valid is also considered valid here. Deliberately
 *          framework-agnostic (mirrors backstageClient.ts /
 *          galleryRevalidation.ts) so it is directly unit-testable without
 *          a Next.js request object.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.1
 * ---
 */

import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Recomputes the HMAC-SHA256 signature over `rawBody` with `secret` and
 * compares it, in constant time, against the signature Backstage sent.
 * Returns false — never throws — for any missing/malformed/mismatched
 * input, including an unset secret (an unconfigured receiver can never be
 * treated as trusting an unsigned request).
 */
export function verifyPicPeakWebhookSignature(
  secret: string | null | undefined,
  rawBody: string,
  signatureHeader: string | null | undefined,
): boolean {
  if (!secret || !signatureHeader) return false

  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  const expectedBuf = Buffer.from(expected, 'hex')

  let receivedBuf: Buffer
  try {
    receivedBuf = Buffer.from(signatureHeader, 'hex')
  } catch {
    return false
  }

  // timingSafeEqual throws on length mismatch, so it must be checked first
  // — but that length check itself is not the secret-dependent comparison,
  // so it leaks no more than the (already-public) signature format does.
  if (expectedBuf.length !== receivedBuf.length) return false

  return timingSafeEqual(expectedBuf, receivedBuf)
}
