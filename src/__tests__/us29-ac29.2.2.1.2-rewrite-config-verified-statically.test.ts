/**
 * ---
 * file: src/__tests__/us29-ac29.2.2.1.2-rewrite-config-verified-statically.test.ts
 * project: earthandhoney
 * purpose: Verify AC-29.2.2.1.2 — the committed next.config.ts rewrite that
 *          closes the gallery-image origin gap is verified statically, with
 *          no browser run and nothing measured (the live proof belongs to
 *          AC-29.2.2.1.3). Four checks: (1) a rewrites() is declared; (2) its
 *          declared source pattern actually matches the real
 *          "/api/gallery/:slug/:kind/:photoId" URLs the two benchmark pages
 *          emitted, read from AC-29.1.1's own committed render-proof
 *          transcript (the saved HTML files) rather than compared against a
 *          hand-written string; (3) the destination resolves to the
 *          "backstage-backend" Docker-network hostname, read from the same
 *          env var docker-compose.yml's web-benchmark service loads via its
 *          env_file (CLAUDE.md Docker Rules — never localhost); (4) neither
 *          next.config.ts nor the .env.example value it falls back to names
 *          localhost.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.2.2.1.2
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const readRaw = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

// Same comment-stripping convention the sibling AC-29.2.1 / AC-29.2.2.1
// suites use: a source-pattern assertion must not be satisfiable by a
// docblock that merely quotes the pattern in prose.
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
const read = (rel: string) => stripComments(readRaw(rel))

const TRANSCRIPT_DIR = 'scripts/benchmark/results/ac29.1.1-render-proof'
const TRANSCRIPT_HTML_FILES = ['benchmark-portfolio-gallery.html', 'benchmark-story-gallery.html']

// Turns a Next.js `rewrites()` source pattern (":slug", ":kind(a|b)",
// ":photoId") into a real RegExp, so the match is against the pattern
// next.config.ts actually declares — not a second hand-authored regex that
// could silently drift from it. Single pass so a ":kind(...)" parameter's
// own parentheses/pipes aren't mangled by a later plain ":name" replace.
function sourcePatternToRegExp(source: string): RegExp {
  const converted = source.replace(
    /:(\w+)\(([^)]+)\)|:(\w+)/g,
    (_match: string, _namedParam: string, namedGroupPattern: string | undefined) =>
      namedGroupPattern !== undefined ? `(${namedGroupPattern})` : '([^/]+)',
  )
  return new RegExp(`^${converted}$`)
}

describe('AC-29.2.2.1.2: rewrites() is declared, verified statically (no browser, nothing measured)', () => {
  const nextConfig = read('next.config.ts')

  it('declares an async rewrites() function', () => {
    expect(nextConfig).toMatch(/async rewrites\(\)/)
  })

  it('the destination resolves to the backstage-backend Docker-network hostname, never localhost', () => {
    const destinationMatch = nextConfig.match(/destination:\s*`([^`]+)`/)
    expect(destinationMatch).not.toBeNull()
    const destinationTemplate = destinationMatch![1]

    expect(destinationTemplate).toMatch(/\$\{BACKSTAGE_BACKEND_URL\}/)
    expect(destinationTemplate).not.toMatch(/localhost/)

    const fallbackMatch = nextConfig.match(/BACKSTAGE_BACKEND_URL\s*=\s*process\.env\.BACKSTAGE_BACKEND_URL\s*\|\|\s*["']([^"']+)["']/)
    expect(fallbackMatch).not.toBeNull()
    expect(fallbackMatch![1]).toBe('http://backstage-backend:3000')
  })

  it("docker-compose.yml's web-benchmark service loads BACKSTAGE_BACKEND_URL via env_file, never sets it to localhost inline", () => {
    const compose = readRaw('docker-compose.yml')
    const benchmarkBlockMatch = compose.match(/\n {2}web-benchmark:\n([\s\S]*?)\n {2}\S/)
    expect(benchmarkBlockMatch).not.toBeNull()
    const benchmarkBlock = benchmarkBlockMatch![1]

    expect(benchmarkBlock).toMatch(/env_file:\s*\n\s*-\s*\.env/)
    // Not overridden inline in docker-compose.yml — inherited from .env via
    // env_file, so this block must name neither the var (it'd shadow the
    // inherited value) nor localhost. (The unrelated healthcheck's
    // "localhost:3000" self-spider-check is scoped out deliberately: it
    // checks the container's own port, not the BACKSTAGE_BACKEND_URL value.)
    expect(benchmarkBlock).not.toMatch(/BACKSTAGE_BACKEND_URL/)
    const withoutHealthcheck = benchmarkBlock.replace(/healthcheck:[\s\S]*/, '')
    expect(withoutHealthcheck).not.toMatch(/localhost/)
  })

  it('.env.example documents BACKSTAGE_BACKEND_URL resolving to backstage-backend, not localhost', () => {
    const envExample = readRaw('.env.example')
    const varMatch = envExample.match(/^BACKSTAGE_BACKEND_URL=(.+)$/m)

    expect(varMatch).not.toBeNull()
    expect(varMatch![1].trim()).toBe('http://backstage-backend:3000')
    expect(varMatch![1]).not.toMatch(/localhost/)
  })

  it('next.config.ts names no localhost value anywhere (the config itself, not unrelated .env.example entries)', () => {
    expect(nextConfig).not.toMatch(/localhost/)
  })
})

describe("AC-29.2.2.1.2: the declared source pattern matches the real URLs AC-29.1.1's committed transcript recorded", () => {
  const nextConfig = read('next.config.ts')
  const sourceMatch = nextConfig.match(/source:\s*["']([^"']+)["']/)

  it('next.config.ts declares a rewrites() source pattern', () => {
    expect(sourceMatch).not.toBeNull()
  })

  const source = sourceMatch![1]
  const pattern = sourcePatternToRegExp(source)

  it('the transcript files are present and actually contain gallery image URLs (a non-vacuous check)', () => {
    const urls = TRANSCRIPT_HTML_FILES.flatMap((file) => {
      const html = readRaw(`${TRANSCRIPT_DIR}/${file}`)
      return [...html.matchAll(/src="(\/api\/gallery\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'))
    })

    expect(urls.length).toBeGreaterThan(0)
  })

  it('every /api/gallery/ image URL recorded in the transcript matches the declared source pattern', () => {
    const urls = TRANSCRIPT_HTML_FILES.flatMap((file) => {
      const html = readRaw(`${TRANSCRIPT_DIR}/${file}`)
      return [...html.matchAll(/src="(\/api\/gallery\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'))
    })

    for (const url of urls) {
      expect(`${url}: ${pattern.test(url)}`).toBe(`${url}: true`)
    }
  })

  it('the pattern does not accidentally match an unrelated Next.js or Payload /api route', () => {
    expect(pattern.test('/api/health')).toBe(false)
    expect(pattern.test('/api/payload/media/123')).toBe(false)
    expect(pattern.test('/api/gallery')).toBe(false)
  })
})
