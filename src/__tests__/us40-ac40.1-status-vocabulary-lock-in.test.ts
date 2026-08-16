/**
 * ---
 * file: src/__tests__/us40-ac40.1-status-vocabulary-lock-in.test.ts
 * project: earthandhoney
 * purpose: Verify AC-40.1 — exactly PRD 23.3's five status states exist,
 *          named individually: green complete, amber waiting/pending, blue
 *          in progress, red blocked/overdue/action required, grey
 *          upcoming. Asserts `src/lib/statusVocabulary.ts`'s real export by
 *          name against an independently-typed copy of PRD 23.3 (never
 *          imported from the module under test, so the module can't
 *          silently redefine what "correct" means), then proves — the same
 *          pattern US-39 AC-39.1 used for its seven-phase guard, itself
 *          following US-31 AC-31.2's no-page-builder guard — that the
 *          lock-in guard actually detects a sixth state being added, or an
 *          existing one being renamed, removed or reordered.
 * created-by: dev-team
 * related-story: US-40
 * related-ac: 40.1
 * ---
 */
import {
  STATUS_STATES,
  STATUS_STATE_KEYS,
  STATUS_STATE_COLOR_NAMES,
  STATUS_STATE_LABELS,
} from '@/lib/statusVocabulary'

// PRD 23.3, copied independently here from scrum-master/PRD.md — never
// imported from src/lib/statusVocabulary.ts — so a change to the module
// under test cannot silently redefine what "correct" means.
const PRD_23_3_STATES = [
  { colorName: 'green', label: 'complete' },
  { colorName: 'amber', label: 'waiting/pending' },
  { colorName: 'blue', label: 'in progress' },
  { colorName: 'red', label: 'blocked/overdue/action required' },
  { colorName: 'grey', label: 'upcoming' },
]

/**
 * The AC-40.1 guard itself: the locked status set is exactly PRD 23.3's
 * five colour/label pairs, in PRD order — no sixth, no rename, no reorder.
 */
function isLockedStatusSet(states: readonly { colorName: string; label: string }[]): boolean {
  if (states.length !== PRD_23_3_STATES.length) return false
  return states.every(
    (state, index) => state.colorName === PRD_23_3_STATES[index].colorName && state.label === PRD_23_3_STATES[index].label
  )
}

describe('US-40 AC-40.1: exactly PRD 23.3’s five status states exist and no sixth', () => {
  it('has exactly five states', () => {
    expect(STATUS_STATES).toHaveLength(5)
  })

  it('names each state individually, in PRD 23.3 order', () => {
    expect(STATUS_STATES.map((state) => ({ colorName: state.colorName, label: state.label }))).toEqual(PRD_23_3_STATES)
  })

  it('names each state by colour and meaning: green complete, amber waiting/pending, blue in progress, red blocked/overdue/action required, grey upcoming', () => {
    expect(STATUS_STATE_COLOR_NAMES).toEqual(['green', 'amber', 'blue', 'red', 'grey'])
    expect(STATUS_STATE_LABELS).toEqual([
      'complete',
      'waiting/pending',
      'in progress',
      'blocked/overdue/action required',
      'upcoming',
    ])
  })

  it('has a unique, stable key per state with no duplicates', () => {
    expect(STATUS_STATE_KEYS).toEqual(['complete', 'waiting_pending', 'in_progress', 'blocked', 'upcoming'])
    expect(new Set(STATUS_STATE_KEYS).size).toBe(STATUS_STATE_KEYS.length)
  })

  it('the real module output passes the lock-in guard', () => {
    expect(isLockedStatusSet(STATUS_STATES)).toBe(true)
  })

  it('isValidStatusStateKey recognizes only the five locked keys', async () => {
    const { isValidStatusStateKey } = await import('@/lib/statusVocabulary')
    for (const key of STATUS_STATE_KEYS) {
      expect(isValidStatusStateKey(key)).toBe(true)
    }
    expect(isValidStatusStateKey('archived')).toBe(false)
  })
})

describe('US-40 AC-40.1: the guard actually detects a changed status set (self-test)', () => {
  it('fails when a sixth state is appended', () => {
    expect(isLockedStatusSet([...PRD_23_3_STATES, { colorName: 'purple', label: 'archived' }])).toBe(false)
  })

  it('fails when a state is renamed', () => {
    const mutated = PRD_23_3_STATES.map((state) => ({ ...state }))
    mutated[3] = { ...mutated[3], label: 'blocked' }
    expect(isLockedStatusSet(mutated)).toBe(false)
  })

  it('fails when a state is removed', () => {
    expect(isLockedStatusSet(PRD_23_3_STATES.slice(0, 4))).toBe(false)
  })

  it('fails when states are reordered', () => {
    const mutated = PRD_23_3_STATES.map((state) => ({ ...state }))
    ;[mutated[0], mutated[1]] = [mutated[1], mutated[0]]
    expect(isLockedStatusSet(mutated)).toBe(false)
  })

  it('passes only for the exact locked set', () => {
    expect(isLockedStatusSet(PRD_23_3_STATES)).toBe(true)
  })
})
