/**
 * ---
 * file: src/lib/benchmark/resolveBenchmarkDeliveryPath.ts
 * project: earthandhoney
 * purpose: AC-29.2 — the one place the two benchmark pages
 *          (src/app/(frontend)/dev/benchmark-portfolio-gallery,
 *          benchmark-story-gallery) read which candidate delivery path a
 *          given `web-benchmark` container run is measuring.
 *          `BENCHMARK_DELIVERY_PATH` (docker-compose.yml's "web-benchmark"
 *          service, `${BENCHMARK_DELIVERY_PATH:-backstage-proxy}`) selects
 *          the path; when it is `presigned-r2`, the pre-generated map at
 *          `scripts/benchmark/presign-data/presigned-image-map.json`
 *          (written by scripts/benchmark/presign-r2-urls.sh, bind-mounted
 *          into the container) supplies the actual signed URLs. Reading
 *          both live (env + fs) rather than as pure functions is
 *          deliberate: this is the request-time seam AC-29.2's pure logic
 *          (deliveryPathImages.ts) is injected through, exactly the same
 *          split runHarness.ts (AC-29.1.2) draws between its own pure
 *          extraction logic and run.ts's live Lighthouse/Chrome collection.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.2
 * ---
 */
import fs from 'fs'
import path from 'path'

import type { DeliveryPath, PresignedImageMap } from './deliveryPathImages'

/**
 * Repo-relative so it resolves identically on a developer's host and inside
 * the `web-benchmark` container (WORKDIR /app) — the same path
 * docker-compose.yml bind-mounts the generated map into.
 */
export const PRESIGN_MAP_RELATIVE_PATH = 'scripts/benchmark/presign-data/presigned-image-map.json'

export const PRESIGN_MAP_PATH = path.join(process.cwd(), PRESIGN_MAP_RELATIVE_PATH)

/**
 * Anything other than the exact string `'presigned-r2'` — unset, empty, a
 * typo — resolves to candidate path 1. A misspelled env var must fall back to
 * the mechanism that always works rather than half-select the other one, and a
 * run mislabeled as candidate 2 would be worse than no measurement at all.
 */
export function currentBenchmarkDeliveryPath(): DeliveryPath {
  return process.env.BENCHMARK_DELIVERY_PATH === 'presigned-r2' ? 'presigned-r2' : 'backstage-proxy'
}

/**
 * Missing/unreadable/invalid JSON all resolve to `{}` — applyDeliveryPath
 * already treats a missing photo id as "keep the Backstage-proxied URL", so a
 * not-yet-generated map degrades safely rather than throwing. `mapPath` is a
 * parameter purely so this is unit-testable against a committed fixture: the
 * real map is gitignored (live, short-TTL signatures), so a test that read the
 * default path would pass only on the machine that last ran the presign script.
 */
export function loadPresignedImageMap(mapPath: string = PRESIGN_MAP_PATH): PresignedImageMap {
  try {
    const raw = fs.readFileSync(mapPath, 'utf8')
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as PresignedImageMap) : {}
  } catch {
    return {}
  }
}
