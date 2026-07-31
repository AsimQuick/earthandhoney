/**
 * ---
 * file: src/lib/upstreamSync.ts
 * project: earthandhoney
 * purpose: Pure decision logic for AC-15.5 — validates that the sync policy
 *          recorded in UPSTREAM_SYNC.md is complete: it names a merge or
 *          rebase strategy, names at least one file most likely to conflict
 *          on a future upstream update, and states the reason for the
 *          chosen strategy.
 * created-by: dev-team
 * related-story: US-15
 * related-ac: 15.5
 * ---
 */

export type SyncStrategy = 'merge' | 'rebase'

export interface SyncPolicy {
  strategy: SyncStrategy
  /** Files most likely to conflict on a future upstream update. */
  conflictProneFiles: string[]
  /** Why this strategy was chosen over the alternative. */
  rationale: string
}

export interface SyncPolicyValidation {
  valid: boolean
  /** null unless the policy is invalid — explains what is wrong. */
  reason: string | null
}

/**
 * A sync policy is complete only when it commits to one named strategy, lists
 * at least one conflict-prone file so a future update can scope its review,
 * and states why — an unstated rationale would leave the next update to
 * relitigate the merge-vs-rebase choice from scratch.
 */
export function validateSyncPolicy(policy: SyncPolicy): SyncPolicyValidation {
  if (policy.strategy !== 'merge' && policy.strategy !== 'rebase') {
    return { valid: false, reason: `strategy must be "merge" or "rebase" ("${policy.strategy}")` }
  }
  if (policy.conflictProneFiles.length === 0) {
    return {
      valid: false,
      reason: 'conflictProneFiles must name at least one file most likely to conflict on a future update',
    }
  }
  if (!policy.rationale.trim()) {
    return { valid: false, reason: 'rationale must not be empty' }
  }
  return { valid: true, reason: null }
}
