/**
 * ---
 * file: src/__tests__/us6-ac6.4-lazy-loading.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-6.4 — images below the fold use loading="lazy" and
 *          responsive sizes/srcset so only in-viewport images are requested
 *          on initial load, while the one above-the-fold instance per page
 *          (via GalleryEngine's `priority` prop) loads eagerly instead of
 *          lazily, so a real Lighthouse mobile run never flags the LCP
 *          candidate as lazy-loaded
 * created-by: dev-team
 * related-story: US-6
 * related-ac: 6.4
 * ---
 */
import { render, screen, within } from '@testing-library/react'

import { GalleryEngine } from '@/components/gallery/GalleryEngine'
import { MainImageDisplay } from '@/components/gallery/MainImageDisplay'
import { ThumbnailStrip } from '@/components/gallery/ThumbnailStrip'
import type { GalleryImage } from '@/components/gallery/types'
import GalleryEngineDemoPage from '@/app/(frontend)/dev/gallery-demo/page'

jest.mock('photoswipe/lightbox', () => ({
  __esModule: true,
  default: class MockPhotoSwipeLightbox {
    init = jest.fn()
    destroy = jest.fn()
    loadAndOpen = jest.fn()
  },
}))

const image: GalleryImage = {
  id: 'lazy-1',
  url: 'https://media.example.com/lazy-1-original.jpg',
  alt: 'Lazy loading test image',
  thumbnailUrl: 'https://media.example.com/lazy-1-thumbnail.jpg',
  mediumUrl: 'https://media.example.com/lazy-1-medium.jpg',
  largeUrl: 'https://media.example.com/lazy-1-large.jpg',
}

function largeGallery(count: number): GalleryImage[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `img-${index}`,
    url: `/img-${index}.jpg`,
    alt: `Image ${index}`,
  }))
}

describe('AC-6.4: MainImageDisplay explicitly lazy-loads by default', () => {
  it('renders loading="lazy" alongside a responsive sizes/srcset when no priority is requested', () => {
    render(<MainImageDisplay image={image} />)

    const img = screen.getByAltText('Lazy loading test image')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('sizes', '100vw')
    expect(img.getAttribute('srcset') ?? '').toContain(image.mediumUrl)
  })

  it('does not render loading="lazy" when priority is set (above-the-fold LCP candidate)', () => {
    render(<MainImageDisplay image={image} priority />)

    const img = screen.getByAltText('Lazy loading test image')
    expect(img).not.toHaveAttribute('loading', 'lazy')
  })
})

describe('AC-6.4: ThumbnailStrip images are always below-the-fold/deferred content', () => {
  it('every mounted thumbnail renders loading="lazy" with its own responsive srcset', () => {
    render(<ThumbnailStrip images={[image]} activeIndex={0} onSelect={jest.fn()} />)

    const strip = within(screen.getByTestId('thumbnail-strip'))
    const img = strip.getByAltText('Lazy loading test image')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img.getAttribute('srcset') ?? '').toContain(image.thumbnailUrl)
  })

  it('a large gallery keeps every mounted thumbnail lazy, not just the visible batch', () => {
    render(<ThumbnailStrip images={largeGallery(40)} activeIndex={0} onSelect={jest.fn()} />)

    const rendered = screen.getAllByRole('option')
    expect(rendered.length).toBeGreaterThan(0)
    rendered.forEach((option) => {
      const img = within(option).getByRole('img')
      expect(img).toHaveAttribute('loading', 'lazy')
    })
  })
})

describe('AC-6.4: GalleryEngine passes its priority prop through to the main image only', () => {
  it('defaults to an explicitly lazy main image', () => {
    render(<GalleryEngine images={[image]} />)

    const main = within(screen.getByTestId('main-image-display'))
    expect(main.getByAltText('Lazy loading test image')).toHaveAttribute('loading', 'lazy')
  })

  it('an above-the-fold instance (priority) renders its main image without loading="lazy"', () => {
    render(<GalleryEngine images={[image]} priority />)

    const main = within(screen.getByTestId('main-image-display'))
    expect(main.getByAltText('Lazy loading test image')).not.toHaveAttribute('loading', 'lazy')
  })

  it('priority never reaches the thumbnail strip — thumbnails stay lazy even in the priority instance', () => {
    render(<GalleryEngine images={largeGallery(3)} priority />)

    const strip = within(screen.getByTestId('thumbnail-strip'))
    strip.getAllByRole('img').forEach((img) => {
      expect(img).toHaveAttribute('loading', 'lazy')
    })
  })
})

describe('AC-6.4: on the internal demo route, only the above-the-fold hero instance skips lazy loading', () => {
  it("the hero-mode instance's main image is not lazy-loaded", () => {
    render(<GalleryEngineDemoPage />)

    const heroSection = within(screen.getByTestId('hero-mode-demo'))
    const heroMain = within(heroSection.getByTestId('main-image-display'))
    expect(heroMain.getByRole('img')).not.toHaveAttribute('loading', 'lazy')
  })

  it("the portfolio-mode instance's main image, which renders below the fold, is lazy-loaded", () => {
    render(<GalleryEngineDemoPage />)

    const portfolioSection = within(screen.getByTestId('portfolio-mode-demo'))
    const portfolioMain = within(portfolioSection.getByTestId('main-image-display'))
    expect(portfolioMain.getByRole('img')).toHaveAttribute('loading', 'lazy')
  })
})
