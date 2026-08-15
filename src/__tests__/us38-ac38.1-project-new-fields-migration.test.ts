/**
 * ---
 * file: src/__tests__/us38-ac38.1-project-new-fields-migration.test.ts
 * project: earthandhoney
 * purpose: Verify AC-38.1 — at the pinned commit, 117_add_projects.js
 *          created `projects` with exactly six columns (id, name,
 *          customer_account_id, status, created_at, updated_at), so PRD
 *          22.2's New Project fields (photography type, first event date
 *          or TBD, venue/city or TBD, lead source, internal note,
 *          secondary contact, current phase) are all missing. New
 *          migration 122 adds them. This suite drives the real vendored
 *          migration module's up()/down() against a fake knex schema
 *          builder (no live database needed) and names each added column
 *          individually, so the test fails if any single one is absent.
 * created-by: dev-team
 * related-story: US-38
 * related-ac: 38.1
 * ---
 */
import fs from 'fs'
import path from 'path'
import { PICPEAK_MIGRATION_MANIFEST } from '@/lib/picpeakMigrationManifest'

const vendorRoot = path.join(process.cwd(), 'vendor', 'picpeak')
const MIGRATION_PATH = path.join(
  vendorRoot,
  'backend/migrations/core/122_add_project_new_project_fields.js',
)

// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration = require(MIGRATION_PATH)

const BASELINE_COLUMNS = ['id', 'name', 'customer_account_id', 'status', 'created_at', 'updated_at']

const NEW_COLUMNS = [
  'photography_type',
  'first_event_date',
  'first_event_date_tbd',
  'venue_city',
  'venue_city_tbd',
  'lead_source',
  'internal_note',
  'secondary_contact_name',
  'secondary_contact_email',
  'secondary_contact_phone',
  'current_phase',
]

/** Records every column name a migration's alterTable callback declares, chaining every knex column-builder method as a no-op. */
function createTableRecorder() {
  const added: string[] = []
  const dropped: string[] = []
  const columnChain: Record<string, (...args: unknown[]) => unknown> = {}
  const chain = new Proxy(columnChain, {
    get: (_target, prop) => {
      if (typeof prop === 'string') return () => chain
      return undefined
    },
  })
  const table = {
    string: (name: string) => { added.push(name); return chain },
    date: (name: string) => { added.push(name); return chain },
    boolean: (name: string) => { added.push(name); return chain },
    text: (name: string) => { added.push(name); return chain },
    dropColumn: (name: string) => { dropped.push(name); return chain },
  }
  return { table, added, dropped }
}

function makeFakeKnex(existingColumns: string[]) {
  const columnsPresent = new Set(existingColumns)
  let hasTableCalled = false
  let alterTableCalls = 0
  let lastAdded: string[] = []
  let lastDropped: string[] = []

  const knex = async function () {
    throw new Error('this fake knex only supports the schema builder')
  } as unknown as { schema: Record<string, unknown> }

  knex.schema = {
    hasTable: async (name: string) => {
      hasTableCalled = true
      return name === 'projects'
    },
    hasColumn: async (_tableName: string, column: string) => columnsPresent.has(column),
    alterTable: async (_tableName: string, cb: (table: unknown) => void) => {
      alterTableCalls += 1
      const { table, added, dropped } = createTableRecorder()
      cb(table)
      added.forEach((c) => columnsPresent.add(c))
      dropped.forEach((c) => columnsPresent.delete(c))
      lastAdded = added
      lastDropped = dropped
    },
  }

  return {
    knex,
    columnsPresent,
    hasTableWasCalled: () => hasTableCalled,
    alterTableCallCount: () => alterTableCalls,
    lastAddedColumns: () => lastAdded,
    lastDroppedColumns: () => lastDropped,
  }
}

