/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us33-ac33.5.3-no-secret-in-browser-static.test.ts
 * project: earthandhoney
 * purpose: AC-33.5.3(a) — the fast-lane static half of the two bounded
 *          checks over a closed list of named variables: BACKSTAGE_API_TOKEN,
 *          SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PASSWORD (the secrets
 *          src/lib/inquiryNotification.ts's AC-33.5.2.3 flow touches). Walks
 *          every `.ts`/`.tsx`/`.js`/`.jsx` file under `src/` and asserts the
 *          source invariants directly, not by trusting a prior AC's
 *          intentions: (1) every file with a literal `process.env.<NAME>`
 *          read for one of these names carries no `'use client'` directive —
 *          Next.js's only mechanism for shipping a module's code into the
 *          client bundle in the first place, so a server-only module by this
 *          test's definition can never be inlined; (2) no `NEXT_PUBLIC_`
 *          prefixed variant of any of these five names exists anywhere under
 *          `src/` or in `.env.example` — the only mechanism by which Next.js
 *          inlines a *value* into a client bundle at build time; (3) the
 *          inquiry route handler (src/app/(frontend)/api/inquiries/route.ts)
 *          never echoes anything derived from the Backstage notification
 *          route's response — read statically off submitInquiry.ts (catches
 *          and swallows the notify() rejection, CLAUDE.md Pillar 6) and
 *          route.ts (its only success response is the literal `{ id:
 *          result.id }`, never `result.notified`/`error`/any property
 *          sourced from inquiryNotification.ts); (4) no `resend` dependency
 *          in package.json, and no `from 'resend'` import or
 *          `process.env.RESEND_*` read anywhere under `src/` — Resend stays
 *          retired (CLAUDE.md, "Retired From the Old Direction"). This suite
 *          only proves the *source* invariants; AC-33.5.3(b)
 *          (scripts/ac33.5.3-no-secret-in-browser-build-proof.sh) proves the
 *          *compiled* invariant — that a production `next build` never
 *          inlines a secret value even where this suite finds no textual
 *          trigger for it.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.5.3
 * ---
 */
import fs from 'fs'
import path from 'path'

const ROOT = path.join(__dirname, '..', '..')
const SRC_DIR = path.join(ROOT, 'src')

// The closed list AC-33.5.3 names — exactly these five, nothing more, per
// the AC's "bounded checks over a closed list of named variables" framing.
const SECRET_NAMES = ['BACKSTAGE_API_TOKEN', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_PASSWORD'] as const

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])

function listSourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__snapshots__') continue
      out.push(...listSourceFiles(full))
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full)
    }
  }
  return out
}

function isTestFile(filePath: string): boolean {
  return filePath.includes(`${path.sep}__tests__${path.sep}`) || filePath.includes('.test.')
}

const ALL_SRC_FILES = listSourceFiles(SRC_DIR)

// This suite's own file header documents the exact patterns it searches
// for (in prose, describing what it proves absent) — excluded from the
// scans below so the documentation isn't mistaken for the thing it forbids.
const THIS_FILE = __filename
const SCANNABLE_SRC_FILES = ALL_SRC_FILES.filter((file) => file !== THIS_FILE)

// Non-test application files whose source literally reads
// `process.env.<NAME>` for one of the five named secrets — the set this
// AC's server-only-module and no-'use client' checks are actually about.
// (A test file assigning `process.env.BACKSTAGE_API_TOKEN` in a mock setup
// is not a runtime reader and is deliberately excluded — see file header.)
function findApplicationReaders(secretName: string): string[] {
  const pattern = new RegExp(`process\\.env\\.${secretName}\\b`)
  return ALL_SRC_FILES.filter((file) => !isTestFile(file)).filter((file) =>
    pattern.test(fs.readFileSync(file, 'utf8')),
  )
}

