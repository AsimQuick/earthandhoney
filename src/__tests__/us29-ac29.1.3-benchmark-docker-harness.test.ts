/**
 * ---
 * file: src/__tests__/us29-ac29.1.3-benchmark-docker-harness.test.ts
 * project: earthandhoney
 * purpose: Verify AC-29.1.3 — the benchmark harness runs in Docker from one
 *          committed command and is wired to reproduce. Proves the static
 *          wiring only (compose service shape, bind mount, Docker-network
 *          hostname, run.ts's use of the actual AC-29.1.2 runHarness/types
 *          API, and the committed reproducibility evidence) — the live
 *          Docker build-and-run proof itself is not repeatable inside a
 *          plain `jest` run (no Chrome, no Docker-in-Docker here), and is
 *          instead the two committed `scripts/benchmark/results/run-*.json`
 *          reports plus `scripts/benchmark/results/REPRODUCIBILITY.md`.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.1.3
 * ---
 */
import fs from 'fs'
import path from 'path'
import YAML from 'yaml'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const RUN_SCRIPT_FILE = 'scripts/benchmark/run.ts'
const HARNESS_DOCKERFILE = 'scripts/benchmark/Dockerfile'
const RESULTS_DIR = 'scripts/benchmark/results'

describe('AC-29.1.3: the harness runs in Docker, against Docker hostnames, writing machine-readable output', () => {
  const compose = YAML.parse(read('docker-compose.yml'))
  const harnessService = compose.services['lighthouse-benchmark']
  const targetService = compose.services['web-benchmark']

  it('is a real compose service built from its own Dockerfile, not the app image', () => {
    expect(harnessService).toBeDefined()
    expect(harnessService.build.dockerfile).toBe(HARNESS_DOCKERFILE)
    expect(fs.existsSync(path.join(root, HARNESS_DOCKERFILE))).toBe(true)
  })

  it('is behind its own profile so a bare `docker compose up` never starts Chrome', () => {
    // Mirrors the "backstage" profile convention: the CI smoke job's bare
    // `docker compose up` must keep starting only web + db.
    expect(harnessService.profiles).toEqual(['benchmark'])
    expect(targetService.profiles).toEqual(['benchmark'])
  })

  it('targets a Docker network hostname, never localhost (CLAUDE.md Docker Rules)', () => {
    const baseUrl: string = harnessService.environment.BENCHMARK_BASE_URL
    expect(baseUrl).toBe('http://web-benchmark:3000')
    expect(baseUrl).not.toMatch(/localhost|127\.0\.0\.1/)
    expect(Object.keys(compose.services)).toContain('web-benchmark')
  })

  it('measures a production build, not the `npm run dev` server the "web" service runs', () => {
    // Lighthouse against `next dev` measures unminified bundles, the dev
    // overlay and on-demand compilation — not a number that reproduces or
    // that any client would ever experience.
    expect(targetService.command.join(' ')).toMatch(/npm run build/)
    expect(targetService.command.join(' ')).toMatch(/npm run start/)
    expect(compose.services.web.command).toBeUndefined()
  })

  it('waits for the production build to finish serving before measuring anything', () => {
    expect(targetService.healthcheck).toBeDefined()
    expect(harnessService.depends_on['web-benchmark'].condition).toBe('service_healthy')
  })

  it('bind-mounts a results directory so machine-readable output survives the container', () => {
    expect(harnessService.volumes).toContain('./scripts/benchmark/results:/app/scripts/benchmark/results')
    expect(fs.existsSync(path.join(root, RESULTS_DIR))).toBe(true)
  })

  it('keeps the Chrome/Lighthouse dependency tree out of the app package.json', () => {
    const appPkg = JSON.parse(read('package.json'))
    const harnessPkg = JSON.parse(read('scripts/benchmark/package.json'))
    const appDeps = { ...appPkg.dependencies, ...appPkg.devDependencies }

    expect(appDeps).not.toHaveProperty('lighthouse')
    expect(appDeps).not.toHaveProperty('chrome-launcher')
    expect(harnessPkg.devDependencies).toHaveProperty('lighthouse')
    expect(harnessPkg.devDependencies).toHaveProperty('chrome-launcher')
    // Reproducible installs inside the image: `npm ci` needs a lockfile.
    expect(fs.existsSync(path.join(root, 'scripts/benchmark/package-lock.json'))).toBe(true)
    expect(read(HARNESS_DOCKERFILE)).toMatch(/npm ci/)
  })

  it('runs both representative pages, resolved from the shared path constants', () => {
    const runScript = read(RUN_SCRIPT_FILE)

    expect(runScript).toContain('BENCHMARK_PORTFOLIO_GALLERY_PATH')
    expect(runScript).toContain('BENCHMARK_STORY_GALLERY_PATH')
    // Not a second hardcoded copy of the paths that could drift.
    expect(runScript).not.toContain("'/dev/benchmark-portfolio-gallery'")
    expect(runScript).not.toContain("'/dev/benchmark-story-gallery'")
  })

  it('drives Lighthouse in mobile form factor with its default mid-tier-mobile throttle', () => {
    const runScript = read(RUN_SCRIPT_FILE)

    expect(runScript).toMatch(/formFactor:\s*'mobile'/)
    expect(runScript).toMatch(/screenEmulation:\s*\{\s*mobile:\s*true/)
    // Overriding `throttling` would silently replace the simulated
    // mid-tier-mobile profile the ADR's LCP target assumes.
    expect(runScript).not.toMatch(/throttling:\s*\{/)
  })

  it('writes one timestamped JSON report per invocation rather than overwriting the last one', () => {
    const runScript = read(RUN_SCRIPT_FILE)

    expect(runScript).toMatch(/JSON\.stringify/)
    // AC-29.2.2.3: the candidate label is appended to the file name too, not
    // just written inside the report — see loadRunReports.ts.
    expect(runScript).toMatch(/run-\$\{timestamp\}-\$\{DECLARED_DELIVERY_PATH\}\.json/)
    expect(runScript).toMatch(/generatedAt/)
  })

  it('drives src/lib/benchmark/runHarness.ts through the API AC-29.1.2 actually committed, not an earlier draft shape', () => {
    // run.ts was drafted before AC-29.1.2's own review pass changed
    // runHarness's contract from a multi-page `{pages, runPass}` orchestrator
    // to a single-page `{runsPerPage, collectRun}` one. Pinning these
    // symbols in the source text catches a future drift back to the old,
    // now-nonexistent shape before it reaches Docker.
    const runScript = read(RUN_SCRIPT_FILE)

    expect(runScript).toContain("from '../../src/lib/benchmark/runHarness'")
    expect(runScript).toMatch(/runHarness\(\{\s*\n?\s*runsPerPage/)
    expect(runScript).toContain('collectRun')
    expect(runScript).not.toContain('runPass:')
    expect(runScript).not.toContain('warmupRunsPerPage')
  })
})

describe('AC-29.1.3: the reproducibility evidence — withdrawn by AC-29.2.2.1.1, re-run by AC-29.2.2.3', () => {
  // The two run reports this block originally verified
  // (run-2026-08-08T14-51-01-229Z.json, run-2026-08-08T14-52-16-271Z.json)
  // recorded transferBytes: 83 for every gallery image — the length of
  // Express's `{"message":"Route not found"}` body, not a photograph — so
  // AC-29.2.2.1.1 withdrew them rather than leaving discredited evidence on
  // disk. AC-29.2.2.3 supplies the re-run against the origin fix, this time
  // with every file carrying its candidate label in its own name
  // (run-<timestamp>-<deliveryPath>.json), so the withdrawn, unlabelled pair
  // can never be confused with what is committed now.
  const resultsDir = path.join(root, RESULTS_DIR)
  const runFiles = fs
    .readdirSync(resultsDir)
    .filter((name) => /^run-.*\.json$/.test(name))
    .sort()

  it('every committed run report carries a candidate-path suffix in its file name', () => {
    expect(runFiles.length).toBeGreaterThan(0)
    for (const name of runFiles) {
      expect(name).toMatch(/^run-.*-(backstage-proxy|presigned-r2)\.json$/)
    }
  })

  it('never retains the two withdrawn, unlabelled AC-29.1.3 reports', () => {
    expect(runFiles).not.toContain('run-2026-08-08T14-51-01-229Z.json')
    expect(runFiles).not.toContain('run-2026-08-08T14-52-16-271Z.json')
  })

  it('never retains the false-green pre-AC-29.1.1 run-2026-08-08T13-2*.json reports', () => {
    // Those three reports recorded imageRequestCount 1 (the site logo alone,
    // no gallery imagery) on both pages before the gallery was seeded — see
    // scripts/ac29.1.1-benchmark-render-proof.sh's header. Superseded, not
    // evidence.
    expect(runFiles.some((name) => name.startsWith('run-2026-08-08T13-2'))).toBe(false)
  })

  it('records a reproducibility note stating the per-page, per-metric spread the withdrawn runs measured, and why they were withdrawn', () => {
    const notePath = path.join(resultsDir, 'REPRODUCIBILITY.md')
    expect(fs.existsSync(notePath)).toBe(true)

    const note = fs.readFileSync(notePath, 'utf8')
    expect(note).toContain('docker compose --profile benchmark run --rm lighthouse-benchmark')
    expect(note).toMatch(/portfolio-gallery/)
    expect(note).toMatch(/story-gallery/)
    expect(note).toMatch(/lcpMs/i)
    expect(note).toMatch(/[Ss]pread/)
    expect(note).toMatch(/withdraw/i)
  })
})

describe('AC-29.1.3: the single command is documented as a named runbook section', () => {
  it('BACKSTAGE_STARTUP.md names a "Benchmark harness" section with the exact command', () => {
    const runbook = read('BACKSTAGE_STARTUP.md')

    expect(runbook).toMatch(/##\s+Benchmark harness/)
    expect(runbook).toContain('docker compose --profile benchmark run --rm lighthouse-benchmark')
  })
})
