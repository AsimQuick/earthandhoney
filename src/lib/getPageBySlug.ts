/**
 * ---
 * file: src/lib/getPageBySlug.ts
 * project: earthandhoney
 * purpose: Server-only reader for a single `Pages` (US-31 AC-31.1) document
 *          by its public URL slug, the query the AC-31.4 dynamic route uses
 *          to decide what to render. Deliberately returns the raw document
 *          — including a draft `status` — rather than filtering by
 *          `status: published` in the query itself: the route, not this
 *          reader, owns the public-reachability decision (draft → 404,
 *          published → 200), matching how src/lib/getStudioProfile.ts keeps
 *          the Local API read and its caller's policy separate. `payload` is
 *          an ESM-only package that breaks Jest's interop boundary when
 *          imported directly (see us3-ac3.5-galleries-api-read.test.ts), so
 *          this module is exercised only via the route that imports it,
 *          never imported directly by a Jest test.
 * created-by: dev-team
 * related-story: US-31
 * related-ac: 31.4
 * ---
 */
import { getPayload } from 'payload'

import config from '@payload-config'

export interface ResolvedPage {
  heading: string
  shortIntroduction: string
  seoTitle: string
  metaDescription: string
  status: 'draft' | 'published'
  indexing: 'index' | 'noindex'
}

export async function getPageBySlug(slug: string): Promise<ResolvedPage | null> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })

  const doc = result.docs[0] as
    | {
        heading?: string
        shortIntroduction?: string
        seoTitle?: string
        metaDescription?: string
        status?: string
        indexing?: string
      }
    | undefined

  if (!doc) {
    return null
  }

  return {
    heading: doc.heading || '',
    shortIntroduction: doc.shortIntroduction || '',
    seoTitle: doc.seoTitle || '',
    metaDescription: doc.metaDescription || '',
    status: doc.status === 'published' ? 'published' : 'draft',
    indexing: doc.indexing === 'noindex' ? 'noindex' : 'index',
  }
}
