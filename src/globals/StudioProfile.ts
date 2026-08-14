/**
 * ---
 * file: src/globals/StudioProfile.ts
 * project: earthandhoney
 * purpose: Payload CMS StudioProfile global — the single owner of every
 *          central studio fact (PRD §21.1): business name, owner name,
 *          description, established year, address, public phone/email,
 *          service areas, social profiles, default social image, default
 *          title pattern, default meta description, and business hours
 *          (AC-37.1 — the one PRD §21.1 bullet, "business hours/contact
 *          details where appropriate", that had no field until this AC;
 *          "contact details" was already covered by publicPhone/publicEmail/
 *          address, so `businessHours` closes the remaining gap; free text
 *          because "where appropriate" means some studios have none, e.g.
 *          "By appointment only"). This account-level data has exactly one
 *          owner: this global. No second SEO-settings global/collection
 *          exists anywhere in this codebase (see `globals` in
 *          src/payload.config.ts) — per Pillar 5, duplicating any of these
 *          fields into a second record is a defect, not a valid extension
 *          point. Every field is a
 *          plain admin-UI control (text/textarea/number/email/array/upload)
 *          so the photographer edits studio identity without a code change.
 *          Also carries the `branding` group (PRD §12.3), bounded to exactly
 *          logo, a validated-safe accent colour, and one approved font
 *          pairing drawn from the design token set — no field for arbitrary
 *          CSS, layout, margin, padding, or component positioning exists
 *          anywhere in this global. The accent colour is further checked for
 *          WCAG AA contrast against the token ink/surface values before it
 *          can be saved (AC-24.3) — a safe input with no validation is not a
 *          safe input. This global (via src/lib/getStudioProfile.ts) is the
 *          single source the (frontend) route metadata and shell chrome read
 *          their studio strings from (AC-24.4) — no other file under src/
 *          hard-codes a copy of the business name or description.
 *          `homeHeroGallerySlug` (AC-34.3) is the one site-wide setting
 *          naming which Backstage gallery is the homepage hero slideshow —
 *          a plain external-identifier text field, exactly like
 *          GalleryPlacements.gallerySlug (src/collections/GalleryPlacements.ts),
 *          never a `relationship`/`join` into the separate Backstage database
 *          (PAYLOAD_PICPEAK_API_CONTRACT.md's "No cross-database access";
 *          Reminder 4). It lives on this studio-wide singleton rather than a
 *          `Pages` document because the homepage's own storage mechanism
 *          (Pages record vs. documented singleton) is still AC-34.5's open
 *          decision; a plain text field here migrates trivially once that
 *          decision lands. `homeSelectedGalleriesOrStories` (AC-34.4) is the
 *          curated, ordered "selected galleries or stories" homepage region
 *          (PRD §13.2) — a polymorphic hasMany relationship into this
 *          database's own `gallery-placements`/`pages` collections, never an
 *          automatically-derived query and never a Backstage relation/join.
 * created-by: dev-team
 * related-story: US-24
 * related-ac: 24.1, 24.2, 24.3
 * updated-by: dev-team
 * related-story: US-24
 * related-ac: 24.4
 * updated-by: dev-team
 * related-story: US-34
 * related-ac: 34.3
 * updated-by: dev-team
 * related-story: US-34
 * related-ac: 34.4
 * updated-by: dev-team
 * related-story: US-37
 * related-ac: 37.1
 * ---
 */
import type { GlobalConfig } from 'payload'

import { validateAccentColorContrast } from '../lib/accentColorContrast'
import { getApprovedFontPairingOptions } from '../lib/approvedFontPairings'

export const SOCIAL_PROFILE_PLATFORMS = [
  { label: 'Instagram', value: 'instagram' },
  { label: 'Facebook', value: 'facebook' },
  { label: 'Pinterest', value: 'pinterest' },
  { label: 'TikTok', value: 'tiktok' },
  { label: 'YouTube', value: 'youtube' },
  { label: 'Other', value: 'other' },
]

