/**
 * ---
 * file: src/__tests__/us15-ac15.6-picpeak-vendored-fork.test.ts
 * project: earthandhoney
 * purpose: Verify AC-15.6 — the forked PicPeak code is present in this
 *          project in a clearly separated location (vendor/picpeak, rooted
 *          at the exact pinned commit), and no already-shipped upstream
 *          database migration has been modified, verified by comparing the
 *          fork's migration files against the pinned-upstream fingerprint
 *          recorded in PICPEAK_MIGRATION_MANIFEST. Also exercises the
 *          migration-integrity decision logic in isolation.
 * created-by: dev-team
 * related-story: US-15
 * related-ac: 15.6
 * ---
 */
import fs from 'fs'
import path from 'path'
import {
  gitBlobSha,
  verifyMigrationsUnmodified,
  verifyVendoredMigrations,
} from '@/lib/picpeakMigrationIntegrity'
import { PICPEAK_MIGRATION_MANIFEST, PICPEAK_PINNED_COMMIT } from '@/lib/picpeakMigrationManifest'

const root = process.cwd()
const vendorRoot = path.join(root, 'vendor', 'picpeak')

describe('AC-15.6: PicPeak fork is vendored in a clearly separated location', () => {
  it('places the fork under vendor/picpeak, separate from this project\'s own src/', () => {
    expect(fs.existsSync(vendorRoot)).toBe(true)
    expect(fs.existsSync(path.join(root, 'src'))).toBe(true)
  })

  it('vendors the fork\'s backend, including its migrations directory', () => {
    expect(fs.existsSync(path.join(vendorRoot, 'backend'))).toBe(true)
    expect(fs.existsSync(path.join(vendorRoot, 'backend', 'migrations'))).toBe(true)
  })

  it('vendors PicPeak\'s own LICENSE file inside the fork tree', () => {
    expect(fs.existsSync(path.join(vendorRoot, 'LICENSE'))).toBe(true)
  })

  it('does not vendor the upstream .git history — only the pinned tree', () => {
    expect(fs.existsSync(path.join(vendorRoot, '.git'))).toBe(false)
  })

  it('keeps the fork out of this project\'s own source tree', () => {
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name)
        return entry.isDirectory() ? walk(full) : [full]
      })
    expect(walk(path.join(root, 'src')).some((f) => /picpeak\/backend/.test(f))).toBe(false)
  })

  it('documents vendor/ as the separated, never-edited third-party location', () => {
    const readme = fs.readFileSync(path.join(root, 'vendor', 'README.md'), 'utf8')
    expect(readme).toContain('vendor/picpeak/')
    expect(readme).toContain(PICPEAK_PINNED_COMMIT)
    expect(readme).toMatch(/must never be modified/i)
  })
})

describe('AC-15.6: the separation is enforced by tooling, not convention', () => {
  it('excludes the fork from linting', () => {
    expect(fs.readFileSync(path.join(root, 'eslint.config.mjs'), 'utf8')).toContain(
      'vendor/picpeak/**',
    )
  })

  it('excludes the fork from this project\'s TypeScript compilation', () => {
    const tsconfig = JSON.parse(fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf8'))
    expect(tsconfig.exclude).toContain('vendor')
  })

  it('excludes upstream\'s own test suites and source from our jest run and coverage', () => {
    const jestConfig = fs.readFileSync(path.join(root, 'jest.config.ts'), 'utf8')
    // Scoped positively to our own source root rather than blacklisting
    // vendor/ out of test discovery, so AC-7.3's "no suite of ours is ever
    // excluded" guarantee still holds.
    expect(jestConfig).toContain("roots: ['<rootDir>/src']")
    for (const key of ['modulePathIgnorePatterns', 'coveragePathIgnorePatterns']) {
      expect(jestConfig).toContain(key)
    }
    expect(jestConfig).toContain('<rootDir>/vendor/')
  })

  it('runs no upstream test suite as part of this project\'s suite', () => {
    const suites = fs
      .readdirSync(path.join(root, 'src', '__tests__'))
      .filter((n) => /\.tsx?$/.test(n))
    expect(suites.length).toBeGreaterThan(0)
    expect(suites.some((n) => n.includes('picpeak/'))).toBe(false)
    expect(fs.existsSync(path.join(vendorRoot, 'backend', '__tests__'))).toBe(true)
  })
})

describe('AC-15.6: migration manifest matches the pinned upstream commit', () => {
  it('is pinned to the same commit recorded in PICPEAK_UPSTREAM.md', () => {
    expect(PICPEAK_PINNED_COMMIT).toBe('eb263137b98935754155824de2a03848121304b6')
    const doc = fs.readFileSync(path.join(root, 'PICPEAK_UPSTREAM.md'), 'utf8')
    expect(doc).toContain(PICPEAK_PINNED_COMMIT)
  })

  it('records at least one manifest entry per vendored migration file', () => {
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name)
        return entry.isDirectory() ? walk(full) : [full]
      })

    const migrationsDir = path.join(vendorRoot, 'backend', 'migrations')
    const actualFiles = walk(migrationsDir).map((f) => path.relative(vendorRoot, f)).sort()
    const manifestFiles = PICPEAK_MIGRATION_MANIFEST.map((e) => e.path).sort()
    expect(actualFiles).toEqual(manifestFiles)
  })
})

