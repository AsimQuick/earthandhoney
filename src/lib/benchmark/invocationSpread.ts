/**
 * ---
 * file: src/lib/benchmark/invocationSpread.ts
 * project: earthandhoney
 * purpose: AC-29.2.2.3 — reduces the committed run reports of one candidate
 *          delivery path to the per-metric spread across harness
 *          *invocations*. AC-29.1.3 established that a single invocation is
 *          not a measurement, so every measured path is run twice; this
 *          module states, per page and per metric, how far the two (or more)
 *          invocations disagreed. AC-29.3 reads pass/fail against that
 *          number as its noise floor — a path that "misses" a target by less
 *          than the spread between two runs of itself has not been shown to
 *          miss it — so the spread has to be derived from the raw reports
 *          rather than typed into prose by hand, which is exactly the failure
 *          mode AC-29.2.1 caught in this area (a committed coverage file
 *          citing measurements that did not exist).
 *          Pure logic: no fs, no network, no Docker. The caller supplies the
 *          already-parsed reports — scripts/benchmark/summarise-measurements.ts
 *          reads them off disk, and the AC-29.2.2.3 test suite feeds it the
 *          same committed files to prove the published table still equals
 *          what the raw JSON says.
 *          Records numbers only: no target, no pass/fail and no comparison
 *          between candidate paths is computed here. AC-29.3 owns all three.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.2.2.3
 * ---
 */
import type { DeliveryPath } from './deliveryPathImages'
import { isGalleryImageUrl } from './observedDeliveryPath'
import type { AggregatedMeasurements, ExtractedMeasurements } from './types'

/** One page's block inside a committed `run-<timestamp>-<deliveryPath>.json` report. */
export interface RunReportPage {
  id: string
  path: string
  url: string
  harness: {
    runsPerPage: number
    rawRuns: ExtractedMeasurements[]
    aggregate: AggregatedMeasurements
  }
}

/** A whole committed report — one harness invocation, both representative pages. */
export interface RunReport {
  generatedAt: string
  baseUrl: string
  deliveryPath: DeliveryPath
  runsPerPage: number
  pages: RunReportPage[]
}

/** A committed report paired with the file name it was read from, so every number stays traceable to its file. */
export interface NamedRunReport {
  fileName: string
  report: RunReport
}

/**
 * The three numeric aggregate metrics a spread is stated for. The fourth ADR
 * measurement — the network payload audit — is not a single number, so it is
 * summarised separately by `networkPayloadSummary` rather than forced into
 * this shape.
 */
export const SPREAD_METRICS = ['mobilePerformanceScore', 'clsImageAttributable', 'lcpMs'] as const

export type SpreadMetric = (typeof SPREAD_METRICS)[number]

export interface MetricSpread {
  metric: SpreadMetric
  /** Each invocation's median for this metric, in the order the invocations were supplied. */
  invocationMedians: number[]
  /** Lowest and highest of `invocationMedians`. */
  min: number
  max: number
  /**
   * `max - min`: how far two invocations of the *same* path on the *same*
   * build disagreed. This is the noise floor AC-29.3 reads pass/fail against.
   */
  spread: number
  /**
   * The widest single-invocation envelope observed — the smallest `min` and
   * largest `max` across the per-invocation Lighthouse passes. Retained
   * because within-invocation variance is what makes the between-invocation
   * spread meaningful: a 0.02 spread between invocations means something
   * different when each invocation's own three passes already varied by 0.10.
   */
  worstCaseMin: number
  worstCaseMax: number
}

export interface NetworkPayloadSummary {
  /** Gallery images requested per Lighthouse pass (the site chrome's /_next/image logo is excluded). */
  galleryImageCount: number
  /** Every distinct transfer size observed for a gallery image, ascending — the "what resolution was actually fetched" audit. */
  transferBytes: number[]
  /** Total images Lighthouse's `image-size-responsive` audit flagged as oversized, summed over every pass. */
  oversizedCount: number
}

export interface PageSpread {
  pageId: string
  /** Number of harness invocations the spread was computed across (2 is AC-29.1.3's floor). */
  invocationCount: number
  /** Lighthouse passes per invocation for this page. */
  runsPerPage: number
  metrics: MetricSpread[]
  networkPayload: NetworkPayloadSummary
}

