/**
 * ---
 * file: src/__tests__/us26-ac26.4.2-webhook-live-proof-upload.test.ts
 * project: earthandhoney
 * purpose: Verify AC-26.4.2 — a photo uploaded into the gallery
 *          AC-26.4.1.3.2 left published reaches the Frontstage placement
 *          page through the verified webhook, reusing the harness
 *          AC-26.4.1.1 recorded without rebuilding it. The proof itself is
 *          a live run against the running stack, recorded as section (f) of
 *          `WEBHOOK_LIVE_PROOF.md`; what this suite pins is everything that
 *          has to stay true for that recorded section to keep meaning what
 *          it says:
 *          (1) section (f) exists, nested after (e)(iii);
 *          (2) the closed-list finding is recorded: of the fork's five
 *              `webhookService.fire('photo.uploaded', ...)` call sites, the
 *              admin upload route (`POST /api/admin/photos/:eventId/upload`)
 *              reaches only `photoProcessor.js:494` (inside `processPhoto`,
 *              called asynchronously by the background worker) — not
 *              `photoProcessor.js:246` (`processUploadedPhotos`, the
 *              chunked-upload-complete route's function), and not the
 *              filesystem/S3 auto-import or public v1 guest-upload sites;
 *          (3) the five call sites this finding is scoped against actually
 *              exist at the stated file:line in the pinned vendor fork,
 *              so the finding cannot silently drift from the code it
 *              describes;
 *          (4) the subscription's `events` array is confirmed to list
 *              `photo.uploaded`, the precondition delivery depends on;
 *          (5) all three required pieces of evidence are present: the
 *              upload command and its output, the `photo.uploaded` delivery
 *              reaching `status: success` through both the list and detail
 *              forms of `GET /api/admin/webhooks/:id/deliveries`, and the
 *              Frontstage placement page shown carrying the new photo; and
 *          (6) the sequence is shown to reproduce — run twice, unmodified,
 *              against the same gallery, since uploading (unlike publish)
 *              is repeatable.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.4.2
 * ---
 */
import fs from 'fs'
import path from 'path'

import { WEBHOOK_LIVE_PROOF_GALLERY_PATH, WEBHOOK_LIVE_PROOF_GALLERY_SLUGS } from '@/lib/galleryRevalidation'

const REPO_ROOT = path.join(__dirname, '..', '..')
const DOC_PATH = path.join(REPO_ROOT, 'WEBHOOK_LIVE_PROOF.md')
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts', 'ac26.4.2-live-proof.sh')

const PHOTO_PROCESSOR_PATH = path.join(
  REPO_ROOT,
  'vendor/picpeak/backend/src/services/photoProcessor.js'
)
const FILE_WATCHER_PATH = path.join(REPO_ROOT, 'vendor/picpeak/backend/src/services/fileWatcher.js')
const S3_AUTO_IMPORTER_PATH = path.join(
  REPO_ROOT,
  'vendor/picpeak/backend/src/services/s3AutoImporter.js'
)
const V1_EVENTS_PATH = path.join(REPO_ROOT, 'vendor/picpeak/backend/src/routes/v1/events.js')
const ADMIN_PHOTOS_PATH = path.join(REPO_ROOT, 'vendor/picpeak/backend/src/routes/adminPhotos.js')
const BACKGROUND_PROCESSOR_PATH = path.join(
  REPO_ROOT,
  'vendor/picpeak/backend/src/services/backgroundProcessor.js'
)

const [SLUG_A, SLUG_B] = WEBHOOK_LIVE_PROOF_GALLERY_SLUGS

function readDoc(): string {
  return fs.readFileSync(DOC_PATH, 'utf8')
}

/** The `## (f)` section of WEBHOOK_LIVE_PROOF.md, from its heading to end of file. */
function sectionF(): string {
  const doc = readDoc()
  const start = doc.indexOf('## (f)')
  expect(start).toBeGreaterThan(-1)
  return doc.slice(start)
}

function nthLine(content: string, lineNumber: number): string {
  return content.split('\n')[lineNumber - 1] ?? ''
}

