/**
 * ---
 * file: src/__tests__/us25-ac25.6-gallery-placement-failure-handling.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-25.6 — an unreachable Backstage, a timeout, or a 404
 *          slug renders the page with a placeholder for that placement and a
 *          logged error, never a 500, never a partially rendered gallery
 *          presented as complete. Two suites, matching the AC's stated test
 *          plan exactly: (1) resolveGalleryPlacementImages
 *          (src/lib/backstageGalleryPlacement.ts) driven directly against
 *          every backstageClient failure reason, including a slug that does
 *          not exist (`not_found`) and a simulated Backstage timeout
 *          (`timeout`); (2) the AC-25.5 demo route rendering
 *          GalleryUnavailablePlaceholder — not the layouts' own "No images
 *          to display" empty state — for both placements on either failure,
 *          without throwing.
 * created-by: dev-team
 * related-story: US-25
 * related-ac: 25.6
 * ---
 */
import { render, screen, within } from '@testing-library/react'

import { GalleryUnavailablePlaceholder } from '@/components/gallery/GalleryUnavailablePlaceholder'
import type { GalleryPhotosResponse } from '@/lib/backstageClient'
import { logError } from '@/lib/logger'

jest.mock('@/lib/backstageClient')

// Imported after jest.mock, matching this repo's established convention (see
// us25-ac25.5-gallery-placement-layouts.test.tsx) — resolveGalleryPlacementImages
// calls through to this mocked fetchPublishedGallery internally.
import { fetchPublishedGallery } from '@/lib/backstageClient'
import { resolveGalleryPlacementImages } from '@/lib/backstageGalleryPlacement'
import GalleryPlacementDemoPage, {
  PLACEMENT_DEMO_GALLERY_SLUG,
} from '@/app/(frontend)/dev/gallery-placement-demo/page'

const fetchPublishedGalleryMock = fetchPublishedGallery as jest.MockedFunction<typeof fetchPublishedGallery>

const okPhotosResponse: GalleryPhotosResponse = {
  event: { event_name: 'AC-25.6 demo gallery' },
  photos: [
    {
      id: 1,
      filename: 'one.jpg',
      url: 'https://cdn.example/one.jpg',
      thumbnail_url: 'https://cdn.example/one-thumb.jpg',
      width: 800,
      height: 600,
    },
  ],
}

describe('AC-25.6: resolveGalleryPlacementImages never throws and logs on every failure reason', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    fetchPublishedGalleryMock.mockReset()
    consoleErrorSpy.mockRestore()
  })

  it('returns the mapped images and logs nothing when Flow A succeeds', async () => {
    fetchPublishedGalleryMock.mockResolvedValue({
      ok: true,
      info: { event_name: 'AC-25.6 demo gallery' } as never,
      photos: okPhotosResponse,
    })

    const result = await resolveGalleryPlacementImages('a-real-gallery')

    expect(result).toEqual({ status: 'ok', images: expect.any(Array) })
    expect(result.status === 'ok' && result.images).toHaveLength(1)
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('a slug that does not exist (404, not_found) resolves to unavailable and logs the slug and reason — never throws', async () => {
    fetchPublishedGalleryMock.mockResolvedValue({
      ok: false,
      reason: 'not_found',
      status: 404,
      error: 'Gallery not found, archived, or not yet published',
      step: 'info',
    })

    const result = await resolveGalleryPlacementImages('does-not-exist')

    expect(result).toEqual({ status: 'unavailable', reason: 'not_found' })
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    const [loggedLine] = consoleErrorSpy.mock.calls[0]
    expect(loggedLine).toEqual(
      expect.stringContaining('"slug":"does-not-exist"'),
    )
    expect(loggedLine).toEqual(expect.stringContaining('"reason":"not_found"'))
    expect(loggedLine).toEqual(expect.stringContaining('"status":404'))
  })

  it('a simulated Backstage timeout resolves to unavailable and logs the timeout reason — never throws', async () => {
    fetchPublishedGalleryMock.mockResolvedValue({
      ok: false,
      reason: 'timeout',
      status: null,
      error: 'Timed out fetching gallery info for "slow-gallery" after 5000ms',
      step: 'info',
    })

    const result = await resolveGalleryPlacementImages('slow-gallery')

    expect(result).toEqual({ status: 'unavailable', reason: 'timeout' })
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    const [loggedLine] = consoleErrorSpy.mock.calls[0]
    expect(loggedLine).toEqual(expect.stringContaining('"reason":"timeout"'))
  })

  it('an unreachable Backstage (network_error) resolves to unavailable and logs — never throws', async () => {
    fetchPublishedGalleryMock.mockResolvedValue({
      ok: false,
      reason: 'network_error',
      status: null,
      error: 'Network error fetching gallery info for "unreachable-gallery": ECONNREFUSED',
      step: 'info',
    })

    const result = await resolveGalleryPlacementImages('unreachable-gallery')

    expect(result).toEqual({ status: 'unavailable', reason: 'network_error' })
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
  })

  it('a failure partway through Flow A (photos step, after info/verify already succeeded) never leaks partial data — resolves to unavailable, not a partial image list', async () => {
    fetchPublishedGalleryMock.mockResolvedValue({
      ok: false,
      reason: 'timeout',
      status: null,
      error: 'Timed out fetching photos for "partial-gallery" after 5000ms',
      step: 'photos',
    })

    const result = await resolveGalleryPlacementImages('partial-gallery')

    expect(result).toEqual({ status: 'unavailable', reason: 'timeout' })
    expect(result).not.toHaveProperty('images')
    const [loggedLine] = consoleErrorSpy.mock.calls[0]
    expect(loggedLine).toEqual(expect.stringContaining('"step":"photos"'))
  })
})

