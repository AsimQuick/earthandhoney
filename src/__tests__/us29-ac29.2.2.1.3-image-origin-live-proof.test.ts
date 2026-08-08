/**
 * ---
 * file: src/__tests__/us29-ac29.2.2.1.3-image-origin-live-proof.test.ts
 * project: earthandhoney
 * purpose: Verify AC-29.2.2.1.3 — the origin fix is proven live, without
 *          Lighthouse: real image bytes are shown landing from the page
 *          origin, per gallery image, on both AC-29.1.1 benchmark routes.
 *          Two things are verified statically (no browser, no Docker, no
 *          network): (1) the proof script's shape — it filters to Backstage
 *          gallery `<img>` srcs only (so the shared site header's logo
 *          cannot pass), fails anything that is not `200` and `image/*` and
 *          more than 83 bytes, invokes no Lighthouse and produces no report
 *          metric; and (2) the committed transcript it produced — every
 *          gallery image on both pages recorded at `200`, `image/*` and
 *          well over the 83-byte 404 body the withdrawn AC-29.2.2.1.1 runs
 *          measured. The live fetch itself — the actual HTTP round trips
 *          against a running `web-benchmark` — is not repeatable inside a
 *          plain `jest` run (no Docker-in-Docker here); that is the
 *          committed transcript's job, mirroring
 *          us29-ac29.1.3-benchmark-docker-harness.test.ts's split between
 *          static wiring checks and committed evidence checks.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.2.2.1.3
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const readRaw = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

// Same convention the sibling AC-29.2.2.1.2 suite uses: a "runs no X"
// assertion must not be satisfiable by a docblock comment that merely
// quotes X in prose while explaining what the script deliberately excludes.
// Every comment in this script is a whole-line "# ..." comment (docblock
// header, inline explanations above a statement) — none are trailing
// end-of-line comments after code — so dropping whole comment lines is
// sufficient here.
const stripBashComments = (src: string) =>
  src
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n')
const read = (rel: string) => readRaw(rel)
const readExecutable = (rel: string) => stripBashComments(readRaw(rel))

const SCRIPT_FILE = 'scripts/ac29.2.2.1-benchmark-image-origin-proof.sh'
const RESULTS_DIR = 'scripts/benchmark/results/ac29.2.2.1-image-origin-proof'
const TRANSCRIPT_FILE = `${RESULTS_DIR}/image-origin-proof.json`
const BENCHMARK_ROUTES = ['/dev/benchmark-portfolio-gallery', '/dev/benchmark-story-gallery']

describe('AC-29.2.2.1.3: the proof script fetches real image bytes, no Lighthouse involved', () => {
  const script = read(SCRIPT_FILE)

  it('is executable', () => {
    const mode = fs.statSync(path.join(root, SCRIPT_FILE)).mode
    // eslint-disable-next-line no-bitwise -- checking the owner-execute bit is the point of this assertion
    expect(mode & 0o100).not.toBe(0)
  })

  it('counts only Backstage gallery <img> srcs — the shared site header logo cannot pass', () => {
    expect(script).toContain("grep '/api/gallery/'")
    expect(script).toMatch(/<img\[\^>\]\*src="\[\^"\]\*"/)
  })

  it('fails anything that is not HTTP 200, image/*, and more than 83 bytes', () => {
    expect(script).toMatch(/image_http_code"\s*!=\s*"200"/)
    expect(script).toMatch(/grep -qi '\^image\/'/)
    expect(script).toMatch(/byte_length"\s*-le\s*83/)
  })

  it('fetches both AC-29.1.1 benchmark routes', () => {
    for (const routePath of BENCHMARK_ROUTES) {
      expect(script).toContain(`"${routePath}"`)
    }
  })

  it('invokes no Lighthouse and produces no report metric (AC-29.2.2.3 is out of bounds)', () => {
    const executable = readExecutable(SCRIPT_FILE)
    expect(executable).not.toMatch(/lighthouse/i)
    expect(executable).not.toMatch(/performanceScore|lcpMs|transferBytes|imageRequestCount/)
  })

  it('does not wire delivery-path switching (AC-29.2.2.2 is out of bounds)', () => {
    expect(readExecutable(SCRIPT_FILE)).not.toContain('BENCHMARK_DELIVERY_PATH')
  })

  it('saves per-image URL, HTTP status, content type and byte length to a transcript under scripts/benchmark/results/', () => {
    expect(script).toContain(RESULTS_DIR)
    expect(script).toMatch(/\\"url\\":/)
    expect(script).toMatch(/\\"httpStatus\\":/)
    expect(script).toMatch(/\\"contentType\\":/)
    expect(script).toMatch(/\\"byteLength\\":/)
  })

  it('does not crash under set -e/pipefail when a page renders zero gallery images', () => {
    // A bare `srcs="$(... | grep '/api/gallery/' | ...)"` fails under
    // `set -o pipefail` whenever that grep matches nothing, which — because
    // this is a plain assignment, not an if/while condition — would trip
    // `set -e` and abort before the script's own explicit
    // `if [ -z "$srcs" ]` "FAIL: rendered no gallery <img> at all" handling
    // ever runs. The assignment must neutralise that with `|| true` (or
    // equivalent) so the graceful failure path is reachable.
    const assignmentLine = script.split('\n').find((line) => line.includes('srcs="$('))
    expect(assignmentLine).toBeDefined()
    expect(assignmentLine).toMatch(/\|\|\s*true\)"$/)
  })
})

describe('AC-29.2.2.1.3: the committed transcript records real image bytes for every gallery image on both pages', () => {
  it('the transcript file is committed under scripts/benchmark/results/', () => {
    expect(fs.existsSync(path.join(root, TRANSCRIPT_FILE))).toBe(true)
  })

  const transcript = JSON.parse(read(TRANSCRIPT_FILE)) as {
    story: string
    acceptanceCriterion: string
    pages: Array<{
      path: string
      galleryImageCount: number
      images: Array<{ url: string; httpStatus: number; contentType: string; byteLength: number }>
    }>
  }

  it('covers both AC-29.1.1 benchmark routes', () => {
    const recordedPaths = transcript.pages.map((page) => page.path).sort()
    expect(recordedPaths).toEqual([...BENCHMARK_ROUTES].sort())
  })

  it('records at least one gallery image per page (a non-vacuous check)', () => {
    for (const page of transcript.pages) {
      expect(page.images.length).toBeGreaterThan(0)
      expect(page.galleryImageCount).toBe(page.images.length)
    }
  })

  it('every recorded image is a Backstage gallery URL, HTTP 200, image/*, and well over the 83-byte 404 body', () => {
    const allImages = transcript.pages.flatMap((page) => page.images)
    expect(allImages.length).toBeGreaterThan(0)

    for (const image of allImages) {
      expect(image.url).toMatch(/^\/api\/gallery\//)
      expect(image.httpStatus).toBe(200)
      expect(image.contentType).toMatch(/^image\//)
      expect(image.byteLength).toBeGreaterThan(83)
    }
  })

  it('saved the fetched HTML for both routes alongside the transcript, mirroring the ac29.1.1-render-proof/ convention', () => {
    for (const file of ['benchmark-portfolio-gallery.html', 'benchmark-story-gallery.html']) {
      expect(fs.existsSync(path.join(root, RESULTS_DIR, file))).toBe(true)
    }
  })
})

describe('AC-29.2.2.1.3: the single command is documented in BACKSTAGE_STARTUP.md beside AC-29.1.3\'s', () => {
  it('names an image-origin proof section with the exact rebuild-and-run commands', () => {
    const runbook = read('BACKSTAGE_STARTUP.md')

    expect(runbook).toMatch(/##\s+Benchmark harness/)
    expect(runbook).toMatch(/Image-origin live proof/i)
    expect(runbook).toContain('docker compose --profile benchmark up -d --build --force-recreate web-benchmark')
    expect(runbook).toContain(`${SCRIPT_FILE}`)
  })
})
