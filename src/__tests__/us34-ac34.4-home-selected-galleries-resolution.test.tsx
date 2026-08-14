/**
 * ---
 * file: src/__tests__/us34-ac34.4-home-selected-galleries-resolution.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-34.4 — (1) the field-definition evidence:
 *          StudioProfile.homeSelectedGalleriesOrStories is a structured,
 *          explicitly-ordered `relationship` (hasMany, into this database's
 *          own `gallery-placements`/`pages` collections only, never a
 *          Backstage relation — Reminder 4), never a computed/derived field —
 *          the mechanism that makes "curated selection, not automatic
 *          latest N" true is that Payload stores no query/sort/limit
 *          alongside a `relationship` field, only an explicit array of
 *          chosen documents; (2) resolveHomeSelectedGalleriesOrStories
 *          resolves each selection in the exact order given: a
 *          `gallery-placements` entry through the existing Flow A boundary
 *          (backstageGalleryPlacement -> backstageClient) into the correct
 *          layout component, or GalleryUnavailablePlaceholder when that
 *          gallery cannot be reached (never a blank slot, never a thrown
 *          error), and a `pages` entry into a plain story-card link — with
 *          one selection's outcome never affecting another's. A live
 *          reorder proof against a running stack, with no code change, is
 *          us34-ac34.4-home-selected-galleries-reorder-live.test.ts.
 * created-by: dev-team
 * related-story: US-34
 * related-ac: 34.4
 * ---
 */
import { render, screen, within } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

import type { Field } from 'payload'

import { StudioProfile } from '@/globals/StudioProfile'

jest.mock('@/lib/backstageClient')

import type { GalleryPhotosResponse } from '@/lib/backstageClient'
import { fetchPublishedGallery } from '@/lib/backstageClient'
import type { HomeSelectedGalleryOrStory } from '@/lib/getStudioProfile'
import { resolveHomeSelectedGalleriesOrStories } from '@/lib/resolveHomeSelectedGalleriesOrStories'

const fetchPublishedGalleryMock = fetchPublishedGallery as jest.MockedFunction<typeof fetchPublishedGallery>

function fieldByName(fields: Field[], name: string): Field | undefined {
  return fields.find((field) => 'name' in field && field.name === name)
}

describe('AC-34.4: field definition — a curated, ordered, structured selection, not automatic "latest N"', () => {
  it('StudioProfile.homeSelectedGalleriesOrStories is an explicitly-ordered hasMany relationship, never a query/sort/limit field', () => {
    const field = fieldByName(StudioProfile.fields, 'homeSelectedGalleriesOrStories')
    expect(field?.type).toBe('relationship')
    expect(field && 'hasMany' in field ? field.hasMany : undefined).toBe(true)
    // A relationship field carries no query/sort/limit config of its own —
    // its value is an explicit array of documents the photographer picked,
    // so there is no mechanism here that could resolve to "latest N".
    expect(field).not.toHaveProperty('sort')
    expect(field).not.toHaveProperty('limit')
    expect(field).not.toHaveProperty('defaultSort')
  })

  it('points only at this database’s own gallery-placements/pages collections, never a Backstage relation', () => {
    const field = fieldByName(StudioProfile.fields, 'homeSelectedGalleriesOrStories')
    const relationTo = field && 'relationTo' in field ? field.relationTo : undefined
    expect(relationTo).toEqual(['gallery-placements', 'pages'])
  })

  it('the admin description names the photographer as the curator and rules out automatic derivation', () => {
    const field = fieldByName(StudioProfile.fields, 'homeSelectedGalleriesOrStories')
    const description =
      field && 'admin' in field && field.admin && 'description' in field.admin
        ? String(field.admin.description)
        : ''
    expect(description).toMatch(/photographer/i)
    expect(description).toMatch(/never automatically derived/i)
  })

  it('StudioProfile source references no Backstage database relation for this field', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/globals/StudioProfile.ts'), 'utf8')
    expect(source).not.toMatch(/backstage-db/)
  })
})

