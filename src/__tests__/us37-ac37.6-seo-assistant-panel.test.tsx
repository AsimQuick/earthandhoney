/**
 * ---
 * file: src/__tests__/us37-ac37.6-seo-assistant-panel.test.tsx
 * project: earthandhoney
 * purpose: AC-37.6 evidence — asserts `SeoAssistantPanel`
 *          (src/components/admin/SeoAssistant/SeoAssistantPanel.tsx) renders
 *          all fourteen PRD §21.2 controls in real HTML, each showing the
 *          value the snapshot computed rather than a label with nothing
 *          behind it, and that the panel adds no meta-keywords surface. The
 *          panel is deliberately payload-free (it takes a plain
 *          `SeoAssistantSnapshot`), so it renders identically here and inside
 *          Payload's admin — the admin mount itself is proven live in
 *          us37-ac37.6-seo-assistant-admin-live.test.ts, and the snapshot
 *          computation in us37-ac37.6-seo-assistant-snapshot.test.ts.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.6
 * ---
 */
import { render, screen } from '@testing-library/react'

import { SeoAssistantPanel } from '@/components/admin/SeoAssistant/SeoAssistantPanel'
import type { SeoAssistantSnapshot } from '@/lib/seoAssistant'

const SNAPSHOT: SeoAssistantSnapshot = {
  kind: 'page',
  searchResultPreview: {
    title: 'Wedding Photography in Dubai | Earth & Honey Studios',
    url: 'https://earthandhoney.example/weddings',
    description: 'Documentary wedding photography across Dubai and the UAE.',
  },
  seoTitle: 'Wedding Photography in Dubai',
  slug: 'weddings',
  metaDescription: 'Documentary wedding photography across Dubai and the UAE.',
  canonicalUrl: 'https://earthandhoney.example/weddings',
  h1Preview: 'Wedding Photography',
  photographyType: 'wedding',
  cityRegion: 'Dubai',
  venue: 'Jumeirah Beach Hotel',
  openGraphImageUrl: '/media/og-weddings.jpg',
  indexing: 'noindex',
  schemaPreview: { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'Earth & Honey Studios' },
  missingAltText: [
    { imageId: 'photo-1', fallbackAlt: 'IMG_0041.jpg', thumbnailUrl: '/gallery/photo-1-thumb.jpg' },
    { imageId: 'photo-2', fallbackAlt: 'IMG_0042.jpg' },
  ],
  internalLinkSuggestions: [
    { label: 'A Dubai Wedding', path: '/stories/a-dubai-wedding', reason: 'same-photography-type' },
    { label: 'Engagements', path: '/engagements', reason: 'same-city-region' },
  ],
}

/** The fourteen PRD §21.2 controls, by the `data-testid` each section renders under. */
const CONTROL_TESTIDS = [
  'seo-assistant-search-preview',
  'seo-assistant-seo-title',
  'seo-assistant-slug',
  'seo-assistant-meta-description',
  'seo-assistant-canonical-url',
  'seo-assistant-h1-preview',
  'seo-assistant-photography-type',
  'seo-assistant-city-region',
  'seo-assistant-venue',
  'seo-assistant-og-image',
  'seo-assistant-indexing',
  'seo-assistant-schema-preview',
  'seo-assistant-missing-alt-audit',
  'seo-assistant-internal-link-suggestions',
]

