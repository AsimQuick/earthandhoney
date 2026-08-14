/**
 * ---
 * file: src/__tests__/us37-ac37.3-structured-data-per-page-type.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-37.3 — structured data is emitted per page type by
 *          extending src/lib/studioStructuredData.ts's existing
 *          `buildStudioStructuredData` (AC-24.5), not a second, independent
 *          JSON-LD implementation. Two halves: (1) unit tests on the two new
 *          pure builders it adds — `buildPageStructuredData` (a `Pages`
 *          document's `photographyType`/`cityRegion`/`venue` layered onto the
 *          shared LocalBusiness/ProfessionalService block) and
 *          `buildStoryStructuredData` (a `CreativeWork` published by that
 *          same block) — proving both reuse the base builder's output rather
 *          than reimplementing the studio-identity fields; (2) the emitted
 *          JSON-LD extracted from the RENDERED HTML of a page
 *          (src/app/(frontend)/[slug]/page.tsx, both the standard and details
 *          templates) and a story (src/app/(frontend)/stories/[slug]/page.tsx),
 *          with its shape validated — the same `jest.mock` + render +
 *          regex-extract-the-<script>-tag technique
 *          us24-ac24.5-studio-profile-seo-output.test.tsx already established
 *          for the root layout's site-wide block, and the same
 *          `jest.mock('@/lib/getPageBySlug')`/`getStudioProfile` isolation
 *          us35-ac35.3-page-template-dispatch.test.tsx already used for this
 *          same route module (`payload` is ESM-only and breaks Jest's interop
 *          boundary when imported directly). Also covers
 *          src/lib/absoluteSiteUrl.ts, the single owner of the public origin
 *          those absolute JSON-LD `url` values are written against, including
 *          an fs read of the layout/page/story sources proving none of them
 *          kept a second copy of the `NEXT_PUBLIC_SITE_URL` read.
 *          The live half of this AC's evidence — the same JSON-LD extracted
 *          from real response HTML fetched from a running stack — is
 *          us37-ac37.3-live-structured-data.test.ts.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.3
 * ---
 */
import fs from 'fs'
import path from 'path'

import { render } from '@testing-library/react'

import { SITE_URL_FALLBACK, absoluteSiteUrl, siteOrigin } from '@/lib/absoluteSiteUrl'
import type { ResolvedPage } from '@/lib/getPageBySlug'
import type { ResolvedStudioProfile } from '@/lib/getStudioProfile'
import type { ResolvedStory } from '@/lib/getStoryBySlug'
import { buildPageStructuredData, buildStoryStructuredData, buildStudioStructuredData } from '@/lib/studioStructuredData'

function studioProfile(overrides: Partial<ResolvedStudioProfile> = {}): ResolvedStudioProfile {
  return {
    businessName: 'Earth & Honey Studios',
    description: 'A boutique wedding and engagement studio.',
    defaultTitlePattern: '%s | Earth & Honey Studios',
    defaultMetaDescription: 'Studio default description.',
    publicPhone: '555-0100',
    publicEmail: 'hello@earthandhoney.example',
    address: { street: '1 Main St', city: 'Alphaville', region: 'ON', postalCode: 'A1A 1A1', country: 'CA' },
    serviceAreas: ['Alphaville', 'Betatown'],
    socialProfiles: [{ platform: 'instagram', url: 'https://instagram.com/earthandhoney' }],
    defaultSocialImage: { url: '/media/studio-og.jpg' },
    homeHeroGallerySlug: null,
    homeSelectedGalleriesOrStories: [],
    ...overrides,
  }
}

