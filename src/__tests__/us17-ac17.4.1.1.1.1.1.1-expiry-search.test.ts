/**
 * ---
 * file: src/__tests__/us17-ac17.4.1.1.1.1.1.1-expiry-search.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.4.1.1.1.1.1.1 — PIVOT_AUDIT.md states the pinned
 *          PicPeak commit and the expiry-related search terms (expir,
 *          expires_at, expiry, ttl, valid_until, lifetime), records the
 *          exact, re-runnable grep commands across the fork's backend
 *          source and migration directories with their file-type filter,
 *          and records each command's matching-line count. This suite
 *          independently re-runs the equivalent search directly against
 *          the vendored fork (a pure Node re-implementation of
 *          `grep -rIn --include="*.js" -i`, so the check does not depend
 *          on a `grep` binary being present) and asserts the recomputed
 *          counts match what the audit recorded, so a stale or fabricated
 *          count cannot silently pass review.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.4.1.1.1.1.1.1
 * ---
 */

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('PIVOT_AUDIT.md')

// The AC-17.4.1.1.1.1.1.1 section only, bounded at the next top-level
// heading so a match cannot be satisfied by unrelated text elsewhere in
// this multi-story audit document, and so the AC-14.6 recommendation/
// open-questions block stays the document's final section.
const sectionStart = doc.indexOf('## AC-17.4.1.1.1.1.1.1')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1
    ? ''
    : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

const SRC_DIR = 'vendor/picpeak/backend/src'
const MIGRATIONS_DIR = 'vendor/picpeak/backend/migrations'
const PINNED_COMMIT = 'eb263137b98935754155824de2a03848121304b6'

const TERMS = ['expir', 'expires_at', 'expiry', 'ttl', 'valid_until', 'lifetime']

// Faithful re-implementation of what
// `grep -rIn --include="*.js" -i -- "<term>" <dirs...> | wc -l` counts: the
// number of lines, across every .js file found recursively in the given
// directories, that contain the term case-insensitively.
function countMatchingLines(dirs: string[], term: string): number {
  const needle = term.toLowerCase()
  let count = 0

  function walk(dir: string) {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const relChild = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(relChild)
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        const lines = fs.readFileSync(path.join(root, relChild), 'utf8').split('\n')
        for (const line of lines) {
          if (line.toLowerCase().includes(needle)) count++
        }
      }
    }
  }

  dirs.forEach(walk)
  return count
}

function listNonMarkdownFiles(dir: string): string[] {
  const out: string[] = []
  function walk(d: string) {
    for (const entry of fs.readdirSync(path.join(root, d), { withFileTypes: true })) {
      const relChild = path.join(d, entry.name)
      if (entry.isDirectory()) walk(relChild)
      else if (entry.isFile() && !entry.name.endsWith('.md')) out.push(relChild)
    }
  }
  walk(dir)
  return out
}

