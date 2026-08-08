/**
 * ---
 * file: src/__tests__/us29-ac29.2-delivery-path-candidates.test.ts
 * project: earthandhoney
 * purpose: Verify AC-29.2 — candidate delivery paths 1 (Backstage token-gated
 *          proxy) and 2 (direct time-limited presigned R2 links) are measured
 *          for real, and candidates 3, 4 and 5 are explicitly recorded as
 *          unmeasured with their blocking prerequisite named rather than
 *          silently dropped. Three kinds of assertion, deliberately separated:
 *            - pure logic (deliveryPathImages, resolveBenchmarkDeliveryPath,
 *              redactSignedUrls) — the seam that makes one page render either
 *              candidate's URLs with nothing else about the page changing;
 *            - wiring (docker-compose.yml, next.config.ts, the presign script)
 *              — what makes candidate 1's and candidate 2's measurements real
 *              rather than measuring a 404 body or a reimplementation;
 *            - committed evidence (scripts/benchmark/results/run-*.json and
 *              CANDIDATE_COVERAGE.md) — the actual measurements, checked to be
 *              photographs rather than error stubs, plus the coverage record.
 *          The live Docker measurement itself is not repeatable in a plain
 *          `jest` run (no Chrome, no Docker-in-Docker), exactly as
 *          us29-ac29.1.3-benchmark-docker-harness.test.ts already reasons.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.2
 * ---
 */
import fs from 'fs'
import path from 'path'
import YAML from 'yaml'

import { applyDeliveryPath } from '@/lib/benchmark/deliveryPathImages'
import { assertObservedDeliveryPath, classifyObservedDeliveryPath } from '@/lib/benchmark/observedDeliveryPath'
import { REDACTION_PLACEHOLDER, redactSignedUrl } from '@/lib/benchmark/redactSignedUrls'
import {
  PRESIGN_MAP_RELATIVE_PATH,
  currentBenchmarkDeliveryPath,
  loadPresignedImageMap,
} from '@/lib/benchmark/resolveBenchmarkDeliveryPath'
import type { GalleryImage } from '@/components/gallery/types'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const RESULTS_DIR = 'scripts/benchmark/results'
const COVERAGE_NOTE = `${RESULTS_DIR}/CANDIDATE_COVERAGE.md`
const PRESIGN_SCRIPT = 'scripts/benchmark/presign-r2-urls.sh'
const FIXTURE_MAP = 'src/__tests__/__fixtures__/us29-ac29.2-presigned-image-map.fixture.json'

const backstageImages: GalleryImage[] = [
  {
    id: '22',
    alt: 'first',
    url: '/api/gallery/us-25-ac-25.5-placement-demo/photo/22',
    thumbnailUrl: '/api/gallery/us-25-ac-25.5-placement-demo/thumbnail/22',
    largeUrl: '/api/gallery/us-25-ac-25.5-placement-demo/hero/22',
  },
  {
    id: '23',
    alt: 'second',
    url: '/api/gallery/us-25-ac-25.5-placement-demo/photo/23',
    thumbnailUrl: '/api/gallery/us-25-ac-25.5-placement-demo/thumbnail/23',
    largeUrl: '/api/gallery/us-25-ac-25.5-placement-demo/hero/23',
  },
]

describe('AC-29.2: one page, two candidate mechanisms — only the image URL differs', () => {
  it('leaves every URL untouched on candidate path 1, the Backstage-proxied default', () => {
    expect(applyDeliveryPath(backstageImages, 'backstage-proxy', { '22': { largeUrl: 'https://r2/x' } })).toEqual(
      backstageImages,
    )
  })

  it('swaps in the presigned R2 URL per tier on candidate path 2', () => {
    const map = JSON.parse(read(FIXTURE_MAP))
    const [first] = applyDeliveryPath(backstageImages, 'presigned-r2', map)

    expect(first.largeUrl).toBe(map['22'].largeUrl)
    expect(first.largeUrl).toMatch(/r2\.cloudflarestorage\.com/)
    // Only the presigned tier moves — everything else about the image, and so
    // about the rendered markup, is identical between the two measured runs.
    expect(first.id).toBe('22')
    expect(first.alt).toBe('first')
    expect(first.thumbnailUrl).toBe(backstageImages[0].thumbnailUrl)
    expect(first.url).toBe(backstageImages[0].url)
  })

  it('keeps the Backstage URL for a photo the presign run never covered, rather than dropping the image', () => {
    const [, second] = applyDeliveryPath(backstageImages, 'presigned-r2', { '22': { largeUrl: 'https://r2/x' } })

    expect(second.largeUrl).toBe('/api/gallery/us-25-ac-25.5-placement-demo/hero/23')
  })

  it('never mutates the resolved gallery it was handed', () => {
    const snapshot = JSON.parse(JSON.stringify(backstageImages))
    applyDeliveryPath(backstageImages, 'presigned-r2', JSON.parse(read(FIXTURE_MAP)))

    expect(backstageImages).toEqual(snapshot)
  })
})

