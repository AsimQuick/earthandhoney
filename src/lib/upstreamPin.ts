/**
 * ---
 * file: src/lib/upstreamPin.ts
 * project: earthandhoney
 * purpose: Pure decision logic for AC-15.3 — validates that an upstream pin
 *          record is anchored to a fixed, full-length commit hash rather than
 *          a floating branch or tag reference. Production must never track a
 *          floating upstream branch; this encodes that rule as unit-tested,
 *          reusable logic instead of leaving it as prose only.
 * created-by: dev-team
 * related-story: US-15
 * related-ac: 15.3
 * ---
 */

export interface UpstreamPin {
  /** Clone URL of the upstream repository. */
  upstreamUrl: string
  /** Full 40-character git commit hash the fork is pinned to. */
  pinnedCommit: string
  /** Branch or tag the pinned commit was taken from, e.g. "main". */
  sourceRef: string
  /** ISO 8601 date (YYYY-MM-DD) the commit was pinned. */
  datePinned: string
}

const FULL_SHA = /^[0-9a-f]{40}$/i

export interface PinValidationResult {
  valid: boolean
  /** null unless the pin is invalid — explains what is wrong. */
  reason: string | null
}

/**
 * A pin is valid only when `pinnedCommit` is a full 40-character hex SHA.
 * Anything shorter, or a branch/tag name used in place of a commit hash,
 * would let production silently track a moving target as upstream advances —
 * exactly the floating-branch failure mode this AC forbids.
 */
export function validatePin(pin: UpstreamPin): PinValidationResult {
  if (!FULL_SHA.test(pin.pinnedCommit)) {
    return {
      valid: false,
      reason: `pinnedCommit must be a full 40-character commit hash, not a floating ref ("${pin.pinnedCommit}")`,
    }
  }
  if (!pin.upstreamUrl.trim()) {
    return { valid: false, reason: 'upstreamUrl must not be empty' }
  }
  if (!pin.sourceRef.trim()) {
    return { valid: false, reason: 'sourceRef must not be empty' }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pin.datePinned)) {
    return { valid: false, reason: `datePinned must be an ISO 8601 date ("${pin.datePinned}")` }
  }
  return { valid: true, reason: null }
}
