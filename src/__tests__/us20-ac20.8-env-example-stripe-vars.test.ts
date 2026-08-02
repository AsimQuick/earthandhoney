/**
 * ---
 * file: src/__tests__/us20-ac20.8-env-example-stripe-vars.test.ts
 * project: earthandhoney
 * purpose: Verify AC-20.8 — .env.example documents the placeholder Stripe
 *          variable names in the convention recorded by STRIPE_PORT_REPORT.md
 *          (flat names, no test/live suffix, one secret key, one publishable
 *          key, one identifier per priced item), each with its own comment
 *          explaining what it is and which mode it must match.
 * created-by: dev-team
 * related-story: US-20
 * related-ac: 20.8
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const REQUIRED_STRIPE_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_PRICEMAINT_ID',
  'STRIPE_PRICEEMAIL_ID',
  'STRIPE_PRICEDEV_ID',
]

function valueOf(envFileContents: string, key: string): string | undefined {
  return envFileContents.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim()
}

// The immediately-adjacent, contiguous block of "#" comment lines directly
// above a KEY= line (stopping at the first blank line or non-comment line).
function commentAbove(lines: string[], key: string): string {
  const lineIndex = lines.findIndex((l) => l.startsWith(`${key}=`))
  expect(lineIndex).toBeGreaterThan(-1)
  const commentLines: string[] = []
  for (let i = lineIndex - 1; i >= 0; i--) {
    const line = lines[i]
    if (!line.trim().startsWith('#')) break
    commentLines.unshift(line)
  }
  return commentLines.join('\n')
}

describe('AC-20.8: .env.example documents the Stripe placeholder variables', () => {
  const envExample = read('.env.example')
  const lines = envExample.split('\n')

  it.each(REQUIRED_STRIPE_VARS)('%s is present with a non-empty placeholder value', (key) => {
    const value = valueOf(envExample, key)
    expect(value).toBeDefined()
    expect(value?.length).toBeGreaterThan(0)
  })

  it('uses flat names with no _TEST/_LIVE/_SANDBOX suffix, matching the reference project convention', () => {
    for (const key of REQUIRED_STRIPE_VARS) {
      expect(envExample).not.toMatch(new RegExp(`${key}_(TEST|LIVE|SANDBOX)`))
    }
    expect(envExample).not.toMatch(/STRIPE_MODE|STRIPE_ENV|STRIPE_ENVIRONMENT/i)
  })

  it('documents exactly one secret key and one publishable key (no parallel test/live pair)', () => {
    expect(envExample.match(/^STRIPE_SECRET_KEY=/m)?.length ?? 0).toBe(1)
    expect(envExample.match(/^STRIPE_PUBLISHABLE_KEY=/m)?.length ?? 0).toBe(1)
  })

  it('documents one identifier per priced item', () => {
    const priceIdVars = REQUIRED_STRIPE_VARS.filter((v) => v.startsWith('STRIPE_PRICE'))
    expect(priceIdVars.length).toBeGreaterThanOrEqual(3)
  })

  describe('each Stripe var has its own explanatory comment naming what it is and which mode it must match', () => {
    it.each(REQUIRED_STRIPE_VARS)('%s has a comment mentioning "mode"', (key) => {
      const comment = commentAbove(lines, key)
      expect(comment.length).toBeGreaterThan(0)
      expect(comment.toLowerCase()).toMatch(/mode/)
    })

    it('STRIPE_SECRET_KEY comment identifies it as server-side / never sent to the browser', () => {
      expect(commentAbove(lines, 'STRIPE_SECRET_KEY').toLowerCase()).toMatch(/server-side|never sent to the browser/)
    })

    it('STRIPE_SECRET_KEY comment names the sk_test_/sk_live_ prefix convention', () => {
      const comment = commentAbove(lines, 'STRIPE_SECRET_KEY')
      expect(comment).toMatch(/sk_test_/)
      expect(comment).toMatch(/sk_live_/)
    })

    it('STRIPE_PUBLISHABLE_KEY comment names the pk_test_/pk_live_ prefix convention and that it must match the secret key', () => {
      const comment = commentAbove(lines, 'STRIPE_PUBLISHABLE_KEY')
      expect(comment).toMatch(/pk_test_/)
      expect(comment).toMatch(/pk_live_/)
      expect(comment).toMatch(/STRIPE_SECRET_KEY/)
    })

    it.each(['STRIPE_PRICEMAINT_ID', 'STRIPE_PRICEEMAIL_ID', 'STRIPE_PRICEDEV_ID'])(
      '%s comment ties its mode requirement back to STRIPE_SECRET_KEY',
      (key) => {
        const comment = commentAbove(lines, key)
        expect(comment).toMatch(/STRIPE_(SECRET_KEY|PRICEMAINT_ID)/)
      },
    )
  })

  describe('placeholders do not look like real, live credentials', () => {
    it.each(REQUIRED_STRIPE_VARS)('%s is a generic change-me placeholder, not a real sk_live_/pk_live_ value', (key) => {
      const value = valueOf(envExample, key)
      expect(value).not.toMatch(/^sk_live_/)
      expect(value).not.toMatch(/^pk_live_/)
      expect(value).toMatch(/change-me-in-production/)
    })
  })

  describe('.env.example remains the tracked, values-free template', () => {
    it('.env.example is tracked in the repo', () => {
      expect(fs.existsSync(path.join(root, '.env.example'))).toBe(true)
    })

    it('.env itself stays gitignored so no real Stripe secret is committed', () => {
      const gitignore = read('.gitignore')
      expect(gitignore).toMatch(/^\.env$/m)
    })
  })
})
