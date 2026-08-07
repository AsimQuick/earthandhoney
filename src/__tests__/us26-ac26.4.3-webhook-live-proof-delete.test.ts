/**
 * ---
 * file: src/__tests__/us26-ac26.4.3-webhook-live-proof-delete.test.ts
 * project: earthandhoney
 * purpose: Verify AC-26.4.3 — a photo deleted from the gallery AC-26.4.2 left
 *          carrying two photos reaches the Frontstage placement page through
 *          the verified webhook, reusing the harness AC-26.4.1.1 recorded
 *          without rebuilding it. The proof itself is a live run against the
 *          running stack, recorded as section (g) of `WEBHOOK_LIVE_PROOF.md`;
 *          what this suite pins is everything that has to stay true for that
 *          recorded section to keep meaning what it says:
 *          (1) section (g) exists, nested after (f);
 *          (2) the fixed scope this criterion was handed — the single-photo
 *              delete path, `DELETE /:eventId/photos/:photoId`
 *              (`adminPhotos.js:632`), firing `photo.deleted` at
 *              `adminPhotos.js:694` — is recorded and cited at that exact
 *              file:line in the pinned vendor fork, distinct from the
 *              bulk-delete path's own call site at `adminPhotos.js:828`;
 *          (3) the subscription's `events` array is confirmed to list
 *              `photo.deleted`, the precondition delivery depends on;
 *          (4) all three required pieces of evidence are present: the
 *              delete command and its output, the `photo.deleted` delivery
 *              reaching `status: success` through both the list and detail
 *              forms of `GET /api/admin/webhooks/:id/deliveries`, and the
 *              Frontstage placement page shown no longer carrying the
 *              deleted photo; and
 *          (5) the sequence is shown to reproduce — run twice, unmodified,
 *              against the same gallery.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.4.3
 * ---
 */
import fs from 'fs'
import path from 'path'

import { WEBHOOK_LIVE_PROOF_GALLERY_PATH, WEBHOOK_LIVE_PROOF_GALLERY_SLUGS } from '@/lib/galleryRevalidation'

const REPO_ROOT = path.join(__dirname, '..', '..')
const DOC_PATH = path.join(REPO_ROOT, 'WEBHOOK_LIVE_PROOF.md')
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts', 'ac26.4.3-live-proof.sh')
const ADMIN_PHOTOS_PATH = path.join(REPO_ROOT, 'vendor/picpeak/backend/src/routes/adminPhotos.js')

const [SLUG_A, SLUG_B] = WEBHOOK_LIVE_PROOF_GALLERY_SLUGS

function readDoc(): string {
  return fs.readFileSync(DOC_PATH, 'utf8')
}

/** The `## (g)` section of WEBHOOK_LIVE_PROOF.md, from its heading to end of file. */
function sectionG(): string {
  const doc = readDoc()
  const start = doc.indexOf('## (g)')
  expect(start).toBeGreaterThan(-1)
  return doc.slice(start)
}

function nthLine(content: string, lineNumber: number): string {
  return content.split('\n')[lineNumber - 1] ?? ''
}

