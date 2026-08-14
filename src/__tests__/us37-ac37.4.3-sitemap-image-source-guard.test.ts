/**
 * ---
 * file: src/__tests__/us37-ac37.4.3-sitemap-image-source-guard.test.ts
 * project: earthandhoney
 * purpose: Verify AC-37.4.3's structural rules by static source inspection —
 *          the parts a live HTTP round trip can't pin as directly.
 *          `src/lib/getSitemapEntries.ts` resolves each page's
 *          `galleryPlacements` and each story's section
 *          `galleryPlacement`s through the SAME Flow A boundary the page
 *          templates already use — `resolveGalleryPlacementImages`
 *          (src/lib/backstageGalleryPlacement.ts) — never a second Backstage
 *          client (no direct `@/lib/backstageClient` import, no `fetch` call
 *          of its own) and never a raw SQL/second-collection read into
 *          anything Backstage-owned (Reminder 4). `sitemap.ts` makes each
 *          entry's `images` absolute through the SAME `absoluteSiteUrl` call
 *          `url` already uses, never a second origin resolution. `payload`
 *          is an ESM-only package that breaks Jest's interop boundary when
 *          imported directly (see us3-ac3.5-galleries-api-read.test.ts), so
 *          this suite reads getSitemapEntries.ts's source rather than
 *          importing it — the companion LIVE suite
 *          (us37-ac37.4.3-sitemap-image-references-live.test.ts) is what
 *          proves this reader's actual image-resolution behaviour against a
 *          real Backstage gallery, and
 *          us37-ac37.4.3-sitemap-image-path.test.ts exercises the
 *          which-path-per-photo rule (src/lib/sitemapImagePath.ts) by real
 *          call rather than by source text.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.4.3
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const SITEMAP_ROUTE_PATH = 'src/app/(frontend)/sitemap.ts'
const READER_PATH = 'src/lib/getSitemapEntries.ts'

describe('AC-37.4.3: image-sitemap references resolve through the same Flow A boundary, never a second one', () => {
  it('the reader imports resolveGalleryPlacementImages from backstageGalleryPlacement — the same module the page templates use', () => {
    const src = read(READER_PATH)
    expect(src).toMatch(
      /import\s*\{\s*resolveGalleryPlacementImages\s*\}\s*from\s*['"]@\/lib\/backstageGalleryPlacement['"]/,
    )
    expect(src).toMatch(/resolveGalleryPlacementImages\(/)
  })

  it('the reader never imports backstageClient directly and makes no fetch call of its own — no second Backstage client', () => {
    const src = read(READER_PATH)
    expect(src).not.toMatch(/from\s*['"]@\/lib\/backstageClient['"]/)
    expect(src).not.toMatch(/\bfetch\(/)
  })

  it('the reader queries only the `pages` and `stories` Payload collections — no cross-database read of anything Backstage-owned (Reminder 4)', () => {
    const src = read(READER_PATH)
    const collectionMatches = Array.from(src.matchAll(/collection:\s*['"]([^'"]+)['"]/g)).map((m) => m[1])
    expect(collectionMatches.sort()).toEqual(['pages', 'stories'])
  })

  it('both pages and stories are queried at depth 1, resolving gallery-placements relations to their gallerySlug', () => {
    const src = read(READER_PATH)
    const pagesQueryMatch = src.match(/collection:\s*['"]pages['"][\s\S]{0,300}/)
    expect(pagesQueryMatch).not.toBeNull()
    expect(pagesQueryMatch![0]).toMatch(/depth:\s*1/)

    const storiesQueryMatch = src.match(/collection:\s*['"]stories['"][\s\S]{0,300}/)
    expect(storiesQueryMatch).not.toBeNull()
    expect(storiesQueryMatch![0]).toMatch(/depth:\s*1/)
  })

  it('the reader reads galleryPlacements (pages) and sections[].galleryPlacement (stories) — the same fields the page/story templates already resolve', () => {
    const src = read(READER_PATH)
    expect(src).toMatch(/galleryPlacements/)
    expect(src).toMatch(/galleryPlacement/)
    expect(src).toMatch(/gallerySlug/)
  })

  it('a placement resolution failure yields no images rather than throwing — no unguarded rejection of resolveGalleryPlacementImages', () => {
    const src = read(READER_PATH)
    expect(src).toMatch(/result\.status\s*===\s*['"]ok['"]/)
  })

  it('the SitemapEntry type carries an optional images field of site-relative paths', () => {
    const src = read(READER_PATH)
    expect(src).toMatch(/images\?:\s*string\[\]/)
  })

  it('the reader picks each photo\'s path through sitemapImagePath, never a raw tier field — no new delivery path', () => {
    const src = read(READER_PATH)
    expect(src).toMatch(/import\s*\{\s*sitemapImagePath\s*\}\s*from\s*['"]@\/lib\/sitemapImagePath['"]/)
    expect(src).toMatch(/sitemapImagePath\(image\)/)
    // The tier fields are read only inside that helper, so a
    // /api/secure-images/…/{{token}} template can never reach the sitemap.
    expect(src).not.toMatch(/image\.(url|largeUrl|mediumUrl|thumbnailUrl)\b/)
  })

  it('the route maps each entry\'s images through the same absoluteSiteUrl call url already uses — never a second origin resolution', () => {
    const src = read(SITEMAP_ROUTE_PATH)
    const imagesLineMatch = src.match(/images:\s*entry\.images\.map\(\s*\(image\)\s*=>\s*absoluteSiteUrl\(image\)\s*\)/)
    expect(imagesLineMatch).not.toBeNull()
    // Guards against a second, re-copied site-url literal creeping in
    // alongside the existing url mapping (AC-37.4.1's own guard already
    // pins the absence of a raw NEXT_PUBLIC_SITE_URL/localhost literal).
    expect(src).not.toMatch(/process\.env\.NEXT_PUBLIC_SITE_URL/)
    expect(src).not.toMatch(/http:\/\/localhost:3000/)
  })

  it('the route performs no second Payload query of its own for image data', () => {
    const src = read(SITEMAP_ROUTE_PATH)
    expect(src).not.toMatch(/getPayload\(/)
    expect(src).not.toMatch(/payload\.find\(/)
  })

  it('both files carry the CLAUDE.md structured metadata header naming US-37 / AC-37.4.3', () => {
    for (const file of [SITEMAP_ROUTE_PATH, READER_PATH]) {
      const src = read(file)
      expect(src).toMatch(/related-story:\s*US-37/)
      expect(src).toMatch(/related-ac:\s*37\.4\.3/)
    }
  })
})
