/**
 * ---
 * file: src/__tests__/us29-ac29.4-decision-record-in-adr.test.ts
 * project: earthandhoney
 * purpose: Verify AC-29.4 — R2_STORAGE_AND_DELIVERY_ADR.md's new
 *          "Delivery-path decision (AC-29.4)" section names the outcome the
 *          AC-29.3 measurements actually produce (no candidate chosen, both
 *          measured candidates rejected), states for each rejected candidate
 *          which of the four targets it missed and by how much — re-derived
 *          from the same retained raw run-*.json reports the AC-29.2.2.3 and
 *          AC-29.3 suites already read, so the miss figures cannot drift from
 *          the underlying evidence — accounts for candidates 3, 4 and 5
 *          without either rejecting or choosing them, and ends with an
 *          explicit, still-pending Product Owner sign-off line that names
 *          `scrum-master/po-requests.md` as where sign-off is raised.
 *          Also re-asserts this section sits after the AC-19.4 audit section,
 *          so it falls outside the span the AC-29.3 suite's own
 *          "introduces no chosen path language" check scans — the two
 *          suites must not contradict each other.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.4
 * ---
 */
import fs from 'fs'
import path from 'path'

import { summariseDeliveryPath } from '@/lib/benchmark/invocationSpread'
import { loadRunReports, MEASURED_DELIVERY_PATHS, RESULTS_RELATIVE_PATH } from '@/lib/benchmark/loadRunReports'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const ADR_PATH = 'R2_STORAGE_AND_DELIVERY_ADR.md'
const adr = read(ADR_PATH)

const AUDIT_HEADING = '## AC-19.4'
const DECISION_HEADING = '## Delivery-path decision (AC-29.4)'

const resultsDir = path.join(root, RESULTS_RELATIVE_PATH)
const spreadsByPath = Object.fromEntries(
  MEASURED_DELIVERY_PATHS.map((deliveryPath) => [deliveryPath, summariseDeliveryPath(loadRunReports(resultsDir, deliveryPath))]),
) as Record<(typeof MEASURED_DELIVERY_PATHS)[number], ReturnType<typeof summariseDeliveryPath>>

function extractSection(text: string, startHeading: string, endHeading?: string): string {
  const start = text.indexOf(startHeading)
  if (start === -1) throw new Error(`heading not found: ${startHeading}`)
  const end = endHeading ? text.indexOf(endHeading, start + 1) : text.length
  if (endHeading && end === -1) throw new Error(`heading not found: ${endHeading}`)
  return text.slice(start, end === -1 ? text.length : end)
}

const decisionSection = extractSection(adr, DECISION_HEADING)

describe('AC-29.4: the ADR carries a dedicated decision-record section', () => {
  it('the section exists, placed after the AC-19.4 audit section', () => {
    expect(adr).toContain(DECISION_HEADING)
    expect(adr.indexOf(AUDIT_HEADING)).toBeLessThan(adr.indexOf(DECISION_HEADING))
  })

  it('carries the updated structured metadata header naming AC-29.4', () => {
    expect(adr).toMatch(/related-ac:\s*29\.4/)
  })

  it('falls outside the span the AC-29.3 suite scans for "chosen path" language, so the two suites cannot contradict', () => {
    const ac293ScannedSpan = adr.slice(adr.indexOf('## Delivery path decision'), adr.indexOf(AUDIT_HEADING))
    expect(ac293ScannedSpan).not.toContain(DECISION_HEADING)
  })
})

describe('AC-29.4: the outcome is named — no path chosen, given neither measured candidate clears all four targets', () => {
  it('states the decision stays open / no path is chosen', () => {
    expect(decisionSection).toMatch(/no path is chosen/i)
    expect(decisionSection).toMatch(/decision stays open/i)
  })

  it('does not declare candidate 1 or candidate 2 the chosen/selected path', () => {
    expect(decisionSection).not.toMatch(/\bchosen path is (candidate )?1\b/i)
    expect(decisionSection).not.toMatch(/\bchosen path is (candidate )?2\b/i)
    expect(decisionSection).not.toMatch(/we (will|should) use (backstage-proxy|presigned-r2)/i)
  })
})

