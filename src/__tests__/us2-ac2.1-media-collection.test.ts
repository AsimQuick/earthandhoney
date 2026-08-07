/**
 * ---
 * file: src/__tests__/us2-ac2.1-media-collection.test.ts
 * project: earthandhoney
 * purpose: Verify AC-2.1 — a Payload 'Media' collection exists storing original
 *          file reference, alt text, and metadata
 * created-by: dev-team
 * related-story: US-2
 * related-ac: 2.1
 * updated-by: dev-team
 * related-story: US-28
 * related-ac: 28.1.2
 * ---
 */
import fs from 'fs'
import path from 'path'

import { Media } from '@/collections/Media'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const PAYLOAD_CONFIG = 'src/payload.config.ts'

describe('AC-2.1: Media collection stores file reference, alt text, and metadata in Payload', () => {
  describe('a Payload "Media" collection exists', () => {
    it('has slug "media"', () => {
      expect(Media.slug).toBe('media')
    })

    it('is an upload-enabled collection (original file reference + auto metadata)', () => {
      // Payload upload collections automatically persist filename, mimeType,
      // filesize, width and height alongside the record — this is the
      // "metadata" half of the AC; no hand-rolled fields are needed for it.
      expect(Media.upload).toBeTruthy()
    })

    it('exposes an alt text field for accessibility/SEO', () => {
      const fieldNames = Media.fields.map((field) => ('name' in field ? field.name : undefined))
      expect(fieldNames).toContain('alt')
    })
  })

  describe('the Media collection is registered with Payload', () => {
    const src = read(PAYLOAD_CONFIG)

    it('imports and registers the Media collection', () => {
      expect(src).toMatch(/from ['"]\.\/collections\/Media['"]/)
      expect(src).toMatch(/collections:\s*\[[^\]]*Media/)
    })
  })

  // The Payload-side S3 storage adapter that used to wire Media uploads to
  // Cloudflare R2 was retired by AC-28.1.2 (US-28) — binary delivery is owned
  // by the PicPeak fork; see the System Ownership table in CLAUDE.md.

  it('no source file hardcodes a live-looking R2/S3 access key or secret', () => {
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.next') continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !full.includes('__tests__')) {
          const contents = fs.readFileSync(full, 'utf8')
          if (/accessKeyId:\s*['"][^'"]+['"]/.test(contents) || /secretAccessKey:\s*['"][^'"]+['"]/.test(contents)) {
            offenders.push(full)
          }
        }
      }
    }
    walk(path.join(root, 'src'))
    expect(offenders).toEqual([])
  })
})
