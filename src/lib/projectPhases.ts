/**
 * ---
 * file: src/lib/projectPhases.ts
 * project: earthandhoney
 * purpose: AC-39.1 — the single source of truth for PRD 23.1's seven
 *          Project phases (Lead, Booking, Preparation, Shoot,
 *          Post-production, Delivery, Closed). Unlike US-38 AC-38.3's
 *          eighteen milestones, the phase list is a closed, small product
 *          decision rather than data a photographer configures — PRD 23.1
 *          names exactly seven and no eighth — so it is locked here as
 *          source, in the same spirit as US-31 AC-31.2's no-page-builder
 *          guard, rather than stored as seedable rows. `current_phase` on
 *          `projects` (migration 122) stores each phase's `key`; `'lead'`
 *          is that column's default, matching this list's first entry.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.1
 * ---
 */

export interface ProjectPhaseDefinition {
  key: string
  name: string
  sequenceOrder: number
}

export const PROJECT_PHASES: readonly ProjectPhaseDefinition[] = [
  { key: 'lead', name: 'Lead', sequenceOrder: 1 },
  { key: 'booking', name: 'Booking', sequenceOrder: 2 },
  { key: 'preparation', name: 'Preparation', sequenceOrder: 3 },
  { key: 'shoot', name: 'Shoot', sequenceOrder: 4 },
  { key: 'post_production', name: 'Post-production', sequenceOrder: 5 },
  { key: 'delivery', name: 'Delivery', sequenceOrder: 6 },
  { key: 'closed', name: 'Closed', sequenceOrder: 7 },
] as const

export const PROJECT_PHASE_KEYS: readonly string[] = PROJECT_PHASES.map((phase) => phase.key)

export const PROJECT_PHASE_NAMES: readonly string[] = PROJECT_PHASES.map((phase) => phase.name)

export function isValidProjectPhaseKey(key: string): boolean {
  return PROJECT_PHASE_KEYS.includes(key)
}
