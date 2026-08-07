/**
 * ---
 * file: src/collections/GalleryPlacements.ts
 * project: earthandhoney
 * purpose: Payload CMS GalleryPlacements collection — PRD §14's "where a
 *          Backstage gallery appears on Frontstage and how it renders there"
 *          concern, kept deliberately separate from the Backstage Gallery
 *          itself (PicPeak, in the separate Backstage database). Stores
 *          only the Backstage gallery `slug` as a plain external-identifier
 *          text field — PAYLOAD_PICPEAK_API_CONTRACT.md's "No
 *          cross-database access" section and Reminder 4 both forbid a
 *          foreign key or relation field into that database, so this model
 *          holds no `relationship`/`join` field pointing at a Backstage
 *          record. The theme/overlay
 *          preset options are read live from the US-23 design-token source
 *          of truth (src/styles/tokens.css) so this collection cannot drift
 *          from the tokens it references.
 * created-by: dev-team
 * related-story: US-25
 * related-ac: 25.1
 * ---
 */
import type { CollectionConfig } from 'payload'

import { loadTokenSpecimenData } from '@/lib/designTokenSpecimen'

// PRD §14: "optional theme/overlay preset" — drawn from the US-23
// overlay/vignette token presets (src/styles/tokens.css), not a hard-coded
// duplicate list.
export function themePresetOptions(): Array<{ label: string; value: string }> {
  return loadTokenSpecimenData().overlaysAndVignettes.map(([name]) => ({
    label: name,
    value: name,
  }))
}

export const GalleryPlacements: CollectionConfig = {
  slug: 'gallery-placements',
  admin: {
    useAsTitle: 'heading',
  },
  fields: [
    {
      // The Backstage gallery identifier. A plain external-identifier field
      // (type: text), never a `relationship`/`join` field — PicPeak's
      // gallery record lives in the separate Backstage database, which this
      // database may never join against (PAYLOAD_PICPEAK_API_CONTRACT.md,
      // "No cross-database access"; Reminder 4).
      name: 'gallerySlug',
      type: 'text',
      required: true,
      admin: {
        description: "The Backstage gallery's slug, set from the Backstage admin UI.",
      },
    },
    {
      name: 'layout',
      type: 'select',
      required: true,
      options: [
        { label: 'Slideshow', value: 'slideshow' },
        { label: 'Masonry', value: 'masonry' },
      ],
    },
    {
      name: 'heading',
      type: 'text',
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'themePreset',
      type: 'select',
      options: themePresetOptions(),
      admin: {
        description: 'Overlay/vignette preset from the design-token source of truth.',
      },
    },
    {
      name: 'visibility',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Public', value: 'public' },
        { label: 'Unlisted', value: 'unlisted' },
        { label: 'Draft', value: 'draft' },
      ],
    },
    {
      name: 'order',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: {
        description: 'Order of this placement within its page or story.',
      },
    },
  ],
}
