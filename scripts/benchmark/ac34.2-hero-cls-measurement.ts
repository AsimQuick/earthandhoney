/**
 * ---
 * file: scripts/benchmark/ac34.2-hero-cls-measurement.ts
 * project: earthandhoney
 * purpose: AC-34.2's measured-CLS evidence — a standalone Lighthouse run
 *          against the real homepage ('/'), reusing the same
 *          mobile-form-factor/default-throttle Lighthouse invocation
 *          scripts/benchmark/run.ts already established for AC-29, and the
 *          same pure extraction/aggregation logic
 *          (src/lib/benchmark/runHarness.ts, extractMeasurements.ts,
 *          aggregateRuns.ts) — but deliberately a separate entry point, not
 *          an added PAGES row in run.ts: run.ts's own delivery-path
 *          validation (assertObservedDeliveryPath) is specific to the
 *          R2_STORAGE_AND_DELIVERY_ADR.md gallery-image benchmark and would
 *          reject the homepage's photobuddy-placeholder hero images as a
 *          "wiring mismatch" for a question this AC never asks. Runs inside
 *          the same "lighthouse-benchmark" Docker image (its Dockerfile
 *          already `COPY`s the whole scripts/benchmark/ directory, so this
 *          file needs no image change) against the same "web-benchmark"
 *          production build service already defined in docker-compose.yml.
 *          MIN_RUNS_PER_PAGE (3) matches AC-29.1.2's "a single run is not a
 *          measurement" floor; the median CLS across those runs is this
 *          AC's reported figure.
 * created-by: dev-team
 * related-story: US-34
 * related-ac: 34.2
 * ---
 */
import fs from 'fs'
import path from 'path'

import { MIN_RUNS_PER_PAGE, runHarness } from '../../src/lib/benchmark/runHarness'
import type { MinimalLighthouseResult } from '../../src/lib/benchmark/types'

// Docker-network hostname, per CLAUDE.md's Docker Rules — never localhost.
const BASE_URL = process.env.BENCHMARK_BASE_URL ?? 'http://web-benchmark:3000'
const RUNS_PER_PAGE = process.env.BENCHMARK_RUNS_PER_PAGE
  ? Number(process.env.BENCHMARK_RUNS_PER_PAGE)
  : MIN_RUNS_PER_PAGE
const RESULTS_DIR = path.join(__dirname, 'results')

// Same collectRun shape as run.ts: mobile form factor, Lighthouse's own
// default simulated mid-tier-mobile throttle (no override). Both categories
// are requested — see run.ts's own header note — because extractMeasurements
// always reads lhr.audits['image-size-responsive'], and that audit is only
// populated when 'best-practices' is requested alongside 'performance'.
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

async function main() {
  const url = `${BASE_URL}/`
  const harness = await runHarness({
    runsPerPage: RUNS_PER_PAGE,
    collectRun: () => collectRun(url),
  })

  fs.mkdirSync(RESULTS_DIR, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outputPath = path.join(RESULTS_DIR, `ac34.2-hero-cls-${timestamp}.json`)
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: BASE_URL, url, harness }, null, 2),
  )

  console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`)
  const { aggregate } = harness
  console.log(
    `homepage hero (mobile): CLS(total)=${aggregate.clsTotal.median} ` +
      `(${aggregate.clsTotal.min}-${aggregate.clsTotal.max}) ` +
      `CLS(image)=${aggregate.clsImageAttributable.median} ` +
      `performance=${aggregate.mobilePerformanceScore.median} ` +
      `LCP=${Math.round(aggregate.lcpMs.median)}ms`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
