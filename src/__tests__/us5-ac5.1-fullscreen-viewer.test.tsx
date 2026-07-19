/**
 * ---
 * file: src/__tests__/us5-ac5.1-fullscreen-viewer.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-5.1 — clicking/tapping any gallery image opens a
 *          fullscreen viewer powered by PhotoSwipe supporting next,
 *          previous, close, swipe, and keyboard navigation
 * created-by: dev-team
 * related-story: US-5
 * related-ac: 5.1
 * ---
 */
import { fireEvent, render, screen } from '@testing-library/react'

import { GalleryEngine } from '@/components/gallery/GalleryEngine'
import { MainImageDisplay } from '@/components/gallery/MainImageDisplay'
import type { GalleryImage } from '@/components/gallery/types'

const init = jest.fn()
const destroy = jest.fn()
const loadAndOpen = jest.fn()
let lastConstructedOptions: Record<string, unknown> | null = null

jest.mock('photoswipe/lightbox', () => ({
  __esModule: true,
  default: class MockPhotoSwipeLightbox {
    constructor(options: Record<string, unknown>) {
      lastConstructedOptions = options
    }
    init = init
    destroy = destroy
    loadAndOpen = loadAndOpen
  },
}))

const images: GalleryImage[] = [
  { id: 'img-1', url: '/img-1.jpg', alt: 'Image one', largeUrl: '/img-1-large.jpg', width: 1600, height: 1067 },
  { id: 'img-2', url: '/img-2.jpg', alt: 'Image two' },
  { id: 'img-3', url: '/img-3.jpg', alt: 'Image three', largeUrl: '/img-3-large.jpg' },
]

beforeEach(() => {
  init.mockClear()
  destroy.mockClear()
  loadAndOpen.mockClear()
  lastConstructedOptions = null
})

describe('AC-5.1: clicking/tapping the gallery image opens the PhotoSwipe fullscreen viewer', () => {
  it('clicking the main image display opens PhotoSwipe at the currently displayed index', () => {
    render(<GalleryEngine images={images} />)

    fireEvent.click(screen.getByTestId('main-image-display'))

    expect(loadAndOpen).toHaveBeenCalledWith(0)
  })

  it('opens at the updated index after navigating to the next image', () => {
    render(<GalleryEngine images={images} />)

    fireEvent.click(screen.getByTestId('nav-next'))
    fireEvent.click(screen.getByTestId('main-image-display'))

    expect(loadAndOpen).toHaveBeenCalledWith(1)
  })

  it('opens at the updated index after selecting a thumbnail', () => {
    render(<GalleryEngine images={images} />)

    fireEvent.click(screen.getByTestId('thumbnail-2'))
    fireEvent.click(screen.getByTestId('main-image-display'))

    expect(loadAndOpen).toHaveBeenCalledWith(2)
  })

  it('the trigger is a real <button>, so it is reachable and activatable via keyboard (Enter/Space), not just mouse click', () => {
    render(<GalleryEngine images={images} />)

    const trigger = screen.getByTestId('main-image-display')
    expect(trigger.tagName).toBe('BUTTON')
    expect(trigger).toHaveAccessibleName(/open fullscreen view of image one/i)
  })

  it('initializes exactly one PhotoSwipeLightbox instance on mount and destroys it on unmount', () => {
    const { unmount } = render(<GalleryEngine images={images} />)

    expect(init).toHaveBeenCalledTimes(1)
    expect(destroy).not.toHaveBeenCalled()

    unmount()

    expect(destroy).toHaveBeenCalledTimes(1)
  })
})

describe('AC-5.1: the PhotoSwipe dataSource mirrors every gallery image', () => {
  it('builds one slide per image, preferring the large variant and falling back to the original file, with a sensible width/height fallback', () => {
    render(<GalleryEngine images={images} />)

    expect(lastConstructedOptions?.dataSource).toEqual([
      { src: '/img-1-large.jpg', width: 1600, height: 1067, alt: 'Image one' },
      { src: '/img-2.jpg', width: 2048, height: 1365, alt: 'Image two' },
      { src: '/img-3-large.jpg', width: 2048, height: 1365, alt: 'Image three' },
    ])
  })

  it('supplies a pswpModule loader (loads the PhotoSwipe core lazily) rather than eagerly bundling it', () => {
    render(<GalleryEngine images={images} />)

    expect(typeof lastConstructedOptions?.pswpModule).toBe('function')
  })
})

describe('AC-5.1: next, previous, close, swipe, and keyboard navigation are left enabled — none are disabled by our wiring', () => {
  it('does not disable keyboard navigation (arrow keys) or the Esc-to-close shortcut', () => {
    render(<GalleryEngine images={images} />)

    expect(lastConstructedOptions?.escKey).not.toBe(false)
    expect(lastConstructedOptions?.arrowKeys).not.toBe(false)
  })

  it('does not disable the next/previous arrow buttons', () => {
    render(<GalleryEngine images={images} />)

    expect(lastConstructedOptions?.arrowPrev).not.toBe(false)
    expect(lastConstructedOptions?.arrowNext).not.toBe(false)
  })

  it('does not disable the close button or background-click-to-close', () => {
    render(<GalleryEngine images={images} />)

    expect(lastConstructedOptions?.close).not.toBe(false)
    expect(lastConstructedOptions?.bgClickAction).not.toBe(false)
  })

  it('does not configure a custom gallery/children DOM selector that would bypass PhotoSwipe\'s own swipe/pointer gesture handling', () => {
    render(<GalleryEngine images={images} />)

    expect(lastConstructedOptions?.gallery).toBeUndefined()
    expect(lastConstructedOptions?.children).toBeUndefined()
  })
})

describe('AC-5.1: MainImageDisplay only renders a click/tap trigger when wired to open fullscreen', () => {
  it('renders a plain, non-interactive container when no onOpenFullscreen handler is supplied (preserves prior AC-4.1 behavior)', () => {
    render(<MainImageDisplay image={images[0]} />)

    expect(screen.getByTestId('main-image-display').tagName).toBe('DIV')
  })

  it('renders a button and invokes the handler once per click when onOpenFullscreen is supplied', () => {
    const onOpenFullscreen = jest.fn()
    render(<MainImageDisplay image={images[0]} onOpenFullscreen={onOpenFullscreen} />)

    fireEvent.click(screen.getByTestId('main-image-display'))

    expect(onOpenFullscreen).toHaveBeenCalledTimes(1)
  })
})
