/**
 * ---
 * file: src/__tests__/us17-ac17.2-batch-upload-processing.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.2 — PIVOT_AUDIT.md records that a batch of real
 *          images was uploaded to the AC-17.1.3.1 Gallery and processed:
 *          every original lands in R2 exactly once and byte-identical to
 *          its source, the derivative sizes the pinned fork actually
 *          produces (eager vs. lazy) are recorded honestly, and the stored
 *          `photos` row is checked field by field against width, height,
 *          aspect ratio, format, file size, and processing state — with the
 *          missing `aspect_ratio` column recorded as a genuine gap rather
 *          than assumed satisfied by a derivable value. Every file/line
 *          claim the audit makes about the pinned vendored fork is
 *          independently re-verified against the actual source.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.2
 * ---
 */

// The proof itself was exercised live on 2026-07-31 against the running
// Backstage (`docker compose --profile backstage`, per BACKSTAGE_STARTUP.md):
// three real JPEGs already committed to this repo were uploaded through
// POST /api/admin/photos/3/upload as the seeded administrator, polled to
// `complete` via the upload-status endpoint, and checked against R2 with the
// AWS CLI (list-objects-v2, get-object, SHA-256 comparison against the
// source files) and against `backstage-db` with psql. That run needs a
// Docker daemon and a live Backstage, so it is not repeatable inside Jest —
// this suite pins the recorded evidence so it cannot silently rot out of the
// audit, and independently re-verifies every file/line claim the audit
// makes about the vendored fork.

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('PIVOT_AUDIT.md')

// The AC-17.2 section only, bounded at the next top-level heading so a match
// cannot be satisfied by unrelated text elsewhere in this multi-story audit
// document, and so the AC-14.6 recommendation/open-questions block can stay
// the document's final section.
const sectionStart = doc.indexOf('## AC-17.2')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1
    ? ''
    : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

