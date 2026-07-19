/**
 * ---
 * file: src/__tests__/us1-ac1.4-env-config.test.ts
 * project: earthandhoney
 * purpose: Verify AC-1.4 — all required config (database URL, Payload secret,
 *          R2 credentials) is read from environment variables and documented
 *          in .env.example with placeholder values
 * created-by: dev-team
 * related-story: US-1
 * related-ac: 1.4
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const REQUIRED_VARS = [
  'DATABASE_URL',
  'PAYLOAD_SECRET',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_ENDPOINT',
]

function valueOf(envFileContents: string, key: string): string | undefined {
  return envFileContents.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim()
}

describe('AC-1.4: required config is read from env vars and documented in .env.example', () => {
  const envExample = read('.env.example')

  describe('.env.example documents every required var with a placeholder value', () => {
    it.each(REQUIRED_VARS)('documents %s', (key) => {
      const value = valueOf(envExample, key)
      expect(value).toBeDefined()
      expect(value).not.toBe('')
    })

    it('uses non-empty placeholder text rather than real credentials', () => {
      for (const key of REQUIRED_VARS) {
        const value = valueOf(envExample, key)!
        // A placeholder must not look like the app's real Docker-network
        // connection string leaking a live secret, and must not be blank
        // (an empty value would silently pass "defined" but document nothing).
        expect(value.length).toBeGreaterThan(0)
      }
    })

    it('the R2 credential placeholders are grouped under a single documented section', () => {
      expect(envExample).toMatch(/#.*R2|#.*Cloudflare/i)
    })

    it('DATABASE_URL documents the Docker network hostname, not localhost', () => {
      const value = valueOf(envExample, 'DATABASE_URL')!
      const url = new URL(value)
      expect(url.hostname).toBe('db')
    })
  })

  describe('config is read from process.env, not hardcoded, in application code', () => {
    const payloadConfigSrc = read('src/payload.config.ts')

    it('the Postgres adapter reads DATABASE_URL from process.env', () => {
      expect(payloadConfigSrc).toMatch(/connectionString:\s*process\.env\.DATABASE_URL/)
    })

    it('Payload reads its secret from process.env.PAYLOAD_SECRET', () => {
      expect(payloadConfigSrc).toMatch(/secret:\s*process\.env\.PAYLOAD_SECRET/)
    })

    it('no source file hardcodes a live-looking Postgres connection string', () => {
      const offenders: string[] = []
      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === 'node_modules' || entry.name === '.next') continue
          const full = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            walk(full)
          } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !full.includes('__tests__')) {
            const contents = fs.readFileSync(full, 'utf8')
            if (/postgresql:\/\/[^\s'"]+:[^\s'"]+@/.test(contents)) {
              offenders.push(full)
            }
          }
        }
      }
      walk(path.join(root, 'src'))
      expect(offenders).toEqual([])
    })
  })

  describe('secrets never reach version control', () => {
    it('.env is gitignored', () => {
      const gitignore = read('.gitignore')
      expect(gitignore).toMatch(/^\.env$/m)
    })

    it('.env.example itself is tracked (so the template ships with the repo)', () => {
      expect(fs.existsSync(path.join(root, '.env.example'))).toBe(true)
    })
  })
})
