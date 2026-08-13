/**
 * ---
 * file: src/globals/Navigation.ts
 * project: earthandhoney
 * purpose: Payload CMS Navigation global — the single structured source of
 *          the site's primary navigation (AC-32.1). Holds an ordered array
 *          of relationships into the `pages` collection; array row position
 *          is the display order, so the photographer reorders by dragging
 *          in the admin UI rather than typing numeric order values on each
 *          page. Chosen over extending the `pages` collection with a new
 *          order field because US-31 AC-31.1 already closed that collection
 *          to exactly the PRD §13.1 field set (see NAVIGATION_ADR.md for the
 *          full decision record, including the rejected option and why).
 *          Listing a page here is necessary but not sufficient for it to
 *          render in the menu — src/lib/getNavItems.ts still filters this
 *          list down to pages that are `published` and have `includeInMenu`
 *          on, so AC-32.3's live include-in-menu/draft gate keeps working.
 * created-by: dev-team
 * related-story: US-32
 * related-ac: 32.1
 * ---
 */
import type { GlobalConfig } from 'payload'

export const Navigation: GlobalConfig = {
  slug: 'navigation',
  label: 'Navigation',
  admin: {
    description:
      'The site’s primary navigation, in display order. Reorder by dragging. A listed page only appears in the menu while it is Published and has "Include in menu" on.',
  },
  fields: [
    {
      name: 'items',
      type: 'array',
      labels: {
        singular: 'Navigation Link',
        plural: 'Navigation Links',
      },
      admin: {
        description: 'The primary navigation links, in display order.',
      },
      fields: [
        {
          name: 'page',
          type: 'relationship',
          relationTo: 'pages',
          required: true,
        },
      ],
    },
  ],
}
