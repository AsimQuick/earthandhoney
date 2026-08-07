/**
 * ---
 * file: src/__tests__/us28-ac28.1-pivot-artifact-removal.test.ts
 * project: earthandhoney
 * purpose: The single consolidated guard AC-28.1 asks for, written once
 *          AC-28.1.1 (Payload `Galleries` collection) and AC-28.1.2 (the
 *          Payload-owned Sharp derivative pipeline and R2 upload path) have
 *          both landed. Asserts all three removals hold together — no
 *          Galleries collection exposed by the admin, no `imageSizes` on
 *          Media, and no second R2 writer anywhere under `src/` — plus the
 *          fourth superseded-artifacts row (the gallery viewer components)
 *          survives, and PIVOT_AUDIT.md records the three removals as
 *          actually deleted, naming US-28 as the story that did it.
 * created-by: dev-team
 * related-story: US-28
 * related-ac: 28.1.1
 * updated-by: dev-team
 * related-story: US-28
 * related-ac: 28.1.2
 * updated-by: dev-team
 * related-story: US-28
 * related-ac: 28.1.3
 * ---
 */
import fs from 'fs'
import path from 'path'

import type { UploadConfig } from 'payload'

import { Media } from '@/collections/Media'

const root = process.cwd()
const readRaw = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

// The removal below is deliberately annotated in-place with comments that
// name what was removed and why (PIVOT_AUDIT.md row references), so a future
// reader does not reintroduce it. Those comments necessarily *mention*
// `galleries` / `imageSizes` / `s3Storage` — an absence assertion run against
// raw source text would therefore fail on the very documentation that
// records the removal. Every "is gone" assertion is run against
// comment-stripped source so it tests the code, not the prose; string
// literals are left intact since a reintroduced wiring would live in one.
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

describe('AC-28.1.2: Media declares no imageSizes while remaining upload-enabled', () => {
  it('Media.upload no longer defines imageSizes', () => {
    const upload = Media.upload as UploadConfig | true
    expect(typeof upload === 'object' ? upload.imageSizes : undefined).toBeUndefined()
  })

  it('Media stays an upload-enabled collection', () => {
    expect(Media.upload).toBeTruthy()
  })

  it('src/collections/Media.ts source no longer references imageSizes', () => {
    expect(read('src/collections/Media.ts')).not.toMatch(/imageSizes/)
  })
})

describe('AC-28.1.2: no second R2 writer remains anywhere under src/', () => {
  it('package.json no longer lists @payloadcms/storage-s3', () => {
    const pkg = JSON.parse(readRaw('package.json'))
    expect(pkg.dependencies).not.toHaveProperty('@payloadcms/storage-s3')
    expect(pkg.devDependencies ?? {}).not.toHaveProperty('@payloadcms/storage-s3')
  })

  it('no file under src/ outside __tests__/ imports @payloadcms/storage-s3 or calls s3Storage(', () => {
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name === '__tests__') continue
          walk(full)
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          const contents = stripComments(fs.readFileSync(full, 'utf8'))
          if (/@payloadcms\/storage-s3/.test(contents) || /s3Storage\(/.test(contents)) {
            offenders.push(path.relative(root, full))
          }
        }
      }
    }
    walk(path.join(root, 'src'))
    expect(offenders).toEqual([])
  })
})

describe('AC-28.1: the fourth superseded-artifacts row — gallery viewer components — is kept, not removed', () => {
  it('src/components/gallery/ still exists with its renderer components', () => {
    expect(exists('src/components/gallery/')).toBe(true)
    expect(exists('src/components/gallery/GalleryEngine.tsx')).toBe(true)
    expect(exists('src/components/gallery/payloadGalleryMapper.ts')).toBe(true)
  })
})

describe('AC-28.1: PIVOT_AUDIT.md records all three artifacts as actually deleted, naming US-28', () => {
  // Markdown, not source — read raw; comment-stripping is a TypeScript concern.
  const audit = readRaw('PIVOT_AUDIT.md')
  const artifactsSection = audit.slice(
    audit.indexOf('## Superseded artifacts (AC-14.2)'),
    audit.indexOf('## Orphaned configuration (AC-14.2)'),
  )

  it.each([
    'Payload `Galleries` collection',
    'Payload-owned Sharp derivative pipeline',
    'Payload-owned R2 upload path',
  ])('%s is marked "Deleted now" and cites US-28 as the removing story', (artifact) => {
    const lineStart = artifactsSection.indexOf(artifact)
    expect(lineStart).toBeGreaterThanOrEqual(0)
    const lineEnd = artifactsSection.indexOf('\n', lineStart)
    const line = artifactsSection.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
    expect(line).toContain('Deleted now')
    expect(line).toContain('US-28')
  })

  it('the in-repo gallery viewer components row still reads "Kept as a Frontstage renderer"', () => {
    const lineStart = artifactsSection.indexOf('In-repo gallery viewer components')
    expect(lineStart).toBeGreaterThanOrEqual(0)
    const lineEnd = artifactsSection.indexOf('\n', lineStart)
    const line = artifactsSection.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
    expect(line).toContain('Kept as a Frontstage renderer')
  })
})
