/**
 * ---
 * file: src/__tests__/us25-ac25.3-backstage-gallery-mapper.test.ts
 * project: earthandhoney
 * purpose: Verify AC-25.3 — backstageGalleryMapper maps a Backstage
 *          `GET /api/gallery/:slug/photos` response into the exact
 *          GalleryImage[] shape the existing, unchanged Gallery Engine
 *          components already render, taking the place of
 *          payloadGalleryMapper.ts as the data source; and that
 *          src/components/gallery/ carries no second gallery-rendering
 *          component set — only PIVOT_AUDIT.md's already-recorded "Kept as
 *          a Frontstage renderer" files plus this one new mapper.
 * created-by: dev-team
 * related-story: US-25
 * related-ac: 25.3
 * ---
 */
import fs from 'fs'
import path from 'path'

import { mapBackstageGalleryToImages } from '@/components/gallery/backstageGalleryMapper'
import type { GalleryPhotosResponse } from '@/lib/backstageClient'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

describe('AC-25.3: mapBackstageGalleryToImages — the Backstage→Gallery Engine data path', () => {
  it('maps a full photo row into GalleryImage, carrying id/url/tiers/dimensions through', () => {
    const response: GalleryPhotosResponse = {
      event: { event_name: 'Jordan & Casey Wedding' },
      photos: [
        {
          id: 42,
          filename: 'IMG_0042.jpg',
          url: '/api/gallery/jordan-casey/photo/42',
          thumbnail_url: '/api/gallery/jordan-casey/thumbnail/42',
          preview_url: '/api/gallery/jordan-casey/preview/42',
          hero_url: '/api/gallery/jordan-casey/hero/42',
          width: 4000,
          height: 3000,
        },
      ],
    }

    expect(mapBackstageGalleryToImages(response)).toEqual([
      {
        id: '42',
        url: '/api/gallery/jordan-casey/photo/42',
        alt: 'IMG_0042.jpg',
        thumbnailUrl: '/api/gallery/jordan-casey/thumbnail/42',
        mediumUrl: '/api/gallery/jordan-casey/preview/42',
        largeUrl: '/api/gallery/jordan-casey/hero/42',
        width: 4000,
        height: 3000,
      },
    ])
  })

  it('prefers original_filename over filename for alt text when both are present', () => {
    const response: GalleryPhotosResponse = {
      event: { event_name: 'Fallback Event' },
      photos: [
        { id: 1, filename: 'a1b2c3.jpg', original_filename: 'sunset-kiss.jpg', url: '/one.jpg', thumbnail_url: null },
      ],
    }

    expect(mapBackstageGalleryToImages(response)[0].alt).toBe('sunset-kiss.jpg')
  })

  it('falls back to filename, then to the gallery event_name, when original_filename is absent', () => {
    const withFilename: GalleryPhotosResponse = {
      event: { event_name: 'Fallback Event' },
      photos: [{ id: 1, filename: 'IMG_1.jpg', url: '/one.jpg', thumbnail_url: null }],
    }
    expect(mapBackstageGalleryToImages(withFilename)[0].alt).toBe('IMG_1.jpg')

    const withoutFilename: GalleryPhotosResponse = {
      event: { event_name: 'Fallback Event' },
      photos: [{ id: 1, filename: '', url: '/one.jpg', thumbnail_url: null }],
    }
    expect(mapBackstageGalleryToImages(withoutFilename)[0].alt).toBe('Fallback Event')
  })

  it('preserves photo order across multiple rows', () => {
    const response: GalleryPhotosResponse = {
      event: {},
      photos: [
        { id: 1, filename: 'one.jpg', url: '/one.jpg', thumbnail_url: null },
        { id: 2, filename: 'two.jpg', url: '/two.jpg', thumbnail_url: null },
        { id: 3, filename: 'three.jpg', url: '/three.jpg', thumbnail_url: null },
      ],
    }

    expect(mapBackstageGalleryToImages(response).map((image) => image.id)).toEqual(['1', '2', '3'])
  })

  it('falls back to an empty url string (never undefined) when a photo row has no url', () => {
    const response: GalleryPhotosResponse = {
      event: {},
      photos: [{ id: 7, filename: 'no-url.jpg', url: undefined as unknown as string, thumbnail_url: null }],
    }

    expect(mapBackstageGalleryToImages(response)[0].url).toBe('')
  })

  it('leaves thumbnail/medium/large tier URLs undefined when a photo row has none (null, not just missing)', () => {
    const response: GalleryPhotosResponse = {
      event: {},
      photos: [{ id: 1, filename: 'one.jpg', url: '/one.jpg', thumbnail_url: null }],
    }

    const [image] = mapBackstageGalleryToImages(response)
    expect(image.thumbnailUrl).toBeUndefined()
    expect(image.mediumUrl).toBeUndefined()
    expect(image.largeUrl).toBeUndefined()
  })

  it('leaves width/height undefined when a photo row has none', () => {
    const response: GalleryPhotosResponse = {
      event: {},
      photos: [{ id: 1, filename: 'one.jpg', url: '/one.jpg', thumbnail_url: null }],
    }

    const [image] = mapBackstageGalleryToImages(response)
    expect(image.width).toBeUndefined()
    expect(image.height).toBeUndefined()
  })

  it('returns an empty array for a response with no photos field at all', () => {
    expect(mapBackstageGalleryToImages({ event: {} } as GalleryPhotosResponse)).toEqual([])
  })

  it('returns an empty array for a response with an empty photos array', () => {
    expect(mapBackstageGalleryToImages({ event: {}, photos: [] })).toEqual([])
  })
})

