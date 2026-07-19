/**
 * ---
 * file: src/__tests__/us2-ac2.1-media-collection.test.ts
 * project: earthandhoney
 * purpose: Verify AC-2.1 — a Payload 'Media' collection exists storing original
 *          file reference, alt text, and metadata; relationships/metadata live
 *          in Payload while binary files live in Cloudflare R2 (not in Postgres
 *          or the local filesystem in production)
 * created-by: dev-team
 * related-story: US-2
 * related-ac: 2.1
 * ---
 */
import fs from 'fs'
import path from 'path'

import { Media } from '@/collections/Media'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const PAYLOAD_CONFIG = 'src/payload.config.ts'

describe('AC-2.1: Media collection stores file reference, alt text, and metadata in Payload; binaries live in R2', () => {
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

  describe('binary files are persisted to Cloudflare R2, not Postgres or the local filesystem', () => {
    const src = read(PAYLOAD_CONFIG)

    it('wires the S3-compatible storage adapter as a Payload plugin', () => {
      expect(src).toMatch(/from ['"]@payloadcms\/storage-s3['"]/)
      expect(src).toMatch(/s3Storage\(/)
    })

    it('applies the storage adapter to the "media" collection specifically', () => {
      const pluginBlock = src.match(/s3Storage\(\{[\s\S]*?\n\}\)/)?.[0]
      expect(pluginBlock).toBeDefined()
      expect(pluginBlock).toMatch(/collections:\s*\{\s*media:\s*true/)
    })

    it('points the R2-compatible S3 client at env-configured credentials and endpoint (not hardcoded values)', () => {
      const pluginBlock = src.match(/s3Storage\(\{[\s\S]*?\n\}\)/)?.[0]
      expect(pluginBlock).toBeDefined()
      expect(pluginBlock).toMatch(/bucket:\s*process\.env\.R2_BUCKET/)
      expect(pluginBlock).toMatch(/endpoint:\s*process\.env\.R2_ENDPOINT/)
      expect(pluginBlock).toMatch(/accessKeyId:\s*process\.env\.R2_ACCESS_KEY_ID/)
      expect(pluginBlock).toMatch(/secretAccessKey:\s*process\.env\.R2_SECRET_ACCESS_KEY/)
    })

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

  describe('R2 credentials required by the Media storage adapter are documented', () => {
    it('.env.example documents every var the adapter reads', () => {
      const envExample = read('.env.example')
      for (const key of ['R2_BUCKET', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) {
        expect(envExample).toMatch(new RegExp(`^${key}=.+$`, 'm'))
      }
    })
  })
})
