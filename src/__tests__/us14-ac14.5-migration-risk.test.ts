/**
 * ---
 * file: src/__tests__/us14-ac14.5-migration-risk.test.ts
 * project: earthandhoney
 * purpose: Verify AC-14.5 — PIVOT_AUDIT.md includes a migration-risk
 *          section listing today's data (Payload media records,
 *          galleries, users, uploaded R2 objects), stating for each
 *          whether it must be migrated, discarded, or left in place,
 *          and naming the risk of getting it wrong.
 * created-by: dev-team
 * related-story: US-14
 * related-ac: 14.5
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

// Bounded at the FIRST top-level heading after `heading` — not at
// `nextHeading` directly. Later stories (US-17) append their own `## `
// sections ahead of the AC-14.6 recommendation block, which must stay the
// document's last section; scanning all the way to `nextHeading` would
// swallow those sections and mis-read their tables as AC-14.5 rows.
// `nextHeading` is still asserted to follow, so the expected document
// order is preserved.
function extractSection(audit: string, heading: string, nextHeading: string): string {
  const start = audit.indexOf(heading)
  expect(start).toBeGreaterThanOrEqual(0)
  const after = start + heading.length
  if (nextHeading) {
    expect(audit.indexOf(nextHeading, after)).toBeGreaterThan(-1)
  }
  const end = audit.indexOf('\n## ', after)
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
    .filter((cells) => cells[0] !== 'Data category')
}

const DATA_CATEGORIES = [
  { needle: 'Payload media records', disposition: 'Migrate' },
  { needle: 'Galleries', disposition: 'Migrate' },
  { needle: 'Users', disposition: 'Left in place' },
  { needle: 'Uploaded R2 objects', disposition: 'Migrate' },
]

describe('AC-14.5: PIVOT_AUDIT.md includes a migration-risk section', () => {
  it('PIVOT_AUDIT.md exists at the repo root', () => {
    expect(fs.existsSync(path.join(root, 'PIVOT_AUDIT.md'))).toBe(true)
  })

  const audit = read('PIVOT_AUDIT.md')
  const section = extractSection(
    audit,
    '## Migration-risk section (AC-14.5)',
    '## Recommendation and open questions (AC-14.6)',
  )
  const rows = tableRows(section)

  it('lists every data category named by the AC exactly once', () => {
    for (const { needle } of DATA_CATEGORIES) {
      const matches = rows.filter((cells) => cells[0].includes(needle))
      expect(matches.length).toBe(1)
    }
  })

  it('states a migrated/discarded/left-in-place disposition for each data category', () => {
    for (const { needle, disposition } of DATA_CATEGORIES) {
      const row = rows.find((cells) => cells[0].includes(needle))
      expect(row).toBeDefined()
      expect(row![2]).toContain(disposition)
    }
  })

  it('every row states a non-empty risk of getting the disposition wrong', () => {
    expect(rows.length).toBeGreaterThanOrEqual(DATA_CATEGORIES.length)
    for (const row of rows) {
      // Data category | Where it lives today | Disposition | Risk of getting it wrong
      expect(row[3]).toBeDefined()
      expect(row[3].length).toBeGreaterThan(20)
    }
  })

  it('names the concrete storage location (Postgres collection or R2) for each category', () => {
    const mediaRow = rows.find((cells) => cells[0].includes('Payload media records'))
    const galleriesRow = rows.find((cells) => cells[0].includes('Galleries'))
    const usersRow = rows.find((cells) => cells[0].includes('Users'))
    const r2Row = rows.find((cells) => cells[0].includes('Uploaded R2 objects'))

    expect(mediaRow![1]).toContain('media')
    expect(galleriesRow![1]).toContain('galleries')
    expect(usersRow![1]).toContain('users')
    expect(r2Row![1]).toMatch(/R2/)
  })

  it('does not recommend discarding media, galleries, or R2 objects outright without migration', () => {
    const mediaRow = rows.find((cells) => cells[0].includes('Payload media records'))
    const galleriesRow = rows.find((cells) => cells[0].includes('Galleries'))
    const r2Row = rows.find((cells) => cells[0].includes('Uploaded R2 objects'))

    expect(mediaRow![2]).not.toBe('Discard')
    expect(galleriesRow![2]).not.toBe('Discard')
    expect(r2Row![2]).not.toBe('Discard')
  })

  it('cross-references the duplicate-feature risk map or superseded artifacts established by earlier ACs', () => {
    expect(section).toMatch(/Superseded artifacts/)
    expect(section).toMatch(/Duplicate-feature risk map/)
  })
})