describe('AC-29.4: every rejected path names which target it missed and by how much, re-derived from the raw reports', () => {
  const TARGETS = {
    mobilePerformanceScore: { threshold: 0.9, passes: (m: number) => m >= 0.9 },
    lcpMs: { threshold: 2500, passes: (m: number) => m <= 2500 },
  }

  for (const deliveryPath of MEASURED_DELIVERY_PATHS) {
    describe(`candidate path "${deliveryPath}" is recorded as rejected`, () => {
      const spread = spreadsByPath[deliveryPath]
      const candidateNumber = deliveryPath === 'backstage-proxy' ? '1' : '2'
      const candidateSection = extractSection(
        adr,
        `### Rejected — Candidate ${candidateNumber},`,
        candidateNumber === '1' ? '### Rejected — Candidate 2,' : '### Not rejected, not chosen',
      )

      it('is labelled "Rejected" in the decision section', () => {
        expect(decisionSection).toContain(`### Rejected — Candidate ${candidateNumber},`)
      })

      for (const page of spread.pages) {
        for (const metricKey of Object.keys(TARGETS) as (keyof typeof TARGETS)[]) {
          const metric = page.metrics.find((m) => m.metric === metricKey)!
          const target = TARGETS[metricKey]
          const allPass = metric.invocationMedians.every(target.passes)

          it(`states the correct pass/fail for ${metricKey} on "${page.pageId}"`, () => {
            if (allPass) {
              expect(candidateSection).toMatch(new RegExp(`PASSES on\\s+\`${page.pageId}\``))
            } else {
              expect(candidateSection).toMatch(new RegExp(`FAILS on (both pages|\\s*\`${page.pageId}\`)`))
            }
          })

          if (!allPass) {
            it(`states a nonzero miss magnitude for the failing ${metricKey} on "${page.pageId}"`, () => {
              const misses = metric.invocationMedians.map((m) => Math.abs(m - target.threshold))
              expect(misses.every((miss) => miss > 0)).toBe(true)
              // The section must contain at least one numeral for this metric's own medians, proving a
              // concrete number (not just a verdict word) is present for the failing measurement.
              for (const median of metric.invocationMedians) {
                const rendered = metricKey === 'lcpMs' ? `${Math.round(median)}ms` : median.toFixed(2)
                expect(candidateSection).toContain(rendered)
              }
            })
          }
        }
      }

      it('also credits the two targets both candidates pass (CLS and no oversized originals)', () => {
        expect(candidateSection).toMatch(/CLS 0\.0000 \/ 0\.0000/)
        expect(candidateSection).toMatch(/0 images flagged oversized/)
      })
    })
  }

  it('both rejected candidates miss the same two targets — performance on portfolio-gallery, and LCP on both pages', () => {
    for (const deliveryPath of MEASURED_DELIVERY_PATHS) {
      const spread = spreadsByPath[deliveryPath]
      const portfolio = spread.pages.find((p) => p.pageId === 'portfolio-gallery')!
      const story = spread.pages.find((p) => p.pageId === 'story-gallery')!

      const perf = portfolio.metrics.find((m) => m.metric === 'mobilePerformanceScore')!
      expect(perf.invocationMedians.every((m) => m >= 0.9)).toBe(false)

      for (const page of [portfolio, story]) {
        const lcp = page.metrics.find((m) => m.metric === 'lcpMs')!
        expect(lcp.invocationMedians.every((m) => m <= 2500)).toBe(false)
      }
    }
  })
})

describe('AC-29.4: candidates 3, 4 and 5 are accounted for without being rejected or chosen', () => {
  it('names all three as neither rejected nor chosen, deferring to the AC-29.2.3 disposition', () => {
    expect(decisionSection).toContain('### Not rejected, not chosen — Candidates 3, 4 and 5')
    expect(decisionSection).toMatch(/unmeasured/i)
    expect(decisionSection).toMatch(/AC-29\.2\.3/)
  })

  it('does not reject candidates 3, 4 or 5 against any of the four targets', () => {
    const candidates345Section = extractSection(adr, '### Not rejected, not chosen — Candidates 3, 4 and 5', '### Why the decision stays open')
    expect(candidates345Section).not.toMatch(/\bFAILS\b/)
  })
})

describe('AC-29.4: the record ends with an explicit, unresolved Product Owner sign-off line', () => {
  it('contains a "Product Owner sign-off" heading', () => {
    expect(decisionSection).toContain('### Product Owner sign-off')
  })

  it('states the sign-off is still pending, not silently assumed', () => {
    const signOffSection = extractSection(adr, '### Product Owner sign-off')
    expect(signOffSection).toMatch(/PENDING/)
  })

  it('names PRD §5, Reminder 1 as why this decision cannot be made by an agent alone', () => {
    expect(decisionSection).toMatch(/PRD §5, Reminder 1|no agent may make alone/i)
  })

  it('names scrum-master/po-requests.md as where sign-off is raised', () => {
    expect(decisionSection).toContain('scrum-master/po-requests.md')
  })

  it('the sign-off heading is the last section of the document', () => {
    const afterHeading = adr.slice(adr.indexOf('### Product Owner sign-off'))
    // No further "### " or "## " heading should follow the sign-off section.
    const nextHeading = afterHeading.slice('### Product Owner sign-off'.length).match(/^\s*#{2,3} /m)
    expect(nextHeading).toBeNull()
  })
})
