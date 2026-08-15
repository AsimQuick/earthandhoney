/**
 * ---
 * file: src/__tests__/us33-ac33.5.2.1-fork-migration-lane.test.ts
 * project: earthandhoney
 * purpose: Verify AC-33.5.2.1's two deliverables. (a) The lane: a manifest
 *          entry with `origin: 'fork'` is fingerprinted like any other
 *          entry (an edit still fails), but is additionally required to be
 *          named in FORK_CHANGELOG.md — proven both directions through
 *          verifyMigrationsUnmodified's injected readFile/
 *          isForkAdditionDocumented, with no filesystem touched, including
 *          the negative case that an edited *upstream* entry still fails as
 *          'modified' exactly as it did before this lane existed. (b) The
 *          migration: the real vendored tree carries migration 120
 *          inserting the `inquiry_received` email_templates row, recorded
 *          as the manifest's first `origin: 'fork'` entry and documented in
 *          FORK_CHANGELOG.md, vendor/README.md, and PICPEAK_PORT_LEDGER.md.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.5.2.1
 * ---
 */
import fs from 'fs'
import path from 'path'
import {
  gitBlobSha,
  verifyMigrationsUnmodified,
  verifyVendoredMigrations,
} from '@/lib/picpeakMigrationIntegrity'
import { PICPEAK_MIGRATION_MANIFEST, type MigrationManifestEntry } from '@/lib/picpeakMigrationManifest'

const root = process.cwd()
const vendorRoot = path.join(root, 'vendor', 'picpeak')
const MIGRATION_PATH = 'backend/migrations/core/120_add_inquiry_notification_email_template.js'

describe('AC-33.5.2.1: the fork-addition lane (fixture-level, no filesystem)', () => {
  const upstream: MigrationManifestEntry = {
    path: 'upstream.js',
    blobSha: gitBlobSha(Buffer.from('exports.up = async () => {};\n')),
  }
  const forkEntry: MigrationManifestEntry = {
    path: 'fork-addition.js',
    blobSha: gitBlobSha(Buffer.from('exports.up = async (knex) => { await knex("t").insert({}); };\n')),
    origin: 'fork',
  }
  const manifest = [upstream, forkEntry]
  const contents: Record<string, Buffer> = {
    'upstream.js': Buffer.from('exports.up = async () => {};\n'),
    'fork-addition.js': Buffer.from('exports.up = async (knex) => { await knex("t").insert({}); };\n'),
  }
  const read = (p: string) => contents[p] ?? null

  it('passes a fork-origin entry that is blob-identical and named in FORK_CHANGELOG.md', () => {
    const result = verifyMigrationsUnmodified(manifest, read, () => true)
    expect(result).toEqual({ ok: true, checked: 2, violations: [] })
  })

  it('fails a fork-origin entry that is blob-identical but NOT named in FORK_CHANGELOG.md', () => {
    const isDocumented = (p: string) => p !== 'fork-addition.js'
    const result = verifyMigrationsUnmodified(manifest, read, isDocumented)
    expect(result.ok).toBe(false)
    expect(result.violations).toEqual([
      {
        path: 'fork-addition.js',
        reason: 'undocumented',
        expectedBlobSha: forkEntry.blobSha,
        actualBlobSha: forkEntry.blobSha,
      },
    ])
  })

  it('never consults the documentation check for an upstream (non-fork) entry', () => {
    let calls = 0
    const isDocumented = (p: string) => {
      calls += 1
      return p !== upstream.path // would fail upstream.js if it were ever asked
    }
    const result = verifyMigrationsUnmodified(manifest, read, isDocumented)
    expect(result.ok).toBe(true)
    expect(calls).toBe(1) // only the fork entry is asked about
  })

  it('negative case: an edited UPSTREAM migration still produces a "modified" violation, unaffected by the lane', () => {
    const tampered: Record<string, Buffer> = {
      ...contents,
      'upstream.js': Buffer.from('exports.up = async () => { /* sneaky edit */ };\n'),
    }
    const result = verifyMigrationsUnmodified(manifest, (p) => tampered[p] ?? null, () => true)
    expect(result.ok).toBe(false)
    expect(result.violations).toHaveLength(1)
    expect(result.violations[0]).toMatchObject({ path: 'upstream.js', reason: 'modified' })
    expect(result.violations[0].actualBlobSha).not.toBe(result.violations[0].expectedBlobSha)
  })

  it('a missing fork-origin migration is reported as "missing", not "undocumented"', () => {
    const result = verifyMigrationsUnmodified(
      manifest,
      (p) => (p === 'upstream.js' ? contents['upstream.js'] : null),
      () => false,
    )
    expect(result.ok).toBe(false)
    expect(result.violations).toContainEqual({
      path: 'fork-addition.js',
      reason: 'missing',
      expectedBlobSha: forkEntry.blobSha,
      actualBlobSha: null,
    })
  })

  it('defaults to permissive documentation-checking when no predicate is injected (upstream entries are unaffected either way)', () => {
    const result = verifyMigrationsUnmodified(manifest, read)
    expect(result).toEqual({ ok: true, checked: 2, violations: [] })
  })
})

