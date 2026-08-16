/**
 * ---
 * file: src/__tests__/us40-ac40.5-status-vocabulary-single-definition.test.ts
 * project: earthandhoney
 * purpose: Verify AC-40.5 — the status vocabulary is available to both
 *          surfaces from one definition, not implemented twice. The single
 *          definition is src/lib/statusVocabulary.ts (AC-40.1); the
 *          Frontstage consumer is src/components/status/StatusBadge.tsx
 *          (AC-40.2), asserted here from source to import STATUS_STATES
 *          from that one module; the fork's consumer is
 *          vendor/picpeak/backend/src/services/statusVocabulary.js,
 *          asserted here from source to require the framework-free export
 *          US-23 AC-23.6 established (exports/design-tokens/), then
 *          actually required and checked to carry the same five states.
 *          The export itself is proven to be a generated copy rather than a
 *          second, independent definition by regenerating it from the live
 *          source and diffing against the checked-in file — the same proof
 *          src/__tests__/us23-ac23.6-token-export.test.ts established for
 *          the design-token export. Finally, a repository-wide guard scans
 *          every non-test source file for PRD 23.3's two most distinctive
 *          label phrases appearing together ("waiting/pending" and
 *          "blocked/overdue/action required") and fails if either turns up
 *          anywhere outside the one definition and its generated export —
 *          the same self-tested-guard shape AC-40.1's lock-in test and
 *          AC-40.2's channel guard used.
 * created-by: dev-team
 * related-story: US-40
 * related-ac: 40.5
 * ---
 */
import fs from 'fs'
import path from 'path'

import { STATUS_STATES } from '@/lib/statusVocabulary'
import { generateStatusVocabularyExportJson, EXPORT_OUTPUT_PATH } from '@/lib/statusVocabularyExport'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const SOURCE_OF_TRUTH = 'src/lib/statusVocabulary.ts'
const FRONTSTAGE_CONSUMER = 'src/components/status/StatusBadge.tsx'
const FORK_CONSUMER = 'vendor/picpeak/backend/src/services/statusVocabulary.js'

