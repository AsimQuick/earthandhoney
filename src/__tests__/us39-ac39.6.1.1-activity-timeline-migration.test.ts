/**
 * ---
 * file: src/__tests__/us39-ac39.6.1.1-activity-timeline-migration.test.ts
 * project: earthandhoney
 * purpose: Verify AC-39.6.1.1 — the first of AC-39.6's two schema
 *          prerequisites: a new migration creating
 *          `project_activity_timeline`, one append-only row per timeline
 *          entry. Entirely UNIT lane, no Docker, no route, no running
 *          stack — following what
 *          `us38-ac38.3-project-milestones-migration.test.ts` already does
 *          for migration 124: drives the real vendored migration 128
 *          module's up()/down() against a fake knex, asserting every
 *          column this AC requires by name, the `project_id` CASCADE and
 *          `actor_admin_id` SET NULL foreign-key behaviours declared on
 *          those columns, that `id` is the auto-incrementing primary key
 *          (the authoritative ordering column — two entries appended
 *          within the same request can share a millisecond-resolution
 *          `occurred_at`), that a second `up()` call is a no-op, and that
 *          `down()` drops the table. This AC ships no timeline entry, no
 *          service and no route — those are later AC-39.6 work.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.6.1.1
 * ---
 */
import fs from 'fs'
import path from 'path'
import { PICPEAK_MIGRATION_MANIFEST } from '@/lib/picpeakMigrationManifest'

const vendorRoot = path.join(process.cwd(), 'vendor', 'picpeak')
const MIGRATION_PATH = path.join(vendorRoot, 'backend/migrations/core/128_add_project_activity_timeline.js')

// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration = require(MIGRATION_PATH) as {
  up: (knex: unknown) => Promise<void>
  down: (knex: unknown) => Promise<void>
}

const TABLE = 'project_activity_timeline'

interface ColumnInfo {
  type: string
  notNullable: boolean
  unsigned: boolean
  primary: boolean
  references?: string
  inTable?: string
  onDelete?: string
  hasDefaultTo: boolean
}

/**
 * Chainable recorder for knex's table-builder callback (createTable),
 * recording every declared column's name, type, and the chained
 * notNullable/unsigned/references/inTable/onDelete/defaultTo/primary calls
 * a real knex column builder supports — enough to assert both column
 * presence and the foreign-key CASCADE/SET NULL behaviours this AC
 * requires, without a live database.
 */
function createTableRecorder() {
  const columns: string[] = []
  const columnInfo: Record<string, ColumnInfo> = {}
  const indexedColumnSets: string[][] = []
  const columnMethods = ['string', 'integer', 'text', 'boolean', 'timestamp', 'increments', 'json']

  function makeColumnProxy(name: string, type: string) {
    columnInfo[name] = { type, notNullable: false, unsigned: false, primary: false, hasDefaultTo: false }
    const target: Record<string, unknown> = {}
    const proxy: unknown = new Proxy(target, {
      get: (_target, prop) => {
        if (typeof prop !== 'string') return undefined
        return (...args: unknown[]) => {
          switch (prop) {
            case 'notNullable':
              columnInfo[name].notNullable = true
              break
            case 'unsigned':
              columnInfo[name].unsigned = true
              break
            case 'primary':
              columnInfo[name].primary = true
              break
            case 'references':
              columnInfo[name].references = args[0] as string
              break
            case 'inTable':
              columnInfo[name].inTable = args[0] as string
              break
            case 'onDelete':
              columnInfo[name].onDelete = args[0] as string
              break
            case 'defaultTo':
              columnInfo[name].hasDefaultTo = true
              break
            default:
              break
          }
          return proxy
        }
      },
    })
    return proxy
  }

  const chain: Record<string, unknown> = {}
  const proxy = new Proxy(chain, {
    get: (_target, prop) => {
      if (typeof prop !== 'string') return undefined
      if (columnMethods.includes(prop)) {
        return (...args: unknown[]) => {
          const columnName = args[0] as string
          columns.push(columnName)
          return makeColumnProxy(columnName, prop)
        }
      }
      if (prop === 'index') {
        return (cols: string[]) => {
          indexedColumnSets.push(cols)
          return proxy
        }
      }
      // unique(), etc. — chainable no-ops for anything this recorder does not track.
      return (..._args: unknown[]) => proxy
    },
  })
  return { table: proxy, columns, columnInfo, indexedColumnSets }
}

/**
 * A fake knex supporting schema.createTable/hasTable/dropTable — enough to
 * drive the real migration module's up()/down() without a live database.
 */
function makeFakeKnex(options: { tableExists?: boolean } = {}) {
  let tableExists = options.tableExists ?? false
  let createTableCalls = 0
  let recorded = createTableRecorder()

  const knex = ((tableName: string) => {
    throw new Error(`unexpected table query ${tableName}`)
  }) as unknown as {
    (tableName: string): never
    schema: Record<string, unknown>
    fn: { now: () => string }
  }

  knex.schema = {
    hasTable: async (name: string) => (name === TABLE ? tableExists : false),
    createTable: async (name: string, cb: (t: unknown) => void) => {
      if (name !== TABLE) throw new Error(`unexpected createTable ${name}`)
      createTableCalls += 1
      recorded = createTableRecorder()
      cb(recorded.table)
      tableExists = true
    },
    dropTable: async (name: string) => {
      if (name === TABLE) tableExists = false
    },
  }
  knex.fn = { now: () => 'NOW()' }

  return {
    knex,
    tableExists: () => tableExists,
    createTableCalls: () => createTableCalls,
    columns: () => recorded.columns,
    columnInfo: () => recorded.columnInfo,
    indexedColumnSets: () => recorded.indexedColumnSets,
  }
}

