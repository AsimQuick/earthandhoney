/**
 * ---
 * file: src/collections/Users.ts
 * project: earthandhoney
 * purpose: Payload CMS auth collection backing /admin login and session management
 * created-by: dev-team
 * related-story: US-1
 * related-ac: 1.1
 * ---
 */
import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [],
}
