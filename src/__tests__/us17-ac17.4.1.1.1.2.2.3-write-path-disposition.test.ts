/**
 * ---
 * file: src/__tests__/us17-ac17.4.1.1.1.2.2.3-write-path-disposition.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.4.1.1.1.2.2.3 — working from the AC-17.4.1.1.1.2.2.1
 *          creation-path evidence and the AC-17.4.1.1.1.2.2.2 edit-path
 *          evidence, PIVOT_AUDIT.md gives every AC-17.4.1.1.1.2.1
 *          confirmed-set entry exactly one write-path disposition (written
 *          on creation, written on edit, written on both, or never written
 *          on the Gallery path), states the resulting counts against the
 *          13-entry confirmed set, and — for every entry never written —
 *          records the actual upstream shape with file:line evidence
 *          rather than leaving it blank. This suite: parses the two prior
 *          sections' own tables to independently derive the expected
 *          disposition for each entry (not hardcoded), confirms the new
 *          section's table matches that derivation entry-for-entry and
 *          that the stated counts sum to 13; and independently reproduces
 *          every "actual upstream shape" citation by reading the cited
 *          line(s) directly from the vendored fork.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.4.1.1.1.2.2.3
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

function sectionBetween(startHeading: string): string {
  const start = doc.indexOf(startHeading)
  if (start === -1) return ''
  const end = doc.indexOf('\n## ', start + startHeading.length)
  return doc.slice(start, end === -1 ? undefined : end)
}

const section221 = sectionBetween('## AC-17.4.1.1.1.2.2.1 ')
const section222 = sectionBetween('## AC-17.4.1.1.1.2.2.2')
const sectionStart = doc.indexOf('## AC-17.4.1.1.1.2.2.3')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section223 =
  sectionStart === -1 ? '' : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

const CONFIRMED = ['E1', 'E4', 'E5', 'E6', 'E7', 'E10', 'E11', 'E12', 'E13', 'E16', 'E30', 'E32', 'E33']
const NEVER_WRITTEN = ['E5', 'E13', 'E16', 'E30', 'E32']

function cells(row: string): string[] {
  return row
    .split(/(?<!\\)\|/)
    .map((c) => c.trim())
    .slice(1, -1)
}

function rowsOf(table: string): string[] {
  return table.split('\n').filter((l) => /^\| E\d+ \|/.test(l))
}

function findRow(table: string, entry: string): string {
  const row = table.split('\n').find((l) => l.startsWith(`| ${entry} |`))
  if (!row) throw new Error(`row for ${entry} not found`)
  return row
}

/** From AC-17.4.1.1.1.2.2.1's own "Reconciling..." table: was this entry written on creation? */
function creationWritten(entry: string): boolean {
  const block = section221.slice(section221.indexOf('### Reconciling against the AC-17.4.1.1.1.2.1 confirmed set'))
  const row = findRow(block, entry)
  const disposition = cells(row)[1]
  return disposition.startsWith('Written')
}

/** From AC-17.4.1.1.1.2.2.2's own main table: was this entry written on edit? */
function editWritten(entry: string): boolean {
  const row = findRow(section222, entry)
  const c = cells(row)
  return c[2] !== '—'
}

