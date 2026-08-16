/**
 * ---
 * file: src/__tests__/us38-ac38.4-project-documents-integration-status-migration.test.ts
 * project: earthandhoney
 * purpose: Verify AC-38.4 — a per-Project document area and an
 *          integration-status record exist, and the integration-status
 *          record can represent a failure with a message and a
 *          timestamp (PRD 23.4's cockpit integration-failures item; US-43
 *          AC-43.3's induced-failure assertion). New migration 125
 *          creates `project_documents` and `project_integration_status`.
 *          This suite drives the real vendored migration module's
 *          up()/down() against a fake knex (no live database needed),
 *          then writes and reads back a row for each of the two tables —
 *          including one `project_integration_status` row per 'success',
 *          'pending' and 'failure' state, with the 'failure' row's
 *          message and timestamp asserted non-null and unchanged on
 *          read-back, matching this AC's Evidence clause.
 * created-by: dev-team
 * related-story: US-38
 * related-ac: 38.4
 * ---
 */
import fs from 'fs'
import path from 'path'
import { PICPEAK_MIGRATION_MANIFEST } from '@/lib/picpeakMigrationManifest'

const vendorRoot = path.join(process.cwd(), 'vendor', 'picpeak')
const MIGRATION_PATH = path.join(
  vendorRoot,
  'backend/migrations/core/125_add_project_documents_and_integration_status.js',
)

// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration = require(MIGRATION_PATH)

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
 * minimal query builder (select/insert) over in-memory
 * `project_documents` and `project_integration_status` row stores —
 * enough to drive the real migration module's up()/down() and a
 * subsequent write/read-back without a live database.
 */
function makeFakeKnex() {
  const tableExists: Record<string, boolean> = {
    project_documents: false,
    project_integration_status: false,
  }
  const rows: Record<string, Row[]> = {
    project_documents: [],
    project_integration_status: [],
  }
  const nextId: Record<string, number> = { project_documents: 1, project_integration_status: 1 }
  const createTableCalls: Record<string, number> = { project_documents: 0, project_integration_status: 0 }
  const createdColumns: Record<string, string[]> = { project_documents: [], project_integration_status: [] }

  function tableQuery(tableName: string) {
    const predicates: Array<(r: Row) => boolean> = []
    const builder = {
      where(column: string, value: unknown) {
        predicates.push((r) => r[column] === value)
        return builder
      },
      select: async (...cols: string[]) => {
        const filtered = rows[tableName].filter((r) => predicates.every((p) => p(r)))
        if (cols.length === 0) return filtered
        return filtered.map((r) => {
          const picked: Row = {}
          for (const c of cols) picked[c] = r[c]
          return picked
        })
      },
      insert: async (data: Row | Row[]) => {
        const batch = Array.isArray(data) ? data : [data]
        for (const r of batch) rows[tableName].push({ id: nextId[tableName]++, ...r })
      },
    }
    return builder
  }

  const knex = ((tableName: string) => {
    if (!(tableName in rows)) throw new Error(`unexpected table ${tableName}`)
    return tableQuery(tableName)
  }) as unknown as {
    (tableName: string): ReturnType<typeof tableQuery>
    schema: Record<string, unknown>
    fn: { now: () => string }
  }

  knex.schema = {
    hasTable: async (name: string) => tableExists[name] ?? false,
    createTable: async (name: string, cb: (t: unknown) => void) => {
      createTableCalls[name] = (createTableCalls[name] ?? 0) + 1
      const { table, columns } = createTableRecorder()
      cb(table)
      createdColumns[name] = columns
      tableExists[name] = true
    },
    dropTable: async (name: string) => {
      tableExists[name] = false
      rows[name] = []
    },
  }
  knex.fn = { now: () => 'NOW()' }

  return {
    knex,
    rows: (name: string) => rows[name],
    tableExists: (name: string) => tableExists[name],
    createTableCalls: (name: string) => createTableCalls[name] ?? 0,
    createdColumns: (name: string) => createdColumns[name] ?? [],
  }
}

describe('AC-38.4: migration 125 creates `project_documents` and `project_integration_status`', () => {
  it('exports idempotent up/down functions', () => {
    expect(typeof migration.up).toBe('function')
    expect(typeof migration.down).toBe('function')
  })

  describe('up() against an empty database', () => {
    const fake = makeFakeKnex()

    beforeAll(async () => {
      await migration.up(fake.knex)
    })

    it('creates both tables exactly once', () => {
      expect(fake.createTableCalls('project_documents')).toBe(1)
      expect(fake.createTableCalls('project_integration_status')).toBe(1)
      expect(fake.tableExists('project_documents')).toBe(true)
      expect(fake.tableExists('project_integration_status')).toBe(true)
    })

    it('project_documents declares every column this AC requires', () => {
      for (const column of ['project_id', 'document_type', 'title', 'storage_key', 'external_reference']) {
        expect(fake.createdColumns('project_documents')).toContain(column)
      }
    })

    it('project_integration_status declares every column this AC requires', () => {
      for (const column of ['project_id', 'integration_key', 'status', 'message', 'occurred_at']) {
        expect(fake.createdColumns('project_integration_status')).toContain(column)
      }
    })
  })

  describe('up() is idempotent: a second run against an already-migrated database creates nothing new', () => {
    it('does not call createTable again for either table', async () => {
      const fake = makeFakeKnex()
      await migration.up(fake.knex)
      await migration.up(fake.knex)

      expect(fake.createTableCalls('project_documents')).toBe(1)
      expect(fake.createTableCalls('project_integration_status')).toBe(1)
    })
  })

  describe('down() drops both tables', () => {
    it('drops project_documents and project_integration_status when they exist', async () => {
      const fake = makeFakeKnex()
      await migration.up(fake.knex)
      await migration.down(fake.knex)
      expect(fake.tableExists('project_documents')).toBe(false)
      expect(fake.tableExists('project_integration_status')).toBe(false)
    })

    it('is a no-op when neither table exists', async () => {
      const fake = makeFakeKnex()
      await migration.down(fake.knex)
      expect(fake.tableExists('project_documents')).toBe(false)
      expect(fake.tableExists('project_integration_status')).toBe(false)
    })
  })
})

