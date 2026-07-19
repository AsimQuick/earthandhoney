/**
 * ---
 * file: src/collections/Media.ts
 * project: earthandhoney
 * purpose: Payload CMS Media collection — the single source of truth for original
 *          file references, alt text, and image metadata; binary files are
 *          persisted to Cloudflare R2 via the S3 storage adapter (see
 *          payload.config.ts), never to Postgres or the local filesystem
 * created-by: dev-team
 * related-story: US-2
 * related-ac: 2.1
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
    },
  ],
}
