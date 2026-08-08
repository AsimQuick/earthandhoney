/**
 * ---
 * file: src/__tests__/us29-ac29.1.2-benchmark-measurement-extraction.test.ts
 * project: earthandhoney
 * purpose: AC-29.1.2 — proves the pure-logic measurement layer against a
 *          checked-in, hand-authored Lighthouse-result fixture. No Chrome,
 *          no Docker-only dependency: `extractMeasurements`, `aggregateRuns`
 *          and `runHarness` are exercised as plain functions.
 *          - Each of the four ADR measurements is asserted against the
 *            fixture's known values (not just "is a number"), so a mapping
 *            mistake (wrong audit id, wrong field) fails loudly.
 *          - The image/non-image split for CLS is proven on a fixture that
 *            deliberately contains one of each, so the `<img>`-snippet
 *            heuristic is exercised both ways.
 *          - The network-payload join is proven with one oversized image,
 *            one correctly-sized image, and one image-resourceType request
 *            with no `image-size-responsive` match (an SVG, which that
 *            audit's own `isCandidate` filter excludes — see
 *            extractMeasurements.ts's header) to prove the unmatched case
 *            degrades to nulls rather than throwing.
 *          - `runHarness` is proven to refuse `runsPerPage` below
 *            `MIN_RUNS_PER_PAGE` and to retain every raw run beside the
 *            aggregate.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.1.2
 * ---
 */

import { aggregateRuns } from '@/lib/benchmark/aggregateRuns'
import { extractMeasurements } from '@/lib/benchmark/extractMeasurements'
import { MIN_RUNS_PER_PAGE, runHarness } from '@/lib/benchmark/runHarness'
import type { ExtractedMeasurements, MinimalLighthouseResult } from '@/lib/benchmark/types'

import fixtureJson from './__fixtures__/us29-ac29.1.2-lighthouse-result.fixture.json'

const fixture = fixtureJson as unknown as MinimalLighthouseResult

describe('extractMeasurements (AC-29.1.2)', () => {
  const measurements = extractMeasurements(fixture)

  it('reads mobile performance score verbatim from categories.performance.score', () => {
    expect(measurements.mobilePerformanceScore).toBe(0.82)
  })

  it('reads LCP verbatim from the largest-contentful-paint audit numericValue', () => {
    expect(measurements.lcpMs).toBe(2600)
  })

  it('retains the whole-page CLS total from the cumulative-layout-shift audit', () => {
    expect(measurements.cls.total).toBe(0.1)
  })

  it('sums only the layout-shifts items whose node is an <img> element', () => {
    // Fixture has one <img> shift (score 0.08) and one <div> shift (score
    // 0.02); only the image one should be counted.
    expect(measurements.cls.imageAttributable).toBeCloseTo(0.08, 10)
  })

  it('expresses the image-attributable share relative to the total, not the whole page implicitly', () => {
    expect(measurements.cls.imageAttributableShare).toBeCloseTo(0.8, 10)
  })

  it('reports 0 image-attributable share when total CLS is 0, without dividing by zero', () => {
    const zeroClsFixture: MinimalLighthouseResult = {
      ...fixture,
      audits: {
        ...fixture.audits,
        'cumulative-layout-shift': { numericValue: 0 },
      },
    }
    const result = extractMeasurements(zeroClsFixture)
    expect(result.cls.total).toBe(0)
    expect(result.cls.imageAttributableShare).toBe(0)
    expect(Number.isFinite(result.cls.imageAttributableShare)).toBe(true)
  })

  it('carries the throttle settings from configSettings rather than assuming Lighthouse defaults', () => {
    expect(measurements.formFactor).toBe('mobile')
    expect(measurements.throttlingMethod).toBe('simulate')
    // These values match Lighthouse's own default mobile "mobileSlow4G"
    // profile (Lantern Constants.js), proving the fixture actually used the
    // default mobile simulated throttle rather than a made-up one.
    expect(measurements.throttling).toEqual({
      rttMs: 150,
      throughputKbps: 1638.4,
      requestLatencyMs: 562.5,
      downloadThroughputKbps: 1474.56,
      uploadThroughputKbps: 675,
      cpuSlowdownMultiplier: 4,
    })
  })

  describe('network payload', () => {
    it('joins network-requests with image-size-responsive by url for images with a size match', () => {
      const hero = measurements.networkPayload.images.find((image) =>
        image.url.endsWith('hero-full.jpg'),
      )
      expect(hero).toEqual({
        url: 'https://cdn.example.com/galleries/portfolio/hero-full.jpg',
        transferBytes: 3200000,
        requestedPixels: 12000000,
        expectedPixels: 1080000,
        oversized: true,
      })
    })

    it('does not flag a correctly-sized image as oversized', () => {
      const thumb = measurements.networkPayload.images.find((image) =>
        image.url.endsWith('thumb-1.jpg'),
      )
      expect(thumb).toEqual({
        url: 'https://cdn.example.com/galleries/portfolio/thumb-1.jpg',
        transferBytes: 45000,
        requestedPixels: 120000,
        expectedPixels: 120000,
        oversized: false,
      })
    })

    it('degrades to null pixel data, not a throw, for an image request with no image-size-responsive match', () => {
      const svgLogo = measurements.networkPayload.images.find((image) =>
        image.url.endsWith('logo.svg'),
      )
      expect(svgLogo).toEqual({
        url: 'https://cdn.example.com/galleries/portfolio/logo.svg',
        transferBytes: 2100,
        requestedPixels: null,
        expectedPixels: null,
        oversized: false,
      })
    })

    it('excludes non-image network requests entirely', () => {
      const script = measurements.networkPayload.images.find((image) =>
        image.url.endsWith('main.js'),
      )
      expect(script).toBeUndefined()
      expect(measurements.networkPayload.images).toHaveLength(3)
    })

    it('counts exactly the oversized images', () => {
      expect(measurements.networkPayload.oversizedCount).toBe(1)
    })
  })
})

