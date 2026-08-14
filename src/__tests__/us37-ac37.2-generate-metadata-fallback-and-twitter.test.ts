/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us37-ac37.2-generate-metadata-fallback-and-twitter.test.ts
 * project: earthandhoney
 * purpose: Verify AC-37.2's pure-computation half (the mocked-module
 *          technique us31-ac31.6-generate-metadata.test.ts and
 *          us24-ac24.5-studio-profile-seo-output.test.tsx already use — both
 *          `getPageBySlug`/`getStoryBySlug` and `getStudioProfile` import
 *          `payload`, ESM-only and unimportable directly under Jest, see
 *          us3-ac3.5-galleries-api-read.test.ts) for the two gaps AC-31.6 left
 *          open: (1) the Pages `[slug]` route's `description` (plain field,
 *          Open Graph, and the new Twitter card) falls back explicitly to
 *          `StudioProfile.defaultMetaDescription` rather than being left
 *          undefined when the page defines none; (2) the new
 *          `stories/[slug]` route emits the same full set — title, meta
 *          description, canonical URL, Open Graph tags and a Twitter card —
 *          for a story, taken from the story's own `title`/
 *          `subtitleIntroduction` fields with `StudioProfile` defaults as
 *          fallback (a story carries no `socialImage` field of its own, so
 *          its Open Graph/Twitter image always falls back to
 *          `StudioProfile.defaultSocialImage`). The real-rendered-HTML half
 *          of this AC is covered separately by
 *          us37-ac37.2-live-seo-metadata.test.ts.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.2
 * ---
 */
import type { ResolvedPage } from '@/lib/getPageBySlug'
import type { ResolvedStory } from '@/lib/getStoryBySlug'
import type { ResolvedStudioProfile } from '@/lib/getStudioProfile'

jest.mock('@/lib/getPageBySlug', () => ({
  getPageBySlug: jest.fn(),
}))
jest.mock('@/lib/getStoryBySlug', () => ({
  getStoryBySlug: jest.fn(),
}))
jest.mock('@/lib/getStudioProfile', () => ({
  getStudioProfile: jest.fn(),
}))
jest.mock('@/lib/resolveStoryGalleryPlacements', () => ({
  resolveStoryGalleryPlacements: jest.fn().mockResolvedValue([]),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getPageBySlug } = require('@/lib/getPageBySlug') as { getPageBySlug: jest.Mock }
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getStoryBySlug } = require('@/lib/getStoryBySlug') as { getStoryBySlug: jest.Mock }
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getStudioProfile } = require('@/lib/getStudioProfile') as { getStudioProfile: jest.Mock }

