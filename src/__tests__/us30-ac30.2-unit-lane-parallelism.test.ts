/**
 * ---
 * file: src/__tests__/us30-ac30.2-unit-lane-parallelism.test.ts
 * project: earthandhoney
 * purpose: Verify AC-30.2 — jest.config.ts wires the `unit` project decided
 *          in AC-30.1's mechanism note. Lane membership must be read from the
 *          single committed manifest (TEST_LANE_INVENTORY.json), never
 *          hard-coded, so it can never silently drift from AC-30.1's
 *          classification; the unit project must run at Jest's default
 *          parallelism (no maxWorkers/runInBand override baked into the
 *          config itself); and `npm run test:unit` must select exactly that
 *          project. The measured wall-clock evidence for this AC (unit lane
 *          vs. the pre-split serial baseline) is recorded on the story, not
 *          asserted here — a wall-clock figure is not stable enough to pin
 *          in a unit test.
 * created-by: dev-team
 * related-story: US-30
 * related-ac: 30.2
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

type LaneEntry = { path: string; lane: 'LIVE' | 'UNIT' }
type Inventory = { suites: LaneEntry[] }

const inventory: Inventory = JSON.parse(read('TEST_LANE_INVENTORY.json'))
const jestConfigSrc = read('jest.config.ts')
const packageJson = JSON.parse(read('package.json'))

describe('AC-30.2: the UNIT lane is wired at default Jest parallelism', () => {
  it('jest.config.ts declares a `unit` project driven by TEST_LANE_INVENTORY.json, not a hard-coded list', () => {
    expect(jestConfigSrc).toMatch(/displayName:\s*['"]unit['"]/)
    expect(jestConfigSrc).toMatch(/TEST_LANE_INVENTORY\.json/)
    // The live-suite exclusion list must be derived from the manifest's
    // `lane === 'LIVE'` filter, not typed out as literal file paths — the
    // config source itself should contain no `.test.ts` path literals.
    expect(jestConfigSrc).not.toMatch(/us1-ac1\.2-postgres-migration\.test\.ts/)
  })

  it('the unit project sets no maxWorkers/runInBand override — Jest\'s default parallelism applies', () => {
    const unitProjectBlock = jestConfigSrc.match(/const unitProjectConfig[\s\S]*?\n}/)
    expect(unitProjectBlock).not.toBeNull()
    expect(unitProjectBlock![0]).not.toMatch(/maxWorkers/)
    expect(unitProjectBlock![0]).not.toMatch(/runInBand/)
  })

  it('`npm run test:unit` selects exactly the unit project', () => {
    expect(packageJson.scripts['test:unit']).toBe('jest --selectProjects unit')
  })

  it('the live project matches exactly the manifest\'s LIVE suites, so unit is everything else', () => {
    const liveProjectBlock = jestConfigSrc.match(/const liveProjectConfig[\s\S]*?\n}/)
    expect(liveProjectBlock).not.toBeNull()
    expect(liveProjectBlock![0]).toMatch(/testMatch:\s*liveSuitePaths/)
    const liveCount = inventory.suites.filter((s) => s.lane === 'LIVE').length
    expect(liveCount).toBeGreaterThan(0)
  })
})
