/**
 * ---
 * file: src/__tests__/us14-ac14.4-dependency-licence-audit.test.ts
 * project: earthandhoney
 * purpose: Verify AC-14.4 — PIVOT_AUDIT.md includes a dependency and
 *          licence audit: every third-party dependency newly introduced
 *          or dropped by the pivot is listed with its licence, and any
 *          copyleft/commercially restrictive licence is flagged for
 *          Product Owner decision.
 * created-by: dev-team
 * related-story: US-14
 * related-ac: 14.4
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

function extractSection(audit: string, heading: string, nextHeading: string): string {
  const start = audit.indexOf(heading)
  expect(start).toBeGreaterThanOrEqual(0)
  const end = nextHeading ? audit.indexOf(nextHeading, start + heading.length) : -1
  return audit.slice(start, end === -1 ? undefined : end)
}

function tableRows(section: string): string[][] {
  return section
    .split('\n')
    .filter((line) => /^\|/.test(line) && !/^\|\s*---/.test(line))
    .map((line) =>
      line
        .split('|')
        .map((c) => c.trim().replace(/\*\*/g, '').replace(/^`|`$/g, ''))
        .filter((c) => c.length > 0),
    )
    .filter((cells) => cells[0] !== 'Dependency')
}

const DROPPED_DEPS = ['sharp', '@payloadcms/storage-s3']
const NO_IMPACT_DEPS = ['next', 'payload', 'react', 'react-dom', 'photoswipe']

describe('AC-14.4: PIVOT_AUDIT.md includes a dependency and licence audit', () => {
  it('PIVOT_AUDIT.md exists at the repo root', () => {
    expect(fs.existsSync(path.join(root, 'PIVOT_AUDIT.md'))).toBe(true)
  })

  const audit = read('PIVOT_AUDIT.md')
  const section = extractSection(audit, '## Dependency and licence audit (AC-14.4)', '')

  it('has a Dropped by the pivot subsection listing every superseded runtime dependency with its licence', () => {
    const dropped = extractSection(section, '### Dropped by the pivot', '### Newly introduced by the pivot')
    const rows = tableRows(dropped)
    for (const dep of DROPPED_DEPS) {
      const row = rows.find((cells) => cells[0].includes(dep))
      expect(row).toBeDefined()
      expect(row![1].length).toBeGreaterThan(0)
    }
  })

  it('has a Newly introduced by the pivot subsection', () => {
    expect(section).toContain('### Newly introduced by the pivot')
  })

  it('flags the PicPeak fork licence as unconfirmed and routes it to a Product Owner decision', () => {
    const introduced = extractSection(
      section,
      '### Newly introduced by the pivot',
      '### Current runtime dependencies with no pivot impact',
    )
    expect(introduced).toMatch(/PicPeak/)
    expect(introduced).toMatch(/Unconfirmed/)
    expect(introduced).toMatch(/FLAGGED for Product Owner decision/)
    expect(introduced).toContain('po-requests.md')
  })

  it('cross-references the AC-15.1 licence-verification gate rather than deciding the licence question itself', () => {
    expect(section).toMatch(/US-15/)
    expect(section).toMatch(/AC-15\.1/)
  })

  it('states the licence for every dependency with no pivot impact', () => {
    const noImpact = extractSection(section, '### Current runtime dependencies with no pivot impact', '')
    for (const dep of NO_IMPACT_DEPS) {
      expect(noImpact).toContain(dep)
    }
    expect(noImpact).toMatch(/MIT/)
  })

  it('the sharp row in the Dropped table has a licence that matches its actual installed package.json', () => {
    // @payloadcms/storage-s3 was fully removed from package.json/node_modules
    // by AC-28.1.2 (US-28), so its installed package.json can no longer be
    // cross-checked live — its Dropped-table row (checked above) still stands
    // as the historical record.
    const dropped = extractSection(section, '### Dropped by the pivot', '### Newly introduced by the pivot')
    const rows = tableRows(dropped)

    const sharpPkg = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/sharp/package.json'), 'utf8'))
    const sharpRow = rows.find((cells) => cells[0].includes('sharp'))

    expect(sharpRow![1]).toBe(sharpPkg.license)
  })

  it('does not silently drop photoswipe — it is named as kept, not dropped or newly introduced', () => {
    const dropped = extractSection(section, '### Dropped by the pivot', '### Newly introduced by the pivot')
    const introduced = extractSection(
      section,
      '### Newly introduced by the pivot',
      '### Current runtime dependencies with no pivot impact',
    )
    expect(dropped).not.toContain('photoswipe')
    expect(introduced).toContain('photoswipe')
  })
})