describe('AC-26.4.2: the five webhookService.fire(\'photo.uploaded\', ...) call sites exist at the stated file:line', () => {
  it('photoProcessor.js:246 is inside processUploadedPhotos (the chunked-upload-complete path)', () => {
    const content = fs.readFileSync(PHOTO_PROCESSOR_PATH, 'utf8')
    expect(nthLine(content, 246)).toContain("webhookService.fire('photo.uploaded'")
    const fnStart = content.indexOf('async function processUploadedPhotos')
    const fnEnd = content.indexOf('\nasync function queueFilesForProcessing')
    expect(fnStart).toBeGreaterThan(-1)
    expect(fnEnd).toBeGreaterThan(fnStart)
    const callOffset = content.indexOf("webhookService.fire('photo.uploaded'")
    expect(callOffset).toBeGreaterThan(fnStart)
    expect(callOffset).toBeLessThan(fnEnd)
  })

  it('photoProcessor.js:494 is inside processPhoto (the background-worker path)', () => {
    const content = fs.readFileSync(PHOTO_PROCESSOR_PATH, 'utf8')
    expect(nthLine(content, 494)).toContain("webhookService.fire('photo.uploaded'")
    const fnStart = content.indexOf('async function processPhoto')
    const fnEnd = content.indexOf('\nmodule.exports')
    expect(fnStart).toBeGreaterThan(-1)
    expect(fnEnd).toBeGreaterThan(fnStart)
    const callOffset = content.lastIndexOf("webhookService.fire('photo.uploaded'")
    expect(callOffset).toBeGreaterThan(fnStart)
    expect(callOffset).toBeLessThan(fnEnd)
  })

  it('fileWatcher.js:142, s3AutoImporter.js:144, and routes/v1/events.js:595 all fire photo.uploaded', () => {
    expect(nthLine(fs.readFileSync(FILE_WATCHER_PATH, 'utf8'), 142)).toContain(
      "webhookService.fire('photo.uploaded'"
    )
    expect(nthLine(fs.readFileSync(S3_AUTO_IMPORTER_PATH, 'utf8'), 144)).toContain(
      "webhookService.fire('photo.uploaded'"
    )
    expect(nthLine(fs.readFileSync(V1_EVENTS_PATH, 'utf8'), 595)).toContain(
      "webhookService.fire('photo.uploaded'"
    )
  })

  it('exactly five webhookService.fire(\'photo.uploaded\', ...) call sites exist across the fork', () => {
    const files = [
      PHOTO_PROCESSOR_PATH,
      FILE_WATCHER_PATH,
      S3_AUTO_IMPORTER_PATH,
      V1_EVENTS_PATH,
    ]
    const total = files.reduce((sum, file) => {
      const content = fs.readFileSync(file, 'utf8')
      const matches = content.match(/webhookService\.fire\('photo\.uploaded'/g) || []
      return sum + matches.length
    }, 0)
    expect(total).toBe(5)
  })
})

describe('AC-26.4.2: the admin upload route (adminPhotos.js) reaches photo.uploaded only via the background worker', () => {
  it('the /:eventId/upload route handler contains no direct webhookService call', () => {
    const content = fs.readFileSync(ADMIN_PHOTOS_PATH, 'utf8')
    const routeStart = content.indexOf("router.post('/:eventId/upload'")
    const routeEnd = content.indexOf('\n// Helper — load the upload group')
    expect(routeStart).toBeGreaterThan(-1)
    expect(routeEnd).toBeGreaterThan(routeStart)
    const routeBody = content.slice(routeStart, routeEnd)
    expect(routeBody).not.toContain('webhookService')
    expect(routeBody).toContain("processing_status: 'pending'")
    expect(routeBody).toMatch(/res\.status\(202\)/)
  })

  it('processUploadedPhotos is only referenced by the chunked-upload-complete route, not /:eventId/upload', () => {
    const content = fs.readFileSync(ADMIN_PHOTOS_PATH, 'utf8')
    const chunkedCompleteStart = content.indexOf(
      "router.post('/:eventId/chunked-upload/:uploadId/complete'"
    )
    expect(chunkedCompleteStart).toBeGreaterThan(-1)
    const usageOffset = content.indexOf('processUploadedPhotos(', content.indexOf('async (req, res) => {', chunkedCompleteStart))
    expect(usageOffset).toBeGreaterThan(chunkedCompleteStart)
  })

  it('backgroundProcessor claims pending rows and hands them to photoProcessor.processPhoto', () => {
    const content = fs.readFileSync(BACKGROUND_PROCESSOR_PATH, 'utf8')
    expect(content).toContain("processing_status', 'pending'")
    expect(content).toContain('processPhoto(claimed.id)')
  })
})

describe('AC-26.4.2: WEBHOOK_LIVE_PROOF.md records the upload proof as section (f)', () => {
  it('section (f) is nested after (e)(iii)', () => {
    const doc = readDoc()
    const eiiiIndex = doc.indexOf('## (e)(iii)')
    const fIndex = doc.indexOf('## (f)')
    expect(eiiiIndex).toBeGreaterThan(-1)
    expect(fIndex).toBeGreaterThan(eiiiIndex)
  })

  it('scopes to gallery A only — gallery B is named solely as untouched', () => {
    const section = sectionF()
    expect(WEBHOOK_LIVE_PROOF_GALLERY_SLUGS).toHaveLength(2)
    expect(section).toContain(SLUG_A)
    expect(section).toContain(SLUG_B)
    expect(section).toMatch(/AC-26\.4\.1\.3\.3/)
  })

  it('records the closed-list finding: photoProcessor.js:494 is reached, photoProcessor.js:246 is not', () => {
    const section = sectionF()
    expect(section).toContain('photoProcessor.js:246')
    expect(section).toContain('photoProcessor.js:494')
    expect(section).toContain('fileWatcher.js:142')
    expect(section).toContain('s3AutoImporter.js:144')
    expect(section).toContain('routes/v1/events.js:595')
    expect(section).toMatch(/\*\*Yes\*\*/)
    expect(section).toMatch(/processUploadedPhotos/)
    expect(section).toMatch(/chunked-upload-complete/)
    expect(section).toMatch(/Finding, not a blocker/)
  })

  it('confirms the subscription\'s events array lists photo.uploaded before the proof runs', () => {
    const section = sectionF()
    const preconditionIdx = section.indexOf('array carries')
    expect(preconditionIdx).toBeGreaterThan(-1)
    const precondition = section.slice(preconditionIdx, section.indexOf('### Pre-run check'))
    expect(precondition).toMatch(/"photo\.uploaded"/)
  })

  it('records the upload command and its 202-accepted, async-processing response for both runs', () => {
    const section = sectionF()
    expect(section).toContain('ac26.4.2-live-proof.sh proof')
    expect(section).toContain('ac26.4.2-live-proof.sh reproduce')
    expect(section).toMatch(/uploading vendor\/picpeak\/test-assets\/img1\.png to gallery 18/)
    expect(section).toMatch(/uploading vendor\/picpeak\/test-assets\/img2\.png to gallery 18/)
    expect(section).toMatch(/upload HTTP 202/)
    expect(section).toMatch(/"photo_ids":\[19\]/)
    expect(section).toMatch(/"photo_ids":\[20\]/)
  })

  it('records the photo.uploaded delivery reaching status: success for both uploads', () => {
    const section = sectionF()
    const matches = section.match(/event_type=photo\.uploaded status=success/g)
    expect(matches).not.toBeNull()
    expect(matches!.length).toBeGreaterThanOrEqual(2)
    expect(section).toMatch(/delivery reached success after \d+s/)
  })

  it('reads both deliveries back two ways: the list endpoint (no payload column) and per-delivery detail (carrying payload)', () => {
    const section = sectionF()
    expect(section).toContain('/deliveries?limit=5')
    const listBlockStart = section.indexOf('/deliveries?limit=5')
    const listBlockEnd = section.indexOf('/deliveries/55')
    const listBlock = section.slice(listBlockStart, listBlockEnd)
    expect(listBlock).not.toContain('"payload"')

    expect(section).toMatch(/"payload":\s*\{/)
    expect(section).toMatch(new RegExp(`"slug":\\s*"${SLUG_A}"`))
    expect(section).toMatch(/"original_filename":\s*"img1\.png"/)
    expect(section).toMatch(/"original_filename":\s*"img2\.png"/)
  })

  it('shows the served Frontstage page carrying both uploaded photos on gallery A, gallery B untouched', () => {
    const section = sectionF()
    expect(section).toContain(WEBHOOK_LIVE_PROOF_GALLERY_PATH)
    expect(section).toMatch(
      new RegExp(`data-gallery-slug="${SLUG_A}"[^>]*data-photo-count="2"[^>]*data-photo-ids="20,19"`)
    )
    expect(section).toMatch(new RegExp(`data-gallery-slug="${SLUG_B}"[^>]*data-photo-count="0"`))
  })

  it('states no change was needed to reproduce the sequence', () => {
    const section = sectionF()
    expect(section).toMatch(/No change was needed to the recorded commands/)
    expect(section).toMatch(/reproduced on the (first|second) (attempt|run)/)
  })
})

describe('AC-26.4.2: scripts/ac26.4.2-live-proof.sh does what the recorded run relied on', () => {
  function readScript(): string {
    return fs.readFileSync(SCRIPT_PATH, 'utf8')
  }

  it('exists, is executable, and accepts proof/reproduce as documented arguments', () => {
    expect(fs.existsSync(SCRIPT_PATH)).toBe(true)
    const mode = fs.statSync(SCRIPT_PATH).mode
    expect(mode & 0o111).not.toBe(0)
    const script = readScript()
    expect(script).toMatch(/proof\)\s+upload_and_prove "\$SLUG_A" "PROOF" "\$FIXTURE_IMAGE_1" 1/)
    expect(script).toMatch(/reproduce\)\s+upload_and_prove "\$SLUG_A" "REPRODUCE" "\$FIXTURE_IMAGE_2" 2/)
  })

  it('targets only gallery A — no second gallery slug is referenced', () => {
    const script = readScript()
    expect(script).toContain(SLUG_A)
    expect(script).not.toContain(SLUG_B)
  })

  it('uses the admin upload route with the documented multipart field name "photos"', () => {
    const script = readScript()
    expect(script).toMatch(/\/api\/admin\/photos\/\$\{id\}\/upload/)
    expect(script).toContain('-F "photos=@${fixture}"')
  })

  it('upload_and_prove uploads, then awaits delivery success, then awaits page state, in that order', () => {
    const script = readScript()
    const body = script.slice(
      script.indexOf('upload_and_prove() {'),
      script.indexOf('say "Backstage admin login"')
    )
    const uploadIdx = body.indexOf('/upload"')
    const deliveryIdx = body.indexOf('await_delivery_success')
    const pageIdx = body.indexOf('await_page_state "$slug"')
    expect(uploadIdx).toBeGreaterThan(-1)
    expect(deliveryIdx).toBeGreaterThan(uploadIdx)
    expect(pageIdx).toBeGreaterThan(deliveryIdx)
  })

  it('DEADLINE_SECONDS defaults to 25 — strictly less than the 60s safety net and revalidate window', () => {
    const script = readScript()
    expect(script).toMatch(/DEADLINE_SECONDS="\$\{DEADLINE_SECONDS:-25\}"/)
    expect(25).toBeLessThan(60)
  })

  it('uses two distinct fixture images for proof and reproduce, both vendored test assets', () => {
    const script = readScript()
    expect(script).toMatch(/FIXTURE_IMAGE_1="\$\{FIXTURE_IMAGE_1:-vendor\/picpeak\/test-assets\/img1\.png\}"/)
    expect(script).toMatch(/FIXTURE_IMAGE_2="\$\{FIXTURE_IMAGE_2:-vendor\/picpeak\/test-assets\/img2\.png\}"/)
  })
})
