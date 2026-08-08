/**
 * ---
 * file: src/lib/benchmark/measurementReport.ts
 * project: earthandhoney
 * purpose: AC-29.2.2.3 — renders the committed, candidate-labelled measurement
 *          table (scripts/benchmark/results/MEASURED_PATHS.md) from the
 *          per-invocation spreads invocationSpread.ts derives. Pure and
 *          total: the same reports always render the same bytes, which is
 *          what lets the AC-29.2.2.3 test suite re-render the file from the raw
 *          run JSON and fail on any drift. Every published number therefore
 *          has to be re-derivable from the retained raw output rather than
 *          trusted — the specific failure AC-29.2.1 caught here, where a
 *          committed coverage file confidently cited measurements that had
 *          never been produced.
 *          Deliberately renders no target, no pass/fail, no ranking and no
 *          cross-path comparison: AC-29.3 owns the ADR write-up and the
 *          per-target verdict, and this file is only the numbers plus the
 *          label saying which path each belongs to.
 *          Every in-scope candidate is accounted for by name — measured with
 *          its invocation count, or unmeasured with the specific prerequisite
 *          blocking it. `renderMeasurementReport` throws rather than render a
 *          file that omits one, so AC-29.2.2.3's "never silently dropped" is
 *          a structural property of the generator, not a habit of whoever
 *          ran it. Nothing is ever estimated from, or extrapolated across,
 *          the other path.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.2.2.3
 * ---
 */
import type { DeliveryPath } from './deliveryPathImages'
import type { DeliveryPathSpread, MetricSpread, SpreadMetric } from './invocationSpread'

export const MEASUREMENT_REPORT_RELATIVE_PATH = 'scripts/benchmark/results/MEASURED_PATHS.md'

/**
 * A candidate this AC's scope covers but that has no measurement. Stated by
 * name with the prerequisite blocking it (AC-29.2.2.2's fallback) rather than
 * estimated from the other path or quietly left out of the table.
 */
export interface UnmeasuredCandidate {
  deliveryPath: DeliveryPath
  /** How many invocations *are* committed — below AC-29.1.3's floor of 2, which is why it is unmeasured. */
  invocationsCommitted: number
  /** The specific thing that must happen first, not a general apology. */
  blockingPrerequisite: string
}

/** ADR wording for each candidate path, so a reader never has to map a label back to the ADR by hand. */
const CANDIDATE_LABELS: Record<string, { number: number; adrWording: string; mechanism: string }> = {
  'backstage-proxy': {
    number: 1,
    adrWording: 'Serving through the Backstage',
    mechanism:
      'every gallery `<img>` requests `/api/gallery/:slug/hero/:photoId` on the page origin, ' +
      'which `next.config.ts` rewrites to the Backstage backend that owns the route',
  },
  'presigned-r2': {
    number: 2,
    adrWording: 'Direct time-limited links',
    mechanism:
      'every gallery `<img>` requests a presigned `r2.cloudflarestorage.com` URL directly, ' +
      "signed by the pinned fork's own `S3StorageBackend.signedUrl`",
  },
}

const METRIC_LABELS: Record<SpreadMetric, string> = {
  mobilePerformanceScore: 'Mobile Lighthouse performance score',
  clsImageAttributable: 'Image-attributable CLS',
  lcpMs: 'LCP (mobile throttle)',
}

/** Formatting is per metric and fixed, so a re-render of the same reports is byte-identical. */
export function formatMetric(metric: SpreadMetric, value: number): string {
  if (metric === 'lcpMs') return `${Math.round(value)}ms`
  if (metric === 'clsImageAttributable') return value.toFixed(4)
  return value.toFixed(2)
}

function metricRow(spread: MetricSpread): string {
  const medians = spread.invocationMedians.map((value) => formatMetric(spread.metric, value)).join(' / ')
  const envelope = `${formatMetric(spread.metric, spread.worstCaseMin)}–${formatMetric(spread.metric, spread.worstCaseMax)}`

  return `| ${METRIC_LABELS[spread.metric]} | ${medians} | **${formatMetric(spread.metric, spread.spread)}** | ${envelope} |`
}

