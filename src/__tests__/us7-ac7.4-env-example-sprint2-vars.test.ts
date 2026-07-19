/**
 * ---
 * file: src/__tests__/us7-ac7.4-env-example-sprint2-vars.test.ts
 * project: earthandhoney
 * purpose: Verify AC-7.4 — .env.example is authoritative for every variable
 *          required by sprint-2 (RESEND_API_KEY, LEAD_NOTIFICATION_EMAIL,
 *          NEXT_PUBLIC_WHATSAPP_NUMBER, NEXT_PUBLIC_SITE_URL), documented
 *          with placeholder values only and no real secrets committed
 * created-by: dev-team
 * related-story: US-7
 * related-ac: 7.4
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const SPRINT2_VARS = [
  'RESEND_API_KEY',
  'LEAD_NOTIFICATION_EMAIL',
  'NEXT_PUBLIC_WHATSAPP_NUMBER',
  'NEXT_PUBLIC_SITE_URL',
]

function valueOf(envFileContents: string, key: string): string | undefined {
  return envFileContents.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim()
}

describe('AC-7.4: .env.example is authoritative for every sprint-2 variable, placeholders only', () => {
  const envExample = read('.env.example')

  describe('every sprint-2 var is documented with a non-empty placeholder', () => {
    it.each(SPRINT2_VARS)('documents %s', (key) => {
      const value = valueOf(envExample, key)
      expect(value).toBeDefined()
      expect(value?.length).toBeGreaterThan(0)
    })
  })

  describe('placeholders do not look like real, live credentials', () => {
    it('RESEND_API_KEY is not a real Resend key (Resend keys are prefixed "re_")', () => {
      const value = valueOf(envExample, 'RESEND_API_KEY')!
      expect(value).not.toMatch(/^re_/)
      expect(value).toMatch(/change-me-in-production/)
    })

    it('LEAD_NOTIFICATION_EMAIL is a placeholder, not a plausible real inbox', () => {
      const value = valueOf(envExample, 'LEAD_NOTIFICATION_EMAIL')!
      expect(value).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      expect(value).toMatch(/change-me-in-production/)
    })

    it('NEXT_PUBLIC_WHATSAPP_NUMBER is digits-only international format, not a real business number', () => {
      const value = valueOf(envExample, 'NEXT_PUBLIC_WHATSAPP_NUMBER')!
      // Digits only, no "+" or separators, per the WhatsApp wa.me deep-link format.
      expect(value).toMatch(/^\d+$/)
      // The 555 exchange is reserved for fictional numbers (e.g. North American
      // Numbering Plan) — guards against an accidental real number leaking in.
      expect(value).toContain('555')
    })

    it('NEXT_PUBLIC_SITE_URL is a valid absolute URL usable for local/dev out of the box', () => {
      const value = valueOf(envExample, 'NEXT_PUBLIC_SITE_URL')!
      expect(() => new URL(value)).not.toThrow()
    })
  })

  describe('no real secret patterns leak into the committed template', () => {
    it('does not contain a real-looking Resend API key anywhere in the file', () => {
      expect(envExample).not.toMatch(/re_[A-Za-z0-9]{20,}/)
    })
  })

  describe('sprint-2 code has not yet introduced env vars missing from .env.example', () => {
    it('every process.env.NEXT_PUBLIC_* or *_API_KEY/*_EMAIL var referenced in src/ is documented', () => {
      const undocumented: string[] = []
      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '__tests__') continue
          const full = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            walk(full)
          } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
            const contents = fs.readFileSync(full, 'utf8')
            const matches = contents.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g)
            for (const m of matches) {
              const key = m[1]
              if (valueOf(envExample, key) === undefined) {
                undocumented.push(`${key} (${path.relative(root, full)})`)
              }
            }
          }
        }
      }
      walk(path.join(root, 'src'))
      expect(undocumented).toEqual([])
    })
  })

  describe('.env.example remains the tracked, authoritative template', () => {
    it('.env.example is tracked in the repo', () => {
      expect(fs.existsSync(path.join(root, '.env.example'))).toBe(true)
    })

    it('.env itself stays gitignored so no real secrets are committed', () => {
      const gitignore = read('.gitignore')
      expect(gitignore).toMatch(/^\.env$/m)
    })
  })
})
