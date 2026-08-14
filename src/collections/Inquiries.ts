/**
 * ---
 * file: src/collections/Inquiries.ts
 * project: earthandhoney
 * purpose: Payload CMS Inquiries collection — the durable record of a
 *          Frontstage form submission (PRD §20.3). AC-33.2 requires this
 *          record be committed BEFORE any studio notification is attempted,
 *          so a failed or slow notification can never lose a lead; the
 *          create-before-notify ordering itself lives in
 *          src/lib/submitInquiry.ts, not in this collection definition —
 *          this file only shapes what gets stored. Every submitted field
 *          value is captured verbatim in `values` (a `json` field, since the
 *          field set is whatever the referenced `form` document declares —
 *          see src/collections/Forms.ts's per-form `fields` array), together
 *          with the page the visitor submitted from (`sourcePage`) and the
 *          campaign parameters the visitor's request carried (`utm`, one
 *          sub-field per PRD/GA4 `utm_*` query parameter). Server-side
 *          input validation (AC-33.3) and spam protection (AC-33.4) are
 *          deliberately out of scope here — this collection only shapes
 *          what a proven-legitimate submission stores.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.2
 * ---
 */
import type { CollectionConfig } from 'payload'

export const Inquiries: CollectionConfig = {
  slug: 'inquiries',
  admin: {
    useAsTitle: 'sourcePage',
    defaultColumns: ['sourcePage', 'form', 'createdAt'],
  },
  fields: [
    {
      // Which Forms document (src/collections/Forms.ts) this inquiry was
      // submitted through — both collections live in the same Payload
      // database, so a relationship field is safe (contrast
      // GalleryPlacements.ts's deliberate avoidance of one across the
      // separate Backstage database).
      name: 'form',
      type: 'relationship',
      relationTo: 'forms',
      required: true,
      admin: {
        description: 'The Form this inquiry was submitted through.',
      },
    },
    {
      // The submitted field values, keyed by each Forms field's `name`.
      // Stored as-is (json) rather than as a fixed set of typed columns
      // because the field set is per-form and configurable (AC-33.1) —
      // there is no single schema every Inquiry shares.
      name: 'values',
      type: 'json',
      required: true,
      admin: {
        description: 'The submitted field values, keyed by form field name.',
      },
    },
    {
      name: 'sourcePage',
      type: 'text',
      required: true,
      admin: {
        description: 'The public page path the visitor submitted this form from.',
      },
    },
    {
      // Campaign parameters — the standard utm_* query parameter set,
      // captured exactly (no derived/normalized values) so the studio can
      // attribute the lead to a specific campaign.
      name: 'utm',
      type: 'group',
      admin: {
        description: 'Campaign parameters (utm_*) present on the source page URL, if any.',
      },
      fields: [
        { name: 'source', type: 'text' },
        { name: 'medium', type: 'text' },
        { name: 'campaign', type: 'text' },
        { name: 'term', type: 'text' },
        { name: 'content', type: 'text' },
      ],
    },
  ],
}