function pathSection(spread: DeliveryPathSpread): string {
  const candidate = CANDIDATE_LABELS[spread.deliveryPath]
  const heading = candidate
    ? `## Candidate ${candidate.number} — ${candidate.adrWording} (\`${spread.deliveryPath}\`)`
    : `## \`${spread.deliveryPath}\``

  const lines = [heading, '']
  if (candidate) lines.push(`Mechanism measured: ${candidate.mechanism}.`, '')

  lines.push(
    `Retained raw output, one file per harness invocation (${spread.fileNames.length} invocations):`,
    '',
    ...spread.fileNames.map((name, index) => `${index + 1}. \`${name}\``),
    '',
  )

  for (const page of spread.pages) {
    lines.push(
      `### Page \`${page.pageId}\``,
      '',
      `${page.invocationCount} invocations × ${page.runsPerPage} Lighthouse passes per invocation.`,
      '',
      '| Metric | Per-invocation median | Spread between invocations | Widest single-pass envelope |',
      '|---|---|---|---|',
      ...page.metrics.map(metricRow),
      '',
      `Network payload audit: ${page.networkPayload.galleryImageCount} gallery image requests per pass, ` +
        `transferred ${page.networkPayload.transferBytes.map((b) => `${b} bytes`).join(', ')}; ` +
        `${page.networkPayload.oversizedCount} image(s) flagged oversized by Lighthouse's ` +
        '`image-size-responsive` audit across all passes.',
      '',
    )
  }

  return lines.join('\n')
}

/** The candidates AC-29.2.1 bounded this AC to, in ADR candidate order. Candidates 3–5 are AC-29.2.3's. */
export const IN_SCOPE_DELIVERY_PATHS = Object.keys(CANDIDATE_LABELS)
  .sort((a, b) => CANDIDATE_LABELS[a].number - CANDIDATE_LABELS[b].number) as DeliveryPath[]

/**
 * Throws unless every in-scope candidate is accounted for exactly once, as
 * either measured or unmeasured. A candidate that appears in neither list, or
 * in both, would be a path silently dropped from — or double-counted in — the
 * committed record, which is the failure AC-29.2.2.3 forbids outright.
 */
export function assertEveryCandidateAccountedFor(
  spreads: DeliveryPathSpread[],
  unmeasured: UnmeasuredCandidate[],
): void {
  const accounted = [...spreads.map((s) => s.deliveryPath), ...unmeasured.map((u) => u.deliveryPath)]

  for (const deliveryPath of IN_SCOPE_DELIVERY_PATHS) {
    const times = accounted.filter((p) => p === deliveryPath).length
    if (times !== 1) {
      throw new Error(
        `Candidate "${deliveryPath}" is accounted for ${times} time(s); every in-scope candidate must be stated exactly once, measured or unmeasured.`,
      )
    }
  }
}

/**
 * The prerequisite blocking a candidate that has fewer than AC-29.1.3's two
 * invocations, stated as the concrete next command rather than a general
 * apology. Derived from how far short the candidate actually is, so it cannot
 * drift away from what is on disk.
 */
export function blockingPrerequisiteFor(deliveryPath: DeliveryPath, invocationsCommitted: number): string {
  const needed = 2 - invocationsCommitted
  const steps = [
    // Candidate 2's signed URLs are short-TTL and are baked into the build, so
    // they have to be refreshed before the image is rebuilt, not after.
    ...(deliveryPath === 'presigned-r2' ? ['`scripts/benchmark/presign-r2-urls.sh`'] : []),
    `\`BENCHMARK_DELIVERY_PATH=${deliveryPath} docker compose --profile benchmark up -d --build --force-recreate web-benchmark\``,
    `\`BENCHMARK_DELIVERY_PATH=${deliveryPath} docker compose --profile benchmark run --rm lighthouse-benchmark\` once per missing invocation, with no rebuild between them`,
    '`npm run benchmark:summarise`',
  ]

  return (
    `${needed} more harness invocation(s) against the same production build and the same seeded ` +
    `US-25 placement gallery AC-29.1.1 left in place — ${steps.join(', then ')}.`
  )
}

