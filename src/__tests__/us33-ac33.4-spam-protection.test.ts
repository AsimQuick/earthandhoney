/**
 * ---
 * file: src/__tests__/us33-ac33.4-spam-protection.test.ts
 * project: earthandhoney
 * purpose: Unit-tests the three pure spam-protection signals in
 *          src/lib/spamProtection.ts directly, with in-memory inputs and no
 *          network/db: isHoneypotFilled, isSubmissionTooFast (including the
 *          fail-open behaviour when renderedAt is absent, which is what
 *          keeps AC-33.3's pre-AC-33.4 direct-POST fixtures passing), and
 *          createSourceRateLimiter's sliding-window per-source behaviour
 *          (limit reached, window expiry, per-source isolation, blocked
 *          attempts not themselves extending the block).
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.4
 * ---
 */
import {
  createSourceRateLimiter,
  INQUIRY_RATE_LIMIT_MAX_SUBMISSIONS,
  INQUIRY_RATE_LIMIT_WINDOW_MS,
  isHoneypotFilled,
  isSubmissionTooFast,
  SUBMISSION_MIN_ELAPSED_MS,
} from '@/lib/spamProtection'

describe('AC-33.4: isHoneypotFilled', () => {
  it('is false when the honeypot value is absent, undefined, or empty', () => {
    expect(isHoneypotFilled(undefined)).toBe(false)
    expect(isHoneypotFilled(null)).toBe(false)
    expect(isHoneypotFilled('')).toBe(false)
    expect(isHoneypotFilled('   ')).toBe(false)
  })

  it('is true when the honeypot value is a non-empty string', () => {
    expect(isHoneypotFilled('I am a bot')).toBe(true)
    expect(isHoneypotFilled('x')).toBe(true)
  })

  it('is false for non-string values a legitimate client would never send', () => {
    expect(isHoneypotFilled(123)).toBe(false)
    expect(isHoneypotFilled(true)).toBe(false)
  })
})

describe('AC-33.4: isSubmissionTooFast', () => {
  it('defaults the threshold to SUBMISSION_MIN_ELAPSED_MS', () => {
    expect(SUBMISSION_MIN_ELAPSED_MS).toBeGreaterThan(0)
  })

  it('is true when submitted before the threshold has elapsed since renderedAt', () => {
    const renderedAt = 1_000_000
    expect(isSubmissionTooFast(renderedAt, renderedAt + SUBMISSION_MIN_ELAPSED_MS - 1)).toBe(true)
    expect(isSubmissionTooFast(renderedAt, renderedAt)).toBe(true)
  })

  it('is false once at least the threshold has elapsed', () => {
    const renderedAt = 1_000_000
    expect(isSubmissionTooFast(renderedAt, renderedAt + SUBMISSION_MIN_ELAPSED_MS)).toBe(false)
    expect(isSubmissionTooFast(renderedAt, renderedAt + 60_000)).toBe(false)
  })

  it('honours a custom threshold', () => {
    const renderedAt = 0
    expect(isSubmissionTooFast(renderedAt, 4999, 5000)).toBe(true)
    expect(isSubmissionTooFast(renderedAt, 5000, 5000)).toBe(false)
  })

  it('fails open (not-too-fast) when renderedAt is absent or not a finite number', () => {
    // Keeps AC-33.3's existing direct-POST fixtures — which never set
    // renderedAt — judged on field validation alone, not spam signals.
    expect(isSubmissionTooFast(undefined, Date.now())).toBe(false)
    expect(isSubmissionTooFast(null, Date.now())).toBe(false)
    expect(isSubmissionTooFast('not-a-number', Date.now())).toBe(false)
    expect(isSubmissionTooFast(Number.NaN, Date.now())).toBe(false)
  })
})

describe('AC-33.4: createSourceRateLimiter', () => {
  it('exposes the named V1 defaults', () => {
    expect(INQUIRY_RATE_LIMIT_MAX_SUBMISSIONS).toBeGreaterThan(0)
    expect(INQUIRY_RATE_LIMIT_WINDOW_MS).toBeGreaterThan(0)
  })

  it('allows up to maxSubmissions within the window, then blocks the next one', () => {
    const limiter = createSourceRateLimiter(3, 10_000)
    const now = 100_000

    expect(limiter.consume('1.2.3.4', now)).toBe(true)
    expect(limiter.consume('1.2.3.4', now + 1)).toBe(true)
    expect(limiter.consume('1.2.3.4', now + 2)).toBe(true)
    expect(limiter.consume('1.2.3.4', now + 3)).toBe(false)
  })

  it('tracks each source independently', () => {
    const limiter = createSourceRateLimiter(1, 10_000)
    const now = 100_000

    expect(limiter.consume('1.2.3.4', now)).toBe(true)
    expect(limiter.consume('1.2.3.4', now + 1)).toBe(false)
    // A different source has its own, unaffected budget.
    expect(limiter.consume('5.6.7.8', now + 1)).toBe(true)
  })

  it('allows a submission again once the earlier ones have aged out of the window', () => {
    const limiter = createSourceRateLimiter(1, 10_000)
    const now = 100_000

    expect(limiter.consume('1.2.3.4', now)).toBe(true)
    expect(limiter.consume('1.2.3.4', now + 5_000)).toBe(false)
    // The first attempt is now outside the 10s window.
    expect(limiter.consume('1.2.3.4', now + 10_001)).toBe(true)
  })

  it('does not let a blocked attempt itself extend the block window', () => {
    const limiter = createSourceRateLimiter(1, 10_000)
    const now = 100_000

    expect(limiter.consume('1.2.3.4', now)).toBe(true)
    // Repeated blocked retries, well past where a second real slot would sit.
    expect(limiter.consume('1.2.3.4', now + 100)).toBe(false)
    expect(limiter.consume('1.2.3.4', now + 9_000)).toBe(false)
    // Only the original allowed attempt at `now` counts, so the window
    // clears exactly 10s after it, unaffected by the retries in between.
    expect(limiter.consume('1.2.3.4', now + 10_001)).toBe(true)
  })
})
