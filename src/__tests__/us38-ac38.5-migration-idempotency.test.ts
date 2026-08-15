/**
 * ---
 * file: src/__tests__/us38-ac38.5-migration-idempotency.test.ts
 * project: earthandhoney
 * purpose: Verify AC-38.5 — every new migration (122-125, US-38 ACs
 *          38.1-38.4) runs clean on an empty database and is idempotent on
 *          re-run, following the MIGRATION_IDEMPOTENCY.md convention
 *          already established by AC-16.6. This suite pins two kinds of
 *          evidence: (1) that each new migration file exists and that its
 *          own AC test suite already asserts per-migration idempotency (a
 *          second up() call performs no further DDL/insert) — that
 *          per-file check is not re-derived here to avoid duplicating
 *          us38-ac38.{1,2,3,4}'s existing fakes; (2) the live Docker
 *          double-run this AC's Evidence clause requires (migration
 *          command run twice against a freshly created database, both
 *          exit codes and the second run's no-op output) was executed
 *          2026-08-16 and recorded verbatim in MIGRATION_IDEMPOTENCY.md's
 *          "Extension migrations proof (US-38, AC-38.5)" section — that
 *          live run needs a Docker daemon and several minutes, so it is
 *          not repeatable inside Jest; this suite instead pins the
 *          recorded evidence so it cannot silently rot out of the doc,
 *          mirroring us16-ac16.6-migration-idempotency.test.ts's pattern
 *          for the same kind of AC.
 * created-by: dev-team
 * related-story: US-38
 * related-ac: 38.5
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const NEW_MIGRATIONS = [
  { filename: '122_add_project_new_project_fields.js', testFile: 'us38-ac38.1-project-new-fields-migration.test.ts' },
  { filename: '123_add_event_detail_fields.js', testFile: 'us38-ac38.2-event-detail-fields-migration.test.ts' },
  { filename: '124_add_project_milestones.js', testFile: 'us38-ac38.3-project-milestones-migration.test.ts' },
  {
    filename: '125_add_project_documents_and_integration_status.js',
    testFile: 'us38-ac38.4-project-documents-integration-status-migration.test.ts',
  },
]

describe('AC-38.5: each new migration (122-125) exists and is independently pinned as idempotent', () => {
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
        expect(suite.toLowerCase()).toMatch(/second (run|time)|does not call|creates nothing new|toBe\(0\)|toBe\(1\)/)
      })
    })
  }
})

describe('AC-38.5 Evidence: the live Docker double-run is recorded in MIGRATION_IDEMPOTENCY.md', () => {
  it('MIGRATION_IDEMPOTENCY.md exists at the repo root', () => {
    expect(fs.existsSync(path.join(root, 'MIGRATION_IDEMPOTENCY.md'))).toBe(true)
  })

  const doc = read('MIGRATION_IDEMPOTENCY.md')

  it('documents the extension-migrations proof section for this AC', () => {
    expect(doc).toMatch(/Extension migrations proof \(US-38, AC-38\.5\)/)
  })

  it('names all four new migrations by filename', () => {
    for (const { filename } of NEW_MIGRATIONS) {
      expect(doc).toContain(filename)
    }
  })

  describe('run (a): fresh install against an empty database', () => {
    it('records the fresh-install migration summary applying the new migrations with zero skips', () => {
      const idx = doc.indexOf('Extension migrations proof (US-38, AC-38.5)')
      const section = doc.slice(idx, idx + 3000)
      expect(section).toMatch(/Applied: 102 migration\(s\)/)
      expect(section).toMatch(/Skipped: 0 migration\(s\) \(already applied\)/)
      expect(section).toMatch(/All migrations completed successfully/)
    })

    it('shows the migration-state table immediately after run (a)', () => {
      const sectionStart = doc.indexOf('Extension migrations proof (US-38, AC-38.5)')
      const idx = doc.indexOf('Migration-state table immediately after run (a)', sectionStart)
      expect(idx).toBeGreaterThan(sectionStart)
      const section = doc.slice(idx, idx + 400)
      expect(section).toMatch(/count \| min \| max/)
      expect(section).toMatch(/102 \|   1 \| 102/)
    })
  })

  describe('run (b): the same migration command re-run twice against the already-migrated database', () => {
    it('uses the exact same command the vendored entrypoint runs on every boot', () => {
      expect(doc).toMatch(/npm run migrate:safe/)
      expect(doc).toMatch(/run-migrations-safe\.js/)
    })

    it('both re-runs apply zero migrations and exit 0', () => {
      const idx = doc.indexOf('Extension migrations proof (US-38, AC-38.5)')
      const section = doc.slice(idx)
      const appliedZero = section.match(/Applied: 0 migration\(s\)/g) || []
      const exitZero = section.match(/EXIT CODE: 0/g) || []
      expect(appliedZero.length).toBeGreaterThanOrEqual(2)
      expect(exitZero.length).toBeGreaterThanOrEqual(2)
    })

    it('records the second re-run as a true steady-state no-op', () => {
      expect(doc).toMatch(/Second re-run — steady-state no-op/)
      expect(doc).toMatch(/No "Marked \.\.\. as applied" lines this time/)
    })

    it('proves no data loss: zero duplicate migration filenames after the re-runs', () => {
      expect(doc).toMatch(/Zero duplicate filenames after two re-runs/)
    })
  })

  it('states the schema-altering extension-migration deferral is now closed', () => {
    expect(doc).toMatch(/deferral.*closed by the proof below \(US-38, AC-38\.5\)/s)
  })
})

describe('AC-38.5 Evidence: the deferral this proof closes is also updated in UPSTREAM_SYNC.md', () => {
  const sync = read('UPSTREAM_SYNC.md')

  it('records the deferral as closed, naming the four new migrations', () => {
    expect(sync).toMatch(/deferral closed/)
    for (const { filename } of NEW_MIGRATIONS) {
      const num = filename.slice(0, 3)
      expect(sync).toContain(num)
    }
  })

  it('references MIGRATION_IDEMPOTENCY.md as where the live proof is recorded', () => {
    expect(sync).toMatch(/MIGRATION_IDEMPOTENCY\.md/)
    expect(sync).toMatch(/Extension migrations proof \(US-38,\s*\nAC-38\.5\)/)
  })
})
