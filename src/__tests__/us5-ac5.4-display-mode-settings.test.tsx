/**
 * ---
 * file: src/__tests__/us5-ac5.4-display-mode-settings.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-5.4 — display-mode settings are respected: hero
 *          disables fullscreen/hover and enables slideshow; portfolio
 *          enables hover + fullscreen; client-delivery enables download +
 *          fullscreen + required auth (auth enforcement stubbed, setting
 *          wired)
 * created-by: dev-team
 * related-story: US-5
 * related-ac: 5.4
 * ---
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react'

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

// Mirrors the exact presets from PRD 5.6 / src/__tests__/us3-ac3.4-gallery-settings.test.ts.
const heroSettings: GallerySettings = {
  slideshow: true,
  hoverPreview: false,
  fullscreen: false,
  download: false,
  requireAuth: false,
}

const portfolioSettings: GallerySettings = {
  slideshow: false,
  hoverPreview: true,
  fullscreen: true,
  download: false,
  requireAuth: false,
}

const clientDeliverySettings: GallerySettings = {
  slideshow: false,
  hoverPreview: false,
  fullscreen: true,
  download: true,
  requireAuth: true,
}

describe('AC-5.4: hero mode disables fullscreen and hover, enables slideshow', () => {
  it('does not render a fullscreen click/tap trigger on the main image', () => {
    render(<GalleryEngine images={images} settings={heroSettings} />)

    expect(screen.getByTestId('main-image-display').tagName).toBe('DIV')
  })

  it('never reveals the thumbnail strip on hover', () => {
    render(<GalleryEngine images={images} settings={heroSettings} />)

    fireEvent.mouseEnter(screen.getByTestId('gallery-engine'))

    expect(screen.getByTestId('thumbnail-drawer')).toHaveAttribute('data-hover-visible', 'false')
  })

  it('auto-advances to the next image on a fixed interval without user interaction', () => {
    jest.useFakeTimers()
    try {
      render(<GalleryEngine images={images} settings={heroSettings} />)
      const main = within(screen.getByTestId('main-image-display'))

      expect(main.getByAltText('Image one')).toBeInTheDocument()

      act(() => {
        jest.advanceTimersByTime(5000)
      })
      expect(main.getByAltText('Image two')).toBeInTheDocument()

      act(() => {
        jest.advanceTimersByTime(5000)
      })
      expect(main.getByAltText('Image three')).toBeInTheDocument()
    } finally {
      jest.useRealTimers()
    }
  })

  it('exposes slideshow/hoverPreview/fullscreen on the gallery container for downstream display-mode wiring', () => {
    render(<GalleryEngine images={images} settings={heroSettings} />)

    const engine = screen.getByTestId('gallery-engine')
    expect(engine).toHaveAttribute('data-slideshow', 'true')
    expect(engine).toHaveAttribute('data-hover-preview', 'false')
    expect(engine).toHaveAttribute('data-fullscreen', 'false')
  })
})

describe('AC-5.4: portfolio mode enables hover and fullscreen, no slideshow', () => {
  it('renders a fullscreen click/tap trigger on the main image', () => {
    render(<GalleryEngine images={images} settings={portfolioSettings} />)

    expect(screen.getByTestId('main-image-display').tagName).toBe('BUTTON')
  })

  it('reveals the thumbnail strip on hover', () => {
    render(<GalleryEngine images={images} settings={portfolioSettings} />)

    fireEvent.mouseEnter(screen.getByTestId('gallery-engine'))

    expect(screen.getByTestId('thumbnail-drawer')).toHaveAttribute('data-hover-visible', 'true')
  })

  it('does not auto-advance', () => {
    jest.useFakeTimers()
    try {
      render(<GalleryEngine images={images} settings={portfolioSettings} />)
      const main = within(screen.getByTestId('main-image-display'))

      act(() => {
        jest.advanceTimersByTime(20000)
      })

      expect(main.getByAltText('Image one')).toBeInTheDocument()
    } finally {
      jest.useRealTimers()
    }
  })

  it('renders no download control', () => {
    render(<GalleryEngine images={images} settings={portfolioSettings} />)

    expect(screen.queryByTestId('download-control')).not.toBeInTheDocument()
  })
})

describe('AC-5.4: client-delivery mode enables download and fullscreen, wires required auth', () => {
  it('renders a fullscreen click/tap trigger on the main image', () => {
    render(<GalleryEngine images={images} settings={clientDeliverySettings} />)

    expect(screen.getByTestId('main-image-display').tagName).toBe('BUTTON')
  })

  it('renders a download link pointing at the currently displayed image, with the native download attribute', () => {
    render(<GalleryEngine images={images} settings={clientDeliverySettings} />)

    const download = screen.getByTestId('download-control')
    expect(download).toHaveAttribute('href', '/img-1.jpg')
    expect(download).toHaveAttribute('download')
  })

  it('the download link tracks the currently displayed image after navigating', () => {
    render(<GalleryEngine images={images} settings={clientDeliverySettings} />)

    fireEvent.click(screen.getByTestId('nav-next'))

    expect(screen.getByTestId('download-control')).toHaveAttribute('href', '/img-2.jpg')
  })

  it('exposes requireAuth on the gallery container even though enforcement is stubbed this sprint', () => {
    render(<GalleryEngine images={images} settings={clientDeliverySettings} />)

    expect(screen.getByTestId('gallery-engine')).toHaveAttribute('data-require-auth', 'true')
  })
})

describe('AC-5.4: settings with download disabled never render a download control', () => {
  it('hero mode (download: false) renders no download control', () => {
    render(<GalleryEngine images={images} settings={heroSettings} />)

    expect(screen.queryByTestId('download-control')).not.toBeInTheDocument()
  })
})
