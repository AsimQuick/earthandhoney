/**
 * ---
 * file: src/lib/statusVocabulary.ts
 * project: earthandhoney
 * purpose: AC-40.1 — the single source of truth for PRD 23.3's five status
 *          states: green complete, amber waiting/pending, blue in progress,
 *          red blocked/overdue/action required, grey upcoming. Like
 *          US-39 AC-39.1's seven-phase list, this is a closed, small
 *          product decision rather than configurable data, so it is locked
 *          here as source. This module names the set only — colour token
 *          values (AC-40.3), icon/text rendering (AC-40.2), contrast
 *          verification (AC-40.4) and the shared export path (AC-40.5) are
 *          separate acceptance criteria and are deliberately not addressed
 *          here.
 * created-by: dev-team
 * related-story: US-40
 * related-ac: 40.1
 * ---
 */

export interface StatusStateDefinition {
  key: string
  colorName: string
  label: string
}

export const STATUS_STATES: readonly StatusStateDefinition[] = [
  { key: 'complete', colorName: 'green', label: 'complete' },
  { key: 'waiting_pending', colorName: 'amber', label: 'waiting/pending' },
  { key: 'in_progress', colorName: 'blue', label: 'in progress' },
  { key: 'blocked', colorName: 'red', label: 'blocked/overdue/action required' },
  { key: 'upcoming', colorName: 'grey', label: 'upcoming' },
] as const

export const STATUS_STATE_KEYS: readonly string[] = STATUS_STATES.map((state) => state.key)

export const STATUS_STATE_COLOR_NAMES: readonly string[] = STATUS_STATES.map((state) => state.colorName)

export const STATUS_STATE_LABELS: readonly string[] = STATUS_STATES.map((state) => state.label)

export function isValidStatusStateKey(key: string): boolean {
  return STATUS_STATE_KEYS.includes(key)
}
