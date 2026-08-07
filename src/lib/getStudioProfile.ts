/**
 * ---
 * file: src/lib/getStudioProfile.ts
 * project: earthandhoney
 * purpose: Server-only reader for the Payload `StudioProfile` global (US-24) — the
 *          single place the (frontend) route metadata and shell chrome read their
 *          studio strings from (AC-24.4), instead of each hard-coding its own copy.
 *          Falls back to `StudioProfile`'s own field `defaultValue`s (never a second
 *          literal copy) when the global document has not been saved yet, since
 *          Payload's `findGlobal` returns an empty doc for an unsaved global rather
 *          than applying the field schema's defaults itself. `payload` is an
 *          ESM-only package that breaks Jest's interop boundary when imported
 *          directly (see us3-ac3.5-galleries-api-read.test.ts), so this module is
 *          exercised only via the routes that import it, never imported directly by
 *          a Jest test — the same convention every other Local API caller in this
 *          repo follows (see us6-ac6.2-isr-static-generation.test.ts).
 * created-by: dev-team
 * related-story: US-24
 * related-ac: 24.4
 * updated-by: dev-team
 * related-story: US-24
 * related-ac: 24.5
 * ---
 */
import { getPayload } from 'payload'
import type { Field } from 'payload'

import config from '@payload-config'
import { StudioProfile } from '@/globals/StudioProfile'

export interface StudioAddress {
  street: string
  city: string
  region: string
  postalCode: string
  country: string
}

export interface StudioSocialProfile {
  platform: string
  url: string
}

export interface ResolvedStudioProfile {
  businessName: string
  description: string
  defaultTitlePattern: string
  defaultMetaDescription: string
  publicPhone: string
  publicEmail: string
  address: StudioAddress
  serviceAreas: string[]
  socialProfiles: StudioSocialProfile[]
  defaultSocialImage: { url: string } | null
}

function fieldDefaultValue(name: string): string {
  const field = StudioProfile.fields.find(
    (candidate): candidate is Field & { name: string } => 'name' in candidate && candidate.name === name,
  )
  const defaultValue = field && 'defaultValue' in field ? field.defaultValue : undefined
  return typeof defaultValue === 'string' ? defaultValue : ''
}

export async function getStudioProfile(): Promise<ResolvedStudioProfile> {
  const payload = await getPayload({ config })
  // depth: 1 populates the `defaultSocialImage` upload relation (its `url`,
  // not just its id) — the field AC-24.5's Open Graph image and JSON-LD
  // `image` read from.
  const doc = (await payload.findGlobal({ slug: 'studio-profile', depth: 1 })) as {
    businessName?: string
    description?: string
    defaultTitlePattern?: string
    defaultMetaDescription?: string
    publicPhone?: string
    publicEmail?: string
    address?: Partial<StudioAddress>
    serviceAreas?: Array<{ area?: string }>
    socialProfiles?: Array<{ platform?: string; url?: string }>
    defaultSocialImage?: { url?: string } | number | null
  }

  const defaultSocialImage =
    doc.defaultSocialImage && typeof doc.defaultSocialImage === 'object' && doc.defaultSocialImage.url
      ? { url: doc.defaultSocialImage.url }
      : null

  return {
    businessName: doc.businessName || fieldDefaultValue('businessName'),
    description: doc.description || '',
    defaultTitlePattern: doc.defaultTitlePattern || fieldDefaultValue('defaultTitlePattern'),
    defaultMetaDescription: doc.defaultMetaDescription || fieldDefaultValue('defaultMetaDescription'),
    publicPhone: doc.publicPhone || '',
    publicEmail: doc.publicEmail || '',
    address: {
      street: doc.address?.street || '',
      city: doc.address?.city || '',
      region: doc.address?.region || '',
      postalCode: doc.address?.postalCode || '',
      country: doc.address?.country || '',
    },
    serviceAreas: (doc.serviceAreas ?? []).map((row) => row.area || '').filter(Boolean),
    socialProfiles: (doc.socialProfiles ?? []).filter(
      (row): row is StudioSocialProfile => Boolean(row.platform && row.url),
    ),
    defaultSocialImage,
  }
}
