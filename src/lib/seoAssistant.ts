/**
 * ---
 * file: src/lib/seoAssistant.ts
 * project: earthandhoney
 * purpose: AC-37.6.2 — pure computation behind the per-page/per-story SEO
 *          Assistant panel (PRD §21.2): the six DERIVED controls — search-
 *          result preview, canonical URL, H1 preview, schema preview,
 *          missing-alt-text audit, internal-link suggestions — the ones
 *          computed rather than typed. The eight AUTHORED controls
 *          (seoTitle, slug, metaDescription, photographyType, cityRegion,
 *          venue, Open Graph image, index/noindex) are AC-37.6.1's real
 *          Payload fields on `Pages`/`Stories`, already editable through
 *          Payload's own field UI — this module never echoes them as a
 *          second control, it only consumes the values its six DERIVED
 *          controls actually need in order to compute (e.g. the resolved
 *          title segment the search-result preview composes through
 *          StudioProfile's title pattern).
 *          Never imports `payload` — the same convention
 *          src/lib/studioStructuredData.ts and src/lib/absoluteSiteUrl.ts
 *          already follow, so this module is directly unit-testable without
 *          crossing the ESM boundary Jest imposes on `payload` (see
 *          us3-ac3.5-galleries-api-read.test.ts). The caller
 *          (src/components/admin/SeoAssistant/SeoAssistantField.tsx) resolves
 *          `payload` data into this module's input shape, mirroring each
 *          live public route's own resolution exactly:
 *          `resolvedTitleSegment`/`resolvedDescription` are computed by the
 *          caller using the SAME fallback chain
 *          src/app/(frontend)/[slug]/page.tsx and
 *          src/app/(frontend)/stories/[slug]/page.tsx already use in their
 *          own `generateMetadata`, and `schemaPreview` is built by the
 *          caller via buildPageStructuredData/buildStoryStructuredData
 *          (AC-37.3) — so the preview shows what the page will actually
 *          emit, never a second guess at it. This module only assembles and
 *          ranks already-resolved input; it never fetches.
 *          No `keywords`/meta-keywords input exists anywhere in this file
 *          and none is emitted — PRD §21.2 forbids a meta-keywords
 *          field/surface anywhere in the product (mirrors the same
 *          statement in src/lib/studioStructuredData.ts's header).
 *          Missing-alt-text audit: PicPeak's photo row carries no alt-text
 *          column at all (src/components/gallery/backstageGalleryMapper.ts's
 *          header) — every placed image's `alt` is therefore always a
 *          filename/event-name fallback, never authored copy, so this
 *          module reports every resolved image as missing authored alt text
 *          rather than guessing which fallbacks "look like" real captions.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.2.1
 * ---
 */
import { absoluteSiteUrl } from './absoluteSiteUrl'

export interface SearchResultPreview {
  /** The title as it will actually render — the resolved title segment composed through StudioProfile's `%s` title pattern. */
  title: string
  url: string
  description: string
}

export interface MissingAltTextEntry {
  imageId: string
  /** The fallback string currently used as this image's `alt` attribute — a filename or the gallery/event name, never authored copy. */
  fallbackAlt: string
  thumbnailUrl?: string
}

export type InternalLinkSuggestionReason = 'same-photography-type' | 'same-city-region' | 'other-published-content'

export interface InternalLinkSuggestion {
  label: string
  path: string
  reason: InternalLinkSuggestionReason
}

/** The six DERIVED PRD §21.2 controls this AC builds. */
export interface SeoAssistantSnapshot {
  kind: 'page' | 'story'
  searchResultPreview: SearchResultPreview
  canonicalUrl: string
  h1Preview: string
  schemaPreview: Record<string, unknown>
  missingAltText: MissingAltTextEntry[]
  internalLinkSuggestions: InternalLinkSuggestion[]
}

export interface SeoAssistantImageInput {
  id: string
  /** The resolved `GalleryImage.alt` value — always a fallback, per this file's header. */
  alt: string
  thumbnailUrl?: string
}

export interface SeoAssistantCandidateInput {
  label: string
  /** Site-relative path, e.g. `/weddings` or `/stories/a-real-wedding`. */
  path: string
  photographyType?: string
  cityRegion?: string
}

