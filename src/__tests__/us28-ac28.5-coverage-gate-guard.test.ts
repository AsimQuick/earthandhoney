/**
 * ---
 * file: src/__tests__/us28-ac28.5-coverage-gate-guard.test.ts
 * project: earthandhoney
 * purpose: Guard AC-28.5 — the CI coverage gate must never be lowered to
 *          absorb US-28's test removals (AC-28.2). Pins the
 *          --coverageThreshold CI passes to npm test at its recorded floor
 *          (branches/functions/lines >= 80, the sprint-3 Definition of Done
 *          item 11 rule) and closes the three stealth routes to the same
 *          outcome: neutering the step (continue-on-error / `|| true`),
 *          overriding the flag with a weaker threshold in jest.config.ts, and
 *          shrinking the measured denominator by excluding live src/ code from
 *          coverage. Measured before/after global coverage for the
 *          AC-28.1-28.4 removals is recorded on the story, not in this file.
 * created-by: dev-team
 * related-story: US-28
 * related-ac: 28.5
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const CI_WORKFLOW = path.join(root, '.github', 'workflows', 'ci.yml')
const JEST_CONFIG = path.join(root, 'jest.config.ts')

/**
 * The gate as it stood before US-28 removed a single test. AC-28.5 allows this
 * to be raised, never lowered — closing a coverage shortfall means covering
 * live code, not editing this number.
 */
const FLOOR = 80
const GATED_METRICS = ['branches', 'functions', 'lines'] as const

const ciYml = fs.readFileSync(CI_WORKFLOW, 'utf8')
const jestConfigSrc = fs.readFileSync(JEST_CONFIG, 'utf8')

function extractCoverageThreshold(): string {
  const match = ciYml.match(/--coverageThreshold=(['"])(.*?)\1/)
  if (!match) {
    throw new Error('.github/workflows/ci.yml: no --coverageThreshold flag found on the test step')
  }
  return match[2]
}

/** The `- name: ...` block of the CI step that runs the coverage-gated suite. */
function coverageStepBlock(): string {
  const step = ciYml.split(/\n\s{4,}- (?=name:|uses:)/).find((s) => s.includes('--coverageThreshold'))
  if (!step) {
    throw new Error('.github/workflows/ci.yml: no CI step runs the suite with --coverageThreshold')
  }
  return step
}

describe('AC-28.5: the CI coverage gate is not lowered to absorb the US-28 removals', () => {
  it('CI still runs the suite with --coverage and an explicit --coverageThreshold', () => {
    expect(ciYml).toMatch(/npm test -- --coverage --coverageThreshold=/)
  })

  it('the threshold JSON parses and declares a global block naming every gated metric', () => {
    const parsed = JSON.parse(extractCoverageThreshold())
    expect(parsed.global).toBeDefined()
    // Dropping a metric key is the same stealth lowering as setting it to 0:
    // an unnamed metric is simply not gated.
    expect(Object.keys(parsed.global).sort()).toEqual([...GATED_METRICS].sort())
  })

  describe.each(GATED_METRICS)('global.%s', (metric) => {
    it(`is still at least the sprint-3 DoD floor of ${FLOOR}, never edited downward`, () => {
      const parsed = JSON.parse(extractCoverageThreshold())
      expect(parsed.global[metric]).toBeGreaterThanOrEqual(FLOOR)
    })
  })

  it('the coverage step still fails the build — not continue-on-error, not `|| true`', () => {
    const step = coverageStepBlock()
    expect(step).not.toMatch(/continue-on-error:\s*true/)
    expect(step).not.toMatch(/\|\|\s*(true|exit 0|:)/)
    expect(step).not.toMatch(/--passWithNoTests/)
  })

  it('jest.config.ts declares no coverageThreshold that could undercut the CI flag', () => {
    const declared = jestConfigSrc.match(/coverageThreshold\s*:/)
    if (!declared) {
      // The CI flag is the single gate — nothing in the config can weaken it.
      expect(declared).toBeNull()
      return
    }
    for (const metric of GATED_METRICS) {
      const value = jestConfigSrc.match(new RegExp(`${metric}\\s*:\\s*(\\d+)`))
      expect(value).not.toBeNull()
      expect(Number(value![1])).toBeGreaterThanOrEqual(FLOOR)
    }
  })

  it('no live source path under src/ is excluded from coverage measurement', () => {
    const block = jestConfigSrc.match(/coveragePathIgnorePatterns\s*:\s*\[([^\]]*)\]/)
    expect(block).not.toBeNull()
    const patterns = [...block![1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1])
    expect(patterns.length).toBeGreaterThan(0)
    for (const pattern of patterns) {
      // node_modules and the vendored upstream fork are legitimately outside
      // our coverage numbers; anything reaching into src/ would shrink the
      // denominator, which is lowering the gate by another name.
      expect(pattern).not.toMatch(/src/)
    }
  })

  it('the suite is still discovered from src/, so removed-test fallout cannot be hidden by narrowing roots', () => {
    const block = jestConfigSrc.match(/roots\s*:\s*\[([^\]]*)\]/)
    expect(block).not.toBeNull()
    const roots = [...block![1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1])
    expect(roots).toContain('<rootDir>/src')
  })
})
