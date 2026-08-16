/**
 * ---
 * file: src/__tests__/us39-ac39.6.1.2-events-manage-permission-migration.test.ts
 * project: earthandhoney
 * purpose: Verify AC-39.6.1.2 — the second of AC-39.6's two schema
 *          prerequisites: a new migration seeding the missing
 *          `events.manage` permission and granting it to super_admin.
 *          NEXT_ACTION_CROSS_SURFACE_MAP.md (AC-39.3.1) recorded that every
 *          `events.manage`-gated admin route returns an unconditional 403
 *          for every role, including super_admin, because migration 055
 *          seeds five `events.*` rows and none of them is `events.manage`.
 *          Entirely UNIT lane, no Docker, no route, no running stack: drives
 *          the real vendored migration 129 module's up()/down() against a
 *          fake in-memory knex query builder seeded with 055's and 056's own
 *          rows, asserting the permission row is present after up(), that it
 *          is granted to super_admin, that a second up() call is a no-op,
 *          and that the migration leaves every pre-existing `permissions`
 *          and `role_permissions` row byte-for-byte unchanged — proving it
 *          never touches 055's or 056's own rows. This AC ships no route and
 *          exercises no gated route — AC-39.6.3 proves the gate opened.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.6.1.2
 * ---
 */
import fs from 'fs'
import path from 'path'
import { PICPEAK_MIGRATION_MANIFEST } from '@/lib/picpeakMigrationManifest'

const vendorRoot = path.join(process.cwd(), 'vendor', 'picpeak')
const MIGRATION_PATH = path.join(vendorRoot, 'backend/migrations/core/129_seed_events_manage_permission.js')

// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration = require(MIGRATION_PATH) as {
  up: (knex: unknown) => Promise<void>
  down: (knex: unknown) => Promise<void>
}

interface PermissionRow {
  id: number
  name: string
  display_name: string
  category: string
  description: string
}

interface RoleRow {
  id: number
  name: string
}

interface RolePermissionRow {
  role_id: number
  permission_id: number
}

/**
 * A fake knex query builder supporting exactly what migration 129 issues:
 * knex('table').select(...cols), .whereIn(col, values), .where(col, value),
 * .insert(rowOrRows), .del() — enough to drive the real migration module's
 * up()/down() against seeded 055/056-shaped tables, without a live database.
 */
type AnyRow = Record<string, unknown>
type TableName = 'permissions' | 'roles' | 'role_permissions'

function makeFakeKnex(seed: {
  permissions: PermissionRow[]
  roles: RoleRow[]
  rolePermissions: RolePermissionRow[]
}) {
  const tables: Record<TableName, AnyRow[]> = {
    permissions: seed.permissions.map((p) => ({ ...p })),
    roles: seed.roles.map((r) => ({ ...r })),
    role_permissions: seed.rolePermissions.map((rp) => ({ ...rp })),
  }
  let nextPermissionId = Math.max(0, ...tables.permissions.map((p) => p.id as number)) + 1
  const insertCallCounts: Record<TableName, number> = { permissions: 0, roles: 0, role_permissions: 0 }

  function tableQuery(name: TableName) {
    let filter: (row: AnyRow) => boolean = () => true

    const builder = {
      select() {
        return builder
      },
      whereIn(col: string, values: unknown[]) {
        const prev = filter
        filter = (row) => prev(row) && values.includes(row[col])
        return builder
      },
      where(col: string, value: unknown) {
        const prev = filter
        filter = (row) => prev(row) && row[col] === value
        return builder
      },
      insert(data: AnyRow | AnyRow[]) {
        const list = Array.isArray(data) ? data : [data]
        insertCallCounts[name] += 1
        for (const row of list) {
          tables[name].push(name === 'permissions' ? { id: nextPermissionId++, ...row } : { ...row })
        }
        return Promise.resolve()
      },
      del() {
        const before = tables[name].length
        tables[name] = tables[name].filter((row) => !filter(row))
        return Promise.resolve(before - tables[name].length)
      },
      // Thenable so `await knex('table').select(...)` resolves the filtered rows.
      then(resolve: (rows: AnyRow[]) => unknown, reject?: (err: unknown) => unknown) {
        return Promise.resolve(tables[name].filter(filter)).then(resolve, reject)
      },
    }
    return builder
  }

  const knex = ((name: TableName) => tableQuery(name)) as unknown as (name: TableName) => ReturnType<typeof tableQuery>

  return {
    knex,
    permissions: () => tables.permissions as unknown as PermissionRow[],
    roles: () => tables.roles as unknown as RoleRow[],
    rolePermissions: () => tables.role_permissions as unknown as RolePermissionRow[],
    insertCallCounts: () => insertCallCounts,
  }
}