describe('AC-17.4.1.1.1.2.2.3: reconciling write-path disposition', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.4.1.1.1.2.2.3 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.4\.1\.1\.1\.2\.2\.3\b/)
    })

    it('has a dedicated AC-17.4.1.1.1.2.2.3 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits after the AC-17.4.1.1.1.2.2.2 section (its two write-path inputs)', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.4.1.1.1.2.2.1 '))
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.4.1.1.1.2.2.2'))
    })

    it('sits ahead of the AC-14.6 recommendation section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })
  })

  describe('the reconciliation table gives every confirmed entry exactly one disposition', () => {
    const reconcileBlock = section223.slice(
      section223.indexOf('### Reconciling the creation-path and edit-path findings'),
      section223.indexOf('### Counts against the confirmed set')
    )
    const rows = rowsOf(reconcileBlock).filter((r) => cells(r).length === 5)
    const entries = rows.map((r) => cells(r)[0])

    it('lists all 13 confirmed entries, in the AC-17.4.1.1.1.2.1 order, exactly once each', () => {
      expect(entries).toEqual(CONFIRMED)
    })

    it('does not pull E31 — ruled out by AC-17.4.1.1.1.2.1 — back onto the confirmed side', () => {
      expect(entries).not.toContain('E31')
    })

    it.each(CONFIRMED)(
      '%s: the stated disposition matches what AC-17.4.1.1.1.2.2.1 and AC-17.4.1.1.1.2.2.2 independently establish',
      (entry) => {
        const created = creationWritten(entry)
        const edited = editWritten(entry)
        const expected =
          created && edited
            ? 'Written on both'
            : created && !edited
              ? 'Written on creation only'
              : !created && edited
                ? 'Written on edit only'
                : 'Never written'

        const row = findRow(reconcileBlock, entry)
        const disposition = cells(row)[4]
        expect(disposition).toContain(expected)
      }
    )
  })

  describe('the stated counts sum to the confirmed set size', () => {
    it('states 2 + 4 + 2 + 5 = 13 and names every entry in its group', () => {
      const countsBlock = section223.slice(section223.indexOf('### Counts against the confirmed set'))
      expect(countsBlock).toMatch(/Written on both creation and edit: E1, E4 — \*\*2\*\*/)
      expect(countsBlock).toMatch(/Written on creation only: E7, E10, E11, E12 — \*\*4\*\*/)
      expect(countsBlock).toMatch(/Written on edit only: E6, E33 — \*\*2\*\*/)
      expect(countsBlock).toMatch(/Never written on the Gallery path: E5, E13, E16, E30, E32 — \*\*5\*\*/)
      expect(countsBlock).toMatch(/2 \+ 4 \+ 2 \+ 5 = \*\*13\*\*/)
    })

    it('the four groups partition the 13 confirmed entries with no overlap and no omission', () => {
      const groups = {
        both: ['E1', 'E4'],
        creationOnly: ['E7', 'E10', 'E11', 'E12'],
        editOnly: ['E6', 'E33'],
        never: ['E5', 'E13', 'E16', 'E30', 'E32'],
      }
      const all = [...groups.both, ...groups.creationOnly, ...groups.editOnly, ...groups.never]
      expect(new Set(all).size).toBe(13)
      expect(all.sort()).toEqual([...CONFIRMED].sort())
    })
  })

  describe('the five never-written entries each carry an actual-upstream-shape citation', () => {
    const shapeBlock = section223.slice(section223.indexOf('### The five never-written entries: actual upstream shape'))

    it.each(NEVER_WRITTEN)('%s has a row in the actual-upstream-shape table', (entry) => {
      expect(findRow(shapeBlock, entry)).toBeDefined()
    })

    it('E5 (expiration_warning): the literal template-key citations are real', () => {
      expect(lineAt(`${VENDOR_SRC}/services/expirationChecker.js`, 36)).toContain(
        "where('email_type', 'expiration_warning')"
      )
      expect(lineAt(`${VENDOR_SRC}/services/expirationChecker.js`, 78)).toContain(
        "queueEmail(event.id, recipientEmail, 'expiration_warning'"
      )
    })

    it('E13 (is_expired): the read-time computation citation is real', () => {
      expect(lineAt(`${VENDOR_SRC}/routes/gallery.js`, 186)).toMatch(
        /is_expired: !event\.is_active \|\| \(event\.expires_at && new Date\(event\.expires_at\) < new Date\(\)\)/
      )
    })

    it('E16 (GALLERY_EXPIRED): the hardcoded response-code citation is real', () => {
      expect(lineAt(`${VENDOR_SRC}/middleware/auth.js`, 179)).toMatch(
        /if \(event\.expires_at && new Date\(event\.expires_at\) < new Date\(\)\)/
      )
      expect(lineAt(`${VENDOR_SRC}/middleware/auth.js`, 182)).toContain("code: 'GALLERY_EXPIRED'")
    })

    it('E30 (expiringEvents): the dashboard aggregate-key citation is real', () => {
      expect(lineAt(`${VENDOR_SRC}/routes/adminDashboard.js`, 24)).toContain(
        "const expiringEvents = await db('events')"
      )
      expect(lineAt(`${VENDOR_SRC}/routes/adminDashboard.js`, 30)).toContain('.first();')
      expect(lineAt(`${VENDOR_SRC}/routes/adminDashboard.js`, 101)).toContain(
        'expiringEvents: expiringEvents.count || 0'
      )
    })

    it('E32 (expiring): the request-time filter citation is real', () => {
      expect(lineAt(`${VENDOR_SRC}/routes/adminEvents.js`, 906)).toContain("status === 'expiring'")
      expect(lineAt(`${VENDOR_SRC}/routes/adminEvents.js`, 913)).toContain(
        "where('expires_at', '>', new Date().toISOString())"
      )
    })

    it('none of the five never-written names occurs assigned to the events table anywhere in the primary creation/edit handlers already ruled out by AC-17.4.1.1.1.2.2.1/.2', () => {
      // Cross-check only: the exhaustive absence proof is AC-17.4.1.1.1.2.2.1's and
      // AC-17.4.1.1.1.2.2.2's own job: this just confirms this section does not
      // contradict those findings by re-asserting a write exists where they found none.
      for (const entry of NEVER_WRITTEN) {
        expect(creationWritten(entry)).toBe(false)
        expect(editWritten(entry)).toBe(false)
      }
    })
  })

  describe('no contradiction and no unresolved carry-forward', () => {
    it('states no contradiction was found against AC-17.4.1.1.1.2.1, .2.2.1, or .2.2.2', () => {
      expect(section223).toMatch(/### No contradiction found/)
      expect(section223).toMatch(/confirmed set \(13 entries\) and the ruled-out list stand unchanged/)
    })

    it('states AC-17.4.1.1.1.2.2.2 left no row unresolved', () => {
      expect(section223).toMatch(/### Unresolved rows carried from AC-17\.4\.1\.1\.1\.2\.2\.2: none/)
    })
  })

  describe('this AC states the pinned commit is the one the rest of the AC-17.4 chain uses', () => {
    it('the pinned commit matches PICPEAK_UPSTREAM.md', () => {
      expect(read('PICPEAK_UPSTREAM.md')).toMatch(new RegExp(PINNED_COMMIT))
    })
  })
})
