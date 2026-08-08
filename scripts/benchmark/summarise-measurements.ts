/**
 * ---
 * file: scripts/benchmark/summarise-measurements.ts
 * project: earthandhoney
 * purpose: AC-29.2.2.3 — CLI entry point (npm run benchmark:summarise) that
 *          regenerates the committed, candidate-labelled measurement table
 *          (scripts/benchmark/results/MEASURED_PATHS.md) from whatever
 *          run-<timestamp>-<deliveryPath>.json reports are currently
 *          retained under scripts/benchmark/results/. It never hand-writes a
 *          number: src/lib/benchmark/loadRunReports.ts discovers and parses
 *          the retained reports per candidate path,
 *          src/lib/benchmark/invocationSpread.ts reduces each candidate's
 *          reports to the per-page, per-metric spread across invocations,
 *          and src/lib/benchmark/measurementReport.ts renders the file this
 *          script writes — the same three modules the AC-29.2.2.3 test suite
 *          calls directly to prove the committed file still equals the raw
 *          JSON beside it. A candidate with fewer than two committed
 *          invocations is never guessed at: it is emitted as unmeasured,
 *          named in the report's coverage table with the specific
 *          prerequisite blocking it (AC-29.2.2.2's fallback), so a path can
 *          be missing a number but can never be missing from the record.
 *          Colocated with run.ts rather than the app's own scripts/ so it
 *          runs via this directory's own ts-node/typescript devDependencies
 *          (scripts/benchmark/package.json) — it needs neither lighthouse
 *          nor chrome-launcher, but stays out of the app's dependency tree
 *          for the same reason run.ts does.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.2.2.3
 * ---
 */
import fs from 'fs'
import path from 'path'

import { summariseDeliveryPath, type DeliveryPathSpread } from '../../src/lib/benchmark/invocationSpread'
import { loadRunReports, MEASURED_DELIVERY_PATHS, RESULTS_RELATIVE_PATH } from '../../src/lib/benchmark/loadRunReports'
import {
  blockingPrerequisiteFor,
  MEASUREMENT_REPORT_RELATIVE_PATH,
  renderMeasurementReport,
  type UnmeasuredCandidate,
} from '../../src/lib/benchmark/measurementReport'

// Resolved from this file's own location so the script writes to the same
// results directory regardless of the invoking cwd — mirrors run.ts's own
// RESULTS_DIR resolution.
const REPO_ROOT = path.join(__dirname, '..', '..')
const RESULTS_DIR = path.join(REPO_ROOT, RESULTS_RELATIVE_PATH)

function main() {
  const spreads: DeliveryPathSpread[] = []
  const unmeasured: UnmeasuredCandidate[] = []

  for (const deliveryPath of MEASURED_DELIVERY_PATHS) {
    const reports = loadRunReports(RESULTS_DIR, deliveryPath)

    if (reports.length < 2) {
      // Not skipped: recorded as unmeasured, by name, with what is blocking it.
      unmeasured.push({
        deliveryPath,
        invocationsCommitted: reports.length,
        blockingPrerequisite: blockingPrerequisiteFor(deliveryPath, reports.length),
      })
      console.log(`${deliveryPath}: ${reports.length} committed invocation(s) — recorded as unmeasured.`)
      continue
    }

    spreads.push(summariseDeliveryPath(reports))
  }

  const output = renderMeasurementReport(spreads, unmeasured)
  const outputPath = path.join(REPO_ROOT, MEASUREMENT_REPORT_RELATIVE_PATH)
  fs.writeFileSync(outputPath, output)

  console.log(`Wrote ${MEASUREMENT_REPORT_RELATIVE_PATH}`)
}

main()
