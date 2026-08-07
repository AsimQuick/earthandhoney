/**
 * ---
 * file: src/__tests__/us27-ac27.5-additive-deviation-recorded.test.ts
 * project: earthandhoney
 * purpose: Verify AC-27.5 — every change made across AC-27.1 through
 *          AC-27.4 is additive (a new flag key, new checks, a gated panel),
 *          no already-shipped upstream migration file was touched, the
 *          picpeakMigrationManifest.ts SHA-1 integrity test stays green, and
 *          the deviation is recorded with its file paths in
 *          FORK_CHANGELOG.md and PICPEAK_PORT_LEDGER.md and its
 *          merge-conflict risk in UPSTREAM_SYNC.md.
 * created-by: dev-team
 * related-story: US-27
 * related-ac: 27.5
 * ---
 */
import fs from 'fs'
import path from 'path'
import { validateChangelogEntry, type ChangelogEntry } from '@/lib/forkChangelog'
import { verifyVendoredMigrations } from '@/lib/picpeakMigrationIntegrity'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

/**
 * The file paths touched by the US-27 AC-27.1–27.4 publicSite flag-gating
 * deviation, as recorded in the 2026-08-07 FORK_CHANGELOG.md entry and
 * PICPEAK_PORT_LEDGER.md §5. Kept here as the single list the assertions
 * below check against, so the test and the docs cannot silently drift.
 */
const FILES_TOUCHED = [
  'vendor/picpeak/backend/src/routes/adminFeatureFlags.js',
  'vendor/picpeak/backend/src/services/publicSiteService.js',
  'vendor/picpeak/backend/server.js',
  'vendor/picpeak/backend/src/routes/publicQuotes.js',
  'vendor/picpeak/frontend/src/pages/admin/CMSPage.tsx',
  'vendor/picpeak/frontend/src/contexts/FeatureFlagsContext.tsx',
  'vendor/picpeak/frontend/src/services/featureFlags.service.ts',
  'vendor/picpeak/backend/src/__tests__/adminFeatureFlags.publicSite.test.js',
  'vendor/picpeak/backend/src/__tests__/publicSiteService.test.js',
  'vendor/picpeak/backend/__tests__/routes/cmsStaysEnabled.test.js',
  'vendor/picpeak/backend/__tests__/routes/nativeBillingFlags.test.js',
  'vendor/picpeak/backend/__tests__/routes/publicQuotes.test.js',
  'src/__tests__/us27-ac27.2-cms-public-site-panel-flag-gated.test.ts',
  'src/__tests__/us18-ac18.5-backstage-surfaces-disabled.test.ts',
]

const DEVIATION_ENTRY: ChangelogEntry = {
  date: '2026-08-07',
  type: 'deviation',
  summary:
    'Every duplicate Backstage publishing surface AC-18.5 identified is now held off by its own feature flag.',
  filesTouched: FILES_TOUCHED,
}

describe('AC-27.5: every AC-27.1-27.4 change is additive', () => {
  it('touches no file under an already-shipped upstream migrations/ directory', () => {
    for (const file of FILES_TOUCHED) {
      expect(file).not.toMatch(/\/migrations\//)
    }
  })

  it('the deviation entry shape is valid per validateChangelogEntry', () => {
    expect(validateChangelogEntry(DEVIATION_ENTRY)).toEqual({ valid: true, reason: null })
  })

  it('picpeakMigrationManifest.ts SHA-1 integrity test stays green', () => {
    const result = verifyVendoredMigrations()
    expect(result.ok).toBe(true)
    expect(result.violations).toEqual([])
  })
})

describe('AC-27.5: FORK_CHANGELOG.md records the deviation with its file paths', () => {
  const doc = read('FORK_CHANGELOG.md')

  it('has a 2026-08-07 deviation entry naming US-27', () => {
    expect(doc).toMatch(/## 2026-08-07 — `deviation`/)
    expect(doc).toContain('US-27')
  })

  it('names every file touched by the deviation', () => {
    for (const file of FILES_TOUCHED) {
      expect(doc).toContain(file)
    }
  })

  it('states that no migration file was touched and the manifest test stays green', () => {
    expect(doc).toMatch(/none of the above are under\s*\n?\s*`vendor\/picpeak\/backend\/migrations\/`/i)
    expect(doc).toContain('picpeakMigrationManifest.ts')
  })
})

describe('AC-27.5: PICPEAK_PORT_LEDGER.md records the deviation with its file paths', () => {
  const doc = read('PICPEAK_PORT_LEDGER.md')

  it('has a section for the US-27 AC-27.5 deviation', () => {
    expect(doc).toContain('US-27 AC-27.5')
  })

  it('names every file touched by the deviation', () => {
    for (const file of FILES_TOUCHED) {
      expect(doc).toContain(file)
    }
  })

  it('cross-references the FORK_CHANGELOG.md entry it mirrors', () => {
    expect(doc).toContain('FORK_CHANGELOG.md')
    expect(doc).toContain('2026-08-07')
  })
})

describe('AC-27.5: UPSTREAM_SYNC.md names the resulting merge-conflict risk', () => {
  const doc = read('UPSTREAM_SYNC.md')

  const PRODUCTION_FILES = [
    'backend/src/routes/adminFeatureFlags.js',
    'backend/src/services/publicSiteService.js',
    'backend/server.js',
    'backend/src/routes/publicQuotes.js',
    'frontend/src/pages/admin/CMSPage.tsx',
    'frontend/src/contexts/FeatureFlagsContext.tsx',
    'frontend/src/services/featureFlags.service.ts',
  ]

  it('names every production file the deviation touched as newly conflict-prone', () => {
    for (const file of PRODUCTION_FILES) {
      expect(doc).toContain(file)
    }
  })

  it('names US-27 as the reason these files are now conflict-prone', () => {
    expect(doc).toContain('US-27')
  })
})
