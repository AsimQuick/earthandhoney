/**
 * ---
 * file: src/collections/Stories.ts
 * project: earthandhoney
 * purpose: Payload CMS Stories collection — PRD §13.5's Story/Blog Template
 *          field set: title, subtitle/introduction, then a repeating group
 *          of (section heading + short text + gallery placement), in
 *          author order. The inquiry form itself is not a field here — like
 *          every other template, it is a slot StoryPageTemplate leaves for
 *          whatever route renders the story (src/components/page-template/
 *          StandardPageTemplate.tsx and DetailsPageTemplate.tsx already
 *          establish this pattern). Each section's `galleryPlacement` is a
 *          single relationship into Payload's own `gallery-placements`
 *          collection — never a relation/join into the separate Backstage
 *          database — the same external-identifier-only pattern
 *          src/collections/Pages.ts's `galleryPlacements` field already
 *          uses (see src/collections/GalleryPlacements.ts's own header).
 *          `slug` and `status` are the same base identity fields every
 *          other Payload content collection in this project (`Pages`,
 *          `Forms`) already carries — a Story needs to be individually
 *          addressable and publishable, per STORY_TEMPLATE_ADR.md. This is
 *          a separate collection rather than a `Pages` template variant —
 *          see STORY_TEMPLATE_ADR.md (AC-36.1) for the option chosen, the
 *          option rejected, and the reason.
 *          AC-37.6.1 — the seven remaining PRD §21.2 AUTHORED controls (`Pages`
 *          already carried all eight per US-31): `seoTitle`, `metaDescription`,
 *          `photographyType`, `cityRegion`, `venue`, `socialImage`, `indexing`.
 *          Same field names, types and admin descriptions as
 *          src/collections/Pages.ts — one vocabulary across both collections,
 *          not a second one invented for stories — including reusing
 *          `PHOTOGRAPHY_TYPE_OPTIONS` from that file rather than a duplicate
 *          option list. Adding `indexing` here is what lets
 *          src/lib/getSitemapEntries.ts filter stories by index/noindex the
 *          same way it already filters pages. There is still no
 *          meta-keywords/`keywords` field — PRD §21.2 forbids one — guarded by
 *          src/__tests__/us37-ac37.6.1-no-meta-keywords-guard.test.ts.
 * created-by: dev-team
 * related-story: US-36
 * related-ac: 36.1
 * updated-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.1
 * ---
 */
import type { CollectionConfig } from 'payload'

import { PHOTOGRAPHY_TYPE_OPTIONS } from './Pages'

export const Stories: CollectionConfig = {
  slug: 'stories',
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      // PRD §13.5's "Title" — the story's H1.
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      // PRD §13.5's "Subtitle / introduction".
      name: 'subtitleIntroduction',
      type: 'textarea',
    },
    {
      // PRD §13.5's repeating (section heading + short text + gallery
      // placement) group. Array item order IS section order — no separate
      // ordering field exists, the same convention src/collections/Forms.ts's
      // `fields` array already establishes.
      name: 'sections',
      type: 'array',
      required: true,
      minRows: 1,
      labels: {
        singular: 'Section',
        plural: 'Sections',
      },
      admin: {
        description: 'The story sections, in the order they render on the page.',
      },
      fields: [
        {
          name: 'sectionHeading',
          type: 'text',
          required: true,
        },
        {
          name: 'shortText',
          type: 'textarea',
          required: true,
        },
        {
          // The Backstage gallery this section shows. A relationship into
          // Payload's own `gallery-placements` collection — that collection
          // itself stores only the Backstage gallery's `slug` as plain text
          // (src/collections/GalleryPlacements.ts), so this field never
          // becomes a relation into the separate Backstage database.
          name: 'galleryPlacement',
          type: 'relationship',
          relationTo: 'gallery-placements',
          required: true,
          admin: {
            description: "This section's gallery placement.",
          },
        },
      ],
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL slug — the public path this story renders at.',
      },
    },
    {
      // AC-37.6.1: same field, type and description as src/collections/Pages.ts.
      name: 'seoTitle',
      type: 'text',
      admin: {
        description: 'The rendered <title>.',
      },
    },
    {
      // AC-37.6.1: same field, type and description as src/collections/Pages.ts.
      name: 'metaDescription',
      type: 'textarea',
      admin: {
        description: 'The search-result snippet.',
      },
    },
    {
      // AC-37.6.1: same field, type, options and description as src/collections/Pages.ts.
      name: 'photographyType',
      type: 'select',
      options: PHOTOGRAPHY_TYPE_OPTIONS,
      admin: {
        description: 'Service context, used for schema/structured context.',
      },
    },
    {
      // AC-37.6.1: same field, type and description as src/collections/Pages.ts.
      name: 'cityRegion',
      type: 'text',
      admin: {
        description: 'City/region for local relevance.',
      },
    },
    {
      // AC-37.6.1: same field, type and description as src/collections/Pages.ts — optional, as Pages' is.
      name: 'venue',
      type: 'text',
      admin: {
        description: 'Venue name, optional — venue relevance and image context.',
      },
    },
    {
      // AC-37.6.1: same field, type and description as src/collections/Pages.ts.
      name: 'socialImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'The Open Graph image used when this page is shared.',
      },
    },
    {
      // AC-37.6.1: same field, type, options and description as src/collections/Pages.ts.
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
