/**
 * ---
 * file: src/__tests__/us9-ac9.1-homepage-global.test.ts
 * project: earthandhoney
 * purpose: Verify AC-9.1 — a Homepage global/singleton lets the photographer
 *          manage the hero gallery, headline/intro text, a primary CTA
 *          (label + link), and an ordered, reorderable blocks-type field for
 *          content sections, with no code change needed to update content
 * created-by: dev-team
 * related-story: US-9
 * related-ac: 9.1
 * ---
 */
import fs from 'fs'
import path from 'path'
import type { Block, BlocksField, GroupField, RelationshipField } from 'payload'

import { GallerySectionBlock, Homepage, TextSectionBlock } from '@/globals/Homepage'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const PAYLOAD_CONFIG = 'src/payload.config.ts'

const findField = (name: string) => Homepage.fields.find((field) => 'name' in field && field.name === name)

describe('AC-9.1: Homepage global lets the photographer manage hero gallery, text, CTA, and reorderable content sections', () => {
  it('is a global (singleton), not a collection — no "id"-per-row semantics, exactly one document', () => {
    expect(Homepage.slug).toBe('homepage')
    expect('slug' in Homepage).toBe(true)
    // Globals don't declare `useAsTitle` (there's only ever one document).
    expect((Homepage as { admin?: { useAsTitle?: string } }).admin?.useAsTitle).toBeUndefined()
  })

  it('has a required "heroGallery" relationship to Galleries', () => {
    const heroGallery = findField('heroGallery') as RelationshipField | undefined
    expect(heroGallery).toBeDefined()
    expect(heroGallery?.type).toBe('relationship')
    expect(heroGallery?.relationTo).toBe('galleries')
    expect(heroGallery?.required).toBe(true)
    // A single hero gallery, not a list of them.
    expect((heroGallery as { hasMany?: boolean } | undefined)?.hasMany).not.toBe(true)
  })

  it('has "headline" and "intro" text fields', () => {
    const headline = findField('headline')
    expect(headline).toBeDefined()
    expect(headline?.type).toBe('text')

    const intro = findField('intro')
    expect(intro).toBeDefined()
    expect(intro?.type).toBe('textarea')
  })

  it('has a "cta" group with "label" and "link" fields', () => {
    const cta = findField('cta') as GroupField | undefined
    expect(cta).toBeDefined()
    expect(cta?.type).toBe('group')

    const label = cta?.fields.find((field) => 'name' in field && field.name === 'label')
    expect(label).toBeDefined()
    expect(label?.type).toBe('text')

    const link = cta?.fields.find((field) => 'name' in field && field.name === 'link')
    expect(link).toBeDefined()
    expect(link?.type).toBe('text')
  })

  it('has an ordered, reorderable "contentSections" blocks-type field', () => {
    const contentSections = findField('contentSections') as BlocksField | undefined
    expect(contentSections).toBeDefined()
    // `blocks` (not `array`) so the admin UI offers native drag-to-reorder
    // and a block-type picker — row order in this field is what the
    // renderer walks, so reordering rows changes the rendered order with
    // no code change.
    expect(contentSections?.type).toBe('blocks')
    expect(Array.isArray(contentSections?.blocks)).toBe(true)
    expect(contentSections?.blocks.length).toBeGreaterThan(0)
  })

  it('offers at least one block type usable without a code change (each has a slug and fields)', () => {
    const contentSections = findField('contentSections') as BlocksField | undefined
    for (const block of contentSections?.blocks ?? []) {
      expect(typeof block.slug).toBe('string')
      expect(block.slug.length).toBeGreaterThan(0)
      expect(Array.isArray(block.fields)).toBe(true)
    }
  })

  describe('the exported block configs the Dev Team chose for content sections', () => {
    it('TextSectionBlock has a heading and body', () => {
      const block: Block = TextSectionBlock
      expect(block.slug).toBe('textSection')
      const heading = block.fields.find((field) => 'name' in field && field.name === 'heading')
      const body = block.fields.find((field) => 'name' in field && field.name === 'body')
      expect(heading).toBeDefined()
      expect(body).toBeDefined()
    })

    it('GallerySectionBlock relates to Galleries — reuses the Gallery Engine, no separate image system', () => {
      const block: Block = GallerySectionBlock
      expect(block.slug).toBe('gallerySection')
      const gallery = block.fields.find((field) => 'name' in field && field.name === 'gallery') as
        | RelationshipField
        | undefined
      expect(gallery).toBeDefined()
      expect(gallery?.type).toBe('relationship')
      expect(gallery?.relationTo).toBe('galleries')
    })

    it('both block types are registered on the "contentSections" field', () => {
      const contentSections = findField('contentSections') as BlocksField | undefined
      const slugs = contentSections?.blocks.map((block) => block.slug)
      expect(slugs).toEqual(expect.arrayContaining(['textSection', 'gallerySection']))
    })
  })

  describe('the Homepage global is registered with Payload', () => {
    const src = read(PAYLOAD_CONFIG)

    it('imports and registers the Homepage global', () => {
      expect(src).toMatch(/from ['"]\.\/globals\/Homepage['"]/)
      expect(src).toMatch(/globals:\s*\[[^\]]*Homepage/)
    })

    it('is registered under `globals`, not `collections` — Homepage is a singleton', () => {
      expect(src).not.toMatch(/collections:\s*\[[^\]]*Homepage/)
    })
  })
})