describe('AC-33.5.2.1: migration 120 is the manifest\'s first fork-origin entry', () => {
  it('is recorded in PICPEAK_MIGRATION_MANIFEST with origin "fork"', () => {
    const entry = PICPEAK_MIGRATION_MANIFEST.find((e) => e.path === MIGRATION_PATH)
    expect(entry).toBeDefined()
    expect(entry?.origin).toBe('fork')
  })

  it('is the FIRST fork-origin entry in the manifest (AC-33.6 later adds a second, migration 121)', () => {
    const forkEntries = PICPEAK_MIGRATION_MANIFEST.filter((e) => e.origin === 'fork')
    expect(forkEntries[0]?.path).toBe(MIGRATION_PATH)
  })

  it('every other manifest entry is still the pinned-upstream default (no origin field), except later fork additions (AC-33.6\'s migration 121, AC-38.1\'s migration 122, AC-38.2\'s migration 123)', () => {
    const LATER_FORK_MIGRATION_PATHS = [
      'backend/migrations/core/121_add_inquiry_acknowledgement_email_template.js',
      'backend/migrations/core/122_add_project_new_project_fields.js',
      'backend/migrations/core/123_add_event_detail_fields.js',
    ]
    const nonFork = PICPEAK_MIGRATION_MANIFEST.filter(
      (e) => e.path !== MIGRATION_PATH && !LATER_FORK_MIGRATION_PATHS.includes(e.path),
    )
    expect(nonFork.every((e) => e.origin === undefined)).toBe(true)
    expect(nonFork.length).toBeGreaterThan(100)
  })
})

