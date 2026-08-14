/**
 * ---
 * file: src/__tests__/us33-ac33.5-no-smtp-secret-in-browser.test.ts
 * project: earthandhoney
 * purpose: Verify AC-33.5's "no SMTP secret is ever exposed to the browser"
 *          clause (PRD 20.3) by static analysis of the source tree, the way
 *          US-33's other lock-in suites (e.g. AC-33.1's field-type guard)
 *          check a structural invariant rather than running a full
 *          production webpack build. Three checks: (1) the Bearer API token
 *          this AC introduces (BACKSTAGE_API_TOKEN) is referenced only by
 *          the one server-only file that reads it, never with a
 *          `NEXT_PUBLIC_` prefix that Next.js would inline into client
 *          bundles; (2) src/lib/inquiryNotification.ts — the only file that
 *          reads process.env.BACKSTAGE_API_TOKEN — is imported only from a
 *          Next.js Route Handler (src/app/**\/route.ts), a module class
 *          Next.js never ships to the browser, and from no file carrying a
 *          `'use client'` directive; (3) no client component anywhere
 *          references BACKSTAGE_API_TOKEN, SMTP_*, or the Backstage backend
 *          origin used to reach the email-queue route.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.5
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const SRC = path.join(root, 'src')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, out)
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.includes('.test.')) {
      out.push(full)
    }
  }
  return out
}

const allSourceFiles = walk(SRC)
const relFiles = allSourceFiles.map((f) => path.relative(root, f))

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

/**
 * True when the file is a React client module. Every source file in this
 * project opens with a structured metadata header comment, so the `'use
 * client'` directive is never literally the first characters on disk — it
 * sits immediately after that block comment, which is exactly where the
 * compiler still honours it. Stripping leading block comments before
 * looking is therefore the check that matches reality; testing
 * `content.startsWith("'use client'")` would silently classify every real
 * client component in this codebase as a server module and pass vacuously.
 */
function isClientModule(content: string): boolean {
  const stripped = content.replace(/^\s*(\/\*[\s\S]*?\*\/|\/\/[^\n]*\n)\s*/g, '')
  return /^(['"])use client\1/.test(stripped)
}

describe('AC-33.5: no SMTP/Backstage-API secret ever reaches the browser', () => {
  it('BACKSTAGE_API_TOKEN is referenced by exactly one source file: the server-only module that reads it', () => {
    const referencing = relFiles.filter((rel) => read(rel).includes('BACKSTAGE_API_TOKEN'))
    expect(referencing).toEqual(['src/lib/inquiryNotification.ts'])
  })

  it('no source file exposes the token or SMTP settings under a NEXT_PUBLIC_ prefix', () => {
    const offenders = relFiles.filter((rel) => {
      const content = read(rel)
      return /NEXT_PUBLIC_[A-Z_]*(BACKSTAGE_API_TOKEN|SMTP)/.test(content)
    })
    expect(offenders).toEqual([])
  })

  it('inquiryNotification.ts carries no "use client" directive — it never becomes a client module', () => {
    expect(isClientModule(read('src/lib/inquiryNotification.ts'))).toBe(false)
  })

  it('inquiryNotification.ts is imported only from a Next.js Route Handler under src/app', () => {
    const importers = relFiles.filter(
      (rel) => rel !== 'src/lib/inquiryNotification.ts' && /from ['"]@\/lib\/inquiryNotification['"]/.test(read(rel)),
    )
    expect(importers).toEqual(['src/app/(frontend)/api/inquiries/route.ts'])
    // A Next.js Route Handler file is matched by convention (`route.ts`
    // inside `src/app`), which the App Router never bundles for the client
    // — contrast a page/layout/component file, which can be.
    for (const importer of importers) {
      expect(path.basename(importer)).toBe('route.ts')
      expect(importer.startsWith('src/app' + path.sep) || importer.startsWith('src/app/')).toBe(true)
    }
  })

  it('no file carrying a "use client" directive references BACKSTAGE_API_TOKEN, SMTP_*, or the Backstage backend origin', () => {
    const clientFiles = relFiles.filter((rel) => isClientModule(read(rel)))
    // Sanity: the app really does have client components, so a green result
    // below means "checked and clean", never "found nothing to check".
    expect(clientFiles.length).toBeGreaterThan(0)

    const offenders = clientFiles.filter((rel) => {
      const content = read(rel)
      return /BACKSTAGE_API_TOKEN|SMTP_[A-Z_]+|BACKSTAGE_BACKEND_URL/.test(content)
    })
    expect(offenders).toEqual([])
  })

  it('the route handler never forwards the token or any Backstage response body verbatim to the client', () => {
    const content = read('src/app/(frontend)/api/inquiries/route.ts')
    // The only thing the route ever returns to the caller is { id } — it
    // never echoes back anything sendInquiryNotification()/fetch() received.
    expect(content).toMatch(/NextResponse\.json\(\{ id: result\.id \}, \{ status: 201 \}\)/)
    expect(content).not.toMatch(/BACKSTAGE_API_TOKEN/)
  })
})
