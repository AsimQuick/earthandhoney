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
 *
 *          AC-33.5.2.1 extends this same check with the fork-addition lane:
 *          a manifest entry with `origin: 'fork'` is a migration this
 *          project added, not one upstream shipped. Its blob SHA is still
 *          enforced exactly like an upstream entry's (a shipped fork
 *          migration must not be silently edited either), and it carries
 *          one further requirement upstream entries do not: it must be
 *          named in FORK_CHANGELOG.md, checked via the injected
 *          `isForkAdditionDocumented` predicate so this stays testable
 *          without touching the filesystem. An upstream entry is entirely
 *          unaffected by this addition — its modified/missing checks behave
 *          exactly as they did before this lane existed.
 * created-by: dev-team
 * related-story: US-15, US-33
 * related-ac: 15.6, 33.5.2.1
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
  reason: 'modified' | 'missing' | 'undocumented'
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
 *
 * `isForkAdditionDocumented` is the same style of injection for the lane's
 * second requirement: given a manifest-relative path, is this fork-added
 * migration named in FORK_CHANGELOG.md? It is only ever consulted for
 * entries with `origin: 'fork'` whose blob SHA already matched — an
 * upstream entry (the default `origin`) never calls it, so its default
 * value of "yes" is safe: it can only make a fork addition pass that a real
 * caller's stricter check would catch, never weaken the modified/missing
 * checks every entry — upstream or fork — still goes through above.
 */
export function verifyMigrationsUnmodified(
  manifest: MigrationManifestEntry[],
  readFile: (path: string) => Buffer | null,
  isForkAdditionDocumented: (path: string) => boolean = () => true,
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
      continue
    }
    if (entry.origin === 'fork' && !isForkAdditionDocumented(entry.path)) {
      violations.push({
        path: entry.path,
        reason: 'undocumented',
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
 *
 * FORK_CHANGELOG.md is always read from the project root regardless of
 * `vendorRoot` — it is this project's own file, not part of the vendored
 * fork tree, so a `vendorRoot` override (used by tests to point at a
 * nonexistent fork) never affects it.
 */
export function verifyVendoredMigrations(vendorRoot = 'vendor/picpeak'): MigrationIntegrityResult {
  let changelog = ''
  try {
    changelog = fs.readFileSync(path.join(process.cwd(), 'FORK_CHANGELOG.md'), 'utf8')
  } catch {
    changelog = ''
  }

  return verifyMigrationsUnmodified(
    PICPEAK_MIGRATION_MANIFEST,
    (relativePath) => {
      const fullPath = path.join(vendorRoot, relativePath)
      try {
        return fs.readFileSync(fullPath)
      } catch {
        return null
      }
    },
    (relativePath) => changelog.includes(relativePath) || changelog.includes(path.basename(relativePath)),
  )
}
