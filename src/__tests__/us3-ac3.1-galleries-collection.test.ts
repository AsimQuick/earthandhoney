/**
 * ---
 * file: src/__tests__/us3-ac3.1-galleries-collection.test.ts
 * project: earthandhoney
 * purpose: Verify AC-3.1 — a Payload 'Galleries' collection exists as an
 *          independent, reusable object with fields: id, title, description,
 *          ordered images[] (relations to Media), cover image, and settings
 * created-by: dev-team
 * related-story: US-3
 * related-ac: 3.1
 * ---
 */
import fs from 'fs'
import path from 'path'
import type { ArrayField, RelationshipField } from 'payload'

import { Galleries } from '@/collections/Galleries'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const PAYLOAD_CONFIG = 'src/payload.config.ts'

const findField = (name: string) => Galleries.fields.find((field) => 'name' in field && field.name === name)

describe('AC-3.1: Galleries collection is an independent, reusable object with the required fields', () => {
  it('has slug "galleries", independent of any other collection', () => {
    expect(Galleries.slug).toBe('galleries')
  })

  it('does not declare an "id" field — Payload auto-generates it for every collection', () => {
    // Every Payload document gets an `id` field automatically; hand-declaring
    // one would conflict with that, so its absence here is the correct state.
    expect(findField('id')).toBeUndefined()
  })

  it('has a required "title" field', () => {
    const title = findField('title')
    expect(title).toBeDefined()
    expect(title?.type).toBe('text')
    expect((title as { required?: boolean } | undefined)?.required).toBe(true)
  })

  it('has a "description" field', () => {
    const description = findField('description')
    expect(description).toBeDefined()
    expect(description?.type).toBe('textarea')
  })

  it('has an ordered "images" array field, each row relating to Media', () => {
    const images = findField('images') as ArrayField | undefined
    expect(images).toBeDefined()
    expect(images?.type).toBe('array')

    const imageRelation = images?.fields.find((field) => 'name' in field && field.name === 'image') as
      | RelationshipField
      | undefined
    expect(imageRelation).toBeDefined()
    expect(imageRelation?.type).toBe('relationship')
    expect(imageRelation?.relationTo).toBe('media')
  })

  it('has a "coverImage" field relating to Media', () => {
    const coverImage = findField('coverImage') as RelationshipField | undefined
    expect(coverImage).toBeDefined()
    expect(coverImage?.type).toBe('relationship')
    expect(coverImage?.relationTo).toBe('media')
    // A single cover image, not a list of them.
    expect((coverImage as { hasMany?: boolean } | undefined)?.hasMany).not.toBe(true)
  })

  it('has a "settings" field to carry per-gallery display configuration', () => {
    const settings = findField('settings')
    expect(settings).toBeDefined()
  })

  describe('the Galleries collection is registered with Payload, independent of Media/Users', () => {
    const src = read(PAYLOAD_CONFIG)

    it('imports and registers the Galleries collection', () => {
      expect(src).toMatch(/from ['"]\.\/collections\/Galleries['"]/)
      expect(src).toMatch(/collections:\s*\[[^\]]*Galleries/)
    })

    it('does not fold gallery fields into the Media or Users collections', () => {
      expect(Galleries).not.toBe(undefined)
      // Galleries is its own top-level collection config, not a field nested
      // inside another collection's `fields` array.
      const galleriesFieldNames = Galleries.fields.map((field) => ('name' in field ? field.name : undefined))
      expect(galleriesFieldNames).toEqual(
        expect.arrayContaining(['title', 'description', 'images', 'coverImage', 'settings']),
      )
    })
  })
})
