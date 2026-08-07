/**
 * ---
 * file: src/__tests__/us27-ac27.2-cms-public-site-panel-flag-gated.test.ts
 * project: earthandhoney
 * purpose: Verify AC-27.2 — the "Public Site" raw HTML/CSS panel in
 *          vendor/picpeak/frontend/src/pages/admin/CMSPage.tsx is hidden
 *          behind the `publicSite` feature flag added in AC-27.1, so the
 *          capability is not offered in the UI (not merely unreachable at
 *          the server). Mirrors the static-source-assertion pattern
 *          AC-18.5 used to cross-check the quotes panel's RequireFeature
 *          gate (`expect(app).toMatch(/RequireFeature flag="quotes"/)`):
 *          this suite reads the pinned fork's source directly rather than
 *          rendering it, since vendor/ is out of jest's test/module roots
 *          (jest.config.ts) by design (US-15 AC-15.6).
 * created-by: dev-team
 * related-story: US-27
 * related-ac: 27.2
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const CMS_PAGE_PATH = 'vendor/picpeak/frontend/src/pages/admin/CMSPage.tsx'
const FEATURE_FLAGS_CONTEXT_PATH = 'vendor/picpeak/frontend/src/contexts/FeatureFlagsContext.tsx'
const FEATURE_FLAGS_SERVICE_PATH = 'vendor/picpeak/frontend/src/services/featureFlags.service.ts'
const APP_PATH = 'vendor/picpeak/frontend/src/App.tsx'

describe('AC-27.2: the Public Site panel is gated by the publicSite flag, not just the server', () => {
  const cmsPage = read(CMS_PAGE_PATH)

  it('CMSPage.tsx reads live feature flags via the same context RequireFeature and the quotes UI use', () => {
    expect(cmsPage).toMatch(/import \{ useFeatureFlags \} from '\.\.\/\.\.\/contexts\/FeatureFlagsContext'/)
    expect(cmsPage).toMatch(/const \{ flags: featureFlags \} = useFeatureFlags\(\)/)
  })

  it('wraps the entire Public Site panel in a `featureFlags.publicSite &&` conditional', () => {
    const gateIndex = cmsPage.indexOf('{featureFlags.publicSite &&')
    expect(gateIndex).toBeGreaterThan(-1)

    // The panel's own heading/content markers must sit strictly inside the
    // gated block: after the gate opens, and before the sibling "CMS Pages"
    // section (the always-visible grid) that follows it in the JSX tree.
    const siblingSectionIndex = cmsPage.indexOf('<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">')
    expect(siblingSectionIndex).toBeGreaterThan(gateIndex)

    const gatedBlock = cmsPage.slice(gateIndex, siblingSectionIndex)

    // The gated block must close (`)}`) before the sibling section starts —
    // i.e. the conditional isn't left open, silently gating everything below it.
    expect(gatedBlock.trim().endsWith(')}')).toBe(true)

    // Public Site panel content lives inside the gated slice.
    expect(gatedBlock).toMatch(/settings\.publicSite\.badge/)
    expect(gatedBlock).toMatch(/settings\.publicSite\.title/)
    expect(gatedBlock).toMatch(/publicSiteHtml/)
    expect(gatedBlock).toMatch(/publicSiteSaveMutation\.mutate/)

    // Nothing above the gate (page header, etc.) references the panel —
    // proves the gate wraps the panel's first render point, not a copy.
    const beforeGate = cmsPage.slice(0, gateIndex)
    expect(beforeGate).not.toMatch(/settings\.publicSite\.badge/)
  })

  it('does not touch the always-on CMS Pages surface (AC-27.4 scoping) — no flag gate on the page-selection column', () => {
    const siblingSectionIndex = cmsPage.indexOf('<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">')
    const afterGate = cmsPage.slice(siblingSectionIndex)
    expect(afterGate).toMatch(/cms\.pages/)
    expect(afterGate).not.toMatch(/featureFlags\.publicSite/)
  })
})

describe('AC-27.2: the publicSite flag exists on the frontend the same way quotes/bills do', () => {
  it('FeatureKey (featureFlags.service.ts) includes publicSite, mirroring quotes/bills', () => {
    const service = read(FEATURE_FLAGS_SERVICE_PATH)
    expect(service).toMatch(/\| 'quotes'/)
    expect(service).toMatch(/\| 'bills'/)
    expect(service).toMatch(/\| 'publicSite'/)
  })

  it('DEFAULT_FLAGS (FeatureFlagsContext.tsx) defaults publicSite to false, mirroring quotes/bills', () => {
    const context = read(FEATURE_FLAGS_CONTEXT_PATH)
    expect(context).toMatch(/quotes:\s*false/)
    expect(context).toMatch(/bills:\s*false/)
    expect(context).toMatch(/publicSite:\s*false/)
  })
})

describe('AC-27.2: mirrors the existing test pattern covering the quotes panel gate (AC-18.5)', () => {
  it('the quotes route really is wrapped in RequireFeature in App.tsx — the pattern this AC is modeled on', () => {
    const app = read(APP_PATH)
    expect(app).toMatch(/RequireFeature flag="quotes"/)
  })

  it('CMSPage.tsx renders inside FeatureFlagsProvider (AdminLayout), so the flag read cannot throw', () => {
    const adminLayout = read('vendor/picpeak/frontend/src/components/admin/AdminLayout.tsx')
    expect(adminLayout).toMatch(/<FeatureFlagsProvider>/)
    const settingsPage = read('vendor/picpeak/frontend/src/pages/admin/SettingsPage.tsx')
    expect(settingsPage).toMatch(/activeTab === 'cms' && <CMSPage \/>/)
  })
})
