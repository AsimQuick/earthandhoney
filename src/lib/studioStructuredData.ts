/**
 * ---
 * file: src/lib/studioStructuredData.ts
 * project: earthandhoney
 * purpose: AC-24.5 — builds the JSON-LD `LocalBusiness`/`ProfessionalService`
 *          block from the same `StudioProfile` fields (via
 *          src/lib/getStudioProfile.ts) that the root layout's rendered
 *          `<title>`, meta description, and Open Graph image already read
 *          (AC-24.4). Kept as a pure, payload-import-free function — like
 *          src/components/gallery/payloadGalleryMapper.ts (see
 *          us6-ac6.2-isr-static-generation.test.ts) — so a test can assert
 *          the structured-data block changes when the global changes without
 *          crossing the ESM boundary `payload` imposes on Jest (see
 *          us3-ac3.5-galleries-api-read.test.ts). No `keywords` input exists
 *          here and none is emitted — PRD §21.2 forbids a meta-keywords
 *          field/surface anywhere in the product.
 *          AC-37.3 — `buildPageStructuredData` and `buildStoryStructuredData`
 *          extend this same builder for the two public page types that need
 *          their own JSON-LD (src/app/(frontend)/[slug]/page.tsx and
 *          src/app/(frontend)/stories/[slug]/page.tsx), rather than a second,
 *          independent JSON-LD implementation living elsewhere: both call
 *          `buildStudioStructuredData` for the shared studio-identity fields
 *          and layer the page/story's own fields on top — `photographyType`/
 *          `cityRegion`/`venue` (PRD §13.1's "Service context and schema" /
 *          "Local relevance" / "Venue relevance and image context") for a
 *          page, and the story's own `title`/`subtitleIntroduction` as a
 *          `CreativeWork` published by the same studio `LocalBusiness` block
 *          for a story.
 * created-by: dev-team
 * related-story: US-24
 * related-ac: 24.5
 * updated-by: dev-team
 * related-story: US-37
 * related-ac: 37.3
 * ---
 */
import type { ResolvedStudioProfile } from './getStudioProfile'

export interface StudioStructuredData {
  '@context': 'https://schema.org'
  '@type': ['LocalBusiness', 'ProfessionalService']
  name: string
  description?: string
  telephone?: string
  email?: string
  image?: string
  address?: {
    '@type': 'PostalAddress'
    streetAddress?: string
    addressLocality?: string
    addressRegion?: string
    postalCode?: string
    addressCountry?: string
  }
  areaServed?: string[]
  sameAs?: string[]
}

/** Builds the JSON-LD LocalBusiness/ProfessionalService block from a resolved StudioProfile. Omits any field the profile leaves empty rather than emitting an empty string. */
export function buildStudioStructuredData(profile: ResolvedStudioProfile): StudioStructuredData {
  const { address } = profile
  const hasAddress = Boolean(address.street || address.city || address.region || address.postalCode || address.country)

  const data: StudioStructuredData = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'ProfessionalService'],
    name: profile.businessName,
  }

  if (profile.description) data.description = profile.description
  if (profile.publicPhone) data.telephone = profile.publicPhone
  if (profile.publicEmail) data.email = profile.publicEmail
  if (profile.defaultSocialImage?.url) data.image = profile.defaultSocialImage.url

  if (hasAddress) {
    data.address = {
      '@type': 'PostalAddress',
      ...(address.street ? { streetAddress: address.street } : {}),
      ...(address.city ? { addressLocality: address.city } : {}),
      ...(address.region ? { addressRegion: address.region } : {}),
      ...(address.postalCode ? { postalCode: address.postalCode } : {}),
      ...(address.country ? { addressCountry: address.country } : {}),
    }
  }

  if (profile.serviceAreas.length > 0) data.areaServed = profile.serviceAreas
  if (profile.socialProfiles.length > 0) data.sameAs = profile.socialProfiles.map((profileLink) => profileLink.url)

  return data
}

/** Human-readable form of a `Pages.photographyType` option value (e.g. `'wedding'` -> `'Wedding'`), for JSON-LD only — not a second copy of `PHOTOGRAPHY_TYPE_OPTIONS`' admin labels. */
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export interface PageStructuredDataContext {
  /** Absolute URL of the page this block describes. */
  url: string
  /** `Pages.photographyType` (PRD §13.1 "Service context and schema"), when set. */
  photographyType?: string
  /** `Pages.cityRegion` (PRD §13.1 "Local relevance"), when set. */
  cityRegion?: string
  /** `Pages.venue` (PRD §13.1 "Venue relevance and image context"), when set. */
  venue?: string
}

export interface PageStructuredData extends StudioStructuredData {
  url: string
  makesOffer?: {
    '@type': 'Offer'
    itemOffered: {
      '@type': 'Service'
      serviceType: string
      areaServed?: string
    }
  }
  location?: {
    '@type': 'Place'
    name: string
  }
}

/**
 * Extends `buildStudioStructuredData`'s LocalBusiness/ProfessionalService block with a public
 * `Pages` document's own `photographyType`/`cityRegion`/`venue`, so a page about a specific
 * shoot type/place carries that context in its JSON-LD rather than only the studio-wide default.
 */
export function buildPageStructuredData(
  profile: ResolvedStudioProfile,
  context: PageStructuredDataContext,
): PageStructuredData {
  const base = buildStudioStructuredData(profile)
  const data: PageStructuredData = { ...base, url: context.url }

  if (context.cityRegion) {
    data.areaServed = [context.cityRegion, ...(base.areaServed ?? []).filter((area) => area !== context.cityRegion)]
  }

  if (context.photographyType) {
    data.makesOffer = {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        serviceType: capitalize(context.photographyType),
        ...(context.cityRegion ? { areaServed: context.cityRegion } : {}),
      },
    }
  }

  if (context.venue) {
    data.location = { '@type': 'Place', name: context.venue }
  }

  return data
}

export interface StoryStructuredDataContext {
  /** Absolute URL of the story this block describes. */
  url: string
  /** `Stories.title`. */
  title: string
  /** `Stories.subtitleIntroduction`, when set. */
  description?: string
  /** Open Graph/Twitter image resolved for the story (StudioProfile default — see stories/[slug]/page.tsx). */
  image?: string
}

export interface StoryStructuredData {
  '@context': 'https://schema.org'
  '@type': 'CreativeWork'
  headline: string
  description?: string
  image?: string
  url: string
  publisher: StudioStructuredData
}

/**
 * Extends `buildStudioStructuredData` for a public `Stories` document: a `CreativeWork` block
 * carrying the story's own `title`/`subtitleIntroduction`, published by the same studio
 * LocalBusiness/ProfessionalService block every other structured-data output reuses.
 */
export function buildStoryStructuredData(
  profile: ResolvedStudioProfile,
  context: StoryStructuredDataContext,
): StoryStructuredData {
  const data: StoryStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    headline: context.title,
    url: context.url,
    publisher: buildStudioStructuredData(profile),
  }

  if (context.description) data.description = context.description
  if (context.image) data.image = context.image

  return data
}
