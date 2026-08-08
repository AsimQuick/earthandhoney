/**
 * ---
 * file: src/__tests__/us29-ac29.2.2.2-delivery-path-switch-wiring.test.ts
 * project: earthandhoney
 * purpose: AC-29.2.2.2 — the Jest suite over the pure modules the AC's
 *          evidence requirement names explicitly: the tier swap
 *          (deliveryPathImages.ts), the redaction (redactSignedUrls.ts), and
 *          the mislabel refusal (observedDeliveryPath.ts) — plus the env/map
 *          resolution seam (resolveBenchmarkDeliveryPath.ts) all four other
 *          modules and both benchmark pages read the declared path through.
 *          No Chrome, no Docker, no live R2 call: every module under test is
 *          plain-function pure logic, run against a checked-in fixture map
 *          rather than the gitignored, live-signature one
 *          scripts/benchmark/presign-r2-urls.sh generates.
 *          The last two describes are static instead of behavioural, for the
 *          two halves of this AC that a pure unit test cannot execute: the
 *          wiring itself (both pages, run.ts, docker-compose.yml,
 *          BACKSTAGE_STARTUP.md) and the credential-hygiene outcome (the
 *          leaked map untracked and gitignored, both saved fetch transcripts
 *          present, passing, and carrying no unredacted SigV4 value).
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.2.2.2
 * ---
 */
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'

import { applyDeliveryPath, type PresignedImageMap } from '@/lib/benchmark/deliveryPathImages'
import type { GalleryImage } from '@/components/gallery/types'
import {
  assertObservedDeliveryPath,
  classifyObservedDeliveryPath,
  isGalleryImageUrl,
} from '@/lib/benchmark/observedDeliveryPath'
import { redactSignedUrl } from '@/lib/benchmark/redactSignedUrls'
import { currentBenchmarkDeliveryPath, loadPresignedImageMap } from '@/lib/benchmark/resolveBenchmarkDeliveryPath'

const root = process.cwd()
const readRepo = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const repoExists = (rel: string) => fs.existsSync(path.join(root, rel))
// Mirrors us29-ac29.2.1-candidate-mechanism-map.test.ts's helper: an assertion
// about code must not be satisfied by a comment that merely quotes the symbol.
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')

const PROOF_DIR = 'scripts/benchmark/results/ac29.2.2.2-delivery-path-proof'
const PRESIGN_MAP_PATH = 'scripts/benchmark/presign-data/presigned-image-map.json'

const BACKSTAGE_IMAGE_URL = '/api/gallery/us-25-ac-25.5-placement-demo/hero/22'
const PRESIGNED_URL =
  'https://example-account.r2.cloudflarestorage.com/earthandhoney/backstage/heroes/hero_22.png' +
  '?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=abcd1234%2F20260808%2Fauto%2Fs3%2Faws4_request' +
  '&X-Amz-Date=20260808T153027Z&X-Amz-Expires=7200&X-Amz-Signature=deadbeef&X-Amz-SignedHeaders=host'

function makeImage(overrides: Partial<GalleryImage> = {}): GalleryImage {
  return {
    id: '22',
    url: BACKSTAGE_IMAGE_URL,
    alt: 'A wedding photograph',
    thumbnailUrl: `${BACKSTAGE_IMAGE_URL}?tier=thumbnail`,
    mediumUrl: `${BACKSTAGE_IMAGE_URL}?tier=medium`,
    largeUrl: `${BACKSTAGE_IMAGE_URL}?tier=large`,
    ...overrides,
  }
}