describe('US-37 AC-37.3: buildPageStructuredData reuses buildStudioStructuredData, extended for a page', () => {
  const PROFILE = studioProfile()

  it('carries every field the base LocalBusiness/ProfessionalService block emits, plus the page url', () => {
    const base = buildStudioStructuredData(PROFILE)
    const data = buildPageStructuredData(PROFILE, { url: 'https://earthandhoney.example/weddings' })

    expect(data['@context']).toBe('https://schema.org')
    expect(data['@type']).toEqual(['LocalBusiness', 'ProfessionalService'])
    expect(data.name).toBe(base.name)
    expect(data.telephone).toBe(base.telephone)
    expect(data.address).toEqual(base.address)
    expect(data.url).toBe('https://earthandhoney.example/weddings')
  })

  it('omits makesOffer/location when the page sets no photographyType/venue', () => {
    const data = buildPageStructuredData(PROFILE, { url: 'https://earthandhoney.example/about' })

    expect(data).not.toHaveProperty('makesOffer')
    expect(data).not.toHaveProperty('location')
    expect(data.areaServed).toEqual(PROFILE.serviceAreas)
  })

  it('adds a makesOffer Service block from photographyType, capitalized', () => {
    const data = buildPageStructuredData(PROFILE, {
      url: 'https://earthandhoney.example/weddings',
      photographyType: 'wedding',
    })

    expect(data.makesOffer).toEqual({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', serviceType: 'Wedding' },
    })
  })

  it('prepends cityRegion to areaServed, ahead of the studio-wide service areas, without duplicating it', () => {
    const data = buildPageStructuredData(PROFILE, {
      url: 'https://earthandhoney.example/weddings/alphaville',
      cityRegion: 'Alphaville',
    })

    expect(data.areaServed).toEqual(['Alphaville', 'Betatown'])
  })

  it('sets areaServed to just the cityRegion when the studio itself defines no serviceAreas', () => {
    const data = buildPageStructuredData(studioProfile({ serviceAreas: [] }), {
      url: 'https://earthandhoney.example/weddings/alphaville',
      cityRegion: 'Alphaville',
    })

    expect(data.areaServed).toEqual(['Alphaville'])
  })

  it('adds cityRegion to a nested makesOffer.itemOffered.areaServed when both are set', () => {
    const data = buildPageStructuredData(PROFILE, {
      url: 'https://earthandhoney.example/weddings/alphaville',
      photographyType: 'engagement',
      cityRegion: 'Alphaville',
    })

    expect(data.makesOffer).toEqual({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', serviceType: 'Engagement', areaServed: 'Alphaville' },
    })
  })

  it('adds a location Place from venue', () => {
    const data = buildPageStructuredData(PROFILE, {
      url: 'https://earthandhoney.example/weddings/the-old-barn',
      venue: 'The Old Barn',
    })

    expect(data.location).toEqual({ '@type': 'Place', name: 'The Old Barn' })
  })

  it('emits all three extensions together for a fully-specified page', () => {
    const data = buildPageStructuredData(PROFILE, {
      url: 'https://earthandhoney.example/weddings/the-old-barn',
      photographyType: 'wedding',
      cityRegion: 'Alphaville',
      venue: 'The Old Barn',
    })

    expect(data.makesOffer).toEqual({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', serviceType: 'Wedding', areaServed: 'Alphaville' },
    })
    expect(data.location).toEqual({ '@type': 'Place', name: 'The Old Barn' })
    expect(data.areaServed).toEqual(['Alphaville', 'Betatown'])
  })
})

describe('US-37 AC-37.3: buildStoryStructuredData reuses buildStudioStructuredData as its publisher', () => {
  const PROFILE = studioProfile()

  it('emits a CreativeWork whose publisher is exactly the base LocalBusiness/ProfessionalService block', () => {
    const base = buildStudioStructuredData(PROFILE)
    const data = buildStoryStructuredData(PROFILE, {
      url: 'https://earthandhoney.example/stories/a-real-wedding',
      title: 'A Real Wedding at The Old Barn',
    })

    expect(data['@context']).toBe('https://schema.org')
    expect(data['@type']).toBe('CreativeWork')
    expect(data.headline).toBe('A Real Wedding at The Old Barn')
    expect(data.url).toBe('https://earthandhoney.example/stories/a-real-wedding')
    expect(data.publisher).toEqual(base)
  })

  it('includes description/image only when the story provides them', () => {
    const bare = buildStoryStructuredData(PROFILE, {
      url: 'https://earthandhoney.example/stories/bare',
      title: 'Bare Story',
    })
    expect(bare).not.toHaveProperty('description')
    expect(bare).not.toHaveProperty('image')

    const full = buildStoryStructuredData(PROFILE, {
      url: 'https://earthandhoney.example/stories/full',
      title: 'Full Story',
      description: 'A subtitle introduction.',
      image: '/media/story-og.jpg',
    })
    expect(full.description).toBe('A subtitle introduction.')
    expect(full.image).toBe('/media/story-og.jpg')
  })

  it('changes when the underlying StudioProfile changes, via the reused publisher block', () => {
    const dataA = buildStoryStructuredData(PROFILE, { url: 'https://earthandhoney.example/stories/x', title: 'X' })
    const dataB = buildStoryStructuredData(studioProfile({ businessName: 'A Different Studio' }), {
      url: 'https://earthandhoney.example/stories/x',
      title: 'X',
    })

    expect(dataA.publisher).not.toEqual(dataB.publisher)
  })
})