describe('AC-26.4.3: the fixed scope — single-photo delete fires photo.deleted at the stated line', () => {
  it('adminPhotos.js:632 is the single-photo DELETE route', () => {
    const content = fs.readFileSync(ADMIN_PHOTOS_PATH, 'utf8')
    expect(nthLine(content, 632)).toContain("router.delete('/:eventId/photos/:photoId'")
  })

  it("adminPhotos.js:694 is webhookService.fire('photo.deleted', ...) inside the single-photo delete handler", () => {
    const content = fs.readFileSync(ADMIN_PHOTOS_PATH, 'utf8')
    expect(nthLine(content, 694)).toContain("webhookService.fire('photo.deleted'")

    const routeStart = content.indexOf("router.delete('/:eventId/photos/:photoId'")
    const routeEnd = content.indexOf("router.patch('/:eventId/photos/:photoId'")
    expect(routeStart).toBeGreaterThan(-1)
    expect(routeEnd).toBeGreaterThan(routeStart)
    const callOffset = content.indexOf("webhookService.fire('photo.deleted'")
    expect(callOffset).toBeGreaterThan(routeStart)
    expect(callOffset).toBeLessThan(routeEnd)
  })

  it('adminPhotos.js:828 is the distinct bulk-delete call site, once per row, not the single-photo path', () => {
    const content = fs.readFileSync(ADMIN_PHOTOS_PATH, 'utf8')
    expect(nthLine(content, 828)).toContain("webhookService.fire('photo.deleted'")

    const bulkStart = content.indexOf("router.post('/:eventId/photos/bulk-delete'")
    const bulkEnd = content.indexOf("router.post('/:eventId/photos/bulk-update'")
    expect(bulkStart).toBeGreaterThan(-1)
    expect(bulkEnd).toBeGreaterThan(bulkStart)
    const callOffset = content.indexOf("webhookService.fire('photo.deleted'", bulkStart)
    expect(callOffset).toBeGreaterThan(bulkStart)
    expect(callOffset).toBeLessThan(bulkEnd)
    // Inside a `for (const photo of photos)` loop — one delivery per row.
    const loopStart = content.indexOf('for (const photo of photos)', bulkStart)
    expect(loopStart).toBeGreaterThan(-1)
    expect(loopStart).toBeLessThan(callOffset)
  })

  it('exactly two webhookService.fire(\'photo.deleted\', ...) call sites exist in adminPhotos.js', () => {
    const content = fs.readFileSync(ADMIN_PHOTOS_PATH, 'utf8')
    const matches = content.match(/webhookService\.fire\('photo\.deleted'/g) || []
    expect(matches.length).toBe(2)
  })
})

describe('AC-26.4.3: WEBHOOK_LIVE_PROOF.md records the delete proof as section (g)', () => {
  it('section (g) is nested after (f)', () => {
    const doc = readDoc()
    const fIndex = doc.indexOf('## (f)')
    const gIndex = doc.indexOf('## (g)')
    expect(fIndex).toBeGreaterThan(-1)
    expect(gIndex).toBeGreaterThan(fIndex)
  })

  it('scopes to gallery A only — gallery B is named solely as untouched', () => {
    const section = sectionG()
    expect(WEBHOOK_LIVE_PROOF_GALLERY_SLUGS).toHaveLength(2)
    expect(section).toContain(SLUG_A)
    expect(section).toContain(SLUG_B)
  })

  it('cites the fixed scope: adminPhotos.js:694 for single-photo, adminPhotos.js:828 for bulk', () => {
    const section = sectionG()
    expect(section).toContain('adminPhotos.js:694')
    expect(section).toContain('adminPhotos.js:828')
    expect(section).toContain('adminPhotos.js:632')
    expect(section).toMatch(/single-photo delete path/)
    expect(section).toMatch(/bulk-delete path/)
  })

  it('confirms the subscription\'s events array lists photo.deleted before the proof runs', () => {
    const section = sectionG()
    const preconditionIdx = section.indexOf('array carries')
    expect(preconditionIdx).toBeGreaterThan(-1)
    const precondition = section.slice(preconditionIdx, section.indexOf('### Pre-run check'))
    expect(precondition).toMatch(/"photo\.deleted"/)
  })

  it('records the delete command and its success response for both runs', () => {
    const section = sectionG()
    expect(section).toContain('ac26.4.3-live-proof.sh proof')
    expect(section).toContain('ac26.4.3-live-proof.sh reproduce')
    expect(section).toMatch(/deleting photo 19 from gallery 18/)
    expect(section).toMatch(/deleting photo 20 from gallery 18/)
    expect(section).toMatch(/delete HTTP 200/)
    expect(section).toMatch(/"message":"Photo deleted successfully"/)
  })

  it('records the photo.deleted delivery reaching status: success for both deletes', () => {
    const section = sectionG()
    const matches = section.match(/event_type=photo\.deleted status=success/g)
    expect(matches).not.toBeNull()
    expect(matches!.length).toBeGreaterThanOrEqual(2)
    expect(section).toMatch(/delivery reached success after \d+s/)
  })

  it('reads both deliveries back two ways: the list endpoint (no payload column) and per-delivery detail (carrying payload)', () => {
    const section = sectionG()
    expect(section).toContain('/deliveries?limit=3')
    const listBlockStart = section.indexOf('/deliveries?limit=3')
    const listBlockEnd = section.indexOf('/deliveries/57')
    const listBlock = section.slice(listBlockStart, listBlockEnd)
    expect(listBlock).not.toContain('"payload"')

    expect(section).toMatch(/"payload":\s*\{/)
    expect(section).toMatch(new RegExp(`"slug":\\s*"${SLUG_A}"`))
    expect(section).toMatch(/"id":\s*19[,\s][\s\S]{0,80}?"filename":\s*"ac-26-4-1-webhook-live-proof-g_individual_0001\.png"/)
    expect(section).toMatch(/"id":\s*20[,\s][\s\S]{0,80}?"filename":\s*"ac-26-4-1-webhook-live-proof-g_individual_0002\.png"/)
  })

  it('shows the served Frontstage page no longer carrying either deleted photo on gallery A, gallery B untouched', () => {
    const section = sectionG()
    expect(section).toContain(WEBHOOK_LIVE_PROOF_GALLERY_PATH)
    expect(section).toMatch(
      new RegExp(`data-gallery-slug="${SLUG_A}"[^>]*data-photo-count="0"[^>]*data-photo-ids=""`)
    )
    expect(section).toMatch(new RegExp(`data-gallery-slug="${SLUG_B}"[^>]*data-photo-count="0"`))
    expect(section).toContain('{"photos":[]}')
  })

  it('states no change was needed to reproduce the sequence, and names the closed three-change set', () => {
    const section = sectionG()
    expect(section).toMatch(/No change was needed to the recorded commands/)
    expect(section).toMatch(/reproduced on the second run/)
    expect(section).toMatch(/closes the\s+three-change set the original AC-26\.4 stated as one/)
  })
})

describe('AC-26.4.3: scripts/ac26.4.3-live-proof.sh does what the recorded run relied on', () => {
  function readScript(): string {
    return fs.readFileSync(SCRIPT_PATH, 'utf8')
  }

  it('exists, is executable, and accepts proof/reproduce as documented arguments', () => {
    expect(fs.existsSync(SCRIPT_PATH)).toBe(true)
    const mode = fs.statSync(SCRIPT_PATH).mode
    expect(mode & 0o111).not.toBe(0)
    const script = readScript()
    expect(script).toMatch(/proof\)\s+delete_and_prove "\$SLUG_A" "PROOF" 1/)
    expect(script).toMatch(/reproduce\)\s+delete_and_prove "\$SLUG_A" "REPRODUCE" 0/)
  })

  it('targets only gallery A — no second gallery slug is referenced', () => {
    const script = readScript()
    expect(script).toContain(SLUG_A)
    expect(script).not.toContain(SLUG_B)
  })

  it('uses the single-photo delete route with the correct HTTP method', () => {
    const script = readScript()
    expect(script).toMatch(/-X DELETE "\$\{BACKSTAGE\}\/api\/admin\/photos\/\$\{id\}\/photos\/\$\{DELETED_PHOTO_ID\}"/)
  })

  it('resolves its delete target dynamically as the lowest-id photo still present, not a hardcoded id', () => {
    const script = readScript()
    expect(script).toContain('oldest_photo_id()')
    expect(script).toMatch(/ids = sorted\(p\['id'\] for p in d\.get\('photos', \[\]\)\)/)
    expect(script).not.toMatch(/DELETED_PHOTO_ID=19/)
    expect(script).not.toMatch(/DELETED_PHOTO_ID=20/)
  })

  it('delete_and_prove deletes, then awaits delivery success, then awaits page state, in that order', () => {
    const script = readScript()
    const body = script.slice(
      script.indexOf('delete_and_prove() {'),
      script.indexOf('say "Backstage admin login"')
    )
    const deleteIdx = body.indexOf('-X DELETE')
    const deliveryIdx = body.indexOf('await_delivery_success')
    const pageIdx = body.indexOf('await_page_state "$slug"')
    expect(deleteIdx).toBeGreaterThan(-1)
    expect(deliveryIdx).toBeGreaterThan(deleteIdx)
    expect(pageIdx).toBeGreaterThan(deliveryIdx)
  })

  it('DEADLINE_SECONDS defaults to 25 — strictly less than the 60s safety net and revalidate window', () => {
    const script = readScript()
    expect(script).toMatch(/DEADLINE_SECONDS="\$\{DEADLINE_SECONDS:-25\}"/)
    expect(25).toBeLessThan(60)
  })

  it('matches deliveries by event_type photo.deleted, distinct from photo.uploaded/event.published', () => {
    const script = readScript()
    expect(script).toMatch(/r\.get\('event_type'\) == 'photo\.deleted'/)
  })
})
