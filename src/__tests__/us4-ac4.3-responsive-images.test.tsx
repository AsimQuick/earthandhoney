/**
 * ---
 * file: src/__tests__/us4-ac4.3-responsive-images.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-4.3 — images render via Next.js Image with a responsive
 *          srcset drawn from the thumbnail/medium/large Sharp variants,
 *          choosing an appropriate size per viewport
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.3
 * ---
 */
import { render, screen, within } from '@testing-library/react'

import {
  createGalleryImageLoader,
  resolveGalleryImageSrc,
} from '@/components/gallery/galleryImageLoader'
import { GalleryEngine } from '@/components/gallery/GalleryEngine'
import { MainImageDisplay } from '@/components/gallery/MainImageDisplay'
import { ThumbnailStrip } from '@/components/gallery/ThumbnailStrip'
import type { GalleryImage } from '@/components/gallery/types'

const fullImage: GalleryImage = {
  id: 'full-1',
  url: 'https://media.example.com/full-1-original.jpg',
  alt: 'Full variant set image',
  thumbnailUrl: 'https://media.example.com/full-1-thumbnail.jpg',
  mediumUrl: 'https://media.example.com/full-1-medium.jpg',
  largeUrl: 'https://media.example.com/full-1-large.jpg',
}

describe('AC-4.3: resolveGalleryImageSrc chooses the appropriate variant per requested width', () => {
  it('chooses the thumbnail variant for widths at or below 400px', () => {
    expect(resolveGalleryImageSrc(fullImage, 400)).toBe(fullImage.thumbnailUrl)
    expect(resolveGalleryImageSrc(fullImage, 128)).toBe(fullImage.thumbnailUrl)
  })

  it('chooses the medium variant for widths above 400px and at or below 1200px', () => {
    expect(resolveGalleryImageSrc(fullImage, 401)).toBe(fullImage.mediumUrl)
    expect(resolveGalleryImageSrc(fullImage, 1200)).toBe(fullImage.mediumUrl)
  })

  it('chooses the large variant for widths above 1200px', () => {
    expect(resolveGalleryImageSrc(fullImage, 1201)).toBe(fullImage.largeUrl)
    expect(resolveGalleryImageSrc(fullImage, 3840)).toBe(fullImage.largeUrl)
  })

  it('falls back up the chain when the ideal variant is missing', () => {
    const noThumbnail: GalleryImage = { ...fullImage, thumbnailUrl: undefined }
    expect(resolveGalleryImageSrc(noThumbnail, 200)).toBe(fullImage.mediumUrl)

    const noMediumOrThumbnail: GalleryImage = {
      ...fullImage,
      thumbnailUrl: undefined,
      mediumUrl: undefined,
    }
    expect(resolveGalleryImageSrc(noMediumOrThumbnail, 200)).toBe(fullImage.largeUrl)
  })

  it('falls back to the original url when no Sharp variants are available', () => {
    const originalOnly: GalleryImage = {
      id: 'original-only',
      url: '/original-only.jpg',
      alt: 'No variants',
    }

    expect(resolveGalleryImageSrc(originalOnly, 128)).toBe('/original-only.jpg')
    expect(resolveGalleryImageSrc(originalOnly, 800)).toBe('/original-only.jpg')
    expect(resolveGalleryImageSrc(originalOnly, 3840)).toBe('/original-only.jpg')
  })

  it('a loader bound to one image resolves widths against that image only', () => {
    const loader = createGalleryImageLoader(fullImage)

    expect(loader({ width: 100 })).toBe(fullImage.thumbnailUrl)
    expect(loader({ width: 800 })).toBe(fullImage.mediumUrl)
    expect(loader({ width: 2000 })).toBe(fullImage.largeUrl)
  })
})

describe('AC-4.3: Main Image Display renders a responsive next/image', () => {
  it('renders an img with a sizes attribute and a srcset spanning the medium/large variants for its viewport-wide breakpoints', () => {
    render(<MainImageDisplay image={fullImage} />)

    const img = screen.getByAltText('Full variant set image')
    expect(img).toHaveAttribute('sizes', '100vw')

    // Full-bleed (sizes="100vw") breakpoints start at 640px — never narrow
    // enough to warrant the 400px thumbnail variant.
    const srcset = img.getAttribute('srcset') ?? ''
    expect(srcset).not.toContain(fullImage.thumbnailUrl)
    expect(srcset).toContain(fullImage.mediumUrl)
    expect(srcset).toContain(fullImage.largeUrl)
  })

  it('still renders the exact given url when no Sharp variants are available (AC-4.1 back-compat)', () => {
    const originalOnly: GalleryImage = { id: 'orig', url: '/hero-1.jpg', alt: 'Hero image one' }
    render(<MainImageDisplay image={originalOnly} />)

    expect(screen.getByAltText('Hero image one')).toHaveAttribute('src', '/hero-1.jpg')
  })
})

describe('AC-4.3: Thumbnail Preview strip requests the small thumbnail variant', () => {
  it('renders each thumbnail sourced from the thumbnail variant, not the full-size original', () => {
    render(<ThumbnailStrip images={[fullImage]} activeIndex={0} onSelect={jest.fn()} />)

    const strip = within(screen.getByTestId('thumbnail-strip'))
    const img = strip.getByAltText('Full variant set image')

    expect(img).toHaveAttribute('src', fullImage.thumbnailUrl)
    expect(img).not.toHaveAttribute('src', fullImage.url)
  })
})

describe('AC-4.3: responsive images are wired through the full Gallery Engine', () => {
  it('the currently active image in the engine renders with its variant-derived srcset', () => {
    render(<GalleryEngine images={[fullImage]} />)

    const main = within(screen.getByTestId('main-image-display'))
    const img = main.getByAltText('Full variant set image')
    const srcset = img.getAttribute('srcset') ?? ''

    expect(srcset).toContain(fullImage.mediumUrl)
    expect(srcset).toContain(fullImage.largeUrl)
  })
})
