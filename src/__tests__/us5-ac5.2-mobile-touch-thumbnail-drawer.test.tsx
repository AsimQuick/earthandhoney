/**
 * ---
 * file: src/__tests__/us5-ac5.2-mobile-touch-thumbnail-drawer.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-5.2 — the gallery is designed mobile-first: touch
 *          navigation and swipe gestures work, and tapping a gallery opens a
 *          thumbnail drawer (mobile has no hover)
 * created-by: dev-team
 * related-story: US-5
 * related-ac: 5.2
 * ---
 */
import { fireEvent, render, screen, within } from '@testing-library/react'

import { GalleryEngine } from '@/components/gallery/GalleryEngine'
import type { GalleryImage } from '@/components/gallery/types'

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

function swipe(element: Element, fromX: number, toX: number, fromY = 100, toY = 100) {
  fireEvent.touchStart(element, { touches: [{ clientX: fromX, clientY: fromY }] })
  fireEvent.touchEnd(element, { changedTouches: [{ clientX: toX, clientY: toY }] })
}

describe('AC-5.2: touch navigation and swipe gestures work on the main image viewport', () => {
  it('swiping left advances to the next image', () => {
    render(<GalleryEngine images={images} />)

    swipe(screen.getByTestId('main-image-display'), 300, 200)

    const main = within(screen.getByTestId('main-image-display'))
    expect(main.getByAltText('Image two')).toBeInTheDocument()
  })

  it('swiping right reverses to the previous image', () => {
    render(<GalleryEngine images={images} initialIndex={1} />)

    swipe(screen.getByTestId('main-image-display'), 200, 300)

    const main = within(screen.getByTestId('main-image-display'))
    expect(main.getByAltText('Image one')).toBeInTheDocument()
  })

  it('swiping left from the last image wraps around to the first', () => {
    render(<GalleryEngine images={images} initialIndex={2} />)

    swipe(screen.getByTestId('main-image-display'), 300, 200)

    const main = within(screen.getByTestId('main-image-display'))
    expect(main.getByAltText('Image one')).toBeInTheDocument()
  })

  it('a small horizontal movement below the swipe threshold does not navigate', () => {
    render(<GalleryEngine images={images} />)

    swipe(screen.getByTestId('main-image-display'), 300, 285)

    const main = within(screen.getByTestId('main-image-display'))
    expect(main.getByAltText('Image one')).toBeInTheDocument()
  })

  it('a mostly-vertical drag (page scroll) does not trigger navigation', () => {
    render(<GalleryEngine images={images} />)

    swipe(screen.getByTestId('main-image-display'), 300, 260, 100, 400)

    const main = within(screen.getByTestId('main-image-display'))
    expect(main.getByAltText('Image one')).toBeInTheDocument()
  })

  it('a touch that never moves (tap) does not navigate', () => {
    render(<GalleryEngine images={images} />)

    swipe(screen.getByTestId('main-image-display'), 300, 300)

    const main = within(screen.getByTestId('main-image-display'))
    expect(main.getByAltText('Image one')).toBeInTheDocument()
  })

  it('the navigation controls and thumbnails are real <button> elements, so tapping (which browsers translate to a click) activates them with no extra wiring', () => {
    render(<GalleryEngine images={images} />)

    expect(screen.getByTestId('nav-next').tagName).toBe('BUTTON')
    expect(screen.getByTestId('nav-previous').tagName).toBe('BUTTON')
    expect(screen.getByTestId('thumbnail-0').tagName).toBe('BUTTON')
  })
})

describe('AC-5.2: tapping a gallery opens a thumbnail drawer (mobile has no hover)', () => {
  it('the thumbnail drawer starts closed', () => {
    render(<GalleryEngine images={images} />)

    expect(screen.getByTestId('thumbnail-drawer-toggle')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByTestId('thumbnail-drawer')).toHaveAttribute('data-open', 'false')
  })

  it('tapping the drawer toggle opens the thumbnail drawer', () => {
    render(<GalleryEngine images={images} />)

    fireEvent.click(screen.getByTestId('thumbnail-drawer-toggle'))

    expect(screen.getByTestId('thumbnail-drawer-toggle')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('thumbnail-drawer')).toHaveAttribute('data-open', 'true')
  })

  it('tapping the drawer toggle again closes it', () => {
    render(<GalleryEngine images={images} />)

    fireEvent.click(screen.getByTestId('thumbnail-drawer-toggle'))
    fireEvent.click(screen.getByTestId('thumbnail-drawer-toggle'))

    expect(screen.getByTestId('thumbnail-drawer-toggle')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByTestId('thumbnail-drawer')).toHaveAttribute('data-open', 'false')
  })

  it('hovering does not open the drawer — mobile has no hover, only tap/click opens it', () => {
    render(<GalleryEngine images={images} />)

    fireEvent.mouseEnter(screen.getByTestId('gallery-engine'))
    fireEvent.mouseOver(screen.getByTestId('thumbnail-drawer-toggle'))

    expect(screen.getByTestId('thumbnail-drawer-toggle')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByTestId('thumbnail-drawer')).toHaveAttribute('data-open', 'false')
  })

  it('the toggle references the drawer panel via aria-controls for assistive tech', () => {
    render(<GalleryEngine images={images} />)

    const toggle = screen.getByTestId('thumbnail-drawer-toggle')
    const panel = screen.getByTestId('thumbnail-drawer')

    expect(toggle.getAttribute('aria-controls')).toBe(panel.getAttribute('id'))
  })

  it('selecting a thumbnail while the drawer is open still updates the main image', () => {
    render(<GalleryEngine images={images} />)

    fireEvent.click(screen.getByTestId('thumbnail-drawer-toggle'))
    fireEvent.click(screen.getByTestId('thumbnail-2'))

    const main = within(screen.getByTestId('main-image-display'))
    expect(main.getByAltText('Image three')).toBeInTheDocument()
  })

  it('the thumbnail strip itself is still rendered inside the drawer (preserves AC-4.1 desktop-visible behavior)', () => {
    render(<GalleryEngine images={images} />)

    const drawer = within(screen.getByTestId('thumbnail-drawer'))
    expect(drawer.getByTestId('thumbnail-strip')).toBeInTheDocument()
  })
})
