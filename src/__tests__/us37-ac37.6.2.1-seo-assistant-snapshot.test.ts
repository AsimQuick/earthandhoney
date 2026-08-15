/**
 * ---
 * file: src/__tests__/us37-ac37.6.2.1-seo-assistant-snapshot.test.ts
 * project: earthandhoney
 * purpose: AC-37.6.2.1 evidence — unit-level proof that `buildSeoAssistantSnapshot`
 *          (src/lib/seoAssistant.ts) computes each of the six DERIVED PRD
 *          §21.2 controls (search-result preview, canonical URL, H1 preview,
 *          schema preview, missing-alt-text audit, internal-link
 *          suggestions) from the supplied document's OWN values — so a
 *          hardcoded, empty or wrong-document implementation fails every
 *          "own values" assertion below, not just a shape check. This suite
 *          owns the computation only: the panel's *rendering* of those
 *          controls and the resolution of real Payload documents into this
 *          module's input shape are AC-37.6.2.2/37.6.2.3's evidence, not
 *          built here. `seoAssistant.ts` imports no `payload`, so it is
 *          exercised directly here rather than across the ESM boundary
 *          `payload` imposes on Jest (see us3-ac3.5-galleries-api-read.test.ts).
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.2.1
 * ---
 */
import { absoluteSiteUrl } from '@/lib/absoluteSiteUrl'
import { buildSeoAssistantSnapshot, type SeoAssistantInput } from '@/lib/seoAssistant'

const PAGE_SCHEMA_PREVIEW = {
  '@context': 'https://schema.org',
  '@type': ['LocalBusiness', 'ProfessionalService'],
  name: 'Earth & Honey Studios',
  url: absoluteSiteUrl('/weddings'),
}

