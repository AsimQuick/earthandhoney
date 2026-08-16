/**
 * ---
 * file: src/__tests__/us39-ac39.2-booking-rule.test.ts
 * project: earthandhoney
 * purpose: Verify AC-39.2 — the booking rule is evaluated from milestone
 *          completion, not hardcoded. Drives the real vendored migration
 *          126 module's up()/down() against a fake knex (no live database
 *          needed) to prove `project_booking_requirements` is created and
 *          seeded with PRD 23.2's normal-case three requirements as
 *          template rows; proves `src/lib/bookingRule.ts`'s
 *          `evaluateBookingRule` predicate books a Project only once every
 *          member of a configured requirement set is complete — completing
 *          each of the three default milestones independently, plus a
 *          non-default (different, non-three) requirement set; and proves
 *          `getBookingRequirements`/`isProjectBooked` read that
 *          configuration and completion state from a fake DB rather than
 *          from a literal baked into the module. Sprint 6 note (AC-39.2):
 *          every milestone-completion fixture here represents a human or
 *          admin action — the ledger and Stripe integration are PRD Phase
 *          6 — so nothing in this suite claims a verified payment drove any
 *          transition.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.2
 * ---
 */
import fs from 'fs'
import path from 'path'
import { PICPEAK_MIGRATION_MANIFEST } from '@/lib/picpeakMigrationManifest'
import {
  evaluateBookingRule,
  getBookingRequirements,
  isProjectBooked,
  PROJECT_BOOKING_REQUIREMENTS_TABLE,
  PROJECT_MILESTONES_TABLE,
  type BookingQueryClient,
} from '@/lib/bookingRule'

const vendorRoot = path.join(process.cwd(), 'vendor', 'picpeak')
const MIGRATION_PATH = path.join(vendorRoot, 'backend/migrations/core/126_add_project_booking_requirements.js')

// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration = require(MIGRATION_PATH)

// PRD 23.2's "normal case", copied independently here (never imported from
// the migration or bookingRule.ts) so this suite genuinely checks the
// seeded configuration against the PRD's own wording.
const DEFAULT_REQUIREMENTS = ['quote_approved', 'contract_signed', 'deposit_paid']

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
 * `project_booking_requirements` row store — enough to drive the real
 * migration module's up()/down() without a live database.
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
    if (tableName !== 'project_booking_requirements') throw new Error(`unexpected table ${tableName}`)
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

