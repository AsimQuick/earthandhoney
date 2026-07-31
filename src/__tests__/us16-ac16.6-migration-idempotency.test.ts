/**
 * ---
 * file: src/__tests__/us16-ac16.6-migration-idempotency.test.ts
 * project: earthandhoney
 * purpose: Verify AC-16.6 — MIGRATION_IDEMPOTENCY.md records the two live
 *          proof runs (fresh install against an empty database, and the
 *          same migration command re-run against the already-migrated
 *          database as a no-op), with the migration-state table shown
 *          before and after, and that UPSTREAM_SYNC.md records the
 *          deferral of the our-own-extension-migration upgrade proof.
 * created-by: dev-team
 * related-story: US-16
 * related-ac: 16.6
 * ---
 */

// The proof itself was exercised live on 2026-07-31 against a real Docker
// daemon: `docker compose --profile backstage down -v` first (so no
// `backstage_pgdata` volume pre-existed), then a fresh
// `docker compose --profile backstage up -d --build backstage-db
// backstage-backend` (run a), then `docker compose --profile backstage exec
// backstage-backend npm run migrate:safe` run twice more against that
// now-migrated database (run b). The full command output and
// before/after `migrations` table state are recorded verbatim in
// MIGRATION_IDEMPOTENCY.md. That live run needs a Docker daemon and several
// minutes, so it is not repeatable inside Jest — this suite instead pins
// the recorded evidence so it cannot silently rot out of the doc.

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

describe('AC-16.6: the migration path is proven safe with recorded command output', () => {
  it('MIGRATION_IDEMPOTENCY.md exists at the repo root', () => {
    expect(fs.existsSync(path.join(root, 'MIGRATION_IDEMPOTENCY.md'))).toBe(true)
  })

  const doc = read('MIGRATION_IDEMPOTENCY.md')

  describe('run (a): fresh install against an empty database', () => {
    it('states no volume pre-existed before the run', () => {
      expect(doc).toMatch(/down -v/)
      expect(doc).toMatch(/no `backstage_pgdata` volume existed before run \(a\)/)
    })

    it('records the fresh-install migration summary applying all pinned migrations with zero skips', () => {
      expect(doc).toMatch(/Applied: 96 migration\(s\)/)
      expect(doc).toMatch(/Skipped: 0 migration\(s\) \(already applied\)/)
      expect(doc).toMatch(/Total: 96 migration\(s\)/)
      expect(doc).toMatch(/All migrations completed successfully/)
    })

    it('shows the migration-state table immediately after the fresh install ("before" state for run b)', () => {
      const idx = doc.indexOf('Migration-state table immediately after run (a)')
      expect(idx).toBeGreaterThan(-1)
      const section = doc.slice(idx, idx + 400)
      expect(section).toMatch(/count \| min \| max/)
      expect(section).toMatch(/96 \|   1 \|  96/)
    })
  })

  describe('run (b): the same migration command re-run against the already-migrated database', () => {
    it('uses the exact same command the vendored entrypoint runs on every boot, not a substitute', () => {
      expect(doc).toMatch(/npm run migrate:safe/)
      expect(doc).toMatch(/run-migrations-safe\.js/)
    })

    it('the re-run applies zero migrations — no re-application of already-applied SQL', () => {
      expect(doc).toMatch(/Applied: 0 migration\(s\)/)
    })

    it('shows the migration-state table before and after the re-run', () => {
      expect(doc).toMatch(/Migration-state table immediately after the first re-run/)
      // exact literal table header appears twice — once for run (a), once for run (b)
      expect((doc.match(/count \| min \| max/g) || []).length).toBeGreaterThanOrEqual(2)
    })

    it('proves no data loss: no duplicate migration filenames, unchanged table count, admin_users intact', () => {
      expect(doc).toMatch(/No duplicate filenames were created/)
      expect(doc).toMatch(/70\s*\n?\s*tables/)
      expect(doc).toMatch(/exactly the one seeded administrator/)
      expect(doc).toMatch(/no data loss/)
    })

    it('proves the original rows were preserved, not re-inserted, by their unchanged applied_at timestamp', () => {
      expect(doc).toMatch(/kept their original `applied_at`\s*\ntimestamps unchanged/)
    })

    it('runs the command a second time to prove convergence to a true steady-state no-op, not just a first-encounter fix-up', () => {
      expect(doc).toMatch(/Second re-run — steady-state no-op/)
      expect(doc).toMatch(/No "Marked \.\.\. as applied" lines this time/)
    })

    it('reports success with no error on every re-run', () => {
      const matches = doc.match(/All migrations completed successfully/g) || []
      expect(matches.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('scoping: our-own-extension-migration upgrade proof is explicitly deferred, not attempted', () => {
    it('states that no fork-authored migration exists yet under Fork Discipline', () => {
      expect(doc).toMatch(/no such migration exists yet/)
      expect(doc).toMatch(/Fork Discipline/)
    })

    it('explains why inventing a throwaway migration would prove nothing real', () => {
      expect(doc).toMatch(/[Ii]nventing a\s*\nthrowaway migration/)
      expect(doc).toMatch(/prove nothing real/)
    })

    it('the deferral is also recorded in UPSTREAM_SYNC.md so it is not lost', () => {
      const sync = read('UPSTREAM_SYNC.md')
      expect(sync).toMatch(/Deferred proof: upgrading with our own extension migrations \(AC-16\.6\)/)
      expect(sync).toMatch(/deferred to the sprint that introduces this fork's first\s*\nextension migration/)
    })
  })
})