describe('AC-38.4 Evidence: a per-Project document row written and read back', () => {
  it('a project_documents row survives a write/read round trip', async () => {
    const fake = makeFakeKnex()
    await migration.up(fake.knex)

    await fake.knex('project_documents').insert({
      project_id: 42,
      document_type: 'contract',
      title: 'Signed contract — Jane & Sam',
      storage_key: null,
      external_reference: null,
    })

    const [row] = await fake.knex('project_documents').where('project_id', 42).select()
    expect(row).toBeDefined()
    expect(row.document_type).toBe('contract')
    expect(row.title).toBe('Signed contract — Jane & Sam')
  })
})

describe('AC-38.4 Evidence: an integration-status row written and read back for each of success, pending and failure', () => {
  it('a "success" row round-trips with no message required', async () => {
    const fake = makeFakeKnex()
    await migration.up(fake.knex)

    await fake.knex('project_integration_status').insert({
      project_id: 7,
      integration_key: 'financial_placeholder',
      status: 'success',
      message: null,
      occurred_at: '2026-08-16T09:00:00.000Z',
    })

    const [row] = await fake.knex('project_integration_status').where('status', 'success').select()
    expect(row).toBeDefined()
    expect(row.integration_key).toBe('financial_placeholder')
    expect(row.status).toBe('success')
    expect(row.occurred_at).toBe('2026-08-16T09:00:00.000Z')
  })

  it('a "pending" row round-trips', async () => {
    const fake = makeFakeKnex()
    await migration.up(fake.knex)

    await fake.knex('project_integration_status').insert({
      project_id: 7,
      integration_key: 'stripe',
      status: 'pending',
      message: null,
      occurred_at: '2026-08-16T09:05:00.000Z',
    })

    const [row] = await fake.knex('project_integration_status').where('status', 'pending').select()
    expect(row).toBeDefined()
    expect(row.integration_key).toBe('stripe')
    expect(row.status).toBe('pending')
  })

  it('a "failure" row round-trips carrying a non-null message and timestamp, unchanged — PRD 23.4 / US-43 AC-43.3', async () => {
    const fake = makeFakeKnex()
    await migration.up(fake.knex)

    await fake.knex('project_integration_status').insert({
      project_id: 7,
      integration_key: 'webhook',
      status: 'failure',
      message: 'Backstage-to-Frontstage webhook delivery failed: 502 from receiver',
      occurred_at: '2026-08-16T09:10:00.000Z',
    })

    const [row] = await fake.knex('project_integration_status').where('status', 'failure').select()
    expect(row).toBeDefined()
    expect(row.status).toBe('failure')
    expect(row.message).toBe('Backstage-to-Frontstage webhook delivery failed: 502 from receiver')
    expect(row.occurred_at).toBe('2026-08-16T09:10:00.000Z')
  })

  it('all three states coexist on the same project without overwriting one another', async () => {
    const fake = makeFakeKnex()
    await migration.up(fake.knex)

    await fake.knex('project_integration_status').insert({
      project_id: 9,
      integration_key: 'financial_placeholder',
      status: 'success',
      message: null,
      occurred_at: '2026-08-16T10:00:00.000Z',
    })
    await fake.knex('project_integration_status').insert({
      project_id: 9,
      integration_key: 'email_queue',
      status: 'pending',
      message: null,
      occurred_at: '2026-08-16T10:01:00.000Z',
    })
    await fake.knex('project_integration_status').insert({
      project_id: 9,
      integration_key: 'stripe',
      status: 'failure',
      message: 'Stripe webhook signature verification failed',
      occurred_at: '2026-08-16T10:02:00.000Z',
    })

    const rows = (await fake
      .knex('project_integration_status')
      .where('project_id', 9)
      .select()) as Row[]
    expect(rows).toHaveLength(3)
    expect(rows.map((r) => r.status).sort()).toEqual(['failure', 'pending', 'success'])
    const failureRow = rows.find((r) => r.status === 'failure')
    expect(failureRow?.message).toBe('Stripe webhook signature verification failed')
  })
})

describe('AC-38.4: migration 125 is registered as a fork-origin manifest entry', () => {
  const MANIFEST_PATH = 'backend/migrations/core/125_add_project_documents_and_integration_status.js'

  it('is recorded with origin "fork"', () => {
    const entry = PICPEAK_MIGRATION_MANIFEST.find((e) => e.path === MANIFEST_PATH)
    expect(entry).toBeDefined()
    expect(entry?.origin).toBe('fork')
  })

  it('is documented in FORK_CHANGELOG.md (required by the migration-integrity check)', () => {
    const changelog = fs.readFileSync(path.join(process.cwd(), 'FORK_CHANGELOG.md'), 'utf8')
    expect(changelog).toContain('125_add_project_documents_and_integration_status.js')
    expect(changelog).toMatch(/AC-38\.4/)
  })
})
