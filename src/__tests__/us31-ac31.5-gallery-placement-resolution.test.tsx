/**
 * ---
 * file: src/__tests__/us31-ac31.5-gallery-placement-resolution.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-31.5 — (1) the field-definition evidence: `Pages`'
 *          `galleryPlacements` field is a relationship into Payload's own
 *          `gallery-placements` collection only, never a relation/join into
 *          the separate Backstage database, and that collection itself
 *          stores the Backstage gallery identifier as a plain external
 *          `gallerySlug` text field (Reminder 4, the rule US-25 established);
 *          (2) resolvePageGalleryPlacements resolves each placement through
 *          the existing Flow A boundary (backstageGalleryPlacement ->
 *          backstageClient/backstageGalleryMapper) into the correct layout
 *          component, in order, on success; (3) a placement whose gallery is
 *          unavailable (unreachable Backstage, timeout, 404 slug) renders
 *          GalleryUnavailablePlaceholder instead of failing, and one
 *          placement's failure never affects another's success. A live
 *          round-trip against a real Backstage gallery and against a made-
 *          unreachable one is us31-ac31.5-public-page-gallery-placement.test.ts.
 * created-by: dev-team
 * related-story: US-31
 * related-ac: 31.5
 * ---
 */
import { render, screen, within } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

import type { Field } from 'payload'

import { GalleryPlacements } from '@/collections/GalleryPlacements'
import { Pages } from '@/collections/Pages'

jest.mock('@/lib/backstageClient')

import type { GalleryPhotosResponse } from '@/lib/backstageClient'
import { fetchPublishedGallery } from '@/lib/backstageClient'
import { resolvePageGalleryPlacements } from '@/lib/resolvePageGalleryPlacements'

const fetchPublishedGalleryMock = fetchPublishedGallery as jest.MockedFunction<typeof fetchPublishedGallery>

function fieldByName(fields: Field[], name: string): Field | undefined {
  return fields.find((field) => 'name' in field && field.name === name)
}

function collectFieldTypes(fields: Field[]): string[] {
  const types: string[] = []
  for (const field of fields) {
    types.push(field.type)
    if ('fields' in field && Array.isArray(field.fields)) {
      types.push(...collectFieldTypes(field.fields as Field[]))
    }
  }
  return types
}

describe('AC-31.5: field definition — no relationship/join into the Backstage database', () => {
  it('Pages.galleryPlacements is a relationship into the Payload-owned gallery-placements collection, not a Backstage relation', () => {
    const galleryPlacements = fieldByName(Pages.fields, 'galleryPlacements')
    expect(galleryPlacements?.type).toBe('relationship')
    expect(galleryPlacements && 'relationTo' in galleryPlacements ? galleryPlacements.relationTo : undefined).toBe(
      'gallery-placements',
    )
  })

  it('the gallery-placements collection this field points to holds the Backstage gallery as plain text, never a relation/join', () => {
    const gallerySlug = fieldByName(GalleryPlacements.fields, 'gallerySlug')
    expect(gallerySlug?.type).toBe('text')
    expect(gallerySlug && 'relationTo' in gallerySlug ? (gallerySlug as unknown) : undefined).toBeUndefined()

    const types = collectFieldTypes(GalleryPlacements.fields)
    expect(types).not.toContain('relationship')
    expect(types).not.toContain('join')
  })

  it('neither collection source references the Backstage database', () => {
    const pagesSource = fs.readFileSync(path.join(process.cwd(), 'src/collections/Pages.ts'), 'utf8')
    const placementsSource = fs.readFileSync(path.join(process.cwd(), 'src/collections/GalleryPlacements.ts'), 'utf8')
    expect(pagesSource).not.toMatch(/backstage-db/)
    expect(placementsSource).not.toMatch(/backstage-db/)
  })
})

