/**
 * ---
 * file: src/components/admin/SeoAssistant/SeoAssistantField.tsx
 * project: earthandhoney
 * purpose: AC-37.6.2.3 — the Payload admin wiring for the PRD §21.2 Page/Story
 *          SEO Assistant: a Payload 3 `ui`-type field Server Component
 *          (`UIFieldServerComponent`), mounted on BOTH `pages`
 *          (src/collections/Pages.ts) and `stories`
 *          (src/collections/Stories.ts). This is the ONLY module that
 *          resolves a document for the assistant — `SeoAssistantPanel`
 *          (AC-37.6.2.2) and `buildSeoAssistantSnapshot`
 *          (src/lib/seoAssistant.ts, AC-37.6.2.1) are both payload-import-free
 *          pure functions that take already-resolved input, so there is
 *          never a second place a document gets read for this feature.
 *          Mounting it takes two halves, both required: the `ui` field's
 *          `admin.components.Field` on each collection, AND the matching
 *          `path#exportName` entry in the generated, committed import map
 *          (src/app/(payload)/admin/importMap.js) that Payload resolves that
 *          string through — the admin renders nothing at all for a component
 *          missing from that map. Both halves are guarded by this AC's suite,
 *          since `payload generate:importmap` cannot run in this project's
 *          Node 20 container (its CLI `require()`s an ESM graph carrying
 *          top-level await) and so cannot be relied on to regenerate the map.
 *          Payload passes `payload`/`collectionSlug`/`id` directly to a field
 *          Server Component (node_modules/payload/dist/admin/forms/Field.d.ts's
 *          `ServerComponentProps`), so this file re-reads the CURRENT
 *          document at `depth: 1` via the Local API — the exact same depth
 *          src/lib/getPageBySlug.ts and src/lib/getStoryBySlug.ts already use
 *          for the same `galleryPlacements`/`sections[].galleryPlacement`
 *          relations — rather than trust the `data`/`value` props' own
 *          population depth, which Payload does not document as stable for a
 *          `ui` field.
 *          Every input this file assembles mirrors an existing owner rather
 *          than re-deriving it: `StudioProfile` through
 *          src/lib/getStudioProfile.ts (the same reader every public route
 *          already uses); the title/description fallback chains are copied
 *          field-for-field from src/app/(frontend)/[slug]/page.tsx's and
 *          src/app/(frontend)/stories/[slug]/page.tsx's own `generateMetadata`
 *          — for a page, `seoTitle || heading` and
 *          `metaDescription || StudioProfile.defaultMetaDescription`; for a
 *          story, `title` alone (that route does not fall back to `seoTitle`
 *          today) and `subtitleIntroduction || StudioProfile.defaultMetaDescription`
 *          (not `metaDescription`) — so the preview shows exactly what those
 *          routes actually emit right now, including the gap that AC-37.6.1's
 *          newer `Stories.seoTitle`/`Stories.metaDescription` fields are not
 *          yet consumed by that route; the schema preview through
 *          buildPageStructuredData/buildStoryStructuredData
 *          (src/lib/studioStructuredData.ts, AC-37.3), called with the exact
 *          same context shape those two routes pass; and placed-gallery
 *          images through the Flow A boundary `resolveGalleryPlacementImages`
 *          (src/lib/backstageGalleryPlacement.ts, AC-37.4.3) — never a second
 *          Backstage client and never a raw read of anything Backstage-owned
 *          (Reminder 4). A placement whose gallery is unreachable
 *          contributes no images rather than failing this view, matching
 *          that function's never-throws contract. Internal-link candidates
 *          are every other published `pages`/`stories` document, matched by
 *          `payload.find` (the same Local API the rest of this file already
 *          uses) with the current document excluded by its own resolved
 *          path.
 *          This file is never imported by a Jest test — it uses the
 *          `payload` Local API directly, which breaks Jest's ESM interop
 *          boundary (see us3-ac3.5-galleries-api-read.test.ts), the same
 *          convention every other Local-API-calling route/reader in this
 *          project follows. Its structural rules (Flow A only, no second
 *          Backstage client, no create/update/delete, the only `payload`
 *          importer under this directory and src/lib/seoAssistant.ts) are
 *          proven by static source inspection instead
 *          (us37-ac37.6.2.3-seo-assistant-field-source-guard.test.ts, the
 *          same technique us37-ac37.4.3-sitemap-image-source-guard.test.ts
 *          uses); a real render against the actual admin is AC-37.6.3's
 *          evidence, not this file's own test.
 *          Read-only by construction: this component renders no
 *          input/textarea/select of its own (SeoAssistantPanel doesn't
 *          either), so it never becomes a second place an AC-37.6.1 authored
 *          field can be edited from, and it generates no captions (AC-37.7).
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.2.3
 * ---
 */
