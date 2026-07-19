/**
 * ---
 * file: src/collections/Galleries.ts
 * project: earthandhoney
 * purpose: Payload CMS Galleries collection — the single reusable gallery data
 *          model (independent of any specific page) that powers the homepage
 *          hero, portfolio, blog galleries, and client delivery; holds an
 *          ordered set of Media relations, a cover image, and a settings bag
 *          that later drives per-instance display behavior
 * created-by: dev-team
 * related-story: US-3
 * related-ac: 3.1
 * ---
 */
import type { CollectionConfig } from 'payload'

export const Galleries: CollectionConfig = {
  slug: 'galleries',
  admin: {
    useAsTitle: 'title',
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
      // Flexible settings bag; the display-mode configuration it will carry
      // (slideshow/hover-preview/fullscreen/download/auth toggles) is AC-3.4's
      // concern, not this AC's — this only establishes the field itself.
      name: 'settings',
      type: 'json',
    },
  ],
}
