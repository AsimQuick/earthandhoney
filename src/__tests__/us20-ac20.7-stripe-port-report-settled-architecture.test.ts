/**
 * ---
 * file: src/__tests__/us20-ac20.7-stripe-port-report-settled-architecture.test.ts
 * project: earthandhoney
 * purpose: Verify AC-20.7 — STRIPE_PORT_REPORT.md states plainly that this
 *          payment path exists so the studio can charge its photography
 *          clients (not subscription billing for a future software
 *          product), records the already-settled payment architecture
 *          rather than reopening it (ported direct flow initiates payment,
 *          the ledger's own payment gateway stays disconnected, a verified
 *          webhook reconciles payment into the ledger and advances the
 *          project milestone), states that exactly one webhook endpoint
 *          exists and lives in the fork backend where invoice status
 *          lives, states that a browser redirect is never proof of
 *          payment, and states that the port crossing a language boundary
 *          into the fork backend must be recorded in FORK_CHANGELOG.md as
 *          a deliberate deviation.
 * created-by: dev-team
 * related-story: US-20
 * related-ac: 20.7
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

describe('AC-20.7: Stripe port report — settled payment architecture, restated not reopened', () => {
  let report: string

  beforeAll(() => {
    report = read('STRIPE_PORT_REPORT.md')
  })

  it('has a settled-payment-architecture section', () => {
    expect(report).toMatch(
      /##\s*14\.\s*This payment path's purpose, and the settled payment architecture, restated not reopened \(AC-20\.7\)/i
    )
  })

  it('states plainly this path charges the studio\'s own photography clients, not subscription billing for a future software product', () => {
    expect(report).toMatch(/\*\*What this payment path is for\.\*\*/)
    expect(report).toMatch(
      /It is \*\*not\*\*\s*\n?\s*subscription billing for a future software product/i
    )
  })

  it('restates the settled architecture without presenting it as a new decision', () => {
    expect(report).toMatch(/Nothing here is a\s*\n?\s*new decision/i)
    expect(report).toMatch(/scrum-master\/po-requests\.md/)
  })

  describe('the three parts of the settled architecture', () => {
    it('states the ported direct flow initiates payment', () => {
      expect(report).toMatch(/\*\*The ported direct flow initiates payment\.\*\*/)
    })

    it('states the ledger\'s own payment gateway stays disconnected', () => {
      expect(report).toMatch(
        /\*\*The ledger's own payment gateway stays disconnected\.\*\*/
      )
      expect(report).toMatch(/payment\s*\n?\s*gateway disconnected/i)
    })

    it('states the verified webhook reconciles payment into the ledger and advances the project milestone', () => {
      expect(report).toMatch(
        /\*\*The verified webhook reconciles the payment into the ledger and\s*\n?\s*advances the project milestone\.\*\*/
      )
      expect(report).toMatch(/invoiceService\.js/)
      expect(report).toMatch(/kind:\s*'invoice'/)
      expect(report).toMatch(/projectService\.js/)
    })
  })

  it('states exactly one webhook endpoint exists, in the fork backend where invoice status lives, distinct from PicPeak\'s own outbound webhook system', () => {
    expect(report).toMatch(/\*\*Exactly one webhook endpoint, and where it lives\.\*\*/)
    expect(report).toMatch(/vendor\/picpeak\/backend/)
    expect(report).toMatch(/adminWebhooks\.js/)
    expect(report).toMatch(/outbound/i)
    expect(report).toMatch(/No inbound Stripe webhook/i)
  })

  it('states a browser redirect is never proof of payment', () => {
    expect(report).toMatch(/\*\*A browser redirect is never proof of payment\.\*\*/)
  })

  it('states the port crosses a language boundary into the fork backend and must be recorded in FORK_CHANGELOG.md as a deliberate deviation', () => {
    expect(report).toMatch(
      /\*\*The language boundary this port crosses, and where that gets\s*\n?\s*recorded\.\*\*/
    )
    expect(report).toMatch(/Python → JavaScript for the fork-backend side/i)
    expect(report).toMatch(/\*\*must\*\*\s*\n?\s*be recorded in `FORK_CHANGELOG\.md` as a `deviation` entry/i)
    expect(report).toMatch(/validateChangelogEntry.*src\/lib\/forkChangelog\.ts/)
  })

  it('has a Method section for AC-20.7', () => {
    expect(report).toMatch(/##\s*15\.\s*Method \(AC-20\.7\)/i)
  })

  it('carries the required structured metadata header including AC-20.7', () => {
    expect(report).toMatch(
      /related-ac:\s*20\.1,\s*20\.2,\s*20\.3,\s*20\.4,\s*20\.5,\s*20\.6,\s*20\.7/
    )
  })
})
