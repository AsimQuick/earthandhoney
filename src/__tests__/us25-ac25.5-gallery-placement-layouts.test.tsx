/**
 * ---
 * file: src/__tests__/us25-ac25.5-gallery-placement-layouts.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-25.5 — an internal noindex route renders one Backstage
 *          gallery through two placement layouts (masonry, slideshow)
 *          without the underlying gallery changing (PRD §14). Three
 *          required assertions: (1) the masonry route reserves every image's
 *          aspect-ratio space before load, so no image-caused layout shift
 *          is possible; (2) the masonry route's rendered order and each
 *          image's rendered aspect ratio match the raw Backstage
 *          `GET /api/gallery/:slug/photos` response exactly, with no
 *          `object-fit: cover`/crop; (3) the slideshow route's rendered
 *          image assets are always exactly the current and next image,
 *          never the full set, including after navigating. A fourth suite
 *          proves the demo route itself feeds both layouts from one fetch of
 *          the same gallery and stays excluded from indexing/navigation.
 * created-by: dev-team
 * related-story: US-25
 * related-ac: 25.5
 * ---
 */
import { fireEvent, render, screen, within } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

import { GalleryMasonryLayout } from '@/components/gallery/GalleryMasonryLayout'
import { GallerySlideshowLayout } from '@/components/gallery/GallerySlideshowLayout'
import { mapBackstageGalleryToImages } from '@/components/gallery/backstageGalleryMapper'
import type { GalleryPhotosResponse } from '@/lib/backstageClient'

jest.mock('@/lib/backstageClient')

// Imported after jest.mock so these resolve to the mocked module — static
// imports throughout (no jest.resetModules()/dynamic import mid-test), since
// resetting the module registry mid-suite would also reload React itself and
// produce a second React copy alongside the one @testing-library/react
// already holds a reference to.
import { fetchPublishedGallery } from '@/lib/backstageClient'
import GalleryPlacementDemoPage, {
  metadata as demoPageMetadata,
  PLACEMENT_DEMO_GALLERY_SLUG,
} from '@/app/(frontend)/dev/gallery-placement-demo/page'

const fetchPublishedGalleryMock = fetchPublishedGallery as jest.MockedFunction<typeof fetchPublishedGallery>

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const DEMO_PAGE_PATH = 'src/app/(frontend)/dev/gallery-placement-demo/page.tsx'

// Stands in for a real `GET /api/gallery/:slug/photos` response: five photos
// in the photographer's chosen order, each with its own received
// width/height, deliberately not sorted by aspect ratio or id, so an
// order-preservation bug (e.g. an accidental sort) would be caught.
const rawPhotosResponse: GalleryPhotosResponse = {
  event: { event_name: 'AC-25.5 demo gallery' },
  photos: [
    {
      id: 101,
      filename: 'wide.jpg',
      url: 'https://cdn.example/wide.jpg',
      thumbnail_url: 'https://cdn.example/wide-thumb.jpg',
      preview_url: 'https://cdn.example/wide-medium.jpg',
      hero_url: 'https://cdn.example/wide-large.jpg',
      width: 1600,
      height: 900,
    },
    {
      id: 102,
      filename: 'square.jpg',
      url: 'https://cdn.example/square.jpg',
      thumbnail_url: 'https://cdn.example/square-thumb.jpg',
      preview_url: 'https://cdn.example/square-medium.jpg',
      hero_url: 'https://cdn.example/square-large.jpg',
      width: 1000,
      height: 1000,
    },
    {
      id: 103,
      filename: 'tall.jpg',
      url: 'https://cdn.example/tall.jpg',
      thumbnail_url: 'https://cdn.example/tall-thumb.jpg',
      preview_url: 'https://cdn.example/tall-medium.jpg',
      hero_url: 'https://cdn.example/tall-large.jpg',
      width: 800,
      height: 1200,
    },
    {
      id: 104,
      filename: 'wide2.jpg',
      url: 'https://cdn.example/wide2.jpg',
      thumbnail_url: 'https://cdn.example/wide2-thumb.jpg',
      preview_url: 'https://cdn.example/wide2-medium.jpg',
      hero_url: 'https://cdn.example/wide2-large.jpg',
      width: 1920,
      height: 1080,
    },
    {
      id: 105,
      filename: 'portrait.jpg',
      url: 'https://cdn.example/portrait.jpg',
      thumbnail_url: 'https://cdn.example/portrait-thumb.jpg',
      preview_url: 'https://cdn.example/portrait-medium.jpg',
      hero_url: 'https://cdn.example/portrait-large.jpg',
      width: 900,
      height: 1350,
    },
  ],
}