describe('aggregateRuns (AC-29.1.2)', () => {
  function runWith(overrides: Partial<{ score: number; cls: number; imgCls: number; lcp: number }>): ExtractedMeasurements {
    const base = extractMeasurements(fixture)
    return {
      ...base,
      mobilePerformanceScore: overrides.score ?? base.mobilePerformanceScore,
      lcpMs: overrides.lcp ?? base.lcpMs,
      cls: {
        ...base.cls,
        total: overrides.cls ?? base.cls.total,
        imageAttributable: overrides.imgCls ?? base.cls.imageAttributable,
      },
    }
  }

  it('computes median/min/max per metric across raw runs', () => {
    const runs = [
      runWith({ score: 0.7, cls: 0.05, imgCls: 0.03, lcp: 2000 }),
      runWith({ score: 0.9, cls: 0.15, imgCls: 0.1, lcp: 3000 }),
      runWith({ score: 0.8, cls: 0.1, imgCls: 0.08, lcp: 2500 }),
    ]

    const aggregate = aggregateRuns(runs)

    expect(aggregate.runCount).toBe(3)
    expect(aggregate.mobilePerformanceScore).toEqual({ median: 0.8, min: 0.7, max: 0.9 })
    expect(aggregate.clsTotal).toEqual({ median: 0.1, min: 0.05, max: 0.15 })
    expect(aggregate.clsImageAttributable).toEqual({ median: 0.08, min: 0.03, max: 0.1 })
    expect(aggregate.lcpMs).toEqual({ median: 2500, min: 2000, max: 3000 })
  })

  it('averages the two middle values for an even run count', () => {
    const runs = [
      runWith({ lcp: 2000 }),
      runWith({ lcp: 4000 }),
    ]
    const aggregate = aggregateRuns(runs)
    expect(aggregate.lcpMs).toEqual({ median: 3000, min: 2000, max: 4000 })
  })

  it('refuses an empty run list', () => {
    expect(() => aggregateRuns([])).toThrow('aggregateRuns requires at least one run')
  })
})

describe('runHarness (AC-29.1.2)', () => {
  it('refuses a runsPerPage below MIN_RUNS_PER_PAGE, naming why', async () => {
    await expect(
      runHarness({ runsPerPage: 1, collectRun: () => fixture }),
    ).rejects.toThrow('a single run is not a measurement')
  })

  it('exposes MIN_RUNS_PER_PAGE as the threshold it enforces', () => {
    expect(MIN_RUNS_PER_PAGE).toBeGreaterThanOrEqual(3)
  })

  it('collects exactly runsPerPage runs, retains every raw run, and aggregates them', async () => {
    const seenIndices: number[] = []
    const result = await runHarness({
      runsPerPage: MIN_RUNS_PER_PAGE,
      collectRun: (runIndex) => {
        seenIndices.push(runIndex)
        return fixture
      },
    })

    expect(seenIndices).toEqual(Array.from({ length: MIN_RUNS_PER_PAGE }, (_, i) => i))
    expect(result.runsPerPage).toBe(MIN_RUNS_PER_PAGE)
    expect(result.rawRuns).toHaveLength(MIN_RUNS_PER_PAGE)
    expect(result.rawRuns[0]).toEqual(extractMeasurements(fixture))
    expect(result.aggregate).toEqual(aggregateRuns(result.rawRuns))
  })

  it('supports an async collectRun', async () => {
    const result = await runHarness({
      runsPerPage: MIN_RUNS_PER_PAGE,
      collectRun: async () => fixture,
    })
    expect(result.rawRuns).toHaveLength(MIN_RUNS_PER_PAGE)
  })
})
