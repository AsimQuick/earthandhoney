/**
 * ---
 * file: src/__tests__/us15-ac15.3-picpeak-upstream-pin.test.ts
 * project: earthandhoney
 * purpose: Verify AC-15.3 — PICPEAK_UPSTREAM.md records the upstream URL,
 *          the exact pinned commit hash, the source branch/tag, the date
 *          pinned, and the future-update evaluation process, and states
 *          that production must never track a floating upstream branch.
 *          Also exercises the pin-validation decision logic in isolation.
 * created-by: dev-team
 * related-story: US-15
 * related-ac: 15.3
 * ---
 */
import fs from 'fs'
import path from 'path'
import { validatePin, type UpstreamPin } from '@/lib/upstreamPin'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const PINNED_COMMIT = 'eb263137b98935754155824de2a03848121304b6'

const VALID_PIN: UpstreamPin = {
  upstreamUrl: 'https://github.com/PicPeak/picpeak',
  pinnedCommit: PINNED_COMMIT,
  sourceRef: 'main',
  datePinned: '2026-07-31',
}

describe('AC-15.3: PicPeak upstream pin record', () => {
  describe('validatePin (floating-branch decision logic)', () => {
    it('accepts a pin anchored to a full 40-character commit hash', () => {
      expect(validatePin(VALID_PIN)).toEqual({ valid: true, reason: null })
    })

    it('rejects a pin that uses a branch name instead of a commit hash', () => {
      const result = validatePin({ ...VALID_PIN, pinnedCommit: 'main' })
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/floating ref/i)
    })

    it('rejects a pin that uses a short/abbreviated SHA', () => {
      const result = validatePin({ ...VALID_PIN, pinnedCommit: PINNED_COMMIT.slice(0, 7) })
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/40-character/i)
    })

    it('rejects a pin with an empty upstream URL', () => {
      const result = validatePin({ ...VALID_PIN, upstreamUrl: '' })
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/upstreamUrl/)
    })

    it('rejects a pin with an empty source ref', () => {
      const result = validatePin({ ...VALID_PIN, sourceRef: '' })
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/sourceRef/)
    })

    it('rejects a pin with a non-ISO-8601 date pinned', () => {
      const result = validatePin({ ...VALID_PIN, datePinned: '07/31/2026' })
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/datePinned/)
    })
  })

  describe('PICPEAK_UPSTREAM.md — recorded pin', () => {
    it('exists at the repo root', () => {
      expect(fs.existsSync(path.join(root, 'PICPEAK_UPSTREAM.md'))).toBe(true)
    })

    const doc = read('PICPEAK_UPSTREAM.md')

    it('records the upstream URL', () => {
      expect(doc).toContain('https://github.com/PicPeak/picpeak')
    })

    it('records the exact pinned commit hash', () => {
      expect(doc).toContain(PINNED_COMMIT)
    })

    it('records the branch or tag the commit came from', () => {
      expect(doc).toMatch(/source branch\/tag/i)
      expect(doc).toMatch(/`main`/)
    })

    it('records the date pinned', () => {
      expect(doc).toMatch(/date pinned/i)
      expect(doc).toContain('2026-07-31')
    })

    it('describes the process for evaluating a future upstream update', () => {
      expect(doc).toMatch(/process for evaluating a future upstream update/i)
      expect(doc).toMatch(/trigger/i)
      expect(doc).toMatch(/FORK_CHANGELOG\.md/)
      expect(doc).toMatch(/UPSTREAM_SYNC\.md/)
    })

    it('states that production must never track a floating upstream branch', () => {
      expect(doc).toMatch(/production.*must never track a floating upstream branch/i)
    })

    it('references the pin-validation logic that enforces a full commit hash', () => {
      expect(doc).toContain('src/lib/upstreamPin.ts')
      expect(doc).toContain('validatePin')
    })
  })
})
