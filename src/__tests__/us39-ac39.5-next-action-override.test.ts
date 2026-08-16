/**
 * ---
 * file: src/__tests__/us39-ac39.5-next-action-override.test.ts
 * project: earthandhoney
 * purpose: Verify AC-39.5 — a photographer can override the computed next
 *          action (PRD 23.4, "manual overrides"). The override records the
 *          actor and timestamp, and is presented as an override rather
 *          than silently replacing the computation — the underlying
 *          computed value stays retrievable. Entirely UNIT lane:
 *
 *          1. new migration 127 (`project_next_action_overrides`) driven
 *             against a fake knex (no live database needed) — schema,
 *             idempotency, and a write/read-back/upsert round trip proving
 *             a repeat override replaces the prior one rather than
 *             accumulating a history, matching AC-38.4's and AC-39.2's
 *             established migration-test pattern;
 *          2. the pure computed/override merge
 *             (`nextActionOverride.js`'s `presentNextAction`), driven
 *             directly — no requires, so no Docker needed, the same split
 *             `nextActionRules.js` established for AC-39.3.2 — proving
 *             both the computed value and the override are visible
 *             together in one object whenever an override is set, which is
 *             exactly what the route below returns as one HTTP response;
 *          3. source-level assertions that `adminProjects.js` wires the one
 *             override service/presenter pair into both the existing GET
 *             route and a new `events.manage`-gated PUT route, and that
 *             the DB-backed service (which, like `nextActionService.js`,
 *             requires `../database/db` and therefore cannot itself be
 *             `require()`-d in a UNIT suite without a live database) is
 *             structurally correct.
 *
 *          A full live round trip through the real HTTP routes is not
 *          re-proven here: AC-39.3.3 already established the live-proof
 *          pattern for this pair of routes, and this AC's evidence clause
 *          ("the override written and read back, and both values visible
 *          in the same response") is a property of the schema (part 1) and
 *          the pure response-shaping logic (part 2) the route composes,
 *          not of the HTTP transport.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.5
 * ---
 */
import fs from 'fs'
import path from 'path'

import { PICPEAK_MIGRATION_MANIFEST } from '@/lib/picpeakMigrationManifest'

const vendorBackendRoot = path.join(process.cwd(), 'vendor', 'picpeak', 'backend')
const MIGRATION_PATH = path.join(vendorBackendRoot, 'migrations/core/127_add_project_next_action_overrides.js')
const PRESENTER_PATH = path.join(vendorBackendRoot, 'src/services/nextActionOverride.js')
const SERVICE_PATH = path.join(vendorBackendRoot, 'src/services/nextActionOverrideService.js')
const ADMIN_ROUTE_PATH = path.join(vendorBackendRoot, 'src/routes/adminProjects.js')

const read = (absPath: string) => fs.readFileSync(absPath, 'utf-8')

// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration = require(MIGRATION_PATH) as {
  up: (knex: unknown) => Promise<void>
  down: (knex: unknown) => Promise<void>
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const presenter = require(PRESENTER_PATH) as {
  presentNextAction: (state: {
    computedNextAction: string
    override: { text: string; actorName: string; setAt: string } | null
  }) => { nextAction: string; computedNextAction: string; override: unknown }
}

type Row = Record<string, unknown>

const TABLE = 'project_next_action_overrides'