describe('AC-39.2: migration 126 creates `project_booking_requirements` and seeds PRD 23.2\'s normal-case three', () => {
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
      for (const column of ['project_id', 'milestone_key', 'created_at']) {
        expect(fake.createdColumns()).toContain(column)
      }
    })

    it('seeds exactly the three default template rows (project_id null)', () => {
      const templates = fake.rows().filter((r) => r.project_id === null || r.project_id === undefined)
      expect(templates).toHaveLength(3)
      expect(templates.map((r) => r.milestone_key).sort()).toEqual([...DEFAULT_REQUIREMENTS].sort())
    })
  })

  describe('idempotency: up() is a no-op once the three templates already exist', () => {
    it('inserts nothing on a second run', async () => {
      const first = makeFakeKnex()
      await migration.up(first.knex)

      const second = makeFakeKnex({ tableExists: true, seedRows: first.rows() })
      await migration.up(second.knex)

      expect(second.insertedBatches()).toHaveLength(0)
      expect(second.rows()).toHaveLength(3)
    })

    it('inserts only the still-missing templates when partially seeded', async () => {
      const first = makeFakeKnex()
      await migration.up(first.knex)
      const partial = first.rows().filter((r) => r.milestone_key !== 'deposit_paid')

      const second = makeFakeKnex({ tableExists: true, seedRows: partial })
      await migration.up(second.knex)

      expect(second.insertedBatches()).toHaveLength(1)
      expect(second.insertedBatches()[0]).toHaveLength(1)
      expect(second.insertedBatches()[0][0].milestone_key).toBe('deposit_paid')
      expect(second.rows()).toHaveLength(3)
    })
  })

  describe('down() drops the table', () => {
    it('drops project_booking_requirements when it exists', async () => {
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

describe('AC-39.2: migration 126 is registered as a fork-origin manifest entry', () => {
  const MANIFEST_PATH = 'backend/migrations/core/126_add_project_booking_requirements.js'

  it('is recorded with origin "fork"', () => {
    const entry = PICPEAK_MIGRATION_MANIFEST.find((e) => e.path === MANIFEST_PATH)
    expect(entry).toBeDefined()
    expect(entry?.origin).toBe('fork')
  })

  it('is documented in FORK_CHANGELOG.md (required by the migration-integrity check)', () => {
    const changelog = fs.readFileSync(path.join(process.cwd(), 'FORK_CHANGELOG.md'), 'utf8')
    expect(changelog).toContain('126_add_project_booking_requirements.js')
    expect(changelog).toMatch(/AC-39\.2/)
  })
})

describe('AC-39.2: evaluateBookingRule is a pure predicate over configured vs completed milestone keys', () => {
  describe('the default (normal-case) requirement set: quote approved + contract signed + deposit paid', () => {
    it.each([
      { completed: [], expected: false, label: 'none complete' },
      { completed: ['quote_approved'], expected: false, label: 'only quote_approved complete' },
      { completed: ['contract_signed'], expected: false, label: 'only contract_signed complete' },
      { completed: ['deposit_paid'], expected: false, label: 'only deposit_paid complete' },
      { completed: ['quote_approved', 'contract_signed'], expected: false, label: 'quote_approved + contract_signed, deposit_paid missing' },
      { completed: ['quote_approved', 'deposit_paid'], expected: false, label: 'quote_approved + deposit_paid, contract_signed missing' },
      { completed: ['contract_signed', 'deposit_paid'], expected: false, label: 'contract_signed + deposit_paid, quote_approved missing' },
      { completed: ['quote_approved', 'contract_signed', 'deposit_paid'], expected: true, label: 'all three complete' },
    ])('$label -> Booked === $expected', ({ completed, expected }) => {
      expect(evaluateBookingRule(DEFAULT_REQUIREMENTS, completed)).toBe(expected)
    })

    it('extra, unrelated completed milestones do not affect the result', () => {
      const completed = [...DEFAULT_REQUIREMENTS, 'shoot_completed', 'gallery_ready']
      expect(evaluateBookingRule(DEFAULT_REQUIREMENTS, completed)).toBe(true)
      expect(evaluateBookingRule(DEFAULT_REQUIREMENTS, ['shoot_completed', 'gallery_ready'])).toBe(false)
    })
  })

  describe('a non-default requirement set (not the normal-case three)', () => {
    const NON_DEFAULT_REQUIREMENTS = ['quote_approved', 'dates_venues_confirmed']

    it('is not Booked when the default three are complete but the configured set is not', () => {
      // All of quote_approved/contract_signed/deposit_paid complete — the
      // default-case requirement — but this Project's configured
      // requirement set additionally needs dates_venues_confirmed, which is
      // not complete, and does not need contract_signed at all.
      const completed = ['quote_approved', 'contract_signed', 'deposit_paid']
      expect(evaluateBookingRule(NON_DEFAULT_REQUIREMENTS, completed)).toBe(false)
    })

    it('is Booked once its own configured set is complete, even without contract_signed or deposit_paid', () => {
      const completed = ['quote_approved', 'dates_venues_confirmed']
      expect(evaluateBookingRule(NON_DEFAULT_REQUIREMENTS, completed)).toBe(true)
    })
  })

  it('an empty configured requirement set is never Booked (unconfigured, not vacuously true)', () => {
    expect(evaluateBookingRule([], [])).toBe(false)
    expect(evaluateBookingRule([], ['quote_approved', 'contract_signed', 'deposit_paid'])).toBe(false)
  })
})

/**
 * A fake DB over `project_booking_requirements` and `project_milestones`,
 * supporting where()/whereNull()/select() — enough to drive
 * getBookingRequirements/isProjectBooked. Rows are mutated in place so a
 * test can simulate a milestone being completed between assertions.
 */
function makeFakeBookingDb(seed: { [table: string]: Row[] }) {
  const store: { [table: string]: Row[] } = {}
  for (const [table, rows] of Object.entries(seed)) {
    store[table] = rows.map((r) => ({ ...r }))
  }

  const client = ((table: string) => {
    const rows = store[table] ?? []
    const predicates: Array<(r: Row) => boolean> = []
    const builder = {
      where(column: string, value: unknown) {
        predicates.push((r) => r[column] === value)
        return builder
      },
      whereNull(column: string) {
        predicates.push((r) => r[column] === null || r[column] === undefined)
        return builder
      },
      select: async (...cols: string[]) => {
        const filtered = rows.filter((r) => predicates.every((p) => p(r)))
        return filtered.map((r) => {
          const picked: Row = {}
          for (const c of cols) picked[c] = r[c]
          return picked
        })
      },
    }
    return builder
  }) as unknown as BookingQueryClient

  return {
    client,
    completeMilestone(projectId: number, milestoneKey: string) {
      const rows = store[PROJECT_MILESTONES_TABLE] ?? []
      const row = rows.find((r) => r.project_id === projectId && r.milestone_key === milestoneKey)
      if (!row) throw new Error(`no fixture row for project ${projectId} / ${milestoneKey}`)
      row.completion_state = 'complete'
    },
  }
}

function projectMilestoneFixture(projectId: number, milestoneKeys: string[]): Row[] {
  return milestoneKeys.map((milestone_key) => ({
    project_id: projectId,
    milestone_key,
    completion_state: 'pending',
  }))
}

describe('AC-39.2: getBookingRequirements reads configuration from the DB, not a built-in list', () => {
  const TEMPLATE_ROWS: Row[] = DEFAULT_REQUIREMENTS.map((milestone_key) => ({ project_id: null, milestone_key }))

  it("a Project with no override rows uses the default template three", async () => {
    const db = makeFakeBookingDb({ [PROJECT_BOOKING_REQUIREMENTS_TABLE]: TEMPLATE_ROWS })
    const requirements = await getBookingRequirements(db.client, 501)
    expect(requirements.sort()).toEqual([...DEFAULT_REQUIREMENTS].sort())
  })

  it('a Project with its own override rows uses exactly those, ignoring the default template', async () => {
    const overrideRows: Row[] = [
      { project_id: 502, milestone_key: 'quote_approved' },
      { project_id: 502, milestone_key: 'dates_venues_confirmed' },
    ]
    const db = makeFakeBookingDb({
      [PROJECT_BOOKING_REQUIREMENTS_TABLE]: [...TEMPLATE_ROWS, ...overrideRows],
    })
    const requirements = await getBookingRequirements(db.client, 502)
    expect(requirements.sort()).toEqual(['dates_venues_confirmed', 'quote_approved'])
  })

  it("one Project's override rows do not leak into another Project's read", async () => {
    const overrideRows: Row[] = [{ project_id: 502, milestone_key: 'contract_signed' }]
    const db = makeFakeBookingDb({
      [PROJECT_BOOKING_REQUIREMENTS_TABLE]: [...TEMPLATE_ROWS, ...overrideRows],
    })
    const requirementsForOtherProject = await getBookingRequirements(db.client, 999)
    expect(requirementsForOtherProject.sort()).toEqual([...DEFAULT_REQUIREMENTS].sort())
  })

  it('returns an empty array when neither an override nor a template row exists, rather than a built-in fallback', async () => {
    const db = makeFakeBookingDb({ [PROJECT_BOOKING_REQUIREMENTS_TABLE]: [] })
    const requirements = await getBookingRequirements(db.client, 503)
    expect(requirements).toEqual([])
  })
})

describe('AC-39.2: isProjectBooked — a Project becomes Booked only once every configured requirement is complete', () => {
  const TEMPLATE_ROWS: Row[] = DEFAULT_REQUIREMENTS.map((milestone_key) => ({ project_id: null, milestone_key }))

  it.each(DEFAULT_REQUIREMENTS)(
    'completing "%s" alone (the other two still pending) does not book the default-configured Project',
    async (milestoneKey) => {
      const projectId = 601
      const db = makeFakeBookingDb({
        [PROJECT_BOOKING_REQUIREMENTS_TABLE]: TEMPLATE_ROWS,
        [PROJECT_MILESTONES_TABLE]: projectMilestoneFixture(projectId, DEFAULT_REQUIREMENTS),
      })

      db.completeMilestone(projectId, milestoneKey)

      expect(await isProjectBooked(db.client, projectId)).toBe(false)
    },
  )

  it('completing two of the three default requirements still does not book the Project', async () => {
    const projectId = 602
    const db = makeFakeBookingDb({
      [PROJECT_BOOKING_REQUIREMENTS_TABLE]: TEMPLATE_ROWS,
      [PROJECT_MILESTONES_TABLE]: projectMilestoneFixture(projectId, DEFAULT_REQUIREMENTS),
    })

    db.completeMilestone(projectId, 'quote_approved')
    expect(await isProjectBooked(db.client, projectId)).toBe(false)

    db.completeMilestone(projectId, 'contract_signed')
    expect(await isProjectBooked(db.client, projectId)).toBe(false)
  })

  it('the Project becomes Booked exactly when the third and final default requirement completes', async () => {
    const projectId = 602
    const db = makeFakeBookingDb({
      [PROJECT_BOOKING_REQUIREMENTS_TABLE]: TEMPLATE_ROWS,
      [PROJECT_MILESTONES_TABLE]: projectMilestoneFixture(projectId, DEFAULT_REQUIREMENTS),
    })

    db.completeMilestone(projectId, 'quote_approved')
    db.completeMilestone(projectId, 'contract_signed')
    expect(await isProjectBooked(db.client, projectId)).toBe(false)

    db.completeMilestone(projectId, 'deposit_paid')
    expect(await isProjectBooked(db.client, projectId)).toBe(true)
  })

  it('a non-default requirement set books the Project from its own configured milestones, independent of the default three', async () => {
    const projectId = 700
    const nonDefaultRequirements = ['contract_signed', 'dates_venues_confirmed']
    const overrideRows: Row[] = nonDefaultRequirements.map((milestone_key) => ({ project_id: projectId, milestone_key }))
    const db = makeFakeBookingDb({
      [PROJECT_BOOKING_REQUIREMENTS_TABLE]: [...TEMPLATE_ROWS, ...overrideRows],
      [PROJECT_MILESTONES_TABLE]: projectMilestoneFixture(projectId, [
        'quote_approved',
        'contract_signed',
        'deposit_paid',
        'dates_venues_confirmed',
      ]),
    })

    // All of the default three complete, but this Project does not require
    // quote_approved or deposit_paid, and does require dates_venues_confirmed.
    db.completeMilestone(projectId, 'quote_approved')
    db.completeMilestone(projectId, 'contract_signed')
    db.completeMilestone(projectId, 'deposit_paid')
    expect(await isProjectBooked(db.client, projectId)).toBe(false)

    db.completeMilestone(projectId, 'dates_venues_confirmed')
    expect(await isProjectBooked(db.client, projectId)).toBe(true)
  })
})

describe('AC-39.2: src/lib/bookingRule.ts contains no hardcoded booking-requirement milestone key', () => {
  it('the module source contains none of the default requirement key literals', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/lib/bookingRule.ts'), 'utf8')
    for (const key of DEFAULT_REQUIREMENTS) {
      expect(source).not.toContain(`'${key}'`)
      expect(source).not.toContain(`"${key}"`)
    }
  })
})
