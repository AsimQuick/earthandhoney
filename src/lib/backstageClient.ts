/**
 * ---
 * file: src/lib/backstageClient.ts
 * project: earthandhoney
 * purpose: AC-25.2 — the single server-side Backstage client that implements
 *          Flow A rows 1-2 of PAYLOAD_PICPEAK_API_CONTRACT.md: `GET
 *          /api/gallery/:slug/info` for display metadata, then the `POST
 *          /api/auth/gallery/verify` handshake followed by `GET
 *          /api/gallery/:slug/photos` for the photo list. The verify
 *          handshake runs unconditionally, even when the gallery turns out
 *          to be public — the contract's row 2 text is explicit that
 *          nothing lets Frontstage assume `requires_password: false` in
 *          advance for an arbitrary slug. Every network call carries an
 *          explicit `AbortController` timeout, so a slow/unreachable
 *          Backstage can never hang the Frontstage request that triggered
 *          it. Deliberately payload-import-free and framework-agnostic
 *          (mirrors payloadGalleryMapper.ts / galleryRevalidation.ts) so it
 *          is directly unit-testable. Response caching (AC-25.4) and
 *          placeholder/error rendering on failure (AC-25.6) are later ACs'
 *          scope, not this file's.
 * created-by: dev-team
 * related-story: US-25
 * related-ac: 25.2
 * ---
 */

// PAYLOAD_PICPEAK_API_CONTRACT.md row 1/2: no numeric TTL is stated for the
// call itself (that's the 60s cache bound, a separate AC-25.4 concern) — 5s
// is this client's own "don't hang the request" budget, generous enough for
// a healthy Backstage on the same Docker network to always beat easily.
export const DEFAULT_BACKSTAGE_TIMEOUT_MS = 5000

/** Docker network hostname per CLAUDE.md's Docker Rules — never `localhost`. */
function backstageBaseUrl(): string {
  return process.env.BACKSTAGE_BACKEND_URL || 'http://backstage-backend:3000'
}

export interface GalleryInfo {
  event_name: string
  event_type: string | null
  event_date: string | null
  expires_at: string | null
  is_active: boolean
  is_expired: boolean
  requires_password: boolean
  color_theme: string | null
  allow_downloads: boolean
  allow_user_uploads: boolean
  [key: string]: unknown
}

export interface GalleryPhoto {
  id: number
  filename: string
  url: string
  thumbnail_url: string | null
  [key: string]: unknown
}

export interface GalleryPhotosResponse {
  event: Record<string, unknown>
  photos: GalleryPhoto[]
  [key: string]: unknown
}

export type BackstageFailureReason =
  | 'not_found'
  | 'redirect'
  | 'timeout'
  | 'network_error'
  | 'unauthorized'
  | 'unexpected_status'

export interface BackstageFailure {
  ok: false
  reason: BackstageFailureReason
  status: number | null
  error: string
  /** Only set when `reason === 'redirect'` (contract row 1's 301 body). */
  newSlug?: string
}

export type GalleryInfoResult = { ok: true; data: GalleryInfo } | BackstageFailure
export type VerifyResult = { ok: true; token: string | null } | BackstageFailure
export type PhotosResult = { ok: true; data: GalleryPhotosResponse } | BackstageFailure
export type FlowAOutcome =
  | { ok: true; info: GalleryInfo; photos: GalleryPhotosResponse }
  | (BackstageFailure & { step: 'info' | 'verify' | 'photos' })

function isAbortError(err: unknown): boolean {
  // Checked by `.name` alone, not `instanceof Error` — a real timeout abort
  // surfaces as a `DOMException` (Node's fetch/undici), which does not
  // reliably satisfy `instanceof Error` across every JS realm a test runner
  // may construct, even though it always carries `name: 'AbortError'`.
  return typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError'
}