// Real Flow A response -> Gallery Engine images, the exact pipeline the demo
// route itself runs (backstageClient.fetchPublishedGallery ->
// backstageGalleryMapper.mapBackstageGalleryToImages), so these layout tests
// exercise the same shape the route feeds them, not a hand-rolled stand-in.
const demoImages = mapBackstageGalleryToImages(rawPhotosResponse)

/** Reads an inline `aspect-ratio` style as [width, height] numbers, tolerant of whitespace differences jsdom may normalize. */
function parseAspectRatio(style: CSSStyleDeclaration): [number, number] {
  const match = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(style.aspectRatio)
  if (!match) throw new Error(`Expected an "W / H" aspect-ratio, got "${style.aspectRatio}"`)
  return [Number(match[1]), Number(match[2])]
}

describe('AC-25.5: masonry route reserves aspect-ratio space before load — zero image-caused layout shift', () => {
  it('every rendered item has its aspect-ratio space reserved synchronously, with no wait for image load', () => {
    render(<GalleryMasonryLayout images={demoImages} />)

    // Asserted immediately after render, before any 'load' event could ever
    // fire in jsdom (which never actually loads image bytes) — proving the
    // reserved space does not depend on the asset arriving.
    const items = screen.getAllByTestId(/^masonry-item-\d+$/)
    expect(items).toHaveLength(rawPhotosResponse.photos.length)

    items.forEach((item, index) => {
      const [w, h] = parseAspectRatio(item.style)
      const photo = rawPhotosResponse.photos[index]
      expect(w / h).toBeCloseTo((photo.width as number) / (photo.height as number))
    })
  })

  it('reserves a real (non-zero, non-collapsed) aspect ratio for every item, so no item can collapse to zero height pre-load', () => {
    render(<GalleryMasonryLayout images={demoImages} />)

    for (const item of screen.getAllByTestId(/^masonry-item-\d+$/)) {
      const [w, h] = parseAspectRatio(item.style)
      expect(w).toBeGreaterThan(0)
      expect(h).toBeGreaterThan(0)
    }
  })
})

describe('AC-25.5: masonry route order and aspect ratio match GET /api/gallery/:slug/photos exactly, with no crop', () => {
  it('renders items in the exact order the photos response returned them, driven by real photo ids, not a re-sort', () => {
    render(<GalleryMasonryLayout images={demoImages} />)

    const renderedIds = screen
      .getAllByTestId(/^masonry-item-\d+$/)
      .map((item) => item.getAttribute('data-image-id'))

    expect(renderedIds).toEqual(rawPhotosResponse.photos.map((photo) => String(photo.id)))
  })

  it("each rendered item's aspect ratio matches that exact photo's received width/height", () => {
    render(<GalleryMasonryLayout images={demoImages} />)

    const items = screen.getAllByTestId(/^masonry-item-\d+$/)
    rawPhotosResponse.photos.forEach((photo) => {
      const item = items.find((el) => el.getAttribute('data-image-id') === String(photo.id))
      expect(item).toBeDefined()
      const [w, h] = parseAspectRatio(item!.style)
      expect([w, h]).toEqual([photo.width, photo.height])
    })
  })

  it('never applies object-fit: cover or a cropping class to a masonry image', () => {
    render(<GalleryMasonryLayout images={demoImages} />)

    const masonry = screen.getByTestId('gallery-masonry')
    for (const img of within(masonry).getAllByRole('img')) {
      expect(img.className).not.toMatch(/object-cover/)
      expect((img as HTMLImageElement).style.objectFit).not.toBe('cover')
    }
  })

  it('renders each image at its full received url, not a cropped/derived-only source swap', () => {
    render(<GalleryMasonryLayout images={demoImages} />)

    const masonry = screen.getByTestId('gallery-masonry')
    rawPhotosResponse.photos.forEach((photo) => {
      expect(within(masonry).getByAltText(photo.filename).getAttribute('src')).toBe(photo.hero_url)
    })
  })
})

