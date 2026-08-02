/**
 * ---
 * file: src/__tests__/us20-ac20.2-stripe-port-report-env-convention.test.ts
 * project: earthandhoney
 * purpose: Verify AC-20.2 — STRIPE_PORT_REPORT.md records the reference
 *          project's environment-variable convention exactly as found:
 *          flat names with no test/live suffix, one secret key, one
 *          publishable key, and one identifier per priced item, with the
 *          operating mode determined solely by which coherent set of
 *          values is loaded (not by a mode flag or variable).
 * created-by: dev-team
 * related-story: US-20
 * related-ac: 20.2
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const REFERENCE_PROJECT = '/Users/asim/NoIcloud/techno'
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

// The reference project lives outside this repo, at a path on the host
// machine that inspected it. It is never mounted into the `web` Docker
// container and does not exist on GitHub Actions runners, so checks that
// read from it can only run where the path is actually reachable.
const referenceProjectReachable = fs.existsSync(REFERENCE_PROJECT)
const itIfReachable = referenceProjectReachable ? it : it.skip

const REQUIRED_STRIPE_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_PRICEDEV_ID',
  'STRIPE_PRICEMAINT_ID',
  'STRIPE_PRICEEMAIL_ID',
]

describe('AC-20.2: Stripe port report — environment-variable convention', () => {
  let report: string

  beforeAll(() => {
    report = read('STRIPE_PORT_REPORT.md')
  })

  it('has an environment-variable convention section', () => {
    expect(report).toMatch(/##\s*4\.\s*Environment-variable convention/i)
  })

  it('records flat variable names with no test/live suffix', () => {
    expect(report).toMatch(/flat names/i)
    expect(report).toMatch(/no test\/live suffix/i)
    expect(report).not.toMatch(/STRIPE_SECRET_KEY_(TEST|LIVE)/)
    expect(report).not.toMatch(/STRIPE_PUBLISHABLE_KEY_(TEST|LIVE)/)
  })

  it.each(REQUIRED_STRIPE_VARS)('names %s', (name) => {
    expect(report).toContain(name)
  })

  it('records exactly one secret key and one publishable key', () => {
    expect(report).toMatch(/one secret key/i)
    expect(report).toMatch(/one publishable key/i)
  })

  it('records one identifier per priced item', () => {
    expect(report).toMatch(/one identifier per priced item/i)
  })

  it('states the operating mode is determined solely by which coherent set of values is loaded', () => {
    expect(report).toMatch(/mode is a property of the values, not a variable/i)
    expect(report).toMatch(/coherent set of\s+values/i)
  })

  itIfReachable('every required Stripe variable it names actually appears in the reference project', () => {
    const mainPy = fs.readFileSync(path.join(REFERENCE_PROJECT, 'main.py'), 'utf8')
    for (const name of REQUIRED_STRIPE_VARS) {
      expect(mainPy).toContain(name)
    }
  })

  itIfReachable('confirms the as-found gap: .env.example omits STRIPE_PRICEDEV_ID even though main.py reads it', () => {
    const envExample = fs.readFileSync(path.join(REFERENCE_PROJECT, '.env.example'), 'utf8')
    expect(envExample).not.toContain('STRIPE_PRICEDEV_ID')
    const mainPy = fs.readFileSync(path.join(REFERENCE_PROJECT, 'main.py'), 'utf8')
    expect(mainPy).toContain('STRIPE_PRICEDEV_ID')
  })

  itIfReachable('confirms the reference project has no mode-selection variable of its own', () => {
    const envExample = fs.readFileSync(path.join(REFERENCE_PROJECT, '.env.example'), 'utf8')
    expect(envExample).not.toMatch(/STRIPE_MODE|STRIPE_ENV|STRIPE_ENVIRONMENT/i)
  })

  it('carries the required structured metadata header', () => {
    expect(report).toMatch(/related-ac:\s*20\.1,\s*20\.2/)
  })
})
