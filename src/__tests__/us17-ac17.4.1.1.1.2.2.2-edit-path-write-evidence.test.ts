/**
 * ---
 * file: src/__tests__/us17-ac17.4.1.1.1.2.2.2-edit-path-write-evidence.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.4.1.1.1.2.2.2 — against the PO-fixed, pre-run list
 *          of fifteen `.update(`/`.increment(`/`.del(` call sites on the
 *          `events` table (the edit-path inspection scope), PIVOT_AUDIT.md
 *          records for every entry in the AC-17.4.1.1.1.2.1 confirmed set
 *          either the call site(s) among those fifteen that set, extend,
 *          recompute, or clear it once a Gallery already exists, or
 *          `no edit-path write found`, in one 13-row table plus one count
 *          line and nothing else. This suite: reproduces the fixed
 *          fifteen-site list directly from the vendored fork (not taken on
 *          trust); confirms the table's 13 rows match the confirmed set in
 *          order with the right written/no-write split; and independently
 *          reproduces every write and no-write claim by reading the cited
 *          code's actual enclosing function body.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.4.1.1.1.2.2.2
 * ---
 */

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const lines = (rel: string) => read(rel).split('\n')
const lineAt = (rel: string, n: number) => lines(rel)[n - 1] ?? ''

const doc = read('PIVOT_AUDIT.md')

const PINNED_COMMIT = 'eb263137b98935754155824de2a03848121304b6'
const VENDOR_SRC = 'vendor/picpeak/backend/src'

const sectionStart = doc.indexOf('## AC-17.4.1.1.1.2.2.2')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1 ? '' : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

const CONFIRMED = ['E1', 'E4', 'E5', 'E6', 'E7', 'E10', 'E11', 'E12', 'E13', 'E16', 'E30', 'E32', 'E33']
const WRITTEN = ['E1', 'E4', 'E6', 'E33']
const NO_WRITE = ['E5', 'E7', 'E10', 'E11', 'E12', 'E13', 'E16', 'E30', 'E32']

// The fixed, pre-run inspection scope this AC's instructions hand down —
// exactly what `grep -rn "('events')" ... | grep -E ".update\(|.increment\(|.del\("`
// returns at the pinned commit, paths relative to VENDOR_SRC.
const FIXED_SITES: Array<[string, number]> = [
  ['routes/adminEvents.js', 284],
  ['routes/adminEvents.js', 1063],
  ['routes/events.js', 346],
  ['routes/events.js', 359],
  ['routes/events.js', 383],
  ['routes/adminExternalMedia.js', 178],
  ['services/downloadZipService.js', 64],
  ['services/downloadZipService.js', 225],
  ['services/downloadZipService.js', 313],
  ['services/expirationChecker.js', 97],
  ['services/eventService.js', 448],
  ['services/eventService.js', 459],
  ['services/eventService.js', 478],
  ['services/archiveService.js', 132],
  ['services/projectService.js', 93],
]

/** Reproduce the fixed-scope grep directly against the vendored tree. */
function findEventsTableWriteSites(): Array<[string, number]> {
  const hits: Array<[string, number]> = []
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, e.name)
      if (e.isDirectory()) walk(rel)
      else if (e.isFile() && e.name.endsWith('.js')) {
        const body = fs.readFileSync(path.join(root, rel), 'utf8').split('\n')
        body.forEach((l, i) => {
          if (l.includes("('events')") && /\.update\(|\.increment\(|\.del\(/.test(l)) {
            hits.push([rel.slice(`${VENDOR_SRC}/`.length), i + 1])
          }
        })
      }
    }
  }
  walk(VENDOR_SRC)
  return hits
}