describe('US-37 AC-37.3: absoluteSiteUrl owns the public origin the JSON-LD `url` is written against', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL

  afterEach(() => {
    if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
  })

  it('reads NEXT_PUBLIC_SITE_URL when it is set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://earthandhoney.example'

    expect(siteOrigin()).toBe('https://earthandhoney.example')
    expect(absoluteSiteUrl('/weddings')).toBe('https://earthandhoney.example/weddings')
    expect(absoluteSiteUrl('/stories/a-real-wedding')).toBe('https://earthandhoney.example/stories/a-real-wedding')
  })

  it('falls back to the documented local-dev origin when NEXT_PUBLIC_SITE_URL is unset', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL

    expect(siteOrigin()).toBe(SITE_URL_FALLBACK)
    expect(absoluteSiteUrl('/weddings')).toBe(`${SITE_URL_FALLBACK}/weddings`)
  })

  it('is the origin the root layout resolves its metadataBase through — one owner, not a second copy of the env read', () => {
    const layoutSrc = fs.readFileSync(path.join(process.cwd(), 'src/app/(frontend)/layout.tsx'), 'utf8')
    const pageSrc = fs.readFileSync(path.join(process.cwd(), 'src/app/(frontend)/[slug]/page.tsx'), 'utf8')
    const storySrc = fs.readFileSync(path.join(process.cwd(), 'src/app/(frontend)/stories/[slug]/page.tsx'), 'utf8')

    for (const src of [layoutSrc, pageSrc, storySrc]) {
      expect(src).toMatch(/@\/lib\/absoluteSiteUrl/)
      expect(src).not.toMatch(/process\.env\.NEXT_PUBLIC_SITE_URL/)
    }
  })
})

jest.mock('@/lib/getPageBySlug', () => ({ getPageBySlug: jest.fn() }))
jest.mock('@/lib/getStoryBySlug', () => ({ getStoryBySlug: jest.fn() }))
jest.mock('@/lib/getStudioProfile', () => ({ getStudioProfile: jest.fn() }))
jest.mock('@/lib/resolveDetailsMasonryPlacement', () => ({
  resolveDetailsMasonryPlacement: jest.fn(async () => <div data-testid="stub-masonry-placement" />),
}))
jest.mock('@/lib/resolvePageGalleryPlacements', () => ({
  resolvePageGalleryPlacements: jest.fn(async () => [<div key="stub" data-testid="stub-gallery-placement" />]),
}))
jest.mock('@/lib/resolveStoryGalleryPlacements', () => ({
  resolveStoryGalleryPlacements: jest.fn(async () => []),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getPageBySlug } = require('@/lib/getPageBySlug') as { getPageBySlug: jest.Mock }
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getStoryBySlug } = require('@/lib/getStoryBySlug') as { getStoryBySlug: jest.Mock }
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getStudioProfile } = require('@/lib/getStudioProfile') as { getStudioProfile: jest.Mock }
// Imported after the mocks are declared, matching
// us35-ac35.3-page-template-dispatch.test.tsx's ordering — the routes must
// call the mocked readers, not the real ones (`payload` is ESM-only and
// breaks Jest's interop boundary on import).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PageRouteModule = require('@/app/(frontend)/[slug]/page')
const PublicPageRoute = PageRouteModule.default as (props: {
  params: Promise<{ slug: string }>
}) => Promise<React.JSX.Element>
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StoryRouteModule = require('@/app/(frontend)/stories/[slug]/page')
const PublicStoryRoute = StoryRouteModule.default as (props: {
  params: Promise<{ slug: string }>
}) => Promise<React.JSX.Element>

function page(overrides: Partial<ResolvedPage> = {}): ResolvedPage {
  return {
    heading: 'Real Weddings',
    shortIntroduction: '',
    seoTitle: '',
    metaDescription: '',
    status: 'published',
    indexing: 'index',
    galleryPlacements: [],
    socialImage: null,
    template: 'standard',
    photographyType: '',
    cityRegion: '',
    venue: '',
    ...overrides,
  }
}

function story(overrides: Partial<ResolvedStory> = {}): ResolvedStory {
  return {
    title: 'A Real Wedding at The Old Barn',
    subtitleIntroduction: '',
    status: 'published',
    sections: [],
    ...overrides,
  }
}

function extractStructuredData(html: string, testId: string): Record<string, unknown> {
  const match = new RegExp(
    `<script type="application/ld\\+json" data-testid="${testId}"[^>]*>([\\s\\S]*?)<\\/script>`,
  ).exec(html)
  expect(match).not.toBeNull()
  return JSON.parse(match![1])
}

