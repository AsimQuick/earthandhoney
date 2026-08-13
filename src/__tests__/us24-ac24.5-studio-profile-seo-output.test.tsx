/**
 * ---
 * file: src/__tests__/us24-ac24.5-studio-profile-seo-output.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-24.5 — StudioProfile populates real output, not just a settings
 *          screen. Covers both halves: (1) the pure JSON-LD builder
 *          (src/lib/studioStructuredData.ts) produces a LocalBusiness/ProfessionalService
 *          block from a resolved StudioProfile and that block's fields change when the
 *          input profile changes; and (2) the root layout's rendered `<head>`
 *          (generateMetadata's title/description/Open Graph image) and its rendered
 *          JSON-LD `<script>` both change when the fetched StudioProfile global
 *          changes, by mocking src/lib/getStudioProfile.ts — the module that isolates
 *          the `payload` ESM-import boundary (see us3-ac3.5-galleries-api-read.test.ts)
 *          — and calling generateMetadata()/RootLayout() directly with two distinct
 *          profiles. Also asserts no meta-keywords field/output exists anywhere
 *          (PRD §21.2).
 * created-by: dev-team
 * related-story: US-24
 * related-ac: 24.5
 * ---
 */
import fs from 'fs'
import path from 'path'
import { renderToStaticMarkup } from 'react-dom/server'

import type { ResolvedStudioProfile } from '@/lib/getStudioProfile'
import { buildStudioStructuredData } from '@/lib/studioStructuredData'
import { StudioProfile } from '@/globals/StudioProfile'

jest.mock('@/lib/getStudioProfile', () => ({
  getStudioProfile: jest.fn(),
}))

// The (frontend) root layout also fetches the primary nav (AC-32.1) via
// src/lib/getNavItems.ts — another module that isolates the `payload`
// ESM-import boundary, so it needs the same mock treatment as
// getStudioProfile above, even though this suite's assertions are all about
// <head>/JSON-LD, not navigation.
jest.mock('@/lib/getNavItems', () => ({
  getNavItems: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getStudioProfile } = require('@/lib/getStudioProfile') as { getStudioProfile: jest.Mock }
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getNavItems } = require('@/lib/getNavItems') as { getNavItems: jest.Mock }
getNavItems.mockResolvedValue([])
// Imported after the mocks are declared so generateMetadata/RootLayout call
// the mocked getStudioProfile/getNavItems rather than the real ones (which
// import `payload`).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RootLayoutModule = require('@/app/(frontend)/layout')
const { generateMetadata, default: RootLayout } = RootLayoutModule as {
  generateMetadata: () => Promise<import('next').Metadata>
  default: (props: { children: React.ReactNode }) => Promise<React.ReactElement>
}

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const LAYOUT_PATH = 'src/app/(frontend)/layout.tsx'

function profile(overrides: Partial<ResolvedStudioProfile> = {}): ResolvedStudioProfile {
  return {
    businessName: 'Studio A',
    description: 'Studio A is a boutique photography studio.',
    defaultTitlePattern: '%s | Studio A',
    defaultMetaDescription: 'Studio A meta description.',
    publicPhone: '555-0100',
    publicEmail: 'hello@studio-a.example',
    address: { street: '1 First St', city: 'Alphaville', region: 'ON', postalCode: 'A1A 1A1', country: 'CA' },
    serviceAreas: ['Alphaville', 'Betatown'],
    socialProfiles: [{ platform: 'instagram', url: 'https://instagram.com/studioa' }],
    defaultSocialImage: { url: '/media/studio-a-og.jpg' },
    ...overrides,
  }
}

const PROFILE_A = profile()
const PROFILE_B = profile({
  businessName: 'Studio B',
  description: 'Studio B is a different studio entirely.',
  defaultTitlePattern: '%s — Studio B',
  defaultMetaDescription: 'Studio B meta description.',
  publicPhone: '555-0200',
  publicEmail: 'hello@studio-b.example',
  address: { street: '2 Second Ave', city: 'Betatown', region: 'BC', postalCode: 'B2B 2B2', country: 'CA' },
  serviceAreas: ['Betatown'],
  socialProfiles: [{ platform: 'facebook', url: 'https://facebook.com/studiob' }],
  defaultSocialImage: { url: '/media/studio-b-og.jpg' },
})

describe('US-24 AC-24.5: buildStudioStructuredData — the JSON-LD builder', () => {
  it('emits an @context/@type LocalBusiness+ProfessionalService block carrying the profile fields', () => {
    const data = buildStudioStructuredData(PROFILE_A)

    expect(data['@context']).toBe('https://schema.org')
    expect(data['@type']).toEqual(['LocalBusiness', 'ProfessionalService'])
    expect(data.name).toBe('Studio A')
    expect(data.description).toBe('Studio A is a boutique photography studio.')
    expect(data.telephone).toBe('555-0100')
    expect(data.email).toBe('hello@studio-a.example')
    expect(data.image).toBe('/media/studio-a-og.jpg')
    expect(data.address).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '1 First St',
      addressLocality: 'Alphaville',
      addressRegion: 'ON',
      postalCode: 'A1A 1A1',
      addressCountry: 'CA',
    })
    expect(data.areaServed).toEqual(['Alphaville', 'Betatown'])
    expect(data.sameAs).toEqual(['https://instagram.com/studioa'])
  })

  it('changes every field it emits when the underlying profile changes', () => {
    const dataA = buildStudioStructuredData(PROFILE_A)
    const dataB = buildStudioStructuredData(PROFILE_B)

    expect(dataA).not.toEqual(dataB)
    expect(dataA.name).not.toBe(dataB.name)
    expect(dataA.description).not.toBe(dataB.description)
    expect(dataA.telephone).not.toBe(dataB.telephone)
    expect(dataA.email).not.toBe(dataB.email)
    expect(dataA.image).not.toBe(dataB.image)
    expect(dataA.address).not.toEqual(dataB.address)
    expect(dataA.areaServed).not.toEqual(dataB.areaServed)
    expect(dataA.sameAs).not.toEqual(dataB.sameAs)
  })

  it('omits empty optional fields instead of emitting blank strings/arrays', () => {
    const data = buildStudioStructuredData(
      profile({
        description: '',
        publicPhone: '',
        publicEmail: '',
        address: { street: '', city: '', region: '', postalCode: '', country: '' },
        serviceAreas: [],
        socialProfiles: [],
        defaultSocialImage: null,
      }),
    )

    expect(data).toEqual({
      '@context': 'https://schema.org',
      '@type': ['LocalBusiness', 'ProfessionalService'],
      name: 'Studio A',
    })
  })

  it('emits no keywords field (PRD §21.2)', () => {
    expect(buildStudioStructuredData(PROFILE_A)).not.toHaveProperty('keywords')
  })

  it('builds a PostalAddress with only the address sub-fields that are set', () => {
    const data = buildStudioStructuredData(
      profile({ address: { street: '', city: 'Alphaville', region: '', postalCode: '', country: '' } }),
    )

    expect(data.address).toEqual({ '@type': 'PostalAddress', addressLocality: 'Alphaville' })
  })

  it('builds a PostalAddress from only a street when no other sub-field is set', () => {
    const data = buildStudioStructuredData(
      profile({ address: { street: '1 First St', city: '', region: '', postalCode: '', country: '' } }),
    )

    expect(data.address).toEqual({ '@type': 'PostalAddress', streetAddress: '1 First St' })
  })
})

