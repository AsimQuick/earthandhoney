/**
 * ---
 * file: src/lib/spamProtection.ts
 * project: earthandhoney
 * purpose: AC-33.4's three spam defenses for the Frontstage form-submission
 *          receiver, each pure/payload-import-free (same constraint as
 *          src/lib/submitInquiry.ts and src/lib/validateInquirySubmission.ts)
 *          so they are directly unit-testable: (1) `isHoneypotFilled` — a
 *          hidden field a human never fills in but a scripted bot typically
 *          does; (2) `isSubmissionTooFast` — a submission completed less
 *          than SUBMISSION_MIN_ELAPSED_MS after the form was rendered, faster
 *          than a human can plausibly type; (3) `createSourceRateLimiter` —
 *          an in-memory sliding-window limiter keyed by request source (the
 *          caller's IP, per SPAM_PROTECTION_ADR.md — not `sourcePage`, which
 *          the client controls and can spoof at will). All three fail open
 *          when their signal is absent (no honeypot value, no renderedAt
 *          timestamp) rather than fail closed, so a request that predates
 *          AC-33.7's rendered form (for example AC-33.3's direct-POST
 *          fixtures, which never set either field) is judged on validation
 *          alone, exactly as before this AC — spam protection layers on top
 *          without re-opening AC-33.3's already-closed evidence. The route
 *          handler (src/app/(frontend)/api/inquiries/route.ts) wires the
 *          in-memory limiter as a module-level singleton and calls all three
 *          checks before the Forms lookup and validateInquirySubmission().
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.4
 * ---
 */

export function isHoneypotFilled(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

// A real visitor cannot read the form, type into it, and submit it in under
// this many milliseconds; a scripted submission that fires immediately after
// requesting the page reliably does. Chosen conservatively low so a fast but
// genuine human submission (autofill, a returning visitor who already knows
// what to type) is never rejected.
export const SUBMISSION_MIN_ELAPSED_MS = 2000

export function isSubmissionTooFast(renderedAtMs: unknown, submittedAtMs: number, thresholdMs: number = SUBMISSION_MIN_ELAPSED_MS): boolean {
  if (typeof renderedAtMs !== 'number' || !Number.isFinite(renderedAtMs)) {
    return false
  }
  return submittedAtMs - renderedAtMs < thresholdMs
}

export const INQUIRY_RATE_LIMIT_MAX_SUBMISSIONS = 5
export const INQUIRY_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

export interface SourceRateLimiter {
  // Records one submission attempt from `source` at `nowMs` and reports
  // whether it is allowed (true) or exceeds the per-source limit (false).
  // Only allowed attempts count toward the window — a blocked attempt is not
  // itself recorded again, so retrying blocked requests can't extend a
  // source's own block.
  consume(source: string, nowMs: number): boolean
}

// In-memory, per-process state (DoD item 6 / SPAM_PROTECTION_ADR.md): V1 runs
// one Next.js process on one VPS (CLAUDE.md Docker Rules), so there is no
// second process for this state to be inconsistent with, and a restart
// harmlessly resets an ephemeral abuse-rate signal rather than losing a
// durable record.
export function createSourceRateLimiter(
  maxSubmissions: number = INQUIRY_RATE_LIMIT_MAX_SUBMISSIONS,
  windowMs: number = INQUIRY_RATE_LIMIT_WINDOW_MS,
): SourceRateLimiter {
  const submissionTimestampsBySource = new Map<string, number[]>()

  return {
    consume(source: string, nowMs: number): boolean {
      const windowStart = nowMs - windowMs
      const withinWindow = (submissionTimestampsBySource.get(source) ?? []).filter(
        (timestamp) => timestamp > windowStart,
      )

      if (withinWindow.length >= maxSubmissions) {
        submissionTimestampsBySource.set(source, withinWindow)
        return false
      }

      withinWindow.push(nowMs)
      submissionTimestampsBySource.set(source, withinWindow)
      return true
    },
  }
}
