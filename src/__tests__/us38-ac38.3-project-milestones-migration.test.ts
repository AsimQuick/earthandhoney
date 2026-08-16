/**
 * ---
 * file: src/__tests__/us38-ac38.3-project-milestones-migration.test.ts
 * project: earthandhoney
 * purpose: Verify AC-38.3 — PRD 23.2's eighteen milestones are stored as
 *          data rows, not a hardcoded list inside a UI component, each
 *          carrying a completion state, a completion timestamp and the
 *          actor that completed it. New migration 124 creates
 *          `project_milestones` and seeds the eighteen as canonical
 *          template rows (`project_id IS NULL`). This suite drives the
 *          real vendored migration module's up()/down() against a fake
 *          knex (no live database needed), queries the seeded set back and
 *          asserts it by name against an independently-typed copy of PRD
 *          23.2's list with the count asserted as eighteen, and proves
 *          `src/lib/projectMilestones.ts`'s `getMilestoneDefinitions`
 *          reader returns whatever the underlying query yields — including
 *          a deliberately mutated row set that is not PRD 23.2 at all —
 *          rather than a literal list baked into the reader itself.
 * created-by: dev-team
 * related-story: US-38
 * related-ac: 38.3
 * ---
 */
import fs from 'fs'
import path from 'path'
import { PICPEAK_MIGRATION_MANIFEST } from '@/lib/picpeakMigrationManifest'
import {
  getMilestoneDefinitions,
  PROJECT_MILESTONES_TABLE,
  type MilestoneQueryClient,
} from '@/lib/projectMilestones'

const vendorRoot = path.join(process.cwd(), 'vendor', 'picpeak')
const MIGRATION_PATH = path.join(vendorRoot, 'backend/migrations/core/124_add_project_milestones.js')

// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration = require(MIGRATION_PATH)

// PRD 23.2, copied independently here from scrum-master/PRD.md (never
// imported from the migration or the reader module) so this suite
// genuinely checks the seeded set against the PRD's own wording rather
// than against itself.
const PRD_MILESTONE_NAMES = [
  'inquiry reviewed',
  'consultation completed, if used',
  'quote sent',
  'quote approved',
  'contract sent',
  'contract signed',
  'deposit invoice sent',
  'deposit paid',
  'booked',
  'dates and venues confirmed',
  'shoot completed',
  'images in production',
  'gallery ready',
  'final balance paid',
  'gallery released',
  'downloads completed',
  'gallery expired/archived',
  'project closed',
]

type Row = Record<string, unknown>

/** Chainable no-op recorder for knex's table-builder callback (createTable), recording every declared column name. */
function createTableRecorder() {
  const columns: string[] = []
  const columnMethods = ['string', 'integer', 'text', 'boolean', 'timestamp', 'increments']
  const chain: Record<string, unknown> = {}
  const proxy = new Proxy(chain, {
    get: (_target, prop) => {
      if (typeof prop !== 'string') return undefined
      return (...args: unknown[]) => {
        if (columnMethods.includes(prop) && typeof args[0] === 'string') {
          columns.push(args[0])
        }
        return proxy
      }
    },
  })
  return { table: proxy, columns }
}

/**
 * A fake knex supporting schema.createTable/hasTable/dropTable plus a
 * minimal query builder (whereNull/select/insert) over an in-memory
 * `project_milestones` row store — enough to drive the real migration
 * module's up()/down() without a live database.
 */
function makeFakeKnex(options: { tableExists?: boolean; seedRows?: Row[] } = {}) {
  let tableExists = options.tableExists ?? false
  let rows: Row[] = options.seedRows ? [...options.seedRows] : []
  let nextId = rows.length + 1
  let createTableCalls = 0
  let createdColumns: string[] = []
  const insertedBatches: Row[][] = []

  function tableQuery() {
    const predicates: Array<(r: Row) => boolean> = []
    const builder = {
      whereNull(column: string) {
        predicates.push((r) => r[column] === null || r[column] === undefined)
        return builder
      },
      select: async (...cols: string[]) => {
        const filtered = rows.filter((r) => predicates.every((p) => p(r)))
        if (cols.length === 0) return filtered
        return filtered.map((r) => {
          const picked: Row = {}
          for (const c of cols) picked[c] = r[c]
          return picked
        })
      },
      insert: async (data: Row | Row[]) => {
        const batch = Array.isArray(data) ? data : [data]
        insertedBatches.push(batch)
        for (const r of batch) rows.push({ id: nextId++, ...r })
      },
    }
    return builder
  }

  const knex = ((tableName: string) => {
    if (tableName !== 'project_milestones') throw new Error(`unexpected table ${tableName}`)
    return tableQuery()
  }) as unknown as {
    (tableName: string): ReturnType<typeof tableQuery>
    schema: Record<string, unknown>
    fn: { now: () => string }
  }

  knex.schema = {
    hasTable: async () => tableExists,
    createTable: async (_name: string, cb: (t: unknown) => void) => {
      createTableCalls += 1
      const { table, columns } = createTableRecorder()
      cb(table)
      createdColumns = columns
      tableExists = true
    },
    dropTable: async () => {
      tableExists = false
      rows = []
    },
  }
  knex.fn = { now: () => 'NOW()' }

  return {
    knex,
    rows: () => rows,
    tableExists: () => tableExists,
    createTableCalls: () => createTableCalls,
    createdColumns: () => createdColumns,
    insertedBatches: () => insertedBatches,
  }
}