const PAGE_INPUT: SeoAssistantInput = {
  kind: 'page',
  h1: 'Wedding Photography',
  path: '/weddings',
  resolvedTitleSegment: 'Wedding Photography in Dubai',
  resolvedDescription: 'Documentary wedding photography across Dubai and the UAE.',
  titlePattern: '%s | Earth & Honey Studios',
  photographyType: 'wedding',
  cityRegion: 'Dubai',
  schemaPreview: PAGE_SCHEMA_PREVIEW,
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

const STORY_SCHEMA_PREVIEW = {
  '@context': 'https://schema.org',
  '@type': 'CreativeWork',
  headline: 'A Dubai Wedding',
  url: absoluteSiteUrl('/stories/a-dubai-wedding'),
}

const STORY_INPUT: SeoAssistantInput = {
  kind: 'story',
  h1: 'A Dubai Wedding',
  path: '/stories/a-dubai-wedding',
  resolvedTitleSegment: 'A Dubai Wedding',
  resolvedDescription: 'A documentary account of a real Dubai wedding day.',
  titlePattern: '%s | Earth & Honey Studios',
  photographyType: 'wedding',
  cityRegion: 'Dubai',
  schemaPreview: STORY_SCHEMA_PREVIEW,
  images: [],
  candidates: [{ label: 'Weddings', path: '/weddings', photographyType: 'wedding', cityRegion: 'Dubai' }],
}

describe('US-37 AC-37.6.2: buildSeoAssistantSnapshot computes the six DERIVED controls from a page\'s own values', () => {
  const snapshot = buildSeoAssistantSnapshot(PAGE_INPUT)

  it('1. search-result preview composes the title through StudioProfile\'s title pattern, with the canonical URL and description', () => {
    expect(snapshot.searchResultPreview).toEqual({
      title: 'Wedding Photography in Dubai | Earth & Honey Studios',
      url: absoluteSiteUrl('/weddings'),
      description: 'Documentary wedding photography across Dubai and the UAE.',
    })
  })

  it('2. canonical URL is the absolute URL of this document\'s own path', () => {
    expect(snapshot.canonicalUrl).toBe(absoluteSiteUrl('/weddings'))
  })

  it('3. H1 preview is the heading the public route actually renders', () => {
    expect(snapshot.h1Preview).toBe('Wedding Photography')
  })

  it('4. schema preview embeds the caller-built JSON-LD as-is — one builder, not a second implementation', () => {
    expect(snapshot.schemaPreview).toEqual(PAGE_SCHEMA_PREVIEW)
  })

  it('5. missing-alt-text audit reports every placed image with the fallback alt currently in use', () => {
    expect(snapshot.missingAltText).toEqual([
      { imageId: 'photo-1', fallbackAlt: 'IMG_0041.jpg', thumbnailUrl: '/gallery/photo-1-thumb.jpg' },
      { imageId: 'photo-2', fallbackAlt: 'IMG_0042.jpg', thumbnailUrl: undefined },
    ])
  })

  it('6. internal-link suggestions rank same-photography-type first, then same-city-region, then everything else', () => {
    expect(snapshot.internalLinkSuggestions).toEqual([
      { label: 'A Dubai Wedding', path: '/stories/a-dubai-wedding', reason: 'same-photography-type' },
      { label: 'Engagements', path: '/engagements', reason: 'same-city-region' },
      { label: 'About', path: '/about', reason: 'other-published-content' },
    ])
  })

  it('reports the document kind it was built for', () => {
    expect(snapshot.kind).toBe('page')
  })

  it('exposes exactly the six DERIVED controls plus the document kind — no AUTHORED-field echo, no keywords', () => {
    expect(Object.keys(snapshot).sort()).toEqual(
      ['kind', 'searchResultPreview', 'canonicalUrl', 'h1Preview', 'schemaPreview', 'missingAltText', 'internalLinkSuggestions'].sort(),
    )
  })
})

describe('US-37 AC-37.6.2: the same six controls are computed from a story\'s own values, not the page fixture\'s', () => {
  const snapshot = buildSeoAssistantSnapshot(STORY_INPUT)

  it('produces every one of the six controls from the story\'s own data', () => {
    expect(snapshot.kind).toBe('story')
    expect(snapshot.h1Preview).toBe('A Dubai Wedding')
    expect(snapshot.canonicalUrl).toBe(absoluteSiteUrl('/stories/a-dubai-wedding'))
    expect(snapshot.searchResultPreview).toEqual({
      title: 'A Dubai Wedding | Earth & Honey Studios',
      url: absoluteSiteUrl('/stories/a-dubai-wedding'),
      description: 'A documentary account of a real Dubai wedding day.',
    })
    expect(snapshot.schemaPreview).toEqual(STORY_SCHEMA_PREVIEW)
  })

  it('canonical URL carries the /stories prefix the public story route renders at, distinct from the page\'s own path', () => {
    expect(snapshot.canonicalUrl).not.toBe(absoluteSiteUrl('/weddings'))
    expect(snapshot.canonicalUrl).toBe(absoluteSiteUrl('/stories/a-dubai-wedding'))
  })

  it('audits an empty image list to an empty report rather than throwing or reusing the page\'s images', () => {
    expect(snapshot.missingAltText).toEqual([])
  })

  it('never suggests itself among internal links, even though its own path never appears in its candidate list', () => {
    expect(snapshot.internalLinkSuggestions.map((suggestion) => suggestion.path)).not.toContain(
      '/stories/a-dubai-wedding',
    )
  })
})

describe('US-37 AC-37.6.2: the search-result preview uses the caller-resolved title/description as-is', () => {
  it('composes whatever resolvedTitleSegment the caller passed through the title pattern — never a hardcoded title', () => {
    const snapshot = buildSeoAssistantSnapshot({ ...PAGE_INPUT, resolvedTitleSegment: 'A Totally Different Title' })
    expect(snapshot.searchResultPreview.title).toBe('A Totally Different Title | Earth & Honey Studios')
  })

  it('passes resolvedDescription straight through — the caller already applied the StudioProfile default fallback', () => {
    const snapshot = buildSeoAssistantSnapshot({ ...PAGE_INPUT, resolvedDescription: 'A totally different description.' })
    expect(snapshot.searchResultPreview.description).toBe('A totally different description.')
  })

  it('degrades to the plain title segment when the configured pattern carries no %s placeholder', () => {
    const snapshot = buildSeoAssistantSnapshot({ ...PAGE_INPUT, titlePattern: 'Earth & Honey Studios' })
    expect(snapshot.searchResultPreview.title).toBe('Wedding Photography in Dubai')
  })

  it('falls back to the bare pattern when a placeholder-less pattern meets an untitled document, rather than previewing an empty title', () => {
    const snapshot = buildSeoAssistantSnapshot({
      ...PAGE_INPUT,
      titlePattern: 'Earth & Honey Studios',
      resolvedTitleSegment: '',
    })
    expect(snapshot.searchResultPreview.title).toBe('Earth & Honey Studios')
  })
})

describe('US-37 AC-37.6.2: internal-link suggestions stay relevant, self-excluding and bounded', () => {
  it('never suggests the document being edited, even if the caller\'s candidate list accidentally includes it', () => {
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

describe('US-37 AC-37.6.2: missing-alt-text audit reflects exactly the images the caller resolved', () => {
  it('reports a different set of images verbatim rather than a fixed/cached list', () => {
    const snapshot = buildSeoAssistantSnapshot({
      ...PAGE_INPUT,
      images: [{ id: 'photo-9', alt: 'a-completely-different-file.jpg' }],
    })
    expect(snapshot.missingAltText).toEqual([
      { imageId: 'photo-9', fallbackAlt: 'a-completely-different-file.jpg', thumbnailUrl: undefined },
    ])
  })
})
