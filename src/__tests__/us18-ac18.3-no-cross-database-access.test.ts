/**
 * ---
 * file: src/__tests__/us18-ac18.3-no-cross-database-access.test.ts
 * project: earthandhoney
 * purpose: Verify AC-18.3 — PAYLOAD_PICPEAK_API_CONTRACT.md states that the
 *          Frontstage never reads the Backstage database directly and that
 *          no cross-database join exists anywhere in application code, and
 *          that cross-system relationships are expressed as stored external
 *          identifiers. Also independently verifies the underlying claim
 *          against the actual infrastructure and application code (docker
 *          compose service topology, Payload's own database connection
 *          string, and the absence of any second database client in src/)
 *          so the document cannot silently drift from what the code does.
 * created-by: dev-team
 * related-story: US-18
 * related-ac: 18.3
 * ---
 */
import fs from 'fs'
import path from 'path'
import { parse } from 'yaml'
import { execSync } from 'child_process'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

const DOC_PATH = 'PAYLOAD_PICPEAK_API_CONTRACT.md'

function listSrcFiles(dir: string): string[] {
  const abs = path.join(root, dir)
  if (!fs.existsSync(abs)) return []
  const out: string[] = []
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...listSrcFiles(rel))
    } else {
      out.push(rel)
    }
  }
  return out
}

describe('AC-18.3: the contract states no direct Backstage DB reads and no cross-database joins', () => {
  it('PAYLOAD_PICPEAK_API_CONTRACT.md exists at the repo root', () => {
    expect(exists(DOC_PATH)).toBe(true)
  })

  const doc = read(DOC_PATH)

  it('carries an updated structured metadata header covering AC-18.3', () => {
    expect(doc).toMatch(/file:\s*PAYLOAD_PICPEAK_API_CONTRACT\.md/)
    expect(doc).toMatch(/related-story:\s*US-18/)
    expect(doc).toMatch(/related-ac:\s*18\.2,\s*18\.3/)
  })

  it('states the Frontstage never reads the Backstage database directly', () => {
    expect(doc).toMatch(/Frontstage\s*\*{0,2}never reads the Backstage database directly/)
  })

  it('states no cross-database join exists anywhere in application code', () => {
    expect(doc).toMatch(/no cross-database join exists anywhere in application code/i)
  })

  it('states cross-system relationships are expressed as stored external identifiers', () => {
    expect(doc).toMatch(/stored external identifier/i)
  })

  it('has a dedicated section for this rule', () => {
    expect(doc).toMatch(/## No cross-database access/)
  })

  it("does not silently pre-empt this story's remaining ACs (18.4, 18.5, 18.6)", () => {
    expect(doc).toMatch(/AC-18\.4/)
    expect(doc).toMatch(/AC-18\.5/)
    expect(doc).toMatch(/AC-18\.6/)
  })
})

describe('AC-18.3: the no-cross-database-join claim is independently verified against the codebase', () => {
  const compose = parse(read('docker-compose.yml'))

  it('Frontstage (Payload) and Backstage (PicPeak) run against two distinct Postgres services', () => {
    expect(compose.services['db']).toBeDefined()
    expect(compose.services['backstage-db']).toBeDefined()
    expect(compose.services['db']).not.toBe(compose.services['backstage-db'])
  })

  it('the two database services use distinct named volumes, so they cannot share storage', () => {
    const dbVolumes = JSON.stringify(compose.services['db'].volumes)
    const backstageDbVolumes = JSON.stringify(compose.services['backstage-db'].volumes)
    expect(dbVolumes).toMatch(/pgdata/)
    expect(backstageDbVolumes).toMatch(/backstage_pgdata/)
    expect(dbVolumes).not.toBe(backstageDbVolumes)
  })

  it("Backstage's backend is configured to connect only to backstage-db, never to db", () => {
    const backendEnv = compose.services['backstage-backend'].environment
    expect(backendEnv.DB_HOST).toBe('backstage-db')
    expect(backendEnv.DB_HOST).not.toBe('db')
  })

  it("Frontstage's only database credential (DATABASE_URL) points at the \"db\" host, not \"backstage-db\"", () => {
    const envExample = read('.env.example')
    const match = envExample.match(/^DATABASE_URL=(.+)$/m)
    expect(match).toBeTruthy()
    expect(match![1]).toMatch(/@db:5432\//)
    expect(match![1]).not.toMatch(/backstage-db/)
  })

  it("Payload's postgresAdapter is configured from that same single DATABASE_URL", () => {
    const payloadConfig = read('src/payload.config.ts')
    expect(payloadConfig).toMatch(/postgresAdapter/)
    expect(payloadConfig).toMatch(/connectionString:\s*process\.env\.DATABASE_URL/)
  })

  it('no application file under src/ opens a second database connection or references backstage-db/BACKSTAGE_DB_* outside test-only verification comments', () => {
    const srcFiles = listSrcFiles('src').filter(
      (f) => !f.includes(`${path.sep}__tests__${path.sep}`) && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'),
    )
    const offenders: string[] = []
    for (const file of srcFiles) {
      const content = read(file)
      if (/backstage-db|BACKSTAGE_DB_/.test(content)) {
        offenders.push(file)
      }
    }
    expect(offenders).toEqual([])
  })

  it("no application file under src/ imports the raw 'pg' driver to open its own connection pool (Payload's adapter is the only DB client)", () => {
    const srcFiles = listSrcFiles('src').filter(
      (f) => !f.includes(`${path.sep}__tests__${path.sep}`) && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'),
    )
    const offenders: string[] = []
    for (const file of srcFiles) {
      const content = read(file)
      if (/from\s+['"]pg['"]|require\(\s*['"]pg['"]\s*\)/.test(content)) {
        offenders.push(file)
      }
    }
    expect(offenders).toEqual([])
  })

  it('test-only references to backstage-db are documented as direct-verification psql queries, not application code paths', () => {
    const testFile = read('src/__tests__/us17-ac17.1.2-project-client-link.test.ts')
    expect(testFile).toMatch(/backstage-db/)
    expect(testFile).toMatch(/psql|verification/i)
  })
})

describe('does not silently edit files it is not scoped to change', () => {
  it('does not modify CLAUDE.md, SYSTEM_OWNERSHIP.md, or scrum-master files', () => {
    let gitStatus = ''
    try {
      gitStatus = execSync('git status --porcelain -- CLAUDE.md SYSTEM_OWNERSHIP.md scrum-master/', {
        cwd: root,
        encoding: 'utf8',
      })
    } catch {
      gitStatus = ''
    }
    expect(gitStatus.trim()).toBe('')
  })
})