describe('AC-17.4.1.1.1.1.1.1: expiry search — terms, commands, and hit counts against the pinned commit', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.4.1.1.1.1.1.1 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.4\.1\.1\.1\.1\.1\.1\b/)
    })

    it('has a dedicated AC-17.4.1.1.1.1.1.1 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('sits after the AC-17.3 section it follows', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.3'))
    })

    it('states this is code-level only, no live Backstage required', () => {
      expect(section).toMatch(/no live Backstage instance was started or used/)
    })
  })

  describe('the pinned commit', () => {
    it('states the exact pinned commit hash', () => {
      expect(section).toMatch(new RegExp(PINNED_COMMIT))
    })

    it('matches the pin recorded in PICPEAK_UPSTREAM.md, not a different or stale hash', () => {
      const upstreamDoc = read('PICPEAK_UPSTREAM.md')
      expect(upstreamDoc).toMatch(new RegExp(PINNED_COMMIT))
    })

    it('is a full 40-character commit hash, not a floating ref', () => {
      expect(PINNED_COMMIT).toMatch(/^[0-9a-f]{40}$/i)
    })
  })

  describe('search terms', () => {
    it('lists all six minimum-required terms', () => {
      for (const term of TERMS) {
        expect(section).toMatch(new RegExp('`' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '`'))
      }
    })

    it('adds no term beyond the six required', () => {
      // Every backtick-quoted single-word token in the "Search terms" line
      // must be one of the six terms this AC requires at minimum.
      const termsLineMatch = section.match(/`expir`.*$/m)
      expect(termsLineMatch).not.toBeNull()
      const tokens = (termsLineMatch as RegExpMatchArray)[0].match(/`([a-z_]+)`/g) || []
      const cleaned = tokens.map((t) => t.replace(/`/g, ''))
      expect(cleaned.sort()).toEqual([...TERMS].sort())
    })
  })

  describe('directories searched and file-type filter', () => {
    it('names both directories', () => {
      expect(section).toMatch(new RegExp('`' + SRC_DIR.replace(/\//g, '\\/') + '`'))
      expect(section).toMatch(new RegExp('`' + MIGRATIONS_DIR.replace(/\//g, '\\/') + '`'))
    })

    it('names the *.js file-type filter', () => {
      expect(section).toMatch(/\*\.js/)
    })

    it('both directories really exist in the vendored tree', () => {
      expect(fs.existsSync(path.join(root, SRC_DIR))).toBe(true)
      expect(fs.existsSync(path.join(root, MIGRATIONS_DIR))).toBe(true)
    })

    it('*.js is really the only non-markdown file extension in either directory', () => {
      const nonMd = [...listNonMarkdownFiles(SRC_DIR), ...listNonMarkdownFiles(MIGRATIONS_DIR)]
      expect(nonMd.length).toBeGreaterThan(0)
      for (const file of nonMd) {
        expect(file.endsWith('.js')).toBe(true)
      }
    })
  })

  describe('exact commands recorded, one per term', () => {
    it.each(TERMS)('records the exact grep command for "%s"', (term) => {
      const expectedCommand = `grep -rIn --include="*.js" -i -- "${term}" ${SRC_DIR} ${MIGRATIONS_DIR}`
      expect(section).toContain(expectedCommand)
    })
  })

  describe('recorded hit counts reproduce independently', () => {
    // These are the counts PIVOT_AUDIT.md records for each command above,
    // pinned here so a change to either the doc or the vendored tree that
    // breaks reproducibility fails loudly rather than rotting silently.
    const recordedCombinedCounts: Record<string, number> = {
      expir: 697,
      expires_at: 238,
      expiry: 87,
      ttl: 81,
      valid_until: 47,
      lifetime: 1,
    }

    it.each(TERMS)('the recorded combined count for "%s" is in the doc', (term) => {
      const n = recordedCombinedCounts[term]
      const commandLine = `grep -rIn --include="*.js" -i -- "${term}" ${SRC_DIR} ${MIGRATIONS_DIR}`
      const idx = section.indexOf(commandLine)
      expect(idx).toBeGreaterThan(-1)
      const after = section.slice(idx + commandLine.length, idx + commandLine.length + 40)
      expect(after).toMatch(new RegExp(`\\n${n}\\b`))
    })

    it.each(TERMS)(
      'independently recomputing the search for "%s" against the vendored fork matches the recorded count',
      (term) => {
        const recomputed = countMatchingLines([SRC_DIR, MIGRATIONS_DIR], term)
        expect(recomputed).toBe(recordedCombinedCounts[term])
      }
    )

    it('the per-directory split table matches the combined counts and the vendored tree', () => {
      const recordedSplit: Record<string, [number, number]> = {
        expir: [439, 258],
        expires_at: [144, 94],
        expiry: [38, 49],
        ttl: [79, 2],
        valid_until: [45, 2],
        lifetime: [1, 0],
      }

      for (const term of TERMS) {
        const [srcCount, migCount] = recordedSplit[term]
        expect(section).toMatch(new RegExp(`\\| \`${term}\` \\| ${srcCount} \\| ${migCount} \\| ${recordedCombinedCounts[term]} \\|`))
        expect(srcCount + migCount).toBe(recordedCombinedCounts[term])

        expect(countMatchingLines([SRC_DIR], term)).toBe(srcCount)
        expect(countMatchingLines([MIGRATIONS_DIR], term)).toBe(migCount)
      }
    })
  })

  describe('no name extraction or classification happens at this AC', () => {
    it('states explicitly that no name is extracted and nothing is classified', () => {
      expect(section).toMatch(/No name is\s*\n?extracted and nothing found is classified here/)
    })
  })

  it('closes the AC with an explicit verdict naming the pin, the terms, and the counts', () => {
    expect(section).toMatch(/AC-17\.4\.1\.1\.1\.1\.1\.1 is satisfied/)
    expect(section).toMatch(new RegExp(PINNED_COMMIT))
    for (const term of TERMS) {
      expect(section).toMatch(new RegExp('`' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '`'))
    }
    expect(section).toMatch(/697, 238, 87, 81, 47, 1/)
  })
})
