/**
 * ---
 * file: src/lib/getPublishedStories.ts
 * project: earthandhoney
 * purpose: AC-36.4 — server-only reader for the story index route
 *          (src/app/(frontend)/stories/page.tsx). Queries the `Stories`
 *          collection (US-36 AC-36.1) with `where: { status: { equals:
 *          'published' } }` directly in the Local API call, unlike
 *          src/lib/getPageBySlug.ts's single-document-by-slug read — an
 *          index route has no single record whose reachability the caller
 *          decides afterwards, so the draft/published filter belongs in the
 *          query itself. A draft story is therefore never present in the
 *          result set the route renders from, satisfying "excludes drafts"
 *          at the data layer rather than by a template-level check that
 *          could be forgotten.
 * created-by: dev-team
 * related-story: US-36
 * related-ac: 36.4
 * ---
 */
import { getPayload } from 'payload'

import config from '@payload-config'

export interface PublishedStorySummary {
  title: string
  slug: string
  subtitleIntroduction: string
}

export async function getPublishedStories(): Promise<PublishedStorySummary[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'stories',
    where: { status: { equals: 'published' } },
    limit: 100,
    depth: 0,
  })

  return (result.docs as Array<{ title?: string; slug?: string; subtitleIntroduction?: string }>).map((doc) => ({
    title: doc.title || '',
    slug: doc.slug || '',
    subtitleIntroduction: doc.subtitleIntroduction || '',
  }))
}
