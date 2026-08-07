/**
 * ---
 * file: src/lib/logger.ts
 * project: earthandhoney
 * purpose: AC-25.6 — the minimal structured error-logging entry point
 *          Frontstage server code calls on a Backstage failure (unreachable
 *          Backstage, timeout, 404 slug) so the failure is observable in
 *          server logs even though the visitor only ever sees a placeholder,
 *          never a raw error. No existing logging convention was found
 *          anywhere else under src/, so this wraps `console.error` with a
 *          single structured JSON line rather than inventing a bespoke
 *          per-call-site format. Deliberately tiny and dependency-free —
 *          swapping in a real log pipeline later is a config change to this
 *          one file, not a call-site rewrite.
 * created-by: dev-team
 * related-story: US-25
 * related-ac: 25.6
 * ---
 */

export interface ErrorLogFields {
  [key: string]: unknown
}

/** Logs one structured error line. Never throws — a logging failure must never become the reason a page fails to render. */
export function logError(message: string, fields: ErrorLogFields = {}): void {
  try {
    console.error(JSON.stringify({ level: 'error', message, ...fields }))
  } catch {
    console.error(message)
  }
}