/** Every call site funnels through here so no call can ever omit the timeout. */
async function backstageFetch(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(`${backstageBaseUrl()}${path}`, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Contract row 1 — `GET /api/gallery/:slug/info`. A 404 covers "not found",
 * "archived", and "not yet published" alike (Frontstage must treat all
 * three as "not available", per the contract). A 301 body means the slug
 * was renamed.
 */
export async function getGalleryInfo(
  slug: string,
  timeoutMs: number = DEFAULT_BACKSTAGE_TIMEOUT_MS,
): Promise<GalleryInfoResult> {
  let res: Response
  try {
    res = await backstageFetch(`/api/gallery/${encodeURIComponent(slug)}/info`, { method: 'GET' }, timeoutMs)
  } catch (err) {
    return isAbortError(err)
      ? {
          ok: false,
          reason: 'timeout',
          status: null,
          error: `Timed out fetching gallery info for "${slug}" after ${timeoutMs}ms`,
        }
      : {
          ok: false,
          reason: 'network_error',
          status: null,
          error: `Network error fetching gallery info for "${slug}": ${String(err)}`,
        }
  }

  if (res.status === 301) {
    const body = (await res.json().catch(() => ({}))) as { newSlug?: string }
    return { ok: false, reason: 'redirect', status: 301, error: 'Gallery has been renamed', newSlug: body.newSlug }
  }
  if (res.status === 404) {
    return { ok: false, reason: 'not_found', status: 404, error: 'Gallery not found, archived, or not yet published' }
  }
  if (!res.ok) {
    return { ok: false, reason: 'unexpected_status', status: res.status, error: `Unexpected status ${res.status} fetching gallery info` }
  }

  return { ok: true, data: (await res.json()) as GalleryInfo }
}

/**
 * Contract row 2, step 1 — `POST /api/auth/gallery/verify`. Coded
 * unconditionally: the caller must never skip this because a prior
 * `getGalleryInfo` call reported `requires_password: false` — the contract
 * does not let Frontstage assume that holds true for every gallery in
 * advance. `password` is omitted from the request body entirely for a
 * public gallery, matching the fork's own optional-password validation.
 */
export async function verifyGalleryAccess(
  slug: string,
  password?: string,
  timeoutMs: number = DEFAULT_BACKSTAGE_TIMEOUT_MS,
): Promise<VerifyResult> {
  let res: Response
  try {
    res = await backstageFetch(
      '/api/auth/gallery/verify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(password ? { slug, password } : { slug }),
      },
      timeoutMs,
    )
  } catch (err) {
    return isAbortError(err)
      ? { ok: false, reason: 'timeout', status: null, error: `Timed out verifying gallery "${slug}" after ${timeoutMs}ms` }
      : {
          ok: false,
          reason: 'network_error',
          status: null,
          error: `Network error verifying gallery "${slug}": ${String(err)}`,
        }
  }

  if (res.status === 401) {
    return { ok: false, reason: 'unauthorized', status: 401, error: 'Invalid gallery or password' }
  }
  if (!res.ok) {
    return { ok: false, reason: 'unexpected_status', status: res.status, error: `Unexpected status ${res.status} verifying gallery access` }
  }

  const body = (await res.json()) as { token?: string }
  return { ok: true, token: body.token ?? null }
}

/**
 * Contract row 2, step 2 — `GET /api/gallery/:slug/photos`. `token` is the
 * opaque gallery JWT `verifyGalleryAccess` returned; it is passed back as a
 * Bearer credential and never decoded (the contract forbids Frontstage from
 * trusting claims inside it beyond passing it back).
 */
export async function getGalleryPhotos(
  slug: string,
  token: string | null,
  timeoutMs: number = DEFAULT_BACKSTAGE_TIMEOUT_MS,
): Promise<PhotosResult> {
  let res: Response
  try {
    res = await backstageFetch(
      `/api/gallery/${encodeURIComponent(slug)}/photos`,
      { method: 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {} },
      timeoutMs,
    )
  } catch (err) {
    return isAbortError(err)
      ? { ok: false, reason: 'timeout', status: null, error: `Timed out fetching photos for "${slug}" after ${timeoutMs}ms` }
      : {
          ok: false,
          reason: 'network_error',
          status: null,
          error: `Network error fetching photos for "${slug}": ${String(err)}`,
        }
  }

  if (res.status === 401) {
    return { ok: false, reason: 'unauthorized', status: 401, error: 'No token provided or invalid token' }
  }
  if (res.status === 404) {
    return { ok: false, reason: 'not_found', status: 404, error: 'Gallery not found or expired' }
  }
  if (!res.ok) {
    return { ok: false, reason: 'unexpected_status', status: res.status, error: `Unexpected status ${res.status} fetching photos` }
  }

  return { ok: true, data: (await res.json()) as GalleryPhotosResponse }
}

/**
 * Flow A, rows 1-2 end to end: info, then the verify handshake (always),
 * then the photo list. Stops and reports which step failed on the first
 * failure — never proceeds to a later step on a failed earlier one.
 */
export async function fetchPublishedGallery(
  slug: string,
  opts: { password?: string; timeoutMs?: number } = {},
): Promise<FlowAOutcome> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_BACKSTAGE_TIMEOUT_MS

  const infoResult = await getGalleryInfo(slug, timeoutMs)
  if (!infoResult.ok) return { ...infoResult, step: 'info' }

  // Coded even though `infoResult.data.requires_password` is already known
  // here — see this function's docblock and verifyGalleryAccess's.
  const verifyResult = await verifyGalleryAccess(slug, opts.password, timeoutMs)
  if (!verifyResult.ok) return { ...verifyResult, step: 'verify' }

  const photosResult = await getGalleryPhotos(slug, verifyResult.token, timeoutMs)
  if (!photosResult.ok) return { ...photosResult, step: 'photos' }

  return { ok: true, info: infoResult.data, photos: photosResult.data }
}
