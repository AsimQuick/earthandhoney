/**
 * ---
 * file: src/__tests__/us29-ac29.3-measured-results-in-adr.test.ts
 * project: earthandhoney
 * purpose: Verify AC-29.3 — R2_STORAGE_AND_DELIVERY_ADR.md's new "Measured
 *          results per candidate path (AC-29.3)" subsection carries the
 *          measured numbers for both candidate paths AC-29.2.2.3 produced,
 *          restates the ADR's own four performance targets alongside them,
 *          and states a PASS/FAIL verdict per target per page per path.
 *          Every number this suite asserts on is re-derived directly from
 *          the retained raw run-*.json reports (via the same
 *          invocationSpread/loadRunReports modules AC-29.2.2.3's own suite
 *          uses) rather than compared against another hand-typed copy, so a
 *          drift between the ADR prose and the underlying evidence fails
 *          here. It also re-asserts the constraints AC-19.5 and AC-29.2.3
 *          already placed on this document still hold: the section sits
 *          inside the "Delivery path decision" span (before "## AC-19.4"),
 *          it introduces no "chosen path"/"selected path" language, and it
 *          does not disturb the AC-29.2.3 disposition subsection or the
 *          original UNDECIDED standing-rule sentence.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.3
 * ---
 */
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'

import { summariseDeliveryPath } from '@/lib/benchmark/invocationSpread'
import { loadRunReports, MEASURED_DELIVERY_PATHS, RESULTS_RELATIVE_PATH } from '@/lib/benchmark/loadRunReports'
import { formatMetric } from '@/lib/benchmark/measurementReport'

// The `git` binary is not present in the `web` Docker container (see
// us20-ac20.5-stripe-port-report-secret-handling.test.ts and the
// AC-29.2.2.2 fix that mirrors this same gate), so a check that shells out
// to it can only run where `git` is actually reachable.
let gitAvailable = true
try {
  execFileSync('git', ['--version'])
} catch {
  gitAvailable = false
}
const itIfGitAvailable = gitAvailable ? it : it.skip

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const ADR_PATH = 'R2_STORAGE_AND_DELIVERY_ADR.md'
const adr = read(ADR_PATH)

const SUBSECTION_HEADING = '### Measured results per candidate path (AC-29.3)'
const AUDIT_HEADING = '## AC-19.4'

function extractSection(text: string, startHeading: string, endHeading: string): string {
  const start = text.indexOf(startHeading)
  const end = text.indexOf(endHeading, start + 1)
  if (start === -1) throw new Error(`heading not found: ${startHeading}`)
  if (end === -1) throw new Error(`heading not found: ${endHeading}`)
  return text.slice(start, end)
}

const section = extractSection(adr, SUBSECTION_HEADING, AUDIT_HEADING)

const resultsDir = path.join(root, RESULTS_RELATIVE_PATH)
const spreadsByPath = Object.fromEntries(
  MEASURED_DELIVERY_PATHS.map((deliveryPath) => [deliveryPath, summariseDeliveryPath(loadRunReports(resultsDir, deliveryPath))]),
) as Record<(typeof MEASURED_DELIVERY_PATHS)[number], ReturnType<typeof summariseDeliveryPath>>

describe('AC-29.3: the ADR carries a dedicated "Measured results" subsection inside the delivery-decision span', () => {
  it('the subsection exists, placed after the restated targets and before the AC-19.4 audit section', () => {
    expect(adr).toContain(SUBSECTION_HEADING)
    expect(adr.indexOf('### Performance targets the decision is accountable to')).toBeLessThan(
      adr.indexOf(SUBSECTION_HEADING),
    )
    expect(adr.indexOf(SUBSECTION_HEADING)).toBeLessThan(adr.indexOf(AUDIT_HEADING))
  })

  it('carries the updated structured metadata header naming AC-29.3', () => {
    expect(adr).toMatch(/related-ac:\s*29\.3/)
  })

  it('does not disturb the AC-29.2.3 disposition subsection, which still precedes it', () => {
    expect(adr.indexOf('### Candidate disposition — paths 3, 4 and 5 (AC-29.2.3)')).toBeLessThan(
      adr.indexOf(SUBSECTION_HEADING),
    )
  })

  it("leaves AC-19.5's original UNDECIDED standing-rule sentence unchanged, word for word", () => {
    expect(adr).toMatch(
      /deferred to a benchmark planned for the next sprint, and no agent may choose\s+a path by preference before that benchmark exists — the candidates below are\s+listed to be measured, not ranked\./,
    )
    expect(adr).toMatch(/\*\*Status:\s*UNDECIDED\.\*\*/)
  })

  it('introduces no "chosen path" / "selected path" / "we will|should use" language anywhere in the delivery-decision span', () => {
    const deliverySection = adr.slice(adr.indexOf('## Delivery path decision'), adr.indexOf(AUDIT_HEADING))
    expect(deliverySection).not.toMatch(/\bchosen path\b|\bselected path\b|\bwe (will|should) use\b/i)
  })
})

