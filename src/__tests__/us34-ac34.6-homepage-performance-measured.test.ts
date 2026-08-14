/**
 * ---
 * file: src/__tests__/us34-ac34.6-homepage-performance-measured.test.ts
 * project: earthandhoney
 * purpose: Verify AC-34.6 — the homepage was measured against PRD 19.4's
 *          performance targets on a mobile profile and the numbers were
 *          reported as measured, a miss recorded rather than hidden or
 *          tuned away (the US-29 precedent this AC names explicitly). Every
 *          figure this suite asserts on is re-derived directly from the
 *          retained raw Lighthouse JSON report via the same pure
 *          `aggregateRuns` function `src/lib/benchmark/aggregateRuns.ts`
 *          already uses for the US-29 ADR measurements — never compared
 *          against a second hand-typed copy — so a drift between
 *          `AC-34.6-HOMEPAGE-PERFORMANCE.md`'s prose and the underlying
 *          evidence fails here. Also checks the document restates the PRD
 *          19.4 targets verbatim, states a PASS/FAIL verdict per target
 *          with the LCP gap, makes an explicit statement connecting the LCP
 *          miss to the still-open R2 delivery-path decision
 *          (`po-requests.md` item 15) without choosing a path (Reminder 1),
 *          and that the seeding script and raw report it cites both exist
 *          and (where git is reachable) are tracked in the repository, not
 *          local-only artifacts.
 * created-by: dev-team
 * related-story: US-34
 * related-ac: 34.6
 * ---
 */
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'

import { aggregateRuns } from '@/lib/benchmark/aggregateRuns'
import type { ExtractedMeasurements } from '@/lib/benchmark/types'

// `git` is not present in the `web` Docker container (see
// us20-ac20.5-stripe-port-report-secret-handling.test.ts and
// us29-ac29.3-measured-results-in-adr.test.ts's identical gate), so the
// tracked-file check can only run where `git` is actually reachable.
let gitAvailable = true
try {
  execFileSync('git', ['--version'])
} catch {
  gitAvailable = false
}
const itIfGitAvailable = gitAvailable ? it : it.skip

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const REPORT_PATH = 'scripts/benchmark/results/AC-34.6-HOMEPAGE-PERFORMANCE.md'
const RESULTS_DIR = 'scripts/benchmark/results'
const RAW_REPORT_FILE_NAME = 'ac34.2-hero-cls-2026-08-14T10-22-39-394Z.json'
const SEED_SCRIPT_PATH = 'scripts/ac34.6-homepage-hero-benchmark-seed.sh'

const report = read(REPORT_PATH)

interface RawReport {
  generatedAt: string
  baseUrl: string
  url: string
  harness: {
    runsPerPage: number
    rawRuns: ExtractedMeasurements[]
  }
}

const rawReportPath = path.join(root, RESULTS_DIR, RAW_REPORT_FILE_NAME)
const rawReport = JSON.parse(fs.readFileSync(rawReportPath, 'utf8')) as RawReport
const aggregate = aggregateRuns(rawReport.harness.rawRuns)

describe('AC-34.6: the raw Lighthouse evidence backs a real, production-build, real-imagery homepage measurement', () => {
  it('the cited raw report exists, ran 3+ passes, and was captured against "web-benchmark" (production build), never dev-mode "web"', () => {
    expect(fs.existsSync(rawReportPath)).toBe(true)
    expect(rawReport.harness.rawRuns.length).toBeGreaterThanOrEqual(3)
    expect(rawReport.baseUrl).toContain('web-benchmark')
    expect(rawReport.url).toMatch(/\/$/)
  })

  it('every raw pass actually loaded real Backstage gallery <img> requests, not the GalleryUnavailablePlaceholder fallback', () => {
    for (const run of rawReport.harness.rawRuns) {
      const galleryImages = run.networkPayload.images.filter((image) => image.url.includes('/api/gallery/'))
      expect(galleryImages.length).toBeGreaterThan(0)
    }
  })

  itIfGitAvailable('the raw report and the seeding script are tracked in git, not local-only artifacts', () => {
    for (const relPath of [`${RESULTS_DIR}/${RAW_REPORT_FILE_NAME}`, SEED_SCRIPT_PATH, REPORT_PATH]) {
      const tracked = execFileSync('git', ['ls-files', '--error-unmatch', relPath], { cwd: root }).toString()
      expect(tracked.trim()).toBe(relPath)
    }
  })

  it('the seeding script this measurement depends on exists', () => {
    expect(fs.existsSync(path.join(root, SEED_SCRIPT_PATH))).toBe(true)
  })
})

