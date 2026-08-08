/**
 * ---
 * file: src/__tests__/us29-ac29.2.2.1.1-withdraw-discredited-benchmark-runs.test.ts
 * project: earthandhoney
 * purpose: Verify AC-29.2.2.1.1 — the five discredited benchmark result
 *          files (two path-1 runs that measured Express's "Route not found"
 *          body instead of a photograph, two path-1 "backstage-proxy" runs
 *          and one coverage doc that no committed code can reproduce) no
 *          longer exist under scripts/benchmark/results/, that
 *          REPRODUCIBILITY.md survives and states the withdrawal rather
 *          than going silent, and that AC-29.1.1's unrelated render-proof
 *          transcript is untouched. File removal plus one documentation
 *          line — this suite runs no browser, builds no report and
 *          measures nothing.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.2.2.1.1
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const resultsDir = path.join(root, 'scripts/benchmark/results')
const exists = (rel: string) => fs.existsSync(path.join(resultsDir, rel))

const WITHDRAWN_FILES = [
  'run-2026-08-08T14-51-01-229Z.json',
  'run-2026-08-08T14-52-16-271Z.json',
  'run-2026-08-08T15-29-04-854Z-backstage-proxy.json',
  'run-2026-08-08T15-30-06-730Z-backstage-proxy.json',
  'CANDIDATE_COVERAGE.md',
]

describe('AC-29.2.2.1.1: the five discredited benchmark files are withdrawn, not silently dropped', () => {
  it.each(WITHDRAWN_FILES)('%s no longer exists under scripts/benchmark/results/', (file) => {
    expect(exists(file)).toBe(false)
  })

  it('REPRODUCIBILITY.md still exists', () => {
    expect(exists('REPRODUCIBILITY.md')).toBe(true)
  })

  it('REPRODUCIBILITY.md states the withdrawal and why', () => {
    const doc = fs.readFileSync(path.join(resultsDir, 'REPRODUCIBILITY.md'), 'utf8')

    expect(doc).toMatch(/withdraw/i)
    expect(doc).toContain('run-2026-08-08T14-51-01-229Z.json')
    expect(doc).toContain('run-2026-08-08T14-52-16-271Z.json')
    expect(doc).toMatch(/transferBytes: 83/)
    expect(doc).toMatch(/Route not found/)
  })

  it("AC-29.1.1's render-proof transcript survives intact", () => {
    const proofDir = path.join(resultsDir, 'ac29.1.1-render-proof')

    expect(fs.existsSync(proofDir)).toBe(true)
    expect(exists('ac29.1.1-render-proof/benchmark-portfolio-gallery.html')).toBe(true)
    expect(exists('ac29.1.1-render-proof/benchmark-story-gallery.html')).toBe(true)
    expect(exists('ac29.1.1-render-proof/render-proof-summary.json')).toBe(true)
  })

  it('the results directory .gitkeep is untouched', () => {
    expect(exists('.gitkeep')).toBe(true)
  })
})