describe("AC-39.6.1.1: migration 128 creates `project_activity_timeline`", () => {
  it('exports idempotent up/down functions', () => {
    expect(typeof migration.up).toBe('function')
    expect(typeof migration.down).toBe('function')
  })

  describe('up() against an empty database', () => {
    const fake = makeFakeKnex()

    beforeAll(async () => {
      await migration.up(fake.knex)
    })

    it('creates the table exactly once', () => {
      expect(fake.createTableCalls()).toBe(1)
      expect(fake.tableExists()).toBe(true)
    })

    it('declares every column this AC requires', () => {
      for (const column of [
        'id',
        'project_id',
        'entry_type',
        'summary',
        'actor_admin_id',
        'actor_name',
        'metadata',
        'occurred_at',
      ]) {
        expect(fake.columns()).toContain(column)
      }
    })

    it('id is the auto-incrementing primary key — the authoritative ordering column', () => {
      const info = fake.columnInfo()
      expect(info.id.type).toBe('increments')
      expect(info.id.primary).toBe(true)
    })

    it('project_id is a NOT NULL foreign key to projects.id with ON DELETE CASCADE', () => {
      const info = fake.columnInfo().project_id
      expect(info.notNullable).toBe(true)
      expect(info.unsigned).toBe(true)
      expect(info.references).toBe('id')
      expect(info.inTable).toBe('projects')
      expect(info.onDelete).toBe('CASCADE')
    })

    it('actor_admin_id is a nullable foreign key to admin_users.id with ON DELETE SET NULL', () => {
      const info = fake.columnInfo().actor_admin_id
      expect(info.notNullable).toBe(false)
      expect(info.references).toBe('id')
      expect(info.inTable).toBe('admin_users')
      expect(info.onDelete).toBe('SET NULL')
    })

    it('actor_name is a NOT NULL snapshot — the "who" survives actor_admin_id being nulled', () => {
      expect(fake.columnInfo().actor_name.notNullable).toBe(true)
    })

    it('entry_type and summary are NOT NULL', () => {
      expect(fake.columnInfo().entry_type.notNullable).toBe(true)
      expect(fake.columnInfo().summary.notNullable).toBe(true)
    })

    it('metadata carries no NOT NULL constraint — structured detail is optional per entry', () => {
      expect(fake.columnInfo().metadata.notNullable).toBe(false)
    })

    it('occurred_at defaults to now()', () => {
      expect(fake.columnInfo().occurred_at.hasDefaultTo).toBe(true)
    })

    it('project_id is indexed for per-Project timeline lookups', () => {
      expect(fake.indexedColumnSets()).toContainEqual(['project_id'])
    })
  })

  describe('idempotency: a second up() call is a no-op', () => {
    it('does not call createTable again when the table already exists', async () => {
      const fake = makeFakeKnex()
      await migration.up(fake.knex)
      await migration.up(fake.knex)
      expect(fake.createTableCalls()).toBe(1)
    })

    it('an up() call against an already-migrated database (tableExists seeded true) creates nothing', async () => {
      const fake = makeFakeKnex({ tableExists: true })
      await migration.up(fake.knex)
      expect(fake.createTableCalls()).toBe(0)
      expect(fake.tableExists()).toBe(true)
    })
  })

  describe('down() drops the table', () => {
    it('drops project_activity_timeline when it exists', async () => {
      const fake = makeFakeKnex()
      await migration.up(fake.knex)
      await migration.down(fake.knex)
      expect(fake.tableExists()).toBe(false)
    })

    it('is a no-op when the table does not exist', async () => {
      const fake = makeFakeKnex({ tableExists: false })
      await migration.down(fake.knex)
      expect(fake.tableExists()).toBe(false)
    })
  })
})

describe('AC-39.6.1.1: migration 128 is registered as a fork-origin manifest entry', () => {
  const MANIFEST_PATH = 'backend/migrations/core/128_add_project_activity_timeline.js'

  it('is recorded with origin "fork"', () => {
    const entry = PICPEAK_MIGRATION_MANIFEST.find((e) => e.path === MANIFEST_PATH)
    expect(entry).toBeDefined()
    expect(entry?.origin).toBe('fork')
  })

  it('is documented in FORK_CHANGELOG.md (required by the migration-integrity check)', () => {
    const changelog = fs.readFileSync(path.join(process.cwd(), 'FORK_CHANGELOG.md'), 'utf8')
    expect(changelog).toContain('128_add_project_activity_timeline.js')
    expect(changelog).toMatch(/AC-39\.6\.1\.1/)
  })
})
