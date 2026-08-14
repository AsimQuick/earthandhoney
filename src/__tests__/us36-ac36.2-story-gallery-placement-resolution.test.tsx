/**
 * ---
 * file: src/__tests__/us36-ac36.2-story-gallery-placement-resolution.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-36.2 — (1) the field-definition evidence: `Stories`'
 *          per-section `galleryPlacement` field is a relationship into
 *          Payload's own `gallery-placements` collection only, never a
 *          relation/join into the separate Backstage database, and that
 *          collection itself stores the Backstage gallery identifier as a
 *          plain external `gallerySlug` text field — the same
 *          no-cross-database-relation rule AC-31.5 established (mirrors
 *          us31-ac31.5-gallery-placement-resolution.test.tsx's field-shape
 *          checks); (2) resolveStoryGalleryPlacements resolves a real
 *          three-section story's sections through the existing Flow A
 *          boundary (backstageGalleryPlacement -> backstageClient/
 *          backstageGalleryMapper) into StoryPageTemplate, in author order;
 *          (3) reordering the same three sections — no code change — changes
 *          StoryPageTemplate's rendered output order identically, proving
 *          order is carried by the input data, not hard-coded.
 * created-by: dev-team
 * related-story: US-36
 * related-ac: 36.2
 * ---
 */
import { render, screen, within } from '@testing-library/react'

import type { Field } from 'payload'

import { GalleryPlacements } from '@/collections/GalleryPlacements'
import { Stories } from '@/collections/Stories'
import { StoryPageTemplate } from '@/components/page-template/StoryPageTemplate'

jest.mock('@/lib/backstageClient')

import type { GalleryPhotosResponse } from '@/lib/backstageClient'
import { fetchPublishedGallery } from '@/lib/backstageClient'
import {
  type StoryGalleryPlacementSectionConfig,
  resolveStoryGalleryPlacements,
} from '@/lib/resolveStoryGalleryPlacements'

const fetchPublishedGalleryMock = fetchPublishedGallery as jest.MockedFunction<typeof fetchPublishedGallery>

function fieldByName(fields: Field[], name: string): Field | undefined {
  return fields.find((field) => 'name' in field && field.name === name)
}

describe('AC-36.2: field definition — gallery placement resolves by external identifier only, no relation/join into the Backstage database', () => {
  it("Stories' per-section galleryPlacement is a relationship into the Payload-owned gallery-placements collection, not a Backstage relation", () => {
    const sections = fieldByName(Stories.fields, 'sections')
    const subFields = (sections && 'fields' in sections ? (sections.fields as Field[]) : []) ?? []
    const galleryPlacement = fieldByName(subFields, 'galleryPlacement')

    expect(galleryPlacement?.type).toBe('relationship')
    expect(galleryPlacement && 'relationTo' in galleryPlacement ? galleryPlacement.relationTo : undefined).toBe(
      'gallery-placements',
    )
  })

  it('the gallery-placements collection this field points to holds the Backstage gallery as plain text, never a relation/join', () => {
    const gallerySlug = fieldByName(GalleryPlacements.fields, 'gallerySlug')
    expect(gallerySlug?.type).toBe('text')
    expect(gallerySlug && 'relationTo' in gallerySlug ? (gallerySlug as unknown) : undefined).toBeUndefined()
  })
})

function photosResponse(label: string): GalleryPhotosResponse {
  return {
    event: { event_name: label },
    photos: [
      {
        id: 1,
        filename: `${label}.jpg`,
        url: `https://cdn.example/${label}.jpg`,
        thumbnail_url: `https://cdn.example/${label}-thumb.jpg`,
        width: 800,
        height: 600,
      },
    ],
  }
}

// AC-36.2's "three-section story rendered in order" evidence — a real
// three-section wedding story, matching AC-36.1's REAL_STORY sections.
const THREE_SECTIONS: StoryGalleryPlacementSectionConfig[] = [
  {
    sectionHeading: 'Getting ready',
    shortText: "Mira's mother fastened the last button on the veil.",
    gallerySlug: 'getting-ready-gallery',
    layout: 'masonry',
    heading: 'Getting ready',
  },
  {
    sectionHeading: 'The ceremony',
    shortText: 'Vows were exchanged beneath the pear trees.',
    gallerySlug: 'ceremony-gallery',
    layout: 'masonry',
    heading: 'The ceremony',
  },
  {
    sectionHeading: 'The reception',
    shortText: 'Long tables ran the length of the barn.',
    gallerySlug: 'reception-gallery',
    layout: 'masonry',
    heading: 'The reception',
  },
]