describe('AC-29.2: the request-time seam that selects which candidate a container measures', () => {
  const original = process.env.BENCHMARK_DELIVERY_PATH

  afterEach(() => {
    if (original === undefined) delete process.env.BENCHMARK_DELIVERY_PATH
    else process.env.BENCHMARK_DELIVERY_PATH = original
  })

  it.each([undefined, '', 'backstage-proxy', 'presigned', 'PRESIGNED-R2'])(
    'resolves %p to candidate path 1 — a typo must not half-select the other candidate',
    (value) => {
      if (value === undefined) delete process.env.BENCHMARK_DELIVERY_PATH
      else process.env.BENCHMARK_DELIVERY_PATH = value

      expect(currentBenchmarkDeliveryPath()).toBe('backstage-proxy')
    },
  )

  it('resolves the exact string "presigned-r2" to candidate path 2', () => {
    process.env.BENCHMARK_DELIVERY_PATH = 'presigned-r2'

    expect(currentBenchmarkDeliveryPath()).toBe('presigned-r2')
  })

  it('reads a generated presigned map off disk', () => {
    expect(Object.keys(loadPresignedImageMap(path.join(root, FIXTURE_MAP)))).toEqual(['22', '23'])
  })

  it.each([
    ['a map that was never generated', 'scripts/benchmark/presign-data/does-not-exist.json'],
    ['a file that is not JSON at all', PRESIGN_SCRIPT],
  ])('degrades %s to an empty map instead of throwing', (_label, rel) => {
    expect(loadPresignedImageMap(path.join(root, rel))).toEqual({})
  })

  it('reads the same repo-relative path docker-compose.yml bind-mounts into the container', () => {
    const compose = YAML.parse(read('docker-compose.yml'))
    const mount: string = compose.services['web-benchmark'].volumes.find((v: string) =>
      v.includes('presign-data'),
    )

    expect(PRESIGN_MAP_RELATIVE_PATH.startsWith('scripts/benchmark/presign-data/')).toBe(true)
    expect(mount).toBe('./scripts/benchmark/presign-data:/app/scripts/benchmark/presign-data')
  })

  it('exposes the candidate selector to the benchmark container as an env var the shell can set', () => {
    const compose = YAML.parse(read('docker-compose.yml'))

    expect(compose.services['web-benchmark'].environment.BENCHMARK_DELIVERY_PATH).toBe(
      '${BENCHMARK_DELIVERY_PATH:-backstage-proxy}',
    )
  })
})