// Imported after every mock is declared, matching us31-ac31.6-generate-metadata.test.ts's ordering.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PageRouteModule = require('@/app/(frontend)/[slug]/page')
const { generateMetadata: generatePageMetadata } = PageRouteModule as {
  generateMetadata: (props: { params: Promise<{ slug: string }> }) => Promise<import('next').Metadata>
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StoryRouteModule = require('@/app/(frontend)/stories/[slug]/page')
const { generateMetadata: generateStoryMetadata } = StoryRouteModule as {
  generateMetadata: (props: { params: Promise<{ slug: string }> }) => Promise<import('next').Metadata>
}

function page(overrides: Partial<ResolvedPage> = {}): ResolvedPage {
  return {
    heading: 'Default Heading',
    shortIntroduction: '',
    seoTitle: '',
    metaDescription: '',
    status: 'published',
    indexing: 'index',
    galleryPlacements: [],
    socialImage: null,
    template: 'standard',
    ...overrides,
  }
}

function story(overrides: Partial<ResolvedStory> = {}): ResolvedStory {
  return {
    title: 'Default Story Title',
    subtitleIntroduction: '',
    status: 'published',
    sections: [],
    ...overrides,
  }
}

function studioProfile(overrides: Partial<ResolvedStudioProfile> = {}): ResolvedStudioProfile {
  return {
    businessName: 'Earth & Honey Studios',
    description: '',
    defaultTitlePattern: '%s | Earth & Honey Studios',
    defaultMetaDescription: 'Studio default description.',
    publicPhone: '',
    publicEmail: '',
    address: { street: '', city: '', region: '', postalCode: '', country: '' },
    serviceAreas: [],
    socialProfiles: [],
    defaultSocialImage: null,
    homeHeroGallerySlug: null,
    homeSelectedGalleriesOrStories: [],
    ...overrides,
  }
}

async function pageMetadataFor(slug: string): Promise<import('next').Metadata> {
  return generatePageMetadata({ params: Promise.resolve({ slug }) })
}

async function storyMetadataFor(slug: string): Promise<import('next').Metadata> {
  return generateStoryMetadata({ params: Promise.resolve({ slug }) })
}

describe('US-37 AC-37.2: Pages [slug] route — description/Twitter card fallback', () => {
  afterEach(() => {
    getPageBySlug.mockReset()
    getStudioProfile.mockReset()
  })

  it("falls back the plain description field to StudioProfile.defaultMetaDescription when the page's own metaDescription is unset", async () => {
    getStudioProfile.mockResolvedValue(studioProfile({ defaultMetaDescription: 'Fallback studio description.' }))
    getPageBySlug.mockResolvedValue(page({ metaDescription: '' }))

    const meta = await pageMetadataFor('a-page')

    expect(meta.description).toBe('Fallback studio description.')
  })

  it("uses the page's own metaDescription over the StudioProfile default when set", async () => {
    getStudioProfile.mockResolvedValue(studioProfile({ defaultMetaDescription: 'Fallback studio description.' }))
    getPageBySlug.mockResolvedValue(page({ metaDescription: 'Own page description.' }))

    const meta = await pageMetadataFor('a-page')

    expect(meta.description).toBe('Own page description.')
  })

  it('emits a Twitter card mirroring the Open Graph title/description/image, with the same StudioProfile fallback chain', async () => {
    getStudioProfile.mockResolvedValue(
      studioProfile({
        defaultMetaDescription: 'Fallback studio description.',
        defaultSocialImage: { url: '/media/studio-default-og.jpg' },
      }),
    )
    getPageBySlug.mockResolvedValue(page({ heading: 'Heading Only', seoTitle: '', metaDescription: '', socialImage: null }))

    const meta = await pageMetadataFor('a-page')

    expect(meta.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'Heading Only',
      description: 'Fallback studio description.',
      images: ['/media/studio-default-og.jpg'],
    })
  })

  it("prefers the page's own socialImage for the Twitter card image over the StudioProfile default", async () => {
    getStudioProfile.mockResolvedValue(studioProfile({ defaultSocialImage: { url: '/media/studio-default-og.jpg' } }))
    getPageBySlug.mockResolvedValue(page({ socialImage: '/media/page-specific-og.jpg' }))

    const meta = await pageMetadataFor('a-page')

    expect(meta.twitter).toMatchObject({ images: ['/media/page-specific-og.jpg'] })
  })

  it('returns no Twitter card for an unpublished or missing page', async () => {
    getStudioProfile.mockResolvedValue(studioProfile())
    getPageBySlug.mockResolvedValue(page({ status: 'draft' }))

    const meta = await pageMetadataFor('a-draft-page')

    expect(meta.twitter).toBeUndefined()
  })
})

