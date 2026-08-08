/**
 * ---
 * file: src/lib/benchmark/redactSignedUrls.ts
 * project: earthandhoney
 * purpose: AC-29.2 — candidate delivery path 2 ("direct time-limited
 *          presigned R2 links") is measured against real presigned URLs, so
 *          the harness's own network-payload rows carry a live AWS SigV4
 *          query string. Those reports are committed as evidence
 *          (AC-29.3 requires the raw output be retained so numbers can be
 *          re-derived), and two of the SigV4 query parameters must not enter
 *          version control: `X-Amz-Credential`, which embeds the R2 access
 *          key id verbatim, and `X-Amz-Signature`, the HMAC that makes the
 *          URL fetchable for its TTL. Everything that carries evidentiary
 *          value — the R2 host, the object key, `X-Amz-Expires`,
 *          `X-Amz-Algorithm` — is preserved untouched, so a committed report
 *          still proves the request went straight to R2 rather than through
 *          the Backstage. Pure string logic: no fs, no network, so run.ts's
 *          write path stays unit-testable here rather than in Docker.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.2
 * ---
 */

/** SigV4 query parameters whose values are redacted before a report is committed. */
export const REDACTED_QUERY_PARAMS = ['X-Amz-Credential', 'X-Amz-Signature'] as const

export const REDACTION_PLACEHOLDER = 'REDACTED'

/**
 * Returns `url` with each `REDACTED_QUERY_PARAMS` value replaced by
 * `REDACTION_PLACEHOLDER`. A URL carrying none of them (every candidate-path-1
 * Backstage-proxied URL, and the site logo) is returned unchanged, and an
 * unparseable string is returned as-is rather than throwing — a malformed URL
 * in a Lighthouse network row must never lose a whole measured run.
 */
export function redactSignedUrl(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }

  let redacted = false
  for (const param of REDACTED_QUERY_PARAMS) {
    if (parsed.searchParams.has(param)) {
      parsed.searchParams.set(param, REDACTION_PLACEHOLDER)
      redacted = true
    }
  }

  return redacted ? parsed.toString() : url
}
