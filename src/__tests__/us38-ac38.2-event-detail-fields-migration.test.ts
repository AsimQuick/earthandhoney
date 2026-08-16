/**
 * ---
 * file: src/__tests__/us38-ac38.2-event-detail-fields-migration.test.ts
 * project: earthandhoney
 * purpose: Verify AC-38.2 — PRD 22.4 names ten event-detail items. At the
 *          pinned commit plus migration 122, `events` already carries four
 *          of them (name/type, date/time, full-day state) but none of the
 *          "or TBD" date flag, venue name, full address, map link,
 *          coordinator/contact, coverage notes, client-visible notes or
 *          internal notes. New migration 123 adds the missing ten columns.
 *          This suite drives the real vendored migration module's
 *          up()/down() against a fake knex schema builder (no live database
 *          needed), maps each of the ten PRD-named items to the column that
 *          carries it and fails if any single one is missing, and asserts
 *          the client-visible note and the internal note are two distinct
 *          columns — the precondition US-44 AC-44.2 relies on to prove the
 *          internal one never reaches the client.
 * created-by: dev-team
 * related-story: US-38
 * related-ac: 38.2
 * ---
 */
import fs from 'fs'
import path from 'path'
import { PICPEAK_MIGRATION_MANIFEST } from '@/lib/picpeakMigrationManifest'

const vendorRoot = path.join(process.cwd(), 'vendor', 'picpeak')
const MIGRATION_PATH = path.join(
  vendorRoot,
  'backend/migrations/core/123_add_event_detail_fields.js',
)

// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration = require(MIGRATION_PATH)

// The columns on `events` relevant to PRD 22.4 that already exist before
// this migration runs: event_name/event_type (001_init.js), event_date/
// event_time_start/event_time_end (001_init.js, 107_crm_consolidated.js)
// and is_full_day (107_crm_consolidated.js). The real table also carries
// many columns unrelated to PRD 22.4 (gallery settings, watermarking,
// hero images, …) — irrelevant to this migration and omitted here.
const BASELINE_COLUMNS = [
  'id',
  'event_name',
  'event_type',
  'event_date',
  'event_time_start',
  'event_time_end',
  'is_full_day',
]

