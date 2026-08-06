/**
 * ---
 * file: src/__tests__/us21-ac21.4-sprint-json-reconciliation.test.ts
 * project: earthandhoney
 * purpose: Verify AC-21.4 — scrum-master/sprint2.json on `main` is the
 *          closed version from commit 9624a07 (phase: complete, US-7/US-8/
 *          US-9 done with AC-9.3 retired in place carrying its
 *          [RETIRED — DO NOT IMPLEMENT] prefix, and US-10..US-13 retired
 *          with their recorded reasons), so the orchestrator can no longer
 *          be handed the retired WhatsApp / Testimonials / Packages / FAQ
 *          work described in Reminder 15. Also verifies the stale
 *          story-level `dev_status: not-started` on all seven sprint-3
 *          stories in sprint3.json is reconciled to `done`, since every
 *          one of their acceptance criteria already reads
 *          `dev_status: done` (retrospective action item 6).
 * created-by: dev-team
 * related-story: US-21
 * related-ac: 21.4
 * ---
 */

import fs from 'fs'
import path from 'path'

const root = process.cwd()

interface AcceptanceCriterion {
  id: string
  retired?: boolean
  retired_reason?: string
  text?: string
  dev_status?: string
}

interface Story {
  id: string
  status?: string
  dev_status?: string
  retired_reason?: string
  acceptance_criteria: AcceptanceCriterion[]
}

interface Sprint {
  phase: string
  stories: Story[]
}

const sprint2: Sprint = JSON.parse(
  fs.readFileSync(path.join(root, 'scrum-master', 'sprint2.json'), 'utf8')
)
const sprint3: Sprint = JSON.parse(
  fs.readFileSync(path.join(root, 'scrum-master', 'sprint3.json'), 'utf8')
)

function findStory(sprint: Sprint, id: string) {
  return sprint.stories.find((s) => s.id === id)
}

function findAc(story: Story, id: string) {
  return story.acceptance_criteria.find((a) => a.id === id)
}

describe('AC-21.4: sprint2.json is the closed post-pivot version from 9624a07', () => {
  it('has phase: complete', () => {
    expect(sprint2.phase).toBe('complete')
  })

  it('US-7 and US-8 are done', () => {
    expect(findStory(sprint2, 'US-7').status).toBe('done')
    expect(findStory(sprint2, 'US-8').status).toBe('done')
  })

  it('US-9 is done (not in-progress)', () => {
    expect(findStory(sprint2, 'US-9').status).toBe('done')
  })

  it('AC-9.3 is retired in place with its [RETIRED — DO NOT IMPLEMENT] prefix intact', () => {
    const us9 = findStory(sprint2, 'US-9')
    const ac93 = findAc(us9, '9.3')
    expect(ac93.retired).toBe(true)
    expect(ac93.text).toMatch(/^\[RETIRED — DO NOT IMPLEMENT/)
    expect(typeof ac93.retired_reason).toBe('string')
    expect(ac93.retired_reason.length).toBeGreaterThan(0)
  })

  it.each(['US-10', 'US-11', 'US-12', 'US-13'])(
    '%s is retired (not draft) with a recorded reason',
    (id) => {
      const story = findStory(sprint2, id)
      expect(story.status).toBe('retired')
      expect(typeof story.retired_reason).toBe('string')
      expect(story.retired_reason.length).toBeGreaterThan(0)
    }
  )

  it('every acceptance criterion under US-10..US-13 is marked retired', () => {
    for (const id of ['US-10', 'US-11', 'US-12', 'US-13']) {
      const story = findStory(sprint2, id)
      for (const ac of story.acceptance_criteria) {
        expect(ac.retired).toBe(true)
      }
    }
  })
})

describe('AC-21.4: sprint3.json story-level dev_status is reconciled to done', () => {
  const storyIds = ['US-14', 'US-15', 'US-16', 'US-17', 'US-18', 'US-19', 'US-20']

  it.each(storyIds)(
    '%s carries story-level dev_status: done, matching its all-done acceptance criteria',
    (id) => {
      const story = findStory(sprint3, id)
      expect(story.dev_status).toBe('done')
      for (const ac of story.acceptance_criteria) {
        expect(ac.dev_status).toBe('done')
      }
    }
  )
})