describe('AC-29.2: candidate path 1 is measured against real photographs, not a 404 body', () => {
  const nextConfig = read('next.config.ts')

  // The rewrite is generated from one template over a tier list, so the tier
  // list is what gets asserted rather than four literal source strings.
  const tiers = nextConfig.match(/const tiers = \[([^\]]*)\]/)?.[1] ?? ''

  it('rewrites Backstage image URLs to the backend, keyed on slug and photo id', () => {
    // Without this, `GET /api/gallery/:slug/hero/:id` — the URL
    // mapBackstageGalleryToImages puts in every `<img src>` — hits Next.js's
    // own origin, where nothing serves it. The pre-fix committed runs measured
    // an 83-byte JSON "Route not found" body as if it were a photograph; a
    // candidate-1 number taken that way measures nothing.
    expect(nextConfig).toContain('/api/gallery/:slug/${tier}/:photoId')
  })

  it.each(['thumbnail', 'hero', 'photo', 'preview'])(
    'covers the Backstage /%s image route',
    (tier) => {
      expect(tiers).toMatch(new RegExp(`['"]${tier}['"]`))
    },
  )

  it('scopes the rewrite to those image routes and never blanket-proxies /api/gallery', () => {
    // A blanket prefix would shadow Payload's own `/api/[...slug]` catch-all.
    expect(nextConfig).not.toMatch(/source:\s*[`'"]\/api\/gallery\/:path\*/)
    expect(nextConfig).not.toMatch(/source:\s*[`'"]\/api\/:path\*/)
  })

  it('resolves the proxy target from BACKSTAGE_BACKEND_URL, not a hardcoded localhost', () => {
    expect(nextConfig).toContain('BACKSTAGE_BACKEND_URL')
    expect(nextConfig).not.toMatch(/destination:\s*[`'"]http:\/\/localhost/)
  })
})

describe("AC-29.2: candidate path 2 is measured through the pinned fork's own mechanism", () => {
  const presign = read(PRESIGN_SCRIPT)

  it("calls S3StorageBackend.signedUrl via the fork's storage module rather than reimplementing SigV4", () => {
    expect(presign).toContain("require('./src/services/storage')")
    expect(presign).toMatch(/storage\.signedUrl\(/)
    // No parallel AWS SDK dependency was added to this repo to do it.
    const appPkg = JSON.parse(read('package.json'))
    const appDeps = { ...appPkg.dependencies, ...appPkg.devDependencies }
    expect(Object.keys(appDeps).filter((name) => name.startsWith('@aws-sdk/'))).toEqual([])
  })

  it('runs inside the backstage-backend container, per CLAUDE.md Docker Rules', () => {
    expect(presign).toMatch(/docker compose exec .*backstage-backend/)
  })

  it('keeps the generated live-signature map out of version control', () => {
    expect(read('.gitignore')).toContain('scripts/benchmark/presign-data/*.json')
    expect(fs.existsSync(path.join(root, 'scripts/benchmark/presign-data/.gitkeep'))).toBe(true)
  })
})

describe('AC-29.2: a committed measurement exists for each of the two measurable candidates', () => {
  const resultsDir = path.join(root, RESULTS_DIR)
  const reports = fs
    .readdirSync(resultsDir)
    .filter((name) => /^run-.*\.json$/.test(name))
    .map((name) => ({ name, report: JSON.parse(fs.readFileSync(path.join(resultsDir, name), 'utf8')) }))
    // Pre-AC-29.2 reports carry no `deliveryPath`: they were taken before the
    // next.config.ts rewrite above, so their image rows are 404 bodies. They
    // remain AC-29.1.3's reproducibility evidence for the harness itself and
    // are deliberately not counted as candidate-path measurements here.
    .filter(({ report }) => typeof report.deliveryPath === 'string')

  const forPath = (deliveryPath: string) => reports.filter(({ report }) => report.deliveryPath === deliveryPath)

  it.each(['backstage-proxy', 'presigned-r2'])('retains at least one report measuring %s', (deliveryPath) => {
    expect(forPath(deliveryPath).length).toBeGreaterThanOrEqual(1)
  })

  it('labels the candidate in the filename as well as the body, so a listing is self-describing', () => {
    for (const { name, report } of reports) {
      expect(name).toContain(report.deliveryPath)
    }
  })

  it.each(reports.map(({ name }) => name))('%s measured real gallery imagery on both pages', (name) => {
    const { report } = reports.find((entry) => entry.name === name)!

    expect(report.pages.map((page: { id: string }) => page.id)).toEqual(['portfolio-gallery', 'story-gallery'])

    for (const page of report.pages) {
      for (const run of page.harness.rawRuns) {
        const gallery = run.networkPayload.images.filter(
          (image: { url: string }) => !image.url.includes('/_next/image'),
        )
        expect(gallery.length).toBeGreaterThanOrEqual(2)
        for (const image of gallery) {
          // The 404 JSON body the pre-fix runs recorded was 83 bytes. A real
          // seeded derivative is kilobytes. This is the assertion that makes
          // "measured for real" checkable rather than asserted.
          expect(image.transferBytes).toBeGreaterThan(2000)
        }
      }
    }
  })

  it('measured candidate 1 through the Backstage, on the page origin', () => {
    for (const { report } of forPath('backstage-proxy')) {
      const urls: string[] = report.pages.flatMap((page: { harness: { rawRuns: Array<{ networkPayload: { images: Array<{ url: string }> } }> } }) =>
        page.harness.rawRuns.flatMap((run) => run.networkPayload.images.map((image) => image.url)),
      )
      const gallery = urls.filter((url) => !url.includes('/_next/image'))

      expect(gallery.length).toBeGreaterThan(0)
      expect(gallery.every((url) => url.includes('/api/gallery/'))).toBe(true)
      expect(gallery.some((url) => url.includes('r2.cloudflarestorage.com'))).toBe(false)
    }
  })

  it('measured candidate 2 straight from R2, bypassing the Backstage entirely', () => {
    for (const { report } of forPath('presigned-r2')) {
      const urls: string[] = report.pages.flatMap((page: { harness: { rawRuns: Array<{ networkPayload: { images: Array<{ url: string }> } }> } }) =>
        page.harness.rawRuns.flatMap((run) => run.networkPayload.images.map((image) => image.url)),
      )
      const gallery = urls.filter((url) => !url.includes('/_next/image'))

      expect(gallery.length).toBeGreaterThan(0)
      expect(gallery.every((url) => url.includes('r2.cloudflarestorage.com'))).toBe(true)
      // Still a *time-limited* link — the ADR names candidate 2 as such.
      expect(gallery.every((url) => url.includes('X-Amz-Expires='))).toBe(true)
    }
  })

  it('commits no live R2 signature or access key id alongside those numbers', () => {
    for (const { name } of reports) {
      const raw = fs.readFileSync(path.join(resultsDir, name), 'utf8')

      for (const match of raw.matchAll(/X-Amz-(?:Signature|Credential)=([^&"]*)/g)) {
        expect(decodeURIComponent(match[1])).toBe(REDACTION_PLACEHOLDER)
      }
    }
  })
})

describe('AC-29.2: a report cannot be filed under a candidate it did not measure', () => {
  const PROXIED = 'http://web-benchmark:3000/api/gallery/us-25-ac-25.5-placement-demo/hero/22'
  const PRESIGNED =
    'https://acct.r2.cloudflarestorage.com/earthandhoney/backstage/heroes/hero_x.png?X-Amz-Expires=7200'
  const LOGO = 'http://web-benchmark:3000/_next/image?url=%2Fphotobuddy%2Fimg%2Flogo.png&w=384&q=75'

  it('classifies an all-Backstage page as candidate 1, ignoring the site logo', () => {
    expect(classifyObservedDeliveryPath([LOGO, PROXIED, PROXIED])).toBe('backstage-proxy')
  })

  it('classifies an all-R2 page as candidate 2', () => {
    expect(classifyObservedDeliveryPath([LOGO, PRESIGNED, PRESIGNED])).toBe('presigned-r2')
  })

  it.each([
    ['a page mixing both mechanisms', [PROXIED, PRESIGNED]],
    ['a page that requested no gallery image at all', [LOGO]],
    ['an empty run', []],
  ])('refuses to classify %s', (_label, urls) => {
    expect(classifyObservedDeliveryPath(urls)).toBeNull()
  })

  it('throws when the declared candidate contradicts what was fetched', () => {
    // The exact failure this guard exists for: BENCHMARK_DELIVERY_PATH set on
    // the pages' container but not on the harness's.
    expect(() => assertObservedDeliveryPath('backstage-proxy', [LOGO, PRESIGNED])).toThrow(
      /Refusing to write a report labeled "backstage-proxy"/,
    )
    expect(() => assertObservedDeliveryPath('backstage-proxy', [LOGO, PRESIGNED])).toThrow(
      /BENCHMARK_DELIVERY_PATH/,
    )
  })

  it('passes silently when the declared candidate is what was fetched', () => {
    expect(() => assertObservedDeliveryPath('presigned-r2', [LOGO, PRESIGNED])).not.toThrow()
    expect(() => assertObservedDeliveryPath('backstage-proxy', [LOGO, PROXIED])).not.toThrow()
  })

  it('is wired into run.ts before anything is written, and into both compose services', () => {
    const runScript = read('scripts/benchmark/run.ts')
    const compose = YAML.parse(read('docker-compose.yml'))

    expect(runScript).toContain('assertObservedDeliveryPath')
    expect(runScript.indexOf('assertObservedDeliveryPath')).toBeLessThan(runScript.indexOf('fs.writeFileSync'))
    expect(compose.services['lighthouse-benchmark'].environment.BENCHMARK_DELIVERY_PATH).toBe(
      '${BENCHMARK_DELIVERY_PATH:-backstage-proxy}',
    )
  })
})

describe('AC-29.2: signature redaction keeps the evidence and drops the secret', () => {
  const signed =
    'https://acct.r2.cloudflarestorage.com/earthandhoney/backstage/heroes/hero_x.png' +
    '?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAEXAMPLE%2F20260808%2Fauto%2Fs3%2Faws4_request' +
    '&X-Amz-Date=20260808T152142Z&X-Amz-Expires=3600&X-Amz-Signature=deadbeef&X-Amz-SignedHeaders=host'

  it('redacts the access key id and the HMAC', () => {
    const redacted = redactSignedUrl(signed)

    expect(redacted).not.toContain('AKIAEXAMPLE')
    expect(redacted).not.toContain('deadbeef')
    expect(redacted).toContain(`X-Amz-Signature=${REDACTION_PLACEHOLDER}`)
  })

  it('keeps the host, object key and TTL that prove the fetch went straight to R2', () => {
    const redacted = redactSignedUrl(signed)

    expect(redacted).toContain('acct.r2.cloudflarestorage.com')
    expect(redacted).toContain('backstage/heroes/hero_x.png')
    expect(redacted).toContain('X-Amz-Expires=3600')
  })

  it.each([
    '/api/gallery/us-25-ac-25.5-placement-demo/hero/22',
    'http://web-benchmark:3000/api/gallery/us-25-ac-25.5-placement-demo/hero/22',
    'not a url at all',
  ])('returns %p unchanged — there is nothing to redact', (url) => {
    expect(redactSignedUrl(url)).toBe(url)
  })
})

describe('AC-29.2: no candidate is silently dropped', () => {
  const coverage = read(COVERAGE_NOTE)
  /** `| 3 | An edge authorisation layer | **Unmeasured** | ... |` -> the trimmed cells. */
  const rowFor = (candidate: string) => {
    const row = coverage.split('\n').find((line) => line.startsWith(`| ${candidate} |`))
    return row ? row.split('|').map((cell) => cell.trim()) : undefined
  }

  it.each([
    ['1', 'Measured'],
    ['2', 'Measured'],
    ['3', 'Unmeasured'],
    ['4', 'Unmeasured'],
    ['5', 'Unmeasured'],
  ])('records candidate %s with an explicit "%s" status of its own', (candidate, status) => {
    const cells = rowFor(candidate)

    expect(cells).toBeDefined()
    // The exact cell, not a substring of the row — "Unmeasured" contains
    // "Measured", so a looser check would pass on the wrong status.
    expect(cells![3]).toBe(`**${status}**`)
  })

  it('names a specific blocking prerequisite for every unmeasured candidate', () => {
    for (const candidate of ['3', '4', '5']) {
      // Not "not measured" alone — the AC requires the specific missing thing.
      expect(rowFor(candidate)![4]).toMatch(/Cloudflare (custom domain|Worker)/i)
    }
  })

  it('cites the committed run reports as the evidence for the measured candidates', () => {
    for (const candidate of ['1', '2']) {
      expect(rowFor(candidate)![4]).toMatch(/run-.*\.json/)
    }
  })

  it('ranks nothing by preference — the ADR forbids it and AC-29.4 owns the decision', () => {
    expect(coverage).not.toMatch(/\b(recommend|preferred|we should choose|best path)\b/i)
  })

  it('raises the blocking prerequisite in po-requests.md, naming candidates 3 and 4', () => {
    const poRequests = read('scrum-master/po-requests.md')
    const item = poRequests.split('\n').find((line) => line.includes('Cloudflare custom domain'))

    expect(item).toBeDefined()
    expect(item).toMatch(/candidates? 3/i)
    expect(item).toMatch(/4/)
    expect(coverage).toContain('po-requests.md')
  })
})