import type { Payload, UIFieldServerComponent } from 'payload'

import { absoluteSiteUrl } from '@/lib/absoluteSiteUrl'
import { resolveGalleryPlacementImages } from '@/lib/backstageGalleryPlacement'
import { getStudioProfile } from '@/lib/getStudioProfile'
import type { SeoAssistantCandidateInput, SeoAssistantImageInput, SeoAssistantInput } from '@/lib/seoAssistant'
import { buildSeoAssistantSnapshot } from '@/lib/seoAssistant'
import { buildPageStructuredData, buildStoryStructuredData } from '@/lib/studioStructuredData'

import { SeoAssistantPanel } from './SeoAssistantPanel'

type SupportedCollection = 'pages' | 'stories'

interface RawPageDoc {
  heading?: string
  seoTitle?: string
  slug?: string
  metaDescription?: string
  photographyType?: string
  cityRegion?: string
  venue?: string
  galleryPlacements?: Array<{ gallerySlug?: string } | number | null>
}

interface RawStoryDoc {
  title?: string
  subtitleIntroduction?: string
  slug?: string
  photographyType?: string
  cityRegion?: string
  sections?: Array<{ galleryPlacement?: { gallerySlug?: string } | number | null } | null>
}

interface CandidateDoc {
  slug?: string
  heading?: string
  navigationLabel?: string
  title?: string
  photographyType?: string
  cityRegion?: string
}

/** Every image resolved from a set of Backstage gallery slugs, through the Flow A boundary only — never a second Backstage client. */
async function resolveImages(gallerySlugs: string[]): Promise<SeoAssistantImageInput[]> {
  const uniqueSlugs = Array.from(new Set(gallerySlugs.filter(Boolean)))
  if (uniqueSlugs.length === 0) return []

  const results = await Promise.all(uniqueSlugs.map((slug) => resolveGalleryPlacementImages(slug)))
  return results.flatMap((result) =>
    result.status === 'ok'
      ? result.images.map((image) => ({ id: image.id, alt: image.alt, thumbnailUrl: image.thumbnailUrl }))
      : [],
  )
}

/** Other published `pages`/`stories` documents as internal-link candidates, with the current document excluded by its own resolved path. */
async function resolveCandidates(payload: Payload, currentPath: string): Promise<SeoAssistantCandidateInput[]> {
  const [pagesResult, storiesResult] = await Promise.all([
    payload.find({
      collection: 'pages',
      where: { status: { equals: 'published' } },
      limit: 100,
      depth: 0,
    }),
    payload.find({
      collection: 'stories',
      where: { status: { equals: 'published' } },
      limit: 100,
      depth: 0,
    }),
  ])

  const pageCandidates: SeoAssistantCandidateInput[] = (pagesResult.docs as CandidateDoc[])
    .filter((doc) => Boolean(doc.slug))
    .map((doc) => ({
      label: doc.navigationLabel || doc.heading || doc.slug || '',
      path: `/${doc.slug}`,
      photographyType: doc.photographyType || undefined,
      cityRegion: doc.cityRegion || undefined,
    }))

  const storyCandidates: SeoAssistantCandidateInput[] = (storiesResult.docs as CandidateDoc[])
    .filter((doc) => Boolean(doc.slug))
    .map((doc) => ({
      label: doc.title || doc.slug || '',
      path: `/stories/${doc.slug}`,
      photographyType: doc.photographyType || undefined,
      cityRegion: doc.cityRegion || undefined,
    }))

  return [...pageCandidates, ...storyCandidates].filter((candidate) => candidate.path !== currentPath)
}

