/**
 * ---
 * file: src/__tests__/us16-ac16.2-backstage-postgres-migrations.test.ts
 * project: earthandhoney
 * purpose: Verify AC-16.2 — the forked Backstage (vendor/picpeak) runs on
 *          PostgreSQL, not on any development-only database the upstream may
 *          default to, and its migrations complete cleanly against an empty
 *          database.
 * created-by: dev-team
 * related-story: US-16
 * related-ac: 16.2
 * ---
 */

// The clean-migration claim itself was proven against a live container on
// 2026-07-31. From no `backstage_pgdata` volume at all (a genuinely empty
// database), `docker compose --profile backstage up -d --build backstage-db
// backstage-backend` produced:
//
//   Migration Summary:
//   - Applied: 96 migration(s)
//   - Skipped: 0 migration(s) (already applied)
//   - Total:   96 migration(s)
//   All migrations completed successfully
//
// and the result was verified to live in PostgreSQL, not a fallback SQLite
// file: `psql -U backstage -d backstage` reported 70 tables in the public
// schema, 96 rows in the `migrations` tracking table, and the seeded admin
// user present in `admin_users`.
//
// That proof needs a Docker daemon and several minutes, so it is not
// repeatable inside Jest. This suite instead pins the configuration that
// makes the outcome deterministic — the same wiring the live run exercised —
// so a regression in compose or in the vendored fork fails the build.

import fs from 'fs'
import path from 'path'
import { parse } from 'yaml'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

describe('AC-16.2: Backstage runs on Postgres and migrates cleanly', () => {
  const compose = parse(read('docker-compose.yml'))
  const backend = compose.services['backstage-backend']
  const backstageDb = compose.services['backstage-db']

  describe('the backend is explicitly pinned to the pg client, not an upstream default', () => {
    it('sets DATABASE_CLIENT=pg on "backstage-backend" rather than relying on upstream defaults', () => {
      expect(backend.environment.DATABASE_CLIENT).toBe('pg')
    })

    it("upstream's own knexfile treats 'pg' as a real client selector (not a typo)", () => {
      // Read-only assertion against the vendored file — Fork Discipline means
      // we configure via env vars, we do not edit vendor/picpeak/backend/knexfile.js.
      const knexfile = read('vendor/picpeak/backend/knexfile.js')
      expect(knexfile).toMatch(/client:\s*process\.env\.DATABASE_CLIENT/)
      expect(knexfile).toMatch(/=== 'pg'/)
    })

    it("does not leave DATABASE_CLIENT to fall through to upstream's sqlite3 development default", () => {
      // vendor/picpeak/backend/knexfile.js's `development` config defaults to
      // `client: process.env.DATABASE_CLIENT || 'sqlite3'` — a dev-only
      // database. Our compose file must set NODE_ENV=production (routing
      // knexfile to its `production` block) AND DATABASE_CLIENT=pg, so
      // neither the environment nor the client can resolve to sqlite3.
      // Defaults to "production" (via ${NODE_ENV:-production}) so an
      // unset host NODE_ENV still routes knexfile to its production block.
      expect(backend.environment.NODE_ENV).toMatch(/production/)
      expect(backend.environment.DATABASE_CLIENT).not.toBe('sqlite3')
    })

    it('declares no sqlite file-path variables that could point the fork back at a dev database', () => {
      // DATABASE_PATH / TEST_DATABASE_PATH are the only knobs knexfile.js
      // consults for a sqlite file. Setting either would be a signal that
      // someone expected a file-backed database; neither belongs here.
      expect(backend.environment).not.toHaveProperty('DATABASE_PATH')
      expect(backend.environment).not.toHaveProperty('TEST_DATABASE_PATH')
    })

    it("pins DATABASE_CLIENT in `environment:` so a stray .env value cannot override it", () => {
      // backstage-backend also reads `env_file: .env`. Compose resolves
      // `environment:` with higher precedence than `env_file:`, so declaring
      // DATABASE_CLIENT inline is what guarantees pg wins regardless of what
      // an operator's local .env happens to contain.
      expect(backend.env_file).toContain('.env')
      expect(backend.environment).toHaveProperty('DATABASE_CLIENT', 'pg')
    })
  })

  describe('the backend points at a real, containerised Postgres service', () => {
    it('runs "backstage-db" from the official postgres image, not sqlite or a host install', () => {
      expect(backstageDb.image).toMatch(/^postgres:/)
    })

    it('addresses the database by Docker network hostname "backstage-db"', () => {
      expect(backend.environment.DB_HOST).toBe('backstage-db')
      expect(backend.environment.DB_PORT).toBe('5432')
    })

    it('credentials and database name are wired end-to-end between backend and db', () => {
      expect(backend.environment.DB_USER).toBe(backstageDb.environment.POSTGRES_USER)
      expect(backend.environment.DB_PASSWORD).toBe(backstageDb.environment.POSTGRES_PASSWORD)
      expect(backend.environment.DB_NAME).toBe(backstageDb.environment.POSTGRES_DB)
    })
  })

  describe('migrations run automatically against an empty database on boot', () => {
    it('waits for Postgres to be healthy before the backend container starts', () => {
      expect(backend.depends_on?.['backstage-db']?.condition).toBe('service_healthy')
    })

    it("the vendored entrypoint runs the safe migration runner before the app process starts", () => {
      const entrypoint = read('vendor/picpeak/backend/wait-for-db.sh')
      expect(entrypoint).toMatch(/npm run migrate:safe/)
      // Migrations run before `exec "$@"` hands off to the actual server
      // process, so a fresh (empty) database is always migrated first.
      const migrateIdx = entrypoint.indexOf('npm run migrate:safe')
      const execIdx = entrypoint.indexOf('exec "$@"')
      expect(migrateIdx).toBeGreaterThan(-1)
      expect(execIdx).toBeGreaterThan(migrateIdx)
    })

    it('the safe migration runner script exists in the vendored fork', () => {
      expect(fs.existsSync(path.join(root, 'vendor/picpeak/backend/migrations/run-migrations-safe.js'))).toBe(
        true,
      )
    })

    it('the pg migration runner wraps each migration in a transaction for atomicity', () => {
      // Confirms the runner treats Postgres as a first-class target (not an
      // afterthought bolted onto a sqlite-first implementation).
      const runner = read('vendor/picpeak/backend/migrations/run-migrations.js')
      expect(runner).toMatch(/db\.client\.config\.client === 'pg'/)
      expect(runner).toMatch(/db\.transaction/)
    })
  })
})
