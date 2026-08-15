/**
 * ---
 * file: src/__tests__/us37-ac37.6.2-seo-assistant-panel.test.tsx
 * project: earthandhoney
 * purpose: AC-37.6.2.2 evidence — asserts `SeoAssistantPanel`
 *          (src/components/admin/SeoAssistant/SeoAssistantPanel.tsx) renders
 *          each of the six DERIVED PRD §21.2 controls in real HTML for a
 *          page fixture AND for a story fixture, each showing the value the
 *          snapshot computed rather than a label with nothing behind it, so
 *          a hardcoded or wrong-document render fails; also asserts no
 *          editable control is rendered. The panel takes the snapshot as its
 *          ONLY prop (no `payload` import, no data fetching), so it renders
 *          identically here and inside Payload's admin — the admin mount
 *          itself is AC-37.6.2.3's evidence, not this suite's; the snapshot
 *          computation is us37-ac37.6.2.1-seo-assistant-snapshot.test.ts's.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.2.2
 * ---
 */
import { render, screen } from '@testing-library/react'

import { SeoAssistantPanel } from '@/components/admin/SeoAssistant/SeoAssistantPanel'
import type { SeoAssistantSnapshot } from '@/lib/seoAssistant'

/** The six DERIVED PRD §21.2 controls, by the `data-testid` each section renders under. */
const CONTROL_TESTIDS = [
  'seo-assistant-search-preview',
  'seo-assistant-canonical-url',
  'seo-assistant-h1-preview',
  'seo-assistant-schema-preview',
  'seo-assistant-missing-alt-audit',
  'seo-assistant-internal-link-suggestions',
]

const PAGE_SNAPSHOT: SeoAssistantSnapshot = {
  kind: 'page',
  searchResultPreview: {
    title: 'Wedding Photography in Dubai | Earth & Honey Studios',
    url: 'https://earthandhoney.example/weddings',
    description: 'Documentary wedding photography across Dubai and the UAE.',
  },
  canonicalUrl: 'https://earthandhoney.example/weddings',
  h1Preview: 'Wedding Photography',
  schemaPreview: { '@context': 'https://schema.org', '@type': ['LocalBusiness', 'ProfessionalService'], name: 'Earth & Honey Studios' },
  missingAltText: [
    { imageId: 'photo-1', fallbackAlt: 'IMG_0041.jpg', thumbnailUrl: '/gallery/photo-1-thumb.jpg' },
    { imageId: 'photo-2', fallbackAlt: 'IMG_0042.jpg' },
  ],
  internalLinkSuggestions: [
    { label: 'A Dubai Wedding', path: '/stories/a-dubai-wedding', reason: 'same-photography-type' },
    { label: 'Engagements', path: '/engagements', reason: 'same-city-region' },
  ],
}

const STORY_SNAPSHOT: SeoAssistantSnapshot = {
  kind: 'story',
  searchResultPreview: {
    title: 'A Dubai Wedding | Earth & Honey Studios',
    url: 'https://earthandhoney.example/stories/a-dubai-wedding',
    description: 'A documentary account of a real Dubai wedding day.',
  },
  canonicalUrl: 'https://earthandhoney.example/stories/a-dubai-wedding',
  h1Preview: 'A Dubai Wedding',
  schemaPreview: { '@context': 'https://schema.org', '@type': 'CreativeWork', headline: 'A Dubai Wedding' },
  missingAltText: [],
  internalLinkSuggestions: [],
}