describe('AC-36.2: resolveStoryGalleryPlacements resolves a three-section story through the Flow A boundary, in author order', () => {
  afterEach(() => {
    fetchPublishedGalleryMock.mockReset()
  })

  it('renders all three sections, each resolved via its gallerySlug, in author order', async () => {
    fetchPublishedGalleryMock.mockImplementation(async (slug) => ({
      ok: true,
      info: { event_name: slug } as never,
      photos: photosResponse(slug),
    }))

    const resolvedSections = await resolveStoryGalleryPlacements(THREE_SECTIONS)
    expect(resolvedSections).toHaveLength(3)

    render(<StoryPageTemplate title="Mira and Owen" sections={resolvedSections} />)

    const sectionEls = screen.getAllByTestId('story-section')
    expect(sectionEls).toHaveLength(3)

    sectionEls.forEach((sectionEl, index) => {
      const expected = THREE_SECTIONS[index]
      expect(within(sectionEl).getByTestId('story-section-heading')).toHaveTextContent(expected.sectionHeading)
      expect(within(sectionEl).getByTestId('story-section-short-text')).toHaveTextContent(expected.shortText)
      expect(within(sectionEl).getByTestId('gallery-masonry')).toBeInTheDocument()
    })

    // Each section resolved by external identifier only, in the order given.
    expect(fetchPublishedGalleryMock.mock.calls.map(([slug]) => slug)).toEqual([
      'getting-ready-gallery',
      'ceremony-gallery',
      'reception-gallery',
    ])
  })

  it('reordering the same three sections — no code change — changes the rendered output order identically', async () => {
    fetchPublishedGalleryMock.mockImplementation(async (slug) => ({
      ok: true,
      info: { event_name: slug } as never,
      photos: photosResponse(slug),
    }))

    // The author reorders: reception first, then getting-ready, then
    // ceremony. Same three section objects, same resolve function, same
    // template component — only the array order differs.
    const reordered = [THREE_SECTIONS[2], THREE_SECTIONS[0], THREE_SECTIONS[1]]

    const resolvedSections = await resolveStoryGalleryPlacements(reordered)
    render(<StoryPageTemplate title="Mira and Owen" sections={resolvedSections} />)

    const headings = screen.getAllByTestId('story-section-heading').map((el) => el.textContent)
    expect(headings).toEqual(['The reception', 'Getting ready', 'The ceremony'])
  })

  it('renders a slideshow layout for a section configured with layout: slideshow', async () => {
    fetchPublishedGalleryMock.mockResolvedValue({
      ok: true,
      info: { event_name: 'slideshow-gallery' } as never,
      photos: photosResponse('slideshow-gallery'),
    })

    const resolvedSections = await resolveStoryGalleryPlacements([
      { ...THREE_SECTIONS[0], gallerySlug: 'slideshow-gallery', layout: 'slideshow' },
    ])
    render(<StoryPageTemplate title="Mira and Owen" sections={resolvedSections} />)

    expect(screen.getByTestId('gallery-slideshow')).toBeInTheDocument()
  })

  it('a section whose gallery is unreachable renders GalleryUnavailablePlaceholder, not the layout — never throws, and never affects sibling order', async () => {
    fetchPublishedGalleryMock.mockImplementation(async (slug) => {
      if (slug === 'ceremony-gallery') {
        return { ok: false, reason: 'not_found', status: 404, error: 'not found', step: 'info' }
      }
      return { ok: true, info: { event_name: slug } as never, photos: photosResponse(slug) }
    })

    await expect(resolveStoryGalleryPlacements(THREE_SECTIONS)).resolves.not.toThrow()

    const resolvedSections = await resolveStoryGalleryPlacements(THREE_SECTIONS)
    render(<StoryPageTemplate title="Mira and Owen" sections={resolvedSections} />)

    const sectionEls = screen.getAllByTestId('story-section')
    expect(within(sectionEls[0]).getByTestId('gallery-masonry')).toBeInTheDocument()
    expect(within(sectionEls[1]).getByTestId('gallery-placement-unavailable')).toBeInTheDocument()
    expect(within(sectionEls[2]).getByTestId('gallery-masonry')).toBeInTheDocument()
  })
})