describe('applyDeliveryPath (AC-29.2.2.2 — tier swap)', () => {
  const images = [makeImage({ id: '22' }), makeImage({ id: '23', url: '/api/gallery/.../hero/23' })]
  const presignedMap: PresignedImageMap = {
    22: { largeUrl: PRESIGNED_URL, mediumUrl: `${PRESIGNED_URL}&tier=medium`, thumbnailUrl: `${PRESIGNED_URL}&tier=thumb` },
  }

  it("'backstage-proxy' returns the images array untouched, by reference", () => {
    const result = applyDeliveryPath(images, 'backstage-proxy', presignedMap)
    expect(result).toBe(images)
  })

  it("'presigned-r2' swaps every tier present in the map onto the matching image", () => {
    const [swapped] = applyDeliveryPath(images, 'presigned-r2', presignedMap)

    expect(swapped.largeUrl).toBe(PRESIGNED_URL)
    expect(swapped.mediumUrl).toBe(`${PRESIGNED_URL}&tier=medium`)
    expect(swapped.thumbnailUrl).toBe(`${PRESIGNED_URL}&tier=thumb`)
  })

  it("'presigned-r2' leaves non-swapped fields (id, alt, url) alone", () => {
    const [swapped] = applyDeliveryPath(images, 'presigned-r2', presignedMap)

    expect(swapped.id).toBe('22')
    expect(swapped.alt).toBe('A wedding photograph')
    expect(swapped.url).toBe(BACKSTAGE_IMAGE_URL)
  })

  it('a photo id absent from the map keeps its Backstage-proxied URLs rather than disappearing', () => {
    const [, untouched] = applyDeliveryPath(images, 'presigned-r2', presignedMap)

    expect(untouched.largeUrl).toBe(images[1].largeUrl)
    expect(untouched.mediumUrl).toBe(images[1].mediumUrl)
    expect(untouched.thumbnailUrl).toBe(images[1].thumbnailUrl)
  })

  it('a tier missing within a present map entry falls back to the original image field, not undefined', () => {
    const partialMap: PresignedImageMap = { 22: { largeUrl: PRESIGNED_URL } }
    const [swapped] = applyDeliveryPath(images, 'presigned-r2', partialMap)

    expect(swapped.largeUrl).toBe(PRESIGNED_URL)
    expect(swapped.mediumUrl).toBe(images[0].mediumUrl)
    expect(swapped.thumbnailUrl).toBe(images[0].thumbnailUrl)
  })

  it('defaults to an empty map when none is passed, degrading every image to untouched', () => {
    const result = applyDeliveryPath(images, 'presigned-r2')
    expect(result).toEqual(images)
  })
})

