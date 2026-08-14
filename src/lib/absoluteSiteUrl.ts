/**
 * ---
 * file: src/lib/absoluteSiteUrl.ts
 * project: earthandhoney
 * purpose: AC-37.3 — the single owner of this deployment's public origin
 *          (`NEXT_PUBLIC_SITE_URL`, with the same local-dev default
 *          `.env.example` documents). The root layout already resolves every
 *          relative Metadata API URL against it via `metadataBase`
 *          (src/app/(frontend)/layout.tsx, AC-31.6), but JSON-LD has no
 *          `metadataBase` equivalent: a structured-data `url` must be written
 *          absolute by the route that emits it. Rather than let each route
 *          carry its own copy of the env read and its fallback literal, both
 *          the page and story JSON-LD blocks and the layout's `metadataBase`
 *          call through here — one origin, one fallback, one place to change
 *          it. Env-only and import-free, so a Jest test can exercise it
 *          directly without crossing the ESM boundary `payload` imposes (see
 *          us3-ac3.5-galleries-api-read.test.ts).
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.3
 * ---
 */

/** The origin used when `NEXT_PUBLIC_SITE_URL` is unset — the same value `.env.example` ships for local development. */
export const SITE_URL_FALLBACK = 'http://localhost:3000'

/** This deployment's public origin: `NEXT_PUBLIC_SITE_URL`, or the local-dev default when it is unset. */
export function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || SITE_URL_FALLBACK
}

/** Resolves a site-relative path (e.g. `/stories/a-real-wedding`) to an absolute URL against {@link siteOrigin}. */
export function absoluteSiteUrl(path: string): string {
  return new URL(path, siteOrigin()).toString()
}