describe('AC-40.5: the status vocabulary is available to both surfaces from one definition', () => {
  it('the single definition, src/lib/statusVocabulary.ts, exists and exports STATUS_STATES', () => {
    expect(fs.existsSync(path.join(root, SOURCE_OF_TRUTH))).toBe(true)
    expect(STATUS_STATES).toHaveLength(5)
  })

  describe('the framework-free export exists at the AC-23.6 export path and is generated, not hand-authored', () => {
    it(`is checked in at ${EXPORT_OUTPUT_PATH}`, () => {
      expect(fs.existsSync(path.join(root, EXPORT_OUTPUT_PATH))).toBe(true)
    })

    it('names its own source of truth in a _meta header, since JSON carries no comment header', () => {
      const parsed = JSON.parse(read(EXPORT_OUTPUT_PATH))
      expect(parsed._meta.sourceOfTruth).toBe(SOURCE_OF_TRUTH)
      expect(parsed._meta.relatedStory).toBe('US-40')
      expect(parsed._meta.relatedAc).toBe('40.5')
      expect(parsed._meta.generatedFile).toBe(true)
    })

    it('carries exactly the same five states as the single definition', () => {
      const parsed = JSON.parse(read(EXPORT_OUTPUT_PATH))
      expect(parsed.states).toEqual(STATUS_STATES)
    })

    it('regenerating from the live source reproduces the checked-in file exactly (empty diff)', () => {
      const checkedIn = read(EXPORT_OUTPUT_PATH)
      const regenerated = generateStatusVocabularyExportJson(STATUS_STATES)
      expect(regenerated).toBe(checkedIn)
    })

    it('is deterministic across repeated regenerations', () => {
      expect(generateStatusVocabularyExportJson(STATUS_STATES)).toBe(generateStatusVocabularyExportJson(STATUS_STATES))
    })
  })

  describe('the Frontstage consumer imports the single definition directly', () => {
    it('StatusBadge.tsx imports STATUS_STATES from @/lib/statusVocabulary', () => {
      const source = read(FRONTSTAGE_CONSUMER)
      expect(source).toMatch(/import\s*\{\s*STATUS_STATES\s*\}\s*from\s*['"]@\/lib\/statusVocabulary['"]/)
    })

    it('StatusBadge.tsx declares no parallel status-state array of its own', () => {
      const source = read(FRONTSTAGE_CONSUMER)
      expect(source).not.toMatch(/waiting\/pending/)
      expect(source).not.toMatch(/blocked\/overdue\/action required/)
    })
  })

  describe("the fork's consumer imports the framework-free export from that one place", () => {
    it('statusVocabulary.js requires exports/design-tokens/status-vocabulary.json, not a re-authored copy', () => {
      const source = read(FORK_CONSUMER)
      expect(source).toMatch(/exports\/design-tokens\/status-vocabulary\.json/)
      expect(source).not.toMatch(/waiting\/pending/)
      expect(source).not.toMatch(/blocked\/overdue\/action required/)
    })

    it('actually requiring it resolves the same five states the single definition declares', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const forkConsumer = require(path.join(root, FORK_CONSUMER)) as {
        STATUS_STATES: typeof STATUS_STATES
        STATUS_STATE_KEYS: string[]
        isValidStatusStateKey: (key: string) => boolean
      }
      expect(forkConsumer.STATUS_STATES).toEqual(STATUS_STATES)
      expect(forkConsumer.STATUS_STATE_KEYS).toEqual(STATUS_STATES.map((s) => s.key))
      expect(forkConsumer.isValidStatusStateKey('complete')).toBe(true)
      expect(forkConsumer.isValidStatusStateKey('archived')).toBe(false)
    })
  })
})

/**
 * The AC-40.5 guard itself: PRD 23.3's two most distinctive label phrases —
 * "waiting/pending" and "blocked/overdue/action required" — are unlikely to
 * appear anywhere in this repository by coincidence. A file containing both
 * is either the one definition, its generated export, or a second, parallel
 * definition this AC forbids.
 */
function containsParallelStatusDefinition(source: string): boolean {
  return source.includes('waiting/pending') && source.includes('blocked/overdue/action required')
}

const ALLOWED_DEFINITION_PATHS = new Set([SOURCE_OF_TRUTH, EXPORT_OUTPUT_PATH])

const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json'])
const SKIPPED_DIR_NAMES = new Set(['__tests__', 'node_modules', '.git', 'dist', 'build', '.next'])

function walk(dir: string, acc: string[] = []): string[] {
  const absDir = path.join(root, dir)
  if (!fs.existsSync(absDir)) return acc
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIPPED_DIR_NAMES.has(entry.name)) continue
      walk(rel, acc)
    } else if (SCANNED_EXTENSIONS.has(path.extname(entry.name))) {
      acc.push(rel)
    }
  }
  return acc
}

describe('AC-40.5: a test that fails if a second parallel definition of the five states appears in the repository', () => {
  it('the guard detects an injected second definition (self-test)', () => {
    const fixture = `const STATUSES = [
      { label: 'waiting/pending' },
      { label: 'blocked/overdue/action required' },
    ]`
    expect(containsParallelStatusDefinition(fixture)).toBe(true)
  })

  it('the guard does not flag a file that only imports/re-exports the vocabulary (self-test)', () => {
    const fixture = `import { STATUS_STATES } from '@/lib/statusVocabulary'\nexport { STATUS_STATES }`
    expect(containsParallelStatusDefinition(fixture)).toBe(false)
  })

  it('the guard does not flag a file naming only one of the two phrases (self-test)', () => {
    expect(containsParallelStatusDefinition("label: 'waiting/pending'")).toBe(false)
    expect(containsParallelStatusDefinition("label: 'blocked/overdue/action required'")).toBe(false)
  })

  it('no file in the repository outside the single definition and its generated export redefines the five states', () => {
    const scanned = [
      ...walk('src'),
      ...walk('scripts'),
      ...walk('vendor/picpeak/backend/src'),
      ...walk('vendor/picpeak/frontend/src'),
      ...walk('exports'),
    ]

    const offenders = scanned.filter((rel) => {
      if (ALLOWED_DEFINITION_PATHS.has(rel)) return false
      return containsParallelStatusDefinition(read(rel))
    })

    expect(offenders).toEqual([])
  })
})