describe('AC-15.6: gitBlobSha', () => {
  it('matches a known git blob SHA-1 for empty content', () => {
    expect(gitBlobSha(Buffer.from(''))).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391')
  })

  it('matches a known git blob SHA-1 for a simple string', () => {
    expect(gitBlobSha(Buffer.from('hello\n'))).toBe('ce013625030ba8dba906f756967f9e9ca394464a')
  })
})

describe('AC-15.6: verifyMigrationsUnmodified (decision logic)', () => {
  const manifest = [
    { path: 'a.js', blobSha: gitBlobSha(Buffer.from('const a = 1;\n')) },
    { path: 'b.js', blobSha: gitBlobSha(Buffer.from('const b = 2;\n')) },
  ]
  const files: Record<string, Buffer> = {
    'a.js': Buffer.from('const a = 1;\n'),
    'b.js': Buffer.from('const b = 2;\n'),
  }
  const read = (p: string) => files[p] ?? null

  it('reports ok when every migration file\'s blob SHA matches the manifest', () => {
    const result = verifyMigrationsUnmodified(manifest, read)
    expect(result).toEqual({ ok: true, checked: 2, violations: [] })
  })

  it('flags a migration whose content was edited after being vendored', () => {
    const tampered: Record<string, Buffer> = { ...files, 'a.js': Buffer.from('const a = 999; // sneaky edit\n') }
    const result = verifyMigrationsUnmodified(manifest, (p) => tampered[p] ?? null)
    expect(result.ok).toBe(false)
    expect(result.violations).toHaveLength(1)
    expect(result.violations[0]).toMatchObject({ path: 'a.js', reason: 'modified' })
    expect(result.violations[0].actualBlobSha).not.toBe(result.violations[0].expectedBlobSha)
  })

  it('flags an already-shipped migration that was deleted', () => {
    const result = verifyMigrationsUnmodified(manifest, (p) => (p === 'a.js' ? files['a.js'] : null))
    expect(result.ok).toBe(false)
    expect(result.violations).toContainEqual({
      path: 'b.js',
      reason: 'missing',
      expectedBlobSha: manifest[1].blobSha,
      actualBlobSha: null,
    })
  })
})

describe('AC-15.6: verifyVendoredMigrations against the real vendored tree', () => {
  it('finds every vendored migration file unmodified relative to the pinned upstream commit', () => {
    const result = verifyVendoredMigrations(path.join('vendor', 'picpeak'))
    expect(result.checked).toBe(PICPEAK_MIGRATION_MANIFEST.length)
    expect(result.violations).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('reports every migration missing when the fork is not where it is meant to be', () => {
    const result = verifyVendoredMigrations(path.join('vendor', 'not-a-real-fork'))
    expect(result.ok).toBe(false)
    expect(result.violations).toHaveLength(PICPEAK_MIGRATION_MANIFEST.length)
    expect(result.violations.every((v) => v.reason === 'missing')).toBe(true)
  })
})