describe('US-37 AC-37.6.2.2: the SEO Assistant panel renders all six DERIVED controls for a page', () => {
  it('renders exactly six controls, one per DERIVED PRD §21.2 row', () => {
    render(<SeoAssistantPanel snapshot={PAGE_SNAPSHOT} />)
    expect(CONTROL_TESTIDS).toHaveLength(6)
    for (const testId of CONTROL_TESTIDS) {
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    }
  })

  it('1. search-result preview shows the composed title, URL and description together', () => {
    render(<SeoAssistantPanel snapshot={PAGE_SNAPSHOT} />)
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

  it('2. canonical URL renders the document\'s own resolved URL', () => {
    render(<SeoAssistantPanel snapshot={PAGE_SNAPSHOT} />)
    expect(screen.getByTestId('seo-assistant-canonical-url')).toHaveTextContent(
      'https://earthandhoney.example/weddings',
    )
  })

  it('3. H1 preview shows the document\'s own heading', () => {
    render(<SeoAssistantPanel snapshot={PAGE_SNAPSHOT} />)
    expect(screen.getByTestId('seo-assistant-h1-preview')).toHaveTextContent('Wedding Photography')
  })

  it('4. the schema preview renders the JSON-LD the page will actually emit', () => {
    render(<SeoAssistantPanel snapshot={PAGE_SNAPSHOT} />)
    const json = screen.getByTestId('seo-assistant-schema-preview-json').textContent ?? ''
    expect(JSON.parse(json)).toEqual(PAGE_SNAPSHOT.schemaPreview)
  })

  it('5. the missing-alt-text audit lists one row per placed image lacking authored alt text', () => {
    render(<SeoAssistantPanel snapshot={PAGE_SNAPSHOT} />)
    const items = screen.getAllByTestId('seo-assistant-missing-alt-audit-item')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('IMG_0041.jpg')
    expect(items[1]).toHaveTextContent('IMG_0042.jpg')
  })

  it('5b. an image whose resolved fallback alt is itself empty is still listed, identified by its image id', () => {
    render(
      <SeoAssistantPanel
        snapshot={{ ...PAGE_SNAPSHOT, missingAltText: [{ imageId: 'photo-7', fallbackAlt: '' }] }}
      />,
    )
    const items = screen.getAllByTestId('seo-assistant-missing-alt-audit-item')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('photo-7')
  })

  it('6. internal-link suggestions render as real links, each with the reason it was suggested', () => {
    render(<SeoAssistantPanel snapshot={PAGE_SNAPSHOT} />)
    const items = screen.getAllByTestId('seo-assistant-internal-link-suggestion-item')
    expect(items).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'A Dubai Wedding' })).toHaveAttribute('href', '/stories/a-dubai-wedding')
    expect(items[0]).toHaveTextContent('same-photography-type')
    expect(items[1]).toHaveTextContent('same-city-region')
  })
})

describe('US-37 AC-37.6.2.2: the SEO Assistant panel renders all six DERIVED controls for a story, from the story\'s own values', () => {
  it('renders every control with the story\'s own data, not the page fixture\'s', () => {
    render(<SeoAssistantPanel snapshot={STORY_SNAPSHOT} />)
    for (const testId of CONTROL_TESTIDS) {
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    }
    expect(screen.getByTestId('seo-assistant-h1-preview')).toHaveTextContent('A Dubai Wedding')
    expect(screen.getByTestId('seo-assistant-canonical-url')).toHaveTextContent(
      'https://earthandhoney.example/stories/a-dubai-wedding',
    )
    expect(screen.getByTestId('seo-assistant-search-preview-title')).toHaveTextContent(
      'A Dubai Wedding | Earth & Honey Studios',
    )
  })

  it('reports an empty audit and an empty suggestion list explicitly, rather than the page fixture\'s non-empty ones', () => {
    render(<SeoAssistantPanel snapshot={STORY_SNAPSHOT} />)
    expect(screen.getByTestId('seo-assistant-missing-alt-audit-empty')).toBeInTheDocument()
    expect(screen.getByTestId('seo-assistant-internal-link-suggestions-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('seo-assistant-missing-alt-audit-item')).not.toBeInTheDocument()
    expect(screen.queryByTestId('seo-assistant-internal-link-suggestion-item')).not.toBeInTheDocument()
  })
})

describe('US-37 AC-37.6.2.2: the panel is a read-only summary, and adds no meta-keywords surface', () => {
  it('renders no editable input, so no field has a second place it can be edited from', () => {
    const { container } = render(<SeoAssistantPanel snapshot={PAGE_SNAPSHOT} />)
    expect(container.querySelectorAll('input, textarea, select')).toHaveLength(0)
  })

  it('renders nothing labelled keywords (PRD §21.2 forbids a meta-keywords field)', () => {
    const { container } = render(<SeoAssistantPanel snapshot={PAGE_SNAPSHOT} />)
    expect(container.innerHTML.toLowerCase()).not.toContain('keyword')
  })
})
