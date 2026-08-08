/**
 * ---
 * file: src/lib/benchmark/types.ts
 * project: earthandhoney
 * purpose: AC-29.1.2 — the minimal Lighthouse-result (LHR) shape this
 *          benchmark harness reads from, and the pure-logic types derived
 *          from it. Only the fields the four ADR measurements actually use
 *          are declared (not the full LHR schema), and each field is
 *          annotated with the exact `lighthouse` package audit source that
 *          proves the id/field name is real:
 *            - node_modules/lighthouse/core/audits/metrics/largest-contentful-paint.js
 *              (id 'largest-contentful-paint', `numericValue`)
 *            - node_modules/lighthouse/core/audits/metrics/cumulative-layout-shift.js
 *              (id 'cumulative-layout-shift', `numericValue`)
 *            - node_modules/lighthouse/core/audits/layout-shifts.js
 *              (id 'layout-shifts', `details.items[].{node,score}`)
 *            - node_modules/lighthouse/core/audits/network-requests.js
 *              (id 'network-requests', `details.items[].{url,resourceType,transferSize}`)
 *            - node_modules/lighthouse/core/audits/image-size-responsive.js
 *              (id 'image-size-responsive',
 *              `details.items[].{url,actualPixels,expectedPixels}`)
 *          `configSettings.throttling` mirrors the shape of
 *          `Lantern.Simulation.Constants.throttling.mobileSlow4G` in
 *          node_modules/@paulirish/trace_engine/models/trace/lantern/simulation/Constants.js,
 *          which is what node_modules/lighthouse/core/config/constants.js's
 *          default mobile config wires up as `throttling`.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.1.2
 * ---
 */

/** `LH.Audit.Details.NodeValue` subset — see core/audits/audit.js `makeNodeItem`. */
export interface LighthouseNodeValue {
  type: 'node'
  nodeLabel?: string
  /** Serialized outer-HTML opening tag (core/lib/page-functions.js `getOuterHTMLSnippet`). */
  snippet?: string
  selector?: string
}

/** core/audits/layout-shifts.js `Item` (per-shift-event table row). */
export interface LayoutShiftItem {
  node?: LighthouseNodeValue
  score: number
}

/** core/audits/network-requests.js per-request result row. */
export interface NetworkRequestItem {
  url: string
  resourceType?: string
  transferSize?: number
  resourceSize?: number
  mimeType?: string
}

/** core/audits/image-size-responsive.js `Result` (per-image table row). */
export interface ImageSizeResponsiveItem {
  url: string
  node?: LighthouseNodeValue
  displayedSize: string
  actualSize: string
  actualPixels: number
  expectedSize: string
  expectedPixels: number
}

/** node_modules/@paulirish/trace_engine .../lantern/simulation/Constants.js `throttling.mobileSlow4G` shape. */
export interface LighthouseThrottlingSettings {
  rttMs: number
  throughputKbps: number
  requestLatencyMs: number
  downloadThroughputKbps: number
  uploadThroughputKbps: number
  cpuSlowdownMultiplier: number
}

/**
 * The minimal LHR subset AC-29.1.2 extracts from. Deliberately not the full
 * Lighthouse result type — every field below is one this module reads.
 */
export interface MinimalLighthouseResult {
  categories: {
    /** LHR `categories.performance.score` — 0..1 or null when not computed. */
    performance: {
      score: number | null
    }
  }
  audits: {
    'largest-contentful-paint': {
      numericValue: number
    }
    'cumulative-layout-shift': {
      numericValue: number
    }
    'layout-shifts': {
      details?: {
        items: LayoutShiftItem[]
      }
    }
    'network-requests': {
      details?: {
        items: NetworkRequestItem[]
      }
    }
    'image-size-responsive': {
      details?: {
        items: ImageSizeResponsiveItem[]
      }
    }
  }
  configSettings: {
    formFactor: string
    throttlingMethod: string
    throttling: LighthouseThrottlingSettings
  }
}

/** Per-image row this module derives by joining network-requests with image-size-responsive on `url`. */
export interface ImagePayloadMeasurement {
  url: string
  /** `network-requests` item's `transferSize`; null when the image had no matching network request. */
  transferBytes: number | null
  /** `image-size-responsive` item's `actualPixels` (the resolution actually delivered); null when unmatched. */
  requestedPixels: number | null
  /** `image-size-responsive` item's `expectedPixels` (what the displayed size/DPR requires); null when unmatched. */
  expectedPixels: number | null
  /** True when `requestedPixels` exceeds `expectedPixels` — a full-resolution fetch the ADR target forbids. */
  oversized: boolean
}

export interface CumulativeLayoutShiftMeasurement {
  /** `cumulative-layout-shift` audit's `numericValue` — the whole-page CLS. */
  total: number
  /** Sum of `layout-shifts` items' `score` whose `node.snippet` is an `<img>` element. */
  imageAttributable: number
  /** `imageAttributable / total`, `0` when `total` is `0` (no shift occurred at all). */
  imageAttributableShare: number
}

export interface NetworkPayloadMeasurement {
  images: ImagePayloadMeasurement[]
  oversizedCount: number
}

/** The four ADR measurements extracted from a single Lighthouse result. */
export interface ExtractedMeasurements {
  mobilePerformanceScore: number | null
  cls: CumulativeLayoutShiftMeasurement
  lcpMs: number
  throttling: LighthouseThrottlingSettings
  formFactor: string
  throttlingMethod: string
  networkPayload: NetworkPayloadMeasurement
}

/** median/min/max across `rawRuns` for one numeric metric. */
export interface MetricStatistics {
  median: number
  min: number
  max: number
}

export interface AggregatedMeasurements {
  runCount: number
  mobilePerformanceScore: MetricStatistics
  clsTotal: MetricStatistics
  clsImageAttributable: MetricStatistics
  lcpMs: MetricStatistics
}

export interface HarnessResult {
  runsPerPage: number
  /** Every raw run's extracted measurements, retained beside the aggregate (AC-29.3). */
  rawRuns: ExtractedMeasurements[]
  aggregate: AggregatedMeasurements
}
