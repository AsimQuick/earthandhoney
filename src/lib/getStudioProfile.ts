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
 *          `homeSelectedGalleriesOrStories` (AC-34.4) reads the polymorphic
 *          `gallery-placements`/`pages` relationship back as a plain ordered
 *          array — array order preserved exactly as Payload returns it,
 *          since that order IS the curated selection AC-34.4 requires. An
 *          unpopulated entry (deleted target, or depth too shallow) is
 *          skipped rather than failing the homepage, mirroring every other
 *          resolver in this file.
 * created-by: dev-team
 * related-story: US-24
 * related-ac: 24.4
 * updated-by: dev-team
 * related-story: US-24
 * related-ac: 24.5
 * updated-by: dev-team
 * related-story: US-34
 * related-ac: 34.3
 * updated-by: dev-team
 * related-story: US-34
 * related-ac: 34.4
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

/** AC-34.4: a homepage selection resolving to a Payload `gallery-placements` doc. */
export interface HomeSelectedGalleryEntry {
  relationTo: 'gallery-placements'
  gallerySlug: string
  layout: 'masonry' | 'slideshow'
  heading?: string
}

/** AC-34.4: a homepage selection resolving to a Payload `pages` doc ("story"). */
export interface HomeSelectedPageEntry {
  relationTo: 'pages'
  slug: string
  heading: string
  shortIntroduction?: string
}

export type HomeSelectedGalleryOrStory = HomeSelectedGalleryEntry | HomeSelectedPageEntry

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
  /** AC-34.3: the Backstage gallery slug for the homepage hero, or null when unset. */
  homeHeroGallerySlug: string | null
  /** AC-34.4: the curated, ordered "selected galleries or stories" homepage list. */
  homeSelectedGalleriesOrStories: HomeSelectedGalleryOrStory[]
}

type RawHomeSelectedEntry = {
  relationTo?: 'gallery-placements' | 'pages'
  value?:
    | number
    | string
    | { gallerySlug?: string; layout?: string; heading?: string }
    | { slug?: string; heading?: string; shortIntroduction?: string }
    | null
}

/**
 * Maps the raw, `depth: 1`-populated polymorphic relationship value back
 * into `HomeSelectedGalleryOrStory[]`, preserving array order exactly —
 * that order is the curated selection itself (AC-34.4). An entry whose
 * target wasn't populated (unresolved id, or a deleted document) or is
 * missing a field this reader needs is skipped rather than thrown on, the
 * same fail-open convention every other field in this reader follows.
 */
function mapHomeSelectedGalleriesOrStories(
  entries: RawHomeSelectedEntry[] | undefined,
): HomeSelectedGalleryOrStory[] {
  const result: HomeSelectedGalleryOrStory[] = []

  for (const entry of entries ?? []) {
    if (!entry.value || typeof entry.value !== 'object') {
      continue
    }

    if (entry.relationTo === 'gallery-placements') {
      const value = entry.value as { gallerySlug?: string; layout?: string; heading?: string }
      if (!value.gallerySlug) continue
      result.push({
        relationTo: 'gallery-placements',
        gallerySlug: value.gallerySlug,
        layout: value.layout === 'slideshow' ? 'slideshow' : 'masonry',
        heading: value.heading,
      })
      continue
    }

    if (entry.relationTo === 'pages') {
      const value = entry.value as { slug?: string; heading?: string; shortIntroduction?: string }
      if (!value.slug || !value.heading) continue
      result.push({
        relationTo: 'pages',
        slug: value.slug,
        heading: value.heading,
        shortIntroduction: value.shortIntroduction,
      })
    }
  }

  return result
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
    homeHeroGallerySlug?: string | null
    homeSelectedGalleriesOrStories?: RawHomeSelectedEntry[]
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
    homeHeroGallerySlug: doc.homeHeroGallerySlug || null,
    homeSelectedGalleriesOrStories: mapHomeSelectedGalleriesOrStories(doc.homeSelectedGalleriesOrStories),
  }
}
