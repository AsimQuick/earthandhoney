/**
 * ---
 * file: src/lib/benchmark/observedDeliveryPath.ts
 * project: earthandhoney
 * purpose: AC-29.2 — proves a run report's `deliveryPath` label against the
 *          image URLs the run actually fetched, instead of trusting the env
 *          var alone. This exists because the mislabel it prevents already
 *          happened once during this AC: `BENCHMARK_DELIVERY_PATH` was set on
 *          the shell that started the `lighthouse-benchmark` container, but
 *          that service's compose `environment` block did not forward it, so
 *          a run whose pages served presigned R2 URLs wrote a report labeled
 *          "backstage-proxy". Two containers each read the same env var
 *          independently ("web-benchmark" renders the URLs, the harness
 *          labels the report), so the label and the measurement can disagree
 *          silently — and a candidate-path benchmark filed under the wrong
 *          candidate is worse than no benchmark. run.ts now fails the run
 *          rather than writing a report the observed URLs contradict.
 *          Pure logic: string classification only, no fs and no network.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.2
 * ---
 */
import type { DeliveryPath } from './deliveryPathImages'

/** R2's S3-compatible endpoint host suffix — what a candidate-2 fetch goes to. */
export const R2_ENDPOINT_HOST_SUFFIX = 'r2.cloudflarestorage.com'

/** The Backstage image routes candidate 1 serves through, per next.config.ts's rewrite. */
export const BACKSTAGE_IMAGE_ROUTE_PREFIX = '/api/gallery/'

/**
 * Next.js's own optimizer endpoint. The site chrome (logo) goes through it and
 * belongs to neither candidate, so it is excluded before classifying.
 */
const NEXT_IMAGE_ENDPOINT = '/_next/image'

export function isGalleryImageUrl(url: string): boolean {
  return !url.includes(NEXT_IMAGE_ENDPOINT)
}

/**
 * The delivery path `urls` actually demonstrate, or `null` when they are
 * empty, mixed across both mechanisms, or match neither. `null` is the honest
 * answer in each of those cases — a mixed page is not a measurement of either
 * candidate, and the caller is expected to fail rather than pick one.
 */
export function classifyObservedDeliveryPath(urls: string[]): DeliveryPath | null {
  const gallery = urls.filter(isGalleryImageUrl)
  if (gallery.length === 0) return null

  if (gallery.every((url) => url.includes(R2_ENDPOINT_HOST_SUFFIX))) return 'presigned-r2'
  if (gallery.every((url) => url.includes(BACKSTAGE_IMAGE_ROUTE_PREFIX))) return 'backstage-proxy'

  return null
}

/**
 * Throws unless `urls` demonstrate `declared`. The message names both sides
 * and one offending URL, because the cause is always a wiring difference
 * between the two containers rather than a code bug in the harness.
 */
export function assertObservedDeliveryPath(declared: DeliveryPath, urls: string[]): void {
  const observed = classifyObservedDeliveryPath(urls)
  if (observed === declared) return

  const sample = urls.filter(isGalleryImageUrl)[0] ?? '(no gallery image was requested at all)'
  throw new Error(
    `Refusing to write a report labeled "${declared}": the measured pages served ` +
      `${observed ?? 'a mixed or unrecognised set of'} image URLs, e.g. ${sample}. ` +
      'Check that BENCHMARK_DELIVERY_PATH is set identically on the "web-benchmark" and ' +
      '"lighthouse-benchmark" services, and that web-benchmark was recreated after it changed.',
  )
}