/** Exact [start, end) line range of the function enclosing each fixed site. */
const FUNCTION_RANGES: Record<string, [number, number]> = {
  'routes/adminEvents.js:284': [266, 330], // deleteEventCascade
  'routes/adminEvents.js:1063': [1049, 1129], // POST /:id/publish
  'routes/events.js:346': [259, 355], // PUT /:id
  'routes/events.js:359': [355, 368], // DELETE /:id
  'routes/events.js:383': [368, 394], // POST /:id/extend
  'routes/adminExternalMedia.js:178': [51, 198], // POST /events/:id/import-external
  'services/downloadZipService.js:64': [50, 85], // getZipInfo
  'services/downloadZipService.js:225': [107, 275], // _build
  'services/downloadZipService.js:313': [301, 323], // _cleanup
  'services/expirationChecker.js:97': [94, 164], // handleExpiredEvent
  'services/eventService.js:448': [351, 458], // updateEvent
  'services/eventService.js:459': [458, 469], // deleteEvent
  'services/eventService.js:478': [469, 486], // extendExpiration
  'services/archiveService.js:132': [19, 223], // archiveEvent
  'services/projectService.js:93': [88, 102], // assignEvent
}

function functionBody(file: string, siteLine: number): string {
  const key = `${file}:${siteLine}`
  const range = FUNCTION_RANGES[key]
  if (!range) throw new Error(`no function range recorded for ${key}`)
  const [start, end] = range
  return lines(`${VENDOR_SRC}/${file}`).slice(start - 1, end - 1).join('\n')
}

/** All 15 fixed-site function bodies concatenated, for a global absence check. */
const ALL_SITE_BODIES = FIXED_SITES.map(([f, l]) => functionBody(f, l)).join('\n---\n')

function rowEntries(table: string): string[] {
  return [...table.matchAll(/^\| (E\d+) \|/gm)].map((m) => m[1])
}

function cells(row: string): string[] {
  return row
    .split(/(?<!\\)\|/)
    .map((c) => c.trim())
    .slice(1, -1)
}

function findRow(entry: string): string {
  const row = section.split('\n').find((l) => l.startsWith(`| ${entry} |`))
  if (!row) throw new Error(`row for ${entry} not found`)
  return row
}

