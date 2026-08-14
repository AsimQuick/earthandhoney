/**
 * ---
 * file: src/lib/getNavItems.ts
 * project: earthandhoney
 * purpose: Server-only reader for the Payload `Navigation` global (US-32
 *          AC-32.1) — resolves its ordered `items[].page` relationships and
 *          filters the list down to pages that are actually reachable
 *          (`status: 'published'`) and opted into the menu
 *          (`includeInMenu` not explicitly false), so a page listed in the
 *          global but later unpublished or excluded drops out of the
 *          rendered menu without a code change (AC-32.3). `payload` is an
 *          ESM-only package that breaks Jest's interop boundary when
 *          imported directly (see us3-ac3.5-galleries-api-read.test.ts), so
 *          this module is exercised only via the layout that imports it,
 *          never imported directly by a Jest test — the same convention
 *          src/lib/getPageBySlug.ts and src/lib/getStudioProfile.ts follow.
 * created-by: dev-team
 * related-story: US-32
 * related-ac: 32.1
 * ---
 */
import { getPayload } from 'payload'

import config from '@payload-config'

// The rendered shape is owned by the component that consumes it; this is a
// type-only import, erased at compile time, so no client component is pulled
// into this server-only module.
import type { NavItem } from '@/components/layout/VerticalMenu'

export type { NavItem }

interface NavigationPage {
  slug?: string
  navigationLabel?: string
  heading?: string
  includeInMenu?: boolean
  status?: string
}

export async function getNavItems(): Promise<NavItem[]> {
  const payload = await getPayload({ config })
  const doc = (await payload.findGlobal({ slug: 'navigation', depth: 1 })) as {
    items?: Array<{ page?: NavigationPage | number | null } | null>
  }

  return (doc.items ?? [])
    .map((item) => item?.page)
    .filter(
      (page): page is NavigationPage & { slug: string } =>
        Boolean(
          page &&
            typeof page === 'object' &&
            page.slug &&
            page.status === 'published' &&
            page.includeInMenu !== false,
        ),
    )
    .map((page) => ({
      href: `/${page.slug}`,
      label: page.navigationLabel || page.heading || page.slug,
    }))
}
