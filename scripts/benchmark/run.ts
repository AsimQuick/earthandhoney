/**
 * ---
 * file: scripts/benchmark/run.ts
 * project: earthandhoney
 * purpose: AC-29.1.3 — the Docker entry point for the benchmark harness (see
 *          scripts/benchmark/Dockerfile, the "lighthouse-benchmark"
 *          docker-compose.yml service). Provides src/lib/benchmark/runHarness.ts's
 *          injected `collectRun` with a real Lighthouse-over-Chrome
 *          implementation — the one place in the harness that actually
 *          depends on the `lighthouse`/`chrome-launcher` packages and a
 *          Chrome binary, kept out of src/lib/benchmark/ so that
 *          orchestration/extraction logic (AC-29.1.2) stays unit-testable
 *          without either. Runs both representative pages
 *          src/lib/benchmarkPages.ts names against BENCHMARK_BASE_URL — the
 *          "web-benchmark" service's Docker-network hostname, per CLAUDE.md's
 *          Docker Rules, never localhost — and writes one timestamped,
 *          machine-readable JSON report per invocation to
 *          scripts/benchmark/results/, a bind-mounted volume so the raw
 *          output survives the container (AC-29.3's "raw harness output
 *          retained in the repository" starts here).
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.1.3
 * ---
 */
import fs from 'fs'
import path from 'path'

import { BENCHMARK_PORTFOLIO_GALLERY_PATH, BENCHMARK_STORY_GALLERY_PATH } from '../../src/lib/benchmarkPages'
import { MIN_RUNS_PER_PAGE, runHarness } from '../../src/lib/benchmark/runHarness'
import type { HarnessResult, MinimalLighthouseResult } from '../../src/lib/benchmark/types'

// Docker-network hostname, per CLAUDE.md's Docker Rules — the
// "lighthouse-benchmark" service reaches "web-benchmark" this way, never
// localhost. See docker-compose.yml.
const BASE_URL = process.env.BENCHMARK_BASE_URL ?? 'http://web-benchmark:3000'
// Left at runHarness's own MIN_RUNS_PER_PAGE floor unless overridden — a
// single run is not a measurement (AC-29.1.2), and MIN_RUNS_PER_PAGE is the
// one place that floor is defined.
const RUNS_PER_PAGE = process.env.BENCHMARK_RUNS_PER_PAGE
  ? Number(process.env.BENCHMARK_RUNS_PER_PAGE)
  : MIN_RUNS_PER_PAGE
// Resolved from this file's own location, not process.cwd() — the
// lighthouse-benchmark Docker image runs this with WORKDIR set to
// scripts/benchmark itself (see scripts/benchmark/Dockerfile), and this must
// still land in the same directory docker-compose.yml bind-mounts regardless
// of the invoking cwd.
const RESULTS_DIR = path.join(__dirname, 'results')

const PAGES: Array<{ id: string; path: string }> = [
  { id: 'portfolio-gallery', path: BENCHMARK_PORTFOLIO_GALLERY_PATH },
  { id: 'story-gallery', path: BENCHMARK_STORY_GALLERY_PATH },
]

// Lighthouse's own default config already applies a mobile form factor and a
// mid-tier-mobile-representative "simulated" CPU/network throttle profile
// (4x CPU slowdown, ~150ms RTT / ~1.6Mbps down "Slow 4G") when no
// `--preset`/custom throttling is given — exactly the "realistic mid-tier
// mobile CPU/network throttle" the ADR asks for, so this deliberately does
// not override `settings.throttling`.
async function collectRun(url: string): Promise<MinimalLighthouseResult> {
  const { default: lighthouse } = await import('lighthouse')
  const chromeLauncher = await import('chrome-launcher')

  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
    chromePath: process.env.CHROME_PATH,
  })

  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      formFactor: 'mobile',
      screenEmulation: { mobile: true, disabled: false },
      // 'performance' alone omits the 'image-size-responsive' audit — it is
      // scored under Lighthouse's 'best-practices' category (see
      // node_modules/lighthouse/core/config/default-config.js), even though
      // extractMeasurements.ts's network-payload join reads it. Both
      // categories are requested so lhr.audits['image-size-responsive'] is
      // never undefined.
      onlyCategories: ['performance', 'best-practices'],
    })

    if (!result?.lhr) {
      throw new Error(`Lighthouse produced no result for ${url}`)
    }

    return result.lhr as unknown as MinimalLighthouseResult
  } finally {
    await chrome.kill()
  }
}

interface PageReport {
  id: string
  path: string
  url: string
  harness: HarnessResult
}

async function main() {
  const pages: PageReport[] = []

  for (const page of PAGES) {
    const url = `${BASE_URL}${page.path}`
    const harness = await runHarness({
      runsPerPage: RUNS_PER_PAGE,
      collectRun: () => collectRun(url),
    })
    pages.push({ id: page.id, path: page.path, url, harness })
  }

  fs.mkdirSync(RESULTS_DIR, { recursive: true })
  const outputPath = path.join(RESULTS_DIR, `run-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: BASE_URL, runsPerPage: RUNS_PER_PAGE, pages }, null, 2),
  )

  console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`)
  for (const page of pages) {
    const { aggregate } = page.harness
    console.log(
      `${page.id}: performance=${aggregate.mobilePerformanceScore.median} ` +
        `(${aggregate.mobilePerformanceScore.min}-${aggregate.mobilePerformanceScore.max}) ` +
        `CLS(image)=${aggregate.clsImageAttributable.median} ` +
        `LCP=${Math.round(aggregate.lcpMs.median)}ms ` +
        `(${Math.round(aggregate.lcpMs.min)}-${Math.round(aggregate.lcpMs.max)}) `,
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
