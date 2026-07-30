/**
 * ---
 * file: src/__tests__/us9-ac9.2-portfolio-collection.test.ts
 * project: earthandhoney
 * purpose: Verify AC-9.2 — a Portfolio collection models portfolio entries
 *          that each reference one or more Galleries (title, slug, category,
 *          cover, ordered galleries) so portfolio pages are gallery-driven
 *          and reuse the Gallery Engine, with no separate image system
 * created-by: dev-team
 * related-story: US-9
 * related-ac: 9.2
 * ---
 */
import fs from 'fs'
import path from 'path'
import type { ArrayField, RelationshipField, TextField } from 'payload'

import { Portfolio } from '@/collections/Portfolio'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const PAYLOAD_CONFIG = 'src/payload.config.ts'

const findField = (name: string) => Portfolio.fields.find((field) => 'name' in field && field.name === name)

describe('AC-9.2: Portfolio collection models gallery-driven portfolio entries', () => {
  it('is a collection with useAsTitle set to "title"', () => {
    expect(Portfolio.slug).toBe('portfolio')
    expect(Portfolio.admin?.useAsTitle).toBe('title')
  })

  it('has a required "title" text field', () => {
    const title = findField('title') as TextField | undefined
    expect(title).toBeDefined()
    expect(title?.type).toBe('text')
    expect(title?.required).toBe(true)
  })

  it('has a required, unique "slug" text field', () => {
    const slug = findField('slug') as TextField | undefined
    expect(slug).toBeDefined()
    expect(slug?.type).toBe('text')
    expect(slug?.required).toBe(true)
    expect(slug?.unique).toBe(true)
  })

  it('has a required "category" text field', () => {
    const category = findField('category') as TextField | undefined
    expect(category).toBeDefined()
    expect(category?.type).toBe('text')
    expect(category?.required).toBe(true)
  })

  it('has a required "cover" relationship to Media', () => {
    const cover = findField('cover') as RelationshipField | undefined
    expect(cover).toBeDefined()
    expect(cover?.type).toBe('relationship')
    expect(cover?.relationTo).toBe('media')
    expect(cover?.required).toBe(true)
  })

  it('has an ordered "galleries" array field referencing one or more Galleries', () => {
    const galleries = findField('galleries') as ArrayField | undefined
    expect(galleries).toBeDefined()
    // Array (not a plain hasMany relationship) so row order is authoritative
    // and the admin UI gets native drag-to-reorder for free.
    expect(galleries?.type).toBe('array')
    expect(galleries?.minRows).toBe(1)

    const gallery = galleries?.fields.find((field) => 'name' in field && field.name === 'gallery') as
      | RelationshipField
      | undefined
    expect(gallery).toBeDefined()
    expect(gallery?.type).toBe('relationship')
    expect(gallery?.relationTo).toBe('galleries')
    expect(gallery?.required).toBe(true)
  })

  describe('the Portfolio collection is registered with Payload', () => {
    const src = read(PAYLOAD_CONFIG)

    it('imports and registers the Portfolio collection', () => {
      expect(src).toMatch(/from ['"]\.\/collections\/Portfolio['"]/)
      expect(src).toMatch(/collections:\s*\[[^\]]*Portfolio/)
    })

    it('is registered under `collections`, not `globals` — Portfolio has many entries', () => {
      expect(src).not.toMatch(/globals:\s*\[[^\]]*Portfolio/)
    })
  })
})