async function buildInputForPage(payload: Payload, doc: RawPageDoc): Promise<SeoAssistantInput> {
  const studioProfile = await getStudioProfile()
  const slug = doc.slug || ''
  const path = `/${slug}`

  const gallerySlugs = (doc.galleryPlacements ?? [])
    .map((placement) => (placement && typeof placement === 'object' ? placement.gallerySlug : undefined))
    .filter((slugValue): slugValue is string => Boolean(slugValue))

  const [images, candidates] = await Promise.all([resolveImages(gallerySlugs), resolveCandidates(payload, path)])

  // Mirrors src/app/(frontend)/[slug]/page.tsx's generateMetadata exactly —
  // see this file's header — so the preview matches what that route emits.
  const resolvedTitleSegment = doc.seoTitle || doc.heading || ''
  const resolvedDescription = doc.metaDescription || studioProfile.defaultMetaDescription

  const schemaPreview = buildPageStructuredData(studioProfile, {
    url: absoluteSiteUrl(path),
    photographyType: doc.photographyType || undefined,
    cityRegion: doc.cityRegion || undefined,
    venue: doc.venue || undefined,
  }) as unknown as Record<string, unknown>

  return {
    kind: 'page',
    h1: doc.heading || '',
    path,
    resolvedTitleSegment,
    resolvedDescription,
    titlePattern: studioProfile.defaultTitlePattern,
    photographyType: doc.photographyType || '',
    cityRegion: doc.cityRegion || '',
    schemaPreview,
    images,
    candidates,
  }
}

async function buildInputForStory(payload: Payload, doc: RawStoryDoc): Promise<SeoAssistantInput> {
  const studioProfile = await getStudioProfile()
  const slug = doc.slug || ''
  const path = `/stories/${slug}`

  const gallerySlugs = (doc.sections ?? [])
    .map((section) =>
      section?.galleryPlacement && typeof section.galleryPlacement === 'object'
        ? section.galleryPlacement.gallerySlug
        : undefined,
    )
    .filter((slugValue): slugValue is string => Boolean(slugValue))

  const [images, candidates] = await Promise.all([resolveImages(gallerySlugs), resolveCandidates(payload, path)])

  // Mirrors src/app/(frontend)/stories/[slug]/page.tsx's generateMetadata
  // exactly — see this file's header: `title` alone (no `seoTitle` fallback
  // yet) and `subtitleIntroduction || StudioProfile.defaultMetaDescription`
  // (not `metaDescription`), so the preview matches what that route emits
  // today rather than what it could emit.
  const resolvedTitleSegment = doc.title || ''
  const resolvedDescription = doc.subtitleIntroduction || studioProfile.defaultMetaDescription

  const schemaPreview = buildStoryStructuredData(studioProfile, {
    url: absoluteSiteUrl(path),
    title: doc.title || '',
    description: doc.subtitleIntroduction || undefined,
    image: studioProfile.defaultSocialImage?.url || undefined,
  }) as unknown as Record<string, unknown>

  return {
    kind: 'story',
    h1: doc.title || '',
    path,
    resolvedTitleSegment,
    resolvedDescription,
    titlePattern: studioProfile.defaultTitlePattern,
    photographyType: doc.photographyType || '',
    cityRegion: doc.cityRegion || '',
    schemaPreview,
    images,
    candidates,
  }
}

export const SeoAssistantField: UIFieldServerComponent = async ({ payload, collectionSlug, id }) => {
  if (collectionSlug !== 'pages' && collectionSlug !== 'stories') {
    return null
  }
  const kind: SupportedCollection = collectionSlug

  if (id === undefined || id === null) {
    return (
      <p data-testid="seo-assistant-unsaved">
        Save this {kind === 'pages' ? 'page' : 'story'} to see its SEO Assistant preview.
      </p>
    )
  }

  const doc = await payload.findByID({ collection: kind, id, depth: 1 })

  const input =
    kind === 'pages'
      ? await buildInputForPage(payload, doc as RawPageDoc)
      : await buildInputForStory(payload, doc as RawStoryDoc)

  const snapshot = buildSeoAssistantSnapshot(input)

  return <SeoAssistantPanel snapshot={snapshot} />
}
