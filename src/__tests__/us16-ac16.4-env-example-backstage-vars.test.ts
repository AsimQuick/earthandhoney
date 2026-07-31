/**
 * ---
 * file: src/__tests__/us16-ac16.4-env-example-backstage-vars.test.ts
 * project: earthandhoney
 * purpose: Verify AC-16.4 — .env.example documents every environment
 *          variable the Backstage (vendor/picpeak) service definitions in
 *          docker-compose.yml need, with safe placeholder values and an
 *          explanatory comment each, and no real secret committed
 * created-by: dev-team
 * related-story: US-16
 * related-ac: 16.4
 * ---
 */
import fs from 'fs'
import path from 'path'
import { parse } from 'yaml'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

function valueOf(envFileContents: string, key: string): string | undefined {
  return envFileContents.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim()
}

// Every `${VAR}` / `${VAR:-default}` reference inside a compose service's
// `environment` block, across all Backstage services (backstage-db,
// backstage-backend, backstage-frontend).
function referencedVars(value: unknown, found: Set<string>) {
  if (typeof value === 'string') {
    for (const m of value.matchAll(/\$\{([A-Z0-9_]+)(?::-[^}]*)?\}/g)) {
      found.add(m[1])
    }
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) referencedVars(v, found)
  }
}

describe('AC-16.4: .env.example documents every Backstage environment variable', () => {
  const envExample = read('.env.example')
  const compose = parse(read('docker-compose.yml'))

  const backstageServiceNames = ['backstage-db', 'backstage-backend', 'backstage-frontend']

  const usedVars = new Set<string>()
  for (const name of backstageServiceNames) {
    const service = compose.services[name]
    expect(service).toBeDefined()
    referencedVars(service.environment, usedVars)
    referencedVars(service.build?.args, usedVars)
  }

  // R2_* vars are shared with the Next.js app and already covered by
  // AC-2.5/AC-16.3's own tests — this AC only needs to add the
  // Backstage-specific vars docker-compose.yml introduces.
  const backstageOnlyVars = [...usedVars].filter((v) => v.startsWith('BACKSTAGE_'))

  it('docker-compose.yml actually references BACKSTAGE_* vars (sanity check the extraction works)', () => {
    expect(backstageOnlyVars.length).toBeGreaterThan(0)
  })

  describe('every BACKSTAGE_* var referenced by docker-compose.yml is documented with a non-empty placeholder', () => {
    it.each([
      'BACKSTAGE_DB_NAME',
      'BACKSTAGE_DB_USER',
      'BACKSTAGE_DB_PASSWORD',
      'BACKSTAGE_JWT_SECRET',
      'BACKSTAGE_ADMIN_USERNAME',
      'BACKSTAGE_ADMIN_EMAIL',
      'BACKSTAGE_ADMIN_PASSWORD',
      'BACKSTAGE_API_URL',
    ])('%s is used by docker-compose.yml and documented in .env.example', (key) => {
      expect(backstageOnlyVars).toContain(key)
      const value = valueOf(envExample, key)
      expect(value).toBeDefined()
      expect(value?.length).toBeGreaterThan(0)
    })

    it('every BACKSTAGE_* var docker-compose.yml references is present in .env.example (no gaps)', () => {
      const undocumented = backstageOnlyVars.filter((key) => valueOf(envExample, key) === undefined)
      expect(undocumented).toEqual([])
    })
  })

  describe('NODE_ENV — used by the Backstage backend, not previously documented', () => {
    it('is documented with a safe default', () => {
      expect(valueOf(envExample, 'NODE_ENV')).toBe('production')
    })
  })

  describe('each documented Backstage var has an explanatory comment above it', () => {
    const lines = envExample.split('\n')
    // BACKSTAGE_ADMIN_EMAIL/PASSWORD share one explanatory comment with
    // BACKSTAGE_ADMIN_USERNAME immediately above them (one admin-account
    // group), so only the group leaders are checked here.
    const varsToCheck = [
      'BACKSTAGE_DB_NAME',
      'BACKSTAGE_JWT_SECRET',
      'BACKSTAGE_ADMIN_USERNAME',
      'BACKSTAGE_API_URL',
    ]

    it.each(varsToCheck)('%s is preceded by a "#" comment line within the Backstage section', (key) => {
      const lineIndex = lines.findIndex((l) => l.startsWith(`${key}=`))
      expect(lineIndex).toBeGreaterThan(-1)
      // Walk upward through any immediately-adjacent comment/blank lines
      // looking for at least one non-empty "#" comment.
      let hasComment = false
      for (let i = lineIndex - 1; i >= 0; i--) {
        const line = lines[i]
        if (line.trim() === '') continue
        if (line.trim().startsWith('#')) {
          hasComment = true
          break
        }
        break
      }
      expect(hasComment).toBe(true)
    })
  })

  describe('placeholders do not look like real, live credentials', () => {
    it('BACKSTAGE_DB_PASSWORD, BACKSTAGE_JWT_SECRET and BACKSTAGE_ADMIN_PASSWORD are generic placeholders', () => {
      expect(valueOf(envExample, 'BACKSTAGE_DB_PASSWORD')).toMatch(/change-me-in-production/)
      expect(valueOf(envExample, 'BACKSTAGE_JWT_SECRET')).toMatch(/change-me-in-production/)
      expect(valueOf(envExample, 'BACKSTAGE_ADMIN_PASSWORD')).toMatch(/change-me-in-production/)
    })

    it('BACKSTAGE_ADMIN_EMAIL is an example.com address, not a real inbox', () => {
      expect(valueOf(envExample, 'BACKSTAGE_ADMIN_EMAIL')).toMatch(/@example\.com$/)
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

    it('no local .env (if present) is what documents Backstage vars — .env.example is authoritative even without it', () => {
      // This assertion doesn't touch .env at all — it's here to make explicit
      // that the above checks run entirely against .env.example.
      expect(envExample).toContain('# Backstage')
    })
  })
})
