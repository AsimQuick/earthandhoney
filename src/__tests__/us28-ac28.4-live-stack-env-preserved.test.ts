/**
 * ---
 * file: src/__tests__/us28-ac28.4-live-stack-env-preserved.test.ts
 * project: earthandhoney
 * purpose: Verify AC-28.4 — nothing the live stack still needs was removed
 *          by AC-28.1–28.3. The `R2_*` vars and `NEXT_PUBLIC_SITE_URL` stay
 *          in `.env.example`, `docker-compose.yml` still wires the
 *          Backstage backend's S3-compatible storage to those exact
 *          `R2_*` vars (only the Payload-side consumer went away), and
 *          PIVOT_AUDIT.md records the live proof of one real Backstage
 *          upload reaching R2 through that wiring after a clean
 *          `cp .env.example .env`.
 * created-by: dev-team
 * related-story: US-28
 * related-ac: 28.4
 * ---
 */
import fs from 'fs'
import path from 'path'

import { parse } from 'yaml'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const LIVE_STACK_VARS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_ENDPOINT',
  'NEXT_PUBLIC_SITE_URL',
]

const RETIRED_VARS = ['RESEND_API_KEY', 'LEAD_NOTIFICATION_EMAIL', 'NEXT_PUBLIC_WHATSAPP_NUMBER']

function valueOf(envFileContents: string, key: string): string | undefined {
  return envFileContents.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim()
}

describe('AC-28.4: nothing the live stack still needs is removed', () => {
  const envExample = read('.env.example')

  describe('.env.example still documents every var the live stack needs', () => {
    it.each(LIVE_STACK_VARS)('documents %s with a non-empty value', (key) => {
      const value = valueOf(envExample, key)
      expect(value).toBeDefined()
      expect(value?.length).toBeGreaterThan(0)
    })

    it.each(RETIRED_VARS)('does not resurrect the AC-28.3 orphaned var %s', (key) => {
      expect(valueOf(envExample, key)).toBeUndefined()
    })
  })

  describe('docker-compose.yml still wires the Backstage backend to the shared R2_* vars', () => {
    const compose = parse(read('docker-compose.yml'))
    const env = compose.services['backstage-backend'].environment

    it('selects the S3-compatible storage backend', () => {
      expect(env.STORAGE_BACKEND).toBe('s3')
    })

    it('reads bucket, endpoint and credentials from the project-wide R2_* vars, not a second set', () => {
      expect(env.STORAGE_S3_BUCKET).toBe('${R2_BUCKET}')
      expect(env.STORAGE_S3_ENDPOINT).toBe('${R2_ENDPOINT}')
      expect(env.STORAGE_S3_ACCESS_KEY).toBe('${R2_ACCESS_KEY_ID}')
      expect(env.STORAGE_S3_SECRET_KEY).toBe('${R2_SECRET_ACCESS_KEY}')
    })
  })

  describe('the Payload-side R2 consumer is the only thing that went away', () => {
    it('payload.config.ts no longer wires s3Storage', () => {
      const src = read('src/payload.config.ts')
      expect(src).not.toMatch(/s3Storage\(/)
    })

    it('docker-compose.yml is untouched by that removal — the Backstage backend service still exists', () => {
      const compose = parse(read('docker-compose.yml'))
      expect(compose.services).toHaveProperty('backstage-backend')
    })
  })

  describe('PIVOT_AUDIT.md records the live clean-stack upload proof', () => {
    const audit = read('PIVOT_AUDIT.md')
    const sectionStart = audit.indexOf('## AC-28.4')

    it('the AC-28.4 section exists', () => {
      expect(sectionStart).toBeGreaterThanOrEqual(0)
    })

    const section = audit.slice(sectionStart)

    it('documents starting from a clean cp .env.example .env', () => {
      expect(section).toMatch(/cp \.env\.example \.env/)
    })

    it('documents a real Backstage photo upload through the admin API', () => {
      expect(section).toMatch(/POST http:\/\/localhost:3100\/api\/admin\/photos\/\d+\/upload/)
    })

    it('documents the uploaded object actually landing in the R2 bucket under the backstage prefix', () => {
      expect(section).toMatch(/backstage\/events\/active\//)
      expect(section).toMatch(/aws s3api list-objects-v2/)
    })

    it('states an explicit pass result for the recorded run', () => {
      expect(section).toMatch(/Result: \*\*PASS\*\*/)
    })
  })
})