export interface SeoAssistantInput {
  kind: 'page' | 'story'
  /** The rendered H1 — `Pages.heading` or `Stories.title`. */
  h1: string
  /** Site-relative path this document renders at, e.g. `/weddings` or `/stories/a-real-wedding`. */
  path: string
  /** The route's own resolved title segment, before StudioProfile's title pattern is applied. */
  resolvedTitleSegment: string
  /** The route's own resolved meta description, fallback chain already applied by the caller. */
  resolvedDescription: string
  /** `StudioProfile.defaultTitlePattern`, e.g. `'%s | Earth & Honey Studios'`. */
  titlePattern: string
  photographyType: string
  cityRegion: string
  /** Pre-built by the caller via buildPageStructuredData/buildStoryStructuredData — this module embeds it as-is. */
  schemaPreview: Record<string, unknown>
  /** Every image resolved from this document's placed gallery(ies), already flattened across placements. */
  images: SeoAssistantImageInput[]
  /** Other published pages/stories — the current document already excluded by the caller. */
  candidates: SeoAssistantCandidateInput[]
}

const MAX_INTERNAL_LINK_SUGGESTIONS = 8

/** Applies StudioProfile's `%s` title pattern, degrading to the plain segment when the pattern carries no placeholder. */
function applyTitlePattern(titleSegment: string, pattern: string): string {
  return pattern.includes('%s') ? pattern.replace('%s', titleSegment) : titleSegment || pattern
}

/** Every resolved placed image, since none carries authored alt text today (see file header) — not a heuristic filter. */
function auditMissingAltText(images: SeoAssistantImageInput[]): MissingAltTextEntry[] {
  return images.map((image) => ({
    imageId: image.id,
    fallbackAlt: image.alt,
    thumbnailUrl: image.thumbnailUrl,
  }))
}

/**
 * Ranks other published content by relevance to the current document: same
 * `photographyType` first, then same `cityRegion`, then everything else —
 * each candidate contributes at most one suggestion, in that priority
 * order, alphabetical by path as a deterministic tiebreak. Capped at
 * {@link MAX_INTERNAL_LINK_SUGGESTIONS} so the panel stays scannable; because
 * the cap is applied AFTER that ranking it always drops from the least
 * relevant end first, so a same-type match is only ever dropped when the cap
 * is already full of same-type matches.
 */
function suggestInternalLinks(
  currentPath: string,
  photographyType: string,
  cityRegion: string,
  candidates: SeoAssistantCandidateInput[],
): InternalLinkSuggestion[] {
  const others = candidates.filter((candidate) => candidate.path !== currentPath)

  const reasoned: Array<{ candidate: SeoAssistantCandidateInput; reason: InternalLinkSuggestionReason; rank: number }> = others.map(
    (candidate) => {
      if (photographyType && candidate.photographyType === photographyType) {
        return { candidate, reason: 'same-photography-type', rank: 0 }
      }
      if (cityRegion && candidate.cityRegion === cityRegion) {
        return { candidate, reason: 'same-city-region', rank: 1 }
      }
      return { candidate, reason: 'other-published-content', rank: 2 }
    },
  )

  reasoned.sort((a, b) => a.rank - b.rank || a.candidate.path.localeCompare(b.candidate.path))

  return reasoned.slice(0, MAX_INTERNAL_LINK_SUGGESTIONS).map(({ candidate, reason }) => ({
    label: candidate.label,
    path: candidate.path,
    reason,
  }))
}

/** Assembles the six DERIVED PRD §21.2 controls from already-resolved input. Never fetches, never throws on empty/missing optional input — an unset field renders as an empty string/list, the same fail-open convention every other reader in this project follows. */
export function buildSeoAssistantSnapshot(input: SeoAssistantInput): SeoAssistantSnapshot {
  const canonicalUrl = absoluteSiteUrl(input.path)

  return {
    kind: input.kind,
    searchResultPreview: {
      title: applyTitlePattern(input.resolvedTitleSegment, input.titlePattern),
      url: canonicalUrl,
      description: input.resolvedDescription,
    },
    canonicalUrl,
    h1Preview: input.h1,
    schemaPreview: input.schemaPreview,
    missingAltText: auditMissingAltText(input.images),
    internalLinkSuggestions: suggestInternalLinks(input.path, input.photographyType, input.cityRegion, input.candidates),
  }
}
