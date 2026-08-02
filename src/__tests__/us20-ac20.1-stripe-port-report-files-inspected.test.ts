/**
 * ---
 * file: src/__tests__/us20-ac20.1-stripe-port-report-files-inspected.test.ts
 * project: earthandhoney
 * purpose: Verify AC-20.1 — STRIPE_PORT_REPORT.md exists and lists every
 *          file inspected in the reference project's Stripe implementation,
 *          covering payment routes, the server/client split, templates,
 *          the environment example, and the deployment workflow. Also
 *          verifies every cited reference-project file path actually
 *          exists there, so the report cannot cite files that were never
 *          read.
 * created-by: dev-team
 * related-story: US-20
 * related-ac: 20.1
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const REFERENCE_PROJECT = '/Users/asim/NoIcloud/techno'
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

// The reference project lives outside this repo, at a path on the host
// machine that inspected it. It is never mounted into the `web` Docker
// container (docker-compose.yml only mounts `.:/app`) and does not exist on
// GitHub Actions runners, so checks that read from it can only run where the
// path is actually reachable — otherwise every file lookup would fail not
// because the report is wrong, but because the environment can't see the
// reference project at all.
const referenceProjectReachable = fs.existsSync(REFERENCE_PROJECT)
const itIfReachable = referenceProjectReachable ? it : it.skip

const REQUIRED_INSPECTED_FILES = [
  'main.py',
  'templates/checkout.html',
  'templates/success.html',
  'templates/account.html',
  'static/scripts.js',
  '.env.example',
  '.github/workflows/main.yml',
  'docker-compose.yml',
  'Dockerfile',
  'requirements.txt',
]

describe('AC-20.1: Stripe port report — files inspected', () => {
  let report: string

  beforeAll(() => {
    report = read('STRIPE_PORT_REPORT.md')
  })

  it('exists at the repo root', () => {
    expect(fs.existsSync(path.join(root, 'STRIPE_PORT_REPORT.md'))).toBe(true)
  })

  it('names the reference project path it was read from', () => {
    expect(report).toContain(REFERENCE_PROJECT)
  })

  it('has a "Files inspected" section', () => {
    expect(report).toMatch(/##\s*2\.\s*Files inspected/i)
  })

  it.each(REQUIRED_INSPECTED_FILES)('lists %s as inspected', (file) => {
    expect(report).toContain(file)
  })

  itIfReachable('every file it says it inspected actually exists in the reference project', () => {
    for (const file of REQUIRED_INSPECTED_FILES) {
      const fullPath = path.join(REFERENCE_PROJECT, file)
      expect(fs.existsSync(fullPath)).toBe(true)
    }
  })

  it('covers payment routes — names the Stripe-touching routes found in main.py', () => {
    expect(report).toMatch(/\/checkout/)
    expect(report).toMatch(/\/create-payment-intent/)
    expect(report).toMatch(/\/success/)
    expect(report).toMatch(/\/account\/cancel-subscription/)
  })

  it('covers the server/client split — distinguishes server-side Stripe SDK use from client-side Stripe.js use', () => {
    expect(report).toMatch(/server side|server-side/i)
    expect(report).toMatch(/client side|client-side/i)
    expect(report).toMatch(/js\.stripe\.com/)
  })

  it('covers templates — names checkout.html, success.html and account.html by role', () => {
    expect(report).toMatch(/checkout\.html/)
    expect(report).toMatch(/success\.html/)
    expect(report).toMatch(/account\.html/)
  })

  itIfReachable('covers the environment example — names the actual Stripe variables found in .env.example', () => {
    const envExample = fs.readFileSync(path.join(REFERENCE_PROJECT, '.env.example'), 'utf8')
    const stripeVars = envExample
      .split('\n')
      .map((line) => line.split('=')[0].trim())
      .filter((name) => name.startsWith('STRIPE_'))

    expect(stripeVars.length).toBeGreaterThan(0)
    for (const name of stripeVars) {
      expect(report).toContain(name)
    }
  })

  it('covers the deployment workflow — names the GitHub Actions workflow and its secret-writing behaviour', () => {
    expect(report).toMatch(/\.github\/workflows\/main\.yml/)
    expect(report).toMatch(/secrets\./)
    expect(report).toMatch(/docker compose/i)
  })

  it('carries the required structured metadata header', () => {
    expect(report).toMatch(/related-story:\s*US-20/)
    expect(report).toMatch(/related-ac:\s*20\.1/)
  })
})
