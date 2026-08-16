/**
 * ---
 * file: src/__tests__/us39-ac39.1-project-phases-lock-in.test.ts
 * project: earthandhoney
 * purpose: Verify AC-39.1 — exactly PRD 23.1's seven phases exist and no
 *          eighth: Lead, Booking, Preparation, Shoot, Post-production,
 *          Delivery, Closed. Asserts `src/lib/projectPhases.ts`'s real
 *          export by name against an independently-typed copy of PRD 23.1
 *          (never imported from the module under test, so the module can't
 *          silently redefine what "correct" means), then proves — the same
 *          pattern US-31 AC-31.2 used for its no-page-builder guard — that
 *          the lock-in guard actually detects an added, renamed, removed
 *          or reordered phase, rather than being vacuously green.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.1
 * ---
 */
import { PROJECT_PHASES, PROJECT_PHASE_KEYS, PROJECT_PHASE_NAMES } from '@/lib/projectPhases'

// PRD 23.1, copied independently here from scrum-master/PRD.md — never
// imported from src/lib/projectPhases.ts — so a change to the module under
// test cannot silently redefine what "correct" means.
const PRD_23_1_PHASE_NAMES = ['Lead', 'Booking', 'Preparation', 'Shoot', 'Post-production', 'Delivery', 'Closed']

/**
 * The AC-39.1 guard itself: the locked phase set is exactly PRD 23.1's
 * seven names, in PRD order — no eighth, no rename, no reorder.
 */
function isLockedPhaseSet(names: readonly string[]): boolean {
  if (names.length !== PRD_23_1_PHASE_NAMES.length) return false
  return names.every((name, index) => name === PRD_23_1_PHASE_NAMES[index])
}

describe('US-39 AC-39.1: exactly PRD 23.1’s seven phases exist and no eighth', () => {
  it('has exactly seven phases', () => {
    expect(PROJECT_PHASES).toHaveLength(7)
  })

  it('names each phase individually, in PRD 23.1 order', () => {
    expect(PROJECT_PHASE_NAMES).toEqual(PRD_23_1_PHASE_NAMES)
  })

  it('names each phase by name: Lead, Booking, Preparation, Shoot, Post-production, Delivery, Closed', () => {
    expect(PROJECT_PHASE_NAMES).toEqual([
      'Lead',
      'Booking',
      'Preparation',
      'Shoot',
      'Post-production',
      'Delivery',
      'Closed',
    ])
  })

  it('has a unique, stable key per phase with no duplicates', () => {
    expect(PROJECT_PHASE_KEYS).toEqual(['lead', 'booking', 'preparation', 'shoot', 'post_production', 'delivery', 'closed'])
    expect(new Set(PROJECT_PHASE_KEYS).size).toBe(PROJECT_PHASE_KEYS.length)
  })

  it('sequences the phases 1 through 7 with no gap or duplicate', () => {
    const orders = PROJECT_PHASES.map((phase) => phase.sequenceOrder)
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('the real module output passes the lock-in guard', () => {
    expect(isLockedPhaseSet(PROJECT_PHASE_NAMES)).toBe(true)
  })
})

describe('US-39 AC-39.1: the guard actually detects a changed phase set (self-test)', () => {
  it('fails when an eighth phase is appended', () => {
    expect(isLockedPhaseSet([...PRD_23_1_PHASE_NAMES, 'Archived'])).toBe(false)
  })

  it('fails when a phase is renamed', () => {
    const mutated = [...PRD_23_1_PHASE_NAMES]
    mutated[4] = 'Post Production'
    expect(isLockedPhaseSet(mutated)).toBe(false)
  })

  it('fails when a phase is removed', () => {
    expect(isLockedPhaseSet(PRD_23_1_PHASE_NAMES.slice(0, 6))).toBe(false)
  })

  it('fails when phases are reordered', () => {
    const mutated = [...PRD_23_1_PHASE_NAMES]
    ;[mutated[0], mutated[1]] = [mutated[1], mutated[0]]
    expect(isLockedPhaseSet(mutated)).toBe(false)
  })

  it('passes only for the exact locked set', () => {
    expect(isLockedPhaseSet(PRD_23_1_PHASE_NAMES)).toBe(true)
  })
})