describe('AC-33.5.2.1: verifyVendoredMigrations against the real vendored tree', () => {
  it('finds migration 120 present, blob-identical, and documented — the whole manifest passes', () => {
    const result = verifyVendoredMigrations(path.join('vendor', 'picpeak'))
    expect(result.checked).toBe(PICPEAK_MIGRATION_MANIFEST.length)
    expect(result.violations).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('the real migration 120 file exists on disk under the fork\'s migrations/core directory', () => {
    expect(fs.existsSync(path.join(vendorRoot, MIGRATION_PATH))).toBe(true)
  })

  it('fails closed when FORK_CHANGELOG.md cannot be read: every fork entry becomes "undocumented", upstream entries stay unaffected', () => {
    const realReadFileSync = fs.readFileSync
    const spy = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(((file: fs.PathOrFileDescriptor, options?: unknown) => {
        if (typeof file === 'string' && file.endsWith('FORK_CHANGELOG.md')) {
          throw new Error('ENOENT: FORK_CHANGELOG.md is unreadable')
        }
        return (realReadFileSync as (f: unknown, o?: unknown) => unknown)(file, options)
      }) as unknown as typeof fs.readFileSync)

    try {
      const result = verifyVendoredMigrations(path.join('vendor', 'picpeak'))
      // The lane refuses to vouch for a fork addition it cannot find a record
      // for — it does not fall back to "assume documented". Every fork-origin
      // manifest entry (not a hardcoded pair) must show up "undocumented".
      const forkPaths = PICPEAK_MIGRATION_MANIFEST.filter((e) => e.origin === 'fork').map((e) => e.path)
      expect(result.ok).toBe(false)
      expect(result.violations).toEqual(
        forkPaths.map((forkPath) => expect.objectContaining({ path: forkPath, reason: 'undocumented' })),
      )
    } finally {
      spy.mockRestore()
    }
  })
})

describe('AC-33.5.2.1: the artifact\'s documented meaning matches what it now does', () => {
  it('vendor/README.md documents the fork-addition lane and its FORK_CHANGELOG.md requirement', () => {
    const readme = fs.readFileSync(path.join(root, 'vendor', 'README.md'), 'utf8')
    expect(readme).toMatch(/fork-addition lane/i)
    expect(readme).toContain("origin: 'fork'")
    expect(readme).toContain('FORK_CHANGELOG.md')
  })

  it('UPSTREAM_SYNC.md no longer claims the fork has added no schema migration of its own', () => {
    const doc = fs.readFileSync(path.join(root, 'UPSTREAM_SYNC.md'), 'utf8')
    expect(doc).toContain('120_add_inquiry_notification_email_template.js')
    expect(doc).toMatch(/AC-33\.5\.2\.1/)
  })

  it('FORK_CHANGELOG.md names migration 120 and the manifest/integrity files the lane touched', () => {
    const changelog = fs.readFileSync(path.join(root, 'FORK_CHANGELOG.md'), 'utf8')
    expect(changelog).toContain('120_add_inquiry_notification_email_template.js')
    expect(changelog).toContain('picpeakMigrationManifest.ts')
    expect(changelog).toContain('picpeakMigrationIntegrity.ts')
    expect(changelog).toMatch(/AC-33\.5\.2\.1/)
  })

  it('PICPEAK_PORT_LEDGER.md records the file paths this deviation touched', () => {
    const ledger = fs.readFileSync(path.join(root, 'PICPEAK_PORT_LEDGER.md'), 'utf8')
    expect(ledger).toContain('120_add_inquiry_notification_email_template.js')
    expect(ledger).toMatch(/AC-33\.5\.2\.1/)
  })
})

describe('AC-33.5.2.1: migration 120\'s shape (the email_templates row it inserts)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const migrationModule = require(path.join(vendorRoot, MIGRATION_PATH))

  it('exports idempotent up/down functions', () => {
    expect(typeof migrationModule.up).toBe('function')
    expect(typeof migrationModule.down).toBe('function')
  })

  it('inserts exactly one row, guarded on template_key already existing, for template_key "inquiry_received"', async () => {
    const inserted: Record<string, unknown>[] = []
    const existingRows: Record<string, unknown>[] = []
    const fakeQueryBuilder = {
      where: () => fakeQueryBuilder,
      first: async () => existingRows[0],
      insert: async (row: Record<string, unknown>) => {
        inserted.push(row)
      },
    }
    const knex = () => fakeQueryBuilder

    await migrationModule.up(knex)

    expect(inserted).toHaveLength(1)
    const row = inserted[0]
    expect(row.template_key).toBe('inquiry_received')
    expect(row.subject_en).toContain('{{form_title}}')
    expect(row.subject_de).toContain('{{form_title}}')
    expect(row.body_html_en).toContain('{{submission_summary}}')
    expect(row.body_text_en).toContain('{{submission_summary}}')
    expect(row.body_html_de).toBeTruthy()
    expect(row.body_text_de).toBeTruthy()
    expect(JSON.parse(row.variables as string)).toEqual([
      'form_title',
      'source_page',
      'submitted_at',
      'submission_summary',
    ])
  })

  it('is a no-op when the template_key row already exists', async () => {
    const inserted: Record<string, unknown>[] = []
    const fakeQueryBuilder = {
      where: () => fakeQueryBuilder,
      first: async () => ({ id: 1, template_key: 'inquiry_received' }),
      insert: async (row: Record<string, unknown>) => {
        inserted.push(row)
      },
    }
    const knex = () => fakeQueryBuilder

    await migrationModule.up(knex)

    expect(inserted).toHaveLength(0)
  })
})