// The exact five events.* rows migration 055 seeds, plus one unrelated row
// (photos.view) to prove non-events permissions are left alone too.
const SEEDED_PERMISSIONS: PermissionRow[] = [
  { id: 1, name: 'events.view', display_name: 'View Events', category: 'events', description: 'View event list and details' },
  { id: 2, name: 'events.create', display_name: 'Create Events', category: 'events', description: 'Create new events' },
  { id: 3, name: 'events.edit', display_name: 'Edit Events', category: 'events', description: 'Edit existing events' },
  { id: 4, name: 'events.delete', display_name: 'Delete Events', category: 'events', description: 'Delete events' },
  { id: 5, name: 'events.archive', display_name: 'Archive Events', category: 'events', description: 'Archive and restore events' },
  { id: 6, name: 'photos.view', display_name: 'View Photos', category: 'photos', description: 'View photos in events' },
]

const SEEDED_ROLES: RoleRow[] = [
  { id: 1, name: 'super_admin' },
  { id: 2, name: 'admin' },
  { id: 3, name: 'editor' },
  { id: 4, name: 'viewer' },
]

// Migration 056's super_admin grant is "every row that exists in
// permissions at migration time" — so super_admin already holds all six
// seeded permissions. admin holds the five events.* rows (056's own list).
const SEEDED_ROLE_PERMISSIONS: RolePermissionRow[] = [
  ...SEEDED_PERMISSIONS.map((p) => ({ role_id: 1, permission_id: p.id })),
  ...[1, 2, 3, 4, 5].map((permission_id) => ({ role_id: 2, permission_id })),
]

function freshFake() {
  return makeFakeKnex({
    permissions: SEEDED_PERMISSIONS,
    roles: SEEDED_ROLES,
    rolePermissions: SEEDED_ROLE_PERMISSIONS,
  })
}

