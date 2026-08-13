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
 * created-by: dev-team
 * related-story: US-31
 * related-ac: 31.4
 * updated-by: dev-team
 * related-story: US-31
 * related-ac: 31.5
 * ---
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { StandardPageTemplate } from '@/components/page-template/StandardPageTemplate'
import { getPageBySlug } from '@/lib/getPageBySlug'
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

  return {
    title: page.seoTitle || page.heading,
    description: page.metaDescription || undefined,
    robots: page.indexing === 'noindex' ? { index: false, follow: false } : undefined,
  }
}

export default async function PublicPageRoute({ params }: PageRouteProps) {
  const { slug } = await params
  const page = await getPageBySlug(slug)

  if (!page || page.status !== 'published') {
    notFound()
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
