/**
 * ---
 * file: src/lib/benchmark/extractMeasurements.ts
 * project: earthandhoney
 * purpose: AC-29.1.2 — pure extraction of the four
 *          R2_STORAGE_AND_DELIVERY_ADR.md measurements from a single
 *          Lighthouse result (LHR). No Chrome, no network I/O, no
 *          filesystem access: `extractMeasurements` is a plain function of
 *          its `MinimalLighthouseResult` argument.
 *
 *          Mapping notes (each cited to the `lighthouse` package's own
 *          audit source under node_modules/lighthouse/core/audits/, see
 *          types.ts's header for the full citation list):
 *          - Mobile performance score is `categories.performance.score`
 *            verbatim.
 *          - Image-attributable CLS sums `layout-shifts` audit items whose
 *            `node.snippet` is an `<img>` element's serialized opening tag
 *            (core/lib/page-functions.js `getOuterHTMLSnippet`/
 *            `getNodeDetails` — `snippet` is always the node's outer-HTML
 *            snippet, so an `<img …` prefix reliably identifies an image
 *            node). The whole-page `cumulative-layout-shift` total is kept
 *            alongside it so the image share is visibly a share, not the
 *            whole story.
 *          - LCP is `largest-contentful-paint`'s `numericValue` (milliseconds).
 *          - The network-payload audit joins `network-requests` (transfer
 *            bytes) with `image-size-responsive` (requested vs expected
 *            pixel count) by `url`. `image-size-responsive`'s own
 *            `details.items` in a real Lighthouse run only ever lists
 *            under-sized images — see core/audits/image-size-responsive.js's
 *            `.filter(image => !imageHasRightSize(image, DPR))` — because
 *            over-sized images pass that audit's own check and never reach
 *            its `items` array. This module does not rely on that
 *            direction: it independently compares each item's own
 *            `actualPixels` against `expectedPixels` (which `image-size-responsive`
 *            already computes from displayed size × DPR) to flag an
 *            over-sized fetch, which is the opposite condition to what that
 *            audit's own pass/fail models. The field names (`actualPixels`,
 *            `expectedPixels`, `url`) are the only thing borrowed from it.
 *          - `configSettings.throttling`/`throttlingMethod`/`formFactor` are
 *            copied from the LHR verbatim so the throttle profile a
 *            measurement was taken under is visible in the report rather
 *            than assumed from convention.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.1.2
 * ---
 */

import type {
  ExtractedMeasurements,
  ImagePayloadMeasurement,
  MinimalLighthouseResult,
} from './types'

function isImageNode(node: { snippet?: string } | undefined): boolean {
  return typeof node?.snippet === 'string' && /^<img\b/i.test(node.snippet.trim())
}

function extractImageAttributableCls(lhr: MinimalLighthouseResult): {
  total: number
  imageAttributable: number
  imageAttributableShare: number
} {
  const total = lhr.audits['cumulative-layout-shift'].numericValue
  const items = lhr.audits['layout-shifts'].details?.items ?? []
  const imageAttributable = items
    .filter((item) => isImageNode(item.node))
    .reduce((sum, item) => sum + item.score, 0)

  return {
    total,
    imageAttributable,
    imageAttributableShare: total === 0 ? 0 : imageAttributable / total,
  }
}

function extractNetworkPayload(lhr: MinimalLighthouseResult): {
  images: ImagePayloadMeasurement[]
  oversizedCount: number
} {
  const networkImages = (lhr.audits['network-requests'].details?.items ?? []).filter(
    (item) => item.resourceType === 'Image',
  )
  const sizeByUrl = new Map(
    (lhr.audits['image-size-responsive'].details?.items ?? []).map((item) => [item.url, item]),
  )

  const images: ImagePayloadMeasurement[] = networkImages.map((request) => {
    const sizeInfo = sizeByUrl.get(request.url)
    const requestedPixels = sizeInfo?.actualPixels ?? null
    const expectedPixels = sizeInfo?.expectedPixels ?? null
    const oversized =
      requestedPixels !== null && expectedPixels !== null && requestedPixels > expectedPixels

    return {
      url: request.url,
      transferBytes: request.transferSize ?? null,
      requestedPixels,
      expectedPixels,
      oversized,
    }
  })

  return {
    images,
    oversizedCount: images.filter((image) => image.oversized).length,
  }
}

export function extractMeasurements(lhr: MinimalLighthouseResult): ExtractedMeasurements {
  return {
    mobilePerformanceScore: lhr.categories.performance.score,
    cls: extractImageAttributableCls(lhr),
    lcpMs: lhr.audits['largest-contentful-paint'].numericValue,
    throttling: lhr.configSettings.throttling,
    formFactor: lhr.configSettings.formFactor,
    throttlingMethod: lhr.configSettings.throttlingMethod,
    networkPayload: extractNetworkPayload(lhr),
  }
}
