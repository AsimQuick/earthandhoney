/**
 * ---
 * file: src/lib/benchmark/runHarness.ts
 * project: earthandhoney
 * purpose: AC-29.1.2 — the reproducibility contract on top of
 *          extractMeasurements/aggregateRuns: `runHarness` refuses a
 *          `runsPerPage` below `MIN_RUNS_PER_PAGE`, collects every raw run
 *          via an injected `collectRun` (so this module itself never drives
 *          Chrome or a container — the actual Lighthouse invocation is
 *          scripts/benchmark/run.ts's concern, out of this AC's scope),
 *          and retains every raw run beside the aggregate (AC-29.3: the
 *          numbers must be re-derivable, not trusted).
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.1.2
 * ---
 */

import { aggregateRuns } from './aggregateRuns'
import { extractMeasurements } from './extractMeasurements'
import type { HarnessResult, MinimalLighthouseResult } from './types'

/**
 * Below this, min/max/median collapse into the same single number and a
 * flaky one-off run can't be distinguished from a stable measurement.
 */
export const MIN_RUNS_PER_PAGE = 3

export interface RunHarnessOptions {
  runsPerPage: number
  /** Produces one Lighthouse result per run; index is the 0-based run number. */
  collectRun: (runIndex: number) => MinimalLighthouseResult | Promise<MinimalLighthouseResult>
}

export async function runHarness(options: RunHarnessOptions): Promise<HarnessResult> {
  const { runsPerPage, collectRun } = options

  if (runsPerPage < MIN_RUNS_PER_PAGE) {
    throw new Error(
      `a single run is not a measurement — runsPerPage must be at least ${MIN_RUNS_PER_PAGE}, got ${runsPerPage}`,
    )
  }

  const rawRuns = []
  for (let runIndex = 0; runIndex < runsPerPage; runIndex++) {
    const lhr = await collectRun(runIndex)
    rawRuns.push(extractMeasurements(lhr))
  }

  return {
    runsPerPage,
    rawRuns,
    aggregate: aggregateRuns(rawRuns),
  }
}
