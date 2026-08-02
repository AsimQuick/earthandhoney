/**
 * ---
 * file: src/__tests__/us20-ac20.9-stripe-port-report-faithful-port-boundary.test.ts
 * project: earthandhoney
 * purpose: Verify AC-20.9 — STRIPE_PORT_REPORT.md records the boundary of
 *          what "port faithfully" does and does not cover: the reference
 *          project is a one-shot checkout flow with no saved payment
 *          method, no off-session charge, and no retry or dunning logic, so
 *          none of that is inherited; V1 ships a payment schedule whose
 *          installments are each paid manually against a real ledger
 *          invoice; automatic recurring card charges are deferred to V1.1
 *          and must be built on that same schedule; and a subscription
 *          product must never be used because it would place an
 *          authoritative billing schedule outside the ledger.
 * created-by: dev-team
 * related-story: US-20
 * related-ac: 20.9
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

describe('AC-20.9: Stripe port report — the boundary of "port faithfully"', () => {
  let report: string

  beforeAll(() => {
    report = read('STRIPE_PORT_REPORT.md')
  })

  it('has a section recording the boundary of "port faithfully"', () => {
    expect(report).toMatch(
      /##\s*16\.\s*The boundary of "port faithfully" \(AC-20\.9\)/i
    )
  })

  it('states the reference project is a one-shot checkout flow', () => {
    expect(report).toMatch(/\*\*What the reference project is, precisely\.\*\*/)
    expect(report).toMatch(/is a \*\*one-shot checkout\s*\n?\s*flow\*\*/i)
    expect(report).toMatch(/create-payment-intent/)
  })

  it('confirms via direct search that none of saved payment method, off-session charge, or retry/dunning logic is inherited', () => {
    expect(report).toMatch(/\*\*No saved payment method\.\*\*/)
    expect(report).toMatch(/\*\*No off-session charge\.\*\*/)
    expect(report).toMatch(/\*\*No retry or dunning logic\.\*\*/)
    expect(report).toMatch(/zero matches/i)
    expect(report).toMatch(/setup_intent|SetupIntent/)
    expect(report).toMatch(/off_session/)
  })

  it('states none of that is in scope for this port', () => {
    expect(report).toMatch(
      /are therefore \*\*not\s*\n?\s*in scope for this port\*\*/i
    )
  })

  it('states V1 ships a payment schedule whose installments are each paid manually against a real ledger invoice', () => {
    expect(report).toMatch(
      /\*\*V1's actual shape: a manually-paid installment schedule against a real\s*\n?\s*ledger invoice\.\*\*/
    )
    expect(report).toMatch(
      /installments ship in V1 as a\s*\n?\s*manual-pay schedule/i
    )
    expect(report).toMatch(/scrum-master\/po-requests\.md/)
  })

  it('states automatic recurring card charges are deferred to V1.1 and must be built on that same schedule', () => {
    expect(report).toMatch(
      /\*\*V1\.1: automatic recurring card charges, built on that\s*\n?\s*same schedule\.\*\*/
    )
    expect(report).toMatch(/must be built\s*\n?\s*\*\*on that same schedule\*\*/i)
  })

  it('states a subscription product must never be used because it would place an authoritative billing schedule outside the ledger', () => {
    expect(report).toMatch(
      /\*\*Why a subscription product must never be used here\.\*\*/
    )
    expect(report).toMatch(/authoritative-billing-schedule-outside-the-ledger/i)
  })

  it('has a Method section for AC-20.9', () => {
    expect(report).toMatch(/##\s*17\.\s*Method \(AC-20\.9\)/i)
  })

  it('carries the required structured metadata header including AC-20.9', () => {
    expect(report).toMatch(
      /related-ac:\s*20\.1,\s*20\.2,\s*20\.3,\s*20\.4,\s*20\.5,\s*20\.6,\s*20\.7,\s*20\.8,\s*20\.9/
    )
  })
})