describe('AC-31.5: resolvePageGalleryPlacements resolves through the Flow A boundary', () => {
  afterEach(() => {
    fetchPublishedGalleryMock.mockReset()
  })

  const okPhotosResponse: GalleryPhotosResponse = {
    event: { event_name: 'AC-31.5 gallery' },
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

  it('renders a masonry layout for a masonry placement whose gallery resolves', async () => {
    fetchPublishedGalleryMock.mockResolvedValue({
      ok: true,
      info: { event_name: 'AC-31.5 gallery' } as never,
      photos: okPhotosResponse,
    })

    const nodes = await resolvePageGalleryPlacements([{ gallerySlug: 'real-gallery', layout: 'masonry' }])
    render(<>{nodes}</>)

    expect(fetchPublishedGalleryMock).toHaveBeenCalledWith('real-gallery', {})
    expect(screen.getByTestId('gallery-masonry')).toBeInTheDocument()
    expect(screen.queryByTestId('gallery-placement-unavailable')).not.toBeInTheDocument()
  })

  it('renders a slideshow layout for a slideshow placement whose gallery resolves', async () => {
    fetchPublishedGalleryMock.mockResolvedValue({
      ok: true,
      info: { event_name: 'AC-31.5 gallery' } as never,
      photos: okPhotosResponse,
    })

    const nodes = await resolvePageGalleryPlacements([{ gallerySlug: 'real-gallery', layout: 'slideshow' }])
    render(<>{nodes}</>)

    expect(screen.getByTestId('gallery-slideshow')).toBeInTheDocument()
  })

  it('renders GalleryUnavailablePlaceholder, not the layout, when the gallery is unreachable — never throws', async () => {
    fetchPublishedGalleryMock.mockResolvedValue({
      ok: false,
      reason: 'network_error',
      status: null,
      error: 'Network error fetching gallery info for "unreachable-gallery": ECONNREFUSED',
      step: 'info',
    })

    await expect(
      resolvePageGalleryPlacements([{ gallerySlug: 'unreachable-gallery', layout: 'masonry' }]),
    ).resolves.not.toThrow()

    const nodes = await resolvePageGalleryPlacements([{ gallerySlug: 'unreachable-gallery', layout: 'masonry' }])
    render(<>{nodes}</>)

    expect(screen.getByTestId('gallery-placement-unavailable')).toBeInTheDocument()
    expect(screen.queryByTestId('gallery-masonry')).not.toBeInTheDocument()
  })

  it('renders GalleryUnavailablePlaceholder on a 404 slug and on a timeout, each independently, preserving order across multiple placements', async () => {
    fetchPublishedGalleryMock.mockImplementation(async (slug) => {
      if (slug === 'ok-gallery') {
        return { ok: true, info: { event_name: 'ok' } as never, photos: okPhotosResponse }
      }
      if (slug === 'missing-gallery') {
        return { ok: false, reason: 'not_found', status: 404, error: 'not found', step: 'info' }
      }
      return { ok: false, reason: 'timeout', status: null, error: 'timed out', step: 'info' }
    })

    const nodes = await resolvePageGalleryPlacements([
      { gallerySlug: 'ok-gallery', layout: 'masonry', heading: 'First' },
      { gallerySlug: 'missing-gallery', layout: 'masonry', heading: 'Second' },
      { gallerySlug: 'slow-gallery', layout: 'slideshow', heading: 'Third' },
    ])

    expect(nodes).toHaveLength(3)
    render(
      <>
        <div data-testid="slot-0">{nodes[0]}</div>
        <div data-testid="slot-1">{nodes[1]}</div>
        <div data-testid="slot-2">{nodes[2]}</div>
      </>,
    )

    expect(within(screen.getByTestId('slot-0')).getByTestId('gallery-masonry')).toBeInTheDocument()
    expect(within(screen.getByTestId('slot-1')).getByTestId('gallery-placement-unavailable')).toHaveTextContent(
      /^Second:/,
    )
    expect(within(screen.getByTestId('slot-2')).getByTestId('gallery-placement-unavailable')).toHaveTextContent(
      /^Third:/,
    )
  })
})
