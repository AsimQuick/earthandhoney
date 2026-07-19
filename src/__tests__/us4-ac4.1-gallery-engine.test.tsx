/**
 * ---
 * file: src/__tests__/us4-ac4.1-gallery-engine.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-4.1 — a single reusable Gallery Engine component set
 *          renders any gallery: Gallery Container, Main Image Display,
 *          Thumbnail Preview strip, and Navigation Controls (next/previous)
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.1
 * ---
 */
import { fireEvent, render, screen, within } from '@testing-library/react'

import { GalleryEngine } from '@/components/gallery/GalleryEngine'
import { MainImageDisplay } from '@/components/gallery/MainImageDisplay'
import { NavigationControls } from '@/components/gallery/NavigationControls'
import { ThumbnailStrip } from '@/components/gallery/ThumbnailStrip'
import type { GalleryImage } from '@/components/gallery/types'

const heroImages: GalleryImage[] = [
  { id: 'hero-1', url: '/hero-1.jpg', alt: 'Hero image one' },
  { id: 'hero-2', url: '/hero-2.jpg', alt: 'Hero image two' },
  { id: 'hero-3', url: '/hero-3.jpg', alt: 'Hero image three' },
]

const portfolioImages: GalleryImage[] = [
  { id: 'portfolio-1', url: '/portfolio-1.jpg', alt: 'Portfolio image one' },
  { id: 'portfolio-2', url: '/portfolio-2.jpg', alt: 'Portfolio image two' },
]

describe('AC-4.1: Gallery Engine renders any gallery from one reusable component set', () => {
  it('renders all four required pieces — container, main display, thumbnail strip, navigation controls', () => {
    render(<GalleryEngine images={heroImages} />)

    expect(screen.getByTestId('gallery-engine')).toBeInTheDocument()
    expect(screen.getByTestId('main-image-display')).toBeInTheDocument()
    expect(screen.getByTestId('thumbnail-strip')).toBeInTheDocument()
    expect(screen.getByTestId('navigation-controls')).toBeInTheDocument()
  })

  it('the main image display shows the first image by default', () => {
    render(<GalleryEngine images={heroImages} />)

    const main = within(screen.getByTestId('main-image-display'))
    expect(main.getByAltText('Hero image one')).toBeInTheDocument()
  })

  it('honors an initialIndex prop so the engine can open on a specific image', () => {
    render(<GalleryEngine images={heroImages} initialIndex={2} />)

    const main = within(screen.getByTestId('main-image-display'))
    expect(main.getByAltText('Hero image three')).toBeInTheDocument()
  })

  it('the thumbnail strip renders exactly one thumbnail per image, in order', () => {
    render(<GalleryEngine images={heroImages} />)

    const strip = within(screen.getByTestId('thumbnail-strip'))
    expect(strip.getByTestId('thumbnail-0')).toHaveAccessibleName(/hero image one/i)
    expect(strip.getByTestId('thumbnail-1')).toHaveAccessibleName(/hero image two/i)
    expect(strip.getByTestId('thumbnail-2')).toHaveAccessibleName(/hero image three/i)
  })

  it('marks the active thumbnail as selected', () => {
    render(<GalleryEngine images={heroImages} />)

    expect(screen.getByTestId('thumbnail-0')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('thumbnail-1')).toHaveAttribute('aria-selected', 'false')
  })

  it('clicking a thumbnail updates the main image display to that image', () => {
    render(<GalleryEngine images={heroImages} />)

    fireEvent.click(screen.getByTestId('thumbnail-2'))

    const main = within(screen.getByTestId('main-image-display'))
    expect(main.getByAltText('Hero image three')).toBeInTheDocument()
    expect(screen.getByTestId('thumbnail-2')).toHaveAttribute('aria-selected', 'true')
  })

  it('the "next" control advances the main image display', () => {
    render(<GalleryEngine images={heroImages} />)

    fireEvent.click(screen.getByTestId('nav-next'))

    const main = within(screen.getByTestId('main-image-display'))
    expect(main.getByAltText('Hero image two')).toBeInTheDocument()
  })

  it('the "previous" control reverses the main image display', () => {
    render(<GalleryEngine images={heroImages} initialIndex={1} />)

    fireEvent.click(screen.getByTestId('nav-previous'))

    const main = within(screen.getByTestId('main-image-display'))
    expect(main.getByAltText('Hero image one')).toBeInTheDocument()
  })

  it('"next" wraps from the last image back to the first', () => {
    render(<GalleryEngine images={heroImages} initialIndex={2} />)

    fireEvent.click(screen.getByTestId('nav-next'))

    const main = within(screen.getByTestId('main-image-display'))
    expect(main.getByAltText('Hero image one')).toBeInTheDocument()
  })

  it('"previous" wraps from the first image back to the last', () => {
    render(<GalleryEngine images={heroImages} />)

    fireEvent.click(screen.getByTestId('nav-previous'))

    const main = within(screen.getByTestId('main-image-display'))
    expect(main.getByAltText('Hero image three')).toBeInTheDocument()
  })

  it('degrades gracefully for an empty gallery instead of crashing', () => {
    render(<GalleryEngine images={[]} />)

    expect(screen.getByTestId('gallery-engine')).toBeInTheDocument()
    expect(screen.queryByTestId('main-image-display')).not.toBeInTheDocument()
    expect(screen.queryByTestId('thumbnail-strip')).not.toBeInTheDocument()
    expect(screen.queryByTestId('navigation-controls')).not.toBeInTheDocument()
  })

  it('is one reusable component set: the same GalleryEngine renders a second, differently-shaped gallery with no shared state leaking between instances', () => {
    const { unmount } = render(<GalleryEngine images={heroImages} />)
    unmount()

    render(<GalleryEngine images={portfolioImages} />)

    const strip = within(screen.getByTestId('thumbnail-strip'))
    expect(strip.getAllByRole('option')).toHaveLength(portfolioImages.length)
    const main = within(screen.getByTestId('main-image-display'))
    expect(main.getByAltText('Portfolio image one')).toBeInTheDocument()
  })
})

describe('AC-4.1: Main Image Display', () => {
  it('renders the given image with its alt text', () => {
    render(<MainImageDisplay image={heroImages[0]} />)

    expect(screen.getByAltText('Hero image one')).toHaveAttribute('src', '/hero-1.jpg')
  })
})

describe('AC-4.1: Thumbnail Preview strip', () => {
  it('calls onSelect with the clicked image index', () => {
    const onSelect = jest.fn()
    render(<ThumbnailStrip images={heroImages} activeIndex={0} onSelect={onSelect} />)

    fireEvent.click(screen.getByTestId('thumbnail-1'))

    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('exposes a listbox role so assistive tech announces it as a selectable strip', () => {
    render(<ThumbnailStrip images={heroImages} activeIndex={0} onSelect={jest.fn()} />)

    expect(screen.getByRole('listbox', { name: /gallery thumbnails/i })).toBeInTheDocument()
  })
})

describe('AC-4.1: Navigation Controls', () => {
  it('calls onNext and onPrevious independently', () => {
    const onNext = jest.fn()
    const onPrevious = jest.fn()
    render(<NavigationControls onNext={onNext} onPrevious={onPrevious} />)

    fireEvent.click(screen.getByTestId('nav-next'))
    fireEvent.click(screen.getByTestId('nav-previous'))

    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onPrevious).toHaveBeenCalledTimes(1)
  })
})
