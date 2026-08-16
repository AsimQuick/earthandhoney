/**
 * ---
 * file: src/__tests__/us39-ac39.6.1.3-migration-idempotency.test.ts
 * project: earthandhoney
 * purpose: Verify AC-39.6.1.3 — the live idempotency proof covering both of
 *          AC-39.6's schema-prerequisite migrations, `128_add_project_activity_timeline.js`
 *          (AC-39.6.1.1) and `129_seed_events_manage_permission.js`
 *          (AC-39.6.1.2), following exactly the precedent AC-38.5 set for
 *          migrations 122-125. The live run needs a Docker daemon and
 *          several minutes, so it is not repeatable inside Jest — it was
 *          executed 2026-08-16 and recorded verbatim in
 *          MIGRATION_IDEMPOTENCY.md's "Extension migrations proof (US-39,
 *          AC-39.6.1.3)" section: backstage-backend rebuilt first (AC-39.3.1
 *          had recorded a stale container serving code that no longer
 *          existed in source), a fresh install applying both new migrations
 *          with zero skips, an up-down-up cycle proving both migrations'
 *          down()/up() round-trip cleanly, and a final double re-run of the
 *          vendored entrypoint's own migration command proving a
 *          steady-state no-op. This suite instead pins that recorded
 *          evidence so it cannot silently rot out of the doc, mirroring
 *          us38-ac38.5-migration-idempotency.test.ts's pattern for the same
 *          kind of AC, and additionally asserts verifyVendoredMigrations
 *          passes with both new manifest entries in place — the check that
 *          proves AC-39.6.1.1's and AC-39.6.1.2's blob SHAs and
 *          FORK_CHANGELOG.md lines are correct rather than merely present.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.6.1.3
 * ---
 */
import fs from 'fs'
import path from 'path'
import { verifyVendoredMigrations } from '@/lib/picpeakMigrationIntegrity'
import { PICPEAK_MIGRATION_MANIFEST } from '@/lib/picpeakMigrationManifest'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const NEW_MIGRATIONS = [
  { filename: '128_add_project_activity_timeline.js', testFile: 'us39-ac39.6.1.1-activity-timeline-migration.test.ts' },
  { filename: '129_seed_events_manage_permission.js', testFile: 'us39-ac39.6.1.2-events-manage-permission-migration.test.ts' },
]

describe('AC-39.6.1.3: each new migration (128-129) exists and is independently pinned as idempotent', () => {
  for (const { filename, testFile } of NEW_MIGRATIONS) {
    describe(filename, () => {
      it('exists under vendor/picpeak/backend/migrations/core/', () => {
        const migrationPath = path.join(root, 'vendor', 'picpeak', 'backend', 'migrations', 'core', filename)
        expect(fs.existsSync(migrationPath)).toBe(true)
      })

      it('exports up() and down()', () => {
        const migrationPath = path.join(root, 'vendor', 'picpeak', 'backend', 'migrations', 'core', filename)
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const migration = require(migrationPath)
        expect(typeof migration.up).toBe('function')
        expect(typeof migration.down).toBe('function')
      })

      it(`its own AC suite (${testFile}) asserts idempotency on a second up() run`, () => {
        const suite = read(path.join('src/__tests__', testFile))
        expect(suite).toMatch(/idempoten/i)
        expect(suite.toLowerCase()).toMatch(/second (run|time)|does not (call|insert)|creates nothing new|inserts nothing new/)
      })
    })
  }
})

describe('AC-39.6.1.3: verifyVendoredMigrations passes with both new manifest entries in place', () => {
  it('both migrations are registered in PICPEAK_MIGRATION_MANIFEST with origin "fork"', () => {
    for (const { filename } of NEW_MIGRATIONS) {
      const entry = PICPEAK_MIGRATION_MANIFEST.find((e) => e.path === `backend/migrations/core/${filename}`)
      expect(entry).toBeDefined()
      expect(entry?.origin).toBe('fork')
    }
  })

  it('verifyVendoredMigrations reports ok against the real vendored tree', () => {
    const result = verifyVendoredMigrations(path.join('vendor', 'picpeak'))
    expect(result.violations).toEqual([])
    expect(result.ok).toBe(true)
    expect(result.checked).toBe(PICPEAK_MIGRATION_MANIFEST.length)
  })
})