export const StudioProfile: GlobalConfig = {
  slug: 'studio-profile',
  label: 'Studio Profile',
  admin: {
    description:
      'Central studio identity, contact details, and SEO defaults — the single source used everywhere the studio is named or described.',
  },
  fields: [
    {
      name: 'businessName',
      type: 'text',
      required: true,
      defaultValue: 'Earth & Honey Studios',
      admin: {
        description: 'The studio’s legal/public business name.',
      },
    },
    {
      name: 'ownerName',
      type: 'text',
      admin: {
        description: 'The photographer/owner’s name.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'A short studio description used across the site.',
      },
    },
    {
      name: 'establishedYear',
      type: 'number',
      defaultValue: 2006,
      admin: {
        description: 'The year the studio was established (e.g. "since 2006").',
      },
    },
    {
      name: 'address',
      type: 'group',
      admin: {
        description: 'The studio’s public postal address.',
      },
      fields: [
        {
          name: 'street',
          type: 'text',
        },
        {
          name: 'city',
          type: 'text',
        },
        {
          name: 'region',
          type: 'text',
        },
        {
          name: 'postalCode',
          type: 'text',
        },
        {
          name: 'country',
          type: 'text',
        },
      ],
    },
    {
      name: 'publicPhone',
      type: 'text',
      admin: {
        description: 'The phone number shown publicly to prospective clients.',
      },
    },
    {
      name: 'publicEmail',
      type: 'email',
      admin: {
        description: 'The email address shown publicly to prospective clients.',
      },
    },
    {
      // AC-37.1: closes the one PRD §21.1 bullet ("business hours/contact
      // details where appropriate") with no field until now. Free text, not
      // a structured day/time schedule, because "where appropriate" means
      // many studios (e.g. by-appointment-only wedding photographers) have
      // no fixed hours to structure.
      name: 'businessHours',
      type: 'textarea',
      admin: {
        description:
          'Public business hours, if the studio has any (e.g. "By appointment only", or a day/time schedule). Leave blank where not appropriate.',
      },
    },
    {
      name: 'serviceAreas',
      type: 'array',
      labels: {
        singular: 'Service Area',
        plural: 'Service Areas',
      },
      admin: {
        description: 'Cities/regions the studio serves.',
      },
      fields: [
        {
          name: 'area',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'socialProfiles',
      type: 'array',
      labels: {
        singular: 'Social Profile',
        plural: 'Social Profiles',
      },
      admin: {
        description: 'Public social profile links.',
      },
      fields: [
        {
          name: 'platform',
          type: 'select',
          required: true,
          options: SOCIAL_PROFILE_PLATFORMS,
        },
        {
          name: 'url',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'defaultSocialImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'The fallback Open Graph/social share image used when a page defines none.',
      },
    },
    {
      name: 'defaultTitlePattern',
      type: 'text',
      defaultValue: '%s | Earth & Honey Studios',
      admin: {
        description: 'The fallback <title> pattern; %s is replaced by the page/story title.',
      },
    },
    {
      name: 'defaultMetaDescription',
      type: 'textarea',
      // The seed copy this global owns. It names the studio consistently with
      // `businessName`/`defaultTitlePattern` above, and it lives here — the
      // single owner (PRD §21.1) — rather than in the route that renders it.
      defaultValue:
        'Earth & Honey Studios is a premium, gallery-first photography studio for weddings, portraits, and events — browse our galleries and book your session.',
      admin: {
        description:
          'The fallback meta description used when a page defines none. Also the source the (frontend) route metadata reads its <meta name="description"> from (AC-24.4) — no page hard-codes its own copy.',
      },
    },
    {
      // The Backstage gallery identifier for the homepage hero (AC-34.3). A
      // plain external-identifier field (type: text), never a
      // `relationship`/`join` field — mirrors GalleryPlacements.gallerySlug
      // for the same reason (see file header).
      name: 'homeHeroGallerySlug',
      type: 'text',
      admin: {
        description:
          'The Backstage gallery slug shown as the homepage hero slideshow, set from the Backstage admin UI. Left empty, the hero renders the unavailable-gallery placeholder.',
      },
    },
    {
      // PRD §13.2's "Selected galleries or stories" (AC-34.4) — a curated,
      // ordered, structured selection the photographer builds by hand, never
      // an automatically-derived "latest N" query. A polymorphic hasMany
      // `relationship` into either this database's own `gallery-placements`
      // or `pages` collections — never a Backstage relation/join (Reminder
      // 4). Payload stores a hasMany relationship value as an explicitly
      // ordered array, and array position is display order, the same
      // convention Pages.galleryPlacements (src/collections/Pages.ts) and
      // Navigation.items (src/globals/Navigation.ts) already use: dragging
      // to reorder in the admin UI changes the homepage's rendered order
      // with no code change (AC-34.4's live-reorder evidence).
      name: 'homeSelectedGalleriesOrStories',
      type: 'relationship',
      relationTo: ['gallery-placements', 'pages'],
      hasMany: true,
      admin: {
        description:
          'The curated, ordered selection of galleries or stories shown on the homepage, set by the photographer — never automatically derived. Drag to reorder; the rendered order follows this list exactly.',
      },
    },
    {
      name: 'branding',
      type: 'group',
      admin: {
        description:
          'Photographer-controlled branding (PRD §12.3) — bounded to exactly logo, accent colour, and one approved font pairing.',
      },
      fields: [
        {
          name: 'logo',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description: 'The studio logo shown across the Frontstage and Project Room.',
          },
        },
        {
          name: 'accentColor',
          type: 'text',
          admin: {
            description:
              'A single accent colour as a 6-digit hex value (e.g. "#2B6CB0"). Checked against the token ink/surface values for WCAG AA contrast before it can be saved (AC-24.3).',
          },
          validate: (value: unknown) => {
            if (value === undefined || value === null || value === '') {
              return true
            }
            if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) {
              return 'Accent colour must be a 6-digit hex value, e.g. "#2B6CB0".'
            }
            return validateAccentColorContrast(value)
          },
        },
        {
          name: 'fontPairing',
          type: 'select',
          required: true,
          defaultValue: 'editorial',
          options: getApprovedFontPairingOptions(),
          admin: {
            description: 'One approved font pairing, drawn from the design token set (US-23 AC-23.1).',
          },
        },
      ],
    },
  ],
}
