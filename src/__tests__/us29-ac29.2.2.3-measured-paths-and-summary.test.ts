/**
 * ---
 * file: src/__tests__/us29-ac29.2.2.3-measured-paths-and-summary.test.ts
 * project: earthandhoney
 * purpose: Verify AC-29.2.2.3 — the committed, candidate-labelled raw run
 *          reports under scripts/benchmark/results/ and the generated
 *          summary beside them (MEASURED_PATHS.md). Three things this AC's
 *          evidence requirement names explicitly: (1) every committed
 *          report's file-name label matches its own `deliveryPath` field,
 *          (2) every number in the committed summary is re-derivable from
 *          the retained reports — re-rendering the summary from what's on
 *          disk right now must equal what's committed, byte for byte, so
 *          the two can never quietly drift apart — and (3) the summary
 *          introduces no target, pass/fail or ranking vocabulary, since
 *          AC-29.3 (not this AC) owns the ADR write-up and the per-target
 *          verdict. Plus the criterion's negative requirements, which are
 *          about what the generator refuses to do: never summarise a single
 *          invocation as if it were a measurement, never mix two candidates'
 *          reports, and never emit a file that leaves an in-scope candidate
 *          out — an unmeasured path is named with its blocking prerequisite
 *          instead of being estimated or dropped.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.2.2.3
 * ---
 */
import fs from 'fs'
import os from 'os'
import path from 'path'

import {
  assertSummarisable,
  pageIds,
  summariseDeliveryPath,
  SPREAD_METRICS,
  type DeliveryPathSpread,
  type NamedRunReport,
} from '@/lib/benchmark/invocationSpread'
import { loadRunReports, MEASURED_DELIVERY_PATHS, RESULTS_RELATIVE_PATH } from '@/lib/benchmark/loadRunReports'
import {
  assertEveryCandidateAccountedFor,
  blockingPrerequisiteFor,
  formatMetric,
  IN_SCOPE_DELIVERY_PATHS,
  MEASUREMENT_REPORT_RELATIVE_PATH,
  renderMeasurementReport,
} from '@/lib/benchmark/measurementReport'

const root = process.cwd()
const resultsDir = path.join(root, RESULTS_RELATIVE_PATH)

const runFiles = fs
  .readdirSync(resultsDir)
  .filter((name) => /^run-.*\.json$/.test(name))
  .sort()

