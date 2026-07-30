/**
 * ---
 * file: src/globals/Homepage.ts
 * project: earthandhoney
 * purpose: Payload CMS Homepage global/singleton — lets the photographer manage
 *          the hero gallery, headline/intro text, primary CTA (label + link),
 *          and an ordered, reorderable blocks-type field for homepage content
 *          sections, all without a code change; reordering the blocks array
 *          changes the rendered order
 * created-by: dev-team
 * related-story: US-9
 * related-ac: 9.1
 * ---
 */
import type { Block, GlobalConfig } from 'payload'

// A simple text-and-heading section (e.g. a story/intro block between the
// hero and other content). Kept minimal — the photographer can extend copy
// per-block without a code change.
export const TextSectionBlock: Block = {
  slug: 'textSection',
  labels: {
    singular: 'Text Section',
    plural: 'Text Sections',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
    },
    {
      name: 'body',
      type: 'textarea',
    },
  ],
}

// A section that showcases another Gallery Engine gallery (e.g. a featured
// portfolio preview) — reuses the same Galleries collection as the hero,
// no separate image system.
export const GallerySectionBlock: Block = {
  slug: 'gallerySection',
  labels: {
    singular: 'Gallery Section',
    plural: 'Gallery Sections',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
    },
    {
      name: 'gallery',
      type: 'relationship',
      relationTo: 'galleries',
      required: true,
    },
  ],
}

export const Homepage: GlobalConfig = {
  slug: 'homepage',
  fields: [
    {
      name: 'heroGallery',
      type: 'relationship',
      relationTo: 'galleries',
      required: true,
      admin: {
        description: 'The gallery rendered as the homepage hero (slideshow mode).',
      },
    },
    {
      name: 'headline',
      type: 'text',
    },
    {
      name: 'intro',
      type: 'textarea',
    },
    {
      name: 'cta',
      type: 'group',
      fields: [
        {
          name: 'label',
          type: 'text',
        },
        {
          name: 'link',
          type: 'text',
        },
      ],
    },
    {
      // `blocks` (not a plain array) so the admin UI offers a picker between
      // section types and native drag-to-reorder — row order here is
      // authoritative for the rendered order (AC-9.1).
      name: 'contentSections',
      type: 'blocks',
      blocks: [TextSectionBlock, GallerySectionBlock],
    },
  ],
}
