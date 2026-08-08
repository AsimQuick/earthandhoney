/**
 * ---
 * file: src/__tests__/us29-ac29.2.1-candidate-mechanism-map.test.ts
 * project: earthandhoney
 * purpose: Verify AC-29.2.1 — every file:line claim the new "Candidate
 *          mechanism map (AC-29.2.1)" subsection of R2_STORAGE_AND_DELIVERY_ADR.md
 *          makes about the pinned fork still holds, and that no per-photo
 *          presigned view route has appeared anywhere in
 *          vendor/picpeak/backend/src/routes/ since that subsection was
 *          written. An absence assertion over comment-stripped source, per
 *          the AC: the subsection's own prose is not evidence of its own
 *          claims, only the source is. Confirmation work, not discovery —
 *          this suite runs no browser, builds no image and measures nothing.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.2.1
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const readRaw = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

// Mirrors us28-ac28.1.2-retire-sharp-r2-upload-path.test.ts's helper: strips
// comments so an absence assertion tests the code, not prose that quotes the
// pattern it's asserting is absent (e.g. this very ADR subsection's file:line
// citations, if this suite ever grepped the ADR by mistake).
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
const read = (rel: string) => stripComments(readRaw(rel))

const GALLERY_ROUTE = 'vendor/picpeak/backend/src/routes/gallery.js'
const PROTECTED_IMAGES_ROUTE = 'vendor/picpeak/backend/src/routes/protectedImages.js'
const SERVER_ENTRY = 'vendor/picpeak/backend/server.js'
const S3_BACKEND = 'vendor/picpeak/backend/src/services/storage/S3StorageBackend.js'
const LOCAL_FS_BACKEND = 'vendor/picpeak/backend/src/services/storage/LocalFsStorage.js'
const ROUTES_DIR = 'vendor/picpeak/backend/src/routes'

describe('AC-29.2.1: candidate 1 — the public photos path exists and is what the benchmark pages use', () => {
  it('GET /:slug/photos builds thumbnail_url, hero_url and preview_url', () => {
    const src = read(GALLERY_ROUTE)

    expect(src).toMatch(/router\.get\(['"]\/:slug\/photos['"]/)
    expect(src).toMatch(/thumbnail_url:/)
    expect(src).toMatch(/hero_url:/)
    expect(src).toMatch(/preview_url:/)
  })

  it("gallery.js's photos route is mounted at /api/gallery, not /api/images", () => {
    const server = read(SERVER_ENTRY)

    expect(server).toMatch(/app\.use\(['"]\/api\/gallery['"],\s*galleryRoutes\)/)
    expect(server).toMatch(/galleryRoutes\s*=\s*require\(['"]\.\/src\/routes\/gallery['"]\)/)
  })

  it("protectedImages.js is a separate, /api/images-mounted, single-photo signed-token route", () => {
    const server = read(SERVER_ENTRY)
    const protectedImages = read(PROTECTED_IMAGES_ROUTE)

    expect(server).toMatch(/app\.use\(['"]\/api\/images['"],\s*require\(['"]\.\/src\/routes\/protectedImages['"]\)\)/)
    expect(protectedImages).toMatch(/generateImageToken\(photoId\)/)
    expect(protectedImages).toMatch(/router\.get\(['"]\/:slug\/photo\/:photoId\/signed\/:token['"]/)
  })

  it('backstageGalleryMapper.ts maps the three photos-route URLs onto thumbnail/medium/large', () => {
    const mapper = read('src/components/gallery/backstageGalleryMapper.ts')

    expect(mapper).toMatch(/thumbnailUrl:\s*photo\.thumbnail_url/)
    expect(mapper).toMatch(/mediumUrl:\s*photo\.preview_url/)
    expect(mapper).toMatch(/largeUrl:\s*photo\.hero_url/)
  })

  it('galleryImageLoader.ts picks among the three tiers by requested width', () => {
    const loader = read('src/components/gallery/galleryImageLoader.ts')

    expect(loader).toMatch(/export function resolveGalleryImageSrc/)
    expect(loader).toMatch(/thumbnailUrl/)
    expect(loader).toMatch(/mediumUrl/)
    expect(loader).toMatch(/largeUrl/)
  })

  it('the benchmark pages fetch through the mapper, never through protectedImages.js', () => {
    const portfolioPage = read('src/app/(frontend)/dev/benchmark-portfolio-gallery/page.tsx')

    expect(portfolioPage).toMatch(/resolveGalleryPlacementImages/)
    expect(portfolioPage).not.toMatch(/protectedImages|\/api\/images\//)
  })
})

describe('AC-29.2.1: candidate 1 — no existing run file is usable path-1 evidence', () => {
  const RESULTS_DIR = 'scripts/benchmark/results'

  it("the committed AC-29.1.3 runs recorded a 404 body's byte length, not a photograph", () => {
    for (const name of ['run-2026-08-08T14-51-01-229Z.json', 'run-2026-08-08T14-52-16-271Z.json']) {
      const report = JSON.parse(readRaw(`${RESULTS_DIR}/${name}`))
      const galleryImages = report.pages[0].harness.rawRuns[0].networkPayload.images.filter(
        (image: { url: string }) => !image.url.includes('/_next/image'),
      )

      expect(galleryImages.length).toBeGreaterThan(0)
      for (const image of galleryImages) {
        // 83 bytes over the wire (Lighthouse's transferBytes includes
        // response headers, not just the 29-byte JSON body) is what both
        // committed pre-AC-29.2 runs record for every gallery image request —
        // confirmed by direct inspection, not derived, since a byte-length
        // computed from the JSON body alone undercounts the transfer.
        expect(image.transferBytes).toBe(83)
      }
    }
  })

  it("run.ts's committed write shape has no deliveryPath field and no candidate-suffixed filename", () => {
    const runScript = read('scripts/benchmark/run.ts')

    expect(runScript).not.toMatch(/deliveryPath/)
    expect(runScript).toContain("`run-${new Date().toISOString().replace(/[:.]/g, '-')}.json`")
  })

  it('nothing in the working tree proxies /api/gallery/* from the Next.js origin to the Backstage backend', () => {
    const nextConfig = read('next.config.ts')
    const compose = readRaw('docker-compose.yml')
    // Scoped to the two benchmark services only — docker-compose.yml's
    // unrelated "backstage-frontend" service legitimately runs the vendored
    // fork's own nginx, which is not this claim.
    const benchmarkBlock = compose.slice(compose.indexOf('web-benchmark:'), compose.indexOf('volumes:\n  pgdata:'))

    expect(nextConfig).not.toMatch(/rewrites\s*\(/)
    expect(benchmarkBlock).not.toMatch(/nginx|caddy|reverse[_-]?proxy/i)
  })

  it('the two uncommitted "-backstage-proxy" run files exist but cite run.ts fields it does not write', () => {
    const names = fs.readdirSync(path.join(root, RESULTS_DIR)).filter((n) => n.endsWith('-backstage-proxy.json'))
    expect(names.length).toBeGreaterThan(0)

    for (const name of names) {
      const report = JSON.parse(readRaw(`${RESULTS_DIR}/${name}`))
      expect(report.deliveryPath).toBe('backstage-proxy')
    }
    // The assertion this documents: run.ts (checked above) never writes a
    // `deliveryPath` key, so a file that has one was not produced by it.
  })
})

describe('AC-29.2.1: candidate 2 — signedUrl exists, and its only route caller is the ZIP branch', () => {
  it('S3StorageBackend.signedUrl exists and requests a getObject presign', () => {
    const backend = read(S3_BACKEND)

    expect(backend).toMatch(/async signedUrl\(relPath, ttlSeconds = 300\)/)
    expect(backend).toMatch(/getSignedUrl\(['"]getObject['"]/)
  })

  it('LocalFsStorage.signedUrl throws by design, requiring STORAGE_BACKEND=s3', () => {
    const local = read(LOCAL_FS_BACKEND)

    expect(local).toMatch(/async signedUrl\(_relPath, _ttlSeconds = 300\)/)
    expect(local).toMatch(/throw new Error/)
    expect(local).toMatch(/STORAGE_BACKEND=s3/)
  })

  it('docker-compose.yml already sets STORAGE_BACKEND=s3 for backstage-backend', () => {
    const compose = readRaw('docker-compose.yml')
    expect(compose).toMatch(/STORAGE_BACKEND:\s*s3/)
  })

  it('the ZIP download branch is signedUrl()\'s only caller anywhere in vendor/picpeak/backend, gated three ways', () => {
    const gallery = read(GALLERY_ROUTE)

    expect(gallery).toMatch(/allow_presigned_download/)
    expect(gallery).toMatch(/storage\.kind\(\)\s*===\s*['"]s3['"]/)
    expect(gallery).toMatch(/watermark_downloads/)
    expect(gallery).toMatch(/storage\.signedUrl\(zipInfo\.key/)
    expect(gallery).toMatch(/res\.redirect\(302, url\)/)
  })

  it('logs the presigned redirect request itself, even though the ADR notes the byte fetch after it is unlogged', () => {
    const gallery = read(GALLERY_ROUTE)
    expect(gallery).toMatch(/action:\s*['"]download_all_presigned['"]/)
  })

  it('every call to .signedUrl( in the whole vendored backend is exactly the two definitions plus the one ZIP-branch call', () => {
    const matches: string[] = []
    for (const dir of walk(path.join(root, 'vendor/picpeak/backend'))) {
      if (!dir.endsWith('.js')) continue
      const src = readRaw(path.relative(root, dir))
      for (const m of src.matchAll(/\.?signedUrl\(/g)) matches.push(`${dir}:${m.index}`)
    }
    expect(matches.length).toBe(3)
  })

  it('no per-photo presigned view route exists anywhere in vendor/picpeak/backend/src/routes/', () => {
    const routeFiles = fs.readdirSync(path.join(root, ROUTES_DIR)).filter((f) => f.endsWith('.js'))

    for (const file of routeFiles) {
      const src = read(`${ROUTES_DIR}/${file}`)
      // A per-photo presigned route would call storage.signedUrl (or
      // getSignedUrl) from inside a handler keyed on :photoId rather than a
      // whole-event ZIP key. The only real call site, gallery.js's ZIP
      // branch, keys on `zipInfo.key` — assert no route anywhere signs a URL
      // keyed on a per-photo path instead.
      expect(src).not.toMatch(/signedUrl\([^)]*photo[^)]*\)/i)
    }
  })
})

describe('AC-29.2.1: candidate 2 — the additive application-layer scaffolding that exists is unwired', () => {
  it('the pure-logic modules and presign script exist in the working tree', () => {
    expect(exists('src/lib/benchmark/deliveryPathImages.ts')).toBe(true)
    expect(exists('src/lib/benchmark/resolveBenchmarkDeliveryPath.ts')).toBe(true)
    expect(exists('scripts/benchmark/presign-r2-urls.sh')).toBe(true)
  })

  it('neither benchmark page calls into the delivery-path selection modules', () => {
    for (const page of ['benchmark-portfolio-gallery', 'benchmark-story-gallery']) {
      const src = read(`src/app/(frontend)/dev/${page}/page.tsx`)
      expect(src).not.toMatch(/applyDeliveryPath|currentBenchmarkDeliveryPath/)
    }
  })

  it('run.ts never imports any of the delivery-path modules', () => {
    const runScript = read('scripts/benchmark/run.ts')
    expect(runScript).not.toMatch(/deliveryPathImages|resolveBenchmarkDeliveryPath|observedDeliveryPath/)
  })

  it("docker-compose.yml's benchmark services define neither BENCHMARK_DELIVERY_PATH nor a presign-data mount", () => {
    const compose = readRaw('docker-compose.yml')
    const benchmarkBlock = compose.slice(compose.indexOf('web-benchmark:'), compose.indexOf('volumes:\n  pgdata:'))

    expect(benchmarkBlock).not.toMatch(/BENCHMARK_DELIVERY_PATH/)
    expect(benchmarkBlock).not.toMatch(/presign-data/)
  })
})

describe('AC-29.2.1: a claim not to carry forward into AC-29.2.2', () => {
  it('CANDIDATE_COVERAGE.md cites two presigned-r2 run files that do not exist on disk', () => {
    const coverage = readRaw('scripts/benchmark/results/CANDIDATE_COVERAGE.md')
    const cited = ['run-2026-08-08T15-31-59-072Z-presigned-r2.json', 'run-2026-08-08T15-33-01-345Z-presigned-r2.json']

    for (const name of cited) {
      expect(coverage).toContain(name)
      expect(exists(`scripts/benchmark/results/${name}`)).toBe(false)
    }
  })

  it('no run-*-presigned-r2.json file exists anywhere in the results directory', () => {
    const names = fs.readdirSync(path.join(root, 'scripts/benchmark/results'))
    expect(names.filter((n) => /^run-.*presigned-r2\.json$/.test(n))).toEqual([])
  })
})

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue
      yield* walk(full)
    } else {
      yield full
    }
  }
}
