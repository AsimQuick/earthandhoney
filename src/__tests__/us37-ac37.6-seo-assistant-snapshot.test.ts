/**
 * ---
 * file: src/__tests__/us37-ac37.6-seo-assistant-snapshot.test.ts
 * project: earthandhoney
 * purpose: AC-37.6 evidence — unit-level proof that `buildSeoAssistantSnapshot`
 *          (src/lib/seoAssistant.ts) computes all fourteen PRD §21.2 controls
 *          (search-result preview, SEO title, slug, meta description,
 *          canonical URL, H1 preview, photography type, city/region, venue,
 *          Open Graph image, index/noindex, schema preview, missing-alt-text
 *          audit, internal-link suggestions) for both a page and a story,
 *          including the exact `seoTitle || heading` / `metaDescription ||
 *          default` fallback chain the public routes already use, so the
 *          admin preview can never diverge from what the live route renders.
 *          The panel's *rendering* of those controls is proven separately in
 *          us37-ac37.6-seo-assistant-panel.test.tsx, and their presence in a
 *          real Payload admin edit view in
 *          us37-ac37.6-seo-assistant-admin-live.test.ts — this suite owns the
 *          computation only. `seoAssistant.ts` imports no `payload`, so it is
 *          exercised directly here rather than across the ESM boundary
 *          `payload` imposes on Jest (see us3-ac3.5-galleries-api-read.test.ts).
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.6
 * ---
 */
import { absoluteSiteUrl } from '@/lib/absoluteSiteUrl'
import { buildSeoAssistantSnapshot, type SeoAssistantInput } from '@/lib/seoAssistant'

const SCHEMA_PREVIEW = {
  '@context': 'https://schema.org',
  '@type': ['LocalBusiness', 'ProfessionalService'],
  name: 'Earth & Honey Studios',
}

const PAGE_INPUT: SeoAssistantInput = {
  kind: 'page',
  h1: 'Wedding Photography',
  seoTitle: 'Wedding Photography in Dubai',
  slug: 'weddings',
  path: '/weddings',
  metaDescription: 'Documentary wedding photography across Dubai and the UAE.',
  photographyType: 'wedding',
  cityRegion: 'Dubai',
  venue: 'Jumeirah Beach Hotel',
  indexing: 'index',
  openGraphImageUrl: '/media/og-weddings.jpg',
  titlePattern: '%s | Earth & Honey Studios',
  defaultMetaDescription: 'Earth & Honey Studios — wedding photography since 2006.',
  schemaPreview: SCHEMA_PREVIEW,
  images: [
    { id: 'photo-1', alt: 'IMG_0041.jpg', thumbnailUrl: '/gallery/photo-1-thumb.jpg' },
    { id: 'photo-2', alt: 'IMG_0042.jpg' },
  ],
  candidates: [
    { label: 'Engagements', path: '/engagements', photographyType: 'engagement', cityRegion: 'Dubai' },
    { label: 'A Dubai Wedding', path: '/stories/a-dubai-wedding', photographyType: 'wedding', cityRegion: 'Dubai' },
    { label: 'About', path: '/about' },
  ],
}

const STORY_INPUT: SeoAssistantInput = {
  ...PAGE_INPUT,
  kind: 'story',
  h1: 'A Dubai Wedding',
  seoTitle: '',
  slug: 'a-dubai-wedding',
  path: '/stories/a-dubai-wedding',
  metaDescription: '',
  indexing: 'noindex',
  openGraphImageUrl: null,
  images: [],
  candidates: [{ label: 'Weddings', path: '/weddings', photographyType: 'wedding', cityRegion: 'Dubai' }],
}

describe('US-37 AC-37.6: buildSeoAssistantSnapshot produces all fourteen PRD §21.2 controls for a page', () => {
  const snapshot = buildSeoAssistantSnapshot(PAGE_INPUT)

  it('1. search-result preview composes the title through StudioProfile\'s title pattern, with the canonical URL and description', () => {
    expect(snapshot.searchResultPreview).toEqual({
      title: 'Wedding Photography in Dubai | Earth & Honey Studios',
      url: absoluteSiteUrl('/weddings'),
      description: 'Documentary wedding photography across Dubai and the UAE.',
    })
  })

  it('2. SEO title is the page\'s own seoTitle', () => {
    expect(snapshot.seoTitle).toBe('Wedding Photography in Dubai')
  })

  it('3. slug is the page\'s own slug', () => {
    expect(snapshot.slug).toBe('weddings')
  })

  it('4. meta description is the page\'s own metaDescription', () => {
    expect(snapshot.metaDescription).toBe('Documentary wedding photography across Dubai and the UAE.')
  })

  it('5. canonical URL is the absolute URL of this page\'s path', () => {
    expect(snapshot.canonicalUrl).toBe(absoluteSiteUrl('/weddings'))
  })

  it('6. H1 preview is the heading the public route actually renders', () => {
    expect(snapshot.h1Preview).toBe('Wedding Photography')
  })

  it('7. photography type is carried through', () => {
    expect(snapshot.photographyType).toBe('wedding')
  })

  it('8. city/region is carried through', () => {
    expect(snapshot.cityRegion).toBe('Dubai')
  })

  it('9. venue is carried through', () => {
    expect(snapshot.venue).toBe('Jumeirah Beach Hotel')
  })

  it('10. Open Graph image is the resolved image URL', () => {
    expect(snapshot.openGraphImageUrl).toBe('/media/og-weddings.jpg')
  })

  it('11. index/noindex reports the page\'s own indexing value', () => {
    expect(snapshot.indexing).toBe('index')
  })

  it('12. schema preview embeds the caller-built JSON-LD as-is — one builder, not a second implementation', () => {
    expect(snapshot.schemaPreview).toEqual(SCHEMA_PREVIEW)
  })

  it('13. missing-alt-text audit reports every placed image with the fallback alt currently in use', () => {
    expect(snapshot.missingAltText).toEqual([
      { imageId: 'photo-1', fallbackAlt: 'IMG_0041.jpg', thumbnailUrl: '/gallery/photo-1-thumb.jpg' },
      { imageId: 'photo-2', fallbackAlt: 'IMG_0042.jpg', thumbnailUrl: undefined },
    ])
  })

  it('14. internal-link suggestions rank same-photography-type first, then same-city-region, then everything else', () => {
    expect(snapshot.internalLinkSuggestions).toEqual([
      { label: 'A Dubai Wedding', path: '/stories/a-dubai-wedding', reason: 'same-photography-type' },
      { label: 'Engagements', path: '/engagements', reason: 'same-city-region' },
      { label: 'About', path: '/about', reason: 'other-published-content' },
    ])
  })

  it('reports the document kind it was built for', () => {
    expect(snapshot.kind).toBe('page')
  })
})

