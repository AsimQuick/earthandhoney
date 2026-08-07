/**
 * ---
 * file: src/__tests__/us24-ac24.4-no-hardcoded-studio-strings.test.ts
 * project: earthandhoney
 * purpose: Verify AC-24.4 — no studio detail remains hard-coded in the repository. The
 *          US-8 shell (VerticalMenu/PublicShell), the root layout's route metadata, and
 *          the homepage placeholder all read their studio strings from the
 *          `StudioProfile` global (via src/lib/getStudioProfile.ts) instead of embedding
 *          their own literal copy. Every source file under src/ outside test
 *          fixtures is walked: the previously hard-coded studio-name literal appears
 *          in none of them, and the studio description sentence appears in exactly
 *          one — the StudioProfile global that owns it (PRD §21.1's single owner).
 * created-by: dev-team
 * related-story: US-24
 * related-ac: 24.4
 * ---
 */
import fs from 'fs'
import path from 'path'

import { StudioProfile } from '@/globals/StudioProfile'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const LAYOUT_PATH = 'src/app/(frontend)/layout.tsx'
const PAGE_PATH = 'src/app/(frontend)/page.tsx'
const VERTICAL_MENU_PATH = 'src/components/layout/VerticalMenu.tsx'
const PUBLIC_SHELL_PATH = 'src/components/layout/PublicShell.tsx'
const SITE_FOOTER_PATH = 'src/components/layout/SiteFooter.tsx'
const GET_STUDIO_PROFILE_PATH = 'src/lib/getStudioProfile.ts'

// The studio-name literal that used to be hard-coded in the (frontend)
// shell/route-metadata/homepage before this AC (US-1/US-8), in both the plain
// and HTML-entity spellings it appeared in. After AC-24.4 it exists nowhere
// under src/ at all — StudioProfile seeds the name as "Earth & Honey Studios"
// (AC-24.1), so not even the single owner carries this string.
const BANNED_EVERYWHERE = ['Earth & Honey Photography', 'Earth &amp; Honey Photography']

// The studio description sentence that used to be hard-coded in the route's
// `metadata` export. Unlike the name above it still has to exist *somewhere* —
// it is real copy — so this asserts the stronger single-owner property: it
// appears in exactly one file under src/, the StudioProfile global that owns
// it, and in no other.
const OWNED_DESCRIPTION = 'is a premium, gallery-first photography studio for weddings, portraits, and events'
const DESCRIPTION_OWNER_PATH = 'src/globals/StudioProfile.ts'

// Every source file under src/ except the test fixtures AC-24.4 carves out.
// This is a positive walk of src/ rather than a per-directory allow-list, so a
// future directory cannot silently escape the scan.
const TEST_FIXTURE_DIRS = ['src/__tests__', 'src/test-support']

function walk(rel: string): string[] {
  const abs = path.join(root, rel)
  if (!fs.existsSync(abs)) return []
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const child = `${rel}/${entry.name}`
    if (TEST_FIXTURE_DIRS.includes(child) || child.includes('__fixtures__')) return []
    if (entry.isDirectory()) return walk(child)
    return /\.(ts|tsx|js|jsx|css)$/.test(child) ? [child] : []
  })
}

const SCANNED_FILES = walk('src')

