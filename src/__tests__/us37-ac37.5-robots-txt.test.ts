/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us37-ac37.5-robots-txt.test.ts
 * project: earthandhoney
 * purpose: Verify AC-37.5's pure-computation half — `src/app/robots.ts`
 *          is import-free of `payload` (only `next`'s `MetadataRoute` type and
 *          the env-only `src/lib/absoluteSiteUrl.ts`, same as `sitemap.ts`'s
 *          own reasoning for why that module is safe to exercise directly
 *          under Jest — see us3-ac3.5-galleries-api-read.test.ts), so this
 *          suite imports and calls it directly rather than mocking or
 *          fetching. Asserts the emitted rules allow general crawling,
 *          disallow the `/dev/` demo/specimen tree and `/admin`, and that the
 *          `sitemap` field is resolved through the same origin
 *          `sitemap.ts`/the root layout's `metadataBase` use — both the
 *          local-dev fallback and a configured `NEXT_PUBLIC_SITE_URL`. The
 *          real fetched-`/robots.txt`-over-HTTP half of this AC's evidence
 *          bar, plus proof that every named dev route still carries its
 *          noindex directive in rendered HTML and stays absent from
 *          `/sitemap.xml`, is
 *          us37-ac37.5-robots-and-dev-routes-live.test.ts.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.5
 * ---
 */
import robots from '@/app/robots'

describe('US-37 AC-37.5: /robots.txt', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
    }
  })

  it('allows general crawling of the public site', () => {
    const result = robots()
    expect(result.rules).toMatchObject({ userAgent: '*', allow: '/' })
  })

  it('disallows the internal /dev/ demo and specimen route tree', () => {
    const result = robots()
    const disallow = Array.isArray(result.rules) ? [] : (result.rules.disallow ?? [])
    expect(disallow).toContain('/dev/')
  })

  it('disallows /admin — Backstage is never a client-facing surface (CLAUDE.md: no fourth surface)', () => {
    const result = robots()
    const disallow = Array.isArray(result.rules) ? [] : (result.rules.disallow ?? [])
    expect(disallow).toContain('/admin')
  })

  it('does not disallow the whole site (a bare "/" disallow would also blind crawlers to real published pages)', () => {
    const result = robots()
    const disallow = Array.isArray(result.rules) ? [] : (result.rules.disallow ?? [])
    expect(disallow).not.toContain('/')
  })

  it('points at the real sitemap using the local-dev default origin when NEXT_PUBLIC_SITE_URL is unset', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    const result = robots()
    expect(result.sitemap).toBe('http://localhost:3000/sitemap.xml')
  })

  it('points at the real sitemap using the configured deployment origin', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://earthandhoney.example'
    const result = robots()
    expect(result.sitemap).toBe('https://earthandhoney.example/sitemap.xml')
  })
})
