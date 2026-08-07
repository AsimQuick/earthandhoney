/**
 * ---
 * file: src/__tests__/us26-ac26.6-env-example-webhook-vars.test.ts
 * project: earthandhoney
 * purpose: Verify AC-26.6 — .env.example documents the webhook shared
 *          secret (PICPEAK_WEBHOOK_SECRET) and the webhook receiver URL
 *          (PICPEAK_WEBHOOK_RECEIVER_URL) with placeholder values and a
 *          per-variable comment, matching the sprint-3 Stripe-vars
 *          convention (AC-20.8), and that the secret's variable name is
 *          used one-to-one — no renaming or aliasing — everywhere the
 *          running code reads it, so a future repository secret named to
 *          match it stays correct. No secret value is committed.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.6
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const REQUIRED_WEBHOOK_VARS = ['PICPEAK_WEBHOOK_SECRET', 'PICPEAK_WEBHOOK_RECEIVER_URL']

function valueOf(envFileContents: string, key: string): string | undefined {
  return envFileContents.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim()
}

// The immediately-adjacent, contiguous block of "#" comment lines directly
// above a KEY= line (stopping at the first blank line or non-comment line).
// Mirrors the helper AC-20.8 used for the Stripe vars.
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

describe('AC-26.6: .env.example documents the webhook secret and receiver URL', () => {
  const envExample = read('.env.example')
  const lines = envExample.split('\n')

  it.each(REQUIRED_WEBHOOK_VARS)('%s is present with a non-empty placeholder value', (key) => {
    const value = valueOf(envExample, key)
    expect(value).toBeDefined()
    expect(value?.length).toBeGreaterThan(0)
  })

  it('documents exactly one shared secret and one receiver URL (no duplicates)', () => {
    expect(envExample.match(/^PICPEAK_WEBHOOK_SECRET=/m)?.length ?? 0).toBe(1)
    expect(envExample.match(/^PICPEAK_WEBHOOK_RECEIVER_URL=/m)?.length ?? 0).toBe(1)
  })

  describe('each var has its own explanatory comment', () => {
    it.each(REQUIRED_WEBHOOK_VARS)('%s has a non-empty comment block directly above it', (key) => {
      const comment = commentAbove(lines, key)
      expect(comment.length).toBeGreaterThan(0)
    })

    it('PICPEAK_WEBHOOK_SECRET comment names the X-PicPeak-Signature header and the admin registration route', () => {
      const comment = commentAbove(lines, 'PICPEAK_WEBHOOK_SECRET')
      expect(comment).toMatch(/X-PicPeak-Signature/)
      expect(comment).toMatch(/POST \/api\/admin\/webhooks/)
    })

    it('PICPEAK_WEBHOOK_SECRET comment names how to generate a real value', () => {
      expect(commentAbove(lines, 'PICPEAK_WEBHOOK_SECRET')).toMatch(/openssl rand -hex 32/)
    })

    it('PICPEAK_WEBHOOK_RECEIVER_URL comment names the receiver route and the admin registration route', () => {
      const comment = commentAbove(lines, 'PICPEAK_WEBHOOK_RECEIVER_URL')
      expect(comment).toMatch(/api\/webhooks\/picpeak/)
      expect(comment).toMatch(/POST \/api\/admin\/webhooks/)
    })

    it('PICPEAK_WEBHOOK_RECEIVER_URL comment distinguishes the production value from the Compose-hostname value the local live-proof harness registers', () => {
      const comment = commentAbove(lines, 'PICPEAK_WEBHOOK_RECEIVER_URL')
      expect(comment).toMatch(/publicly reachable|public internet/i)
      expect(comment).toMatch(/http:\/\/web:3000\/api\/webhooks\/picpeak/)
    })
  })

  describe('placeholders do not look like real, live values', () => {
    it('PICPEAK_WEBHOOK_SECRET is a generic change-me placeholder, not a real hex secret', () => {
      const value = valueOf(envExample, 'PICPEAK_WEBHOOK_SECRET')
      expect(value).toMatch(/change-me-in-production/)
      expect(value).not.toMatch(/^[a-f0-9]{64}$/)
    })

    it('PICPEAK_WEBHOOK_RECEIVER_URL is a generic change-me placeholder domain, not a real production URL', () => {
      const value = valueOf(envExample, 'PICPEAK_WEBHOOK_RECEIVER_URL')
      expect(value).toMatch(/change-me-in-production/)
      expect(value).toMatch(/^https:\/\//)
    })
  })

  describe('the secret var name is used one-to-one — no renaming or aliasing — by the code that reads it', () => {
    const routeSource = read('src/app/(frontend)/api/webhooks/picpeak/route.ts')

    it('the receiver route reads process.env.PICPEAK_WEBHOOK_SECRET verbatim', () => {
      expect(routeSource).toMatch(/process\.env\.PICPEAK_WEBHOOK_SECRET\b/)
    })

    it('no alternately-named or prefixed variant of the secret var is read anywhere in src/', () => {
      const srcDir = path.join(root, 'src')
      const offenders: string[] = []
      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '__tests__') continue
            walk(full)
          } else if (/\.(ts|tsx)$/.test(entry.name)) {
            const contents = fs.readFileSync(full, 'utf8')
            const matches = contents.match(/process\.env\.PICPEAK_WEBHOOK_\w+/g) ?? []
            for (const m of matches) {
              if (m !== 'process.env.PICPEAK_WEBHOOK_SECRET') offenders.push(`${full}: ${m}`)
            }
          }
        }
      }
      walk(srcDir)
      expect(offenders).toEqual([])
    })
  })

  describe('.env.example remains the tracked, values-free template', () => {
    it('.env.example is tracked in the repo', () => {
      expect(fs.existsSync(path.join(root, '.env.example'))).toBe(true)
    })

    it('.env itself stays gitignored so no real webhook secret is committed', () => {
      const gitignore = read('.gitignore')
      expect(gitignore).toMatch(/^\.env$/m)
    })
  })
})
