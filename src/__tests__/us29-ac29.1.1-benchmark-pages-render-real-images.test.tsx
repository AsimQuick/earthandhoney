/**
 * ---
 * file: src/__tests__/us29-ac29.1.1-benchmark-pages-render-real-images.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-29.1.1 — the two representative pages
 *          R2_STORAGE_AND_DELIVERY_ADR.md's benchmark section names (a
 *          portfolio gallery page and a blog/story gallery page) render
 *          real Backstage gallery imagery on the
 *          resolveGalleryPlacementImages `ok` path, and never silently
 *          substitute GalleryUnavailablePlaceholder while doing so — a
 *          benchmark page that falls back to the placeholder measures
 *          nothing, which is exactly what
 *          scripts/benchmark/results/run-2026-08-08T13-2*.json's
 *          `imageRequestCount: 1` (the site logo alone, on both pages)
 *          silently did.
 *          Three layers, because the unit layer alone is what produced that
 *          false green: (1) the pages render one <img> per resolved photo
 *          and no placeholder on the `ok` path; (2) the placeholder path
 *          still exists for real outages; (3) the live render proof
 *          retained under scripts/benchmark/results/ac29.1.1-render-proof/
 *          is re-read here and re-asserted, so a future run that captures
 *          logo-only HTML cannot be committed as passing evidence.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.1.1
 * ---
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { render, screen } from '@testing-library/react'

import type { GalleryPhotosResponse } from '@/lib/backstageClient'

jest.mock('@/lib/backstageClient')

// Imported after jest.mock, matching this repo's established convention (see
// us25-ac25.6-gallery-placement-failure-handling.test.tsx) — the benchmark
// pages call resolveGalleryPlacementImages, which calls through to this
// mocked fetchPublishedGallery internally.
import { fetchPublishedGallery } from '@/lib/backstageClient'
import { PLACEMENT_DEMO_GALLERY_SLUG } from '@/lib/galleryRevalidation'
import {
  BENCHMARK_PORTFOLIO_GALLERY_PATH,
  BENCHMARK_STORY_GALLERY_PATH,
} from '@/lib/benchmarkPages'
import BenchmarkPortfolioGalleryPage from '@/app/(frontend)/dev/benchmark-portfolio-gallery/page'
import BenchmarkStoryGalleryPage from '@/app/(frontend)/dev/benchmark-story-gallery/page'

const fetchPublishedGalleryMock = fetchPublishedGallery as jest.MockedFunction<typeof fetchPublishedGallery>

const photosResponse: GalleryPhotosResponse = {
  event: { event_name: 'AC-29.1.1 benchmark gallery' },
  photos: [
    {
      id: 1,
      filename: 'one.jpg',
      url: 'https://cdn.example/one.jpg',
      thumbnail_url: 'https://cdn.example/one-thumb.jpg',
      width: 1600,
      height: 900,
    },
    {
      id: 2,
      filename: 'two.jpg',
      url: 'https://cdn.example/two.jpg',
      thumbnail_url: 'https://cdn.example/two-thumb.jpg',
      width: 900,
      height: 1350,
    },
  ],
}

/**
 * Counts every <img> actually in the DOM, including ones a role query cannot
 * see. GallerySlideshowLayout's preload sibling carries `aria-hidden="true"`
 * (deliberately — it is a warm-the-cache asset, not content), so
 * `getAllByRole('img')` under-reports the story page by exactly one. The
 * benchmark cares about requests issued, not about accessible names.
 */
const imgElements = (container: HTMLElement) => Array.from(container.querySelectorAll('img'))

/**
 * The rendered `src` is whatever createGalleryImageLoader picked for the
 * measured width, so it is the full-size URL on one layout and the
 * thumbnail on the other. Asserting "this photo's asset is on the page"
 * rather than "this exact variant is on the page" keeps the check about
 * AC-29.1.1's subject — real Backstage imagery instead of a placeholder —
 * and leaves which resolution each page requests to AC-29.1's payload audit.
 */
const rendersEveryResolvedPhoto = (sources: (string | null)[]) =>
  photosResponse.photos.every((photo) =>
    sources.some((src) => src === photo.url || src === photo.thumbnail_url),
  )