describe('redactSignedUrl (AC-29.2.2.2 — redaction)', () => {
  it('redacts X-Amz-Credential and X-Amz-Signature, keeping every other query param intact', () => {
    const redacted = redactSignedUrl(PRESIGNED_URL)
    const parsed = new URL(redacted)

    expect(parsed.searchParams.get('X-Amz-Credential')).toBe('REDACTED')
    expect(parsed.searchParams.get('X-Amz-Signature')).toBe('REDACTED')
    expect(parsed.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256')
    expect(parsed.searchParams.get('X-Amz-Expires')).toBe('7200')
    expect(parsed.hostname).toBe('example-account.r2.cloudflarestorage.com')
  })

  it('leaves a Backstage-proxied URL (no SigV4 params) completely unchanged', () => {
    expect(redactSignedUrl(BACKSTAGE_IMAGE_URL)).toBe(BACKSTAGE_IMAGE_URL)
  })

  it('returns an unparseable string as-is rather than throwing', () => {
    const malformed = 'not a url at all ?X-Amz-Credential=leaked'
    expect(redactSignedUrl(malformed)).toBe(malformed)
  })

  it('never leaves the literal access-key id or signature value in the output', () => {
    const redacted = redactSignedUrl(PRESIGNED_URL)
    expect(redacted).not.toContain('abcd1234')
    expect(redacted).not.toContain('deadbeef')
  })
})

describe('classifyObservedDeliveryPath / assertObservedDeliveryPath (AC-29.2.2.2 — mislabel refusal)', () => {
  it('classifies an all-R2 set of gallery URLs as presigned-r2', () => {
    expect(classifyObservedDeliveryPath([PRESIGNED_URL])).toBe('presigned-r2')
  })

  it('classifies an all-Backstage-route set of gallery URLs as backstage-proxy', () => {
    expect(classifyObservedDeliveryPath([BACKSTAGE_IMAGE_URL])).toBe('backstage-proxy')
  })

  it('excludes the Next.js image-optimizer endpoint (site logo) before classifying', () => {
    expect(classifyObservedDeliveryPath(['/_next/image?url=%2Flogo.svg', PRESIGNED_URL])).toBe('presigned-r2')
    expect(isGalleryImageUrl('/_next/image?url=%2Flogo.svg')).toBe(false)
  })

  it('returns null for an empty list, a mixed set, or a set matching neither mechanism', () => {
    expect(classifyObservedDeliveryPath([])).toBeNull()
    expect(classifyObservedDeliveryPath([PRESIGNED_URL, BACKSTAGE_IMAGE_URL])).toBeNull()
    expect(classifyObservedDeliveryPath(['https://example.com/unrelated.png'])).toBeNull()
  })

  it('assertObservedDeliveryPath is a no-op when the observed URLs back up the declared path', () => {
    expect(() => assertObservedDeliveryPath('backstage-proxy', [BACKSTAGE_IMAGE_URL])).not.toThrow()
    expect(() => assertObservedDeliveryPath('presigned-r2', [PRESIGNED_URL])).not.toThrow()
  })

  it('assertObservedDeliveryPath throws — the mislabel refusal — when declared and observed disagree', () => {
    expect(() => assertObservedDeliveryPath('presigned-r2', [BACKSTAGE_IMAGE_URL])).toThrow(
      /Refusing to write a report labeled "presigned-r2"/,
    )
    expect(() => assertObservedDeliveryPath('backstage-proxy', [PRESIGNED_URL])).toThrow(
      /Refusing to write a report labeled "backstage-proxy"/,
    )
  })

  it('assertObservedDeliveryPath throws on a mixed-path fetch rather than picking a side', () => {
    expect(() => assertObservedDeliveryPath('presigned-r2', [PRESIGNED_URL, BACKSTAGE_IMAGE_URL])).toThrow()
  })

  it("assertObservedDeliveryPath's error names an offending URL and the two services to check", () => {
    try {
      assertObservedDeliveryPath('presigned-r2', [BACKSTAGE_IMAGE_URL])
      throw new Error('expected assertObservedDeliveryPath to throw')
    } catch (error) {
      expect(String(error)).toContain(BACKSTAGE_IMAGE_URL)
      expect(String(error)).toContain('web-benchmark')
      expect(String(error)).toContain('lighthouse-benchmark')
    }
  })
})

describe('currentBenchmarkDeliveryPath / loadPresignedImageMap (AC-29.2.2.2 — env/map resolution)', () => {
  const ORIGINAL_ENV = process.env.BENCHMARK_DELIVERY_PATH
  const FIXTURE_MAP_PATH = path.join(
    process.cwd(),
    'src/__tests__/__fixtures__/us29-ac29.2.2.2-presigned-image-map.fixture.json',
  )

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) delete process.env.BENCHMARK_DELIVERY_PATH
    else process.env.BENCHMARK_DELIVERY_PATH = ORIGINAL_ENV
  })

  it("resolves 'presigned-r2' only for the exact string, defaulting everything else to 'backstage-proxy'", () => {
    process.env.BENCHMARK_DELIVERY_PATH = 'presigned-r2'
    expect(currentBenchmarkDeliveryPath()).toBe('presigned-r2')

    for (const value of [undefined, '', 'Presigned-R2', 'presigned_r2', 'backstage-proxy']) {
      if (value === undefined) delete process.env.BENCHMARK_DELIVERY_PATH
      else process.env.BENCHMARK_DELIVERY_PATH = value
      expect(currentBenchmarkDeliveryPath()).toBe('backstage-proxy')
    }
  })

  it('loads a real checked-in fixture map and parses its one entry', () => {
    const map = loadPresignedImageMap(FIXTURE_MAP_PATH)
    expect(map['22'].largeUrl).toContain('r2.cloudflarestorage.com')
  })

  it('degrades to an empty object for a missing file, unreadable path, or invalid JSON — never throws', () => {
    expect(loadPresignedImageMap(path.join(process.cwd(), 'does/not/exist.json'))).toEqual({})
  })

  it('degrades to an empty object for a JSON file that is not a plain object (e.g. an array)', () => {
    const arrayJsonPath = path.join(
      process.cwd(),
      'src/__tests__/__fixtures__/us29-ac29.2.2.2-presigned-image-map-invalid-shape.fixture.json',
    )
    expect(loadPresignedImageMap(arrayJsonPath)).toEqual({})
  })
})

