/**
 * ---
 * file: src/lib/picpeakMigrationIntegrity.ts
 * project: earthandhoney
 * purpose: AC-15.6 — verifies that no already-shipped upstream PicPeak
 *          database migration under vendor/picpeak/backend/migrations has
 *          been modified since it was vendored, by comparing each file's
 *          current git blob SHA-1 against the pinned-upstream fingerprint
 *          recorded in PICPEAK_MIGRATION_MANIFEST. A changed migration file
 *          produces a different blob SHA, so any edit — however small — is
 *          detected without needing network access to re-fetch upstream.
 * created-by: dev-team
 * related-story: US-15
 * related-ac: 15.6
 * ---
 */

import { createHash } from 'crypto'
import fs from 'fs'
import path from 'path'
import { PICPEAK_MIGRATION_MANIFEST, type MigrationManifestEntry } from './picpeakMigrationManifest'

/**
 * Computes the git blob SHA-1 for file content: `sha1("blob " + length + "\0" + content)`.
 * This is the same object id `git hash-object` and GitHub's Trees API report for the
 * same file at the same commit, so it can be compared directly against the manifest.
 */
export function gitBlobSha(content: Buffer): string {
  const header = Buffer.from(`blob ${content.length}\0`, 'utf8')
  return createHash('sha1').update(Buffer.concat([header, content])).digest('hex')
}

export interface MigrationIntegrityViolation {
  path: string
  reason: 'modified' | 'missing'
  expectedBlobSha: string
  actualBlobSha: string | null
}

export interface MigrationIntegrityResult {
  ok: boolean
  checked: number
  violations: MigrationIntegrityViolation[]
}

/**
 * `readFile` is injected so this logic is testable without touching the real
 * filesystem — it maps a manifest-relative path to that file's current bytes,
 * or returns null if the file no longer exists.
 */
export function verifyMigrationsUnmodified(
  manifest: MigrationManifestEntry[],
  readFile: (path: string) => Buffer | null,
): MigrationIntegrityResult {
  const violations: MigrationIntegrityViolation[] = []

  for (const entry of manifest) {
    const content = readFile(entry.path)
    if (content === null) {
      violations.push({
        path: entry.path,
        reason: 'missing',
        expectedBlobSha: entry.blobSha,
        actualBlobSha: null,
      })
      continue
    }
    const actualBlobSha = gitBlobSha(content)
    if (actualBlobSha !== entry.blobSha) {
      violations.push({
        path: entry.path,
        reason: 'modified',
        expectedBlobSha: entry.blobSha,
        actualBlobSha,
      })
    }
  }

  return { ok: violations.length === 0, checked: manifest.length, violations }
}

/**
 * Verifies the real vendored migration files on disk against
 * PICPEAK_MIGRATION_MANIFEST, rooted at `vendorRoot` (defaults to
 * `vendor/picpeak`, the fork's clearly separated location in this repo).
 */
export function verifyVendoredMigrations(vendorRoot = 'vendor/picpeak'): MigrationIntegrityResult {
  return verifyMigrationsUnmodified(PICPEAK_MIGRATION_MANIFEST, (relativePath) => {
    const fullPath = path.join(vendorRoot, relativePath)
    try {
      return fs.readFileSync(fullPath)
    } catch {
      return null
    }
  })
}
