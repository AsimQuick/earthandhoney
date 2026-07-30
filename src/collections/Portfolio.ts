/**
 * ---
 * file: src/collections/Portfolio.ts
 * project: earthandhoney
 * purpose: Payload CMS Portfolio collection — portfolio entries (title, slug,
 *          category, cover, ordered galleries) that reference one or more
 *          Galleries so portfolio pages are gallery-driven and reuse the
 *          Gallery Engine, with no separate image system
 * created-by: dev-team
 * related-story: US-9
 * related-ac: 9.2
 * ---
 */
import type { CollectionConfig } from 'payload'

export const Portfolio: CollectionConfig = {
  slug: 'portfolio',
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
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly identifier for the portfolio entry (e.g. "jane-and-john-wedding").',
      },
    },
    {
      name: 'category',
      type: 'text',
      required: true,
      admin: {
        description: 'e.g. "Wedding", "Engagement" — used to group/filter portfolio entries.',
      },
    },
    {
      name: 'cover',
      type: 'relationship',
      relationTo: 'media',
      required: true,
    },
    {
      // Array (not a plain hasMany relationship) so row order is authoritative
      // and the admin UI gets native drag-to-reorder for free — matches the
      // ordering convention used by Galleries' own `images` field.
      name: 'galleries',
      type: 'array',
      minRows: 1,
      fields: [
        {
          name: 'gallery',
          type: 'relationship',
          relationTo: 'galleries',
          required: true,
        },
      ],
      admin: {
        description:
          'One or more Gallery Engine galleries rendered by this portfolio entry — no separate image system.',
      },
    },
  ],
}
