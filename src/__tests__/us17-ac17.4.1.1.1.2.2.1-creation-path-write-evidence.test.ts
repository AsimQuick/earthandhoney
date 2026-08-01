/**
 * ---
 * file: src/__tests__/us17-ac17.4.1.1.1.2.2.1-creation-path-write-evidence.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.4.1.1.1.2.2.1 — for every entry in the
 *          AC-17.4.1.1.1.2.1 confirmed set, PIVOT_AUDIT.md records the
 *          Gallery creation-path code that writes or determines it (with
 *          file:line evidence against the pinned commit, plus the inputs
 *          and computing code where the value is computed) and the role
 *          it plays, or records no creation-path write found together
 *          with the creation routes inspected. This suite confirms: the
 *          section exists in the right place; all 13 confirmed entries
 *          appear exactly once across the two tables (6 written + 7 not);
 *          every citation exists in the vendored fork and genuinely
 *          contains what is claimed for it; and — the load-bearing part —
 *          each "no creation-path write found" claim is independently
 *          reproduced from the vendored source by searching the three
 *          creation handlers directly, rather than taken on trust.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.4.1.1.1.2.2.1
 * ---
 */

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const lines = (rel: string) => read(rel).split('\n')
/** 1-indexed line lookup, matching how the audit cites code. */
const lineAt = (rel: string, n: number) => lines(rel)[n - 1] ?? ''

const doc = read('PIVOT_AUDIT.md')

const PINNED_COMMIT = 'eb263137b98935754155824de2a03848121304b6'

const sectionStart = doc.indexOf('## AC-17.4.1.1.1.2.2.1 ')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1 ? '' : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

// Whitespace-collapsed, for asserting on prose the document hard-wraps.
const flat = section.replace(/\s+/g, ' ')

const WRITTEN_HEADING = '### Written or determined on the creation path (6 of 13)'
const NO_WRITE_HEADING = '### No creation-path write found (7 of 13)'
const RECONCILE_HEADING = '### Reconciling against the AC-17.4.1.1.1.2.1 confirmed set'

// The AC-17.4.1.1.1.2.1 confirmed set this AC evidences on the write path.
const CONFIRMED = ['E1', 'E4', 'E5', 'E6', 'E7', 'E10', 'E11', 'E12', 'E13', 'E16', 'E30', 'E32', 'E33']
const WRITTEN = ['E1', 'E4', 'E7', 'E10', 'E11', 'E12']
const NO_WRITE = ['E5', 'E6', 'E13', 'E16', 'E30', 'E32', 'E33']

/** Slice `section` between two headings (or to the end of the section). */
function block(from: string, to?: string): string {
  const a = section.indexOf(from)
  if (a === -1) return ''
  const b = to ? section.indexOf(to, a) : -1
  return section.slice(a, b === -1 ? undefined : b)
}

/** Lead cells of a markdown table's body rows, e.g. "E1" from "| E1 | ...". */
function rowEntries(table: string): string[] {
  return [...table.matchAll(/^\| (E\d+) \|/gm)].map((m) => m[1])
}

/**
 * Split a markdown table row into cells on unescaped pipes only — several
 * evidence cells quote JS containing `\|\|`, which a naive split shreds.
 */
function cells(row: string): string[] {
  return row
    .split(/(?<!\\)\|/)
    .map((c) => c.trim())
    .slice(1, -1)
}

/**
 * The section's own short-name -> full-path legend, so every citation in
 * the tables resolves to exactly one real file rather than a basename that
 * could match two (`events.js` vs `v1/events.js`).
 */
const shorthand: Record<string, string> = Object.fromEntries(
  [...block('### File shorthand used by the tables below', '### Written').matchAll(
    /^\| `([^`]+)` \| `(vendor\/[^`]+)` \|$/gm
  )].map((m) => [m[1], m[2]])
)

const ADMIN_EVENTS = 'vendor/picpeak/backend/src/routes/adminEvents.js'
const EVENTS = 'vendor/picpeak/backend/src/routes/events.js'
const V1_EVENTS = 'vendor/picpeak/backend/src/routes/v1/events.js'
const CREATE_EVENT_PAGE = 'vendor/picpeak/frontend/src/pages/admin/CreateEventPage.tsx'
const SERVER = 'vendor/picpeak/backend/server.js'

