/**
 * ---
 * file: src/collections/Galleries.ts
 * project: earthandhoney
 * purpose: Payload CMS Galleries collection — the single reusable gallery data
 *          model (independent of any specific page) that powers the homepage
 *          hero, portfolio, blog galleries, and client delivery; holds an
 *          ordered set of Media relations, a cover image, and a settings
 *          group of display-mode toggles that drive per-instance display
 *          behavior (slideshow, hover-preview, fullscreen, download, auth)
 * created-by: dev-team
 * related-story: US-3
 * related-ac: 3.1
 * updated-by: dev-team
 * related-story: US-3
 * related-ac: 3.4
 * updated-by: dev-team
 * related-story: US-6
 * related-ac: 6.3
 * ---
 */
import type { CollectionConfig } from 'payload'

import { getGalleryBearingPaths } from '@/lib/galleryRevalidation'

export const Galleries: CollectionConfig = {
  slug: 'galleries',
  admin: {
    useAsTitle: 'title',
  },
  hooks: {
    // On-demand revalidation (AC-6.3): when a gallery that backs an in-scope
    // gallery-bearing route is updated, regenerate that route immediately
    // instead of waiting for its `revalidate` (ISR) timer to elapse. Runs
    // inside the Route Handler request that processes the update (REST/
    // GraphQL API, which is what the admin UI itself calls), so `next/cache`'s
    // request-scoped store is present. `next/cache` is imported dynamically,
    // only once a gallery backing an in-scope route actually changes — a
    // top-level import would drag in Next's server-streaming internals
    // (which assume Node's `TextEncoder`/`TextDecoder` globals) into every
    // jsdom-environment test that merely inspects this collection's fields.
    afterChange: [
      async ({ doc }) => {
        const paths = getGalleryBearingPaths(doc?.title)
        if (paths.length === 0) return
        const { revalidatePath } = await import('next/cache')
        for (const routePath of paths) {
          revalidatePath(routePath)
        }
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      // Array (not a plain hasMany relationship) so row order is authoritative
      // and the admin UI gets native drag-to-reorder for free.
      name: 'images',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'relationship',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'coverImage',
      type: 'relationship',
      relationTo: 'media',
    },
    {
      // Display-mode configuration: independent toggles (not a fixed enum of
      // "hero"/"portfolio"/"client-delivery" modes) so any combination can be
      // set per gallery — the same Galleries object drives every display
      // experience the Gallery Engine renders (US-4/US-5) without needing a
      // separate gallery record per context.
      name: 'settings',
      type: 'group',
      fields: [
        {
          name: 'slideshow',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Auto-advance through images (e.g. homepage hero).',
          },
        },
        {
          name: 'hoverPreview',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Desktop: reveal a thumbnail preview strip on hover (e.g. portfolio).',
          },
        },
        {
          name: 'fullscreen',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Allow opening images in a fullscreen viewer.',
          },
        },
        {
          name: 'download',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Allow visitors to download original images (e.g. client delivery).',
          },
        },
        {
          name: 'requireAuth',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Require authentication to view this gallery (e.g. client delivery).',
          },
        },
      ],
    },
  ],
}
