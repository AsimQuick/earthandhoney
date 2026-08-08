/**
 * ---
 * file: src/lib/benchmark/aggregateRuns.ts
 * project: earthandhoney
 * purpose: AC-29.1.2 — pure aggregation of several `ExtractedMeasurements`
 *          (one per Lighthouse run of the same page/candidate path) into
 *          median/min/max per metric, per AC-29.1's "a single run is not a
 *          measurement" requirement. No Chrome, no I/O — a plain function
 *          of its array argument.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.1.2
 * ---
 */

import type { AggregatedMeasurements, ExtractedMeasurements, MetricStatistics } from './types'

function statistics(values: number[]): MetricStatistics {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]

  return {
    median,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  }
}

export function aggregateRuns(rawRuns: ExtractedMeasurements[]): AggregatedMeasurements {
  if (rawRuns.length === 0) {
    throw new Error('aggregateRuns requires at least one run')
  }

  return {
    runCount: rawRuns.length,
    mobilePerformanceScore: statistics(
      rawRuns.map((run) => run.mobilePerformanceScore ?? 0),
    ),
    clsTotal: statistics(rawRuns.map((run) => run.cls.total)),
    clsImageAttributable: statistics(rawRuns.map((run) => run.cls.imageAttributable)),
    lcpMs: statistics(rawRuns.map((run) => run.lcpMs)),
  }
}