describe('US-24 AC-24.5: the root layout\'s rendered <head> changes when the StudioProfile global changes', () => {
  afterEach(() => {
    getStudioProfile.mockReset()
  })

  it('produces the <title> default/template and description from the default title pattern / meta description fields', async () => {
    getStudioProfile.mockResolvedValue(PROFILE_A)
    const metaA = await generateMetadata()

    expect(metaA.title).toEqual({ default: 'Studio A', template: '%s | Studio A' })
    expect(metaA.description).toBe('Studio A meta description.')
  })

  it('produces the Open Graph image from the defaultSocialImage field', async () => {
    getStudioProfile.mockResolvedValue(PROFILE_A)
    const metaA = await generateMetadata()

    expect(metaA.openGraph).toEqual({ images: [{ url: '/media/studio-a-og.jpg' }] })
  })

  it('title, description, and Open Graph image all differ when the global changes', async () => {
    getStudioProfile.mockResolvedValue(PROFILE_A)
    const metaA = await generateMetadata()
    getStudioProfile.mockResolvedValue(PROFILE_B)
    const metaB = await generateMetadata()

    expect(metaA.title).not.toEqual(metaB.title)
    expect(metaA.description).not.toBe(metaB.description)
    expect(metaA.openGraph).not.toEqual(metaB.openGraph)
  })

  it('emits no `keywords` metadata field', async () => {
    getStudioProfile.mockResolvedValue(PROFILE_A)
    const metaA = await generateMetadata()

    expect(metaA).not.toHaveProperty('keywords')
  })

  it('omits openGraph entirely when the profile has no defaultSocialImage', async () => {
    getStudioProfile.mockResolvedValue(profile({ defaultSocialImage: null }))
    const meta = await generateMetadata()

    expect(meta.openGraph).toBeUndefined()
  })
})

describe('US-24 AC-24.5: the root layout\'s rendered JSON-LD structured-data block changes when the StudioProfile global changes', () => {
  afterEach(() => {
    getStudioProfile.mockReset()
  })

  function renderStructuredData(html: string): unknown {
    const match = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)
    expect(match).not.toBeNull()
    return JSON.parse(match![1])
  }

  it('renders a JSON-LD LocalBusiness/ProfessionalService script built from the fetched profile', async () => {
    getStudioProfile.mockResolvedValue(PROFILE_A)
    const element = await RootLayout({ children: <div>content</div> })
    const html = renderToStaticMarkup(element)

    const data = renderStructuredData(html) as Record<string, unknown>
    expect(data['@type']).toEqual(['LocalBusiness', 'ProfessionalService'])
    expect(data.name).toBe('Studio A')
    expect(data.telephone).toBe('555-0100')
  })

  it('the structured-data block differs between two distinct profiles', async () => {
    getStudioProfile.mockResolvedValue(PROFILE_A)
    const elementA = await RootLayout({ children: <div>content</div> })
    const dataA = renderStructuredData(renderToStaticMarkup(elementA))

    getStudioProfile.mockResolvedValue(PROFILE_B)
    const elementB = await RootLayout({ children: <div>content</div> })
    const dataB = renderStructuredData(renderToStaticMarkup(elementB))

    expect(dataA).not.toEqual(dataB)
  })
})

describe('US-24 AC-24.5: no meta-keywords field is created anywhere (PRD §21.2)', () => {
  it('StudioProfile carries no field named "keywords"', () => {
    const hasKeywordsField = StudioProfile.fields.some((field) => 'name' in field && field.name === 'keywords')
    expect(hasKeywordsField).toBe(false)
  })

  it('the root layout source never sets a `keywords` metadata key', () => {
    const src = read(LAYOUT_PATH)
    expect(src).not.toMatch(/\bkeywords\s*:/)
  })
})
