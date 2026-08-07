/**
 * ---
 * file: src/globals/StudioProfile.ts
 * project: earthandhoney
 * purpose: Payload CMS StudioProfile global — the single owner of every
 *          central studio fact (PRD §21.1): business name, owner name,
 *          description, established year, address, public phone/email,
 *          service areas, social profiles, default social image, default
 *          title pattern, and default meta description. Every field is a
 *          plain admin-UI control (text/textarea/number/email/array/upload)
 *          so the photographer edits studio identity without a code change.
 * created-by: dev-team
 * related-story: US-24
 * related-ac: 24.1
 * ---
 */
import type { GlobalConfig } from 'payload'

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
      admin: {
        description: 'The fallback meta description used when a page defines none.',
      },
    },
  ],
}