export interface DeliveryPathSpread {
  deliveryPath: DeliveryPath
  /** File names the numbers came from, in supplied order — every value below is re-derivable from these. */
  fileNames: string[]
  pages: PageSpread[]
}

function pageOf(report: RunReport, pageId: string): RunReportPage | undefined {
  return report.pages.find((page) => page.id === pageId)
}

/** Every page id present in `reports`, in first-seen order. */
export function pageIds(reports: NamedRunReport[]): string[] {
  const ids: string[] = []
  for (const { report } of reports) {
    for (const page of report.pages) if (!ids.includes(page.id)) ids.push(page.id)
  }
  return ids
}

/**
 * Throws when the supplied reports cannot be summarised as one path's
 * measurement: fewer than two invocations (AC-29.1.3's two-invocation
 * reproducibility rule), mixed `deliveryPath` labels, or a page missing from
 * one of them. Refusing is deliberate — a summary silently computed over one
 * invocation, or over two different candidates, is the mislabel this whole AC
 * exists to make impossible.
 */
export function assertSummarisable(reports: NamedRunReport[]): void {
  if (reports.length < 2) {
    throw new Error(`A candidate path needs at least 2 harness invocations to state a spread; got ${reports.length}.`)
  }

  const labels = new Set(reports.map(({ report }) => report.deliveryPath))
  if (labels.size !== 1) {
    throw new Error(`Refusing to summarise reports labeled with more than one delivery path: ${[...labels].join(', ')}.`)
  }

  for (const id of pageIds(reports)) {
    const missing = reports.filter(({ report }) => !pageOf(report, id))
    if (missing.length > 0) {
      throw new Error(`Page "${id}" is missing from ${missing.map((m) => m.fileName).join(', ')}.`)
    }
  }
}

function spreadFor(metric: SpreadMetric, pages: RunReportPage[]): MetricSpread {
  const stats = pages.map((page) => page.harness.aggregate[metric])
  const invocationMedians = stats.map((s) => s.median)

  return {
    metric,
    invocationMedians,
    min: Math.min(...invocationMedians),
    max: Math.max(...invocationMedians),
    spread: Math.max(...invocationMedians) - Math.min(...invocationMedians),
    worstCaseMin: Math.min(...stats.map((s) => s.min)),
    worstCaseMax: Math.max(...stats.map((s) => s.max)),
  }
}

function networkPayloadSummary(pages: RunReportPage[]): NetworkPayloadSummary {
  const galleryImages = pages.flatMap((page) =>
    page.harness.rawRuns.flatMap((run) => run.networkPayload.images.filter((image) => isGalleryImageUrl(image.url))),
  )
  const perPass = pages.flatMap((page) =>
    page.harness.rawRuns.map((run) => run.networkPayload.images.filter((image) => isGalleryImageUrl(image.url)).length),
  )
  const counts = new Set(perPass)

  return {
    // Every pass requests the same gallery — a differing count between passes
    // would mean the page itself changed mid-measurement, so it is surfaced
    // as -1 rather than averaged into a number that hides it.
    galleryImageCount: counts.size === 1 ? [...counts][0] : -1,
    transferBytes: [...new Set(galleryImages.map((image) => image.transferBytes ?? 0))].sort((a, b) => a - b),
    oversizedCount: pages.reduce(
      (total, page) => total + page.harness.rawRuns.reduce((sum, run) => sum + run.networkPayload.oversizedCount, 0),
      0,
    ),
  }
}

/**
 * Summarises every invocation of one candidate delivery path into the
 * per-page, per-metric spread AC-29.3 reads its noise floor from. Order of
 * `reports` is preserved in `invocationMedians` and `fileNames` so a reader
 * can map any published number back to the file it came from.
 */
export function summariseDeliveryPath(reports: NamedRunReport[]): DeliveryPathSpread {
  assertSummarisable(reports)

  return {
    deliveryPath: reports[0].report.deliveryPath,
    fileNames: reports.map(({ fileName }) => fileName),
    pages: pageIds(reports).map((pageId) => {
      const pages = reports.map(({ report }) => pageOf(report, pageId) as RunReportPage)

      return {
        pageId,
        invocationCount: pages.length,
        runsPerPage: pages[0].harness.runsPerPage,
        metrics: SPREAD_METRICS.map((metric) => spreadFor(metric, pages)),
        networkPayload: networkPayloadSummary(pages),
      }
    }),
  }
}