function coverageSection(spreads: DeliveryPathSpread[], unmeasured: UnmeasuredCandidate[]): string {
  const lines = [
    "## Coverage of the two candidates in this AC's scope",
    '',
    'Each candidate below is stated by name. A candidate with no measurement is',
    'stated as unmeasured with the prerequisite blocking it; it is never',
    'estimated, never extrapolated from the other candidate, and never left out',
    'of this table.',
    '',
    '| Candidate | Delivery path | Status | Committed harness invocations |',
    '|---|---|---|---|',
  ]

  for (const deliveryPath of IN_SCOPE_DELIVERY_PATHS) {
    const candidate = CANDIDATE_LABELS[deliveryPath]
    const spread = spreads.find((s) => s.deliveryPath === deliveryPath)
    const gap = unmeasured.find((u) => u.deliveryPath === deliveryPath)
    const status = spread ? 'measured' : 'unmeasured'
    const invocations = spread ? spread.fileNames.length : (gap?.invocationsCommitted ?? 0)

    lines.push(`| ${candidate.number} — ${candidate.adrWording} | \`${deliveryPath}\` | ${status} | ${invocations} |`)
  }

  lines.push('')

  for (const gap of unmeasured) {
    lines.push(`\`${gap.deliveryPath}\` is unmeasured. Blocking prerequisite: ${gap.blockingPrerequisite}`, '')
  }

  return lines.join('\n')
}

/**
 * Renders the whole committed file, front matter included, so the AC-29.2.2.3
 * suite can assert byte equality against what is on disk rather than
 * spot-checking a few numbers out of prose that could disagree with the rest.
 * `unmeasured` carries the in-scope candidates that have no measurement, so
 * every candidate is named either way.
 */
export function renderMeasurementReport(
  spreads: DeliveryPathSpread[],
  unmeasured: UnmeasuredCandidate[] = [],
): string {
  assertEveryCandidateAccountedFor(spreads, unmeasured)

  return [
    '<!--',
    '---',
    `file: ${MEASUREMENT_REPORT_RELATIVE_PATH}`,
    'project: earthandhoney',
    'purpose: AC-29.2.2.3 — the measured numbers for the candidate delivery paths',
    '         AC-29.2.1 bounded AC-29.2.2 to (1 and 2), each labelled with the',
    '         candidate it belongs to and stated with the spread between the',
    '         harness invocations AC-29.1.3 requires, since AC-29.3 reads',
    '         pass/fail against that spread as its noise floor. Generated, not',
    '         hand-written: `npm run benchmark:summarise` re-renders it from the',
    '         retained raw run reports beside it, and the AC-29.2.2.3 test suite',
    '         fails if this file and those reports ever disagree.',
    'created-by: dev-team',
    'related-story: US-29',
    'related-ac: 29.2.2.3',
    '---',
    '-->',
    '',
    '# Measured candidate delivery paths (AC-29.2.2.3)',
    '',
    'Both paths measure the **same** seeded gallery on the **same** two',
    'representative pages from the **same** production build; the only',
    'difference between a candidate-1 and a candidate-2 run is the `<img>` URL,',
    'swapped at request time by `src/lib/benchmark/deliveryPathImages.ts` from',
    "the `BENCHMARK_DELIVERY_PATH` env var. Each report's label is not trusted:",
    '`scripts/benchmark/run.ts` refuses to write a report whose observed image',
    'URLs contradict the declared path (`observedDeliveryPath.ts`).',
    '',
    'This file records numbers only. It states no target, no pass/fail, no',
    'ranking and no comparison between paths — AC-29.3 owns the ADR write-up',
    "and the per-target verdict. Candidates 3, 4 and 5 are out of this AC's",
    'bounded scope; AC-29.2 records whether each is measured or unmeasured with',
    'its blocking prerequisite.',
    '',
    coverageSection(spreads, unmeasured),
    ...spreads.map(pathSection),
    '## Reproducing these numbers',
    '',
    'With the `backstage` profile up and the AC-29.1.1 gallery seeded:',
    '',
    '```',
    '# candidate 1 — serving through the Backstage',
    'BENCHMARK_DELIVERY_PATH=backstage-proxy docker compose --profile benchmark up -d --build --force-recreate web-benchmark',
    'BENCHMARK_DELIVERY_PATH=backstage-proxy docker compose --profile benchmark run --rm lighthouse-benchmark',
    '',
    '# candidate 2 — direct time-limited presigned R2 links',
    'scripts/benchmark/presign-r2-urls.sh',
    'BENCHMARK_DELIVERY_PATH=presigned-r2 docker compose --profile benchmark up -d --build --force-recreate web-benchmark',
    'BENCHMARK_DELIVERY_PATH=presigned-r2 docker compose --profile benchmark run --rm lighthouse-benchmark',
    '',
    '# then re-render this file from whatever raw reports now exist',
    'npm run benchmark:summarise',
    '```',
    '',
  ].join('\n')
}