describe('AC-34.4: resolveHomeSelectedGalleriesOrStories resolves each selection in order', () => {
  afterEach(() => {
    fetchPublishedGalleryMock.mockReset()
  })

  const okPhotosResponse: GalleryPhotosResponse = {
    event: { event_name: 'AC-34.4 selected gallery' },
    photos: [
      {
        id: 1,
        filename: 'selected-one.jpg',
        url: 'https://cdn.example/selected-one.jpg',
        thumbnail_url: 'https://cdn.example/selected-one-thumb.jpg',
        width: 1200,
        height: 800,
      },
    ],
  }

  it('renders a masonry layout for a reachable gallery-placements selection', async () => {
    fetchPublishedGalleryMock.mockResolvedValue({
      ok: true,
      info: { event_name: 'AC-34.4 selected gallery' } as never,
      photos: okPhotosResponse,
    })

    const selections: HomeSelectedGalleryOrStory[] = [
      { relationTo: 'gallery-placements', gallerySlug: 'real-selected-gallery', layout: 'masonry' },
    ]
    const nodes = await resolveHomeSelectedGalleriesOrStories(selections)
    render(<>{nodes}</>)

    expect(fetchPublishedGalleryMock).toHaveBeenCalledWith('real-selected-gallery', {})
    expect(screen.getByTestId('gallery-masonry')).toBeInTheDocument()
  })

  it('renders a story card linking to the page slug for a pages selection, with no Flow A call', async () => {
    const selections: HomeSelectedGalleryOrStory[] = [
      { relationTo: 'pages', slug: 'our-story', heading: 'Our Story', shortIntroduction: 'How it began.' },
    ]
    const nodes = await resolveHomeSelectedGalleriesOrStories(selections)
    render(<>{nodes}</>)

    expect(fetchPublishedGalleryMock).not.toHaveBeenCalled()
    const card = screen.getByTestId('home-selected-story-card')
    expect(card).toHaveAttribute('href', '/our-story')
    expect(within(card).getByText('Our Story')).toBeInTheDocument()
    expect(within(card).getByText('How it began.')).toBeInTheDocument()
  })

  it('renders GalleryUnavailablePlaceholder, not a blank slot, when a gallery selection is unreachable — never throws', async () => {
    fetchPublishedGalleryMock.mockResolvedValue({
      ok: false,
      reason: 'network_error',
      status: null,
      error: 'ECONNREFUSED',
      step: 'info',
    })

    const selections: HomeSelectedGalleryOrStory[] = [
      { relationTo: 'gallery-placements', gallerySlug: 'unreachable-selected-gallery', layout: 'masonry' },
    ]

    await expect(resolveHomeSelectedGalleriesOrStories(selections)).resolves.not.toThrow()

    const nodes = await resolveHomeSelectedGalleriesOrStories(selections)
    render(<>{nodes}</>)

    expect(screen.getByTestId('gallery-placement-unavailable')).toBeInTheDocument()
    expect(screen.queryByTestId('gallery-masonry')).not.toBeInTheDocument()
  })

  it('preserves the given order across a mix of pages and gallery selections, one failure never affecting another', async () => {
    fetchPublishedGalleryMock.mockImplementation(async (slug) => {
      if (slug === 'ok-selected-gallery') {
        return { ok: true, info: { event_name: 'ok' } as never, photos: okPhotosResponse }
      }
      return { ok: false, reason: 'not_found', status: 404, error: 'not found', step: 'info' }
    })

    const selections: HomeSelectedGalleryOrStory[] = [
      { relationTo: 'pages', slug: 'first-story', heading: 'First Story' },
      { relationTo: 'gallery-placements', gallerySlug: 'ok-selected-gallery', layout: 'slideshow', heading: 'Second' },
      { relationTo: 'gallery-placements', gallerySlug: 'missing-selected-gallery', layout: 'masonry', heading: 'Third' },
    ]

    const nodes = await resolveHomeSelectedGalleriesOrStories(selections)
    expect(nodes).toHaveLength(3)

    render(
      <>
        <div data-testid="slot-0">{nodes[0]}</div>
        <div data-testid="slot-1">{nodes[1]}</div>
        <div data-testid="slot-2">{nodes[2]}</div>
      </>,
    )

    expect(within(screen.getByTestId('slot-0')).getByTestId('home-selected-story-card')).toHaveTextContent(
      'First Story',
    )
    expect(within(screen.getByTestId('slot-1')).getByTestId('gallery-slideshow')).toBeInTheDocument()
    expect(within(screen.getByTestId('slot-2')).getByTestId('gallery-placement-unavailable')).toHaveTextContent(
      /^Third:/,
    )
  })

  it('resolves an empty curated selection to nothing at all — never back-filling an automatic "latest N"', async () => {
    const nodes = await resolveHomeSelectedGalleriesOrStories([])

    expect(nodes).toEqual([])
    // The only way a selection can appear is for the photographer to have put
    // it in the field: with nothing curated, nothing is fetched and nothing is
    // rendered — there is no derived-content fallback anywhere in this path.
    expect(fetchPublishedGalleryMock).not.toHaveBeenCalled()

    render(<>{nodes}</>)
    expect(screen.queryByTestId('home-selected-story-card')).not.toBeInTheDocument()
    expect(screen.queryByTestId('gallery-masonry')).not.toBeInTheDocument()
    expect(screen.queryByTestId('gallery-slideshow')).not.toBeInTheDocument()
  })

  it('reordering the input array alone changes the rendered order — no other change involved', async () => {
    const forward: HomeSelectedGalleryOrStory[] = [
      { relationTo: 'pages', slug: 'alpha', heading: 'Alpha' },
      { relationTo: 'pages', slug: 'beta', heading: 'Beta' },
    ]
    const reversed: HomeSelectedGalleryOrStory[] = [...forward].reverse()

    const forwardNodes = await resolveHomeSelectedGalleriesOrStories(forward)
    const reversedNodes = await resolveHomeSelectedGalleriesOrStories(reversed)

    const { unmount: unmountForward } = render(<div data-testid="forward-order">{forwardNodes}</div>)
    const forwardHeadings = within(screen.getByTestId('forward-order'))
      .getAllByTestId('home-selected-story-card')
      .map((el) => el.textContent)
    unmountForward()

    render(<div data-testid="reversed-order">{reversedNodes}</div>)
    const reversedHeadings = within(screen.getByTestId('reversed-order'))
      .getAllByTestId('home-selected-story-card')
      .map((el) => el.textContent)

    expect(forwardHeadings).toEqual(['Alpha', 'Beta'])
    expect(reversedHeadings).toEqual(['Beta', 'Alpha'])
  })
})
