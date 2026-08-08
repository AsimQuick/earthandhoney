/**
 * ---
 * file: src/__tests__/us28-ac28.1.2-retire-sharp-r2-upload-path.test.ts
 * project: earthandhoney
 * purpose: Verify AC-28.1.2 — the second and third of PIVOT_AUDIT.md's three
 *          superseded artifacts marked "Left dormant" are removed together:
 *          the Payload-owned Sharp derivative pipeline (`upload.imageSizes`
 *          in src/collections/Media.ts) and the Payload-owned R2 upload path
 *          (`s3Storage` wiring in src/payload.config.ts, and its
 *          `@payloadcms/storage-s3` dependency). Media stays an
 *          upload-enabled collection with its required `alt` field
 *          (US-2 AC-2.4). The fourth row — the gallery viewer components
 *          under src/components/gallery/ — is "Kept as a Frontstage
 *          renderer" and must not be removed.
 * created-by: dev-team
 * related-story: US-28
 * related-ac: 28.1.2
 * ---
 */
import fs from 'fs'
import path from 'path'

import type { UploadConfig } from 'payload'

import { Media } from '@/collections/Media'

const root = process.cwd()
const readRaw = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

// Removal comments necessarily mention `s3Storage`/`imageSizes` — strip
// comments so "is gone" assertions test the code, not the prose that
// documents its removal (mirrors us28-ac28.1-pivot-artifact-removal.test.ts).
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
const read = (rel: string) => stripComments(readRaw(rel))

const PAYLOAD_CONFIG = 'src/payload.config.ts'

describe('AC-28.1.2: the Payload-owned Sharp derivative pipeline is removed', () => {
  it('Media.upload no longer defines imageSizes', () => {
    const upload = Media.upload as UploadConfig | true
    expect(typeof upload === 'object' ? upload.imageSizes : undefined).toBeUndefined()
  })

  it('Media stays an upload-enabled collection', () => {
    expect(Media.upload).toBeTruthy()
  })

  it('Media keeps its required alt field (US-2 AC-2.4)', () => {
    const altField = Media.fields.find((field) => 'name' in field && field.name === 'alt')
    expect(altField).toBeDefined()
    expect((altField as { required?: boolean }).required).toBe(true)
  })

  it('src/collections/Media.ts source no longer references imageSizes', () => {
    expect(read('src/collections/Media.ts')).not.toMatch(/imageSizes/)
  })
})

describe('AC-28.1.2: the Payload-owned R2 upload path is removed', () => {
  const src = read(PAYLOAD_CONFIG)

  it('payload.config.ts no longer imports @payloadcms/storage-s3', () => {
    expect(src).not.toMatch(/@payloadcms\/storage-s3/)
  })

  it('payload.config.ts no longer calls s3Storage(...)', () => {
    expect(src).not.toMatch(/s3Storage\(/)
  })

  it('payload.config.ts no longer declares a plugins array', () => {
    expect(src).not.toMatch(/plugins:\s*\[/)
  })

  it('payload.config.ts no longer imports the top-level sharp package (it existed solely to power imageSizes)', () => {
    expect(src).not.toMatch(/from ['"]sharp['"]/)
    expect(src).not.toMatch(/\bsharp\b/)
  })

  it('@payloadcms/storage-s3 is dropped from package.json dependencies', () => {
    const pkg = JSON.parse(readRaw('package.json'))
    expect(pkg.dependencies).not.toHaveProperty('@payloadcms/storage-s3')
  })

  it('@payloadcms/storage-s3 is dropped from the regenerated lockfile', () => {
    expect(readRaw('package-lock.json')).not.toMatch(/@payloadcms\/storage-s3/)
  })

  it('no second R2 writer remains anywhere under src/ (no s3Storage usage outside removed test/audit prose)', () => {
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name === '__tests__') continue
          walk(full)
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          const contents = fs.readFileSync(full, 'utf8')
          if (/s3Storage\(/.test(contents)) {
            offenders.push(full)
          }
        }
      }
    }
    walk(path.join(root, 'src'))
    expect(offenders).toEqual([])
  })
})

describe('AC-28.1.2: R2_* env vars are untouched — only the Payload-side consumer is going away (AC-28.4)', () => {
  it('.env.example still documents every R2_* var', () => {
    const envExample = readRaw('.env.example')
    for (const key of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_ENDPOINT']) {
      expect(envExample).toMatch(new RegExp(`^${key}=.+$`, 'm'))
    }
  })
})

describe('AC-28.1.2: the fourth superseded-artifacts row — gallery viewer components — is kept, not removed', () => {
  it('the Frontstage renderer still reads the thumbnail/medium/large tiers', () => {
    expect(exists('src/components/gallery/payloadGalleryMapper.ts')).toBe(true)
    expect(exists('src/components/gallery/galleryImageLoader.ts')).toBe(true)
    const loader = readRaw('src/components/gallery/galleryImageLoader.ts')
    expect(loader).toMatch(/thumbnail/)
    expect(loader).toMatch(/medium/)
    expect(loader).toMatch(/large/)
  })
})

describe('AC-28.1.2: PIVOT_AUDIT.md records both artifacts as actually deleted, not merely dormant', () => {
  const audit = readRaw('PIVOT_AUDIT.md')
  const artifactsSection = audit.slice(
    audit.indexOf('## Superseded artifacts (AC-14.2)'),
    audit.indexOf('## Orphaned configuration (AC-14.2)'),
  )

  it.each(['Payload-owned Sharp derivative pipeline', 'Payload-owned R2 upload path'])(
    '%s is marked "Deleted now"',
    (artifact) => {
      const lineStart = artifactsSection.indexOf(artifact)
      expect(lineStart).toBeGreaterThanOrEqual(0)
      const lineEnd = artifactsSection.indexOf('\n', lineStart)
      const line = artifactsSection.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
      expect(line).toContain('Deleted now')
    },
  )
})
