/**
 * ---
 * file: src/__tests__/us17-ac17.4.1.1.1.1.1.3-backend-source-merged-inventory.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.4.1.1.1.1.1.3 — PIVOT_AUDIT.md re-runs the six
 *          commands recorded in AC-17.4.1.1.1.1.1.1 against the fork's
 *          backend source directory (746 raw matching lines), reduces that
 *          portion of their output to a deduplicated list of every distinct
 *          field, column, or setting name it surfaces using the same
 *          camelCase/snake_case one-entry-per-value treatment as
 *          AC-17.4.1.1.1.1.1.2, and merges it with that criterion's
 *          migration-directory list into one deduplicated inventory in which
 *          each underlying value appears exactly once, marked as surfaced in
 *          the backend source, the migrations, or both. This suite
 *          independently re-runs the equivalent search directly against the
 *          vendored fork (a pure Node re-implementation of
 *          `grep -rIn --include="*.js" -i`, so the check does not depend on a
 *          `grep` binary being present), re-derives the raw/unique/no-name
 *          counts, confirms every recorded name and every cited file:line is
 *          genuine, confirms the two migrations-only names are genuinely
 *          absent from the backend source, and confirms nothing recorded by
 *          AC-17.4.1.1.1.1.1.2 is lost in the merge.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.4.1.1.1.1.1.3
 * ---
 */

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('PIVOT_AUDIT.md')

// The AC-17.4.1.1.1.1.1.3 section only, bounded at the next top-level
// heading so a match cannot be satisfied by unrelated text elsewhere in
// this multi-story audit document, and so the AC-14.6 recommendation/
// open-questions block stays the document's final section.
const sectionStart = doc.indexOf('## AC-17.4.1.1.1.1.1.3')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1
    ? ''
    : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

// The section with all runs of whitespace collapsed, for asserting on prose
// sentences that the document hard-wraps across several lines.
const flat = section.replace(/\s+/g, ' ')

const BACKEND_SRC_DIR = 'vendor/picpeak/backend/src'
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
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
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

// The raw hits, one entry per (term, matching line) pair — duplicated
// across terms exactly as `wc -l` on each of the six commands counts them.
const rawBackendHits = TERMS.flatMap((term) => grepDir(BACKEND_SRC_DIR, term))

const uniqueBackendLines = (() => {
  const byKey = new Map<string, Hit>()
  rawBackendHits.forEach((h) => byKey.set(`${h.file}:${h.line}`, h))
  return [...byKey.values()]
})()

const RECORDED_BACKEND_COUNTS: Record<string, number> = {
  expir: 439,
  expires_at: 144,
  expiry: 38,
  ttl: 79,
  valid_until: 45,
  lifetime: 1,
}

// The 33 backend-source names PIVOT_AUDIT.md records, each as one or more
// exact case-sensitive spellings that count as "the same underlying name".
const BACKEND_NAMES: Record<string, string[]> = {
  'expires_at/expiresAt': ['expires_at', 'expiresAt'],
  expiresIn: ['expiresIn'],
  expiry_date: ['expiry_date'],
  expiration_days: ['expiration_days'],
  general_default_expiration_days: ['general_default_expiration_days'],
  require_expiration: ['require_expiration'],
  event_require_expiration: ['event_require_expiration'],
  is_expired: ['is_expired'],
  Expires: ['Expires'],
  TOKEN_EXPIRED: ['TOKEN_EXPIRED'],
  GALLERY_EXPIRED: ['GALLERY_EXPIRED'],
  TOKEN_NO_EXPIRY: ['TOKEN_NO_EXPIRY'],
  expired_or_missing: ['expired_or_missing'],
  TokenExpiredError: ['TokenExpiredError'],
  'valid_until/validUntil': ['valid_until', 'validUntil'],
  CACHE_TTL: ['CACHE_TTL'],
  CACHE_TTL_MS: ['CACHE_TTL_MS'],
  CODE_TTL_MS: ['CODE_TTL_MS'],
  FONTS_CACHE_TTL_MS: ['FONTS_CACHE_TTL_MS'],
  GALLERY_TOKEN_TTL_SECONDS: ['GALLERY_TOKEN_TTL_SECONDS'],
  INVITATION_TTL_MS: ['INVITATION_TTL_MS'],
  PASSWORD_RESET_TTL_MS: ['PASSWORD_RESET_TTL_MS'],
  PUBLIC_SITE_CACHE_TTL_MS: ['PUBLIC_SITE_CACHE_TTL_MS'],
  TOKEN_TTL_SECONDS: ['TOKEN_TTL_SECONDS'],
  UPLOAD_EXPIRATION_MS: ['UPLOAD_EXPIRATION_MS'],
  expiringEvents: ['expiringEvents'],
  expiration_warning: ['expiration_warning'],
  gallery_expired: ['gallery_expired'],
  expirationChecker: ['expirationChecker'],
  expiring: ['expiring'],
  'event.expired': ['event.expired'],
  expired: ['expired'],
  expires: ['expires'],
}

