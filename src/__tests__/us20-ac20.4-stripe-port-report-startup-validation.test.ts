/**
 * ---
 * file: src/__tests__/us20-ac20.4-stripe-port-report-startup-validation.test.ts
 * project: earthandhoney
 * purpose: Verify AC-20.4 — STRIPE_PORT_REPORT.md specifies a start-up
 *          validation that refuses to start, or fails loudly with an
 *          actionable message, when the loaded Stripe values are not all
 *          from the same mode or when any required value is missing, and
 *          that the specification states what is checked, when it runs,
 *          and what the operator sees.
 * created-by: dev-team
 * related-story: US-20
 * related-ac: 20.4
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

describe('AC-20.4: Stripe port report — start-up validation specification', () => {
  let report: string

  beforeAll(() => {
    report = read('STRIPE_PORT_REPORT.md')
  })

  it('has a start-up validation specification section', () => {
    expect(report).toMatch(
      /##\s*8\.\s*Start-up validation specification \(AC-20\.4\)/i
    )
  })

  it('notes the reference project has no such check', () => {
    expect(report).toMatch(/reference project has no such check/i)
  })

  describe('what is checked', () => {
    it('specifies a presence check for every required Stripe variable', () => {
      expect(report).toMatch(/\*\*Presence\.\*\*/)
      expect(report).toMatch(/present and non-empty/i)
    })

    it('specifies a key-pair mode-agreement check by string prefix', () => {
      expect(report).toMatch(/\*\*Key-pair mode agreement\.\*\*/)
      expect(report).toMatch(/sk_test_/)
      expect(report).toMatch(/pk_test_/)
      expect(report).toMatch(/sk_live_/)
      expect(report).toMatch(/pk_live_/)
    })

    it('specifies a price-ID mode-agreement check via a Stripe API call, not string inspection', () => {
      expect(report).toMatch(/\*\*Price-ID mode agreement\.\*\*/)
      expect(report).toMatch(/carries no mode\s+marker in the string/i)
      expect(report).toMatch(/No such price/i)
    })
  })

  describe('when it runs', () => {
    it('states the check runs once at server start-up, before the first request', () => {
      expect(report).toMatch(/Once, synchronously, at server start-up/i)
      expect(report).toMatch(/before the\s*\n?process accepts its first request/i)
    })

    it('names the concrete Next.js mechanism: instrumentation.ts register()', () => {
      expect(report).toMatch(/instrumentation\.ts/)
      expect(report).toMatch(/register\(\)/)
    })

    it('states it runs on every server boot, not lazily on first checkout', () => {
      expect(report).toMatch(/not lazily on the first checkout\s+attempt/i)
    })
  })

  describe('what the operator sees', () => {
    it('describes the silent/success path', () => {
      expect(report).toMatch(/All three checks pass/i)
    })

    it('states failure throws synchronously and stops the process from starting', () => {
      expect(report).toMatch(/throws\s+an\s+`Error`\s+synchronously/i)
      expect(report).toMatch(/exits non-zero/i)
    })

    it('specifies an actionable message naming the exact missing variable', () => {
      expect(report).toMatch(/\*\*Presence failure\*\*/)
      expect(report).toMatch(/names every missing variable by its exact/i)
    })

    it('specifies an actionable message naming both variables and modes on a key-pair mismatch', () => {
      expect(report).toMatch(/\*\*Key-pair mismatch\*\*/)
      expect(report).toMatch(/is in live mode but/i)
    })

    it('specifies an actionable message naming the failing variable on a price-ID mismatch', () => {
      expect(report).toMatch(/\*\*Price-ID mismatch\*\*/)
      expect(report).toMatch(/rejected\s+by Stripe as not found/i)
    })

    it('states no secret value is ever printed in the failure message', () => {
      expect(report).toMatch(/never prints a secret value itself/i)
    })
  })

  it('has a Method section for AC-20.4 that confirms no new files were inspected', () => {
    expect(report).toMatch(/##\s*9\.\s*Method \(AC-20\.4\)/i)
    expect(report).toMatch(/No new files were inspected/i)
  })

  it('carries the required structured metadata header including AC-20.4', () => {
    expect(report).toMatch(/related-ac:\s*20\.1,\s*20\.2,\s*20\.3,\s*20\.4/)
  })
})