describe('AC-17.4.1.1.1.2.2.2: the write path — edit-path evidence for the confirmed set', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.4.1.1.1.2.2.2 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.4\.1\.1\.1\.2\.2\.2\b/)
    })

    it('has a dedicated AC-17.4.1.1.1.2.2.2 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits after the AC-17.4.1.1.1.2.2.1 section (its creation-path counterpart)', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.4.1.1.1.2.2.1 '))
    })

    it('sits ahead of the AC-14.6 recommendation section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })
  })

  describe('the fixed fifteen-site inspection scope is real', () => {
    it('reproduces exactly the fixed fifteen sites from the vendored fork, not taken on trust', () => {
      const found = findEventsTableWriteSites()
        .map(([f, l]) => `${f}:${l}`)
        .sort()
      const expected = FIXED_SITES.map(([f, l]) => `${f}:${l}`).sort()
      expect(found).toEqual(expected)
    })

    it.each(FIXED_SITES)('%s:%i is a genuine .update(/.increment(/.del( on the events table', (file, l) => {
      const line = lineAt(`${VENDOR_SRC}/${file}`, l)
      expect(line).toContain("('events')")
      expect(line).toMatch(/\.update\(|\.increment\(|\.del\(/)
    })
  })

  describe('the table has exactly one row per confirmed-set entry, in order', () => {
    const rows = rowEntries(section)

    it('lists all 13 confirmed entries, in the AC-17.4.1.1.1.2.1 order', () => {
      expect(rows).toEqual(CONFIRMED)
    })

    it('does not pull E31 — ruled out by AC-17.4.1.1.1.2.1 — back onto the confirmed side', () => {
      expect(rows).not.toContain('E31')
    })

    it('the written rows are exactly E1, E4, E6, E33, each citing at least one of the fifteen sites', () => {
      for (const entry of WRITTEN) {
        const c = cells(findRow(entry))
        expect(c[2]).not.toBe('—')
        for (const cite of c[2].split(';').map((s) => s.trim())) {
          const m = cite.match(/`([^`]+):(\d+)`/)
          expect(m).not.toBeNull()
          const [, file, lineStr] = m as RegExpMatchArray
          const full = FIXED_SITES.find(([f, l]) => file.endsWith(f) && l === Number(lineStr))
          expect([entry, cite, full]).toEqual([entry, cite, expect.anything()])
        }
      }
    })

    it('the no-write rows are exactly the other 9, each recording no edit-path write found', () => {
      for (const entry of NO_WRITE) {
        const c = cells(findRow(entry))
        expect(c[2]).toBe('—')
        expect(c[3]).toMatch(/no edit-path write found/i)
      }
    })
  })

  describe('the count line', () => {
    it('states 4 written + 9 no-write = 13, naming every entry in each group', () => {
      const countLine = section
        .split('\n')
        .find((l) => l.includes('rows carry a write') && l.includes('rows carry'))
      expect(countLine).toBeDefined()
      expect(countLine).toMatch(/4 of 13 rows carry a write/)
      expect(countLine).toMatch(/9 of 13 rows carry `no edit-path write found`/)
      expect(countLine).toMatch(/4 \+ 9 = 13/)
      for (const entry of WRITTEN) expect(countLine).toContain(entry)
      for (const entry of NO_WRITE) expect(countLine).toContain(entry)
    })

    it('the section contains exactly the table and the count line — no other prose', () => {
      const body = section
        .split('\n')
        .slice(1) // drop the heading
        .filter((l) => l.trim() !== '')
      // Every remaining non-blank line is either a table row (starts with |)
      // or the single count-line sentence.
      const nonTableLines = body.filter((l) => !l.startsWith('|'))
      expect(nonTableLines.length).toBe(1)
      expect(nonTableLines[0]).toMatch(/4 \+ 9 = 13/)
    })
  })

  describe('E1 (expires_at): every cited edit-path write is reproducible from source', () => {
    it('adminEvents.js:284 deletes the whole row inside a transaction', () => {
      expect(lineAt(`${VENDOR_SRC}/routes/adminEvents.js`, 284)).toMatch(
        /trx\('events'\)\.where\('id', eventId\)\.del\(\)/
      )
      expect(functionBody('routes/adminEvents.js', 284)).toMatch(/async function deleteEventCascade/)
    })

    it('events.js:346 is a generic update(updates) built from req.body', () => {
      expect(lineAt(`${VENDOR_SRC}/routes/events.js`, 346)).toMatch(
        /db\('events'\)\.where\('id', id\)\.update\(updates\)/
      )
      const body = functionBody('routes/events.js', 346)
      expect(body).toMatch(/const updates = \{ \.\.\.req\.body \}/)
      expect(body).toMatch(/delete updates\.id/)
      expect(body).toMatch(/delete updates\.slug/)
    })

    it('events.js:383 extends expires_at by the requested days and reactivates the event', () => {
      const body = functionBody('routes/events.js', 383)
      expect(body).toMatch(/const newExpiration = new Date\(event\.expires_at\)/)
      expect(body).toMatch(/newExpiration\.setDate\(newExpiration\.getDate\(\) \+ days\)/)
      expect(lineAt(`${VENDOR_SRC}/routes/events.js`, 383)).toMatch(/update\(\{\s*$/)
      expect(lineAt(`${VENDOR_SRC}/routes/events.js`, 384)).toMatch(/expires_at: newExpiration/)
      expect(lineAt(`${VENDOR_SRC}/routes/events.js`, 385)).toMatch(/is_active: formatBoolean\(true\)/)
    })

    it('eventService.js:448 is the same generic passthrough as events.js:346', () => {
      expect(lineAt(`${VENDOR_SRC}/services/eventService.js`, 448)).toMatch(
        /db\('events'\)\.where\('id', id\)\.update\(updates\)/
      )
      const body = functionBody('services/eventService.js', 448)
      expect(body).toMatch(/const updateEvent = async \(id, updates\)/)
      expect(body).toMatch(/delete updates\.id/)
    })

    it('eventService.js:478 extends expires_at identically to events.js:383', () => {
      const body = functionBody('services/eventService.js', 478)
      expect(body).toMatch(/const newExpiration = new Date\(event\.expires_at\)/)
      expect(body).toMatch(/newExpiration\.setDate\(newExpiration\.getDate\(\) \+ days\)/)
      expect(lineAt(`${VENDOR_SRC}/services/eventService.js`, 479)).toMatch(/expires_at: newExpiration/)
      expect(lineAt(`${VENDOR_SRC}/services/eventService.js`, 480)).toMatch(/is_active: formatBoolean\(true\)/)
    })
  })

  describe('E4 (expiry_date): both cited sites copy it from the row\'s own expires_at', () => {
    it('adminEvents.js:1063 (publish) queues a gallery_created email with expiry_date from event.expires_at', () => {
      expect(lineAt(`${VENDOR_SRC}/routes/adminEvents.js`, 1063)).toMatch(/is_draft: formatBoolean\(false\)/)
      const body = functionBody('routes/adminEvents.js', 1063)
      expect(body).toMatch(
        /expiry_date: event\.expires_at \? new Date\(event\.expires_at\)\.toISOString\(\) : null/
      )
      expect(body).toMatch(/if \(customerEmail\) \{/)
      expect(body).toMatch(/db\('email_queue'\)\.insert\(/)
    })

    it('expirationChecker.js:97 (handleExpiredEvent) builds customerVars.expiry_date from event.expires_at', () => {
      expect(lineAt(`${VENDOR_SRC}/services/expirationChecker.js`, 97)).toMatch(
        /is_active: formatBoolean\(false\)/
      )
      const body = functionBody('services/expirationChecker.js', 97)
      expect(body).toMatch(/expiry_date: event\.expires_at/)
    })
  })

  describe('E6 (gallery_expired / galleryExpiredExists): expirationChecker.js:97 queues it', () => {
    it('handleExpiredEvent queues gallery_expired for the customer and, conditionally, the admin', () => {
      const body = functionBody('services/expirationChecker.js', 97)
      expect(body).toMatch(/queueEmail\(event\.id, recipientEmail, 'gallery_expired', customerVars\)/)
      expect(body).toMatch(/event\.admin_email && event\.admin_email !== recipientEmail/)
    })
  })

  describe('E33 (event.expired): expirationChecker.js:97 fires it', () => {
    it('handleExpiredEvent fires the event.expired webhook with expires_at in the payload', () => {
      const body = functionBody('services/expirationChecker.js', 97)
      expect(body).toMatch(/webhookService\.fire\('event\.expired',/)
      expect(body).toMatch(/expires_at: event\.expires_at,/)
    })
  })

  describe('the nine no-write entries are reproducible: absent from all fifteen function bodies', () => {
    const NEEDLES: Array<[string, string[]]> = [
      ['E5', ['expiration_warning']],
      ['E7', ['event_require_expiration']],
      ['E10', ['expiration_days']],
      ['E11', ['general_default_expiration_days']],
      ['E12', ['require_expiration']],
      ['E13', ['is_expired']],
      ['E16', ['GALLERY_EXPIRED']],
      ['E30', ['expiringEvents']],
      ['E32', ["'expiring'"]],
    ]

    it.each(NEEDLES)('%s: none of its name(s) occur in any of the fifteen sites’ function bodies', (_e, needles) => {
      for (const needle of needles) {
        expect(ALL_SITE_BODIES.includes(needle)).toBe(false)
      }
    })
  })

  describe('this AC states the pinned commit is the one the rest of the AC-17.4 chain uses', () => {
    it('the pinned commit matches PICPEAK_UPSTREAM.md', () => {
      expect(read('PICPEAK_UPSTREAM.md')).toMatch(new RegExp(PINNED_COMMIT))
    })
  })
})
