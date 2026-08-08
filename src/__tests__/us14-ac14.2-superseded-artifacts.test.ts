/**
 * ---
 * file: src/__tests__/us14-ac14.2-superseded-artifacts.test.ts
 * project: earthandhoney
 * purpose: Verify AC-14.2 — PIVOT_AUDIT.md explicitly names the artifacts
 *          superseded by the PicPeak fork (Payload Galleries collection,
 *          Payload-owned Sharp derivative pipeline, Payload-owned R2 upload
 *          path, in-repo gallery viewer components) with a disposition of
 *          deleted now / left dormant / kept as a Frontstage renderer, and
 *          lists the orphaned .env.example vars left behind by retired
 *          US-12/US-13 (RESEND_API_KEY, LEAD_NOTIFICATION_EMAIL,
 *          NEXT_PUBLIC_WHATSAPP_NUMBER) each marked removed or retained
 * created-by: dev-team
 * related-story: US-14
 * related-ac: 14.2
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const VALID_ARTIFACT_DISPOSITIONS = ['Deleted now', 'Left dormant', 'Kept as a Frontstage renderer']
const VALID_ENV_DISPOSITIONS = ['Removed', 'Retained']

const SUPERSEDED_ARTIFACTS = [
  'Payload `Galleries` collection',
  'Payload-owned Sharp derivative pipeline',
  'Payload-owned R2 upload path',
  'In-repo gallery viewer components',
]

const ORPHANED_ENV_VARS = ['RESEND_API_KEY', 'LEAD_NOTIFICATION_EMAIL', 'NEXT_PUBLIC_WHATSAPP_NUMBER']

function tableRows(section: string): string[][] {
  return section
    .split('\n')
    .filter((line) => /^\|/.test(line) && !/^\|\s*---/.test(line))
    .map((line) =>
      line
        .split('|')
        .map((c) => c.trim().replace(/^`|`$/g, ''))
        .filter((c) => c.length > 0),
    )
    .filter((cells) => cells[0] !== 'Artifact' && cells[0] !== 'Variable')
}

function extractSection(audit: string, heading: string, nextHeading: string): string {
  const start = audit.indexOf(heading)
  expect(start).toBeGreaterThanOrEqual(0)
  const end = nextHeading ? audit.indexOf(nextHeading, start + heading.length) : -1
  return audit.slice(start, end === -1 ? undefined : end)
}

describe('AC-14.2: PIVOT_AUDIT.md names superseded artifacts and orphaned config', () => {
  it('PIVOT_AUDIT.md exists at the repo root', () => {
    expect(fs.existsSync(path.join(root, 'PIVOT_AUDIT.md'))).toBe(true)
  })

  const audit = read('PIVOT_AUDIT.md')

  const artifactsSection = extractSection(
    audit,
    '## Superseded artifacts (AC-14.2)',
    '## Orphaned configuration (AC-14.2)',
  )
  const envSection = extractSection(audit, '## Orphaned configuration (AC-14.2)', '')

  describe('superseded-artifacts table', () => {
    it.each(SUPERSEDED_ARTIFACTS)('names %s', (artifact) => {
      expect(artifactsSection).toContain(artifact)
    })

    it('every named artifact row carries one of the three allowed dispositions', () => {
      for (const artifact of SUPERSEDED_ARTIFACTS) {
        const lineStart = artifactsSection.indexOf(artifact)
        const lineEnd = artifactsSection.indexOf('\n', lineStart)
        const line = artifactsSection.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
        const hasDisposition = VALID_ARTIFACT_DISPOSITIONS.some((d) => line.includes(d))
        expect(hasDisposition).toBe(true)
      }
    })

    it('does not use any disposition label outside the three allowed values', () => {
      const rows = tableRows(artifactsSection).filter((cells) => cells.length === 4)
      expect(rows.length).toBeGreaterThanOrEqual(SUPERSEDED_ARTIFACTS.length)
      for (const cells of rows) {
        const [, , disposition] = cells
        expect(VALID_ARTIFACT_DISPOSITIONS).toContain(disposition)
      }
    })

    it('names the four PicPeak-facing artifact categories exactly once each', () => {
      for (const artifact of SUPERSEDED_ARTIFACTS) {
        const escaped = artifact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const occurrences = artifactsSection.match(new RegExp(escaped, 'g')) ?? []
        expect(occurrences.length).toBe(1)
      }
    })
  })

  describe('orphaned-configuration table', () => {
    it.each(ORPHANED_ENV_VARS)('lists %s', (key) => {
      expect(envSection).toContain(key)
    })

    it('every orphaned var row carries one of the two allowed dispositions', () => {
      for (const key of ORPHANED_ENV_VARS) {
        const lineStart = envSection.indexOf(key)
        const lineEnd = envSection.indexOf('\n', lineStart)
        const line = envSection.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
        const hasDisposition = VALID_ENV_DISPOSITIONS.some((d) => line.includes(d))
        expect(hasDisposition).toBe(true)
      }
    })

    it('does not use any env-var disposition label outside Removed/Retained', () => {
      const rows = tableRows(envSection).filter((cells) => cells.length === 5 && ORPHANED_ENV_VARS.includes(cells[0]))
      expect(rows.length).toBe(ORPHANED_ENV_VARS.length)
      for (const cells of rows) {
        const disposition = cells[3]
        expect(VALID_ENV_DISPOSITIONS).toContain(disposition)
      }
    })
  })

  describe('consistency with the repo and other locked-in ACs', () => {
    it('every artifact location cited in the audit exists in the repo', () => {
      // src/collections/Galleries.ts is deliberately excluded: US-28
      // AC-28.1.1 deleted it, so its disposition above is now "Deleted
      // now" rather than "Left dormant" — the cited location documents
      // where the artifact used to live, not a still-existing path.
      const citedPaths = ['src/collections/Media.ts', 'src/payload.config.ts', 'src/components/gallery/']
      for (const p of citedPaths) {
        expect(fs.existsSync(path.join(root, p))).toBe(true)
      }
    })

    it('vars marked Retained still exist in .env.example (disposition matches reality)', () => {
      const envExample = read('.env.example')
      const retainedRows = tableRows(envSection).filter(
        (cells) => cells.length === 5 && ORPHANED_ENV_VARS.includes(cells[0]) && cells[3] === 'Retained',
      )
      for (const [key] of retainedRows) {
        expect(envExample).toMatch(new RegExp(`^${key}=`, 'm'))
      }
    })

    it('vars marked Removed no longer exist in .env.example (disposition matches reality)', () => {
      const envExample = read('.env.example')
      const removedRows = tableRows(envSection).filter(
        (cells) => cells.length === 5 && ORPHANED_ENV_VARS.includes(cells[0]) && cells[3] === 'Removed',
      )
      for (const [key] of removedRows) {
        expect(envExample).not.toMatch(new RegExp(`^${key}=`, 'm'))
      }
    })
  })
})