describe('AC-25.5: slideshow route network requests show only the current and next image, never the full set', () => {
  it('on initial render, only the first and second images are present as image assets', () => {
    render(<GallerySlideshowLayout images={demoImages} />)

    // Raw DOM query, not a role query: an asset the browser will fetch is an
    // <img> tag regardless of its accessible role (the hidden preload image
    // below is deliberately alt="" + aria-hidden, which removes it from the
    // accessibility tree but not from what the browser requests).
    const slideshow = screen.getByTestId('gallery-slideshow')
    const srcs = Array.from(slideshow.querySelectorAll('img')).map((img) => img.getAttribute('src'))

    expect(srcs.sort()).toEqual(
      [rawPhotosResponse.photos[0].hero_url, rawPhotosResponse.photos[1].hero_url].sort(),
    )
  })

  it('never renders assets for images beyond current+next, for a gallery of five', () => {
    render(<GallerySlideshowLayout images={demoImages} />)

    const html = screen.getByTestId('gallery-slideshow').innerHTML
    for (const photo of rawPhotosResponse.photos.slice(2)) {
      expect(html).not.toContain(photo.hero_url)
    }
  })

  it('advancing to the next slide still shows exactly two assets — the new current and new next — dropping the one that fell behind', () => {
    render(<GallerySlideshowLayout images={demoImages} />)

    fireEvent.click(screen.getByTestId('nav-next'))

    const slideshow = screen.getByTestId('gallery-slideshow')
    const srcs = Array.from(slideshow.querySelectorAll('img'))
      .map((img) => img.getAttribute('src'))
      .sort()

    expect(srcs).toEqual(
      [rawPhotosResponse.photos[1].hero_url, rawPhotosResponse.photos[2].hero_url].sort(),
    )
    expect(slideshow.innerHTML).not.toContain(rawPhotosResponse.photos[0].hero_url)
    expect(slideshow.innerHTML).not.toContain(rawPhotosResponse.photos[3].hero_url)
    expect(slideshow.innerHTML).not.toContain(rawPhotosResponse.photos[4].hero_url)
  })

  it('the hidden preload image is marked aria-hidden, never presented as a visible/active slide', () => {
    render(<GallerySlideshowLayout images={demoImages} />)

    const preload = screen.getByTestId('slideshow-preload-next').querySelector('img')
    expect(preload).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('AC-25.5: the internal demo route renders the same fetched gallery through both placements', () => {
  afterEach(() => {
    fetchPublishedGalleryMock.mockReset()
  })

  it('feeds masonry and slideshow from one Flow A fetch of the same gallery — same photo set, same order', async () => {
    fetchPublishedGalleryMock.mockResolvedValue({
      ok: true,
      info: { event_name: 'AC-25.5 demo gallery' } as never,
      photos: rawPhotosResponse,
    })

    render(await GalleryPlacementDemoPage())

    expect(fetchPublishedGalleryMock).toHaveBeenCalledWith(PLACEMENT_DEMO_GALLERY_SLUG)

    const masonrySection = within(screen.getByTestId('masonry-placement-demo'))
    const slideshowSection = within(screen.getByTestId('slideshow-placement-demo'))

    expect(masonrySection.getAllByTestId(/^masonry-item-\d+$/)).toHaveLength(
      rawPhotosResponse.photos.length,
    )
    expect(slideshowSection.getByAltText(rawPhotosResponse.photos[0].filename)).toHaveAttribute(
      'src',
      rawPhotosResponse.photos[0].hero_url,
    )
  })

  it('renders empty placements rather than throwing when the gallery fetch fails', async () => {
    fetchPublishedGalleryMock.mockResolvedValue({
      ok: false,
      reason: 'not_found',
      status: 404,
      error: 'Gallery not found',
      step: 'info',
    })

    render(await GalleryPlacementDemoPage())

    expect(within(screen.getByTestId('masonry-placement-demo')).getByRole('status')).toBeInTheDocument()
    expect(within(screen.getByTestId('slideshow-placement-demo')).getByRole('status')).toBeInTheDocument()
  })
})

describe('AC-25.5: the demo route is internal — noindex, not linked from public navigation', () => {
  it('sets robots index/follow to false', () => {
    expect(demoPageMetadata.robots).toEqual({ index: false, follow: false })
  })

  it('the public homepage does not link to the demo route', () => {
    const src = read('src/app/(frontend)/page.tsx')
    expect(src).not.toMatch(/dev\/gallery-placement-demo/)
  })

  it('the shared frontend layout does not link to the demo route', () => {
    const src = read('src/app/(frontend)/layout.tsx')
    expect(src).not.toMatch(/dev\/gallery-placement-demo/)
  })

  it('no file outside the demo route itself links to it', () => {
    const appDir = path.join(root, 'src/app')
    const offenders: string[] = []

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
        } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
          const relative = path.relative(root, full)
          if (relative === DEMO_PAGE_PATH) continue
          const contents = fs.readFileSync(full, 'utf8')
          if (contents.includes('dev/gallery-placement-demo')) offenders.push(relative)
        }
      }
    }
    walk(appDir)

    expect(offenders).toEqual([])
  })
})
