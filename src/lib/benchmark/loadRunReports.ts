/**
 * ---
 * file: src/lib/benchmark/loadRunReports.ts
 * project: earthandhoney
 * purpose: AC-29.2.2.3 — the one place a candidate delivery path's retained raw
 *          run reports are discovered on disk and parsed, so the generator
 *          (scripts/benchmark/summarise-measurements.ts) and the AC-29.2.2.3
 *          test suite read exactly the same set of files in exactly the same
 *          order. If they could disagree, the suite's "the published table
 *          still equals the raw JSON" guarantee would be worth nothing.
 *          Selection is by the candidate suffix run.ts writes into every
 *          report's file name (`run-<iso-timestamp>-<deliveryPath>.json`,
 *          AC-29.2.2.3), and reports are returned in file-name (i.e.
 *          ISO-timestamp) order — the order the invocations actually ran.
 *          A report with no candidate suffix at all (none survive — the
 *          three pre-AC-29.1.1 runs and the two AC-29.1.3 runs are withdrawn,
 *          see scripts/benchmark/results/REPRODUCIBILITY.md) is deliberately
 *          not matched by any path: an unlabelled report belongs to no
 *          candidate.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.2.2.3
 * ---
 */
import fs from 'fs'
import path from 'path'

import type { DeliveryPath } from './deliveryPathImages'
import type { NamedRunReport, RunReport } from './invocationSpread'
import { IN_SCOPE_DELIVERY_PATHS } from './measurementReport'

export const RESULTS_RELATIVE_PATH = 'scripts/benchmark/results'

/**
 * The candidate paths AC-29.2.1 bounded AC-29.2.2 to, in ADR candidate order.
 * Re-exported from the renderer's own list rather than restated here: the
 * generator walks this list and the renderer insists every entry of its list
 * is accounted for, so two lists that could drift apart would let a candidate
 * fall between them — the silent drop AC-29.2.2.3 forbids.
 */
export const MEASURED_DELIVERY_PATHS: DeliveryPath[] = IN_SCOPE_DELIVERY_PATHS

/** `run-<iso-timestamp>-<deliveryPath>.json` — the name run.ts writes (AC-29.2.2.3). */
export function runReportFileNames(resultsDir: string, deliveryPath: DeliveryPath): string[] {
  return fs
    .readdirSync(resultsDir)
    .filter((name) => new RegExp(`^run-.*-${deliveryPath}\\.json$`).test(name))
    .sort()
}

/**
 * Every retained invocation of `deliveryPath`, parsed, in run order. Throws
 * when a report's own `deliveryPath` field disagrees with the file name it was
 * found under — the two are written together by run.ts, so a mismatch means
 * a file was renamed or hand-edited after the fact and nothing downstream
 * should treat it as evidence.
 */
export function loadRunReports(resultsDir: string, deliveryPath: DeliveryPath): NamedRunReport[] {
  return runReportFileNames(resultsDir, deliveryPath).map((fileName) => {
    const report = JSON.parse(fs.readFileSync(path.join(resultsDir, fileName), 'utf8')) as RunReport

    if (report.deliveryPath !== deliveryPath) {
      throw new Error(`${fileName} is named for "${deliveryPath}" but is labeled "${report.deliveryPath}" inside.`)
    }

    return { fileName, report }
  })
}
