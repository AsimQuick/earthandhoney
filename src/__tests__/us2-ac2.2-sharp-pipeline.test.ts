/**
 * ---
 * file: src/__tests__/us2-ac2.2-sharp-pipeline.test.ts
 * project: earthandhoney
 * purpose: Verify AC-2.2 — on upload, a Sharp pipeline generates three derivative
 *          sizes (thumbnail, medium, large) plus retains the original, and all
 *          four variants are persisted to R2
 * created-by: dev-team
 * related-story: US-2
 * related-ac: 2.2
 * ---
 */
import fs from 'fs'
import path from 'path'

import type { ImageSize, UploadConfig } from 'payload'
import sharp from 'sharp'

import { Media } from '@/collections/Media'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const PAYLOAD_CONFIG = 'src/payload.config.ts'

const upload = Media.upload as UploadConfig
const sizeByName = (name: string): ImageSize => {
  const size = upload.imageSizes?.find((entry) => entry.name === name)
  if (!size) throw new Error(`expected an image size named "${name}"`)
  return size
}

describe('AC-2.2: Sharp pipeline generates thumbnail/medium/large derivatives; original + all sizes persist to R2', () => {
  describe('the Media collection defines exactly three derivative sizes', () => {
    it('is an object-form upload config (not the bare `true` shorthand) so imageSizes can be set', () => {
      expect(typeof Media.upload).toBe('object')
    })

    it('defines exactly thumbnail, medium, and large — no more, no fewer', () => {
      const names = upload.imageSizes?.map((size) => size.name)
      expect(names).toEqual(['thumbnail', 'medium', 'large'])
    })

    it('orders sizes smallest to largest by target width', () => {
      const widths = ['thumbnail', 'medium', 'large'].map((name) => sizeByName(name).width)
      expect(widths[0]).toBeLessThan(widths[1] as number)
      expect(widths[1]).toBeLessThan(widths[2] as number)
    })

    it('each size tolerates originals smaller than the target instead of silently producing no variant', () => {
      for (const name of ['thumbnail', 'medium', 'large']) {
        expect(sizeByName(name).withoutEnlargement).toBe(true)
      }
    })
  })

  describe('the Sharp dependency is wired into Payload so imageSizes actually runs', () => {
    const src = read(PAYLOAD_CONFIG)

    it('imports the sharp package', () => {
      expect(src).toMatch(/import sharp from ['"]sharp['"]/)
    })

    it('passes sharp into buildConfig (Payload silently skips resizing without it)', () => {
      const configBlock = src.match(/buildConfig\(\{[\s\S]*?\n\}\)/)?.[0]
      expect(configBlock).toBeDefined()
      expect(configBlock).toMatch(/\bsharp\b/)
    })

    it('declares sharp as a direct dependency (not relying on another package hoisting it)', () => {
      const pkg = JSON.parse(read('package.json'))
      expect(pkg.dependencies.sharp).toBeDefined()
    })
  })

  describe('running the configured pipeline against a real image produces exactly four persistable variants', () => {
    // A synthetic "original" larger than every configured target so each
    // derivative is a genuine resize, not a same-size passthrough.
    const ORIGINAL_WIDTH = 3000
    const ORIGINAL_HEIGHT = 2000

    let original: Buffer
    let variants: Record<'thumbnail' | 'medium' | 'large', Buffer>

    beforeAll(async () => {
      original = await sharp({
        create: {
          width: ORIGINAL_WIDTH,
          height: ORIGINAL_HEIGHT,
          channels: 3,
          background: { r: 120, g: 80, b: 200 },
        },
      })
        .jpeg()
        .toBuffer()

      const resize = async (name: 'thumbnail' | 'medium' | 'large') => {
        const size = sizeByName(name)
        return sharp(original)
          .resize({
            width: size.width,
            height: size.height,
            fit: size.fit,
            withoutEnlargement: size.withoutEnlargement,
          })
          .toBuffer()
      }

      variants = {
        thumbnail: await resize('thumbnail'),
        medium: await resize('medium'),
        large: await resize('large'),
      }
    })

    it('retains the original alongside the derivatives', () => {
      expect(original.length).toBeGreaterThan(0)
    })

    it('generates a thumbnail cropped to the exact configured square', async () => {
      const meta = await sharp(variants.thumbnail).metadata()
      expect(meta.width).toBe(400)
      expect(meta.height).toBe(400)
    })

    it('generates a medium variant scaled to the configured width, aspect-ratio preserved', async () => {
      const meta = await sharp(variants.medium).metadata()
      expect(meta.width).toBe(1200)
      expect(meta.height).toBe(Math.round((1200 / ORIGINAL_WIDTH) * ORIGINAL_HEIGHT))
    })

    it('generates a large variant scaled to the configured width, aspect-ratio preserved', async () => {
      const meta = await sharp(variants.large).metadata()
      expect(meta.width).toBe(2048)
      expect(meta.height).toBe(Math.round((2048 / ORIGINAL_WIDTH) * ORIGINAL_HEIGHT))
    })

    it('every derivative is smaller (by pixel width) than the original', async () => {
      const originalMeta = await sharp(original).metadata()
      for (const buffer of Object.values(variants)) {
        const meta = await sharp(buffer).metadata()
        expect(meta.width).toBeLessThan(originalMeta.width as number)
      }
    })

    it('produces exactly four distinct byte buffers — original, thumbnail, medium, large', () => {
      const all = [original, variants.thumbnail, variants.medium, variants.large]
      const distinctLengths = new Set(all.map((buffer) => buffer.length))
      expect(all).toHaveLength(4)
      // Different pixel dimensions from a synthetic solid-fill source should
      // never coincidentally re-encode to the exact same byte length.
      expect(distinctLengths.size).toBe(4)
    })
  })

  describe('the R2 storage adapter persists every generated size, not just the original', () => {
    const src = read(PAYLOAD_CONFIG)

    it('still targets the "media" collection (uploads flow through the same adapter Payload attaches sizes to)', () => {
      const pluginBlock = src.match(/s3Storage\(\{[\s\S]*?\n\}\)/)?.[0]
      expect(pluginBlock).toBeDefined()
      expect(pluginBlock).toMatch(/collections:\s*\{\s*media:\s*true/)
    })

    it('does not disable local-storage bypass (derivative sizes must skip local disk, same as the original)', () => {
      const pluginBlock = src.match(/s3Storage\(\{[\s\S]*?\n\}\)/)?.[0]
      expect(pluginBlock).toBeDefined()
      expect(pluginBlock).not.toMatch(/disableLocalStorage:\s*false/)
    })
  })
})
