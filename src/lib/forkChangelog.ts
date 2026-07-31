/**
 * ---
 * file: src/lib/forkChangelog.ts
 * project: earthandhoney
 * purpose: Pure decision logic for AC-15.5 — validates a FORK_CHANGELOG.md
 *          entry. The changelog is initialised with the pinned baseline and
 *          is the single place every deliberate deviation from upstream gets
 *          recorded; a "deviation" entry that doesn't name which files it
 *          touched would defeat that purpose, so this is enforced as
 *          unit-tested logic rather than left as an unchecked convention.
 * created-by: dev-team
 * related-story: US-15
 * related-ac: 15.5
 * ---
 */

export type ChangelogEntryType = 'baseline' | 'deviation'

export interface ChangelogEntry {
  /** ISO 8601 date (YYYY-MM-DD) the entry was recorded. */
  date: string
  type: ChangelogEntryType
  /** One-line description of the baseline or the deviation. */
  summary: string
  /** Files touched by this deviation. Required for type "deviation". */
  filesTouched: string[]
}

export interface ChangelogEntryValidation {
  valid: boolean
  /** null unless the entry is invalid — explains what is wrong. */
  reason: string | null
}

/**
 * A "baseline" entry only needs a date and summary. A "deviation" entry must
 * also name at least one file it touched — an untraceable deviation is
 * indistinguishable from silent drift from upstream, which is exactly what
 * this changelog exists to prevent.
 */
export function validateChangelogEntry(entry: ChangelogEntry): ChangelogEntryValidation {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    return { valid: false, reason: `date must be an ISO 8601 date ("${entry.date}")` }
  }
  if (!entry.summary.trim()) {
    return { valid: false, reason: 'summary must not be empty' }
  }
  if (entry.type === 'deviation' && entry.filesTouched.length === 0) {
    return {
      valid: false,
      reason: 'a "deviation" entry must name at least one file it touched',
    }
  }
  return { valid: true, reason: null }
}