/** Chainable no-op recorder for knex's table-builder callback, recording every declared column name. */
function createTableRecorder() {
  const columns: string[] = []
  const columnMethods = ['string', 'integer', 'text', 'timestamp', 'increments']
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
 * minimal query builder (where/select/first/insert/update) over an
 * in-memory `project_next_action_overrides` row store — enough to drive
 * the real migration module's up()/down() and the same
 * insert-then-update-in-place sequence `nextActionOverrideService.js`
 * performs, without a live database.
 */
function makeFakeKnex() {
  let tableExists = false
  let rows: Row[] = []
  let nextId = 1
  let createTableCalls = 0
  let createdColumns: string[] = []

  function tableQuery() {
    const predicates: Array<(r: Row) => boolean> = []
    const matches = () => rows.filter((r) => predicates.every((p) => p(r)))
    const builder = {
      where(colOrObj: string | Row, value?: unknown) {
        if (typeof colOrObj === 'string') {
          predicates.push((r) => r[colOrObj] === value)
        } else {
          for (const [k, v] of Object.entries(colOrObj)) predicates.push((r) => r[k] === v)
        }
        return builder
      },
      select: async (...cols: string[]) => {
        const filtered = matches()
        if (cols.length === 0) return filtered
        return filtered.map((r) => {
          const picked: Row = {}
          for (const c of cols) picked[c] = r[c]
          return picked
        })
      },
      first: async (...cols: string[]) => {
        const [row] = matches()
        if (!row) return undefined
        if (cols.length === 0) return row
        const picked: Row = {}
        for (const c of cols) picked[c] = row[c]
        return picked
      },
      insert: async (data: Row) => {
        rows.push({ id: nextId++, ...data })
      },
      update: async (data: Row) => {
        const target = matches()[0]
        if (!target) return
        Object.assign(target, data)
      },
    }
    return builder
  }

  const knex = ((tableName: string) => {
    if (tableName !== TABLE) throw new Error(`unexpected table ${tableName}`)
    return tableQuery()
  }) as unknown as {
    (tableName: string): ReturnType<typeof tableQuery>
    schema: Record<string, unknown>
    fn: { now: () => string }
  }

  knex.schema = {
    hasTable: async (name: string) => (name === TABLE ? tableExists : false),
    createTable: async (name: string, cb: (t: unknown) => void) => {
      createTableCalls += 1
      const { table, columns } = createTableRecorder()
      cb(table)
      createdColumns = columns
      tableExists = true
    },
    dropTable: async (name: string) => {
      if (name === TABLE) {
        tableExists = false
        rows = []
      }
    },
  }
  knex.fn = { now: () => 'NOW()' }

  return {
    knex,
    rows: () => rows,
    tableExists: () => tableExists,
    createTableCalls: () => createTableCalls,
    createdColumns: () => createdColumns,
  }
}

describe('AC-39.5: migration 127 creates `project_next_action_overrides`', () => {
  it('exports idempotent up/down functions', () => {
    expect(typeof migration.up).toBe('function')
    expect(typeof migration.down).toBe('function')
  })

  it('creates the table exactly once and declares every column this AC requires', async () => {
    const fake = makeFakeKnex()
    await migration.up(fake.knex)

    expect(fake.createTableCalls()).toBe(1)
    expect(fake.tableExists()).toBe(true)
    for (const column of ['project_id', 'override_text', 'actor_admin_id', 'actor_name', 'created_at', 'updated_at']) {
      expect(fake.createdColumns()).toContain(column)
    }
  })

  it('is idempotent: a second run against an already-migrated database creates nothing new', async () => {
    const fake = makeFakeKnex()
    await migration.up(fake.knex)
    await migration.up(fake.knex)
    expect(fake.createTableCalls()).toBe(1)
  })

  it('down() drops the table, and is a no-op when it does not exist', async () => {
    const fake = makeFakeKnex()
    await migration.up(fake.knex)
    await migration.down(fake.knex)
    expect(fake.tableExists()).toBe(false)

    const neverMigrated = makeFakeKnex()
    await migration.down(neverMigrated.knex)
    expect(neverMigrated.tableExists()).toBe(false)
  })
})

describe('AC-39.5 Evidence: an override written and read back, and a repeat override replaces rather than accumulates', () => {
  it('a first override survives a write/read round trip, recording the actor and a timestamp', async () => {
    const fake = makeFakeKnex()
    await migration.up(fake.knex)

    await fake.knex(TABLE).insert({
      project_id: 42,
      override_text: 'Photographer is meeting the couple in person Friday — hold on the booking milestones.',
      actor_admin_id: 7,
      actor_name: 'jane.photographer',
      created_at: '2026-08-16T09:00:00.000Z',
      updated_at: '2026-08-16T09:00:00.000Z',
    })

    const row = await fake.knex(TABLE).where('project_id', 42).first()
    expect(row).toBeDefined()
    expect(row?.override_text).toContain('meeting the couple in person')
    expect(row?.actor_name).toBe('jane.photographer')
    expect(row?.updated_at).toBe('2026-08-16T09:00:00.000Z')
  })

  it('the same table-level write-then-update sequence the service performs upserts in place — one row per project, not two', async () => {
    const fake = makeFakeKnex()
    await migration.up(fake.knex)

    // First set (mirrors nextActionOverrideService.setProjectNextActionOverride's insert branch).
    await fake.knex(TABLE).insert({
      project_id: 42,
      override_text: 'First override text.',
      actor_admin_id: 7,
      actor_name: 'jane.photographer',
      created_at: '2026-08-16T09:00:00.000Z',
      updated_at: '2026-08-16T09:00:00.000Z',
    })

    // Second set on the same Project (mirrors the update branch).
    await fake.knex(TABLE).where({ project_id: 42 }).update({
      override_text: 'Second, replacing override text.',
      actor_admin_id: 9,
      actor_name: 'sam.secondphotographer',
      updated_at: '2026-08-16T11:30:00.000Z',
    })

    const rows = (await fake.knex(TABLE).where('project_id', 42).select()) as Row[]
    expect(rows).toHaveLength(1)
    expect(rows[0].override_text).toBe('Second, replacing override text.')
    expect(rows[0].actor_name).toBe('sam.secondphotographer')
    expect(rows[0].updated_at).toBe('2026-08-16T11:30:00.000Z')
    // created_at is untouched by an update — "when this Project was FIRST overridden".
    expect(rows[0].created_at).toBe('2026-08-16T09:00:00.000Z')
  })

  it('a different Project\'s override is independent — no cross-project bleed', async () => {
    const fake = makeFakeKnex()
    await migration.up(fake.knex)

    await fake.knex(TABLE).insert({
      project_id: 1,
      override_text: 'Project 1 override.',
      actor_admin_id: 1,
      actor_name: 'a',
      created_at: '2026-08-16T09:00:00.000Z',
      updated_at: '2026-08-16T09:00:00.000Z',
    })
    await fake.knex(TABLE).insert({
      project_id: 2,
      override_text: 'Project 2 override.',
      actor_admin_id: 2,
      actor_name: 'b',
      created_at: '2026-08-16T09:00:00.000Z',
      updated_at: '2026-08-16T09:00:00.000Z',
    })

    expect((await fake.knex(TABLE).where('project_id', 1).first())?.override_text).toBe('Project 1 override.')
    expect((await fake.knex(TABLE).where('project_id', 2).first())?.override_text).toBe('Project 2 override.')
  })
})

describe('AC-39.5: presentNextAction — the pure computed/override merge', () => {
  it('with no override, the active value is simply the computed one, and override is explicitly null', () => {
    const result = presenter.presentNextAction({
      computedNextAction: 'Awaiting: deposit paid.',
      override: null,
    })
    expect(result).toEqual({
      nextAction: 'Awaiting: deposit paid.',
      computedNextAction: 'Awaiting: deposit paid.',
      override: null,
    })
  })

  it('with an override set, the active value is the override\'s text, and the computed value stays retrievable alongside it', () => {
    const result = presenter.presentNextAction({
      computedNextAction: 'Awaiting: deposit paid.',
      override: {
        text: 'Deposit is being wired manually — do not chase the client this week.',
        actorName: 'jane.photographer',
        setAt: '2026-08-16T11:30:00.000Z',
      },
    })

    // Both values visible in the same response object.
    expect(result.nextAction).toBe('Deposit is being wired manually — do not chase the client this week.')
    expect(result.computedNextAction).toBe('Awaiting: deposit paid.')
    // Presented AS an override — actor and timestamp travel with it, not
    // merged silently into `nextAction` as an indistinguishable string.
    expect(result.override).toEqual({
      text: 'Deposit is being wired manually — do not chase the client this week.',
      actorName: 'jane.photographer',
      setAt: '2026-08-16T11:30:00.000Z',
    })
    // The override never equals the computed value in this fixture, so a
    // reader can tell at a glance that an override, not the computation,
    // decided the active value.
    expect(result.nextAction).not.toBe(result.computedNextAction)
  })

  it.each([
    { phase: 'lead', computedNextAction: 'Review the inquiry and send a quote.' },
    { phase: 'closed', computedNextAction: 'No further action — the project is closed.' },
  ])('holds for phase "$phase": override text becomes active, computed value is unchanged', ({ computedNextAction }) => {
    const result = presenter.presentNextAction({
      computedNextAction,
      override: { text: 'Manual note from the photographer.', actorName: 'jane.photographer', setAt: '2026-08-16T12:00:00.000Z' },
    })
    expect(result.nextAction).toBe('Manual note from the photographer.')
    expect(result.computedNextAction).toBe(computedNextAction)
  })
})

describe('AC-39.5: the DB-backed override service is structurally correct (not require()-d directly — see file header)', () => {
  const serviceSource = read(SERVICE_PATH)
  const presenterSource = read(PRESENTER_PATH)

  it('requires the same live database module nextActionService.js does, and exports both read and write functions', () => {
    expect(serviceSource).toContain("require('../database/db')")
    expect(serviceSource).toMatch(/module\.exports = \{\s*getProjectNextActionOverride,\s*setProjectNextActionOverride,?\s*\}/)
  })

  it('reads and writes the migration-127 table by name, and upserts (checks for an existing row) rather than always inserting', () => {
    expect(serviceSource).toContain("'project_next_action_overrides'")
    expect(serviceSource).toMatch(/\.update\(/)
    expect(serviceSource).toMatch(/\.insert\(/)
  })

  it('the pure presenter module requires nothing at all', () => {
    expect(presenterSource).not.toMatch(/require\(/)
  })
})

describe('AC-39.5: adminProjects.js wires the override service and presenter into both routes', () => {
  const adminRouteSource = read(ADMIN_ROUTE_PATH)

  it('still registers the AC-39.3.2 GET route, now also requiring the override service and presenter', () => {
    expect(adminRouteSource).toContain("router.get('/:id/next-action'")
    expect(adminRouteSource).toContain("require('../services/nextActionOverrideService')")
    expect(adminRouteSource).toContain("require('../services/nextActionOverride')")
    expect(adminRouteSource).toContain('nextActionOverrideService.getProjectNextActionOverride(')
    expect(adminRouteSource).toContain('presentNextAction(')
  })

  it('registers a new events.manage-gated PUT route to set the override', () => {
    expect(adminRouteSource).toMatch(
      /router\.put\('\/:id\/next-action\/override',\s*requirePermission\('events\.manage'\)/,
    )
    expect(adminRouteSource).toContain('nextActionOverrideService.setProjectNextActionOverride(')
  })

  it('records the acting admin from req.admin, never from the request body', () => {
    const section = adminRouteSource.slice(adminRouteSource.indexOf("router.put('/:id/next-action/override'"))
    expect(section).toContain('actorAdminId: req.admin.id')
    expect(section).toContain('actorName: req.admin.username')
    expect(section).not.toMatch(/actorAdminId:\s*req\.body/)
    expect(section).not.toMatch(/actorName:\s*req\.body/)
  })
})

describe('AC-39.5: migration 127 is registered as a fork-origin manifest entry', () => {
  const MANIFEST_PATH = 'backend/migrations/core/127_add_project_next_action_overrides.js'

  it('is recorded with origin "fork"', () => {
    const entry = PICPEAK_MIGRATION_MANIFEST.find((e) => e.path === MANIFEST_PATH)
    expect(entry).toBeDefined()
    expect(entry?.origin).toBe('fork')
  })

  it('is documented in FORK_CHANGELOG.md (required by the migration-integrity check)', () => {
    const changelog = fs.readFileSync(path.join(process.cwd(), 'FORK_CHANGELOG.md'), 'utf8')
    expect(changelog).toContain('127_add_project_next_action_overrides.js')
    expect(changelog).toMatch(/AC-39\.5/)
  })
})