describe('US-37 AC-37.3: the [slug] page route emits its own JSON-LD block, extracted from rendered HTML', () => {
  beforeEach(() => {
    getStudioProfile.mockResolvedValue(studioProfile())
  })

  afterEach(() => {
    getPageBySlug.mockReset()
    getStudioProfile.mockReset()
  })

  it('emits a page-structured-data script for a standard-template page, shaped as LocalBusiness/ProfessionalService with page context', async () => {
    getPageBySlug.mockResolvedValue(
      page({
        heading: 'Weddings in Alphaville',
        template: 'standard',
        photographyType: 'wedding',
        cityRegion: 'Alphaville',
        venue: 'The Old Barn',
      }),
    )

    const element = await PublicPageRoute({ params: Promise.resolve({ slug: 'weddings-alphaville' }) })
    const { container } = render(element)
    const data = extractStructuredData(container.innerHTML, 'page-structured-data')

    expect(data['@context']).toBe('https://schema.org')
    expect(data['@type']).toEqual(['LocalBusiness', 'ProfessionalService'])
    expect(data.name).toBe('Earth & Honey Studios')
    expect(data.url).toContain('/weddings-alphaville')
    expect(data.makesOffer).toEqual({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', serviceType: 'Wedding', areaServed: 'Alphaville' },
    })
    expect(data.location).toEqual({ '@type': 'Place', name: 'The Old Barn' })
    expect(container.querySelector('[data-testid="standard-page-template"]')).not.toBeNull()
  })

  it('also emits a page-structured-data script for a details-template page', async () => {
    getPageBySlug.mockResolvedValue(page({ heading: 'A Ring, A Dress', template: 'details' }))

    const element = await PublicPageRoute({ params: Promise.resolve({ slug: 'details-page' }) })
    const { container } = render(element)
    const data = extractStructuredData(container.innerHTML, 'page-structured-data')

    expect(data['@type']).toEqual(['LocalBusiness', 'ProfessionalService'])
    expect(data.url).toContain('/details-page')
    expect(container.querySelector('[data-testid="details-page-template"]')).not.toBeNull()
  })

  it('carries no page-specific extensions for a page with no photographyType/cityRegion/venue set', async () => {
    getPageBySlug.mockResolvedValue(page({ template: 'standard' }))

    const element = await PublicPageRoute({ params: Promise.resolve({ slug: 'plain-page' }) })
    const { container } = render(element)
    const data = extractStructuredData(container.innerHTML, 'page-structured-data')

    expect(data).not.toHaveProperty('makesOffer')
    expect(data).not.toHaveProperty('location')
  })
})

describe('US-37 AC-37.3: the stories/[slug] route emits its own JSON-LD block, extracted from rendered HTML', () => {
  beforeEach(() => {
    getStudioProfile.mockResolvedValue(studioProfile())
  })

  afterEach(() => {
    getStoryBySlug.mockReset()
    getStudioProfile.mockReset()
  })

  it('emits a story-structured-data script shaped as a CreativeWork published by the studio LocalBusiness block', async () => {
    getStoryBySlug.mockResolvedValue(
      story({ title: 'A Real Wedding at The Old Barn', subtitleIntroduction: 'A late-summer celebration.' }),
    )

    const element = await PublicStoryRoute({ params: Promise.resolve({ slug: 'a-real-wedding' }) })
    const { container } = render(element)
    const data = extractStructuredData(container.innerHTML, 'story-structured-data')

    expect(data['@context']).toBe('https://schema.org')
    expect(data['@type']).toBe('CreativeWork')
    expect(data.headline).toBe('A Real Wedding at The Old Barn')
    expect(data.description).toBe('A late-summer celebration.')
    expect(data.url).toContain('/stories/a-real-wedding')
    expect(data.publisher).toMatchObject({
      '@context': 'https://schema.org',
      '@type': ['LocalBusiness', 'ProfessionalService'],
      name: 'Earth & Honey Studios',
    })
    expect(container.querySelector('[data-testid="story-page-template"]')).not.toBeNull()
  })

  it('omits description when the story has no subtitleIntroduction', async () => {
    getStoryBySlug.mockResolvedValue(story({ title: 'Bare Story', subtitleIntroduction: '' }))

    const element = await PublicStoryRoute({ params: Promise.resolve({ slug: 'bare-story' }) })
    const { container } = render(element)
    const data = extractStructuredData(container.innerHTML, 'story-structured-data')

    expect(data).not.toHaveProperty('description')
  })

  it('falls back to the StudioProfile default social image when the story has no image field of its own', async () => {
    getStoryBySlug.mockResolvedValue(story({ title: 'Imaged Story' }))

    const element = await PublicStoryRoute({ params: Promise.resolve({ slug: 'imaged-story' }) })
    const { container } = render(element)
    const data = extractStructuredData(container.innerHTML, 'story-structured-data')

    expect(data.image).toBe('/media/studio-og.jpg')
  })
})
