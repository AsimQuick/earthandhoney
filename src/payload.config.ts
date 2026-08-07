/**
 * ---
 * file: src/payload.config.ts
 * project: earthandhoney
 * purpose: Payload CMS core configuration — database adapter, collections, and admin panel wiring
 * created-by: dev-team
 * related-story: US-1
 * related-ac: 1.1
 * updated-by: dev-team
 * related-story: US-2
 * related-ac: 2.1
 * updated-by: dev-team
 * related-story: US-2
 * related-ac: 2.2
 * updated-by: dev-team
 * related-story: US-3
 * related-ac: 3.1
 * updated-by: dev-team
 * related-story: US-24
 * related-ac: 24.1
 * updated-by: dev-team
 * related-story: US-25
 * related-ac: 25.1
 * updated-by: dev-team
 * related-story: US-28
 * related-ac: 28.1.1
 * updated-by: dev-team
 * related-story: US-28
 * related-ac: 28.1.2
 * ---
 */
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { GalleryPlacements } from './collections/GalleryPlacements'
import { Media } from './collections/Media'
import { Users } from './collections/Users'
import { StudioProfile } from './globals/StudioProfile'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname, 'app', '(payload)', 'admin'),
    },
  },
  collections: [Users, Media, GalleryPlacements],
  globals: [StudioProfile],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
  }),
})
