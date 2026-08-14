/**
 * ---
 * file: src/__tests__/us30-ac30.1-test-lane-classification.test.ts
 * project: earthandhoney
 * purpose: Verify AC-30.1 — the committed LIVE/UNIT classification of every
 *          Jest suite under src/__tests__/ (TEST_LANE_INVENTORY.json,
 *          summarised in TEST_LANE_CLASSIFICATION.md) stays complete and
 *          honest: every suite that exists on disk is listed exactly once,
 *          no stale entry survives a deleted suite, the declared counts
 *          match reality, and each LIVE entry's reason is still backed by
 *          the actual live-dependency code (a real dns.lookup()/fetch()
 *          pair) rather than trusted on the manifest's word alone. Also
 *          pins the chosen lane-assignment mechanism (Jest `projects`) and
 *          that both rejected alternatives are recorded.
 * created-by: dev-team
 * related-story: US-30
 * related-ac: 30.1
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

type LaneEntry = { path: string; lane: 'LIVE' | 'UNIT'; reason: string }
type Inventory = {
  totalSuites: number
  counts: { live: number; unit: number }
  mechanism: {
    chosen: string
    rejected: Array<{ option: string; label: string; reason: string }>
  }
  suites: LaneEntry[]
}

const inventory: Inventory = JSON.parse(read('TEST_LANE_INVENTORY.json'))
const classificationDoc = read('TEST_LANE_CLASSIFICATION.md')

function discoverSuites(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name)
    if (entry.isDirectory()) {
      discoverSuites(rel, acc)
    } else if (/\.test\.tsx?$/.test(entry.name)) {
      acc.push(rel)
    }
  }
  return acc
}

const suitesOnDisk = discoverSuites('src/__tests__').sort()

describe('AC-30.1: test lane classification inventory', () => {
  it('lists every suite on disk exactly once, with no stale entries', () => {
    const manifestPaths = inventory.suites.map((s) => s.path).sort()
    expect(new Set(manifestPaths).size).toBe(manifestPaths.length)
    expect(manifestPaths).toEqual(suitesOnDisk)
  })

  it('declared counts match the manifest contents and the suites on disk', () => {
    const live = inventory.suites.filter((s) => s.lane === 'LIVE')
    const unit = inventory.suites.filter((s) => s.lane === 'UNIT')
    expect(inventory.counts.live).toBe(live.length)
    expect(inventory.counts.unit).toBe(unit.length)
    expect(inventory.totalSuites).toBe(inventory.suites.length)
    expect(inventory.totalSuites).toBe(suitesOnDisk.length)
  })

  it('every suite has a non-empty reason, and every LIVE reason names a specific dependency', () => {
    for (const suite of inventory.suites) {
      expect(suite.reason.length).toBeGreaterThan(10)
      if (suite.lane === 'LIVE') {
        expect(suite.reason).toMatch(/db|backstage-backend|postgres|r2|dns\.lookup/i)
      }
    }
  })

  it('the LIVE lane is exactly the ten suites known to gate on a live dependency', () => {
    const liveOfSuites = inventory.suites.filter((s) => s.lane === 'LIVE').map((s) => s.path).sort()
    expect(liveOfSuites).toEqual(
      [
        'src/__tests__/us1-ac1.2-postgres-migration.test.ts',
        'src/__tests__/us2-ac2.4-alt-text-required.test.ts',
        'src/__tests__/us25-ac25.2-backstage-client-flow-a.test.ts',
        'src/__tests__/us29-ac29.5-security-invariants-preserved.test.ts',
        'src/__tests__/us31-ac31.4-public-page-route.test.ts',
        'src/__tests__/us31-ac31.5-public-page-gallery-placement.test.ts',
        'src/__tests__/us31-ac31.6-live-seo-metadata.test.ts',
        'src/__tests__/us32-ac32.2-first-public-navigation.test.ts',
        'src/__tests__/us32-ac32.3-navigation-gate-live-toggle.test.ts',
        'src/__tests__/us33-ac33.2-inquiry-durable-persist-live.test.ts',
        'src/__tests__/us33-ac33.3-server-validation-live.test.ts',
        'src/__tests__/us33-ac33.4-spam-protection-live.test.ts',
        'src/__tests__/us34-ac34.1-homepage-order-live.test.ts',
        'src/__tests__/us34-ac34.3-hero-gallery-live.test.ts',
        'src/__tests__/us34-ac34.4-home-selected-galleries-reorder-live.test.ts',
        'src/__tests__/us35-ac35.3-live-details-page-creation.test.ts',
        'src/__tests__/us36-ac36.4-story-index-route.test.ts',
        'src/__tests__/us37-ac37.2-live-seo-metadata.test.ts',
        'src/__tests__/us37-ac37.3-live-structured-data.test.ts',
        'src/__tests__/us37-ac37.4.1-sitemap-closed-set-live.test.ts',
        'src/__tests__/us37-ac37.4.2-sitemap-excludes-draft-and-noindex-live.test.ts',
        'src/__tests__/us37-ac37.4.3-sitemap-image-references-live.test.ts',
        'src/__tests__/us37-ac37.5-robots-and-dev-routes-live.test.ts',
      ].sort(),
    )
  })

  it('each LIVE suite still contains the real dns.lookup()/fetch() gate its reason claims', () => {
    const live = inventory.suites.filter((s) => s.lane === 'LIVE')
    for (const suite of live) {
      const src = read(suite.path)
      expect(src).toMatch(/dns[.\s\S]{0,20}lookup\(/)
      expect(src).toMatch(/fetch\(/)
    }
  })

  it('records the Jest `projects` mechanism as chosen, with both alternatives rejected and reasoned', () => {
    expect(inventory.mechanism.chosen).toBe('jest-projects')
    const rejectedOptions = inventory.mechanism.rejected.map((r) => r.option).sort()
    expect(rejectedOptions).toEqual(['naming-convention', 'testPathIgnorePatterns-pair'])
    for (const rejection of inventory.mechanism.rejected) {
      expect(rejection.reason.length).toBeGreaterThan(20)
    }
  })

  it('TEST_LANE_CLASSIFICATION.md summarises the same counts and names every LIVE suite', () => {
    expect(classificationDoc).toMatch(new RegExp(`\\b${inventory.counts.live}\\b`))
    expect(classificationDoc).toMatch(new RegExp(`\\b${inventory.counts.unit}\\b`))
    for (const suite of inventory.suites.filter((s) => s.lane === 'LIVE')) {
      expect(classificationDoc).toContain(suite.path)
    }
  })
})