describe('AC-39.6.1.3 Evidence: the live Docker proof is recorded in MIGRATION_IDEMPOTENCY.md', () => {
  it('MIGRATION_IDEMPOTENCY.md exists at the repo root', () => {
    expect(fs.existsSync(path.join(root, 'MIGRATION_IDEMPOTENCY.md'))).toBe(true)
  })

  const doc = read('MIGRATION_IDEMPOTENCY.md')
  const sectionStart = doc.indexOf('Extension migrations proof (US-39, AC-39.6.1.3)')

  it('documents the extension-migrations proof section for this AC', () => {
    expect(sectionStart).toBeGreaterThan(-1)
  })

  it('names both new migrations by filename', () => {
    for (const { filename } of NEW_MIGRATIONS) {
      expect(doc).toContain(filename)
    }
  })

  it('records that backstage-backend was rebuilt before the run, closing the AC-39.3.1 stale-container gap', () => {
    const section = doc.slice(sectionStart)
    expect(section).toMatch(/rebuilt \(`--build`\)/)
    expect(section).toMatch(/stale running container/)
  })

  describe('run (a): fresh install against an empty database', () => {
    it('records the fresh-install migration summary applying both new migrations with zero skips', () => {
      const section = doc.slice(sectionStart, sectionStart + 3500)
      expect(section).toMatch(/Applied: 106 migration\(s\)/)
      expect(section).toMatch(/Skipped: 0 migration\(s\) \(already applied\)/)
      expect(section).toMatch(/All migrations completed successfully/)
    })

    it('shows the migration-state table immediately after run (a)', () => {
      const idx = doc.indexOf('Migration-state table immediately after run (a)', sectionStart)
      expect(idx).toBeGreaterThan(sectionStart)
      const section = doc.slice(idx, idx + 400)
      expect(section).toMatch(/count \| min \| max/)
      expect(section).toMatch(/106 \|   1 \| 106/)
    })
  })

  describe('run (b): up-down-up — both new migrations rolled back and re-applied', () => {
    it('documents the DOWN phase in reverse order and the UP phase in forward order', () => {
      const section = doc.slice(sectionStart)
      expect(section).toMatch(/DOWN phase \(reverse order: 129, then 128\)/)
      expect(section).toMatch(/DOWN ok: 129_seed_events_manage_permission\.js/)
      expect(section).toMatch(/DOWN ok: 128_add_project_activity_timeline\.js/)
      expect(section).toMatch(/UP phase \(forward order: 128, then 129\)/)
      expect(section).toMatch(/UP ok: 128_add_project_activity_timeline\.js/)
      expect(section).toMatch(/UP ok: 129_seed_events_manage_permission\.js/)
    })

    it('proves the table and permission are gone after DOWN and back after UP', () => {
      const section = doc.slice(sectionStart)
      expect(section).toMatch(/project_activity_timeline table exists after DOWN: false/)
      expect(section).toMatch(/events\.manage permission row exists after DOWN: false/)
      expect(section).toMatch(/project_activity_timeline table exists after UP: true/)
      expect(section).toMatch(/events\.manage permission row exists after UP: true/)
      expect(section).toMatch(/events\.manage granted to super_admin after UP: true/)
    })

    it('the up-down-up cycle exits 0 and leaves zero duplicate migration filenames', () => {
      const section = doc.slice(sectionStart)
      expect(section).toMatch(/EXIT CODE: 0/)
      expect(section).toMatch(/\(0 rows\)/)
    })
  })

  describe('run (c): the same migration command re-run twice against the already-migrated database', () => {
    it('uses the exact same command the vendored entrypoint runs on every boot', () => {
      expect(doc).toMatch(/npm run migrate:safe/)
      expect(doc).toMatch(/run-migrations-safe\.js/)
    })

    it('both re-runs apply zero migrations and exit 0', () => {
      const section = doc.slice(sectionStart)
      const appliedZero = section.match(/Applied: 0 migration\(s\)/g) || []
      const exitZero = section.match(/EXIT CODE: 0/g) || []
      expect(appliedZero.length).toBeGreaterThanOrEqual(2)
      expect(exitZero.length).toBeGreaterThanOrEqual(2)
    })

    it('records the second re-run as a true steady-state no-op', () => {
      const section = doc.slice(sectionStart)
      expect(section).toMatch(/Second re-run — steady-state no-op/)
      expect(section).toMatch(/No "Marked \.\.\. as applied" lines this time/)
    })

    it('proves no data loss: zero duplicate migration filenames after the run', () => {
      const section = doc.slice(sectionStart)
      expect(section).toMatch(/zero duplicate migration filenames/)
    })
  })

  it('states the AC-39.6.1.3 live idempotency proof by name in the result', () => {
    const section = doc.slice(sectionStart)
    expect(section).toMatch(/AC-39\.6\.1\.3 live idempotency proof/)
  })
})
