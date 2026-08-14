/**
 * ---
 * file: src/app/(frontend)/stories/[slug]/page.tsx
 * project: earthandhoney
 * purpose: AC-37.2 — the public dynamic route that renders a `Stories`
 *          (US-36 AC-36.1) document at its URL slug through
 *          StoryPageTemplate (US-36), closing the gap the story index route
 *          (AC-36.4) left: `stories/page.tsx` already links to
 *          `/stories/${slug}` for every published story, but no route
 *          existed to answer that link. A missing slug or a story whose
 *          `status` is not `published` calls Next's `notFound()`, matching
 *          the `[slug]` Pages route's draft-is-a-real-404 rule (AC-31.4).
 *          `generateMetadata` emits the same full set AC-37.2 requires for
 *          every public page and story: a real `<title>`, meta description,
 *          canonical URL, Open Graph tags and a Twitter card, taken from the
 *          story's own `title`/`subtitleIntroduction` fields with
 *          `StudioProfile` defaults (including the default title pattern,
 *          applied automatically by the root layout's `title.template`
 *          composing with this segment's plain-string `title`) as fallback —
 *          the same explicit fallback chain
 *          src/app/(frontend)/[slug]/page.tsx now uses for `Pages`. Stories
 *          carries no `seoTitle`/`metaDescription`/`socialImage`/`indexing`
 *          field of its own yet (US-36 AC-36.1 scoped `Stories` to PRD
 *          §13.5's story-template field set only) — PRD §21.2's per-story SEO
 *          controls are AC-37.6's admin-surface concern, not this route's;
 *          here, "the story's own fields" for title/description are
 *          `title`/`subtitleIntroduction`, and the Open Graph/Twitter image
 *          always falls back to `StudioProfile.defaultSocialImage` since no
 *          per-story override field exists to prefer.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.2
 * ---
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { StoryPageTemplate } from '@/components/page-template/StoryPageTemplate'
import { getStoryBySlug } from '@/lib/getStoryBySlug'
import { getStudioProfile } from '@/lib/getStudioProfile'
import { resolveStoryGalleryPlacements } from '@/lib/resolveStoryGalleryPlacements'

// The same 60-second safety-net cap every other gallery-bearing route in
// this project carries (src/lib/backstageGalleryCache.ts's `CACHE_TTL_MS`).
export const revalidate = 60

interface StoryRouteProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: StoryRouteProps): Promise<Metadata> {
  const { slug } = await params
  const story = await getStoryBySlug(slug)

  if (!story || story.status !== 'published') {
    return {}
  }

  const canonicalPath = `/stories/${slug}`
  const studioProfile = await getStudioProfile()
  const title = story.title
  const description = story.subtitleIntroduction || studioProfile.defaultMetaDescription
  const ogImage = studioProfile.defaultSocialImage?.url || undefined

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
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}

export default async function PublicStoryRoute({ params }: StoryRouteProps) {
  const { slug } = await params
  const story = await getStoryBySlug(slug)

  if (!story || story.status !== 'published') {
    notFound()
  }

  const sections = await resolveStoryGalleryPlacements(story.sections)

  return (
    <StoryPageTemplate
      title={story.title}
      subtitleIntroduction={story.subtitleIntroduction || undefined}
      sections={sections}
    />
  )
}