describe('US-37 AC-37.2: stories [slug] route — full SEO metadata set with StudioProfile fallback', () => {
  afterEach(() => {
    getStoryBySlug.mockReset()
    getStudioProfile.mockReset()
  })

  it('derives title, canonical URL, and Open Graph/Twitter url from the slug and the story title', async () => {
    getStudioProfile.mockResolvedValue(studioProfile())
    getStoryBySlug.mockResolvedValue(story({ title: 'A Real Wedding Story' }))

    const meta = await storyMetadataFor('a-real-wedding-story')

    expect(meta.title).toBe('A Real Wedding Story')
    expect(meta.alternates).toEqual({ canonical: '/stories/a-real-wedding-story' })
    expect(meta.openGraph).toMatchObject({ title: 'A Real Wedding Story', url: '/stories/a-real-wedding-story' })
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image', title: 'A Real Wedding Story' })
  })

  it("uses the story's own subtitleIntroduction as the description when set", async () => {
    getStudioProfile.mockResolvedValue(studioProfile({ defaultMetaDescription: 'Fallback studio description.' }))
    getStoryBySlug.mockResolvedValue(story({ subtitleIntroduction: 'A real wedding at a real venue.' }))

    const meta = await storyMetadataFor('a-story')

    expect(meta.description).toBe('A real wedding at a real venue.')
    expect(meta.openGraph).toMatchObject({ description: 'A real wedding at a real venue.' })
    expect(meta.twitter).toMatchObject({ description: 'A real wedding at a real venue.' })
  })

  it('falls back the description to StudioProfile.defaultMetaDescription when subtitleIntroduction is unset', async () => {
    getStudioProfile.mockResolvedValue(studioProfile({ defaultMetaDescription: 'Fallback studio description.' }))
    getStoryBySlug.mockResolvedValue(story({ subtitleIntroduction: '' }))

    const meta = await storyMetadataFor('a-story')

    expect(meta.description).toBe('Fallback studio description.')
    expect(meta.openGraph).toMatchObject({ description: 'Fallback studio description.' })
    expect(meta.twitter).toMatchObject({ description: 'Fallback studio description.' })
  })

  it('falls back the Open Graph/Twitter image to StudioProfile.defaultSocialImage — a story has no image field of its own', async () => {
    getStudioProfile.mockResolvedValue(studioProfile({ defaultSocialImage: { url: '/media/studio-default-og.jpg' } }))
    getStoryBySlug.mockResolvedValue(story())

    const meta = await storyMetadataFor('a-story')

    expect(meta.openGraph).toMatchObject({ images: [{ url: '/media/studio-default-og.jpg' }] })
    expect(meta.twitter).toMatchObject({ images: ['/media/studio-default-og.jpg'] })
  })

  it('omits Open Graph/Twitter images entirely when StudioProfile defines no defaultSocialImage', async () => {
    getStudioProfile.mockResolvedValue(studioProfile({ defaultSocialImage: null }))
    getStoryBySlug.mockResolvedValue(story())

    const meta = await storyMetadataFor('a-story')

    expect(meta.openGraph).toMatchObject({ images: undefined })
    expect(meta.twitter).toMatchObject({ images: undefined })
  })

  it('returns no metadata for a draft or missing story', async () => {
    getStudioProfile.mockResolvedValue(studioProfile())
    getStoryBySlug.mockResolvedValue(story({ status: 'draft' }))

    const draftMeta = await storyMetadataFor('a-draft-story')
    expect(draftMeta).toEqual({})

    getStoryBySlug.mockResolvedValue(null)
    const missingMeta = await storyMetadataFor('does-not-exist')
    expect(missingMeta).toEqual({})
  })

  it('two stories with different titles/descriptions produce distinct metadata', async () => {
    getStudioProfile.mockResolvedValue(studioProfile())

    getStoryBySlug.mockResolvedValue(story({ title: 'Story A', subtitleIntroduction: 'Intro A' }))
    const metaA = await storyMetadataFor('story-a')

    getStoryBySlug.mockResolvedValue(story({ title: 'Story B', subtitleIntroduction: 'Intro B' }))
    const metaB = await storyMetadataFor('story-b')

    expect(metaA.title).not.toBe(metaB.title)
    expect(metaA.description).not.toBe(metaB.description)
    expect(metaA.alternates).not.toEqual(metaB.alternates)
  })
})
