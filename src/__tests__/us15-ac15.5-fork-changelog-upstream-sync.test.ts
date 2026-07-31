/**
 * ---
 * file: src/__tests__/us15-ac15.5-fork-changelog-upstream-sync.test.ts
 * project: earthandhoney
 * purpose: Verify AC-15.5 — FORK_CHANGELOG.md and UPSTREAM_SYNC.md exist.
 *          The changelog is initialised with the pinned baseline and is the
 *          place every deliberate deviation from upstream gets recorded.
 *          The sync document states the merge or rebase policy and names
 *          the files most likely to conflict on a future update. Also
 *          exercises the changelog-entry and sync-policy decision logic in
 *          isolation.
 * created-by: dev-team
 * related-story: US-15
 * related-ac: 15.5
 * ---
 */
import fs from 'fs'
import path from 'path'
import { validateChangelogEntry, type ChangelogEntry } from '@/lib/forkChangelog'
import { validateSyncPolicy, type SyncPolicy } from '@/lib/upstreamSync'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const PINNED_COMMIT = 'eb263137b98935754155824de2a03848121304b6'

const BASELINE_ENTRY: ChangelogEntry = {
  date: '2026-07-31',
  type: 'baseline',
  summary: 'Fork initialised at the pinned upstream commit.',
  filesTouched: [],
}

const DEVIATION_ENTRY: ChangelogEntry = {
  date: '2026-08-05',
  type: 'deviation',
  summary: 'Point storage backend at Cloudflare R2.',
  filesTouched: ['backend/src/services/storage/S3StorageBackend.js'],
}

const VALID_POLICY: SyncPolicy = {
  strategy: 'merge',
  conflictProneFiles: ['backend/src/services/storage/S3StorageBackend.js'],
  rationale: 'Preserves fork commit history referenced by FORK_CHANGELOG.md.',
}

describe('AC-15.5: fork changelog and upstream sync policy', () => {
  describe('validateChangelogEntry (changelog decision logic)', () => {
    it('accepts a baseline entry with no files touched', () => {
      expect(validateChangelogEntry(BASELINE_ENTRY)).toEqual({ valid: true, reason: null })
    })

    it('accepts a deviation entry that names the files it touched', () => {
      expect(validateChangelogEntry(DEVIATION_ENTRY)).toEqual({ valid: true, reason: null })
    })

    it('rejects a deviation entry that names no files touched', () => {
      const result = validateChangelogEntry({ ...DEVIATION_ENTRY, filesTouched: [] })
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/deviation.*must name at least one file/i)
    })

    it('rejects an entry with a non-ISO-8601 date', () => {
      const result = validateChangelogEntry({ ...BASELINE_ENTRY, date: '31/07/2026' })
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/date/)
    })

    it('rejects an entry with an empty summary', () => {
      const result = validateChangelogEntry({ ...BASELINE_ENTRY, summary: '' })
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/summary/)
    })
  })

  describe('validateSyncPolicy (sync-policy decision logic)', () => {
    it('accepts a policy with a valid strategy, conflict files, and rationale', () => {
      expect(validateSyncPolicy(VALID_POLICY)).toEqual({ valid: true, reason: null })
    })

    it('rejects a policy with an invalid strategy', () => {
      const result = validateSyncPolicy({ ...VALID_POLICY, strategy: 'cherry-pick' as SyncPolicy['strategy'] })
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/strategy must be "merge" or "rebase"/)
    })

    it('rejects a policy with no conflict-prone files named', () => {
      const result = validateSyncPolicy({ ...VALID_POLICY, conflictProneFiles: [] })
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/conflictProneFiles/)
    })

    it('rejects a policy with an empty rationale', () => {
      const result = validateSyncPolicy({ ...VALID_POLICY, rationale: '' })
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/rationale/)
    })
  })

  describe('FORK_CHANGELOG.md — initialised with pinned baseline', () => {
    it('exists at the repo root', () => {
      expect(fs.existsSync(path.join(root, 'FORK_CHANGELOG.md'))).toBe(true)
    })

    const doc = read('FORK_CHANGELOG.md')

    it('records the pinned baseline commit', () => {
      expect(doc).toContain(PINNED_COMMIT)
      expect(doc).toMatch(/baseline/i)
    })

    it('references the upstream pin record', () => {
      expect(doc).toContain('PICPEAK_UPSTREAM.md')
    })

    it('states it is the place every deliberate deviation from upstream gets recorded', () => {
      expect(doc).toMatch(/the place every deliberate deviation from upstream gets\s+recorded/i)
    })

    it('references the changelog-entry decision logic that backs this document', () => {
      expect(doc).toContain('src/lib/forkChangelog.ts')
      expect(doc).toContain('validateChangelogEntry')
    })
  })

  describe('UPSTREAM_SYNC.md — merge/rebase policy and conflict-prone files', () => {
    it('exists at the repo root', () => {
      expect(fs.existsSync(path.join(root, 'UPSTREAM_SYNC.md'))).toBe(true)
    })

    const doc = read('UPSTREAM_SYNC.md')

    it('states the merge or rebase policy', () => {
      expect(doc).toMatch(/merge, not rebase|rebase, not merge/i)
    })

    it('names files most likely to conflict on a future update', () => {
      expect(doc).toMatch(/files most likely to conflict/i)
      expect(doc).toContain('backend/src/services/storage/S3StorageBackend.js')
      expect(doc).toMatch(/migration/i)
      expect(doc).toContain('package.json')
    })

    it('cross-references the upstream pin document and the fork changelog', () => {
      expect(doc).toContain('PICPEAK_UPSTREAM.md')
      expect(doc).toContain('FORK_CHANGELOG.md')
    })

    it('references the sync-policy decision logic that backs this document', () => {
      expect(doc).toContain('src/lib/upstreamSync.ts')
      expect(doc).toContain('validateSyncPolicy')
    })
  })
})
