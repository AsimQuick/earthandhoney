/**
 * ---
 * file: src/lib/picpeakWebhookDeliveryDedup.ts
 * project: earthandhoney
 * purpose: AC-26.5 — makes the webhook receiver idempotent against duplicate
 *          and replayed deliveries. Backstage's delivery worker
 *          (`vendor/picpeak/backend/src/services/webhookDeliveryWorker.js`)
 *          retries a delivery up to 5 times on failure/timeout and may also
 *          redeliver the same `X-PicPeak-Delivery` id for other operational
 *          reasons (a receiver ack lost in transit, a manual replay from the
 *          admin deliveries page); the receiver must treat re-processing the
 *          same delivery id as a no-op rather than a second real event.
 *          `claimWebhookDelivery` is the single check-and-mark primitive: it
 *          returns `true` the first time a given delivery id is seen (the
 *          caller should process it) and `false` on every subsequent call
 *          with the same id (already handled — skip work, still respond
 *          2xx). It runs synchronously with no `await` in its body, so
 *          there's no window between the membership check and the mark
 *          where a second concurrent call could also observe "not yet
 *          claimed" — Node's single-threaded event loop makes this atomic by
 *          construction. A delivery id is not required: Backstage's outbound
 *          worker always sends one, but a caller with none (e.g. a
 *          hand-built test payload missing the header) always gets `true`,
 *          since there is no id to dedupe against — this module never turns
 *          a missing id into a silent drop. Bounded by
 *          `MAX_TRACKED_DELIVERIES` (oldest-first eviction) so a long-lived
 *          process's memory for this can't grow without bound.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.5
 * ---
 */

/**
 * How many distinct delivery ids to remember before evicting the oldest.
 * Backstage's own retry window tops out at 12h between the 4th and 5th
 * attempt (`webhookDeliveryWorker.js`'s `BACKOFF_MS`), and normal delivery
 * volume for a single-studio deployment is low, so a few hundred entries is
 * comfortably more than any real replay window needs.
 */
const MAX_TRACKED_DELIVERIES = 500

const seenDeliveryIds = new Set<string>()
const deliveryIdInsertionOrder: string[] = []

/**
 * Returns `true` the first time `deliveryId` is claimed, `false` every time
 * after. A `null`/`undefined`/empty id always returns `true` — there is
 * nothing to dedupe against, so the caller must process it.
 */
export function claimWebhookDelivery(deliveryId: string | null | undefined): boolean {
  if (!deliveryId) return true
  if (seenDeliveryIds.has(deliveryId)) return false

  seenDeliveryIds.add(deliveryId)
  deliveryIdInsertionOrder.push(deliveryId)
  if (deliveryIdInsertionOrder.length > MAX_TRACKED_DELIVERIES) {
    const oldest = deliveryIdInsertionOrder.shift()
    if (oldest !== undefined) seenDeliveryIds.delete(oldest)
  }
  return true
}

/** Test-only: clears module-level state between test cases. */
export function __resetWebhookDeliveryDedupForTests(): void {
  seenDeliveryIds.clear()
  deliveryIdInsertionOrder.length = 0
}