describe('AC-29.2.2.3: every committed report is labelled, both in its file name and inside itself', () => {
  it('at least one report is committed for each of the two candidate paths this AC measures', () => {
    for (const deliveryPath of MEASURED_DELIVERY_PATHS) {
      const forPath = runFiles.filter((name) => name.endsWith(`-${deliveryPath}.json`))
      expect(forPath.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('every run-*.json file name ends in a recognised candidate suffix', () => {
    expect(runFiles.length).toBeGreaterThan(0)
    for (const name of runFiles) {
      expect(name).toMatch(/^run-.*-(backstage-proxy|presigned-r2)\.json$/)
    }
  })

  it("every report's file-name suffix matches its own `deliveryPath` field — the exact mismatch run.ts refuses to write", () => {
    for (const name of runFiles) {
      const report = JSON.parse(fs.readFileSync(path.join(resultsDir, name), 'utf8'))
      expect(name.endsWith(`-${report.deliveryPath}.json`)).toBe(true)
    }
  })

  it('loadRunReports throws if a file were renamed to disagree with its own deliveryPath field', () => {
    // Staged in a scratch directory, never in the committed results directory:
    // a suite that writes a fixture next to the evidence can leave a stray
    // run-*.json behind on a hard failure and corrupt the very set of files
    // the rest of this suite reads.
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'us29-ac29223-'))
    const [{ report }] = loadRunReports(resultsDir, 'presigned-r2')
    fs.writeFileSync(path.join(scratch, 'run-2026-01-01T00-00-00-000Z-backstage-proxy.json'), JSON.stringify(report))

    try {
      expect(() => loadRunReports(scratch, 'backstage-proxy')).toThrow(
        /is named for "backstage-proxy" but is labeled "presigned-r2"/,
      )
    } finally {
      fs.rmSync(scratch, { recursive: true, force: true })
    }
  })

  it('redacts every SigV4 credential/signature on the presigned-r2 reports before they reach disk', () => {
    for (const name of runFiles.filter((n) => n.endsWith('-presigned-r2.json'))) {
      const raw = fs.readFileSync(path.join(resultsDir, name), 'utf8')
      expect(raw).not.toMatch(/X-Amz-Credential=(?!REDACTED)[^"&]+/)
      expect(raw).not.toMatch(/X-Amz-Signature=(?!REDACTED)[^"&]+/)
    }
  })
})

describe('AC-29.2.2.3: two invocations per measured page — a single run is not a measurement (AC-29.1.3)', () => {
  for (const deliveryPath of MEASURED_DELIVERY_PATHS) {
    it(`"${deliveryPath}" has at least 2 committed invocations, each covering both AC-29.1.1 pages`, () => {
      const reports = loadRunReports(resultsDir, deliveryPath)
      expect(reports.length).toBeGreaterThanOrEqual(2)

      for (const { report } of reports) {
        const pageIds = report.pages.map((p: { id: string }) => p.id).sort()
        expect(pageIds).toEqual(['portfolio-gallery', 'story-gallery'])
        expect(report.runsPerPage).toBeGreaterThanOrEqual(3)
      }
    })
  }
})

describe('AC-29.2.2.3: MEASURED_PATHS.md is generated, and every number in it is re-derivable from the retained reports', () => {
  const summaryPath = path.join(root, MEASUREMENT_REPORT_RELATIVE_PATH)
  const committedSummary = fs.readFileSync(summaryPath, 'utf8')

  it('is committed at the path measurementReport.ts declares', () => {
    expect(fs.existsSync(summaryPath)).toBe(true)
  })

  it('re-rendering the summary from the retained raw reports right now equals what is committed, byte for byte', () => {
    // This is the guarantee the AC's evidence requirement names: "the suite
    // fails if summary and reports disagree." A hand-edit to either side, or
    // a stale summary left over from an earlier set of runs, fails here.
    const spreads: DeliveryPathSpread[] = []
    const unmeasured = []

    for (const deliveryPath of MEASURED_DELIVERY_PATHS) {
      const reports = loadRunReports(resultsDir, deliveryPath)
      if (reports.length >= 2) spreads.push(summariseDeliveryPath(reports))
      else
        unmeasured.push({
          deliveryPath,
          invocationsCommitted: reports.length,
          blockingPrerequisite: blockingPrerequisiteFor(deliveryPath, reports.length),
        })
    }

    const rendered = renderMeasurementReport(spreads, unmeasured)
    expect(committedSummary).toBe(rendered)
  })

  it('states every in-scope candidate by name in its coverage table — none silently dropped', () => {
    for (const deliveryPath of IN_SCOPE_DELIVERY_PATHS) {
      expect(committedSummary).toMatch(new RegExp(`^\\| \\d+ — .* \\| \`${deliveryPath}\` \\| (measured|unmeasured) \\| \\d+ \\|$`, 'm'))
    }
  })

  it('states each per-page block with the four ADR measurements: three metric rows plus the network payload audit', () => {
    for (const deliveryPath of MEASURED_DELIVERY_PATHS) {
      const spread = summariseDeliveryPath(loadRunReports(resultsDir, deliveryPath))
      expect(spread.pages.map((page) => page.pageId).sort()).toEqual(['portfolio-gallery', 'story-gallery'])

      for (const page of spread.pages) {
        expect(page.metrics.map((metric) => metric.metric)).toEqual([...SPREAD_METRICS])
        // Each metric states one median per invocation and the spread between them.
        for (const metric of page.metrics) {
          expect(metric.invocationMedians).toHaveLength(page.invocationCount)
          expect(metric.spread).toBeCloseTo(metric.max - metric.min, 10)
          expect(committedSummary).toContain(formatMetric(metric.metric, metric.spread))
        }
        // The fourth ADR measurement: the network payload / requested-resolution audit.
        expect(page.networkPayload.galleryImageCount).toBeGreaterThan(0)
        expect(committedSummary).toContain(
          `Network payload audit: ${page.networkPayload.galleryImageCount} gallery image requests per pass, ` +
            `transferred ${page.networkPayload.transferBytes.map((b) => `${b} bytes`).join(', ')};`,
        )
      }
    }

    // One audit line per path per page — nothing states a payload it did not measure.
    expect(committedSummary.match(/Network payload audit:/g)).toHaveLength(MEASURED_DELIVERY_PATHS.length * 2)
  })

  it('cites every committed run-*.json file by name, and cites no file that is not actually committed', () => {
    const citedFileNames = [...committedSummary.matchAll(/`(run-[^`]+\.json)`/g)].map((m) => m[1])
    expect(new Set(citedFileNames)).toEqual(new Set(runFiles))
  })

  it('labels each section with a candidate path the file names underneath it actually carry', () => {
    for (const deliveryPath of MEASURED_DELIVERY_PATHS) {
      const heading = committedSummary.match(new RegExp(`^## .*\\(\`${deliveryPath}\`\\)$`, 'm'))
      expect(heading).not.toBeNull()

      const headingIndex = committedSummary.indexOf(heading![0])
      const nextHeadingIndex = committedSummary.indexOf('\n## ', headingIndex + 1)
      const section = committedSummary.slice(headingIndex, nextHeadingIndex === -1 ? undefined : nextHeadingIndex)

      const filesInSection = [...section.matchAll(/`(run-[^`]+\.json)`/g)].map((m) => m[1])
      expect(filesInSection.length).toBeGreaterThan(0)
      for (const fileName of filesInSection) {
        expect(fileName.endsWith(`-${deliveryPath}.json`)).toBe(true)
      }
    }
  })
})

describe('AC-29.2.2.3: the summary produces numbers only — no target, pass/fail or ranking vocabulary', () => {
  const summaryPath = path.join(root, MEASUREMENT_REPORT_RELATIVE_PATH)
  const committedSummary = fs.readFileSync(summaryPath, 'utf8')
  // Stripped of (a) the front-matter comment block and (b) the file's own
  // one scope-boundary paragraph, which legitimately *disclaims* target/
  // pass-fail/ranking vocabulary by naming it ("states no target, no
  // pass/fail, no ranking") and says AC-29.3 owns it — that sentence is the
  // boundary statement this AC's own text requires, not applied vocabulary
  // about a measurement. Everything checked below is the actual numbers
  // output: the per-path/per-page sections and the reproduction commands.
  const body = committedSummary
    .replace(/^<!--[\s\S]*?-->\n/, '')
    .replace(/This file records numbers only\.[\s\S]*?its blocking prerequisite\.\n\n/, '')

  it.each([
    /\btarget\b/i,
    // Not a bare /pass/ — "Lighthouse passes" and "per pass" are the
    // methodology's own vocabulary for a single measurement run, used
    // throughout this AC's own modules and REPRODUCIBILITY.md, and neither
    // states a verdict. "pass/fail" the phrase, and an upper-case PASS/FAIL
    // verdict marker, are what this criterion actually forbids.
    /pass\s*\/\s*fail/i,
    /\bPASS\b/,
    /\bFAIL(ED|URE)?\b/,
    /\brank(ing|ed)?\b/i,
    /\bbetter\b/i,
    /\bworse\b/i,
    /\bwinner\b/i,
    /\brecommend/i,
  ])('does not use forbidden vocabulary %s — that belongs to AC-29.3 or AC-29.4', (forbidden) => {
    expect(body).not.toMatch(forbidden)
  })

  it('states the reproduction commands without restating the ADR targets or a chosen path', () => {
    expect(body).toContain('BENCHMARK_DELIVERY_PATH=backstage-proxy')
    expect(body).toContain('BENCHMARK_DELIVERY_PATH=presigned-r2')
    expect(body).not.toMatch(/near ninety|2\.5 ?s(ec)?|two and a half seconds/i)
  })
})

describe('AC-29.2.2.3: summarise-measurements.ts is the only generator — the CLI script itself', () => {
  it('scripts/benchmark/summarise-measurements.ts calls the same three modules this suite calls directly', () => {
    const src = fs.readFileSync(path.join(root, 'scripts/benchmark/summarise-measurements.ts'), 'utf8')

    expect(src).toContain("from '../../src/lib/benchmark/invocationSpread'")
    expect(src).toContain("from '../../src/lib/benchmark/loadRunReports'")
    expect(src).toContain("from '../../src/lib/benchmark/measurementReport'")
    expect(src).toContain('summariseDeliveryPath')
    expect(src).toContain('renderMeasurementReport')
  })

  it('is wired as an npm script so `npm run benchmark:summarise` (cited in the generated file) actually exists', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
    expect(pkg.scripts['benchmark:summarise']).toContain('scripts/benchmark/summarise-measurements.ts')
  })
})

describe('AC-29.2.2.3: what the generator refuses — a path is never estimated, extrapolated or silently dropped', () => {
  const clone = (report: NamedRunReport): NamedRunReport => JSON.parse(JSON.stringify(report))
  const proxyReports = () => loadRunReports(resultsDir, 'backstage-proxy')

  it('refuses to state a spread from a single invocation — one run is a sample, not a measurement (AC-29.1.3)', () => {
    expect(() => assertSummarisable([proxyReports()[0]])).toThrow(/at least 2 harness invocations/)
    expect(() => assertSummarisable([])).toThrow(/at least 2 harness invocations/)
  })

  it("refuses to summarise two candidates' reports as one path — the exact mislabel this AC exists to prevent", () => {
    const mixed = [proxyReports()[0], loadRunReports(resultsDir, 'presigned-r2')[0]]
    expect(() => assertSummarisable(mixed)).toThrow(/more than one delivery path/)
  })

  it('refuses when a page is missing from one invocation, rather than extrapolating it from the other', () => {
    const [first, second] = proxyReports()
    const truncated = clone(second)
    truncated.report.pages = truncated.report.pages.filter((page) => page.id !== 'story-gallery')

    expect(pageIds([first, truncated])).toEqual(['portfolio-gallery', 'story-gallery'])
    expect(() => assertSummarisable([first, truncated])).toThrow(
      new RegExp(`Page "story-gallery" is missing from ${truncated.fileName}`),
    )
  })

  it('refuses to render a report that leaves an in-scope candidate unaccounted for, or counts one twice', () => {
    const spread = summariseDeliveryPath(proxyReports())

    expect(() => renderMeasurementReport([spread])).toThrow(/"presigned-r2" is accounted for 0 time\(s\)/)
    expect(() => renderMeasurementReport([spread, spread])).toThrow(/"backstage-proxy" is accounted for 2 time\(s\)/)
    expect(() =>
      assertEveryCandidateAccountedFor(
        [spread],
        [{ deliveryPath: 'presigned-r2', invocationsCommitted: 0, blockingPrerequisite: 'x' }],
      ),
    ).not.toThrow()
  })

  it('renders an unmeasured candidate by name with its blocking prerequisite, and no number for it', () => {
    const spread = summariseDeliveryPath(proxyReports())
    const rendered = renderMeasurementReport([spread], [
      {
        deliveryPath: 'presigned-r2',
        invocationsCommitted: 1,
        blockingPrerequisite: blockingPrerequisiteFor('presigned-r2', 1),
      },
    ])

    expect(rendered).toMatch(/\| `presigned-r2` \| unmeasured \| 1 \|/)
    expect(rendered).toContain('`presigned-r2` is unmeasured. Blocking prerequisite: 1 more harness invocation(s)')
    expect(rendered).toContain('scripts/benchmark/presign-r2-urls.sh')
    // No measurement section is invented for it.
    expect(rendered).not.toContain('## Candidate 2 — Direct time-limited links (`presigned-r2`)')
  })

  it('names the concrete next command per candidate, sized to how far short that candidate actually is', () => {
    expect(blockingPrerequisiteFor('backstage-proxy', 0)).toContain('2 more harness invocation(s)')
    expect(blockingPrerequisiteFor('backstage-proxy', 0)).toContain(
      'BENCHMARK_DELIVERY_PATH=backstage-proxy docker compose --profile benchmark run --rm lighthouse-benchmark',
    )
    // Candidate 2 cannot be re-run without refreshing its short-TTL signed URLs first.
    expect(blockingPrerequisiteFor('backstage-proxy', 0)).not.toContain('presign-r2-urls.sh')
    expect(blockingPrerequisiteFor('presigned-r2', 1)).toContain('presign-r2-urls.sh')
  })

  it('formats each metric one fixed way, so re-rendering the same reports is byte-identical', () => {
    expect(formatMetric('lcpMs', 3585.4)).toBe('3585ms')
    expect(formatMetric('clsImageAttributable', 0)).toBe('0.0000')
    expect(formatMetric('mobilePerformanceScore', 0.8712)).toBe('0.87')
  })

  it('surfaces a gallery image count that differs between passes as -1 rather than averaging it away', () => {
    const reports = proxyReports().map(clone)
    const page = reports[0].report.pages[0]
    page.harness.rawRuns[0].networkPayload.images = page.harness.rawRuns[0].networkPayload.images.slice(0, 1)

    const summarised = summariseDeliveryPath(reports)
    expect(summarised.pages[0].networkPayload.galleryImageCount).toBe(-1)
  })
})
