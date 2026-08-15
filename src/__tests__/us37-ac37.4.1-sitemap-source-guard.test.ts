/**
 * ---
 * file: src/__tests__/us37-ac37.4.1-sitemap-source-guard.test.ts
 * project: earthandhoney
 * purpose: Verify AC-37.4.1's structural rules by static source inspection —
 *          the parts a live HTTP round trip can't pin as directly.
 *          `src/app/(frontend)/sitemap.ts` is the ONLY route file, sits
 *          inside the `(frontend)` route group like every other public
 *          route, imports its entry list from the one reader
 *          `src/lib/getSitemapEntries.ts` rather than querying Payload a
 *          second time itself, and makes every `<loc>` absolute through
 *          `src/lib/absoluteSiteUrl.ts` rather than a re-copied
 *          `NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'` literal (the
 *          same convention us37-ac37.3-structured-data-per-page-type.test.tsx
 *          already asserts for the layout/page/story routes). The reader
 *          itself lists the two fixed routes explicitly rather than
 *          inferring them, and its two Payload queries carry the closed
 *          set's filters — `pages` on `status: 'published'` AND
 *          `indexing: 'index'`, and (AC-37.6.1, once `Stories` gained an
 *          `indexing` field of its own) `stories` on the identical pair of
 *          conditions.
 *          `payload` is an ESM-only package that breaks Jest's interop
 *          boundary when imported directly (see
 *          us3-ac3.5-galleries-api-read.test.ts), so this suite reads
 *          getSitemapEntries.ts's source rather than importing it — the
 *          companion LIVE suite
 *          (us37-ac37.4.1-sitemap-closed-set-live.test.ts) is what proves
 *          this reader's actual query behaviour against a real database.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.4.1
 * updated-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.1
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const SITEMAP_ROUTE_PATH = 'src/app/(frontend)/sitemap.ts'
const READER_PATH = 'src/lib/getSitemapEntries.ts'

describe('AC-37.4.1: /sitemap.xml is served through one route file consuming one reader', () => {
  it('sitemap.ts exists inside the (frontend) route group as the Next.js file-convention default export', () => {
    const src = read(SITEMAP_ROUTE_PATH)
    expect(src).toMatch(/export default async function sitemap\s*\(/)
    expect(src).toMatch(/from ['"]next['"]/)
    expect(src).toMatch(/MetadataRoute/)
  })

  it('there is exactly one sitemap.ts route file in the whole app tree', () => {
    function findSitemapFiles(dir: string, acc: string[] = []): string[] {
      for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
        const rel = path.posix.join(dir, entry.name)
        if (entry.isDirectory()) {
          findSitemapFiles(rel, acc)
        } else if (/^sitemap\.tsx?$/.test(entry.name)) {
          acc.push(rel)
        }
      }
      return acc
    }
    expect(findSitemapFiles('src/app')).toEqual([SITEMAP_ROUTE_PATH])
  })

  it('the route imports its entries from the one reader and makes them absolute through absoluteSiteUrl', () => {
    const src = read(SITEMAP_ROUTE_PATH)
    expect(src).toMatch(/import\s*\{\s*getSitemapEntries\s*\}\s*from\s*['"]@\/lib\/getSitemapEntries['"]/)
    expect(src).toMatch(/import\s*\{\s*absoluteSiteUrl\s*\}\s*from\s*['"]@\/lib\/absoluteSiteUrl['"]/)
    expect(src).toMatch(/absoluteSiteUrl\(/)
  })

  it('the route performs no second Payload query and carries no re-copied site-url literal', () => {
    const src = read(SITEMAP_ROUTE_PATH)
    expect(src).not.toMatch(/getPayload\(/)
    expect(src).not.toMatch(/payload\.find\(/)
    expect(src).not.toMatch(/process\.env\.NEXT_PUBLIC_SITE_URL/)
    expect(src).not.toMatch(/http:\/\/localhost:3000/)
  })

  it('the reader queries `pages` and `stories` both filtered on published+index — AC-37.6.1 made the two conditions identical', () => {
    const src = read(READER_PATH)
    const pagesQueryMatch = src.match(/collection:\s*['"]pages['"][\s\S]{0,200}/)
    expect(pagesQueryMatch).not.toBeNull()
    expect(pagesQueryMatch![0]).toMatch(/status:\s*\{\s*equals:\s*['"]published['"]\s*\}/)
    expect(pagesQueryMatch![0]).toMatch(/indexing:\s*\{\s*equals:\s*['"]index['"]\s*\}/)

    const storiesQueryMatch = src.match(/collection:\s*['"]stories['"][\s\S]{0,300}/)
    expect(storiesQueryMatch).not.toBeNull()
    expect(storiesQueryMatch![0]).toMatch(/status:\s*\{\s*equals:\s*['"]published['"]\s*\}/)
    expect(storiesQueryMatch![0]).toMatch(/indexing:\s*\{\s*equals:\s*['"]index['"]\s*\}/)
  })

  it('the reader lists the two fixed public routes explicitly rather than inferring them', () => {
    const src = read(READER_PATH)
    expect(src).toMatch(/FIXED_ENTRIES/)
    expect(src).toMatch(/path:\s*['"]\/['"]/)
    expect(src).toMatch(/path:\s*['"]\/stories['"]/)
  })

  it('both files carry the CLAUDE.md structured metadata header naming US-37 / AC-37.4.1', () => {
    for (const file of [SITEMAP_ROUTE_PATH, READER_PATH]) {
      const src = read(file)
      expect(src).toMatch(/related-story:\s*US-37/)
      expect(src).toMatch(/related-ac:\s*37\.4\.1/)
    }
  })
})
