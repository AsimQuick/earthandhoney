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
 * updated-by: dev-team
 * related-story: US-2
 * related-ac: 2.2
 * updated-by: dev-team
 * related-story: US-2
 * related-ac: 2.4
 * ---
 */
import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'alt',
  },
  upload: {
    // On upload, Payload's Sharp pipeline (wired via `sharp` in payload.config.ts)
    // derives these three sizes from the original; the original itself is always
    // retained. The S3 storage adapter (see payload.config.ts) then persists the
    // original plus every generated size to Cloudflare R2.
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 400,
        fit: 'cover',
        withoutEnlargement: true,
      },
      {
        name: 'medium',
        width: 1200,
        withoutEnlargement: true,
      },
      {
        name: 'large',
        width: 2048,
        withoutEnlargement: true,
      },
    ],
  },
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
