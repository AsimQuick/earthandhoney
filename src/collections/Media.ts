/**
 * ---
 * file: src/collections/Media.ts
 * project: earthandhoney
 * purpose: Payload CMS Media collection — the single source of truth for original
 *          file references, alt text, and image metadata
 * created-by: dev-team
 * related-story: US-2
 * related-ac: 2.1
 * updated-by: dev-team
 * related-story: US-2
 * related-ac: 2.2
 * updated-by: dev-team
 * related-story: US-2
 * related-ac: 2.4
 * updated-by: dev-team
 * related-story: US-28
 * related-ac: 28.1.2
 * ---
 */
import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'alt',
  },
  upload: true,
  fields: [
    {
      name: 'alt',
      type: 'text',
      // Required so every Media record carries accessibility/SEO alt text —
      // Payload rejects create/update requests missing it (AC-2.4).
      required: true,
    },
  ],
}