const BACKEND_SPELLINGS = Object.values(BACKEND_NAMES).flat()

// The 8 names/pairs AC-17.4.1.1.1.1.1.2 recorded from the migration
// directory — the other half of the merge, restated here so this suite can
// prove none of them is lost.
const MIGRATION_NAMES: Record<string, string[]> = {
  expires_at: ['expires_at'],
  'invite_expires_at/hasInviteExpiresAt': ['invite_expires_at', 'hasInviteExpiresAt'],
  valid_until: ['valid_until'],
  expiry_date: ['expiry_date'],
  expiration_warning: ['expiration_warning'],
  'gallery_expired/galleryExpiredExists': ['gallery_expired', 'galleryExpiredExists'],
  event_require_expiration: ['event_require_expiration'],
  revoked_tokens_expires_at_index: ['revoked_tokens_expires_at_index'],
}

// The merged inventory exactly as PIVOT_AUDIT.md records it: entry key →
// [leading spelling, origin].
const MERGED_INVENTORY: Array<[string, string, string]> = [
  ['E1', 'expires_at', 'Both'],
  ['E2', 'invite_expires_at', 'Migrations only'],
  ['E3', 'valid_until', 'Both'],
  ['E4', 'expiry_date', 'Both'],
  ['E5', 'expiration_warning', 'Both'],
  ['E6', 'gallery_expired', 'Both'],
  ['E7', 'event_require_expiration', 'Both'],
  ['E8', 'revoked_tokens_expires_at_index', 'Migrations only'],
  ['E9', 'expiresIn', 'Backend source only'],
  ['E10', 'expiration_days', 'Backend source only'],
  ['E11', 'general_default_expiration_days', 'Backend source only'],
  ['E12', 'require_expiration', 'Backend source only'],
  ['E13', 'is_expired', 'Backend source only'],
  ['E14', 'Expires', 'Backend source only'],
  ['E15', 'TOKEN_EXPIRED', 'Backend source only'],
  ['E16', 'GALLERY_EXPIRED', 'Backend source only'],
  ['E17', 'TOKEN_NO_EXPIRY', 'Backend source only'],
  ['E18', 'expired_or_missing', 'Backend source only'],
  ['E19', 'TokenExpiredError', 'Backend source only'],
  ['E20', 'CACHE_TTL', 'Backend source only'],
  ['E21', 'CACHE_TTL_MS', 'Backend source only'],
  ['E22', 'CODE_TTL_MS', 'Backend source only'],
  ['E23', 'FONTS_CACHE_TTL_MS', 'Backend source only'],
  ['E24', 'GALLERY_TOKEN_TTL_SECONDS', 'Backend source only'],
  ['E25', 'INVITATION_TTL_MS', 'Backend source only'],
  ['E26', 'PASSWORD_RESET_TTL_MS', 'Backend source only'],
  ['E27', 'PUBLIC_SITE_CACHE_TTL_MS', 'Backend source only'],
  ['E28', 'TOKEN_TTL_SECONDS', 'Backend source only'],
  ['E29', 'UPLOAD_EXPIRATION_MS', 'Backend source only'],
  ['E30', 'expiringEvents', 'Backend source only'],
  ['E31', 'expirationChecker', 'Backend source only'],
  ['E32', 'expiring', 'Backend source only'],
  ['E33', 'event.expired', 'Backend source only'],
  ['E34', 'expired', 'Backend source only'],
  ['E35', 'expires', 'Backend source only'],
]

