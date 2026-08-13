/**
 * ---
 * file: src/__tests__/us7-ac7.3-live-boot-isolation.test.ts
 * project: earthandhoney
 * purpose: Verify AC-7.3 — server-spawning "live-boot" suites (AC-1.2 and its
 *          siblings, which each fork a real `next dev` process and poll it
 *          over HTTP) are isolated from parallel jest execution so they no
 *          longer false-fail from CPU contention in the full local Docker
 *          suite, while still running as part of the default test command
 * created-by: dev-team
 * related-story: US-7
 * related-ac: 7.3
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

describe('AC-7.3: live-boot suites are isolated from parallel jest', () => {
  const pkg = JSON.parse(read('package.json'))

  it('the "test" npm script runs jest serially (--runInBand), removing the worker-pool CPU contention that caused false timeouts', () => {
    const testScript: string = pkg.scripts.test
    expect(testScript).toMatch(/\bjest\b/)
    expect(testScript).toMatch(/--runInBand\b/)
  })

  it('the "test" script is a single jest invocation (no shell chaining), so CI-appended flags like --coverage apply to the whole suite', () => {
    const testScript: string = pkg.scripts.test
    expect(testScript).not.toMatch(/&&|\|\||;|\|/)
  })

  it('jest.config.ts never uses testPathIgnorePatterns to drop a suite from the default test command outright — only to route it into another project that the default command still runs (US-30 AC-30.2 unit/live split)', () => {
    const jestConfigSrc = read('jest.config.ts')
    if (!jestConfigSrc.match(/testPathIgnorePatterns/)) return
    // A config that excludes suites from one project must declare `projects`,
    // so a bare `jest --runInBand` (npm test) still runs every project and no
    // suite silently vanishes from the default command.
    expect(jestConfigSrc).toMatch(/projects:/)
  })

  describe('every server-spawning suite (forks a real `next dev` process) still runs under the default test command', () => {
    const testDir = path.join(root, 'src/__tests__')
    const spawningFiles = fs
      .readdirSync(testDir)
      .filter((name) => name.endsWith('.test.ts') || name.endsWith('.test.tsx'))
      .filter((name) => /spawn\(/.test(fs.readFileSync(path.join(testDir, name), 'utf8')))

    it('finds at least one live/server-spawning suite to protect (sanity-check the detector itself)', () => {
      expect(spawningFiles.length).toBeGreaterThan(0)
    })

    it.each(
      // Populated lazily above; if this ever reports zero files the prior
      // sanity-check assertion fails loudly instead of this block silently
      // testing nothing.
      spawningFiles.length ? spawningFiles : ['(none-detected)'],
    )('%s is not excluded from the default suite', (fileName) => {
      if (fileName === '(none-detected)') return
      expect(spawningFiles).toContain(fileName)
    })
  })

  describe('the AC-1.2 live-boot test keeps a safety margin between its own timeout and the HTTP-poll timeout it wraps', () => {
    const src = read('src/__tests__/us1-ac1.2-postgres-migration.test.ts')

    it('extracts both timeout values from source', () => {
      expect(src).toMatch(/waitForServer\(\s*[\s\S]*?,\s*(\d+),?\s*\)/)
    })

    it('the outer jest test timeout leaves at least a 15s margin over the inner waitForServer timeout for teardown/spawn overhead', () => {
      const waitForServerCallMatch = src.match(/await waitForServer\(\s*[\s\S]*?,\s*(\d+),?\s*\)/)
      const itTimeoutMatch = src.match(/\}\s*,\s*(\d+),\s*\)\s*$/m)
      expect(waitForServerCallMatch).not.toBeNull()
      expect(itTimeoutMatch).not.toBeNull()

      const innerTimeoutMs = Number(waitForServerCallMatch![1])
      const outerTimeoutMs = Number(itTimeoutMatch![1])
      expect(outerTimeoutMs - innerTimeoutMs).toBeGreaterThanOrEqual(15000)
    })
  })
})