describe('AC-25.6: the demo route renders a placeholder for a placement whose gallery could not be fetched — never a partial gallery, never a throw', () => {
  afterEach(() => {
    fetchPublishedGalleryMock.mockReset()
  })

  it('renders GalleryUnavailablePlaceholder (not the layouts’ own empty-gallery state) in both placements when the slug does not exist', async () => {
    fetchPublishedGalleryMock.mockResolvedValue({
      ok: false,
      reason: 'not_found',
      status: 404,
      error: 'Gallery not found, archived, or not yet published',
      step: 'info',
    })

    render(await GalleryPlacementDemoPage())

    expect(fetchPublishedGalleryMock).toHaveBeenCalledWith(PLACEMENT_DEMO_GALLERY_SLUG, {})

    const masonrySection = within(screen.getByTestId('masonry-placement-demo'))
    const slideshowSection = within(screen.getByTestId('slideshow-placement-demo'))

    expect(masonrySection.getByTestId('gallery-placement-unavailable')).toBeInTheDocument()
    expect(slideshowSection.getByTestId('gallery-placement-unavailable')).toBeInTheDocument()
    // Not the generic zero-photo empty state the layouts render for a real,
    // genuinely empty gallery — this is the distinct failure placeholder.
    expect(masonrySection.queryByTestId('gallery-masonry')).not.toBeInTheDocument()
    expect(slideshowSection.queryByTestId('gallery-slideshow')).not.toBeInTheDocument()
  })

  it('renders GalleryUnavailablePlaceholder in both placements on a simulated Backstage timeout, without throwing', async () => {
    fetchPublishedGalleryMock.mockResolvedValue({
      ok: false,
      reason: 'timeout',
      status: null,
      error: `Timed out fetching gallery info for "${PLACEMENT_DEMO_GALLERY_SLUG}" after 5000ms`,
      step: 'info',
    })

    await expect(
      GalleryPlacementDemoPage().then((element) => render(element)),
    ).resolves.not.toThrow()

    const masonrySection = within(screen.getByTestId('masonry-placement-demo'))
    const slideshowSection = within(screen.getByTestId('slideshow-placement-demo'))

    expect(masonrySection.getByTestId('gallery-placement-unavailable')).toBeInTheDocument()
    expect(slideshowSection.getByTestId('gallery-placement-unavailable')).toBeInTheDocument()
  })

  it('never renders any masonry/slideshow image items alongside the placeholder — no partially rendered gallery presented as complete', async () => {
    fetchPublishedGalleryMock.mockResolvedValue({
      ok: false,
      reason: 'timeout',
      status: null,
      error: 'Timed out fetching photos',
      step: 'photos',
    })

    render(await GalleryPlacementDemoPage())

    expect(screen.queryAllByTestId(/^masonry-item-\d+$/)).toHaveLength(0)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})

describe('AC-25.6: logError never throws, even when the fields cannot be JSON-serialized', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('logs a single structured JSON line carrying the message and fields', () => {
    logError('Gallery placement fetch failed', { slug: 'x', reason: 'timeout' })

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    const [loggedLine] = consoleErrorSpy.mock.calls[0]
    expect(JSON.parse(loggedLine)).toEqual({
      level: 'error',
      message: 'Gallery placement fetch failed',
      slug: 'x',
      reason: 'timeout',
    })
  })

  it('falls back to logging the bare message rather than throwing when fields are not JSON-serializable', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular

    expect(() => logError('Gallery placement fetch failed', { circular })).not.toThrow()
    expect(consoleErrorSpy).toHaveBeenCalledWith('Gallery placement fetch failed')
  })
})

describe('AC-25.6: GalleryUnavailablePlaceholder', () => {
  it('renders a polite status message distinct from a real empty gallery', () => {
    render(<GalleryUnavailablePlaceholder />)

    expect(screen.getByTestId('gallery-placement-unavailable')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/temporarily unavailable/i)
  })

  it('prefixes an optional heading onto the message', () => {
    render(<GalleryUnavailablePlaceholder heading="Masonry placement" />)

    expect(screen.getByRole('status')).toHaveTextContent(/^Masonry placement:/)
  })
})
