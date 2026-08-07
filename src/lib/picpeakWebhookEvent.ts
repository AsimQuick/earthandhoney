/**
 * ---
 * file: src/lib/picpeakWebhookEvent.ts
 * project: earthandhoney
 * purpose: AC-26.2 — parses a verified PicPeak webhook body into its event
 *          `type` and the changed gallery's `id`/`slug`, and states which
 *          event types this receiver actually acts on. Backstage's outbound
 *          envelope (`vendor/picpeak/backend/src/services/webhookService.js`
 *          `fire()`/`buildEventSubject()`) nests the gallery subject under
 *          `data.event.{id,slug}` for every event type this receiver
 *          handles (`adminEvents.js:829-830` for `event.published`,
 *          `fileWatcher.js:142-143,167-168` and `adminPhotos.js:694-695` for
 *          `photo.uploaded`/`photo.deleted`); a flat `data.{id,slug}` is
 *          also accepted so a minimal/manually-built test payload still
 *          parses. Contract row 5's full event-type catalog is six values
 *          (`event.created`, `event.published`, `event.archived`,
 *          `event.expired`, `photo.uploaded`, `photo.deleted`) — this
 *          receiver deliberately handles only three of them
 *          (`PICPEAK_WEBHOOK_HANDLED_EVENT_TYPES`); the rest are real,
 *          documented event types this AC chooses not to act on yet, not
 *          typos, so they must be *accepted* (2xx) and ignored, never
 *          treated as an error. Deliberately payload-import-free (mirrors
 *          picpeakWebhookAuth.ts / galleryRevalidation.ts) so it's directly
 *          unit-testable without a Next.js request object.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.2
 * ---
 */

/**
 * The subset of contract row 5's fixed event-type catalog this receiver
 * triggers a Frontstage revalidation for. `event.created`, `event.archived`,
 * and `event.expired` are real catalog entries this AC does not wire up —
 * an unrecognised-to-this-receiver type is accepted and ignored, not an
 * error.
 */
export const PICPEAK_WEBHOOK_HANDLED_EVENT_TYPES = [
  'event.published',
  'photo.uploaded',
  'photo.deleted',
] as const

export type PicPeakWebhookHandledEventType = (typeof PICPEAK_WEBHOOK_HANDLED_EVENT_TYPES)[number]

export interface ParsedPicPeakWebhookEvent {
  type: string
  gallerySlug: string | null
  galleryId: number | string | null
}

/** True for exactly the three event types this receiver acts on. */
export function isHandledPicPeakWebhookEvent(
  type: string | null | undefined,
): type is PicPeakWebhookHandledEventType {
  return (
    type != null &&
    (PICPEAK_WEBHOOK_HANDLED_EVENT_TYPES as readonly string[]).includes(type)
  )
}

/**
 * Parses a verified webhook's raw JSON body into its event `type` and the
 * changed gallery's `id`/`slug`. Returns `null` for anything that isn't a
 * JSON object with a string `type` — never throws, so a caller can treat a
 * malformed-but-signed body as "nothing to act on" rather than crash.
 * `gallerySlug`/`galleryId` are `null`, not absent, when the body carries no
 * gallery subject at all (e.g. a future event type with a different shape).
 */
export function parsePicPeakWebhookEvent(rawBody: string): ParsedPicPeakWebhookEvent | null {
  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return null
  }

  if (typeof body !== 'object' || body === null) return null
  const envelope = body as Record<string, unknown>
  if (typeof envelope.type !== 'string') return null

  const data = envelope.data
  const dataObj = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null
  const eventSubject =
    dataObj && typeof dataObj.event === 'object' && dataObj.event !== null
      ? (dataObj.event as Record<string, unknown>)
      : dataObj

  const rawSlug = eventSubject?.slug
  const rawId = eventSubject?.id

  return {
    type: envelope.type,
    gallerySlug: typeof rawSlug === 'string' ? rawSlug : null,
    galleryId: typeof rawId === 'number' || typeof rawId === 'string' ? rawId : null,
  }
}