describe("AC-38.3: migration 124 creates `project_milestones` and seeds PRD 23.2's eighteen milestones", () => {
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
        'project_id',
        'milestone_key',
        'name',
        'sequence_order',
        'completion_state',
        'completed_at',
        'completed_by',
      ]) {
        expect(fake.createdColumns()).toContain(column)
      }
    })

    it('seeds exactly eighteen template rows (project_id null)', () => {
      const templates = fake.rows().filter((r) => r.project_id === null || r.project_id === undefined)
      expect(templates).toHaveLength(18)
    })

    it('every seeded row carries completion_state "pending" and null completed_at/completed_by', () => {
      for (const row of fake.rows()) {
        expect(row.completion_state).toBe('pending')
        expect(row.completed_at).toBeNull()
        expect(row.completed_by).toBeNull()
      }
    })

    it("the eighteen seeded names match PRD 23.2's list exactly, in order", () => {
      const names = fake
        .rows()
        .slice()
        .sort((a, b) => (a.sequence_order as number) - (b.sequence_order as number))
        .map((r) => r.name)
      expect(names).toEqual(PRD_MILESTONE_NAMES)
    })

    it('sequence_order runs 1..18 with no gap or repeat', () => {
      const orders = fake
        .rows()
        .map((r) => r.sequence_order as number)
        .sort((a, b) => a - b)
      expect(orders).toEqual(Array.from({ length: 18 }, (_, i) => i + 1))
    })
  })

  describe('idempotency: up() is a no-op once the eighteen templates already exist', () => {
    it('inserts nothing on a second run', async () => {
      const first = makeFakeKnex()
      await migration.up(first.knex)

      const second = makeFakeKnex({ tableExists: true, seedRows: first.rows() })
      await migration.up(second.knex)

      expect(second.insertedBatches()).toHaveLength(0)
      expect(second.rows()).toHaveLength(18)
    })

    it('does not call createTable again when the table already exists', async () => {
      const first = makeFakeKnex()
      await migration.up(first.knex)

      const second = makeFakeKnex({ tableExists: true, seedRows: first.rows() })
      await migration.up(second.knex)

      expect(second.createTableCalls()).toBe(0)
    })

    it('inserts only the still-missing templates when partially seeded', async () => {
      const first = makeFakeKnex()
      await migration.up(first.knex)
      const partial = first.rows().filter((r) => r.milestone_key !== 'project_closed')

      const second = makeFakeKnex({ tableExists: true, seedRows: partial })
      await migration.up(second.knex)

      expect(second.insertedBatches()).toHaveLength(1)
      expect(second.insertedBatches()[0]).toHaveLength(1)
      expect(second.insertedBatches()[0][0].milestone_key).toBe('project_closed')
      expect(second.rows()).toHaveLength(18)
    })
  })

  describe('down() drops the table', () => {
    it('drops project_milestones when it exists', async () => {
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

describe("AC-38.3: PRD 23.2's eighteen milestones, asserted by name against the PRD's own list", () => {
  it('the PRD list this test asserts against is exactly eighteen items long', () => {
    expect(PRD_MILESTONE_NAMES).toHaveLength(18)
  })

  let seededNames: string[]

  beforeAll(async () => {
    const fake = makeFakeKnex()
    await migration.up(fake.knex)
    seededNames = fake
      .rows()
      .slice()
      .sort((a, b) => (a.sequence_order as number) - (b.sequence_order as number))
      .map((r) => r.name as string)
  })

  it('the database-seeded set has count eighteen', () => {
    expect(seededNames).toHaveLength(18)
  })

  it.each(PRD_MILESTONE_NAMES)('PRD milestone "%s" is present among the seeded rows', (name) => {
    expect(seededNames).toContain(name)
  })

  it('the seeded set is exactly the PRD list — no extra, no missing, no renamed entry', () => {
    expect([...seededNames].sort()).toEqual([...PRD_MILESTONE_NAMES].sort())
  })
})

describe('AC-38.3: migration 124 is registered as a fork-origin manifest entry', () => {
  const MANIFEST_PATH = 'backend/migrations/core/124_add_project_milestones.js'

  it('is recorded with origin "fork"', () => {
    const entry = PICPEAK_MIGRATION_MANIFEST.find((e) => e.path === MANIFEST_PATH)
    expect(entry).toBeDefined()
    expect(entry?.origin).toBe('fork')
  })

  it('is documented in FORK_CHANGELOG.md (required by the migration-integrity check)', () => {
    const changelog = fs.readFileSync(path.join(process.cwd(), 'FORK_CHANGELOG.md'), 'utf8')
    expect(changelog).toContain('124_add_project_milestones.js')
    expect(changelog).toMatch(/AC-38\.3/)
  })
})

describe('AC-38.3: getMilestoneDefinitions (src/lib/projectMilestones.ts) reads the rows rather than a literal', () => {
  function fakeQueryClient(seedRows: Row[]): MilestoneQueryClient {
    return ((table: string) => {
      if (table !== PROJECT_MILESTONES_TABLE) throw new Error(`unexpected table ${table}`)
      let filtered = seedRows
      const builder = {
        whereNull(column: string) {
          filtered = filtered.filter((r) => r[column] === null || r[column] === undefined)
          return builder
        },
        orderBy(column: string, direction: string) {
          filtered = [...filtered].sort((a, b) => {
            const diff = (a[column] as number) - (b[column] as number)
            return direction === 'desc' ? -diff : diff
          })
          return builder
        },
        select: async (...cols: string[]) =>
          filtered.map((r) => {
            const picked: Row = {}
            for (const c of cols) picked[c] = r[c]
            return picked
          }),
      }
      return builder
    }) as unknown as MilestoneQueryClient
  }

  it('reading the migration-shaped seed returns exactly the eighteen PRD names, in order', async () => {
    const fake = makeFakeKnex()
    await migration.up(fake.knex)

    const defs = await getMilestoneDefinitions(fakeQueryClient(fake.rows()))

    expect(defs).toHaveLength(18)
    expect(defs.map((d) => d.name)).toEqual(PRD_MILESTONE_NAMES)
    expect(defs.every((d) => d.completionState === 'pending')).toBe(true)
    expect(defs.every((d) => d.completedAt === null && d.completedBy === null)).toBe(true)
  })

  it('reading a deliberately DIFFERENT row set — not PRD 23.2 at all — returns exactly that set, proving the reader has no hardcoded milestone list of its own', async () => {
    const mutatedRows: Row[] = [
      {
        id: 1,
        project_id: null,
        milestone_key: 'zzz_custom_one',
        name: 'a completely made-up milestone',
        sequence_order: 2,
        completion_state: 'complete',
        completed_at: '2026-08-16T00:00:00.000Z',
        completed_by: 'photographer@earthandhoney.test',
      },
      {
        id: 2,
        project_id: null,
        milestone_key: 'zzz_custom_two',
        name: 'another made-up milestone',
        sequence_order: 1,
        completion_state: 'pending',
        completed_at: null,
        completed_by: null,
      },
      {
        id: 3,
        project_id: 7,
        milestone_key: 'inquiry_reviewed',
        name: 'inquiry reviewed',
        sequence_order: 1,
        completion_state: 'pending',
        completed_at: null,
        completed_by: null,
      },
    ]

    const defs = await getMilestoneDefinitions(fakeQueryClient(mutatedRows))

    // Only the two project_id-null rows come back, ordered by
    // sequence_order — the reader neither filters by name nor falls back
    // to PRD 23.2's list.
    expect(defs).toHaveLength(2)
    expect(defs.map((d) => d.name)).toEqual(['another made-up milestone', 'a completely made-up milestone'])
    expect(defs.map((d) => d.milestoneKey)).toEqual(['zzz_custom_two', 'zzz_custom_one'])
    expect(defs[0].completionState).toBe('pending')
    expect(defs[1].completionState).toBe('complete')
    expect(defs[1].completedAt).toBe('2026-08-16T00:00:00.000Z')
    expect(defs[1].completedBy).toBe('photographer@earthandhoney.test')
    // And it is NOT the PRD 23.2 set — a hardcoded reader could not produce this.
    expect(defs.map((d) => d.name)).not.toEqual(PRD_MILESTONE_NAMES)
  })

  it('returns an empty array when the database holds no template rows, rather than falling back to a built-in eighteen', async () => {
    const defs = await getMilestoneDefinitions(fakeQueryClient([]))
    expect(defs).toEqual([])
  })
})

describe("AC-38.3: src/lib/projectMilestones.ts contains no hardcoded copy of PRD 23.2's milestone names", () => {
  it('the reader module source contains none of the eighteen PRD milestone name strings', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/lib/projectMilestones.ts'), 'utf8')
    for (const name of PRD_MILESTONE_NAMES) {
      expect(source).not.toContain(name)
    }
  })
})