describe('AC-29.2.2.2 — the switch is actually wired into every surface the AC names', () => {
  it('both benchmark pages resolve the selected path and apply it to the resolved images', () => {
    for (const page of ['benchmark-portfolio-gallery', 'benchmark-story-gallery']) {
      const src = readRepo(`src/app/(frontend)/dev/${page}/page.tsx`)

      expect(src).toMatch(/currentBenchmarkDeliveryPath\(\)/)
      expect(src).toMatch(/applyDeliveryPath\(/)
      // The map is only read for candidate 2 — candidate 1 must not touch the
      // filesystem at all, so a missing map can never affect the default path.
      expect(src).toMatch(/deliveryPath === 'presigned-r2' \? loadPresignedImageMap\(\) : \{\}/)
    }
  })

  it('run.ts labels the report with the declared path, asserts it, and redacts before writing', () => {
    const runScript = readRepo('scripts/benchmark/run.ts')

    expect(runScript).toMatch(/const DECLARED_DELIVERY_PATH = currentBenchmarkDeliveryPath\(\)/)
    expect(runScript).toMatch(/deliveryPath: DECLARED_DELIVERY_PATH/)
    expect(runScript).toMatch(/assertObservedDeliveryPath\(DECLARED_DELIVERY_PATH, observedGalleryImageUrls\(harness\)\)/)
    expect(runScript).toMatch(/redactSignedUrl\(image\.url\)/)

    // The refusal has to happen before the write, not after it — otherwise a
    // mislabelled report is on disk by the time the run fails. Compared over
    // comment-stripped source (us29-ac29.2.1's own convention): run.ts's
    // docblock names both symbols, so the raw text's first `fs.writeFileSync`
    // is prose, not the call.
    const code = stripComments(runScript)
    expect(code.indexOf('assertObservedDeliveryPath(')).toBeLessThan(code.indexOf('fs.writeFileSync'))
  })

  it("docker-compose.yml passes BENCHMARK_DELIVERY_PATH to both benchmark services and mounts the presign output", () => {
    const compose = readRepo('docker-compose.yml')
    const benchmarkBlock = compose.slice(compose.indexOf('web-benchmark:'), compose.indexOf('volumes:\n  pgdata:'))
    const webBlock = benchmarkBlock.slice(0, benchmarkBlock.indexOf('lighthouse-benchmark:'))
    const lighthouseBlock = benchmarkBlock.slice(benchmarkBlock.indexOf('lighthouse-benchmark:'))

    for (const block of [webBlock, lighthouseBlock]) {
      expect(block).toMatch(/BENCHMARK_DELIVERY_PATH: \$\{BENCHMARK_DELIVERY_PATH:-backstage-proxy\}/)
    }
    // Read-only: the container renders from the map, it never writes one.
    expect(webBlock).toMatch(/\.\/scripts\/benchmark\/presign-data:\/app\/scripts\/benchmark\/presign-data:ro/)
  })

  it('BACKSTAGE_STARTUP.md records the one command per path, and the presign prerequisite for candidate 2', () => {
    const doc = readRepo('BACKSTAGE_STARTUP.md')

    expect(doc).toContain('BENCHMARK_DELIVERY_PATH=backstage-proxy docker compose --profile benchmark run --rm lighthouse-benchmark')
    expect(doc).toContain('BENCHMARK_DELIVERY_PATH=presigned-r2 docker compose --profile benchmark run --rm lighthouse-benchmark')
    expect(doc).toContain('scripts/benchmark/presign-r2-urls.sh')
  })

  it('presign-r2-urls.sh presigns every tier the rendered srcSet can request, not just hero', () => {
    const script = readRepo('scripts/benchmark/presign-r2-urls.sh')

    // A hero-only map leaves the 256w/384w srcSet candidates on the Backstage,
    // which classifyObservedDeliveryPath reports as a mixed page (null) and
    // run.ts then refuses to write — so candidate 2 could not be measured at all.
    expect(script).toMatch(/thumbnail_path/)
    expect(script).toMatch(/preview_path/)
    expect(script).toMatch(/hero_path/)
    expect(script).toMatch(/entry\.thumbnailUrl = await storage\.signedUrl/)
    expect(script).toMatch(/entry\.mediumUrl = await storage\.signedUrl/)
    expect(script).toMatch(/entry\.largeUrl = await storage\.signedUrl/)
  })
})

describe('AC-29.2.2.2 — credential hygiene and the two saved fetch transcripts', () => {
  const UNREDACTED_SIGV4 = /X-Amz-(?:Credential|Signature)=(?!REDACTED)/

  it('the generated presign map is gitignored, untracked, and absent from the working tree', () => {
    expect(readRepo('.gitignore')).toMatch(/^scripts\/benchmark\/presign-data\/\*\.json$/m)
    expect(repoExists(PRESIGN_MAP_PATH)).toBe(false)

    // The file committed at a29a33a carried a live X-Amz-Credential; it must be
    // out of the index, not merely deleted locally on one machine.
    const tracked = execFileSync('git', ['ls-files', 'scripts/benchmark/presign-data/'], {
      cwd: root,
      encoding: 'utf8',
    })
    expect(tracked).not.toContain('presigned-image-map.json')
    // .gitkeep stays tracked so the compose bind-mount has a directory to land on.
    expect(tracked).toContain('.gitkeep')
  })

  it('both delivery paths have a saved, passing fetch transcript', () => {
    for (const deliveryPath of ['backstage-proxy', 'presigned-r2']) {
      const transcript = JSON.parse(readRepo(`${PROOF_DIR}/${deliveryPath}-proof.json`))

      expect(transcript.acceptanceCriterion).toBe('29.2.2.2')
      expect(transcript.deliveryPath).toBe(deliveryPath)
      expect(transcript.passed).toBe(true)
      expect(transcript.pages.map((page: { path: string }) => page.path).sort()).toEqual([
        '/dev/benchmark-portfolio-gallery',
        '/dev/benchmark-story-gallery',
      ])

      for (const page of transcript.pages) {
        expect(page.galleryImageCount).toBeGreaterThan(0)
        expect(page.images).toHaveLength(page.galleryImageCount)
        for (const image of page.images) {
          expect(image.matchesDeclaredPath).toBe(true)
          expect(image.httpStatus).toBe(200)
          expect(image.contentType).toMatch(/^image\//)
          // 83 is the byte length of Express's `{"message":"Route not found"}`
          // body — the non-image AC-29.2.2.1's withdrawn runs recorded as a
          // successful image fetch.
          expect(image.byteLength).toBeGreaterThan(83)
        }
        expect(repoExists(`${PROOF_DIR}/${page.savedHtml}`)).toBe(true)
      }
    }
  })

  it("the presigned-r2 transcript's URLs really are R2, and the backstage-proxy one's really are the page origin", () => {
    const presigned = JSON.parse(readRepo(`${PROOF_DIR}/presigned-r2-proof.json`))
    const proxied = JSON.parse(readRepo(`${PROOF_DIR}/backstage-proxy-proof.json`))
    const urlsOf = (t: { pages: { images: { url: string }[] }[] }) =>
      t.pages.flatMap((page) => page.images.map((image) => image.url))

    expect(urlsOf(presigned).length).toBeGreaterThan(0)
    for (const url of urlsOf(presigned)) expect(new URL(url).hostname).toMatch(/\.r2\.cloudflarestorage\.com$/)

    expect(urlsOf(proxied).length).toBeGreaterThan(0)
    for (const url of urlsOf(proxied)) expect(url.startsWith('/api/gallery/')).toBe(true)
  })

  it('no committed transcript or saved HTML carries an unredacted X-Amz-Credential or X-Amz-Signature', () => {
    const files = fs
      .readdirSync(path.join(root, PROOF_DIR))
      .map((name) => `${PROOF_DIR}/${name}`)

    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      expect(readRepo(file)).not.toMatch(UNREDACTED_SIGV4)
    }
  })
})