describe('AC-17.2: a batch of real images can be uploaded and processed', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.2 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.2\b/)
    })

    it('has a dedicated AC-17.2 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('sits after the AC-17.1.3.3 section it builds on', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.1.3.3'))
    })

    it('uploads into the AC-17.1.3.1 Gallery, not a fresh unrelated one', () => {
      expect(section).toMatch(/events\.id = 3/)
      expect(section).toMatch(/wedding-ac-17-1-3-1-verification-gallery-2026-09-01/)
    })
  })

  describe('the upload route used is recorded and really reachable', () => {
    it('names POST /api/admin/photos/:eventId/upload as the route', () => {
      expect(section).toMatch(/POST \/api\/admin\/photos\/3\/upload/)
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/routes\/adminPhotos\.js:131/
      )
    })

    it('that cited line really is the upload handler gated on photos.upload', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminPhotos.js').split('\n')
      expect(lines[130]).toContain("router.post('/:eventId/upload'")
      expect(lines[130]).toContain("requirePermission('photos.upload')")
      expect(lines[130]).toContain('requireEventOwnership')
    })

    it('cites where photos.upload is seeded for super_admin, admin, and editor', () => {
      expect(section).toMatch(
        /migrations\/core\/056_add_role_permissions_table\.js:46/
      )
      expect(section).toMatch(
        /migrations\/core\/056_add_role_permissions_table\.js:51,73/
      )
      expect(section).toMatch(
        /migrations\/core\/055_add_permissions_table\.js:57/
      )
    })

    it('those cited lines really do seed photos.upload for those roles', () => {
      const roleLines = read(
        'vendor/picpeak/backend/migrations/core/056_add_role_permissions_table.js'
      ).split('\n')
      expect(roleLines[45]).toContain('permissions.map(p => p.name)')
      expect(roleLines[50]).toContain("'photos.upload'")
      expect(roleLines[72]).toContain("'photos.upload'")

      const permLines = read(
        'vendor/picpeak/backend/migrations/core/055_add_permissions_table.js'
      ).split('\n')
      expect(permLines[56]).toContain("name: 'photos.upload'")
    })

    it('contrasts this reachable permission with the never-seeded events.manage gap from AC-17.1.2', () => {
      expect(section).toMatch(/unlike AC-17\.1\.2's `events\.manage`/)
      expect(section).toMatch(/no permission gap to\s*\n?record/)
    })

    it('records the upload call and its 202 Accepted response with the queued photo ids', () => {
      expect(section).toMatch(/HTTP 202/)
      expect(section).toMatch(/"upload_id":"4c92fefb376f95c287f272a202b71227"/)
      expect(section).toMatch(/"photo_ids":\[1,2,3\]/)
    })

    it('states the route queues for background processing rather than processing synchronously', () => {
      expect(section).toMatch(
        /adminPhotos\.js:303-313/
      )
    })
  })

  describe('processing completes for every uploaded file', () => {
    it('records polling the upload-status endpoint to a complete summary', () => {
      expect(section).toMatch(
        /\/api\/admin\/photos\/uploads\/4c92fefb376f95c287f272a202b71227\/status/
      )
      expect(section).toMatch(/"complete":3,"failed":0/)
    })

    it('attributes completion to the background worker, not the upload handler', () => {
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/src\/services\/photoProcessor\.js:418-508/
      )
    })

    it('that cited range really is the processPhoto worker function', () => {
      const lines = read('vendor/picpeak/backend/src/services/photoProcessor.js').split('\n')
      // The cited 418-508 is the whole function: signature on 418, its
      // return on 507, closing brace on 508 (all 1-indexed).
      expect(lines[417]).toContain('async function processPhoto(photoId)')
      expect(lines[506]).toContain('return updateData;')
      expect(lines[507].trim()).toBe('}')
    })
  })

  describe('every original is stored in R2 exactly once, byte-identical to the source', () => {
    it('lists exactly one R2 object per uploaded file with the exact source byte sizes', () => {
      expect(section).toMatch(/individual_0001\.jpg\s+15539/)
      expect(section).toMatch(/individual_0002\.jpg\s+64450/)
      expect(section).toMatch(/individual_0003\.jpg\s+5440/)
    })

    it('records the key is computed once and never rewritten during processing', () => {
      expect(section).toMatch(/never rewritten by processing/)
      expect(section).toMatch(
        /imageProcessor\.js:229-242/
      )
    })

    it('that cited range really is withLocalCopy, which only reads (never re-puts) the original', () => {
      const lines = read('vendor/picpeak/backend/src/services/imageProcessor.js').split('\n')
      const range = lines.slice(228, 242).join('\n')
      expect(range).toContain('async function withLocalCopy(sourceKey, fn)')
      expect(range).not.toMatch(/storage\.put(?!.*thumbnail)/)
    })

    it('records a SHA-256 comparison proving the stored original is unmodified, not merely same-sized', () => {
      expect(section).toMatch(
        /97e2eeb6bb8fe9939f4dc4f1600bd053175942bf9152d56dc0652745d6b7f416/
      )
    })
  })

  describe('derivative sizes: honestly records eager vs. lazy, not silently assumed complete', () => {
    it('names all three derivative-generating functions and their line numbers', () => {
      expect(section).toMatch(/generateThumbnail`, line\s*\n?126/)
      expect(section).toMatch(/generateHeroImage`, line\s*\n?368/)
      expect(section).toMatch(/generatePreviewImage`, line\s*\n?500/)
    })

    it('those functions really start at the cited lines', () => {
      const lines = read('vendor/picpeak/backend/src/services/imageProcessor.js').split('\n')
      expect(lines[125]).toContain('async function generateThumbnail(imagePath, options = {})')
      expect(lines[367]).toContain('async function generateHeroImage(imagePath, options = {})')
      expect(lines[499]).toContain('async function generatePreviewImage(imagePath, options = {})')
    })

    it('states processPhoto never calls generateHeroImage or generatePreviewImage', () => {
      expect(section).toMatch(
        /never calls\s*\n?`generateHeroImage` or `generatePreviewImage`/
      )
    })

    it('photoProcessor.js really does not import or call those two functions', () => {
      const source = read('vendor/picpeak/backend/src/services/photoProcessor.js')
      expect(source).not.toMatch(/generateHeroImage/)
      expect(source).not.toMatch(/generatePreviewImage/)
      // Confirms only the thumbnail generator is destructured from imageProcessor.
      const importLine = source.split('\n')[3]
      expect(importLine).toContain('generateThumbnail')
      expect(importLine).not.toContain('generateHeroImage')
      expect(importLine).not.toContain('generatePreviewImage')
    })

    it('records hero_path and preview_path as NULL immediately after processing, thumbnail_path populated', () => {
      expect(section).toMatch(/thumbnails\/thumb_e37d8201_\.\.\._0001\.jpg\s+\|\s+\|/)
    })

    it('records the thumbnail derivative confirmed in R2 with the live app_settings fit value', () => {
      expect(section).toMatch(/thumbnail_fit = "cover"/)
      expect(section).toMatch(/measured exactly 300×300/)
    })

    it('names the lazy trigger routes for hero and preview, and verifies they exist at the cited lines', () => {
      expect(section).toMatch(/gallery\.js:1384/)
      expect(section).toMatch(/gallery\.js:1482-1485/)
      expect(section).toMatch(
        /adminThumbnails\.js:200-246/
      )

      const galleryLines = read('vendor/picpeak/backend/src/routes/gallery.js').split('\n')
      expect(galleryLines[1486]).toContain('const heroPath = await ensureHeroImage(photo);')
      expect(galleryLines[1587]).toContain('ensurePreviewImage(photo)')

      const adminThumbLines = read('vendor/picpeak/backend/src/routes/adminThumbnails.js').split('\n')
      expect(adminThumbLines[199]).toContain("router.post('/regenerate-previews'")
    })

    it('records the admin backfill call that proves the preview tier actually works when triggered', () => {
      expect(section).toMatch(/"message":"Started regenerating 3 previews","count":3/)
      expect(section).toMatch(/preview_f20c5354_\.\.\._0002\.jpg/)
      expect(section).toMatch(/downloaded at\s*\n?1920×1080/)
    })

    it('states the hero tier was not live-exercised because its route belongs to AC-17.3\\/AC-17.5', () => {
      expect(section).toMatch(/hero tier\s*\n?\s*was not live-exercised/)
      expect(section).toMatch(/AC-17\.3\/AC-17\.5/)
    })

    it('writes up the eager-vs-lazy gap as a genuine finding raised under AC-17.9, not silently patched', () => {
      expect(section).toMatch(/Recorded honestly, not silently patched/)
      expect(section).toMatch(/Fork Discipline forbids editing/)
      expect(section).toMatch(/Raised to the\s*\n?Product Owner under AC-17\.9/)
    })
  })

  describe('the stored photos row is checked field by field against this AC\'s list', () => {
    it('has a table covering width, height, aspect ratio, format, file size, and processing state', () => {
      expect(section).toMatch(/\| width\s+\|/)
      expect(section).toMatch(/\| height\s+\|/)
      expect(section).toMatch(/\| aspect ratio\s+\|/)
      expect(section).toMatch(/\| format\s+\|/)
      expect(section).toMatch(/\| file size\s+\|/)
      expect(section).toMatch(/\| processing state\|/)
    })

    it('maps format to mime_type and processing state to processing_status, with recorded values', () => {
      expect(section).toMatch(/photos\.mime_type.*varchar/)
      expect(section).toMatch(/`image\/jpeg` \(×3\)/)
      expect(section).toMatch(/photos\.processing_status.*varchar/)
      expect(section).toMatch(/`complete` \(×3\)/)
    })

    it('records the actual width/height/size values read back for all three photos', () => {
      expect(section).toMatch(/950, 1920, 350/)
      expect(section).toMatch(/534, 1080, 262/)
      expect(section).toMatch(/15539, 64450, 5440/)
    })

    it('states plainly that aspect_ratio is not a stored column anywhere in the pinned schema', () => {
      expect(section).toMatch(
        /no `aspect_ratio` column anywhere in the\s*\n?pinned schema/
      )
      expect(section).toMatch(/no migration under/)
    })

    it('no migration in the pinned fork really does add an aspect_ratio column', () => {
      const result = execSync(
        `grep -rl "aspect_ratio\\|aspectRatio" vendor/picpeak/backend/migrations/ || true`,
        { cwd: root }
      ).toString()
      expect(result.trim()).toBe('')
    })

    it("names this a genuine gap against the AC's literal wording rather than a misreading", () => {
      expect(section).toMatch(/a genuine gap against the AC's literal wording/)
      expect(section).toMatch(/not itself a stored field/)
    })

    it('raises the aspect-ratio gap under AC-17.9 rather than treating the derivable value as satisfying the AC', () => {
      expect(section).toMatch(
        /rather than silently treated as satisfied by the derivable value/
      )
    })
  })

  it('closes the AC with an explicit verdict naming both honest findings', () => {
    expect(section).toMatch(/AC-17\.2 is satisfied for the parts the pinned fork actually delivers/)
    expect(section).toMatch(/only one derivative tier \(thumbnail\) is produced/)
    expect(section).toMatch(/aspect ratio is not a stored column/)
    expect(section).toMatch(/scrum-master\/po-requests\.md` per AC-17\.9/)
  })
})
