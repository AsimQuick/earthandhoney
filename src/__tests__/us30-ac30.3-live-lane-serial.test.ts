/**
 * ---
 * file: src/__tests__/us30-ac30.3-live-lane-serial.test.ts
 * project: earthandhoney
 * purpose: Verify AC-30.3 — the `live` project decided in AC-30.1/30.2 is
 *          actually run with `--runInBand` semantics (single worker, one
 *          suite finishes before the next starts) rather than at Jest's
 *          default parallelism, and that the shared first-register fixture
 *          identity `src/test-support/liveApiAuth.ts` was written for
 *          (AC-6.3's cross-suite race) is still wired into every LIVE suite
 *          that needs it. Static/config assertions only — the flake-freedom
 *          claim itself (three consecutive identical-pass Docker runs of
 *          `npm run test:live`, including the AC-1.2 live-boot suite) is
 *          measured evidence recorded on the story, not something a unit
 *          test can pin.
 * created-by: dev-team
 * related-story: US-30
 * related-ac: 30.3
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

type LaneEntry = { path: string; lane: 'LIVE' | 'UNIT' }
type Inventory = { suites: LaneEntry[] }

const inventory: Inventory = JSON.parse(read('TEST_LANE_INVENTORY.json'))
const packageJson = JSON.parse(read('package.json'))

describe('AC-30.3: the LIVE lane runs serially and the shared fixture stays wired', () => {
  it('`npm run test:live` selects only the live project and forces --runInBand', () => {
    expect(packageJson.scripts['test:live']).toBe('jest --selectProjects live --runInBand')
  })

  it('the AC-1.2 live-boot suite (the sprint-1 flake) is in the LIVE lane `test:live` covers', () => {
    const liveSuitePaths = inventory.suites.filter((s) => s.lane === 'LIVE').map((s) => s.path)
    expect(liveSuitePaths).toContain('src/__tests__/us1-ac1.2-postgres-migration.test.ts')
  })

  it('every LIVE suite that calls getLiveApiAuthToken imports it from the shared fixture module, not a private copy', () => {
    const liveSuites = inventory.suites.filter((s) => s.lane === 'LIVE')
    for (const suite of liveSuites) {
      const src = read(suite.path)
      if (src.includes('getLiveApiAuthToken')) {
        expect(src).toMatch(/from ['"]@\/test-support\/liveApiAuth['"]/)
      }
    }
  })

  it('the shared fixture module still centralises one first-register identity for every caller (the AC-6.3 race fix)', () => {
    const fixtureSrc = read('src/test-support/liveApiAuth.ts')
    expect(fixtureSrc).toMatch(/first-register/)
    // Exactly one fixture email/password pair is declared — a second pair
    // would reopen the per-file-credentials race AC-6.3 closed.
    expect(fixtureSrc.match(/LIVE_FIXTURE_EMAIL\s*=/g)).toHaveLength(1)
    expect(fixtureSrc.match(/LIVE_FIXTURE_PASSWORD\s*=/g)).toHaveLength(1)
  })

  it('top-level `npm test` (`jest --runInBand`) still runs every project in-band, so the split cannot silently reopen the race in CI', () => {
    expect(packageJson.scripts.test).toBe('jest --runInBand')
  })
})
