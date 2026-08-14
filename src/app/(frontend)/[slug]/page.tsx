/**
 * ---
 * file: src/app/(frontend)/[slug]/page.tsx
 * project: earthandhoney
 * purpose: AC-31.4 — the public dynamic route that renders a `Pages`
 *          (US-31 AC-31.1) document at its URL slug through
 *          StandardPageTemplate (AC-31.3). A missing slug or a page whose
 *          `status` is not `published` calls Next's `notFound()`, so a
 *          draft page is a real 404 response rather than a rendered page
 *          gated behind a client-side/config flag. A page whose `indexing`
 *          field is `noindex` sets the Metadata API's `robots` field, which
 *          Next renders as a `<meta name="robots" content="noindex">` tag
 *          in the actual response HTML — the directive this AC's evidence
 *          requires is visible in the returned markup, not only in a
 *          metadata object in source.
 *          AC-31.5 — each of the page's `galleryPlacements` is resolved
 *          through the existing Flow A boundary
 *          (resolvePageGalleryPlacements -> backstageGalleryPlacement ->
 *          backstageClient/backstageGalleryMapper), by Backstage gallery
 *          `slug` only — never a relation into the Backstage database
 *          (Reminder 4). `export const revalidate = 60` gives this route the
 *          same 60-second safety-net cap every other gallery-bearing route
 *          already carries (src/lib/backstageGalleryCache.ts's `CACHE_TTL_MS`).
 *          A placement whose gallery is unreachable renders
 *          GalleryUnavailablePlaceholder instead of failing the page.
 *          AC-31.6 — `generateMetadata` also emits a canonical URL and Open
 *          Graph data, both computed by the system rather than typed by the
 *          photographer: `alternates.canonical` is the page's own slug path,
 *          resolved to an absolute URL against the root layout's
 *          `metadataBase` (the deployment's public site URL, AC-31.6); the
 *          Open Graph `title`/`description` mirror the same `seoTitle`/
 *          `metaDescription` fallback the plain title/description already
 *          use, `url` is the same canonical path, and `images` falls back
 *          from the page's own `socialImage` to `StudioProfile.defaultSocialImage`
 *          (the same fallback chain the root layout uses for the site-wide
 *          default, AC-24.5) rather than an unset field leaving the tag
 *          empty. StandardPageTemplate's heading hierarchy (exactly one H1,
 *          no skipped levels — AC-31.3) is unchanged by this AC; it already
 *          holds structurally since only the H1 and, when structured text
 *          sections exist, H2s are ever rendered.
 *          AC-35.3 — this route also reads the page's own `template` field
 *          (src/collections/Pages.ts) to pick which template component
 *          renders it: `'details'` renders DetailsPageTemplate, with its
 *          single masonry slot resolved by resolveDetailsMasonryPlacement
 *          (AC-35.2's GalleryMasonryLayout); every other value renders
 *          StandardPageTemplate as before. The template is a selection on
 *          the `Pages` record read here, not a second hard-coded route — a
 *          new Details page needs no code change, only a `Pages` record with
 *          `template: 'details'` created through the same New Page form as
 *          any other page.
 * created-by: dev-team
 * related-story: US-31
 * related-ac: 31.4
 * updated-by: dev-team
 * related-story: US-31
 * related-ac: 31.5
 * updated-by: dev-team
 * related-story: US-31
 * related-ac: 31.6
 * updated-by: dev-team
 * related-story: US-35
 * related-ac: 35.3
 * ---
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DetailsPageTemplate } from '@/components/page-template/DetailsPageTemplate'
import { StandardPageTemplate } from '@/components/page-template/StandardPageTemplate'
import { getPageBySlug } from '@/lib/getPageBySlug'
import { getStudioProfile } from '@/lib/getStudioProfile'
import { resolveDetailsMasonryPlacement } from '@/lib/resolveDetailsMasonryPlacement'
import { resolvePageGalleryPlacements } from '@/lib/resolvePageGalleryPlacements'

// AC-31.5: the same 60-second safety-net cap the contract commits every
// gallery-bearing route to (see file header).
export const revalidate = 60

interface PageRouteProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageRouteProps): Promise<Metadata> {
  const { slug } = await params
  const page = await getPageBySlug(slug)

  if (!page || page.status !== 'published') {
    return {}
  }

  // AC-31.6: system-computed, not typed on the page — the canonical path is
  // derived from the page's own slug and resolved to an absolute URL against
  // the root layout's `metadataBase`.
  const canonicalPath = `/${slug}`
  const title = page.seoTitle || page.heading
  const description = page.metaDescription || undefined
  const studioProfile = await getStudioProfile()
  const ogImage = page.socialImage || studioProfile.defaultSocialImage?.url || undefined

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    robots: page.indexing === 'noindex' ? { index: false, follow: false } : undefined,
  }
}

export default async function PublicPageRoute({ params }: PageRouteProps) {
  const { slug } = await params
  const page = await getPageBySlug(slug)

  if (!page || page.status !== 'published') {
    notFound()
  }

  if (page.template === 'details') {
    const masonryPlacement = await resolveDetailsMasonryPlacement(page.galleryPlacements)

    return (
      <DetailsPageTemplate
        heading={page.heading}
        oneLineIntroduction={page.shortIntroduction || undefined}
        masonryPlacement={masonryPlacement}
      />
    )
  }

  const galleryPlacements = await resolvePageGalleryPlacements(page.galleryPlacements)

  return (
    <StandardPageTemplate
      heading={page.heading}
      shortIntroduction={page.shortIntroduction || undefined}
      galleryPlacements={galleryPlacements}
    />
  )
}
