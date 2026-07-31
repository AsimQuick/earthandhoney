/**
 * ---
 * file: src/lib/capabilityAudit.ts
 * project: earthandhoney
 * purpose: Pure decision logic for AC-15.2 — given the evidence for each of
 *          the four capabilities the pivot depends on (Projects grouping
 *          above galleries, customer accounts, webhooks, S3-compatible
 *          storage) at a single candidate upstream commit, decide whether
 *          that commit actually provides all four. If it does not, produces
 *          the blocking-finding text the AC requires rather than letting the
 *          pivot silently proceed on a commit that is missing a capability.
 * created-by: dev-team
 * related-story: US-15
 * related-ac: 15.2
 * ---
 */

export interface CapabilityEvidence {
  /** Human-readable capability name, e.g. "Projects grouping above galleries". */
  name: string
  /** SHA of the upstream commit that first introduced this capability. */
  introducedAtCommit: string
  /** ISO 8601 date of that introducing commit. */
  introducedAt: string
  /** Whether this capability's files are present (not later removed) at the candidate commit under audit. */
  presentAtCandidate: boolean
}

export interface CapabilityAuditResult {
  allPresent: boolean
  /** The capability introduced most recently among the four — its commit is the earliest candidate that could contain all four. */
  latestIntroduced: CapabilityEvidence
  /** null unless one or more capabilities are missing at the candidate commit. */
  blockingFinding: string | null
}

/**
 * Audits a candidate upstream commit against the evidence recorded for each
 * required capability. `capabilities` must be non-empty; the capability with
 * the latest `introducedAt` determines the earliest possible commit that
 * could satisfy all of them, since a capability cannot be present before its
 * own introducing commit.
 */
export function auditCapabilities(capabilities: CapabilityEvidence[]): CapabilityAuditResult {
  if (capabilities.length === 0) {
    throw new Error('auditCapabilities requires at least one capability to audit')
  }

  const latestIntroduced = capabilities.reduce((latest, current) =>
    new Date(current.introducedAt).getTime() > new Date(latest.introducedAt).getTime() ? current : latest,
  )

  const missing = capabilities.filter((c) => !c.presentAtCandidate)
  const allPresent = missing.length === 0

  return {
    allPresent,
    latestIntroduced,
    blockingFinding: allPresent
      ? null
      : `No single commit provides all required capabilities — missing at the candidate commit: ${missing
          .map((c) => c.name)
          .join(', ')}.`,
  }
}