describe('AC-29.1.1: the benchmark pages render real gallery imagery on the ok path', () => {
  beforeEach(() => {
    fetchPublishedGalleryMock.mockResolvedValue({
      ok: true,
      info: { event_name: 'AC-29.1.1 benchmark gallery' } as never,
      photos: photosResponse,
    } as never)
  })

  afterEach(() => {
    fetchPublishedGalleryMock.mockReset()
  })

  it('resolves both pages against the same US-25 placement gallery via Flow A', async () => {
    await BenchmarkPortfolioGalleryPage()
    await BenchmarkStoryGalleryPage()

    expect(fetchPublishedGalleryMock).toHaveBeenCalledTimes(2)
    for (const call of fetchPublishedGalleryMock.mock.calls) {
      expect(call[0]).toBe(PLACEMENT_DEMO_GALLERY_SLUG)
    }
  })

  it('renders one <img> per resolved photo on the portfolio page, never the unavailable placeholder', async () => {
    const { container } = render(await BenchmarkPortfolioGalleryPage())

    expect(screen.getByTestId('benchmark-portfolio-page')).toBeInTheDocument()
    // Every resolved photo shows up as an <img> pointing at the resolved
    // Backstage asset — the exact thing the false-green run failed to prove
    // (it counted one request, the site logo, because the placeholder had
    // silently taken over).
    const sources = imgElements(container).map((img) => img.getAttribute('src'))
    expect(sources).toHaveLength(photosResponse.photos.length)
    expect(rendersEveryResolvedPhoto(sources)).toBe(true)
    expect(screen.queryByTestId('gallery-placement-unavailable')).not.toBeInTheDocument()
  })

  it('renders one <img> per resolved photo on the story page, never the unavailable placeholder', async () => {
    const { container } = render(await BenchmarkStoryGalleryPage())

    expect(screen.getByTestId('benchmark-story-page')).toBeInTheDocument()
    expect(screen.getByTestId('benchmark-story-copy')).toBeInTheDocument()
    expect(screen.getByTestId('benchmark-story-gallery')).toBeInTheDocument()

    // The slideshow mounts the current slide plus its preload sibling, so
    // both resolved photos are requested — a genuinely different loading
    // shape from the portfolio page's all-at-once masonry, which is the
    // reason the ADR names two representative pages instead of one.
    expect(screen.getByTestId('slideshow-current')).toBeInTheDocument()
    expect(screen.getByTestId('slideshow-preload-next')).toBeInTheDocument()
    const sources = imgElements(container).map((img) => img.getAttribute('src'))
    expect(sources).toHaveLength(photosResponse.photos.length)
    expect(rendersEveryResolvedPhoto(sources)).toBe(true)
    expect(screen.queryByTestId('gallery-placement-unavailable')).not.toBeInTheDocument()
  })

  it('falls back to the unavailable placeholder, not a silent empty gallery, when Backstage cannot be reached', async () => {
    // The inverse of the above — proves the placeholder path still exists
    // for real outages, so AC-29.1.1's "never substitutes the placeholder
    // on the ok path" is a claim about the ok path specifically, not a
    // claim that the placeholder was deleted.
    fetchPublishedGalleryMock.mockResolvedValue({
      ok: false,
      step: 'info',
      reason: 'not_found',
      status: 404,
      error: 'Gallery not found, archived, or not yet published',
    } as never)

    const portfolio = render(await BenchmarkPortfolioGalleryPage())
    expect(screen.getByTestId('gallery-placement-unavailable')).toBeInTheDocument()
    expect(imgElements(portfolio.container)).toHaveLength(0)
    portfolio.unmount()

    const story = render(await BenchmarkStoryGalleryPage())
    expect(screen.getByTestId('gallery-placement-unavailable')).toBeInTheDocument()
    expect(imgElements(story.container)).toHaveLength(0)
  })

  it('exposes both page paths from the single source of truth the live render proof fetches', () => {
    expect(BENCHMARK_PORTFOLIO_GALLERY_PATH).toBe('/dev/benchmark-portfolio-gallery')
    expect(BENCHMARK_STORY_GALLERY_PATH).toBe('/dev/benchmark-story-gallery')

    // scripts/ac29.1.1-benchmark-render-proof.sh cannot import a TypeScript
    // constant, so it repeats the two paths as literals — the same
    // hand-synced duplication scripts/webhook-live-proof-setup.sh already
    // uses for its slugs. This asserts the copies still agree, which is the
    // only thing that makes benchmarkPages.ts a single source of truth in
    // practice rather than in intent.
    const script = readFileSync(join(process.cwd(), 'scripts/ac29.1.1-benchmark-render-proof.sh'), 'utf8')
    expect(script).toContain(BENCHMARK_PORTFOLIO_GALLERY_PATH)
    expect(script).toContain(BENCHMARK_STORY_GALLERY_PATH)
    expect(script).toContain(PLACEMENT_DEMO_GALLERY_SLUG)
  })
})

describe('AC-29.1.1: the retained live render proof shows real gallery imagery, not a logo-only false green', () => {
  const PROOF_DIR = join(process.cwd(), 'scripts/benchmark/results/ac29.1.1-render-proof')

  const cases = [
    { path: BENCHMARK_PORTFOLIO_GALLERY_PATH, file: 'benchmark-portfolio-gallery.html' },
    { path: BENCHMARK_STORY_GALLERY_PATH, file: 'benchmark-story-gallery.html' },
  ]

  it.each(cases)(
    'the captured HTML for $path carries more than one gallery <img> and no placeholder',
    ({ file }) => {
      const html = readFileSync(join(PROOF_DIR, file), 'utf8')

      // Counts only <img> tags served by the Backstage gallery route for the
      // seeded slug. Counting every <img> is what let the false green
      // through: the site logo in the shared header is an <img> too, so
      // "at least one image" was true on a page rendering nothing but the
      // placeholder.
      const galleryImages =
        html.match(new RegExp(`<img[^>]*src="[^"]*/api/gallery/${PLACEMENT_DEMO_GALLERY_SLUG}/[^"]*"`, 'g')) ?? []

      expect(galleryImages.length).toBeGreaterThan(1)
      expect(html).not.toContain('gallery-placement-unavailable')
      expect(html).not.toContain('This gallery is temporarily unavailable')
    },
  )

  it('records the seeding command the proof was captured against', () => {
    const summary = JSON.parse(readFileSync(join(PROOF_DIR, 'render-proof-summary.json'), 'utf8'))

    expect(summary.gallerySlug).toBe(PLACEMENT_DEMO_GALLERY_SLUG)
    expect(summary.seedingCommand).toContain('ac29.1.1-benchmark-render-proof.sh')
    expect(summary.routes.map((route: { path: string }) => route.path).sort()).toEqual(
      [BENCHMARK_PORTFOLIO_GALLERY_PATH, BENCHMARK_STORY_GALLERY_PATH].sort(),
    )
    for (const route of summary.routes) {
      expect(route.httpStatus).toBe(200)
      expect(route.galleryImageCount).toBeGreaterThan(1)
      expect(route.placeholderOccurrences).toBe(0)
    }
  })
})
