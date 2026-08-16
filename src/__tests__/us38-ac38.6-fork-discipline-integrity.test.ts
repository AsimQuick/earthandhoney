/**
 * ---
 * file: src/__tests__/us38-ac38.6-fork-discipline-integrity.test.ts
 * project: earthandhoney
 * purpose: Verify AC-38.6 — fork discipline is provably intact after this
 *          story's four new schema-extension migrations (122-125). No
 *          migration numbered 001-121 was modified; migrations 122-125 are
 *          each registered in PICPEAK_MIGRATION_MANIFEST's origin:'fork'
 *          lane immediately after US-33's 120/121; each is named in
 *          FORK_CHANGELOG.md, PICPEAK_PORT_LEDGER.md and UPSTREAM_SYNC.md;
 *          the migration-manifest integrity test stays green against the
 *          real vendored tree; and the negative case — an edited upstream
 *          (001-121) migration — is still caught, proven here against the
 *          real, full PICPEAK_MIGRATION_MANIFEST rather than only the
 *          two-entry fixture US-33 AC-33.5.2.1's suite uses.
 * created-by: dev-team
 * related-story: US-38
 * related-ac: 38.6
 * ---
 */
import fs from 'fs'
import path from 'path'
import {
  verifyMigrationsUnmodified,
  verifyVendoredMigrations,
} from '@/lib/picpeakMigrationIntegrity'
import { PICPEAK_MIGRATION_MANIFEST } from '@/lib/picpeakMigrationManifest'

const root = process.cwd()
const vendorRoot = path.join(root, 'vendor', 'picpeak')

const US38_NEW_MIGRATIONS = [
  'backend/migrations/core/122_add_project_new_project_fields.js',
  'backend/migrations/core/123_add_event_detail_fields.js',
  'backend/migrations/core/124_add_project_milestones.js',
  'backend/migrations/core/125_add_project_documents_and_integration_status.js',
]

function migrationNumber(entryPath: string): number | null {
  const match = entryPath.match(/core\/(\d+)_/)
  return match ? parseInt(match[1], 10) : null
}

describe('AC-38.6: no migration numbered 001-121 was modified by this story', () => {
  const preExistingEntries = PICPEAK_MIGRATION_MANIFEST.filter((e) => {
    const n = migrationNumber(e.path)
    return n !== null && n <= 121
  })

  it('the manifest carries more than 90 core migrations numbered 001-121', () => {
    expect(preExistingEntries.length).toBeGreaterThan(90)
  })

  it('every migration numbered 001-121 on the real vendored tree still matches its recorded blob SHA', () => {
    const result = verifyMigrationsUnmodified(preExistingEntries, (relPath) => {
      try {
        return fs.readFileSync(path.join(vendorRoot, relPath))
      } catch {
        return null
      }
    })
    expect(result).toEqual({ ok: true, checked: preExistingEntries.length, violations: [] })
  })
})

describe("AC-38.6: migrations 122-125 are each registered in the origin:'fork' lane", () => {
  it.each(US38_NEW_MIGRATIONS)('%s is a fork-origin manifest entry', (migrationPath) => {
    const entry = PICPEAK_MIGRATION_MANIFEST.find((e) => e.path === migrationPath)
    expect(entry).toBeDefined()
    expect(entry?.origin).toBe('fork')
  })

  it("are exactly the manifest's third through sixth fork-origin entries, immediately after US-33's 120 and 121", () => {
    const forkPaths = PICPEAK_MIGRATION_MANIFEST.filter((e) => e.origin === 'fork').map((e) => e.path)
    expect(forkPaths.slice(0, 2)).toEqual([
      'backend/migrations/core/120_add_inquiry_notification_email_template.js',
      'backend/migrations/core/121_add_inquiry_acknowledgement_email_template.js',
    ])
    expect(forkPaths.slice(2, 6)).toEqual(US38_NEW_MIGRATIONS)
  })
})

describe('AC-38.6: each new migration is recorded in FORK_CHANGELOG.md, PICPEAK_PORT_LEDGER.md and UPSTREAM_SYNC.md', () => {
  const changelog = fs.readFileSync(path.join(root, 'FORK_CHANGELOG.md'), 'utf8')
  const ledger = fs.readFileSync(path.join(root, 'PICPEAK_PORT_LEDGER.md'), 'utf8')
  const upstreamSync = fs.readFileSync(path.join(root, 'UPSTREAM_SYNC.md'), 'utf8')

  it.each(US38_NEW_MIGRATIONS)('%s is named in FORK_CHANGELOG.md', (migrationPath) => {
    expect(changelog).toContain(path.basename(migrationPath))
  })

  it.each(US38_NEW_MIGRATIONS)('%s is named in PICPEAK_PORT_LEDGER.md', (migrationPath) => {
    expect(ledger).toContain(path.basename(migrationPath))
  })

  it.each(US38_NEW_MIGRATIONS)('%s is named in UPSTREAM_SYNC.md', (migrationPath) => {
    expect(upstreamSync).toContain(path.basename(migrationPath))
  })

  it('FORK_CHANGELOG.md ties each entry back to its acceptance criterion', () => {
    expect(changelog).toMatch(/AC-38\.1/)
    expect(changelog).toMatch(/AC-38\.2/)
    expect(changelog).toMatch(/AC-38\.3/)
    expect(changelog).toMatch(/AC-38\.4/)
  })

  it('PICPEAK_PORT_LEDGER.md cross-references AC-38.6', () => {
    expect(ledger).toMatch(/AC-38\.6/)
  })
})

describe('AC-38.6: the migration-manifest integrity test is green against the real vendored tree', () => {
  it('verifyVendoredMigrations finds every manifest entry present, blob-identical, and documented', () => {
    const result = verifyVendoredMigrations(path.join('vendor', 'picpeak'))
    expect(result.checked).toBe(PICPEAK_MIGRATION_MANIFEST.length)
    expect(result.violations).toEqual([])
    expect(result.ok).toBe(true)
  })
})

describe('AC-38.6: negative case — an edited upstream migration inside 001-121 is still caught, against the real full manifest', () => {
  const TAMPER_TARGET = 'backend/migrations/core/001_init.js'

  it('flags the tampered file as "modified" and nothing else is affected', () => {
    const readFile = (relPath: string): Buffer | null => {
      let content: Buffer
      try {
        content = fs.readFileSync(path.join(vendorRoot, relPath))
      } catch {
        return null
      }
      return relPath === TAMPER_TARGET
        ? Buffer.concat([content, Buffer.from('\n// sneaky edit\n')])
        : content
    }
    const changelog = fs.readFileSync(path.join(root, 'FORK_CHANGELOG.md'), 'utf8')
    const isForkAdditionDocumented = (p: string) => changelog.includes(p) || changelog.includes(path.basename(p))

    const result = verifyMigrationsUnmodified(PICPEAK_MIGRATION_MANIFEST, readFile, isForkAdditionDocumented)

    expect(result.ok).toBe(false)
    expect(result.violations).toHaveLength(1)
    expect(result.violations[0]).toMatchObject({ path: TAMPER_TARGET, reason: 'modified' })
    expect(result.violations[0].actualBlobSha).not.toBe(result.violations[0].expectedBlobSha)
  })
})
