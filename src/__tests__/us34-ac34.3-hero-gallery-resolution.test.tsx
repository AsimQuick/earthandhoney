/**
 * ---
 * file: src/__tests__/us34-ac34.3-hero-gallery-resolution.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-34.3 — (1) the field-definition evidence:
 *          StudioProfile.homeHeroGallerySlug is a plain external-identifier
 *          text field, never a relationship/join into the separate
 *          Backstage database (Reminder 4, the rule US-25 established); (2)
 *          resolveHomeHeroGalleryPlacement resolves that slug through the
 *          existing Flow A boundary (backstageGalleryPlacement ->
 *          backstageClient/backstageGalleryMapper) into a real HeroSlideshow
 *          on success; (3) an unset slug, and every Flow A failure
 *          (unreachable Backstage, timeout, 404 slug), renders
 *          GalleryUnavailablePlaceholder instead of a blank hero or a
 *          thrown error — resolveHomeHeroGalleryPlacement never throws. A
 *          live round-trip against a real Backstage gallery and against a
 *          made-unreachable one is
 *          us34-ac34.3-hero-gallery-live.test.ts.
 * created-by: dev-team
 * related-story: US-34
 * related-ac: 34.3
 * ---
 */
import { render, screen } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

import type { Field } from 'payload'

import { StudioProfile } from '@/globals/StudioProfile'

jest.mock('@/lib/backstageClient')

import type { GalleryPhotosResponse } from '@/lib/backstageClient'
import { fetchPublishedGallery } from '@/lib/backstageClient'
import { resolveHomeHeroGalleryPlacement } from '@/lib/resolveHomeHeroGalleryPlacement'

const fetchPublishedGalleryMock = fetchPublishedGallery as jest.MockedFunction<typeof fetchPublishedGallery>

function fieldByName(fields: Field[], name: string): Field | undefined {
  return fields.find((field) => 'name' in field && field.name === name)
}

describe('AC-34.3: field definition — no relationship/join into the Backstage database', () => {
  it('StudioProfile.homeHeroGallerySlug is a plain text field, never a relationship', () => {
    const field = fieldByName(StudioProfile.fields, 'homeHeroGallerySlug')
    expect(field?.type).toBe('text')
    expect(field && 'relationTo' in field ? (field as unknown) : undefined).toBeUndefined()
  })

  it('StudioProfile source references no Backstage database relation', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/globals/StudioProfile.ts'), 'utf8')
    expect(source).not.toMatch(/backstage-db/)
  })
})

describe('AC-34.3: resolveHomeHeroGalleryPlacement resolves through the Flow A boundary', () => {
  afterEach(() => {
    fetchPublishedGalleryMock.mockReset()
  })

  const okPhotosResponse: GalleryPhotosResponse = {
    event: { event_name: 'AC-34.3 hero gallery' },
    photos: [
      {
        id: 1,
        filename: 'hero-one.jpg',
        url: 'https://cdn.example/hero-one.jpg',
        thumbnail_url: 'https://cdn.example/hero-one-thumb.jpg',
        width: 1600,
        height: 900,
      },
    ],
  }

  it('renders HeroSlideshow with the resolved images when the gallery is reachable', async () => {
    fetchPublishedGalleryMock.mockResolvedValue({
      ok: true,
      info: { event_name: 'AC-34.3 hero gallery' } as never,
      photos: okPhotosResponse,
    })

    const node = await resolveHomeHeroGalleryPlacement('real-hero-gallery')
    render(<>{node}</>)

    expect(fetchPublishedGalleryMock).toHaveBeenCalledWith('real-hero-gallery', {})
    expect(screen.getByTestId('hero-slideshow')).toBeInTheDocument()
    expect(screen.queryByTestId('gallery-placement-unavailable')).not.toBeInTheDocument()
  })

  it('renders GalleryUnavailablePlaceholder, not a blank hero, when no slug is configured — never throws', async () => {
    const node = await resolveHomeHeroGalleryPlacement(undefined)
    render(<>{node}</>)

    expect(fetchPublishedGalleryMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('gallery-placement-unavailable')).toBeInTheDocument()
    expect(screen.queryByTestId('hero-slideshow')).not.toBeInTheDocument()
  })

  it('renders GalleryUnavailablePlaceholder, not a blank hero, when the slug is an empty string', async () => {
    const node = await resolveHomeHeroGalleryPlacement('')
    render(<>{node}</>)

    expect(fetchPublishedGalleryMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('gallery-placement-unavailable')).toBeInTheDocument()
  })

  it.each([
    ['unreachable Backstage', { ok: false, reason: 'network_error', status: null, error: 'ECONNREFUSED', step: 'info' }],
    ['a timeout', { ok: false, reason: 'timeout', status: null, error: 'timed out', step: 'info' }],
    ['a 404 slug', { ok: false, reason: 'not_found', status: 404, error: 'not found', step: 'info' }],
  ] as const)('renders GalleryUnavailablePlaceholder on %s — never throws', async (_label, outcome) => {
    fetchPublishedGalleryMock.mockResolvedValue(outcome)

    await expect(resolveHomeHeroGalleryPlacement('missing-hero-gallery')).resolves.not.toThrow()

    const node = await resolveHomeHeroGalleryPlacement('missing-hero-gallery')
    render(<>{node}</>)

    expect(screen.getByTestId('gallery-placement-unavailable')).toBeInTheDocument()
    expect(screen.queryByTestId('hero-slideshow')).not.toBeInTheDocument()
  })
})
