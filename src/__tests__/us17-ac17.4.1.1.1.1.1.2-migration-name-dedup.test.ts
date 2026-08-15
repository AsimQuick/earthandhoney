/**
 * ---
 * file: src/__tests__/us17-ac17.4.1.1.1.1.1.2-migration-name-dedup.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.4.1.1.1.1.1.2 — PIVOT_AUDIT.md re-runs the six
 *          commands recorded in AC-17.4.1.1.1.1.1.1, reduces the
 *          migration-directory portion of their output (405 raw matching
 *          lines) to a deduplicated list of every distinct field, column,
 *          or setting name that output surfaces, merges snake_case/
 *          camelCase spellings of the same underlying name into a single
 *          entry, and states the raw hit count the list is reduced from.
 *          This suite independently re-runs the equivalent search directly
 *          against the vendored fork (a pure Node re-implementation of
 *          `grep -rIn --include="*.js" -i`, so the check does not depend
 *          on a `grep` binary being present), re-derives the unique-line
 *          and no-name-line counts, and asserts every name PIVOT_AUDIT.md
 *          records is genuinely present in that output and that no other
 *          name is left out.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.4.1.1.1.1.1.2
 * ---
 */

import fs from 'fs'
import path from 'path'
import { PICPEAK_MIGRATION_MANIFEST } from '@/lib/picpeakMigrationManifest'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('PIVOT_AUDIT.md')

// This AC re-runs AC-17.4.1.1.1.1.1.1's search, which is explicitly scoped
// to the pinned commit's own content ("confirmed clean ... no local
// modification to the searched directories that would make the results
// diverge from the pin"). Migrations this project added afterwards —
// PICPEAK_MIGRATION_MANIFEST's `origin: 'fork'` lane (AC-33.5.2.1) — are
// local modifications by that definition, so the live re-scan excludes
// them to keep reproducing the pin, not whatever this project has since
// added on top of it.
const FORK_MIGRATION_PATHS = new Set(
  PICPEAK_MIGRATION_MANIFEST
    .filter((entry) => entry.origin === 'fork')
    .map((entry) => path.join('vendor/picpeak', entry.path))
)

// The AC-17.4.1.1.1.1.1.2 section only, bounded at the next top-level
// heading so a match cannot be satisfied by unrelated text elsewhere in
// this multi-story audit document, and so the AC-14.6 recommendation/
// open-questions block stays the document's final section.
const sectionStart = doc.indexOf('## AC-17.4.1.1.1.1.1.2')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1
    ? ''
    : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

const MIGRATIONS_DIR = 'vendor/picpeak/backend/migrations'
const PINNED_COMMIT = 'eb263137b98935754155824de2a03848121304b6'

const TERMS = ['expir', 'expires_at', 'expiry', 'ttl', 'valid_until', 'lifetime']

interface Hit {
  file: string
  line: number
  content: string
}

// Faithful re-implementation of what
// `grep -rIn --include="*.js" -i -- "<term>" <dir> | wc -l` would surface
// when the combined src+migrations command's output is filtered to lines
// under <dir> — walking <dir> alone yields the identical set of lines.
function grepDir(dir: string, term: string): Hit[] {
  const needle = term.toLowerCase()
  const hits: Hit[] = []

  function walk(d: string) {
    for (const entry of fs.readdirSync(path.join(root, d), { withFileTypes: true })) {
      const relChild = path.join(d, entry.name)
      if (entry.isDirectory()) {
        walk(relChild)
      } else if (entry.isFile() && entry.name.endsWith('.js') && !FORK_MIGRATION_PATHS.has(relChild)) {
        const lines = fs.readFileSync(path.join(root, relChild), 'utf8').split('\n')
        lines.forEach((content, idx) => {
          if (content.toLowerCase().includes(needle)) {
            hits.push({ file: relChild, line: idx + 1, content })
          }
        })
      }
    }
  }

  walk(dir)
  return hits
}

// The 8 names/pairs PIVOT_AUDIT.md records, each as one or more exact
// case-sensitive substrings that count as "the same name".
const RECORDED_NAMES: Record<string, string[]> = {
  expires_at: ['expires_at'],
  'invite_expires_at/hasInviteExpiresAt': ['invite_expires_at', 'hasInviteExpiresAt'],
  valid_until: ['valid_until'],
  expiry_date: ['expiry_date'],
  expiration_warning: ['expiration_warning'],
  'gallery_expired/galleryExpiredExists': ['gallery_expired', 'galleryExpiredExists'],
  event_require_expiration: ['event_require_expiration'],
  revoked_tokens_expires_at_index: ['revoked_tokens_expires_at_index'],
}

