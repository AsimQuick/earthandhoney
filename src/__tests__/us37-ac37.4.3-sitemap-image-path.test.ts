/**
 * ---
 * file: src/__tests__/us37-ac37.4.3-sitemap-image-path.test.ts
 * project: earthandhoney
 * purpose: Verify AC-37.4.3's URL-correctness rule directly, at the one place
 *          it lives — src/lib/sitemapImagePath.ts. The AC fixes each
 *          `<image:loc>` to the Backstage-relative
 *          `/api/gallery/:slug/(thumbnail|hero|photo|preview)/:photoId` path,
 *          "so no new delivery path, proxy or storage URL is introduced here";
 *          these cases pin exactly that, including the case the LIVE companion
 *          suite cannot reach because it seeds a default-protection gallery:
 *          vendor/picpeak/backend/src/routes/gallery.js emits the
 *          `/api/secure-images/:slug/secure/:photoId/{{token}}` *template* as
 *          `url` for an `enhanced`/`maximum` protection level, and that
 *          unexpanded placeholder must never reach the sitemap. The helper is
 *          import-free at runtime, so unlike src/lib/getSitemapEntries.ts
 *          (which pulls in the ESM-only `payload` — see
 *          us3-ac3.5-galleries-api-read.test.ts) it is exercised here by real
 *          call, not by reading its source text.
 *          The accepted tier list is additionally cross-checked against
 *          next.config.ts's own rewrite source, so the two can never drift into
 *          the sitemap advertising a path this origin does not actually proxy.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.4.3
 * ---
 */
import fs from 'fs'
import path from 'path'

import type { GalleryImage } from '@/components/gallery/types'
import { PUBLIC_BACKSTAGE_IMAGE_PATH, sitemapImagePath } from '@/lib/sitemapImagePath'

/** A mapped Flow A photo (src/components/gallery/backstageGalleryMapper.ts's output shape). */
function image(overrides: Partial<GalleryImage> = {}): GalleryImage {
  return { id: '42', url: '/api/gallery/a-real-wedding/photo/42', alt: 'IMG_0042.jpg', ...overrides }
}

/** gallery.js's non-JWT `url` form for an enhanced/maximum protection level. */
const SECURE_TEMPLATE = '/api/secure-images/a-real-wedding/secure/42/{{token}}'

describe('AC-37.4.3: each <image:loc> is the photo\'s public Backstage gallery path, never another delivery path', () => {
  it('uses the full `photo` tier when gallery.js served it as a gallery path', () => {
    expect(sitemapImagePath(image())).toBe('/api/gallery/a-real-wedding/photo/42')
  })

  it('preserves gallery.js\'s ?wm= watermark cache-busting query rather than stripping it', () => {
    const withWatermark = '/api/gallery/a-real-wedding/photo/42?wm=50bottom-rightmedium'
    expect(sitemapImagePath(image({ url: withWatermark }))).toBe(withWatermark)
  })

  it('accepts all four tiers the AC-29.2.2.1 rewrite proxies', () => {
    for (const kind of ['thumbnail', 'hero', 'photo', 'preview']) {
      const url = `/api/gallery/a-real-wedding/${kind}/42`
      expect(sitemapImagePath(image({ url }))).toBe(url)
    }
  })

  it('never emits gallery.js\'s /api/secure-images/…/{{token}} template — it falls back to the hero tier instead', () => {
    const resolved = sitemapImagePath(
      image({ url: SECURE_TEMPLATE, largeUrl: '/api/gallery/a-real-wedding/hero/42' }),
    )
    expect(resolved).toBe('/api/gallery/a-real-wedding/hero/42')
    expect(resolved).not.toContain('{{token}}')
    expect(resolved).not.toContain('secure-images')
  })

  it('falls back through preview then thumbnail when neither the photo nor the hero tier is public', () => {
    expect(
      sitemapImagePath(image({ url: SECURE_TEMPLATE, mediumUrl: '/api/gallery/g/preview/7' })),
    ).toBe('/api/gallery/g/preview/7')

    expect(
      sitemapImagePath(image({ url: SECURE_TEMPLATE, thumbnailUrl: '/api/gallery/g/thumbnail/7' })),
    ).toBe('/api/gallery/g/thumbnail/7')
  })

  it('prefers the widest available tier — the full photo over hero, preview and thumbnail', () => {
    expect(
      sitemapImagePath(
        image({
          url: '/api/gallery/g/photo/7',
          largeUrl: '/api/gallery/g/hero/7',
          mediumUrl: '/api/gallery/g/preview/7',
          thumbnailUrl: '/api/gallery/g/thumbnail/7',
        }),
      ),
    ).toBe('/api/gallery/g/photo/7')
  })

  it('yields no reference at all when no tier is publicly resolvable — a broken <image:loc> is worse than none', () => {
    expect(sitemapImagePath(image({ url: SECURE_TEMPLATE }))).toBeUndefined()
    // backstageGalleryMapper.ts's defensive empty-string default for a row
    // missing `url`, and its `null` -> undefined tiers.
    expect(sitemapImagePath(image({ url: '', thumbnailUrl: undefined }))).toBeUndefined()
  })

  it('introduces no new storage or proxy URL — absolute, R2 and foreign-origin candidates are rejected', () => {
    for (const url of [
      'https://cdn.example.com/api/gallery/g/photo/7',
      'http://backstage-backend:3000/api/gallery/g/photo/7',
      '//backstage-backend/api/gallery/g/photo/7',
      'https://r2.example.com/originals/7.jpg',
      '/media/7.jpg',
    ]) {
      expect(sitemapImagePath(image({ url }))).toBeUndefined()
    }
  })

  it('rejects a tier the rewrite does not proxy, and any path that is not exactly slug/kind/photoId', () => {
    for (const url of [
      '/api/gallery/g/original/7',
      '/api/gallery/g/download/7',
      '/api/gallery/g/photo',
      '/api/gallery/g/photo/7/extra',
      '/api/gallery//photo/7',
      '/api/gallery/g/photo/7#frag',
    ]) {
      expect(sitemapImagePath(image({ url }))).toBeUndefined()
    }
  })

  it('accepts exactly the tier list next.config.ts\'s rewrite actually proxies — the two cannot drift', () => {
    const config = fs.readFileSync(path.join(process.cwd(), 'next.config.ts'), 'utf8')
    const rewriteMatch = config.match(/source:\s*"\/api\/gallery\/:slug\/:kind\(([^)]+)\)\/:photoId"/)
    expect(rewriteMatch).not.toBeNull()

    const proxiedKinds = rewriteMatch![1].split('|')
    for (const kind of proxiedKinds) {
      expect(PUBLIC_BACKSTAGE_IMAGE_PATH.test(`/api/gallery/g/${kind}/7`)).toBe(true)
    }
    // …and nothing beyond them.
    expect(proxiedKinds.sort()).toEqual(['hero', 'photo', 'preview', 'thumbnail'])
  })
})
