/**
 * ---
 * file: src/__tests__/us6-ac6.1-progressive-loading.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-6.1 — a gallery never loads its full set of images
 *          upfront: only the visible main image and a required batch of
 *          thumbnails are loaded initially, and the rest load
 *          lazily/progressively as the visitor scrolls the thumbnail strip
 * created-by: dev-team
 * related-story: US-6
 * related-ac: 6.1
 * ---
 */
import { act, render, renderHook, screen, within } from '@testing-library/react'

import { useProgressiveThumbnails } from '@/components/gallery/useProgressiveThumbnails'

import { GalleryEngine } from '@/components/gallery/GalleryEngine'
import { MainImageDisplay } from '@/components/gallery/MainImageDisplay'
import { ThumbnailStrip } from '@/components/gallery/ThumbnailStrip'
import type { GalleryImage } from '@/components/gallery/types'

jest.mock('photoswipe/lightbox', () => ({
  __esModule: true,
  default: class MockPhotoSwipeLightbox {
    init = jest.fn()
    destroy = jest.fn()
    loadAndOpen = jest.fn()
  },
}))

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  callback: IntersectionObserverCallback
  observe = jest.fn()
  disconnect = jest.fn()
  unobserve = jest.fn()

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }

  trigger(isIntersecting = true) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
}

function largeGallery(count: number): GalleryImage[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `img-${index}`,
    url: `/img-${index}.jpg`,
    alt: `Image ${index}`,
  }))
}

beforeEach(() => {
  MockIntersectionObserver.instances = []
  ;(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    MockIntersectionObserver
})

describe('AC-6.1: the main display never renders more than the single currently visible image', () => {
  it('mounts exactly one <img> regardless of how large the gallery is', () => {
    render(<MainImageDisplay image={largeGallery(40)[7]} />)

    expect(screen.getAllByRole('img')).toHaveLength(1)
  })

  it('the Gallery Engine only ever mounts the current index in the main display, never the full set', () => {
    render(<GalleryEngine images={largeGallery(40)} />)

    const main = within(screen.getByTestId('main-image-display'))
    expect(main.getAllByRole('img')).toHaveLength(1)
    expect(main.getByAltText('Image 0')).toBeInTheDocument()
  })
})

describe('AC-6.1: the thumbnail strip only mounts a required batch of thumbnails initially', () => {
  it('renders every thumbnail when the gallery is smaller than one batch (back-compat with AC-4.1/4.3/5.x)', () => {
    const images = largeGallery(3)
    render(<ThumbnailStrip images={images} activeIndex={0} onSelect={jest.fn()} />)

    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(screen.queryByTestId('thumbnail-strip-sentinel')).not.toBeInTheDocument()
  })

  it('does not mount the full thumbnail set for a large gallery', () => {
    const images = largeGallery(40)
    render(<ThumbnailStrip images={images} activeIndex={0} onSelect={jest.fn()} />)

    const rendered = screen.getAllByRole('option')
    expect(rendered.length).toBeLessThan(40)
    expect(rendered.length).toBeGreaterThan(0)
    expect(screen.getByTestId('thumbnail-strip-sentinel')).toBeInTheDocument()
  })

  it('always includes the currently active thumbnail, even far beyond the initial batch', () => {
    const images = largeGallery(40)
    render(<ThumbnailStrip images={images} activeIndex={35} onSelect={jest.fn()} />)

    expect(screen.getByTestId('thumbnail-35')).toBeInTheDocument()
    expect(screen.getAllByRole('option').length).toBeLessThan(40)
  })
})

describe('AC-6.1: remaining thumbnails load progressively as the strip is scrolled', () => {
  it('reveals the next batch once the end-of-strip sentinel intersects the viewport', () => {
    const images = largeGallery(40)
    render(<ThumbnailStrip images={images} activeIndex={0} onSelect={jest.fn()} />)

    const initialCount = screen.getAllByRole('option').length

    act(() => {
      MockIntersectionObserver.instances[0]?.trigger(true)
    })

    expect(screen.getAllByRole('option').length).toBeGreaterThan(initialCount)
  })

  it('never reveals more thumbnails than the gallery has, and removes the sentinel once fully revealed', () => {
    const images = largeGallery(20)
    render(<ThumbnailStrip images={images} activeIndex={0} onSelect={jest.fn()} />)

    for (let i = 0; i < 5; i += 1) {
      const observer = MockIntersectionObserver.instances[MockIntersectionObserver.instances.length - 1]
      if (!screen.queryByTestId('thumbnail-strip-sentinel')) break
      act(() => {
        observer?.trigger(true)
      })
    }

    expect(screen.getAllByRole('option')).toHaveLength(20)
    expect(screen.queryByTestId('thumbnail-strip-sentinel')).not.toBeInTheDocument()
  })

  it('a non-intersecting sentinel report does not reveal more thumbnails', () => {
    const images = largeGallery(40)
    render(<ThumbnailStrip images={images} activeIndex={0} onSelect={jest.fn()} />)

    const initialCount = screen.getAllByRole('option').length

    act(() => {
      MockIntersectionObserver.instances[0]?.trigger(false)
    })

    expect(screen.getAllByRole('option')).toHaveLength(initialCount)
  })
})

describe('AC-6.1: images that are not yet revealed are absent from the DOM entirely (not just visually hidden)', () => {
  it('a not-yet-revealed image never appears, even as a hidden node', () => {
    const images = largeGallery(40)
    render(<ThumbnailStrip images={images} activeIndex={0} onSelect={jest.fn()} />)

    expect(screen.queryByAltText('Image 39')).not.toBeInTheDocument()
  })
})

describe('AC-6.1: useProgressiveThumbnails disconnects its observer on unmount', () => {
  it('disconnects the IntersectionObserver when the consuming component unmounts', () => {
    const { result, unmount } = renderHook(() =>
      useProgressiveThumbnails({ totalCount: 40, activeIndex: 0 }),
    )

    act(() => {
      result.current.sentinelRef(document.createElement('div'))
    })
    const observer = MockIntersectionObserver.instances[0]
    expect(observer?.disconnect).not.toHaveBeenCalled()

    unmount()

    expect(observer?.disconnect).toHaveBeenCalled()
  })
})