const ALL_SPELLINGS = Object.values(RECORDED_NAMES).flat()

describe('AC-17.4.1.1.1.1.1.2: migration-directory output reduced to a deduplicated name list', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.4.1.1.1.1.1.2 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.4\.1\.1\.1\.1\.1\.2\b/)
    })

    it('has a dedicated AC-17.4.1.1.1.1.1.2 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('sits after the AC-17.4.1.1.1.1.1.1 section it builds on', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.4.1.1.1.1.1.1'))
    })

    it('states this is code-level only, no live Backstage required', () => {
      expect(section).toMatch(/no live Backstage instance was started or used/)
    })

    it('states the same pinned commit as AC-17.4.1.1.1.1.1.1', () => {
      expect(section).toMatch(new RegExp(PINNED_COMMIT))
    })

    it('states nothing is classified and no name is dropped for looking irrelevant', () => {
      expect(section).toMatch(/[Nn]othing.*is classified/)
      expect(section).toMatch(/no name (is|was) dropped for looking irrelevant/)
    })
  })

  describe('raw hit count reproduces independently', () => {
    it('the per-term migration-directory counts recorded here match AC-17.4.1.1.1.1.1.1’s split table and sum to 405', () => {
      const recordedMigrationCounts: Record<string, number> = {
        expir: 258,
        expires_at: 94,
        expiry: 49,
        ttl: 2,
        valid_until: 2,
        lifetime: 0,
      }

      let total = 0
      for (const term of TERMS) {
        const n = recordedMigrationCounts[term]
        expect(section).toMatch(new RegExp(`\\|\\s*\`${term}\`\\s*\\|\\s*${n}\\s*\\|`))
        total += n
      }
      expect(total).toBe(405)
      expect(section).toMatch(/\b405\b/)
    })

    it('independently recomputing each term against the vendored migrations directory matches the recorded counts', () => {
      const recordedMigrationCounts: Record<string, number> = {
        expir: 258,
        expires_at: 94,
        expiry: 49,
        ttl: 2,
        valid_until: 2,
        lifetime: 0,
      }
      for (const term of TERMS) {
        expect(grepDir(MIGRATIONS_DIR, term).length).toBe(recordedMigrationCounts[term])
      }
    })

    it('states the recorded hit count (405) this list is reduced from', () => {
      expect(section).toMatch(/reduced from: 405/)
    })
  })

  describe('unique-line and no-name-line accounting', () => {
    // The raw 405 hits, one array entry per (term, matching line) pair —
    // duplicated across terms exactly as `wc -l` on each command would
    // count them.
    function rawHits(): Hit[] {
      return TERMS.flatMap((term) => grepDir(MIGRATIONS_DIR, term))
    }

    it('405 raw hits collapse to 262 unique file:line entries', () => {
      const raw = rawHits()
      expect(raw.length).toBe(405)
      const unique = new Set(raw.map((h) => `${h.file}:${h.line}`))
      expect(unique.size).toBe(262)
      expect(section).toMatch(/262 unique matched lines/)
    })

    it('67 of the unique lines contain none of the 8 recorded names (prose/false-positive only)', () => {
      const raw = rawHits()
      const byKey = new Map<string, Hit>()
      raw.forEach((h) => byKey.set(`${h.file}:${h.line}`, h))
      const unique = [...byKey.values()]
      const noName = unique.filter((h) => !ALL_SPELLINGS.some((s) => h.content.includes(s)))
      expect(noName.length).toBe(67)
      expect(section).toMatch(/67 of the 262 unique/)

      // The two `ttl` false positives named in the doc are among them.
      expect(noName.some((h) => h.content.includes('settled'))).toBe(true)
      expect(noName.some((h) => h.content.includes('Throttle'))).toBe(true)
    })
  })

  describe('all 8 recorded names are genuinely present and none is left out', () => {
    it.each(Object.entries(RECORDED_NAMES))('records "%s" and it is present in the vendored migrations tree', (_key, spellings) => {
      for (const spelling of spellings) {
        expect(section).toContain(spelling)
        expect(grepDir(MIGRATIONS_DIR, spelling).length).toBeGreaterThan(0)
      }
    })

    it('records the two snake_case/camelCase pairs together as single entries, not as four separate names', () => {
      expect(section).toMatch(/invite_expires_at.*hasInviteExpiresAt|hasInviteExpiresAt.*invite_expires_at/)
      expect(section).toMatch(/gallery_expired.*galleryExpiredExists|galleryExpiredExists.*gallery_expired/)
    })

    it('the table of names has exactly 8 rows, one per recorded entry', () => {
      const lines = section.split('\n')
      const header = lines.findIndex((l) => l.startsWith('| Name(s) recorded together |'))
      expect(header).toBeGreaterThan(-1)

      const rows: string[] = []
      for (let i = header + 2; i < lines.length && lines[i].startsWith('|'); i++) {
        rows.push(lines[i])
      }
      expect(rows.length).toBe(Object.keys(RECORDED_NAMES).length)
      expect(rows.length).toBe(8)

      // Every recorded entry has exactly one row, led by its name cell,
      // and that row carries every spelling of that entry.
      for (const spellings of Object.values(RECORDED_NAMES)) {
        const own = rows.filter((r) => r.startsWith(`| \`${spellings[0]}\``))
        expect(own).toHaveLength(1)
        for (const spelling of spellings) expect(own[0]).toContain(spelling)
      }
    })

    it('no table row in this section leads with a bare number, which would corrupt AC-14.1’s document-wide inventory-row scan', () => {
      // AC-14.1 asserts every `| <n> | ...` row in PIVOT_AUDIT.md is an
      // inventory row carrying one of its four classifications. A numbered
      // table anywhere else in the document silently breaks that check.
      expect(section.match(/^\|\s*\d+\s*\|/gm)).toBeNull()
    })

    it('independently re-deriving the name list from the raw output yields exactly the recorded spellings, no more and no fewer', () => {
      // Rather than checking the doc's list against a hand-maintained set
      // of words to ignore, re-derive the list mechanically and compare.
      //
      // A field/column/setting name is identifier-shaped: it either
      // contains an underscore (snake_case) or has a lowercase→uppercase
      // hump (camelCase). Natural-language prose does not, in any of the
      // locales these migrations seed (EN/DE/FR/PT/ES/RU/SL/NL) — every
      // inflection of "expire" ("expires", "expiración", "expirée",
      // "verloopt", …) is a single uncased word, as are the two `ttl`
      // substring false positives ("settled", "Throttle"). So the rule
      // separates names from prose without enumerating either.
      const isNameShaped = (tok: string) => tok.includes('_') || /\p{Ll}\p{Lu}/u.test(tok)

      // Unicode-aware token scan, so accented inflections are captured
      // whole rather than truncated at the accented character.
      const tokenRe = /[\p{L}_][\p{L}\p{N}_]*/gu

      const derived = new Set<string>()
      const termRe = new RegExp(TERMS.join('|'), 'i')

      for (const hit of TERMS.flatMap((term) => grepDir(MIGRATIONS_DIR, term))) {
        // `\n`/`\r`/`\t` escapes inside string literals are not part of
        // the adjacent identifier — without this, the `\nExpira` in a
        // translated email body would read as camelCase "nExpira".
        for (const [tok] of hit.content.replace(/\\[nrt]/g, ' ').matchAll(tokenRe)) {
          if (!termRe.test(tok)) continue
          if (!isNameShaped(tok)) continue
          derived.add(tok)
        }
      }

      expect([...derived].sort()).toEqual([...ALL_SPELLINGS].sort())
    })
  })

  it('closes the AC with an explicit verdict naming the pin, the reduced-from count, and the 8 names', () => {
    expect(section).toMatch(/AC-17\.4\.1\.1\.1\.1\.1\.2 is satisfied/)
    expect(section).toMatch(new RegExp(PINNED_COMMIT))
    expect(section).toMatch(/\b405\b/)
    expect(section).toMatch(/\b8\b/)
    for (const spellings of Object.values(RECORDED_NAMES)) {
      for (const spelling of spellings) {
        expect(section).toContain(spelling)
      }
    }
  })
})
