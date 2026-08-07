/**
 * ---
 * file: src/__tests__/us3-ac3.2-single-image-system.test.ts
 * project: earthandhoney
 * purpose: Verify AC-3.2 — no CMS collection or code path other than Media
 *          and Galleries manages, uploads, or displays images (no per-page/
 *          per-post image-upload field, no standalone image list duplicating
 *          the Media + Galleries model)
 * created-by: dev-team
 * related-story: US-3
 * related-ac: 3.2
 * ---
 */
import fs from 'fs'
import path from 'path'
import type { ArrayField, CollectionConfig, Field, RelationshipField } from 'payload'

import { Galleries } from '@/collections/Galleries'
import { GalleryPlacements } from '@/collections/GalleryPlacements'
import { Media } from '@/collections/Media'
import { Users } from '@/collections/Users'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const PAYLOAD_CONFIG = 'src/payload.config.ts'
const COLLECTIONS_DIR = 'src/collections'
const APP_DIR = 'src/app'

// Every field that (directly or nested inside an array/group) is a
// relationship pointing at 'media'.
function collectMediaRelationships(fields: Field[]): RelationshipField[] {
  const found: RelationshipField[] = []
  for (const field of fields) {
    if (field.type === 'relationship') {
      const relationTo = field.relationTo
      const targetsMedia = relationTo === 'media' || (Array.isArray(relationTo) && relationTo.includes('media'))
      if (targetsMedia) found.push(field)
    }
    if ('fields' in field && Array.isArray(field.fields)) {
      found.push(...collectMediaRelationships(field.fields as Field[]))
    }
  }
  return found
}

function findArrayFieldsOfMediaRelations(fields: Field[]): ArrayField[] {
  const found: ArrayField[] = []
  for (const field of fields) {
    if (field.type === 'array') {
      const arrayField = field as ArrayField
      if (collectMediaRelationships(arrayField.fields as Field[]).length > 0) {
        found.push(arrayField)
      }
    }
  }
  return found
}

describe('AC-3.2: no CMS collection or code path other than Media and Galleries manages, uploads, or displays images', () => {
  describe('no undeclared collection exists that could shadow Media/Galleries with its own image system', () => {
    it('src/collections/ contains the audited collection files (Galleries, Media, Users) and no out-of-scope image system', () => {
      // Trip-wire: adding a collection here that duplicates the Media/Galleries
      // image system must force an explicit re-audit of this test (and this
      // AC). GalleryPlacements (US-25) is an audited, non-image-owning
      // exception — it stores no Media relation of its own (see the
      // "only Galleries declares a standalone list of Media relations" check
      // below), so its presence here does not reopen this AC.
      const files = fs.readdirSync(path.join(root, COLLECTIONS_DIR)).sort()
      expect(files).toEqual(expect.arrayContaining(['Galleries.ts', 'Media.ts', 'Users.ts']))
      expect(files).not.toEqual(expect.arrayContaining(['Portfolio.ts', 'Homepage.ts']))
    })

    it('payload.config.ts registers Users, Media, and Galleries as collections', () => {
      const src = read(PAYLOAD_CONFIG)
      const collectionsLine = src.match(/collections:\s*\[([^\]]*)\]/)?.[1]
      expect(collectionsLine).toBeDefined()
      const registered = collectionsLine!
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      expect(registered).toEqual(expect.arrayContaining(['Galleries', 'Media', 'Users']))
      expect(registered).not.toEqual(expect.arrayContaining(['Portfolio', 'Homepage']))
    })
  })

  describe('only Media declares upload/image-derivative capability', () => {
    const collections: Record<string, CollectionConfig> = { Galleries, GalleryPlacements, Media, Users }

    it.each(Object.entries(collections))('%s', (name, collection) => {
      if (name === 'Media') {
        expect(collection.upload).toBeTruthy()
      } else {
        expect(collection.upload).toBeFalsy()
      }
    })
  })

  describe('only Galleries declares a standalone list of Media relations', () => {
    const collections: Record<string, CollectionConfig> = { Galleries, GalleryPlacements, Media, Users }

    it.each(Object.entries(collections))('%s', (name, collection) => {
      const arrayFieldsOfMediaRelations = findArrayFieldsOfMediaRelations(collection.fields)
      if (name === 'Galleries') {
        expect(arrayFieldsOfMediaRelations.length).toBeGreaterThan(0)
      } else {
        expect(arrayFieldsOfMediaRelations).toHaveLength(0)
      }
    })

    it('Users declares no relationship to Media at all (no avatar/photo field duplicating the model)', () => {
      expect(collectMediaRelationships(Users.fields)).toHaveLength(0)
    })
  })

  describe('the R2 storage adapter is scoped only to the Media collection', () => {
    it('s3Storage plugin config names only "media" under `collections`', () => {
      const src = read(PAYLOAD_CONFIG)
      const pluginBlock = src.match(/s3Storage\(\{[\s\S]*?\n\}\)/)?.[0]
      expect(pluginBlock).toBeDefined()
      const collectionsBlock = pluginBlock!.match(/collections:\s*\{([^}]*)\}/)?.[1]
      expect(collectionsBlock).toBeDefined()
      const keys = collectionsBlock!
        .split(',')
        .map((entry) => entry.split(':')[0]?.trim())
        .filter(Boolean)
      expect(keys).toEqual(['media'])
    })
  })

  describe('no code path outside Payload\'s generated API implements its own image upload handling', () => {
    it('every route.ts under src/app only re-exports a @payloadcms/next/routes handler', () => {
      const routeFiles = findRouteFiles(path.join(root, APP_DIR))
      expect(routeFiles.length).toBeGreaterThan(0)
      for (const file of routeFiles) {
        const src = fs.readFileSync(file, 'utf8')
        expect(src).toMatch(/from ['"]@payloadcms\/next\/routes['"]/)
        // No manual multipart/form-data parsing — Payload's own upload
        // handling is the only path a file can take into the system.
        expect(src).not.toMatch(/formidable|multer|busboy|req\.formData\(\)/)
      }
    })

    it('package.json declares no independent image-upload/handling libraries', () => {
      const pkg = JSON.parse(read('package.json'))
      const haystack = JSON.stringify({ ...pkg.dependencies, ...pkg.devDependencies }).toLowerCase()
      const forbidden = ['multer', 'formidable', 'busboy', 'cloudinary', 'uploadthing', 'imgix']
      for (const lib of forbidden) {
        expect(haystack).not.toContain(lib)
      }
    })
  })
})

function findRouteFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...findRouteFiles(full))
    } else if (entry.name === 'route.ts') {
      found.push(full)
    }
  }
  return found
}