describe('AC-39.6.1.2: migration 129 seeds `events.manage` and grants it to super_admin', () => {
  it('exports up/down functions', () => {
    expect(typeof migration.up).toBe('function')
    expect(typeof migration.down).toBe('function')
  })

  describe('up() against a 055/056-seeded database', () => {
    const fake = freshFake()

    beforeAll(async () => {
      await migration.up(fake.knex)
    })

    it('the events.manage row is present after up()', () => {
      const row = fake.permissions().find((p) => p.name === 'events.manage')
      expect(row).toBeDefined()
      expect(row?.category).toBe('events')
    })

    it('events.manage is granted to super_admin', () => {
      const eventsManage = fake.permissions().find((p) => p.name === 'events.manage')!
      const superAdmin = fake.roles().find((r) => r.name === 'super_admin')!
      const grant = fake
        .rolePermissions()
        .find((g) => g.role_id === superAdmin.id && g.permission_id === eventsManage.id)
      expect(grant).toBeDefined()
    })

    it('touches none of 055\'s own permission rows', () => {
      for (const seeded of SEEDED_PERMISSIONS) {
        expect(fake.permissions().find((p) => p.id === seeded.id)).toEqual(seeded)
      }
    })

    it('touches none of 056\'s own role_permissions rows', () => {
      for (const seeded of SEEDED_ROLE_PERMISSIONS) {
        expect(
          fake.rolePermissions().some((g) => g.role_id === seeded.role_id && g.permission_id === seeded.permission_id),
        ).toBe(true)
      }
      // Only one new grant (events.manage -> super_admin) beyond the seed.
      expect(fake.rolePermissions().length).toBe(SEEDED_ROLE_PERMISSIONS.length + 1)
    })

    it('adds exactly one new permission row beyond the 055 seed', () => {
      expect(fake.permissions().length).toBe(SEEDED_PERMISSIONS.length + 1)
    })
  })

  describe('idempotency: a second up() call is a no-op', () => {
    it('does not insert a duplicate permission or grant', async () => {
      const fake = freshFake()
      await migration.up(fake.knex)
      await migration.up(fake.knex)

      const eventsManageRows = fake.permissions().filter((p) => p.name === 'events.manage')
      expect(eventsManageRows.length).toBe(1)

      const superAdmin = fake.roles().find((r) => r.name === 'super_admin')!
      const grants = fake
        .rolePermissions()
        .filter((g) => g.role_id === superAdmin.id && g.permission_id === eventsManageRows[0].id)
      expect(grants.length).toBe(1)

      expect(fake.permissions().length).toBe(SEEDED_PERMISSIONS.length + 1)
      expect(fake.rolePermissions().length).toBe(SEEDED_ROLE_PERMISSIONS.length + 1)
    })

    it('an up() call against an already-migrated database (events.manage pre-seeded) inserts nothing new', async () => {
      const fake = makeFakeKnex({
        permissions: [
          ...SEEDED_PERMISSIONS,
          { id: 7, name: 'events.manage', display_name: 'Manage Projects', category: 'events', description: 'x' },
        ],
        roles: SEEDED_ROLES,
        rolePermissions: [...SEEDED_ROLE_PERMISSIONS, { role_id: 1, permission_id: 7 }],
      })
      await migration.up(fake.knex)
      expect(fake.insertCallCounts().permissions).toBe(0)
      expect(fake.insertCallCounts().role_permissions).toBe(0)
      expect(fake.permissions().length).toBe(SEEDED_PERMISSIONS.length + 1)
      expect(fake.rolePermissions().length).toBe(SEEDED_ROLE_PERMISSIONS.length + 1)
    })
  })

  describe('down()', () => {
    it('removes the events.manage permission row; role_permissions grants cascade via the FK', async () => {
      const fake = freshFake()
      await migration.up(fake.knex)
      await migration.down(fake.knex)

      expect(fake.permissions().find((p) => p.name === 'events.manage')).toBeUndefined()
      // Real ON DELETE CASCADE (056_add_role_permissions_table.js) removes
      // the grant row once its permission_id no longer exists; this fake
      // models the migration's own responsibility (deleting the permission
      // row), not Postgres's FK engine.
    })

    it('leaves every 055/056 seeded row untouched', async () => {
      const fake = freshFake()
      await migration.up(fake.knex)
      await migration.down(fake.knex)

      for (const seeded of SEEDED_PERMISSIONS) {
        expect(fake.permissions().find((p) => p.id === seeded.id)).toEqual(seeded)
      }
      for (const seeded of SEEDED_ROLE_PERMISSIONS) {
        expect(
          fake.rolePermissions().some((g) => g.role_id === seeded.role_id && g.permission_id === seeded.permission_id),
        ).toBe(true)
      }
    })

    it('is a no-op when events.manage does not exist', async () => {
      const fake = freshFake()
      await migration.down(fake.knex)
      expect(fake.permissions().length).toBe(SEEDED_PERMISSIONS.length)
    })
  })

  describe('an up-down-up cycle returns to the pre-migration state and re-applies cleanly', () => {
    it('after down(), a fresh up() recreates the permission and the super_admin grant', async () => {
      const fake = freshFake()
      await migration.up(fake.knex)
      await migration.down(fake.knex)
      await migration.up(fake.knex)

      const row = fake.permissions().find((p) => p.name === 'events.manage')
      expect(row).toBeDefined()
      const superAdmin = fake.roles().find((r) => r.name === 'super_admin')!
      expect(
        fake.rolePermissions().some((g) => g.role_id === superAdmin.id && g.permission_id === row!.id),
      ).toBe(true)
    })
  })
})

describe('AC-39.6.1.2: migration 129 is registered as a fork-origin manifest entry', () => {
  const MANIFEST_PATH = 'backend/migrations/core/129_seed_events_manage_permission.js'

  it('is recorded with origin "fork"', () => {
    const entry = PICPEAK_MIGRATION_MANIFEST.find((e) => e.path === MANIFEST_PATH)
    expect(entry).toBeDefined()
    expect(entry?.origin).toBe('fork')
  })

  it('is documented in FORK_CHANGELOG.md (required by the migration-integrity check)', () => {
    const changelog = fs.readFileSync(path.join(process.cwd(), 'FORK_CHANGELOG.md'), 'utf8')
    expect(changelog).toContain('129_seed_events_manage_permission.js')
    expect(changelog).toMatch(/AC-39\.6\.1\.2/)
  })
})
