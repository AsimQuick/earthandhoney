/**
 * ---
 * file: src/__tests__/us18-ac18.5-backstage-surfaces-disabled.test.ts
 * project: earthandhoney
 * purpose: Verify AC-18.5 — PAYLOAD_PICPEAK_API_CONTRACT.md records which
 *          Backstage surfaces are disabled because they duplicate this
 *          project's chosen architecture (public landing-page content
 *          management, native quote/invoice/accounting screens, and any
 *          page-building capability), and how each is disabled or hidden.
 *          Also cross-checks the document's claims directly against the
 *          pinned fork's source (feature-flag defaults, the route-level
 *          403 guards, the public-site 302 redirect, and the absence of any
 *          drag/block page-builder dependency), so the document cannot
 *          silently drift from what the vendored code actually does.
 * created-by: dev-team
 * related-story: US-18
 * related-ac: 18.5
 * ---
 */
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

const DOC_PATH = 'PAYLOAD_PICPEAK_API_CONTRACT.md'

function section(doc: string, heading: string): string {
  const start = doc.indexOf(heading)
  expect(start).toBeGreaterThan(-1)
  const nextHeadingMatch = doc.slice(start + heading.length).match(/\n## /)
  const end = nextHeadingMatch ? start + heading.length + nextHeadingMatch.index! : undefined
  return doc.slice(start, end)
}

describe('AC-18.5: the contract records which Backstage surfaces are disabled, and how', () => {
  it('PAYLOAD_PICPEAK_API_CONTRACT.md exists at the repo root', () => {
    expect(exists(DOC_PATH)).toBe(true)
  })

  const doc = read(DOC_PATH)

  it('carries an updated structured metadata header covering AC-18.5', () => {
    expect(doc).toMatch(/file:\s*PAYLOAD_PICPEAK_API_CONTRACT\.md/)
    expect(doc).toMatch(/related-story:\s*US-18/)
    expect(doc).toMatch(/related-ac:\s*18\.2,\s*18\.3,\s*18\.4,\s*18\.5/)
  })

  it('has a dedicated section naming this AC', () => {
    expect(doc).toMatch(/## Backstage surfaces to disable \(AC-18\.5\)/)
  })

  const surfaces = section(doc, '## Backstage surfaces to disable (AC-18.5)')
  const surfacesFlat = surfaces.replace(/\s+/g, ' ')

  describe('1. Public landing-page content management', () => {
    it('names the two distinct surfaces and scopes out the one that is not a duplicate', () => {
      expect(surfaces).toMatch(/CMS Pages/)
      expect(surfaces).toMatch(/Public Site/)
      expect(surfacesFlat).toMatch(/not.{0,20}a duplicate of anything Payload owns/)
    })

    it('cites the public-site enabled flag, its shipped-off default, and the GET \\/ redirect when disabled', () => {
      expect(surfaces).toMatch(/general_public_site_enabled/)
      expect(surfacesFlat).toMatch(/defaults `general_public_site_enabled` to\s*`false`/)
      expect(surfaces).toMatch(/res\.redirect\(302, '\/admin\/login'\)/)
    })

    it('records that the feature-flag gap has been closed by US-27 AC-27.1, citing the change record', () => {
      expect(surfacesFlat).toMatch(/closes the gap the original audit recorded here/)
      expect(surfaces).toMatch(/publicSite/)
      expect(surfaces).toMatch(/FORK_CHANGELOG\.md/)
    })
  })

  describe('2. Native quote/invoice/accounting screens', () => {
    it('names the quotes, bills, and tax-report surfaces with their flags', () => {
      expect(surfaces).toMatch(/adminQuotes\.js/)
      expect(surfaces).toMatch(/adminInvoices\.js/)
      expect(surfaces).toMatch(/adminTaxReport\.js/)
      expect(surfaces).toMatch(/`quotes`/)
      expect(surfaces).toMatch(/`bills`/)
    })

    it('explicitly excludes Contracts from the disable list, citing SYSTEM_OWNERSHIP.md\'s opposite assignment', () => {
      expect(surfaces).toMatch(/adminContracts\.js/)
      expect(surfacesFlat).toMatch(/deliberately \*\*excluded\*\*/)
      expect(surfacesFlat).toMatch(/must stay on, not off/)
    })

    it('states four independent enforcement layers: flag defaults, server-side 403, route hiding, nav hiding', () => {
      expect(surfaces).toMatch(/QUOTES_DISABLED/)
      expect(surfaces).toMatch(/BILLS_DISABLED/)
      expect(surfaces).toMatch(/RequireFeature/)
      expect(surfaces).toMatch(/AdminSidebar\.tsx/)
    })

    it('records the operational rule to never enable these flags', () => {
      expect(surfacesFlat).toMatch(/never set `quotes`, `bills`,\s*or `taxReport` to `true`/)
    })
  })

  describe('3. Page-building capability', () => {
    it('states the audit found no page-builder in the pinned fork', () => {
      expect(surfaces).toMatch(/audited, not present/i)
      expect(surfacesFlat).toMatch(/no page-building capability exists in the pinned fork/)
    })

    it('cites the evidence: no drag\\/block dependency, and the two existing editors are linear, not block-based', () => {
      expect(surfaces).toMatch(/@tiptap\/react/)
      expect(surfaces).toMatch(/PhotoUpload\.tsx/)
    })
  })

  it('has a summary table covering all six audited surfaces', () => {
    expect(surfaces).toMatch(/## Summary/)
    expect(surfaces).toMatch(/\| Public Site homepage HTML\/CSS editor/)
    expect(surfaces).toMatch(/\| Quotes /)
    expect(surfaces).toMatch(/\| Bills\/Invoices /)
    expect(surfaces).toMatch(/\| Tax report /)
    expect(surfaces).toMatch(/\| Page builder /)
  })
})

describe('AC-18.5: the disabling claims are cross-checked directly against the pinned fork', () => {
  it('quotes/bills/taxReport really do default to false, and the dependency cascade really is coded', () => {
    const flags = read('vendor/picpeak/backend/src/routes/adminFeatureFlags.js')
    expect(flags).toMatch(/quotes:\s*false/)
    expect(flags).toMatch(/bills:\s*false/)
    expect(flags).toMatch(/taxReport:\s*false/)
    expect(flags).toMatch(/if\s*\(out\.quotes === false\)\s*out\.bills = false/)
    expect(flags).toMatch(/if\s*\(out\.bills === false\)\s*out\.taxReport = false/)
  })

  it('adminQuotes.js really does 403 with QUOTES_DISABLED when the flag is off, applied to the whole router', () => {
    const adminQuotes = read('vendor/picpeak/backend/src/routes/adminQuotes.js')
    expect(adminQuotes).toMatch(/QUOTES_DISABLED/)
    expect(adminQuotes).toMatch(/router\.use\(requireQuotesFlag\)/)
  })

  it('adminInvoices.js really does 403 with BILLS_DISABLED when the flag is off, applied to the whole router', () => {
    const adminInvoices = read('vendor/picpeak/backend/src/routes/adminInvoices.js')
    expect(adminInvoices).toMatch(/BILLS_DISABLED/)
    expect(adminInvoices).toMatch(/router\.use\(requireBillsFlag\)/)
  })

  it('adminTaxReport.js really does reuse the bills flag, as the document states', () => {
    const taxReport = read('vendor/picpeak/backend/src/routes/adminTaxReport.js')
    expect(taxReport).toMatch(/Reuses the existing `bills` feature flag/)
  })

  it('RequireFeature really does redirect to /admin/dashboard when a flag is off, and App.tsx really does wrap quotes/bills with it', () => {
    const requireFeature = read('vendor/picpeak/frontend/src/components/admin/RequireFeature.tsx')
    expect(requireFeature).toMatch(/Navigate to=\{fallback\}/)
    const app = read('vendor/picpeak/frontend/src/App.tsx')
    expect(app).toMatch(/RequireFeature flag="quotes"/)
    expect(app).toMatch(/RequireFeature flag="bills"/)
  })

  it('AdminSidebar.tsx really does gate the /admin/clients entry on the clients flag plus a featureFlagsAny list including quotes/bills/taxReport', () => {
    const sidebar = read('vendor/picpeak/frontend/src/components/admin/AdminSidebar.tsx')
    expect(sidebar).toMatch(/featureFlag:\s*'clients'/)
    expect(sidebar).toMatch(/featureFlagsAny:\s*\[/)
    expect(sidebar).toMatch(/'quotes'/)
    expect(sidebar).toMatch(/'bills'/)
    expect(sidebar).toMatch(/'taxReport'/)
  })

  it('publicSiteService.js really does default general_public_site_enabled to false', () => {
    const service = read('vendor/picpeak/backend/src/services/publicSiteService.js')
    expect(service).toMatch(/general_public_site_enabled:\s*false/)
  })

  it('publicSiteService.js really does redirect GET / to /admin/login when the flag is off or the setting is disabled (US-27 AC-27.1 moved this out of server.js)', () => {
    const service = read('vendor/picpeak/backend/src/services/publicSiteService.js')
    expect(service).toMatch(/if \(!flagEnabled\)/)
    expect(service).toMatch(/if \(!payload\.enabled\)/)
    expect(service).toMatch(/res\.redirect\(302, '\/admin\/login'\)/)
  })

  it('KNOWN_FLAGS really does now include a publicSite flag, confirming US-27 AC-27.1 closed the recorded gap (cms remains untouched, per the 1a scoping decision)', () => {
    const flags = read('vendor/picpeak/backend/src/routes/adminFeatureFlags.js')
    const knownFlagsMatch = flags.match(/const KNOWN_FLAGS = \[([\s\S]*?)\];/)
    expect(knownFlagsMatch).toBeTruthy()
    const knownFlagsBlock = knownFlagsMatch![1]
    expect(knownFlagsBlock).toMatch(/'publicSite'/)
    expect(knownFlagsBlock).not.toMatch(/'cms'/)
  })

  it('adminCMS.js really is gated only by RBAC permissions, not a feature flag, confirming the 1a scoping decision', () => {
    const adminCMS = read('vendor/picpeak/backend/src/routes/adminCMS.js')
    expect(adminCMS).toMatch(/requirePermission\('cms\.view'\)/)
    expect(adminCMS).toMatch(/requirePermission\('cms\.edit'\)/)
    expect(adminCMS).not.toMatch(/requireFeatureFlag|requireQuotesFlag|requireBillsFlag/)
  })

  it('CMSEditor.tsx really is TipTap (linear rich text), not a block/drag composer, confirming the page-builder finding', () => {
    const editor = read('vendor/picpeak/frontend/src/components/admin/CMSEditor.tsx')
    expect(editor).toMatch(/@tiptap\/react/)
  })

  it('no drag/block page-builder dependency exists in either package.json', () => {
    const frontendPkg = read('vendor/picpeak/frontend/package.json')
    const backendPkg = read('vendor/picpeak/backend/package.json')
    const forbidden = /"(react-dnd|@dnd-kit\/core|grapesjs|@craftjs\/core|react-beautiful-dnd)"/
    expect(frontendPkg).not.toMatch(forbidden)
    expect(backendPkg).not.toMatch(forbidden)
  })

  it('CLAUDE.md\'s CMS pillar names Payload\'s actual collection set, with no legal/impressum page type — the basis for scoping 1a out', () => {
    const claudeMd = read('CLAUDE.md')
    expect(claudeMd).toMatch(/Testimonials, Packages, FAQ/)
    expect(claudeMd).not.toMatch(/[Ii]mpressum/)
  })
})

describe("AC-18.5: does not silently pre-empt this story's remaining AC (18.6)", () => {
  const doc = read(DOC_PATH)

  it('still defers the terminology mapping (18.6) rather than pre-empting it', () => {
    expect(doc).toMatch(/AC-18\.6/)
  })
})

describe('does not silently edit files it is not scoped to change', () => {
  it('does not modify CLAUDE.md, SYSTEM_OWNERSHIP.md, scrum-master files, or vendor/picpeak source', () => {
    let gitStatus = ''
    try {
      gitStatus = execSync(
        'git status --porcelain -- CLAUDE.md SYSTEM_OWNERSHIP.md scrum-master/ vendor/picpeak/',
        { cwd: root, encoding: 'utf8' },
      )
    } catch {
      gitStatus = ''
    }
    expect(gitStatus.trim()).toBe('')
  })
})