/** The rows of a markdown table in `section` whose header starts with `lead`. */
function tableRows(lead: string): string[] {
  const lines = section.split('\n')
  const header = lines.findIndex((l) => l.startsWith(lead))
  if (header === -1) return []
  const rows: string[] = []
  for (let i = header + 2; i < lines.length && lines[i].startsWith('|'); i++) {
    rows.push(lines[i])
  }
  return rows
}

describe('AC-17.4.1.1.1.1.1.3: backend-source names merged with the migration list', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.4.1.1.1.1.1.3 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.4\.1\.1\.1\.1\.1\.3\b/)
    })

    it('has a dedicated AC-17.4.1.1.1.1.1.3 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits after the AC-17.4.1.1.1.1.1.2 section whose list it merges with', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.4.1.1.1.1.1.2'))
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('states this is code-level only, no live gallery created or changed', () => {
      expect(flat).toMatch(/no live Backstage instance was started or used/)
    })

    it('states the same pinned commit as AC-17.4.1.1.1.1.1.1', () => {
      expect(section).toMatch(new RegExp(PINNED_COMMIT))
    })

    it('states nothing is classified here and no name is dropped for looking irrelevant', () => {
      expect(flat).toMatch(/[Nn]othing is classified/)
      expect(flat).toMatch(/no name is dropped for looking irrelevant/)
    })

    it('names AC-17.4.1.1.1.1.2 and AC-17.4.1.1.1.1.3 as the criteria this inventory is handed to', () => {
      expect(section).toMatch(/AC-17\.4\.1\.1\.1\.1\.2 and AC-17\.4\.1\.1\.1\.1\.3/)
    })
  })

  describe('raw hit count reproduces independently', () => {
    it('the per-term backend-source counts recorded here match AC-17.4.1.1.1.1.1.1’s split table and sum to 746', () => {
      let total = 0
      for (const term of TERMS) {
        const n = RECORDED_BACKEND_COUNTS[term]
        expect(section).toMatch(new RegExp(`\\|\\s*\`${term}\`\\s*\\|\\s*${n}\\s*\\|`))
        total += n
      }
      expect(total).toBe(746)
      expect(section).toMatch(/\b746\b/)
    })

    it('independently recomputing each term against the vendored backend source matches the recorded counts', () => {
      for (const term of TERMS) {
        expect(grepDir(BACKEND_SRC_DIR, term).length).toBe(RECORDED_BACKEND_COUNTS[term])
      }
    })

    it('states the recorded hit count (746) this list is reduced from', () => {
      expect(section).toMatch(/reduced from: 746/)
    })
  })

  describe('unique-line and no-name-line accounting', () => {
    it('746 raw hits collapse to 546 unique file:line entries', () => {
      expect(rawBackendHits.length).toBe(746)
      expect(uniqueBackendLines.length).toBe(546)
      expect(section).toMatch(/546 unique matched lines/)
    })

    it('118 of the unique lines carry none of the 33 recorded names (prose/false-positive only)', () => {
      const noName = uniqueBackendLines.filter(
        (h) => !BACKEND_SPELLINGS.some((s) => h.content.includes(s)),
      )
      expect(noName.length).toBe(118)
      expect(section).toMatch(/\*\*118 contain none of the names recorded below\*\*/)
    })

    it('the prose and false-positive examples the doc names to account for those lines are real', () => {
      // Each bucket the doc uses to account for the no-name lines has to be
      // checkable against the fork, not merely asserted.
      const proseAndFalsePositives = [
        'rejects when a non-expired pending invitation exists',
        'Password gates, expiring links',
      ]
      const behaviourNames = [
        'checkExpirations',
        'extendExpiration',
        'handleExpiredEvent',
        'isSessionExpired',
        'queueExpirationWarning',
        'startExpirationChecker',
        'cleanupExpiredRevocations',
        'cleanupExpiredUploads',
        'buildCookieOptionsWithExpiry',
      ]
      const internalVars = ['cacheExpiry', 'expiredEvents', 'expiredIds', 'newExpiration', 'ttlSeconds']
      const ttlFalsePositives = ['settleReject', 'settleResolve', 'allSettled', 'throttling', 'skipThrottle', 'throttled_24h']

      for (const token of [...proseAndFalsePositives, ...behaviourNames, ...internalVars, ...ttlFalsePositives]) {
        // The doc cites it (matched against the whitespace-collapsed section,
        // since the document hard-wraps the quoted prose examples) ...
        expect([token, flat.includes(token)]).toEqual([token, true])
        // ... and it really occurs in the search output being accounted for.
        const found = uniqueBackendLines.some((h) => h.content.includes(token))
        expect([token, found]).toEqual([token, true])
      }
    })
  })

  describe('all 33 backend-source names are genuinely present and correctly cited', () => {
    it.each(Object.entries(BACKEND_NAMES))(
      'records "%s" and every spelling of it occurs in the vendored backend source',
      (_key, spellings) => {
        for (const spelling of spellings) {
          expect(section).toContain(spelling)
          expect(uniqueBackendLines.some((h) => h.content.includes(spelling))).toBe(true)
        }
      },
    )

    it('the evidence table has exactly 33 rows, one per recorded name', () => {
      const rows = tableRows('| Name(s) recorded together |')
      expect(rows.length).toBe(33)
      expect(rows.length).toBe(Object.keys(BACKEND_NAMES).length)

      // Every recorded entry has exactly one row, led by its first spelling,
      // and that row carries every spelling of that entry.
      for (const spellings of Object.values(BACKEND_NAMES)) {
        const own = rows.filter((r) => r.startsWith(`| \`${spellings[0]}\``))
        expect([spellings[0], own.length]).toEqual([spellings[0], 1])
        for (const spelling of spellings) expect(own[0]).toContain(spelling)
      }
    })

    it('records the camelCase/snake_case pairs together as single entries, not as separate names', () => {
      expect(section).toMatch(/`expires_at` \/ `expiresAt`/)
      expect(section).toMatch(/`valid_until` \/ `validUntil`/)
    })

    it('every file:line cited as evidence really contains the name it is cited for', () => {
      const rows = tableRows('| Name(s) recorded together |')
      let checked = 0

      for (const row of rows) {
        const cells = row.split('|').map((c) => c.trim()).filter((c) => c.length > 0)
        const nameCell = cells[0]
        const evidence = cells[3] ?? ''
        const names = [...nameCell.matchAll(/`([^`]+)`/g)].map((m) => m[1])

        for (const m of evidence.matchAll(/`(vendor\/[^`:]+):([\d,:]+)`/g)) {
          const file = m[1]
          const lineNos = m[2].split(/[,:]/).filter(Boolean).map(Number)
          const fileLines = read(file).split('\n')

          for (const n of lineNos) {
            checked++
            const content = fileLines[n - 1] ?? ''
            // `event.expired` is cited at the line declaring the event-type
            // constant, where it is spelled as the string value `expired`.
            const matched = names.some((nm) => content.includes(nm) || content.includes(nm.replace('event.', '')))
            expect([`${file}:${n}`, matched]).toEqual([`${file}:${n}`, true])
          }
        }
      }

      // Guards against the citation scan silently matching nothing.
      expect(checked).toBeGreaterThanOrEqual(50)
    })
  })

  describe('the merge loses nothing from AC-17.4.1.1.1.1.1.2', () => {
    it('the two migrations-only names really are absent from the backend source', () => {
      for (const spelling of ['invite_expires_at', 'hasInviteExpiresAt', 'revoked_tokens_expires_at_index']) {
        expect(grepDir(BACKEND_SRC_DIR, spelling).length).toBe(0)
        expect(grepDir(MIGRATIONS_DIR, spelling).length).toBeGreaterThan(0)
      }
      expect(section).toMatch(/[Mm]igrations only/)
    })

    it('the six names shared with the migrations really occur in both directories', () => {
      for (const spelling of [
        'expires_at',
        'valid_until',
        'expiry_date',
        'expiration_warning',
        'gallery_expired',
        'event_require_expiration',
      ]) {
        expect(grepDir(BACKEND_SRC_DIR, spelling).length).toBeGreaterThan(0)
        expect(grepDir(MIGRATIONS_DIR, spelling).length).toBeGreaterThan(0)
      }
    })

    it('every name AC-17.4.1.1.1.1.1.2 recorded appears in the merged inventory', () => {
      const rows = tableRows('| Entry | Name(s) | Surfaced in |')
      const inventoryText = rows.join('\n')
      for (const spellings of Object.values(MIGRATION_NAMES)) {
        for (const spelling of spellings) {
          expect([spelling, inventoryText.includes(spelling)]).toEqual([spelling, true])
        }
      }
      expect(section).toMatch(/nothing from that criterion is lost/)
    })

    it('the merged inventory has exactly 35 rows, each underlying value appearing exactly once', () => {
      const rows = tableRows('| Entry | Name(s) | Surfaced in |')
      expect(rows.length).toBe(35)
      expect(rows.length).toBe(MERGED_INVENTORY.length)
      expect(section).toMatch(/\*\*35 distinct merged entries\*\*/)

      // 33 backend names + 8 migration names, with the 6 shared collapsed.
      expect(Object.keys(BACKEND_NAMES).length + Object.keys(MIGRATION_NAMES).length - 6).toBe(35)

      // No underlying value is listed twice under different entry keys.
      const leads = rows.map((r) => (r.match(/^\|\s*E\d+\s*\|\s*`([^`]+)`/) ?? [])[1])
      expect(leads.filter(Boolean)).toHaveLength(35)
      expect(new Set(leads).size).toBe(35)
    })

    it.each(MERGED_INVENTORY)('merged entry %s is `%s`, marked "%s"', (key, name, origin) => {
      const rows = tableRows('| Entry | Name(s) | Surfaced in |')
      const row = rows.find((r) => new RegExp(`^\\|\\s*${key}\\s*\\|`).test(r))
      expect(row).toBeDefined()
      expect(row).toContain(`\`${name}\``)
      expect(row!.endsWith(`| ${origin} |`)).toBe(true)
    })
  })

  describe('the section does not corrupt other criteria’s document-wide scans', () => {
    it('no table row in this section leads with a bare number', () => {
      // AC-14.1 asserts every `| <n> | ...` row in PIVOT_AUDIT.md is an
      // inventory row carrying one of its four classifications. The merged
      // inventory is therefore keyed `E1`…`E35`, not `1`…`35`.
      expect(section.match(/^\|\s*\d+\s*\|/gm)).toBeNull()
    })
  })

  it('closes the AC with an explicit verdict naming the pin, the counts, and both halves of the merge', () => {
    expect(section).toMatch(/AC-17\.4\.1\.1\.1\.1\.1\.3 is satisfied/)
    expect(section).toMatch(new RegExp(PINNED_COMMIT))
    expect(section).toMatch(/\b746\b/)
    expect(section).toMatch(/\b546\b/)
    expect(section).toMatch(/\b118\b/)
    expect(section).toMatch(/\b33\b/)
    expect(section).toMatch(/\b35\b/)
    expect(section).toMatch(/Backend\s+source only \/ Migrations only \/ Both/)
  })
})
