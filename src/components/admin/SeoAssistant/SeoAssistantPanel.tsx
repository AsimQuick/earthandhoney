/**
 * ---
 * file: src/components/admin/SeoAssistant/SeoAssistantPanel.tsx
 * project: earthandhoney
 * purpose: AC-37.6.2.2 — the presentational half of the PRD §21.2 Page/Story
 *          SEO Assistant panel: renders a `SeoAssistantSnapshot`
 *          (src/lib/seoAssistant.ts, AC-37.6.2.1) as six labelled,
 *          `data-testid`-addressable sections, one per DERIVED PRD §21.2
 *          control (search-result preview, canonical URL, H1 preview,
 *          schema preview, missing-alt-text audit, internal-link
 *          suggestions). Takes the snapshot as its ONLY prop — no `payload`
 *          import, no data fetching — so it renders identically whether
 *          mounted by the Payload UI field inside the admin (AC-37.6.2.3)
 *          or by a Jest/RTL test with a fixture, the same "pure component,
 *          thin server wrapper" split src/lib/studioStructuredData.ts and
 *          its callers already use. The panel is READ-ONLY: it renders no
 *          input/textarea/select, so there is never a second place an
 *          AC-37.6.1 authored field can be edited from, and it generates no
 *          captions (AC-37.7). No `keywords`/meta-keywords control exists
 *          here and none is rendered — PRD §21.2 forbids one anywhere in the
 *          product.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.2.2
 * ---
 */
import type { SeoAssistantSnapshot } from '@/lib/seoAssistant'

export interface SeoAssistantPanelProps {
  snapshot: SeoAssistantSnapshot
}

export function SeoAssistantPanel({ snapshot }: SeoAssistantPanelProps) {
  return (
    <div data-testid="seo-assistant-panel">
      <section data-testid="seo-assistant-search-preview">
        <h3>Search-result preview</h3>
        <p data-testid="seo-assistant-search-preview-title">{snapshot.searchResultPreview.title}</p>
        <p data-testid="seo-assistant-search-preview-url">{snapshot.searchResultPreview.url}</p>
        <p data-testid="seo-assistant-search-preview-description">{snapshot.searchResultPreview.description}</p>
      </section>

      <section data-testid="seo-assistant-canonical-url">
        <h3>Canonical URL</h3>
        <p>{snapshot.canonicalUrl}</p>
      </section>

      <section data-testid="seo-assistant-h1-preview">
        <h3>H1 preview</h3>
        <p>{snapshot.h1Preview}</p>
      </section>

      <section data-testid="seo-assistant-schema-preview">
        <h3>Schema preview</h3>
        <pre data-testid="seo-assistant-schema-preview-json">{JSON.stringify(snapshot.schemaPreview, null, 2)}</pre>
      </section>

      <section data-testid="seo-assistant-missing-alt-audit">
        <h3>Missing alt-text audit</h3>
        {snapshot.missingAltText.length === 0 ? (
          <p data-testid="seo-assistant-missing-alt-audit-empty">No placed images to audit.</p>
        ) : (
          <ul>
            {snapshot.missingAltText.map((entry) => (
              <li key={entry.imageId} data-testid="seo-assistant-missing-alt-audit-item">
                {entry.fallbackAlt || entry.imageId}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="seo-assistant-internal-link-suggestions">
        <h3>Internal-link suggestions</h3>
        {snapshot.internalLinkSuggestions.length === 0 ? (
          <p data-testid="seo-assistant-internal-link-suggestions-empty">No suggestions available.</p>
        ) : (
          <ul>
            {snapshot.internalLinkSuggestions.map((suggestion) => (
              <li key={suggestion.path} data-testid="seo-assistant-internal-link-suggestion-item">
                <a href={suggestion.path}>{suggestion.label}</a> ({suggestion.reason})
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
