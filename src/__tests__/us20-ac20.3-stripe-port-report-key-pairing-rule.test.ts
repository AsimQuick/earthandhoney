/**
 * ---
 * file: src/__tests__/us20-ac20.3-stripe-port-report-key-pairing-rule.test.ts
 * project: earthandhoney
 * purpose: Verify AC-20.3 — STRIPE_PORT_REPORT.md states the key-pairing
 *          rule in unambiguous terms (secret key, publishable key, and
 *          every priced-item identifier must all belong to the same
 *          Stripe mode) and explains why a mismatched pair fails.
 * created-by: dev-team
 * related-story: US-20
 * related-ac: 20.3
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

describe('AC-20.3: Stripe port report — key-pairing rule', () => {
  let report: string

  beforeAll(() => {
    report = read('STRIPE_PORT_REPORT.md')
  })

  it('has a key-pairing rule section', () => {
    expect(report).toMatch(/##\s*6\.\s*The key-pairing rule \(AC-20\.3\)/i)
  })

  it('names all three value types the rule covers', () => {
    expect(report).toMatch(/secret key/i)
    expect(report).toMatch(/publishable key/i)
    expect(report).toMatch(/priced-item identifier/i)
  })

  it('states the rule unambiguously: all three must belong to the same mode', () => {
    expect(report).toMatch(
      /secret key,\s*the publishable key,\s*and every priced-item\s+identifier[\s\S]{0,200}must all belong to the same Stripe\s*mode/i
    )
  })

  it('states there is no valid partially-mixed combination', () => {
    expect(report).toMatch(/no partially-mixed combination/i)
    expect(report).toMatch(/mismatched pair/i)
  })

  it('explains why a mismatch fails in terms of isolated Stripe-mode data partitions', () => {
    expect(report).toMatch(/isolated\s+data partitions/i)
    expect(report).toMatch(/not a permissions restriction/i)
  })

  it('names the concrete Stripe API failure for a publishable/secret key mismatch', () => {
    expect(report).toMatch(/No such\s+PaymentMethod/i)
  })

  it('names the concrete Stripe API failure for a price-ID/secret key mismatch', () => {
    expect(report).toMatch(/No such\s+price/i)
  })

  it('ties the mismatch to the routes and script inspected for AC-20.1', () => {
    expect(report).toMatch(/create-payment-intent/)
    expect(report).toMatch(/static\/scripts\.js/)
  })

  it('has a Method section for AC-20.3 that does not claim new files were inspected', () => {
    expect(report).toMatch(/##\s*7\.\s*Method \(AC-20\.3\)/i)
    expect(report).toMatch(/no new files were inspected/i)
  })

  it('carries the required structured metadata header including AC-20.3', () => {
    expect(report).toMatch(/related-ac:\s*20\.1,\s*20\.2,\s*20\.3/)
  })
})