describe('AC-38.1: migration 122 adds every PRD 22.2 New Project field to `projects`', () => {
  it('exports idempotent up/down functions', () => {
    expect(typeof migration.up).toBe('function')
    expect(typeof migration.down).toBe('function')
  })

  describe('up() against the pinned six-column baseline', () => {
    const fake = makeFakeKnex(BASELINE_COLUMNS)

    beforeAll(async () => {
      await migration.up(fake.knex)
    })

    it('checks that `projects` exists before altering it', () => {
      expect(fake.hasTableWasCalled()).toBe(true)
    })

    it('alters `projects` exactly once', () => {
      expect(fake.alterTableCallCount()).toBe(1)
    })

    it('adds photography_type', () => {
      expect(fake.lastAddedColumns()).toContain('photography_type')
    })

    it('adds first_event_date', () => {
      expect(fake.lastAddedColumns()).toContain('first_event_date')
    })

    it('adds first_event_date_tbd (the explicit TBD state for the first event date)', () => {
      expect(fake.lastAddedColumns()).toContain('first_event_date_tbd')
    })

    it('adds venue_city', () => {
      expect(fake.lastAddedColumns()).toContain('venue_city')
    })

    it('adds venue_city_tbd (the explicit TBD state for venue/city)', () => {
      expect(fake.lastAddedColumns()).toContain('venue_city_tbd')
    })

    it('adds lead_source', () => {
      expect(fake.lastAddedColumns()).toContain('lead_source')
    })

    it('adds internal_note', () => {
      expect(fake.lastAddedColumns()).toContain('internal_note')
    })

    it('adds secondary_contact_name', () => {
      expect(fake.lastAddedColumns()).toContain('secondary_contact_name')
    })

    it('adds secondary_contact_email', () => {
      expect(fake.lastAddedColumns()).toContain('secondary_contact_email')
    })

    it('adds secondary_contact_phone', () => {
      expect(fake.lastAddedColumns()).toContain('secondary_contact_phone')
    })

    it('adds current_phase', () => {
      expect(fake.lastAddedColumns()).toContain('current_phase')
    })

    it('adds exactly these eleven columns — no more, no fewer', () => {
      expect(fake.lastAddedColumns().sort()).toEqual([...NEW_COLUMNS].sort())
    })

    it('leaves every pinned baseline column untouched', () => {
      for (const column of BASELINE_COLUMNS) {
        expect(fake.columnsPresent.has(column)).toBe(true)
      }
    })
  })

  describe('idempotency: up() is a no-op once every column already exists', () => {
    it('does not call alterTable a second time', async () => {
      const fake = makeFakeKnex([...BASELINE_COLUMNS, ...NEW_COLUMNS])
      await migration.up(fake.knex)
      expect(fake.alterTableCallCount()).toBe(0)
    })

    it('adds only the columns still missing when partially applied', async () => {
      const fake = makeFakeKnex([...BASELINE_COLUMNS, 'photography_type', 'current_phase'])
      await migration.up(fake.knex)
      expect(fake.alterTableCallCount()).toBe(1)
      expect(fake.lastAddedColumns()).not.toContain('photography_type')
      expect(fake.lastAddedColumns()).not.toContain('current_phase')
      expect(fake.lastAddedColumns().sort()).toEqual(
        NEW_COLUMNS.filter((c) => c !== 'photography_type' && c !== 'current_phase').sort(),
      )
    })

    it('does nothing when the table itself does not exist', async () => {
      const fake = makeFakeKnex([])
      fake.knex.schema.hasTable = async () => false
      await migration.up(fake.knex)
      expect(fake.alterTableCallCount()).toBe(0)
    })
  })

  describe('down() removes every column this migration added', () => {
    it('drops all eleven new columns, named individually', async () => {
      const fake = makeFakeKnex([...BASELINE_COLUMNS, ...NEW_COLUMNS])
      await migration.down(fake.knex)
      expect(fake.alterTableCallCount()).toBe(1)
      for (const column of NEW_COLUMNS) {
        expect(fake.lastDroppedColumns()).toContain(column)
      }
      expect(fake.lastDroppedColumns().sort()).toEqual([...NEW_COLUMNS].sort())
    })

    it('leaves the pinned baseline columns in place after down()', async () => {
      const fake = makeFakeKnex([...BASELINE_COLUMNS, ...NEW_COLUMNS])
      await migration.down(fake.knex)
      for (const column of BASELINE_COLUMNS) {
        expect(fake.columnsPresent.has(column)).toBe(true)
      }
    })

    it('is a no-op when none of the new columns are present', async () => {
      const fake = makeFakeKnex(BASELINE_COLUMNS)
      await migration.down(fake.knex)
      expect(fake.alterTableCallCount()).toBe(0)
    })
  })
})

describe('AC-38.1: migration 122 is registered as the manifest\'s third fork-origin entry', () => {
  const MANIFEST_PATH = 'backend/migrations/core/122_add_project_new_project_fields.js'

  it('is recorded with origin "fork"', () => {
    const entry = PICPEAK_MIGRATION_MANIFEST.find((e) => e.path === MANIFEST_PATH)
    expect(entry).toBeDefined()
    expect(entry?.origin).toBe('fork')
  })

  it('is documented in FORK_CHANGELOG.md (required by the migration-integrity check)', () => {
    const changelog = fs.readFileSync(path.join(process.cwd(), 'FORK_CHANGELOG.md'), 'utf8')
    expect(changelog).toContain('122_add_project_new_project_fields.js')
    expect(changelog).toMatch(/AC-38\.1/)
  })
})
