/**
 * ---
 * file: src/collections/Forms.ts
 * project: earthandhoney
 * purpose: Payload CMS Forms collection — PRD §20.2's Form Builder
 *          configurable set implemented one-to-one and nothing beyond it:
 *          internal name, public title, description, recipient(s), success
 *          message, field order (the `fields` array's own order), labels and
 *          helper text and required/optional status (per-item on `fields`),
 *          and an Early Booking Benefits footer/link. Offers exactly the
 *          seven PRD §20.2 V1 field types via FORM_FIELD_TYPE_OPTIONS. Per
 *          PRD §20.2 ("No complex conditional form engine is required in
 *          V1"), deliberately no field-visibility rule engine exists
 *          anywhere on a form-field item — a field either renders or it
 *          doesn't, in declared array order.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.1
 * ---
 */
import type { CollectionConfig } from 'payload'

// PRD §20.2 "V1 fields" list, verbatim and exhaustive — exactly seven
// entries. Adding an eighth here is the only way to add a new field type,
// which keeps the field-type surface a single source of truth the AC-33.1
// test reads back from directly.
export const FORM_FIELD_TYPE_OPTIONS = [
  { label: 'Short text', value: 'shortText' },
  { label: 'Email', value: 'email' },
  { label: 'Phone', value: 'phone' },
  { label: 'Date', value: 'date' },
  { label: 'Dropdown', value: 'dropdown' },
  { label: 'Checkbox / consent', value: 'checkbox' },
  { label: 'Long text', value: 'longText' },
]

export const Forms: CollectionConfig = {
  slug: 'forms',
  admin: {
    useAsTitle: 'internalName',
  },
  fields: [
    {
      name: 'internalName',
      type: 'text',
      required: true,
      admin: {
        description: 'Internal form name used to organize forms in Backstage. Not shown publicly.',
      },
    },
    {
      name: 'publicTitle',
      type: 'text',
      required: true,
      admin: {
        description: 'The heading shown above the form on the public page.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Optional introductory copy shown beneath the public title.',
      },
    },
    {
      // "Recipient(s)" — PRD §20.2 explicitly allows more than one, so this
      // is an array rather than a single email field.
      name: 'recipients',
      type: 'array',
      required: true,
      minRows: 1,
      labels: {
        singular: 'Recipient',
        plural: 'Recipients',
      },
      admin: {
        description: 'Studio email address(es) notified for each submission.',
      },
      fields: [
        {
          name: 'email',
          type: 'email',
          required: true,
        },
      ],
    },
    {
      name: 'successMessage',
      type: 'text',
      required: true,
      admin: {
        description: 'Message shown to the visitor after a successful submission.',
      },
    },
    {
      // "Field order", "labels and helper text", and "required/optional
      // status" from PRD §20.2 are all per-item properties of this array —
      // array item order IS field order, no separate ordering field exists.
      name: 'fields',
      type: 'array',
      required: true,
      minRows: 1,
      labels: {
        singular: 'Field',
        plural: 'Fields',
      },
      admin: {
        description: 'The form fields, in the order they render on the page.',
      },
      fields: [
        {
          name: 'fieldType',
          type: 'select',
          required: true,
          options: FORM_FIELD_TYPE_OPTIONS,
          admin: {
            description: 'One of the seven V1 field types.',
          },
        },
        {
          name: 'name',
          type: 'text',
          required: true,
          admin: {
            description: 'The submission key this field is stored under.',
          },
        },
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'helpText',
          type: 'text',
          admin: {
            description: 'Optional helper text shown beneath the label.',
          },
        },
        {
          name: 'required',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          // Only meaningful when fieldType is 'dropdown'; left empty for
          // every other field type.
          name: 'options',
          type: 'array',
          labels: {
            singular: 'Option',
            plural: 'Options',
          },
          admin: {
            description: 'Dropdown choices — used only when this field is a Dropdown.',
          },
          fields: [
            {
              name: 'label',
              type: 'text',
              required: true,
            },
            {
              name: 'value',
              type: 'text',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'earlyBookingBenefits',
      type: 'group',
      admin: {
        description: 'Optional Early Booking Benefits footer/link shown beneath the form.',
      },
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'footerText',
          type: 'text',
        },
        {
          name: 'linkUrl',
          type: 'text',
        },
      ],
    },
  ],
}