const NEW_COLUMNS = [
  'event_date_tbd',
  'venue_name',
  'venue_address',
  'venue_map_link',
  'coordinator_name',
  'coordinator_email',
  'coordinator_phone',
  'coverage_notes',
  'client_visible_notes',
  'internal_notes',
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
    text: (name: string) => { added.push(name); return chain },
    boolean: (name: string) => { added.push(name); return chain },
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
      return name === 'events'
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

describe('AC-38.2: migration 123 adds every missing PRD 22.4 event-detail field to `events`', () => {
  it('exports idempotent up/down functions', () => {
    expect(typeof migration.up).toBe('function')
    expect(typeof migration.down).toBe('function')
  })

  describe('up() against the pre-migration baseline', () => {
    const fake = makeFakeKnex(BASELINE_COLUMNS)

    beforeAll(async () => {
      await migration.up(fake.knex)
    })

    it('checks that `events` exists before altering it', () => {
      expect(fake.hasTableWasCalled()).toBe(true)
    })

    it('alters `events` exactly once', () => {
      expect(fake.alterTableCallCount()).toBe(1)
    })

    it('adds event_date_tbd (the explicit TBD state for date/time)', () => {
      expect(fake.lastAddedColumns()).toContain('event_date_tbd')
    })

    it('adds venue_name', () => {
      expect(fake.lastAddedColumns()).toContain('venue_name')
    })

    it('adds venue_address (full address)', () => {
      expect(fake.lastAddedColumns()).toContain('venue_address')
    })

    it('adds venue_map_link', () => {
      expect(fake.lastAddedColumns()).toContain('venue_map_link')
    })

    it('adds coordinator_name', () => {
      expect(fake.lastAddedColumns()).toContain('coordinator_name')
    })

    it('adds coordinator_email', () => {
      expect(fake.lastAddedColumns()).toContain('coordinator_email')
    })

    it('adds coordinator_phone', () => {
      expect(fake.lastAddedColumns()).toContain('coordinator_phone')
    })

    it('adds coverage_notes', () => {
      expect(fake.lastAddedColumns()).toContain('coverage_notes')
    })

    it('adds client_visible_notes', () => {
      expect(fake.lastAddedColumns()).toContain('client_visible_notes')
    })

    it('adds internal_notes', () => {
      expect(fake.lastAddedColumns()).toContain('internal_notes')
    })

    it('adds exactly these ten columns — no more, no fewer', () => {
      expect(fake.lastAddedColumns().sort()).toEqual([...NEW_COLUMNS].sort())
    })

    it('leaves every pre-existing baseline column untouched', () => {
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
      const fake = makeFakeKnex([...BASELINE_COLUMNS, 'venue_name', 'internal_notes'])
      await migration.up(fake.knex)
      expect(fake.alterTableCallCount()).toBe(1)
      expect(fake.lastAddedColumns()).not.toContain('venue_name')
      expect(fake.lastAddedColumns()).not.toContain('internal_notes')
      expect(fake.lastAddedColumns().sort()).toEqual(
        NEW_COLUMNS.filter((c) => c !== 'venue_name' && c !== 'internal_notes').sort(),
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
    it('drops all ten new columns, named individually', async () => {
      const fake = makeFakeKnex([...BASELINE_COLUMNS, ...NEW_COLUMNS])
      await migration.down(fake.knex)
      expect(fake.alterTableCallCount()).toBe(1)
      for (const column of NEW_COLUMNS) {
        expect(fake.lastDroppedColumns()).toContain(column)
      }
      expect(fake.lastDroppedColumns().sort()).toEqual([...NEW_COLUMNS].sort())
    })

    it('leaves the pre-existing baseline columns in place after down()', async () => {
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

describe('AC-38.2: PRD 22.4\'s ten named event-detail items, each against the column that carries it', () => {
  // Named exactly as PRD 22.4 lists them. Run against the state of `events`
  // after migration 123 has applied on top of the pre-migration baseline —
  // if any one item's column is absent here, this test fails.
  const ITEM_TO_COLUMNS: Array<{ item: string; columns: string[] }> = [
    { item: 'name/type', columns: ['event_name', 'event_type'] },
    { item: 'date/time or TBD', columns: ['event_date', 'event_time_start', 'event_time_end', 'event_date_tbd'] },
    { item: 'full-day state', columns: ['is_full_day'] },
    { item: 'venue name', columns: ['venue_name'] },
    { item: 'full address', columns: ['venue_address'] },
    { item: 'map link', columns: ['venue_map_link'] },
    { item: 'coordinator/contact', columns: ['coordinator_name', 'coordinator_email', 'coordinator_phone'] },
    { item: 'coverage notes', columns: ['coverage_notes'] },
    { item: 'client-visible notes', columns: ['client_visible_notes'] },
    { item: 'internal notes', columns: ['internal_notes'] },
  ]

  it('names exactly PRD 22.4\'s ten items — no more, no fewer', () => {
    expect(ITEM_TO_COLUMNS).toHaveLength(10)
  })

  let columnsAfterMigration: Set<string>

  beforeAll(async () => {
    const fake = makeFakeKnex(BASELINE_COLUMNS)
    await migration.up(fake.knex)
    columnsAfterMigration = fake.columnsPresent
  })

  it.each(ITEM_TO_COLUMNS)('"$item" is carried by a real column on `events`', ({ columns }) => {
    for (const column of columns) {
      expect(columnsAfterMigration.has(column)).toBe(true)
    }
  })

  it('every one of the ten items maps to at least one present column', () => {
    const missingItems = ITEM_TO_COLUMNS.filter(
      ({ columns }) => !columns.every((c) => columnsAfterMigration.has(c)),
    ).map(({ item }) => item)
    expect(missingItems).toEqual([])
  })

  it('the client-visible note and the internal note are two distinct columns', () => {
    const clientColumns = ITEM_TO_COLUMNS.find((i) => i.item === 'client-visible notes')!.columns
    const internalColumns = ITEM_TO_COLUMNS.find((i) => i.item === 'internal notes')!.columns
    expect(clientColumns).toEqual(['client_visible_notes'])
    expect(internalColumns).toEqual(['internal_notes'])
    expect(clientColumns[0]).not.toBe(internalColumns[0])
    expect(columnsAfterMigration.has('client_visible_notes')).toBe(true)
    expect(columnsAfterMigration.has('internal_notes')).toBe(true)
  })
})

describe('AC-38.2: migration 123 is registered as a fork-origin manifest entry', () => {
  const MANIFEST_PATH = 'backend/migrations/core/123_add_event_detail_fields.js'

  it('is recorded with origin "fork"', () => {
    const entry = PICPEAK_MIGRATION_MANIFEST.find((e) => e.path === MANIFEST_PATH)
    expect(entry).toBeDefined()
    expect(entry?.origin).toBe('fork')
  })

  it('is documented in FORK_CHANGELOG.md (required by the migration-integrity check)', () => {
    const changelog = fs.readFileSync(path.join(process.cwd(), 'FORK_CHANGELOG.md'), 'utf8')
    expect(changelog).toContain('123_add_event_detail_fields.js')
    expect(changelog).toMatch(/AC-38\.2/)
  })
})