describe('AC-25.3: no second gallery-rendering component set is introduced', () => {
  const GALLERY_DIR = 'src/components/gallery'

  // PIVOT_AUDIT.md's superseded-artifact table row for "In-repo gallery
  // viewer components" already names every file this directory is allowed
  // to hold under the "Kept as a Frontstage renderer" disposition, plus this
  // AC's own new mapper — its designated payloadGalleryMapper.ts
  // replacement, not a second component set.
  const AUDITED_FILES = [
    'GalleryEngine.tsx',
    'MainImageDisplay.tsx',
    'ThumbnailStrip.tsx',
    'ThumbnailDrawer.tsx',
    'NavigationControls.tsx',
    'GradientOverlay.tsx',
    'DownloadControl.tsx',
    'useFullscreenViewer.ts',
    'useSwipeNavigation.ts',
    'useSlideshow.ts',
    'useProgressiveThumbnails.ts',
    'galleryImageLoader.ts',
    'payloadGalleryMapper.ts',
    'types.ts',
    'backstageGalleryMapper.ts',
  ].sort()

  it('src/components/gallery/ contains exactly the audited file set — no new engine/renderer file', () => {
    const files = fs.readdirSync(path.join(root, GALLERY_DIR)).sort()
    expect(files).toEqual(AUDITED_FILES)
  })

  it('PIVOT_AUDIT.md still records this directory as "Kept as a Frontstage renderer", not superseded by a second system', () => {
    const audit = read('PIVOT_AUDIT.md')
    expect(audit).toMatch(/In-repo gallery viewer components[\s\S]*?Kept as a Frontstage renderer/)
  })

  it('backstageGalleryMapper and payloadGalleryMapper both produce the same GalleryImage type from ./types — one shared render contract, not a competing one', () => {
    const backstageSrc = read(`${GALLERY_DIR}/backstageGalleryMapper.ts`)
    const payloadSrc = read(`${GALLERY_DIR}/payloadGalleryMapper.ts`)

    expect(backstageSrc).toMatch(/import type \{ GalleryImage \} from '\.\/types'/)
    expect(payloadSrc).toMatch(/GalleryImage.*from '\.\/types'/)
  })

  it('backstageGalleryMapper does not import or render any component itself — it is a pure data mapper, like payloadGalleryMapper', () => {
    const src = read(`${GALLERY_DIR}/backstageGalleryMapper.ts`)
    expect(src).not.toMatch(/from ['"]react['"]/)
    expect(src).not.toMatch(/<[A-Z][A-Za-z]*[\s/>]/)
  })

  it('GalleryEngine.tsx is untouched by this AC — it stays storage-agnostic and imports neither mapper', () => {
    const src = read(`${GALLERY_DIR}/GalleryEngine.tsx`)
    expect(src).not.toMatch(/payloadGalleryMapper/)
    expect(src).not.toMatch(/backstageGalleryMapper/)
  })
})