describe('US-37 AC-37.6: the same fourteen controls are produced for a story', () => {
  const snapshot = buildSeoAssistantSnapshot(STORY_INPUT)

  it('produces every one of the fourteen controls, none undefined', () => {
    const controls: Array<keyof typeof snapshot> = [
      'searchResultPreview',
      'seoTitle',
      'slug',
      'metaDescription',
      'canonicalUrl',
      'h1Preview',
      'photographyType',
      'cityRegion',
      'venue',
      'openGraphImageUrl',
      'indexing',
      'schemaPreview',
      'missingAltText',
      'internalLinkSuggestions',
    ]
    expect(controls).toHaveLength(14)
    for (const control of controls) {
      expect(snapshot[control]).toBeDefined()
    }
    expect(snapshot.kind).toBe('story')
  })

  it('canonical URL carries the /stories prefix the public story route renders at', () => {
    expect(snapshot.canonicalUrl).toBe(absoluteSiteUrl('/stories/a-dubai-wedding'))
  })

  it('reports a story\'s own noindex selection', () => {
    expect(snapshot.indexing).toBe('noindex')
  })

  it('reports no Open Graph image when neither the story nor StudioProfile defines one', () => {
    expect(snapshot.openGraphImageUrl).toBeNull()
  })

  it('audits an empty image list to an empty report rather than throwing', () => {
    expect(snapshot.missingAltText).toEqual([])
  })
})

describe('US-37 AC-37.6: the preview applies the same fallback chain the public routes use', () => {
  it('falls back to the H1 when no SEO title is set, still composed through the title pattern', () => {
    const snapshot = buildSeoAssistantSnapshot(STORY_INPUT)
    expect(snapshot.seoTitle).toBe('A Dubai Wedding')
    expect(snapshot.searchResultPreview.title).toBe('A Dubai Wedding | Earth & Honey Studios')
  })

  it('falls back to StudioProfile\'s default meta description when the document sets none', () => {
    const snapshot = buildSeoAssistantSnapshot(STORY_INPUT)
    expect(snapshot.metaDescription).toBe('Earth & Honey Studios — wedding photography since 2006.')
    expect(snapshot.searchResultPreview.description).toBe('Earth & Honey Studios — wedding photography since 2006.')
  })

  it('degrades to the plain title when the configured pattern carries no %s placeholder', () => {
    const snapshot = buildSeoAssistantSnapshot({ ...PAGE_INPUT, titlePattern: 'Earth & Honey Studios' })
    expect(snapshot.searchResultPreview.title).toBe('Wedding Photography in Dubai')
  })
})

describe('US-37 AC-37.6: internal-link suggestions stay relevant, self-excluding and bounded', () => {
  it('never suggests the document being edited', () => {
    const snapshot = buildSeoAssistantSnapshot({
      ...PAGE_INPUT,
      candidates: [...PAGE_INPUT.candidates, { label: 'Weddings', path: '/weddings', photographyType: 'wedding' }],
    })
    expect(snapshot.internalLinkSuggestions.map((suggestion) => suggestion.path)).not.toContain('/weddings')
  })

  it('caps the list at eight, dropping only the least-relevant tail', () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      label: `Other ${index}`,
      path: `/other-${index}`,
    }))
    const snapshot = buildSeoAssistantSnapshot({
      ...PAGE_INPUT,
      candidates: [...PAGE_INPUT.candidates, ...many],
    })
    expect(snapshot.internalLinkSuggestions).toHaveLength(8)
    expect(snapshot.internalLinkSuggestions[0].reason).toBe('same-photography-type')
    expect(snapshot.internalLinkSuggestions[1].reason).toBe('same-city-region')
  })

  it('produces an empty list rather than throwing when there is no other published content', () => {
    expect(buildSeoAssistantSnapshot({ ...PAGE_INPUT, candidates: [] }).internalLinkSuggestions).toEqual([])
  })

  it('classifies every candidate as other-published-content when the document sets no photography type or city/region', () => {
    const snapshot = buildSeoAssistantSnapshot({ ...PAGE_INPUT, photographyType: '', cityRegion: '' })
    expect(snapshot.internalLinkSuggestions.map((suggestion) => suggestion.reason)).toEqual([
      'other-published-content',
      'other-published-content',
      'other-published-content',
    ])
  })
})