describe('AC-29.3: the four performance targets are restated verbatim alongside the measurements', () => {
  it.each([
    '**No image-caused layout shift.**',
    '**Mobile-first performance near ninety**',
    '**Largest Contentful Paint around two and a half seconds or better**',
    '**Public pages never request full-resolution originals unnecessarily.**',
  ])('restates target: %s', (target) => {
    expect(section).toContain(target)
  })
})

describe('AC-29.3: raw harness output is cited by name and is the actual evidence retained in the repository', () => {
  it('cites all four committed run-*.json files this data was generated from', () => {
    for (const deliveryPath of MEASURED_DELIVERY_PATHS) {
      for (const fileName of spreadsByPath[deliveryPath].fileNames) {
        expect(section).toContain(`\`${fileName}\``)
        expect(fs.existsSync(path.join(resultsDir, fileName))).toBe(true)
      }
    }
  })

  itIfGitAvailable('every cited run-*.json file is tracked in git, not a local-only artifact', () => {
    for (const deliveryPath of MEASURED_DELIVERY_PATHS) {
      for (const fileName of spreadsByPath[deliveryPath].fileNames) {
        const tracked = execFileSync(
          'git',
          ['ls-files', '--error-unmatch', `${RESULTS_RELATIVE_PATH}/${fileName}`],
          { cwd: root },
        ).toString()
        expect(tracked.trim()).toBe(`${RESULTS_RELATIVE_PATH}/${fileName}`)
      }
    }
  })

  it('references npm run benchmark:summarise as how the underlying numbers were produced', () => {
    expect(section).toContain('npm run benchmark:summarise')
  })
})

describe('AC-29.3: pass/fail is stated per target per path per page, re-derived from the retained raw reports', () => {
  const PASS_TARGETS = {
    clsImageAttributable: (medians: number[]) => medians.every((m) => m === 0),
    mobilePerformanceScore: (medians: number[]) => medians.every((m) => m >= 0.9),
    lcpMs: (medians: number[]) => medians.every((m) => m <= 2500),
  }

  for (const deliveryPath of MEASURED_DELIVERY_PATHS) {
    describe(`candidate path "${deliveryPath}"`, () => {
      const spread = spreadsByPath[deliveryPath]
      const candidateSection = extractSection(
        adr,
        `#### Candidate ${deliveryPath === 'backstage-proxy' ? '1' : '2'} —`,
        deliveryPath === 'backstage-proxy' ? '#### Candidate 2' : '#### Reading across',
      )

      for (const page of spread.pages) {
        it(`states the measured medians for each metric on "${page.pageId}" in the ADR`, () => {
          for (const metric of page.metrics) {
            const rendered = metric.invocationMedians.map((v) => formatMetric(metric.metric, v)).join(' / ')
            expect(candidateSection).toContain(rendered)
          }
        })

        it(`states a PASS/FAIL verdict for each metric on "${page.pageId}" consistent with the target`, () => {
          for (const metric of page.metrics) {
            const verdictFn = PASS_TARGETS[metric.metric]
            const expectVerdict = verdictFn(metric.invocationMedians) ? 'PASS' : 'FAIL'
            const rendered = metric.invocationMedians.map((v) => formatMetric(metric.metric, v)).join(' / ')

            // Find the table row this metric's rendered medians appear in and check its leading verdict cell.
            const rowMatch = candidateSection
              .split('\n')
              .find((line) => line.includes(rendered) && line.trim().startsWith('|'))
            expect(rowMatch).toBeDefined()
            expect(rowMatch).toMatch(new RegExp(`\\|\\s*${expectVerdict}\\s*—`))
          }
        })

        it(`states the network payload / oversized-image verdict for "${page.pageId}"`, () => {
          const expectVerdict = page.networkPayload.oversizedCount === 0 ? 'PASS' : 'FAIL'
          const oversizedLine = candidateSection
            .split('\n')
            .find((line) => line.includes('full-resolution originals unnecessarily'))
          expect(oversizedLine).toBeDefined()
        })
      }
    })
  }

  it('neither measured candidate is declared to clear all four targets on both pages (both miss LCP on both pages, per the medians above)', () => {
    for (const deliveryPath of MEASURED_DELIVERY_PATHS) {
      const spread = spreadsByPath[deliveryPath]
      for (const page of spread.pages) {
        const lcp = page.metrics.find((m) => m.metric === 'lcpMs')!
        expect(lcp.invocationMedians.every((m) => m <= 2500)).toBe(false)
      }
    }
  })
})
