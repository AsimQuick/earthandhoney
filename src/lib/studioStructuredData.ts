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
 * created-by: dev-team
 * related-story: US-24
 * related-ac: 24.5
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