describe('AC-17.4.1.1.1.2.2.1: the write path — creation-path evidence for the confirmed set', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.4.1.1.1.2.2.1 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.4\.1\.1\.1\.2\.2\.1\b/)
    })

    it('has a dedicated AC-17.4.1.1.1.2.2.1 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits after the AC-17.4.1.1.1.2.1 section whose confirmed set it evidences', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.4.1.1.1.2.1 '))
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('states the same pinned commit as the rest of this AC-17.4 chain', () => {
      expect(section).toMatch(new RegExp(PINNED_COMMIT))
    })

    it('states this is code-level only, no live gallery created or changed', () => {
      expect(flat).toMatch(/no live Gallery was created or changed/i)
    })

    it('defers the "is the absence expected" question to AC-17.4.1.1.1.2.2.3', () => {
      expect(flat).toMatch(/AC-17\.4\.1\.1\.1\.2\.2\.3/)
    })

    it('states it moves nothing between the confirmed and ruled-out lists', () => {
      expect(flat).toMatch(/no entry is added to,? or moved (off|between)/i)
    })
  })

  describe('the creation path is identified before any field is evidenced against it', () => {
    it('names POST /api/admin/events as the Gallery creation route, as AC-17.1.3.1 established', () => {
      expect(section).toContain('### The Gallery creation path')
      expect(flat).toContain('POST /api/admin/events')
      expect(flat).toMatch(/AC-17\.1\.3\.1/)
    })

    it('the cited creation handler really is a POST / gated by the events.create permission', () => {
      expect(section).toContain('`vendor/picpeak/backend/src/routes/adminEvents.js:330-864`')
      expect(lineAt(ADMIN_EVENTS, 330)).toMatch(
        /router\.post\('\/',\s*adminAuth,\s*requirePermission\('events\.create'\)/
      )
    })

    it('the cited mount chain server.js:638 -> admin.js:22 genuinely reaches adminEvents.js', () => {
      expect(lineAt(SERVER, 638)).toMatch(/app\.use\('\/api\/admin',\s*adminRoutes\)/)
      const admin = 'vendor/picpeak/backend/src/routes/admin.js'
      expect(lineAt(admin, 22)).toMatch(/router\.use\('\/events',\s*eventsRoutes\)/)
      expect(read(admin)).toMatch(/const eventsRoutes = require\('\.\/adminEvents'\)/)
    })

    it('server.js is located where the section says it is (backend root, not backend/src)', () => {
      expect(flat).toMatch(/`server\.js` means `vendor\/picpeak\/backend\/server\.js`/)
      expect(fs.existsSync(path.join(root, SERVER))).toBe(true)
      expect(fs.existsSync(path.join(root, 'vendor/picpeak/backend/src/server.js'))).toBe(false)
    })

    it('names the two other reachable creation routes that were inspected', () => {
      expect(section).toContain('`vendor/picpeak/backend/src/routes/events.js:60`')
      expect(section).toContain('`vendor/picpeak/backend/src/routes/v1/events.js:114`')
      expect(lineAt(EVENTS, 60)).toMatch(/router\.post\('\/',\s*adminAuth/)
      expect(lineAt(V1_EVENTS, 114)).toMatch(/router\.post\(/)
      expect(lineAt(SERVER, 632)).toMatch(/app\.use\('\/api\/events',\s*eventRoutes\)/)
      expect(lineAt(SERVER, 720)).toMatch(/app\.use\('\/api\/v1',\s*require\('\.\/src\/routes\/v1\/events'\)\)/)
    })

    it('the fourth insert site is genuinely unreachable — adminEvents-enhanced.js is never required', () => {
      expect(flat).toMatch(/adminEvents-enhanced\.js:92`, is never `require`d/)
      const enhanced = 'vendor/picpeak/backend/src/routes/adminEvents-enhanced.js'
      expect(lineAt(enhanced, 92)).toMatch(/db\('events'\)\.insert\(/)
      // Reproduce the deadness claim rather than trusting it.
      const referrers: string[] = []
      const walk = (dir: string) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, e.name)
          if (e.isDirectory()) walk(full)
          else if (e.isFile() && e.name.endsWith('.js') && !full.endsWith('adminEvents-enhanced.js')) {
            if (fs.readFileSync(full, 'utf8').includes('adminEvents-enhanced')) referrers.push(full)
          }
        }
      }
      walk(path.join(root, 'vendor/picpeak/backend/src'))
      if (read(SERVER).includes('adminEvents-enhanced')) referrers.push(SERVER)
      expect(referrers).toEqual([])
    })
  })

  describe('every confirmed-set entry appears exactly once, and the two tables total 13', () => {
    const writtenRows = rowEntries(block(WRITTEN_HEADING, NO_WRITE_HEADING))
    const noWriteRows = rowEntries(block(NO_WRITE_HEADING, RECONCILE_HEADING))

    it('has a written-on-the-creation-path table', () => {
      expect(section).toContain(WRITTEN_HEADING)
    })

    it('has a no-creation-path-write-found table', () => {
      expect(section).toContain(NO_WRITE_HEADING)
    })

    it('the written table lists exactly the 6 written entries', () => {
      expect(writtenRows).toEqual(WRITTEN)
    })

    it('the no-write table lists exactly the 7 no-write entries', () => {
      expect(noWriteRows).toEqual(NO_WRITE)
    })

    it('6 written + 7 no-write = the 13-entry confirmed set', () => {
      expect([...writtenRows, ...noWriteRows].sort()).toEqual([...CONFIRMED].sort())
      expect(writtenRows.length + noWriteRows.length).toBe(13)
    })

    it.each(CONFIRMED)('%s appears exactly once across the two tables', (entry) => {
      const all = [...writtenRows, ...noWriteRows]
      expect(all.filter((e) => e === entry).length).toBe(1)
    })

    it('introduces no new candidate: no entry outside the 13-entry confirmed set is tabled', () => {
      const all = [...writtenRows, ...noWriteRows]
      expect(all.filter((e) => !CONFIRMED.includes(e))).toEqual([])
    })

    it('does not pull E31 — ruled out by AC-17.4.1.1.1.2.1 — back onto the confirmed side', () => {
      expect(rowEntries(section)).not.toContain('E31')
    })

    it('every written entry states the role it plays on the creation path', () => {
      const table = block(WRITTEN_HEADING, NO_WRITE_HEADING)
      for (const entry of WRITTEN) {
        const row = table.split('\n').find((l) => l.startsWith(`| ${entry} |`))
        expect(row).toBeDefined()
        // | Entry | Name | Role | Evidence | What the code does |
        const c = cells(row!)
        expect(c[2].length).toBeGreaterThan(20) // role
        expect(c[3]).toMatch(/:\d/) // evidence carries a line number
        expect(c[4].length).toBeGreaterThan(10) // what the code does
      }
    })

    it('every no-write entry records the creation routes inspected to reach that', () => {
      const table = block(NO_WRITE_HEADING, RECONCILE_HEADING)
      for (const entry of NO_WRITE) {
        const row = table.split('\n').find((l) => l.startsWith(`| ${entry} |`))
        expect(row).toBeDefined()
        // | Entry | Name(s) | Where the name does occur | Creation routes inspected |
        const c = cells(row!)
        expect(c[2]).toMatch(/:\d/) // the non-creation-path occurrence, with a line
        expect(c[3]).toMatch(/routes inspected|no occurrence/i)
      }
    })

    it('the reconciliation table places each of the 13 entries exactly once', () => {
      const table = block(RECONCILE_HEADING, '### No contradiction')
      expect(table).not.toBe('')
      expect(rowEntries(table)).toEqual(CONFIRMED)
    })

    it('states the 6 + 7 = 13 accounting', () => {
      expect(flat).toMatch(/6 \+ 7 = 13/)
    })
  })

  describe('every file:line citation in the section is genuine', () => {
    /** Resolve a cited path — already-full, or a short name via the legend. */
    function resolve(cite: string): string | null {
      if (cite.startsWith('vendor/')) return cite
      if (shorthand[cite]) return shorthand[cite]
      const base = cite.split('/').pop() as string
      return shorthand[base] ?? null
    }

    const cited = [...section.matchAll(/`([A-Za-z0-9/_.-]+\.(?:js|tsx)):([\d,\-]+)`/g)].map((m) => {
      const nums: number[] = []
      for (const part of m[2].split(',')) {
        if (part.includes('-')) {
          const [a, b] = part.split('-').map(Number)
          for (let n = a; n <= b; n++) nums.push(n)
        } else if (part.trim() !== '') {
          nums.push(Number(part))
        }
      }
      return { cite: m[1], lines: nums }
    })

    it('the shorthand legend resolves every short name the tables use', () => {
      expect(Object.keys(shorthand).length).toBeGreaterThanOrEqual(14)
    })

    it('every legend entry points at a file that exists in the vendored fork', () => {
      for (const [short, full] of Object.entries(shorthand)) {
        expect([short, fs.existsSync(path.join(root, full))]).toEqual([short, true])
      }
    })

    it('cites code with explicit line numbers throughout', () => {
      expect(cited.length).toBeGreaterThanOrEqual(30)
    })

    it('every citation resolves to a file that exists in the vendored fork', () => {
      for (const { cite } of cited) {
        const full = resolve(cite)
        expect([cite, full]).not.toEqual([cite, null])
        expect([cite, fs.existsSync(path.join(root, full as string))]).toEqual([cite, true])
      }
    })

    it("every cited line number is within the cited file's bounds", () => {
      for (const { cite, lines: nums } of cited) {
        const total = lines(resolve(cite) as string).length
        for (const n of nums) {
          expect(n).toBeGreaterThan(0)
          expect([cite, n, n <= total]).toEqual([cite, n, true])
        }
      }
    })
  })

  describe('the six written entries are reproducible from the vendored source', () => {
    it('E1: expires_at is computed from expiration_days at adminEvents.js:605', () => {
      expect(lineAt(ADMIN_EVENTS, 605)).toMatch(
        /expires_at\.setDate\(expires_at\.getDate\(\) \+ parseInt\(expiration_days, 10\)\)/
      )
    })

    it('E1: expires_at is stored into the events insert at adminEvents.js:679', () => {
      expect(lineAt(ADMIN_EVENTS, 679)).toMatch(/expires_at: expires_at \? expires_at\.toISOString\(\) : null/)
    })

    it('E1: expires_at is echoed in the create response at adminEvents.js:857', () => {
      expect(lineAt(ADMIN_EVENTS, 857)).toMatch(/expires_at: expires_at \? expires_at\.toISOString\(\) : null/)
    })

    it('E1: the computation is gated so expires_at stays null when expiry is not required', () => {
      expect(lineAt(ADMIN_EVENTS, 595)).toMatch(/let expires_at = null;/)
      expect(lineAt(ADMIN_EVENTS, 596)).toMatch(/if \(fieldRequirements\.require_expiration\)/)
    })

    it('E4: expiry_date is set from the same expires_at local at adminEvents.js:800', () => {
      expect(lineAt(ADMIN_EVENTS, 800)).toMatch(/expiry_date: expires_at \? expires_at\.toISOString\(\) : null/)
    })

    it('E4: the emailData carrying expiry_date is queued into email_queue.email_data', () => {
      expect(lineAt(ADMIN_EVENTS, 792)).toMatch(/const emailData = \{/)
      expect(lineAt(ADMIN_EVENTS, 812)).toMatch(/db\('email_queue'\)\.insert\(\{/)
      expect(lineAt(ADMIN_EVENTS, 816)).toMatch(/email_data: JSON\.stringify\(emailData\)/)
    })

    it('E4: the email write is conditional on a non-draft event, and is_draft defaults to true', () => {
      expect(lineAt(ADMIN_EVENTS, 788)).toMatch(/const isDraft = parseBooleanInput\(is_draft, true\)/)
      expect(lineAt(ADMIN_EVENTS, 790)).toMatch(/if \(customerEmail && !isDraft\)/)
      expect(lineAt(ADMIN_EVENTS, 482)).toMatch(/is_draft = true/)
    })

    it('E7: event_require_expiration is read into fieldRequirements.require_expiration', () => {
      expect(lineAt(ADMIN_EVENTS, 71)).toMatch(/const getEventFieldRequirements = async \(\)/)
      expect(lineAt(ADMIN_EVENTS, 104)).toMatch(
        /setting_key === 'event_require_expiration'.*requirements\.require_expiration = value/
      )
      expect(lineAt(ADMIN_EVENTS, 431)).toMatch(/const fieldRequirements = await getEventFieldRequirements\(\)/)
    })

    it('E10: expiration_days is validated, defaulted to 30, and consumed by the computation', () => {
      expect(lineAt(ADMIN_EVENTS, 376)).toMatch(/body\('expiration_days'\)\.isInt\(\{ min: 1, max: 365 \}\)\.optional\(\)/)
      expect(lineAt(ADMIN_EVENTS, 446)).toMatch(/expiration_days = 30/)
      expect(lineAt(ADMIN_EVENTS, 605)).toContain('expiration_days')
    })

    it('E11: general_default_expiration_days prefills the form value submitted as expiration_days', () => {
      expect(lineAt(CREATE_EVENT_PAGE, 238)).toMatch(/if \(settings\?\.general_default_expiration_days\)/)
      expect(lineAt(CREATE_EVENT_PAGE, 241)).toMatch(/expires_in_days: settings\.general_default_expiration_days/)
      expect(lineAt(CREATE_EVENT_PAGE, 463)).toMatch(
        /expiration_days: requireExpiration \? formData\.expires_in_days : undefined/
      )
    })

    it('E12: names the same boolean read as E7, not a second independently-written value', () => {
      expect(lineAt(ADMIN_EVENTS, 596)).toMatch(/fieldRequirements\.require_expiration/)
      const table = block(WRITTEN_HEADING, NO_WRITE_HEADING)
      const row = table.split('\n').find((l) => l.startsWith('| E12 |'))
      expect(row).toMatch(/same/i)
      // AC-17.4.1.1.1.2.1 already recorded this identity; this AC must not reopen it.
      expect(row).toMatch(/AC-17\.4\.1\.1\.1\.2\.1/)
    })
  })

  describe('the seven "no creation-path write found" claims are reproducible from the vendored source', () => {
    /** Body of the handler starting at `startLine`, up to the next top-level router.X( call. */
    function handlerBody(rel: string, startLine: number): string {
      const src = lines(rel)
      let end = src.length
      for (let i = startLine; i < src.length; i++) {
        if (/^router\.(post|get|put|patch|delete|use)\(/.test(src[i])) {
          end = i
          break
        }
      }
      return src.slice(startLine - 1, end).join('\n')
    }

    const handlers: Array<[string, string]> = [
      [`${ADMIN_EVENTS} POST /`, handlerBody(ADMIN_EVENTS, 330)],
      [`${EVENTS} POST /`, handlerBody(EVENTS, 60)],
      [`${V1_EVENTS} POST /events`, handlerBody(V1_EVENTS, 114)],
    ]

    it('the three inspected handlers are all non-empty event-creation bodies', () => {
      for (const [name, body] of handlers) {
        expect(body.length).toBeGreaterThan(200)
        expect(`${name} ${body}`).toContain('events')
      }
    })

    // One needle per no-write entry, exactly as the section names it.
    const NEEDLES: Array<[string, string[]]> = [
      ['E5', ['expiration_warning']],
      ['E6', ['gallery_expired', 'galleryExpiredExists']],
      ['E13', ['is_expired']],
      ['E16', ['GALLERY_EXPIRED']],
      ['E30', ['expiringEvents']],
      ['E32', ["'expiring'"]],
      ['E33', ['event.expired']],
    ]

    it.each(NEEDLES)('%s occurs in none of the three creation handlers', (_entry, needles) => {
      for (const needle of needles) {
        for (const [name, body] of handlers) {
          expect([name, needle, body.includes(needle)]).toEqual([name, needle, false])
        }
      }
    })

    it('E5: expiration_warning is queued only by the scheduled expiration checker', () => {
      const checker = 'vendor/picpeak/backend/src/services/expirationChecker.js'
      expect(lineAt(checker, 36)).toContain('expiration_warning')
      expect(lineAt(checker, 78)).toMatch(/queueEmail\(event\.id, recipientEmail, 'expiration_warning'/)
      expect(lineAt('vendor/picpeak/backend/src/services/workerManager.js', 18)).toMatch(
        /startExpirationChecker/
      )
    })

    it('E6: gallery_expired is queued only for rows the checker already matched as expired', () => {
      const checker = 'vendor/picpeak/backend/src/services/expirationChecker.js'
      expect(lineAt(checker, 50)).toMatch(/\.where\('expires_at', '<=', now\)/)
      expect(lineAt(checker, 53)).toMatch(/await handleExpiredEvent\(event\)/)
      expect(lineAt(checker, 144)).toContain("'gallery_expired'")
      expect(lineAt(checker, 149)).toContain("'gallery_expired'")
    })

    it('E13: is_expired is computed on read from the already-stored expires_at', () => {
      expect(lineAt('vendor/picpeak/backend/src/routes/gallery.js', 186)).toMatch(
        /is_expired: !event\.is_active \|\| \(event\.expires_at && new Date\(event\.expires_at\) < new Date\(\)\)/
      )
    })

    it('E16: GALLERY_EXPIRED is returned by the access-gate middleware, not the creation route', () => {
      expect(lineAt('vendor/picpeak/backend/src/middleware/auth.js', 182)).toContain("code: 'GALLERY_EXPIRED'")
    })

    it('E30: expiringEvents is a dashboard aggregate over already-stored rows', () => {
      const dash = 'vendor/picpeak/backend/src/routes/adminDashboard.js'
      expect(lineAt(dash, 24)).toMatch(/const expiringEvents = await db\('events'\)/)
      expect(lineAt(dash, 27)).toContain('expires_at')
      expect(lineAt(dash, 30)).toMatch(/\.first\(\)/)
    })

    it('E32: the only \'expiring\' occurrence in adminEvents.js is in the list handler, not POST /', () => {
      expect(lineAt(ADMIN_EVENTS, 867)).toMatch(/router\.get\('\/',\s*adminAuth/)
      expect(lineAt(ADMIN_EVENTS, 906)).toMatch(/status === 'expiring'/)
      const occurrences = lines(ADMIN_EVENTS)
        .map((l, i) => [i + 1, l] as const)
        .filter(([, l]) => l.includes("'expiring'"))
        .map(([n]) => n)
      expect(occurrences).toEqual([906])
      expect(occurrences[0]).toBeGreaterThan(864) // outside POST / (330-864)
    })

    it('E33: event.expired is fired only from handleExpiredEvent; the creation route fires created/published', () => {
      const checker = 'vendor/picpeak/backend/src/services/expirationChecker.js'
      expect(lineAt('vendor/picpeak/backend/src/services/webhookService.js', 17)).toContain("'event.expired'")
      expect(lineAt(checker, 94)).toMatch(/async function handleExpiredEvent\(event\)/)
      expect(lineAt(checker, 105)).toMatch(/webhookService\.fire\('event\.expired'/)
      expect(lineAt(ADMIN_EVENTS, 767)).toMatch(/webhookService\.fire\('event\.created'/)
      expect(lineAt(ADMIN_EVENTS, 829)).toMatch(/webhookService\.fire\('event\.published'/)
    })
  })

  describe('contradictions against AC-17.4.1.1.1.2.1 are handled as the AC requires', () => {
    it('has a dedicated subsection reconciling this reading against the earlier dispositions', () => {
      expect(section).toContain("### No contradiction of AC-17.4.1.1.1.2.1's dispositions")
    })

    it('explains that participating in the expiry lifecycle is not the same as a creation-path write', () => {
      expect(flat).toMatch(/not specifically that each has a creation-path write/)
    })

    it('records the tightened line ranges openly rather than silently restating them', () => {
      expect(flat).toMatch(/tighter line range than AC-17\.4\.1\.1\.1\.2\.1 gave/)
      for (const entry of ['E11', 'E30', 'E33']) {
        expect(block("### No contradiction of AC-17.4.1.1.1.2.1's dispositions", '### Verdict')).toContain(entry)
      }
    })

    it('states the refinements are not dispositional contradictions carried to AC-17.4.1.1.1.2.2.3', () => {
      expect(flat).toMatch(/none is a contradiction of a disposition and none is carried to AC-17\.4\.1\.1\.1\.2\.2\.3/)
    })

    it('leaves the AC-17.4.1.1.1.2.1 confirmed/ruled-out dispositions themselves untouched', () => {
      const earlierStart = doc.indexOf('## AC-17.4.1.1.1.2.1 ')
      const earlier = doc.slice(earlierStart, doc.indexOf('\n## ', earlierStart + 3))
      // 13 confirmed + 1 ruled out, exactly as that AC settled them.
      expect((earlier.match(/\*\*Confirmed\.\*\*/g) ?? []).length).toBe(13)
      expect((earlier.match(/\*\*Ruled out\*\*/g) ?? []).length).toBe(1)
    })
  })

  describe('verdict', () => {
    it('has a verdict subsection', () => {
      expect(section).toContain('### Verdict')
    })

    it('the verdict claims the criterion satisfied and names both outcome groups', () => {
      const verdict = block('### Verdict').replace(/\s+/g, ' ')
      expect(verdict).toMatch(/AC-17\.4\.1\.1\.1\.2\.2\.1 is satisfied/)
      expect(verdict).toMatch(/no creation-path write was found/)
      for (const entry of CONFIRMED) {
        expect(verdict).toMatch(new RegExp(`\\b${entry}\\b`))
      }
    })
  })
})
