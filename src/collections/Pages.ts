/**
 * ---
 * file: src/collections/Pages.ts
 * project: earthandhoney
 * purpose: Payload CMS Pages collection — PRD §13.1's "Add New Page"
 *          structured form, implementing exactly that field set and nothing
 *          beyond it: internal page name, navigation label, page heading,
 *          short introduction, photography type, city/region, venue
 *          (optional), URL slug, SEO title, meta description, social image,
 *          gallery placements, tags, include-in-menu, index/noindex, and
 *          draft/published. Gallery placements reference the Payload
 *          `gallery-placements` collection (US-25) by relationship — that
 *          collection itself holds only the Backstage gallery's external
 *          `slug` as plain text, so this field never becomes a relation into
 *          the separate Backstage database (PAYLOAD_PICPEAK_API_CONTRACT.md's
 *          "No cross-database access" rule and Reminder 4). Deliberately no
 *          `blocks`/layout-canvas field, free-text CSS field, or margin/
 *          padding/position control exists anywhere in this model — Pillar 3
 *          (deterministic beauty) and CLAUDE.md's retired "drag-and-drop page
 *          builder" non-goal.
 * created-by: dev-team
 * related-story: US-31
 * related-ac: 31.1
 * ---
 */
import type { CollectionConfig } from 'payload'

export const PHOTOGRAPHY_TYPE_OPTIONS = [
  { label: 'Wedding', value: 'wedding' },
  { label: 'Engagement', value: 'engagement' },
  { label: 'Details', value: 'details' },
  { label: 'Other', value: 'other' },
]

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'internalName',
  },
  fields: [
    {
      // "Internal page name" — Backstage organization only, never shown publicly.
      name: 'internalName',
      type: 'text',
      required: true,
      admin: {
        description: 'Internal page name used to organize pages in Backstage. Not shown publicly.',
      },
    },
    {
      name: 'navigationLabel',
      type: 'text',
      admin: {
        description: 'Menu text shown in site navigation.',
      },
    },
    {
      name: 'heading',
      type: 'text',
      required: true,
      admin: {
        description: 'The visible H1 rendered on the page.',
      },
    },
    {
      name: 'shortIntroduction',
      type: 'textarea',
      admin: {
        description: 'Visible introduction text, also used as search context.',
      },
    },
    {
      name: 'photographyType',
      type: 'select',
      options: PHOTOGRAPHY_TYPE_OPTIONS,
      admin: {
        description: 'Service context, used for schema/structured context.',
      },
    },
    {
      name: 'cityRegion',
      type: 'text',
      admin: {
        description: 'City/region for local relevance.',
      },
    },
    {
      // "Venue, optional" per PRD §13.1 — the only field the PRD table itself marks optional.
      name: 'venue',
      type: 'text',
      admin: {
        description: 'Venue name, optional — venue relevance and image context.',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL slug — the public path this page renders at.',
      },
    },
    {
      name: 'seoTitle',
      type: 'text',
      admin: {
        description: 'The rendered <title>.',
      },
    },
    {
      name: 'metaDescription',
      type: 'textarea',
      admin: {
        description: 'The search-result snippet.',
      },
    },
    {
      name: 'socialImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'The Open Graph image used when this page is shared.',
      },
    },
    {
      // Main visual content. A relationship into Payload's own
      // `gallery-placements` collection, never into the separate Backstage
      // database — see the file header and US-25 AC-25.1.
      name: 'galleryPlacements',
      type: 'relationship',
      relationTo: 'gallery-placements',
      hasMany: true,
      admin: {
        description: 'Main visual content — one or more gallery placements, in display order.',
      },
    },
    {
      name: 'tags',
      type: 'array',
      labels: {
        singular: 'Tag',
        plural: 'Tags',
      },
      admin: {
        description: 'Internal relationships between pages/stories.',
      },
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'includeInMenu',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether this page appears in site navigation.',
      },
    },
    {
      name: 'indexing',
      type: 'select',
      required: true,
      defaultValue: 'index',
      options: [
        { label: 'Index', value: 'index' },
        { label: 'Noindex', value: 'noindex' },
      ],
      admin: {
        description: 'Search-engine visibility.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      admin: {
        description: 'Publication state.',
      },
    },
  ],
}