describe('US-24 AC-24.4: no studio detail remains hard-coded in the repository', () => {
  it('scans a non-empty set of files, including the shell/route-metadata files this AC targets and the description owner', () => {
    expect(SCANNED_FILES.length).toBeGreaterThan(0)
    expect(SCANNED_FILES).toContain(LAYOUT_PATH)
    expect(SCANNED_FILES).toContain(PAGE_PATH)
    expect(SCANNED_FILES).toContain(VERTICAL_MENU_PATH)
    expect(SCANNED_FILES).toContain(PUBLIC_SHELL_PATH)
    expect(SCANNED_FILES).toContain(SITE_FOOTER_PATH)
    expect(SCANNED_FILES).toContain(GET_STUDIO_PROFILE_PATH)
    expect(SCANNED_FILES).toContain(DESCRIPTION_OWNER_PATH)
  })

  it.each(SCANNED_FILES)('%s does not hard-code the studio name literal', (file) => {
    const src = read(file)
    for (const literal of BANNED_EVERYWHERE) {
      expect(src).not.toContain(literal)
    }
  })

  it('the studio description sentence appears in exactly one file under src/ — the StudioProfile global that owns it', () => {
    const carriers = SCANNED_FILES.filter((file) => read(file).includes(OWNED_DESCRIPTION))

    expect(carriers).toEqual([DESCRIPTION_OWNER_PATH])
  })

  describe('the root layout reads its route metadata from StudioProfile, not a literal', () => {
    const src = read(LAYOUT_PATH)

    it('exports an async generateMetadata, not a static hard-coded metadata object', () => {
      expect(src).toMatch(/export\s+async\s+function\s+generateMetadata\s*\(/)
      expect(src).not.toMatch(/export\s+const\s+metadata\s*[:=]/)
    })

    it('fetches the studio profile via src/lib/getStudioProfile.ts', () => {
      expect(src).toMatch(/from ["']@\/lib\/getStudioProfile["']/)
      expect(src).toMatch(/await getStudioProfile\(\)/)
    })

    it('builds title default/template and description from the fetched profile fields', () => {
      expect(src).toMatch(/default:\s*studioProfile\.businessName/)
      expect(src).toMatch(/template:\s*studioProfile\.defaultTitlePattern/)
      expect(src).toMatch(/description:\s*studioProfile\.defaultMetaDescription/)
    })

    it('passes the fetched business name down into the shell instead of leaving it hard-coded there', () => {
      expect(src).toMatch(/<PublicShell\s+businessName=\{studioProfile\.businessName\}>/)
    })
  })

  describe('the shell (VerticalMenu/PublicShell) reads the business name as a prop, not a literal', () => {
    it('VerticalMenu accepts a businessName prop and uses it for the logo alt text and copyright line', () => {
      const src = read(VERTICAL_MENU_PATH)
      expect(src).toMatch(/businessName/)
      expect(src).toMatch(/alt=\{`\$\{businessName\}[^`]*`\}/)
      expect(src).toMatch(/<span className="autor">\{businessName\}<\/span>/)
    })

    it("VerticalMenu's fallback default (used only when no data is available) is a generic, non-brand string", () => {
      const src = read(VERTICAL_MENU_PATH)
      const fallbackMatch = src.match(/FALLBACK_BUSINESS_NAME\s*=\s*'([^']+)'/)
      expect(fallbackMatch).not.toBeNull()
      const fallback = fallbackMatch![1]
      expect(fallback.toLowerCase()).not.toContain('earth')
      expect(fallback.toLowerCase()).not.toContain('honey')
    })

    it('PublicShell forwards businessName through to VerticalMenu rather than hard-coding it', () => {
      const src = read(PUBLIC_SHELL_PATH)
      expect(src).toMatch(/businessName/)
      expect(src).toMatch(/<VerticalMenu\s+businessName=\{businessName\}\s*\/>/)
    })

    it('SiteFooter carries no studio-detail literal of its own', () => {
      const src = read(SITE_FOOTER_PATH)
      for (const literal of [...BANNED_EVERYWHERE, OWNED_DESCRIPTION]) {
        expect(src).not.toContain(literal)
      }
    })
  })

  describe('the homepage placeholder carries no studio detail', () => {
    it('page.tsx no longer hard-codes the business name outside its structured-metadata header (whose "project: earthandhoney" field names the repo, not the studio)', () => {
      const src = read(PAGE_PATH).replace(/^\/\*[\s\S]*?\*\//, '')
      expect(src.toLowerCase()).not.toContain('earth')
      expect(src.toLowerCase()).not.toContain('honey')
    })
  })

  describe('src/lib/getStudioProfile.ts is the single reader every consumer above goes through', () => {
    const src = read(GET_STUDIO_PROFILE_PATH)

    it('carries the CLAUDE.md structured metadata header naming AC-24.4', () => {
      const header = src.match(/^\/\*[\s\S]*?\*\//)?.[0] ?? ''
      expect(header).toMatch(/^\s*\/\*\*?\s*\n\s*\*\s*---/)
      expect(header).toMatch(/\*\s*related-story:\s*US-24/)
      expect(header).toMatch(/\*\s*related-ac:[^\n]*24\.4/)
    })

    it('reads the studio-profile global via the Payload Local API', () => {
      expect(src).toMatch(/from ['"]payload['"]/)
      expect(src).toMatch(/getPayload\s*\(/)
      expect(src).toMatch(/slug:\s*['"]studio-profile['"]/)
    })

    it('falls back to StudioProfile\'s own field defaultValues, never a second literal copy', () => {
      expect(src).toMatch(/from ['"]@\/globals\/StudioProfile['"]/)
      expect(src).toMatch(/StudioProfile\.fields\.find/)
      for (const literal of [...BANNED_EVERYWHERE, OWNED_DESCRIPTION]) {
        expect(src).not.toContain(literal)
      }
    })
  })

  describe('StudioProfile itself is the single owner of the previously-hard-coded description text', () => {
    it('defaultMetaDescription now carries the studio description as its field defaultValue', () => {
      const field = StudioProfile.fields.find(
        (candidate) => 'name' in candidate && candidate.name === 'defaultMetaDescription',
      )
      expect(field && 'defaultValue' in field ? field.defaultValue : undefined).toMatch(
        /premium, gallery-first photography studio/,
      )
    })
  })
})
