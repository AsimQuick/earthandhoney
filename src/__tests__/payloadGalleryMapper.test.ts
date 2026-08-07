/**
 * ---
 * file: src/__tests__/payloadGalleryMapper.test.ts
 * project: earthandhoney
 * purpose: Unit coverage for src/components/gallery/payloadGalleryMapper.ts,
 *          a "Kept as a Frontstage renderer" utility per PIVOT_AUDIT.md's
 *          superseded-artifacts table (row 4) — it survives AC-28.1's removal
 *          of the Payload `galleries` collection and is rewired to a
 *          PicPeak-sourced document shape by a later story. Extracted from
 *          us6-ac6.2-isr-static-generation.test.ts, whose surrounding ISR
 *          route (src/app/(frontend)/dev/gallery-isr-demo) was itself removed
 *          by AC-28.1 as it queried the now-deleted `galleries` collection —
 *          only the route-specific assertions were dropped, this pure
 *          function's coverage moved here unchanged.
 * created-by: dev-team
 * related-story: US-28
 * related-ac: 28.1
 * ---
 */
import { mapPayloadGalleryToImages, type PayloadGalleryDoc } from '@/components/gallery/payloadGalleryMapper'

describe('mapPayloadGalleryToImages — the Payload gallery document → Gallery Engine image-list mapping', () => {
  it('maps populated Media relations into GalleryImage[], carrying alt/url/sizes/dimensions through', () => {
    const gallery: PayloadGalleryDoc = {
      id: 1,
      title: 'ISR demo gallery',
      images: [
        {
          image: {
            id: 42,
            alt: 'A demo photo',
            url: '/media/original-42.jpg',
            width: 4000,
            height: 3000,
            sizes: {
              thumbnail: { url: '/media/thumb-42.jpg' },
              medium: { url: '/media/medium-42.jpg' },
              large: { url: '/media/large-42.jpg' },
            },
          },
        },
      ],
    }

    expect(mapPayloadGalleryToImages(gallery)).toEqual([
      {
        id: '42',
        url: '/media/original-42.jpg',
        alt: 'A demo photo',
        thumbnailUrl: '/media/thumb-42.jpg',
        mediumUrl: '/media/medium-42.jpg',
        largeUrl: '/media/large-42.jpg',
        width: 4000,
        height: 3000,
      },
    ])
  })

  it('preserves row order across multiple images', () => {
    const gallery: PayloadGalleryDoc = {
      id: 1,
      title: 'ISR demo gallery',
      images: [
        { image: { id: 1, url: '/one.jpg' } },
        { image: { id: 2, url: '/two.jpg' } },
        { image: { id: 3, url: '/three.jpg' } },
      ],
    }

    expect(mapPayloadGalleryToImages(gallery).map((image) => image.id)).toEqual(['1', '2', '3'])
  })

  it('drops rows whose image relation is not populated (still a bare id), instead of crashing', () => {
    const gallery: PayloadGalleryDoc = {
      id: 1,
      title: 'ISR demo gallery',
      images: [{ image: 99 }, { image: { id: 42, url: '/media/42.jpg' } }],
    }

    const result = mapPayloadGalleryToImages(gallery)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('42')
  })

  it('falls back to an empty url string (never undefined) when a populated Media doc has no url', () => {
    const gallery: PayloadGalleryDoc = {
      id: 1,
      title: 'ISR demo gallery',
      images: [{ image: { id: 7, alt: 'No url yet' } }],
    }

    expect(mapPayloadGalleryToImages(gallery)[0].url).toBe('')
  })

  it('falls back to the gallery title as alt text when the Media doc has no alt', () => {
    const gallery: PayloadGalleryDoc = {
      id: 1,
      title: 'ISR demo gallery',
      images: [{ image: { id: 1, url: '/one.jpg' } }],
    }

    expect(mapPayloadGalleryToImages(gallery)[0].alt).toBe('ISR demo gallery')
  })

  it('leaves thumbnail/medium/large variant URLs undefined when a Media doc has no sizes', () => {
    const gallery: PayloadGalleryDoc = {
      id: 1,
      title: 'ISR demo gallery',
      images: [{ image: { id: 1, url: '/one.jpg' } }],
    }

    const [image] = mapPayloadGalleryToImages(gallery)
    expect(image.thumbnailUrl).toBeUndefined()
    expect(image.mediumUrl).toBeUndefined()
    expect(image.largeUrl).toBeUndefined()
  })

  it('returns an empty array for a gallery with no images field at all', () => {
    const gallery: PayloadGalleryDoc = { id: 1, title: 'Empty gallery' }
    expect(mapPayloadGalleryToImages(gallery)).toEqual([])
  })

  it('returns an empty array for a gallery with an empty images array', () => {
    const gallery: PayloadGalleryDoc = { id: 1, title: 'Empty gallery', images: [] }
    expect(mapPayloadGalleryToImages(gallery)).toEqual([])
  })
})