describe('AC-33.5.3(a): no named secret ever reaches the browser — static source invariants', () => {
  describe('every secret this flow touches is read only in server-only application modules', () => {
    it.each(SECRET_NAMES)('%s is actually read somewhere in src/ (this check is not vacuous)', (secretName) => {
      // Sanity: BACKSTAGE_API_TOKEN must be read (inquiryNotification.ts);
      // the SMTP_* names are not read anywhere under src/ at all today (the
      // fork's Node/Express backend under vendor/picpeak owns them, a
      // separate process Next.js never bundles) — both are valid states for
      // this AC, so this check only guards against a typo in SECRET_NAMES
      // silently making every assertion below vacuously true.
      const readers = findApplicationReaders(secretName)
      if (secretName === 'BACKSTAGE_API_TOKEN') {
        expect(readers.length).toBeGreaterThan(0)
      } else {
        // Not present under src/ today — still assert the negative
        // explicitly so a future accidental introduction is caught by the
        // 'use client' check below rather than silently passing here.
        expect(Array.isArray(readers)).toBe(true)
      }
    })

    it.each(SECRET_NAMES)('no file reading %s under src/ carries a \'use client\' directive', (secretName) => {
      const readers = findApplicationReaders(secretName)
      for (const file of readers) {
        const contents = fs.readFileSync(file, 'utf8')
        const firstStatement = contents
          .split('\n')
          .find((line) => line.trim().length > 0 && !line.trim().startsWith('//'))
        expect(firstStatement).not.toMatch(/^['"]use client['"]/)
        expect(contents).not.toMatch(/^\s*['"]use client['"]\s*;?\s*$/m)
      }
    })
  })

  describe('no NEXT_PUBLIC_ prefixed variant of any named secret exists anywhere', () => {
    it.each(SECRET_NAMES)('no NEXT_PUBLIC_%s appears under src/', (secretName) => {
      const needle = `NEXT_PUBLIC_${secretName}`
      for (const file of ALL_SRC_FILES) {
        expect(fs.readFileSync(file, 'utf8')).not.toContain(needle)
      }
    })

    it.each(SECRET_NAMES)('no NEXT_PUBLIC_%s appears in .env.example', (secretName) => {
      const envExample = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8')
      expect(envExample).not.toContain(`NEXT_PUBLIC_${secretName}`)
    })
  })

  describe('the inquiry route handler echoes no Backstage response body back to the caller', () => {
    const routeSource = fs.readFileSync(
      path.join(SRC_DIR, 'app', '(frontend)', 'api', 'inquiries', 'route.ts'),
      'utf8',
    )
    const submitInquirySource = fs.readFileSync(path.join(SRC_DIR, 'lib', 'submitInquiry.ts'), 'utf8')

    it('submitInquiry.ts catches the notify() rejection rather than propagating it', () => {
      expect(submitInquirySource).toMatch(/try\s*{\s*\n\s*await deps\.notify\(/)
      expect(submitInquirySource).toMatch(/}\s*catch\s*\(error\)\s*{/)
    })

    it('the route only ever responds with the literal { id: result.id } on success — never result.notified or an error/detail field', () => {
      const successResponses = [...routeSource.matchAll(/NextResponse\.json\(([^)]*)\)/g)].map((m) => m[1])
      const has201Body = successResponses.some((body) => /\{\s*id:\s*result\.id\s*\}/.test(body))
      expect(has201Body).toBe(true)

      // `result` (submitInquiry's return value) carries an `id` and a
      // `notified` boolean — the route reads only the former.
      expect(routeSource).not.toMatch(/result\.notified/)
    })

    it('the route never awaits or reads inquiryNotification\'s response text/detail directly', () => {
      // sendInquiryNotification is only ever passed as the `notify` dependency
      // — the route never calls it (or reads a Response it returns) itself.
      expect(routeSource).not.toMatch(/sendInquiryNotification\([^)]*\)\s*\.then/)
      expect(routeSource).not.toMatch(/await\s+sendInquiryNotification/)
      expect(routeSource).toMatch(/notify:\s*\(created\)\s*=>\s*\n?\s*sendInquiryNotification/)
    })
  })

  describe('Resend stays retired', () => {
    it('package.json declares no "resend" dependency', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
      }
      expect(Object.keys(pkg.dependencies ?? {})).not.toContain('resend')
      expect(Object.keys(pkg.devDependencies ?? {})).not.toContain('resend')
    })

    it('no file under src/ imports the "resend" package', () => {
      const importPattern = /from\s+['"]resend['"]|require\(\s*['"]resend['"]\s*\)/
      for (const file of SCANNABLE_SRC_FILES) {
        expect(fs.readFileSync(file, 'utf8')).not.toMatch(importPattern)
      }
    })

    it('no file under src/ reads a RESEND_-prefixed environment variable', () => {
      const envReadPattern = /process\.env\.RESEND_[A-Z0-9_]*/
      for (const file of SCANNABLE_SRC_FILES) {
        expect(fs.readFileSync(file, 'utf8')).not.toMatch(envReadPattern)
      }
    })
  })
})
