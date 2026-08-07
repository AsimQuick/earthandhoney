/**
 * ---
 * file: src/__tests__/us28-ac28.1-pivot-artifact-removal.test.ts
 * project: earthandhoney
 * purpose: Verify AC-28.1.1 — the first of PIVOT_AUDIT.md's three
 *          superseded artifacts marked "Left dormant" is removed: the
 *          Payload `Galleries` collection is no longer exposed by the admin.
 *          AC-28.1.2 (also verified here) then removes the other two —
 *          the Payload-owned Sharp derivative pipeline and the Payload-owned
 *          R2 upload path, together, since both are the same Payload-owned
 *          Media upload path living in the same two files. The fourth
 *          superseded-artifacts row — the gallery viewer components under
 *          src/components/gallery/ — is "Kept as a Frontstage renderer" and
 *          must not be removed, so this test also asserts its survival.
 * created-by: dev-team
 * related-story: US-28
 * related-ac: 28.1.1
 * updated-by: dev-team
 * related-story: US-28
 * related-ac: 28.1.2
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const readRaw = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

// The removal below is deliberately annotated in-place with comments that
// name what was removed and why (PIVOT_AUDIT.md row references), so a future
// reader does not reintroduce it. Those comments necessarily *mention*
// `galleries` — an absence assertion run against raw source text would
// therefore fail on the very documentation that records the removal. Every
// "is gone" assertion is run against comment-stripped source so it tests the
// code, not the prose; string literals are left intact since a reintroduced
// wiring would live in one.
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')

const read = (rel: string) => stripComments(readRaw(rel))

const PAYLOAD_CONFIG = 'src/payload.config.ts'

describe('AC-28.1.1: the Payload Galleries collection is removed — no longer exposed by the admin', () => {
  it('src/collections/Galleries.ts no longer exists', () => {
    expect(exists('src/collections/Galleries.ts')).toBe(false)
  })

  it('payload.config.ts no longer imports or registers a Galleries collection', () => {
    const src = read(PAYLOAD_CONFIG)
    expect(src).not.toMatch(/from ['"]\.\/collections\/Galleries['"]/)
    expect(src).not.toMatch(/collections:\s*\[[^\]]*\bGalleries\b/)
  })

  it('payload.config.ts registers no collection with the "galleries" slug', () => {
    const src = read(PAYLOAD_CONFIG)
    expect(src).not.toMatch(/collections:\s*\[[^\]]*\bgalleries\b/)
  })
})

describe('AC-28.1.1: the fourth superseded-artifacts row — gallery viewer components — is kept, not removed', () => {
  it('src/components/gallery/ still exists with its renderer components', () => {
    expect(exists('src/components/gallery/')).toBe(true)
    expect(exists('src/components/gallery/GalleryEngine.tsx')).toBe(true)
    expect(exists('src/components/gallery/payloadGalleryMapper.ts')).toBe(true)
  })
})

describe('AC-28.1.1: PIVOT_AUDIT.md records the Galleries collection as actually deleted, not merely dormant', () => {
  // Markdown, not source — read raw; comment-stripping is a TypeScript concern.
  const audit = readRaw('PIVOT_AUDIT.md')
  const artifactsSection = audit.slice(
    audit.indexOf('## Superseded artifacts (AC-14.2)'),
    audit.indexOf('## Orphaned configuration (AC-14.2)'),
  )

  it('Payload `Galleries` collection is now marked "Deleted now"', () => {
    const lineStart = artifactsSection.indexOf('Payload `Galleries` collection')
    expect(lineStart).toBeGreaterThanOrEqual(0)
    const lineEnd = artifactsSection.indexOf('\n', lineStart)
    const line = artifactsSection.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
    expect(line).toContain('Deleted now')
  })

  it.each(['Payload-owned Sharp derivative pipeline', 'Payload-owned R2 upload path'])(
    '%s is now marked "Deleted now" — removed together by AC-28.1.2',
    (artifact) => {
      const lineStart = artifactsSection.indexOf(artifact)
      expect(lineStart).toBeGreaterThanOrEqual(0)
      const lineEnd = artifactsSection.indexOf('\n', lineStart)
      const line = artifactsSection.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
      expect(line).toContain('Deleted now')
    },
  )

  it('the in-repo gallery viewer components row still reads "Kept as a Frontstage renderer"', () => {
    const lineStart = artifactsSection.indexOf('In-repo gallery viewer components')
    expect(lineStart).toBeGreaterThanOrEqual(0)
    const lineEnd = artifactsSection.indexOf('\n', lineStart)
    const line = artifactsSection.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
    expect(line).toContain('Kept as a Frontstage renderer')
  })
})