describe('AC-34.6: the PRD 19.4 targets are restated verbatim alongside the measured figures', () => {
  it.each([
    'No image-caused cumulative layout shift',
    'Mobile-first Lighthouse performance near or above 90',
    'LCP approximately 2.5 seconds or better, realistic mobile profile',
  ])('restates target: %s', (target) => {
    expect(report).toContain(target)
  })
})

describe('AC-34.6: measured figures in the report match the raw evidence, re-derived independently', () => {
  it('mobile performance score: median matches, and PASS is stated because the target is >= 0.90', () => {
    expect(aggregate.mobilePerformanceScore.median).toBeCloseTo(0.91, 2)
    expect(aggregate.mobilePerformanceScore.median).toBeGreaterThanOrEqual(0.9)
    expect(report).toContain('**0.91**')
    expect(report).toMatch(/Mobile-first Lighthouse performance[^|]*\|[^|]*\*\*0\.91\*\*[^|]*\|[^|]*\|[^|]*\*\*PASS\*\*/)
  })

  it('image-attributable CLS: median is exactly 0, and PASS is stated', () => {
    expect(aggregate.clsImageAttributable.median).toBe(0)
    expect(report).toMatch(/No image-caused[^|]*\|[^|]*\*\*0\.0000\*\*[^|]*\|[^|]*\|[^|]*\*\*PASS\*\*/)
  })

  it('LCP: median misses the ~2500ms target, and FAIL is stated with the correct gap', () => {
    expect(aggregate.lcpMs.median).toBeGreaterThan(2500)
    const roundedMedian = Math.round(aggregate.lcpMs.median)
    expect(roundedMedian).toBe(3410)
    expect(report).toContain(`**${roundedMedian}ms**`)
    expect(report).toMatch(/LCP approximately 2\.5 seconds[^|]*\|[^|]*\*\*3410ms\*\*[^|]*\|[^|]*\|[^|]*\*\*FAIL\*\*/)

    const gapMs = roundedMedian - 2500
    expect(gapMs).toBeGreaterThan(0)
    expect(report).toContain(`${gapMs}ms`)
  })

  it('every one of the raw LCP passes individually misses the target, not just the reported median', () => {
    for (const run of rawReport.harness.rawRuns) {
      expect(run.lcpMs).toBeGreaterThan(2500)
    }
  })
})

describe('AC-34.6: the open R2 delivery-path decision is named as a contributing factor, without choosing a path', () => {
  it('states the homepage hero is served via the backstage-proxy candidate the ADR already measured', () => {
    expect(report).toMatch(/backstage-proxy/)
    expect(report).toMatch(/R2_STORAGE_AND_DELIVERY_ADR\.md/)
  })

  it('explicitly answers whether the open delivery decision is a contributing factor', () => {
    expect(report).toMatch(/Is the open R2 delivery-path decision a contributing factor\?\s*Yes\./)
  })

  it('cites po-requests.md item 15 and the UNDECIDED status', () => {
    expect(report).toContain('po-requests.md` item 15')
    expect(report).toContain('UNDECIDED')
  })

  it('introduces no "chosen path" / "selected path" / "we will|should use" language', () => {
    expect(report).not.toMatch(/\bchosen path\b|\bselected path\b|\bwe (will|should) use\b/i)
    expect(report).toContain('This document does not choose a\ndelivery path')
  })
})