describe('US-37 AC-37.6: the SEO Assistant panel renders all fourteen PRD §21.2 controls', () => {
  it('renders exactly fourteen controls, one per PRD §21.2 row', () => {
    render(<SeoAssistantPanel snapshot={SNAPSHOT} />)
    expect(CONTROL_TESTIDS).toHaveLength(14)
    for (const testId of CONTROL_TESTIDS) {
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    }
  })

  it('1. search-result preview shows the composed title, URL and description together', () => {
    render(<SeoAssistantPanel snapshot={SNAPSHOT} />)
    expect(screen.getByTestId('seo-assistant-search-preview-title')).toHaveTextContent(
      'Wedding Photography in Dubai | Earth & Honey Studios',
    )
    expect(screen.getByTestId('seo-assistant-search-preview-url')).toHaveTextContent(
      'https://earthandhoney.example/weddings',
    )
    expect(screen.getByTestId('seo-assistant-search-preview-description')).toHaveTextContent(
      'Documentary wedding photography across Dubai and the UAE.',
    )
  })

  it('2-9. the field-backed controls each echo the saved value', () => {
    render(<SeoAssistantPanel snapshot={SNAPSHOT} />)
    expect(screen.getByTestId('seo-assistant-seo-title')).toHaveTextContent('Wedding Photography in Dubai')
    expect(screen.getByTestId('seo-assistant-slug')).toHaveTextContent('weddings')
    expect(screen.getByTestId('seo-assistant-meta-description')).toHaveTextContent(
      'Documentary wedding photography across Dubai and the UAE.',
    )
    expect(screen.getByTestId('seo-assistant-canonical-url')).toHaveTextContent(
      'https://earthandhoney.example/weddings',
    )
    expect(screen.getByTestId('seo-assistant-h1-preview')).toHaveTextContent('Wedding Photography')
    expect(screen.getByTestId('seo-assistant-photography-type')).toHaveTextContent('wedding')
    expect(screen.getByTestId('seo-assistant-city-region')).toHaveTextContent('Dubai')
    expect(screen.getByTestId('seo-assistant-venue')).toHaveTextContent('Jumeirah Beach Hotel')
  })

  it('10. the Open Graph image control previews the resolved image', () => {
    render(<SeoAssistantPanel snapshot={SNAPSHOT} />)
    expect(screen.getByTestId('seo-assistant-og-image-preview')).toHaveAttribute('src', '/media/og-weddings.jpg')
  })

  it('11. index/noindex reports the document\'s own selection, not a hardcoded "index"', () => {
    render(<SeoAssistantPanel snapshot={SNAPSHOT} />)
    expect(screen.getByTestId('seo-assistant-indexing')).toHaveTextContent('noindex')
  })

  it('12. the schema preview renders the JSON-LD the page will actually emit', () => {
    render(<SeoAssistantPanel snapshot={SNAPSHOT} />)
    const json = screen.getByTestId('seo-assistant-schema-preview-json').textContent ?? ''
    expect(JSON.parse(json)).toEqual(SNAPSHOT.schemaPreview)
  })

  it('13. the missing-alt-text audit lists one row per placed image lacking authored alt text', () => {
    render(<SeoAssistantPanel snapshot={SNAPSHOT} />)
    const items = screen.getAllByTestId('seo-assistant-missing-alt-audit-item')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('IMG_0041.jpg')
    expect(items[1]).toHaveTextContent('IMG_0042.jpg')
  })

  it('14. internal-link suggestions render as real links, each with the reason it was suggested', () => {
    render(<SeoAssistantPanel snapshot={SNAPSHOT} />)
    const items = screen.getAllByTestId('seo-assistant-internal-link-suggestion-item')
    expect(items).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'A Dubai Wedding' })).toHaveAttribute(
      'href',
      '/stories/a-dubai-wedding',
    )
    expect(items[0]).toHaveTextContent('same-photography-type')
    expect(items[1]).toHaveTextContent('same-city-region')
  })
})

describe('US-37 AC-37.6: the panel degrades honestly on an empty document rather than showing stale values', () => {
  const EMPTY: SeoAssistantSnapshot = {
    ...SNAPSHOT,
    kind: 'story',
    seoTitle: '',
    slug: '',
    metaDescription: '',
    h1Preview: '',
    photographyType: '',
    cityRegion: '',
    venue: '',
    openGraphImageUrl: null,
    missingAltText: [],
    internalLinkSuggestions: [],
  }

  it('still renders all fourteen controls', () => {
    render(<SeoAssistantPanel snapshot={EMPTY} />)
    for (const testId of CONTROL_TESTIDS) {
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    }
  })

  it('shows "Not set" for an unset field-backed control instead of an empty box', () => {
    render(<SeoAssistantPanel snapshot={EMPTY} />)
    expect(screen.getByTestId('seo-assistant-venue')).toHaveTextContent('Not set')
    expect(screen.getByTestId('seo-assistant-og-image')).toHaveTextContent('Not set')
    expect(screen.queryByTestId('seo-assistant-og-image-preview')).not.toBeInTheDocument()
  })

  it('reports an empty audit and an empty suggestion list explicitly', () => {
    render(<SeoAssistantPanel snapshot={EMPTY} />)
    expect(screen.getByTestId('seo-assistant-missing-alt-audit-empty')).toBeInTheDocument()
    expect(screen.getByTestId('seo-assistant-internal-link-suggestions-empty')).toBeInTheDocument()
  })
})

describe('US-37 AC-37.6: the panel is a read-only summary, and adds no meta-keywords surface', () => {
  it('renders no editable input, so no field has a second place it can be edited from', () => {
    const { container } = render(<SeoAssistantPanel snapshot={SNAPSHOT} />)
    expect(container.querySelectorAll('input, textarea, select')).toHaveLength(0)
  })

  it('renders nothing labelled keywords (PRD §21.2 forbids a meta-keywords field)', () => {
    const { container } = render(<SeoAssistantPanel snapshot={SNAPSHOT} />)
    expect(container.innerHTML.toLowerCase()).not.toContain('keyword')
  })
})
