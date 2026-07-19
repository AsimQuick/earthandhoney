/**
 * ---
 * file: src/__tests__/us5-ac5.3-desktop-hover-thumbnail-preview.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-5.3 — on desktop, hovering a gallery reveals a
 *          thumbnail preview strip for previewing images, and this
 *          hover-preview behavior is honored per gallery settings
 *          (`settings.hoverPreview`, PRD 5.6/5.7)
 * created-by: dev-team
 * related-story: US-5
 * related-ac: 5.3
 * ---
 */
import { fireEvent, render, screen, within } from '@testing-library/react'

import { GalleryEngine } from '@/components/gallery/GalleryEngine'
import type { GalleryImage, GallerySettings } from '@/components/gallery/types'

jest.mock('photoswipe/lightbox', () => ({
  __esModule: true,
  default: class MockPhotoSwipeLightbox {
    init = jest.fn()
    destroy = jest.fn()
    loadAndOpen = jest.fn()
  },
}))

const images: GalleryImage[] = [
  { id: 'img-1', url: '/img-1.jpg', alt: 'Image one' },
  { id: 'img-2', url: '/img-2.jpg', alt: 'Image two' },
  { id: 'img-3', url: '/img-3.jpg', alt: 'Image three' },
]

const portfolioSettings: GallerySettings = {
  slideshow: false,
  hoverPreview: true,
  fullscreen: true,
  download: false,
  requireAuth: false,
}

const heroSettings: GallerySettings = {
  slideshow: true,
  hoverPreview: false,
  fullscreen: false,
  download: false,
  requireAuth: false,
}

describe('AC-5.3: hovering a gallery reveals the thumbnail preview strip on desktop', () => {
  it('the thumbnail strip is not hover-revealed before the gallery is hovered', () => {
    render(<GalleryEngine images={images} settings={portfolioSettings} />)

    expect(screen.getByTestId('thumbnail-drawer')).toHaveAttribute('data-hover-visible', 'false')
  })

  it('hovering the gallery reveals the thumbnail strip when hoverPreview is enabled', () => {
    render(<GalleryEngine images={images} settings={portfolioSettings} />)

    fireEvent.mouseEnter(screen.getByTestId('gallery-engine'))

    expect(screen.getByTestId('thumbnail-drawer')).toHaveAttribute('data-hover-visible', 'true')
  })

  it('the moment the pointer leaves the gallery, the strip is no longer hover-revealed', () => {
    render(<GalleryEngine images={images} settings={portfolioSettings} />)

    fireEvent.mouseEnter(screen.getByTestId('gallery-engine'))
    fireEvent.mouseLeave(screen.getByTestId('gallery-engine'))

    expect(screen.getByTestId('thumbnail-drawer')).toHaveAttribute('data-hover-visible', 'false')
  })

  it('selecting a thumbnail while it is hover-revealed still updates the main image', () => {
    render(<GalleryEngine images={images} settings={portfolioSettings} />)

    fireEvent.mouseEnter(screen.getByTestId('gallery-engine'))
    fireEvent.click(screen.getByTestId('thumbnail-2'))

    const main = within(screen.getByTestId('main-image-display'))
    expect(main.getByAltText('Image three')).toBeInTheDocument()
  })

  it('hovering never touches the independent mobile drawer toggle state from AC-5.2', () => {
    render(<GalleryEngine images={images} settings={portfolioSettings} />)

    fireEvent.mouseEnter(screen.getByTestId('gallery-engine'))

    expect(screen.getByTestId('thumbnail-drawer-toggle')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByTestId('thumbnail-drawer')).toHaveAttribute('data-open', 'false')
  })
})

describe('AC-5.3: hover-preview is honored per gallery settings', () => {
  it('a gallery with hoverPreview disabled (e.g. hero mode) never reveals the strip on hover', () => {
    render(<GalleryEngine images={images} settings={heroSettings} />)

    fireEvent.mouseEnter(screen.getByTestId('gallery-engine'))

    expect(screen.getByTestId('thumbnail-drawer')).toHaveAttribute('data-hover-visible', 'false')
  })

  it('exposes the hoverPreview setting on the gallery container for downstream display-mode wiring', () => {
    render(<GalleryEngine images={images} settings={heroSettings} />)

    expect(screen.getByTestId('gallery-engine')).toHaveAttribute('data-hover-preview', 'false')
  })

  it('a gallery with no explicit settings defaults to hoverPreview enabled and still reveals on hover', () => {
    render(<GalleryEngine images={images} />)

    fireEvent.mouseEnter(screen.getByTestId('gallery-engine'))

    expect(screen.getByTestId('thumbnail-drawer')).toHaveAttribute('data-hover-visible', 'true')
  })
})
