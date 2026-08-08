/**
 * ---
 * file: src/__tests__/us29-ac29.2.2.1-benchmark-image-origin-fix.test.ts
 * project: earthandhoney
 * purpose: Verify AC-29.2.2.1 — the two benchmark pages are made to serve
 *          real image bytes from the page origin, and the five files
 *          AC-29.2.1 disqualified are withdrawn. Two layers: (1) the origin
 *          fix AC-29.2.1's map named is actually present in committed
 *          configuration — next.config.ts rewrites the four binary image
 *          routes to BACKSTAGE_BACKEND_URL, the Docker-network hostname per
 *          CLAUDE.md's Docker Rules, never localhost; (2) none of the five
 *          named discredited files remain under scripts/benchmark/results/,
 *          and REPRODUCIBILITY.md states why. This suite runs no browser,
 *          builds no report and measures nothing — the fetch proof that a
 *          real photograph reaches the browser lives in
 *          scripts/ac29.2.2.1-benchmark-image-origin-proof.sh, whose
 *          retained transcript this suite also checks for shape.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.2.2.1
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const readRaw = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

// Same comment-stripping helper the AC-29.2.1 suite uses: an assertion about
// code must not be satisfied by a docblock that happens to quote the pattern.
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
const read = (rel: string) => stripComments(readRaw(rel))

const RESULTS_DIR = 'scripts/benchmark/results'

const WITHDRAWN_FILES = [
  'run-2026-08-08T14-51-01-229Z.json',
  'run-2026-08-08T14-52-16-271Z.json',
  'run-2026-08-08T15-29-04-854Z-backstage-proxy.json',
  'run-2026-08-08T15-30-06-730Z-backstage-proxy.json',
  'CANDIDATE_COVERAGE.md',
]

describe('AC-29.2.2.1: next.config.ts closes the origin gap AC-29.2.1 found', () => {
  it("rewrites the four binary image routes to BACKSTAGE_BACKEND_URL, not localhost", () => {
    const nextConfig = read('next.config.ts')

    expect(nextConfig).toMatch(/async rewrites\(\)/)
    expect(nextConfig).toMatch(/BACKSTAGE_BACKEND_URL/)
    expect(nextConfig).toMatch(/thumbnail\|hero\|photo\|preview/)
    expect(nextConfig).not.toMatch(/localhost/)
  })

  it('the rewrite source matches the exact relative shape gallery.js returns', () => {
    const nextConfig = read('next.config.ts')

    expect(nextConfig).toMatch(/['"]\/api\/gallery\/:slug\/:\w+\(thumbnail\|hero\|photo\|preview\)\/:photoId['"]/)
  })

  it("falls back to the backstage-backend Docker-network hostname when the env var is unset, per .env.example", () => {
    const nextConfig = read('next.config.ts')
    const envExample = readRaw('.env.example')

    expect(nextConfig).toMatch(/process\.env\.BACKSTAGE_BACKEND_URL\s*\|\|\s*["']http:\/\/backstage-backend:3000["']/)
    expect(envExample).toMatch(/BACKSTAGE_BACKEND_URL=http:\/\/backstage-backend:3000/)
  })
})

describe('AC-29.2.2.1: the five discredited files named by AC-29.2.1 are withdrawn', () => {
  it('none of the five files exist under scripts/benchmark/results/', () => {
    for (const name of WITHDRAWN_FILES) {
      expect(`${name}: ${exists(`${RESULTS_DIR}/${name}`)}`).toBe(`${name}: false`)
    }
  })

  it('REPRODUCIBILITY.md states why its own two runs were withdrawn', () => {
    const reproducibility = readRaw(`${RESULTS_DIR}/REPRODUCIBILITY.md`)

    expect(reproducibility).toMatch(/withdrawn/i)
    expect(reproducibility).toContain('run-2026-08-08T14-51-01-229Z.json')
    expect(reproducibility).toContain('run-2026-08-08T14-52-16-271Z.json')
  })

  it('nothing under scripts/benchmark/results/ still cites the two nonexistent presigned-r2 files CANDIDATE_COVERAGE.md claimed', () => {
    const names = fs.readdirSync(path.join(root, RESULTS_DIR)).filter((n) => n.endsWith('.md') || n.endsWith('.json'))

    for (const name of names) {
      const contents = readRaw(`${RESULTS_DIR}/${name}`)
      expect(`${name}: ${contents.includes('run-2026-08-08T15-31-59-072Z-presigned-r2.json')}`).toBe(`${name}: false`)
      expect(`${name}: ${contents.includes('run-2026-08-08T15-33-01-345Z-presigned-r2.json')}`).toBe(`${name}: false`)
    }
  })
})

describe('AC-29.2.2.1: the retained fetch-only proof (no Lighthouse) shows real bytes, not a 404 body', () => {
  const proofScript = read('scripts/ac29.2.2.1-benchmark-image-origin-proof.sh')
  const transcriptPath = `${RESULTS_DIR}/ac29.2.2.1-image-origin-proof/image-origin-proof.json`

  it('the proof script fetches Docker-network backstage-backend indirectly, never hardcoding localhost as the rewrite target', () => {
    // The script itself talks to the published "web-benchmark" host port
    // (it runs on the host, outside the Docker network, mirroring
    // ac29.1.1-benchmark-render-proof.sh's own FRONTSTAGE_URL convention) —
    // what matters here is that it never names a rewrite destination itself,
    // i.e. it proves the fix rather than re-implementing it.
    expect(proofScript).not.toMatch(/BACKSTAGE_BACKEND_URL\s*=/)
    expect(proofScript).toMatch(/\/api\/gallery\//)
  })

  it('a retained transcript exists and every recorded image is real', () => {
    expect(exists(transcriptPath)).toBe(true)

    const transcript = JSON.parse(readRaw(transcriptPath)) as {
      pages: Array<{ path: string; galleryImageCount: number; images: Array<{ url: string; httpStatus: number; contentType: string; byteLength: number }> }>
    }

    expect(transcript.pages.length).toBe(2)
    for (const page of transcript.pages) {
      expect(page.galleryImageCount).toBeGreaterThan(0)
      for (const image of page.images) {
        expect(image.url).toContain('/api/gallery/')
        expect(image.httpStatus).toBe(200)
        expect(image.contentType).toMatch(/^image\//)
        // Far larger than the 83-byte 404 body AC-29.2.1 found.
        expect(image.byteLength).toBeGreaterThan(1000)
      }
    }
  })
})
