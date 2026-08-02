/**
 * ---
 * file: src/__tests__/us20-ac20.6-stripe-port-report-preserved-behaviours.test.ts
 * project: earthandhoney
 * purpose: Verify AC-20.6 — STRIPE_PORT_REPORT.md records which behaviours
 *          will be preserved when the payment flow is actually built
 *          (server-side payment creation, route layout, webhook signature
 *          verification, repeat-event protection, success and cancel
 *          handling, and the authoritative-amount-from-Stripe rule), which
 *          behaviours are deliberately not carried over with reasons, and
 *          is explicit that the reference project is a different language
 *          and framework, so faithful means matching logic and
 *          required-field structure, not copying lines.
 * created-by: dev-team
 * related-story: US-20
 * related-ac: 20.6
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

describe('AC-20.6: Stripe port report — preserved and dropped behaviours', () => {
  let report: string

  beforeAll(() => {
    report = read('STRIPE_PORT_REPORT.md')
  })

  it('has a preserved-and-dropped-behaviours section', () => {
    expect(report).toMatch(
      /##\s*12\.\s*Behaviours preserved and dropped when the payment flow is built \(AC-20\.6\)/i
    )
  })

  describe('the six preserved behaviours named by the AC', () => {
    it('preserves server-side payment creation', () => {
      expect(report).toMatch(/\*\*Server-side payment creation\.\*\*/)
    })

    it('preserves the route layout', () => {
      expect(report).toMatch(/\*\*The route layout\.\*\*/)
    })

    it('preserves webhook signature verification, honestly noting it is absent from the reference project', () => {
      expect(report).toMatch(/\*\*Webhook signature verification\.\*\*/)
      expect(report).toMatch(/contains no webhook endpoint/i)
      expect(report).toMatch(/Optional but recommended/i)
    })

    it('preserves repeat-event protection, tied to Stripe at-least-once delivery', () => {
      expect(report).toMatch(/\*\*Repeat-event protection\.\*\*/)
      expect(report).toMatch(/at-least-once, not exactly-once/i)
    })

    it('preserves success and cancel handling, honestly noting the reference project has no pre-payment cancel path', () => {
      expect(report).toMatch(/\*\*Success and cancel handling\.\*\*/)
      expect(report).toMatch(/no pre-payment\s*\n?\s*cancel\/abandon path at all/i)
    })

    it('preserves the authoritative-amount-from-Stripe rule', () => {
      expect(report).toMatch(
        /\*\*The authoritative amount is fetched from Stripe, never trusted from\s*\n?\s*the browser\.\*\*/
      )
      expect(report).toMatch(/stripe\.Price\.retrieve\(STRIPE_PRICEDEV_ID\)/)
    })
  })

  describe('behaviours deliberately not carried over', () => {
    it('has a "not carried over" section', () => {
      expect(report).toMatch(/###\s*Deliberately not carried over/i)
    })

    it('drops recurring Subscription creation, with reason tied to AC-20.9', () => {
      expect(report).toMatch(/Recurring `Subscription` creation/i)
      expect(report).toMatch(/AC-20\.9 already settles/i)
    })

    it('drops the self-service subscription-cancellation route', () => {
      expect(report).toMatch(/`\/account\/cancel-subscription`/)
      expect(report).toMatch(/nothing of that kind to let a client self-service/i)
    })

    it('drops the session-stashed email-addon mechanism, with a stated reason', () => {
      expect(report).toMatch(/Session-stashed email-addon choice/i)
      expect(report).toMatch(/no\s*\n?\s*equivalent add-on choice to stash/i)
    })

    it('drops the Flask-Login account system, with a stated reason', () => {
      expect(report).toMatch(/Flask-Login accounts/i)
      expect(report).toMatch(/not Stripe integration\s*\n?\s*behaviour/i)
    })

    it('drops the SQLite/gunicorn deployment shape, with a stated reason', () => {
      expect(report).toMatch(/SQLite persistence and the `gunicorn`/i)
      expect(report).toMatch(/not payment logic/i)
    })
  })

  describe('the language/framework boundary', () => {
    it('has a language/framework boundary section', () => {
      expect(report).toMatch(/###\s*The language\/framework boundary/i)
    })

    it('names both languages/frameworks explicitly', () => {
      expect(report).toMatch(/Flask \(Python 3\.11\)/)
      expect(report).toMatch(/Next\.js\/TypeScript on the App Router/i)
    })

    it('states faithful means matching logic and required-field structure, not copying lines', () => {
      expect(report).toMatch(
        /preserve each behaviour's \*logic\*[\s\S]{0,80}and\s*\n?\s*its \*required-field structure\*/i
      )
      expect(report).toMatch(/not its Python\s*\n?\s*syntax, its Flask route decorators, or its Jinja2 markup/i)
    })

    it('states that behaviours absent from the reference project are grounded in Stripe\'s SDK contract and AC-20.7\'s settled architecture, not reference-project code', () => {
      expect(report).toMatch(/grounded in Stripe's own\s*\n?\s*documented SDK contract/i)
      expect(report).toMatch(/not in anything read out of\s*\n?\s*`techno`/i)
    })
  })

  it('has a Method section for AC-20.6', () => {
    expect(report).toMatch(/##\s*13\.\s*Method \(AC-20\.6\)/i)
  })

  it('carries the required structured metadata header including AC-20.6', () => {
    expect(report).toMatch(/related-ac:\s*20\.1,\s*20\.2,\s*20\.3,\s*20\.4,\s*20\.5,\s*20\.6/)
  })
})
